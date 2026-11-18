// Канал событий в реальном времени (Melete DEV): постоянное двустороннее соединение с телефоном на том же TLS-шлюзе,
// что и синхронизация (sync.rs). Шлюз после рукопожатия смотрит на первые байты открытого текста: «MLNK» — это
// канал (сюда, run), иначе — обычный HTTP к tiny_http, как раньше. Сертификат и закреплённый отпечаток — те же.
//
// Здесь — только труба кадров между сокетом и окном; всё решает окно (src/core/link.js, linkhub.js):
//   → окну: события link-open { cid }, link-frame { cid, t, d (base64) }, link-close { cid, reason };
//   ← от окна: команды link_enable(on), link_auth(cid, ok), link_send (тело — сырые байты, заголовки cid и type),
//     link_close(cid).
// Кадр: [тип: 1 байт][длина: 2 байта, старший первым][нагрузка ≤ 65535] (docs/link.md). Защита: приём выключен, пока окно
// не включит его (link_enable); до ответа окна «ключ верный» (link_auth) допускается один кадр HELLO до 1 КБ и 5 с;
// после — тишина дольше 12 с закрывает соединение (клиент шлёт пинг каждые 2 с). Запись — своим потоком из очереди:
// link_send не ждёт сеть и не задерживает окно, порядок кадров сохраняется. TCP_NODELAY — на каждом соединении.
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{Shutdown, TcpStream};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{mpsc, Arc, Mutex, OnceLock};
use std::time::Duration;

use serde::Serialize;
use tauri::ipc::Request;
use tauri::{AppHandle, Emitter};

pub const MAGIC: &[u8; 4] = b"MLNK";
pub const VERSION: u8 = 1;
const HEAD: usize = 3;
const T_HELLO: u8 = 1;
const PRE_AUTH_MAX: usize = 1024;
const AUTH_WAIT: Duration = Duration::from_secs(5);
const LIVE_WAIT: Duration = Duration::from_secs(12);

static ON: AtomicBool = AtomicBool::new(false);
static NEXT: AtomicU64 = AtomicU64::new(0);
static APP: OnceLock<AppHandle> = OnceLock::new();
static CONNS: OnceLock<Mutex<HashMap<u64, Arc<Sess>>>> = OnceLock::new();
fn conns() -> &'static Mutex<HashMap<u64, Arc<Sess>>> { CONNS.get_or_init(|| Mutex::new(HashMap::new())) }

struct Sess {
    tx: Mutex<mpsc::Sender<Vec<u8>>>,
    tcp: TcpStream,
    authed: AtomicBool,
}
impl Sess {
    fn kill(&self) { let _ = self.tcp.shutdown(Shutdown::Both); }
}

#[derive(Serialize, Clone)]
struct Open { cid: u64 }
#[derive(Serialize, Clone)]
struct Frame { cid: u64, t: u8, d: String }
#[derive(Serialize, Clone)]
struct Closed { cid: u64, reason: String }

/* ---------- кадры ---------- */

pub fn encode(t: u8, p: &[u8]) -> Option<Vec<u8>> {
    if t == 0 || p.len() > 0xffff { return None; }
    let mut v = Vec::with_capacity(HEAD + p.len());
    v.push(t); v.push((p.len() >> 8) as u8); v.push((p.len() & 0xff) as u8);
    v.extend_from_slice(p);
    Some(v)
}

// Потоковый разбор: feed(байты) → целые кадры; Err — поток повреждён (тип 0), соединение закрывают
#[derive(Default)]
pub struct Parser { buf: Vec<u8> }
impl Parser {
    pub fn feed(&mut self, d: &[u8]) -> Result<Vec<(u8, Vec<u8>)>, ()> {
        self.buf.extend_from_slice(d);
        let mut out = Vec::new();
        let mut p = 0;
        while self.buf.len() - p >= HEAD {
            let t = self.buf[p];
            let len = ((self.buf[p + 1] as usize) << 8) | self.buf[p + 2] as usize;
            if t == 0 { return Err(()); }
            if self.buf.len() - p - HEAD < len { break; }
            out.push((t, self.buf[p + HEAD..p + HEAD + len].to_vec()));
            p += HEAD + len;
        }
        if p > 0 { self.buf.drain(..p); }
        Ok(out)
    }
}

pub fn is_link(first: &[u8]) -> bool { first.len() >= 4 && &first[..4] == MAGIC }

/* ---------- шлюз ---------- */

type Conn = Arc<Mutex<rustls::ServerConnection>>;

// Рукопожатие TLS и первые байты открытого текста (не меньше 4 — хватит отличить «MLNK» от HTTP); None — соединение закрыто.
// Всё, что шифр выдал, уходит обратно в сеть (ответы рукопожатия).
pub fn first_bytes(conn: &Conn, net_r: &mut TcpStream, net_w: &mut TcpStream) -> Option<Vec<u8>> {
    let mut buf = vec![0u8; 16 * 1024];
    let mut plain = vec![0u8; 16 * 1024];
    let mut out: Vec<u8> = Vec::new();
    while out.len() < 4 {
        let n = match net_r.read(&mut buf) { Ok(0) | Err(_) => return None, Ok(n) => n };
        let mut c = conn.lock().ok()?;
        let mut rd = &buf[..n];
        while !rd.is_empty() {
            if c.read_tls(&mut rd).is_err() || c.process_new_packets().is_err() {
                while c.wants_write() { if c.write_tls(net_w).is_err() { break; } } // сообщить телефону о сбое
                return None;
            }
            loop {
                match c.reader().read(&mut plain) {
                    Ok(0) => return None,
                    Ok(k) => out.extend_from_slice(&plain[..k]),
                    Err(_) => break,
                }
            }
        }
        while c.wants_write() { if c.write_tls(net_w).is_err() { return None; } }
    }
    Some(out)
}

// Соединение с каналом: первые байты уже прочитаны (first начинается с «MLNK» и версии). Живёт, пока соединение цело.
pub fn run(conn: Conn, mut net_r: TcpStream, net_w: TcpStream, first: Vec<u8>) {
    let Some(app) = APP.get().cloned() else { return };
    if !ON.load(Ordering::Relaxed) || first.len() < 5 || first[4] != VERSION { return; }
    let cid = NEXT.fetch_add(1, Ordering::Relaxed) + 1;
    let _ = net_r.set_read_timeout(Some(AUTH_WAIT));
    let _ = net_r.set_nodelay(true);
    let Ok(tcp) = net_w.try_clone() else { return };
    let (tx, rx) = mpsc::channel::<Vec<u8>>();
    let sess = Arc::new(Sess { tx: Mutex::new(tx), tcp, authed: AtomicBool::new(false) });
    if let Ok(mut m) = conns().lock() { m.insert(cid, sess.clone()); }
    let _ = app.emit("link-open", Open { cid });

    // запись: очередь кадров → шифрование → сеть (в порядке постановки)
    let (wc, wn) = (conn.clone(), net_w);
    let writer = std::thread::spawn(move || {
        let mut wn = wn;
        for bytes in rx {
            let Ok(mut c) = wc.lock() else { break };
            if c.writer().write_all(&bytes).is_err() { break; }
            let mut ok = true;
            while c.wants_write() { if c.write_tls(&mut wn).is_err() { ok = false; break; } }
            if !ok { break; }
        }
        if let Ok(mut c) = wc.lock() { c.send_close_notify(); while c.wants_write() { if c.write_tls(&mut wn).is_err() { break; } } }
        let _ = wn.shutdown(Shutdown::Both);
    });

    let mut parser = Parser::default();
    let mut pending: Vec<u8> = first[5..].to_vec();
    let mut buf = vec![0u8; 16 * 1024];
    let mut plain = vec![0u8; 16 * 1024];
    let mut hello_seen = false;
    let mut reason = "net";
    'main: loop {
        if !pending.is_empty() {
            let frames = match parser.feed(&pending) { Ok(f) => f, Err(_) => { reason = "proto"; break; } };
            pending.clear();
            for (t, p) in frames {
                if !sess.authed.load(Ordering::Relaxed) {
                    // до ответа окна — только один HELLO, небольшой
                    if t != T_HELLO || hello_seen || p.len() > PRE_AUTH_MAX { reason = "proto"; break 'main; }
                    hello_seen = true;
                }
                let _ = app.emit("link-frame", Frame { cid, t, d: crate::netcli::b64(&p) });
            }
        }
        if !ON.load(Ordering::Relaxed) { reason = "off"; break; }
        let n = match net_r.read(&mut buf) { Ok(0) => break, Err(_) => { reason = "timeout"; break; } Ok(n) => n };
        let Ok(mut c) = conn.lock() else { break };
        let mut rd = &buf[..n];
        while !rd.is_empty() {
            if c.read_tls(&mut rd).is_err() || c.process_new_packets().is_err() { reason = "tls"; break 'main; }
            loop {
                match c.reader().read(&mut plain) {
                    Ok(0) => break 'main, // телефон закрыл соединение
                    Ok(k) => pending.extend_from_slice(&plain[..k]),
                    Err(_) => break,
                }
            }
        }
        let mut wn = &sess.tcp; // ответы TLS (подтверждения, обновление ключей) — без очереди кадров
        while c.wants_write() { if c.write_tls(&mut wn).is_err() { break 'main; } }
    }
    if let Ok(mut m) = conns().lock() { m.remove(&cid); }
    sess.kill();
    drop(sess); // очередь закрывается — писатель завершается
    let _ = writer.join();
    let _ = app.emit("link-close", Closed { cid, reason: reason.to_string() });
}

/* ---------- команды окна ---------- */

// Приём канала: включает окно (в DEV, кнопкой «Принимать телефон»); выключил — все соединения закрываются
#[tauri::command]
pub fn link_enable(app: AppHandle, on: bool) {
    if on { let _ = APP.set(app); ON.store(true, Ordering::Relaxed); }
    else {
        ON.store(false, Ordering::Relaxed);
        if let Ok(m) = conns().lock() { for s in m.values() { s.kill(); } }
    }
}
// Окно проверило ключ из HELLO: верный — соединение живёт, неверный — закрывается (ERROR уже в очереди, он уйдёт первым)
#[tauri::command]
pub fn link_auth(cid: u64, ok: bool) {
    let s = conns().lock().ok().and_then(|m| m.get(&cid).cloned());
    if let Some(s) = s {
        if ok { s.authed.store(true, Ordering::Relaxed); let _ = s.tcp.set_read_timeout(Some(LIVE_WAIT)); }
        else { link_close_soon(s); }
    }
}
// Закрыть, дав очереди вывести уже поставленные кадры (ERROR, BYE)
fn link_close_soon(s: Arc<Sess>) {
    std::thread::spawn(move || { std::thread::sleep(Duration::from_millis(150)); s.kill(); });
}
#[tauri::command]
pub fn link_close(cid: u64) {
    let s = conns().lock().ok().and_then(|m| m.get(&cid).cloned());
    if let Some(s) = s { link_close_soon(s); }
}
// Кадр окна → телефону: тело — нагрузка (сырые байты), заголовки cid и type. Только в очередь — не ждёт сеть
#[tauri::command]
pub fn link_send(request: Request<'_>) -> Result<(), String> {
    let h = request.headers();
    let get = |k: &str| h.get(k).and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
    let cid: u64 = get("cid").parse().map_err(|_| "cid")?;
    let t: u8 = get("type").parse().map_err(|_| "type")?;
    let body = crate::ipcbody::bytes(request.body());
    let frame = encode(t, &body).ok_or("frame")?;
    let s = conns().lock().ok().and_then(|m| m.get(&cid).cloned()).ok_or("cid")?;
    let tx = s.tx.lock().map_err(|_| "lock")?;
    tx.send(frame).map_err(|_| "closed".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frame_bytes_match_js_format() {
        assert_eq!(encode(0x20, &[9, 8]).unwrap(), vec![0x20, 0, 2, 9, 8]);
        assert_eq!(&encode(0x90, &vec![0u8; 258]).unwrap()[..3], &[0x90, 1, 2]);
        assert!(encode(0, &[]).is_none());
        assert!(encode(1, &vec![0u8; 65536]).is_none());
        assert!(encode(1, &vec![0u8; 65535]).is_some());
    }

    #[test]
    fn parser_splits_stream_by_any_chunks() {
        let mut all = Vec::new();
        all.extend(encode(0x20, &[1, 2, 3]).unwrap());
        all.extend(encode(4, &[]).unwrap());
        all.extend(encode(0x90, &vec![7u8; 300]).unwrap());
        let mut p = Parser::default();
        let mut got = Vec::new();
        for ch in all.chunks(5) { got.extend(p.feed(ch).unwrap()); }
        let shape: Vec<(u8, usize)> = got.iter().map(|(t, b)| (*t, b.len())).collect();
        assert_eq!(shape, vec![(0x20, 3), (4, 0), (0x90, 300)]);
        assert_eq!(got[0].1, vec![1, 2, 3]);
        assert!(Parser::default().feed(&[0, 0, 0]).is_err());
    }

    #[test]
    fn link_detection() {
        assert!(is_link(b"MLNK\x01\x01\x00\x00"));
        assert!(!is_link(b"GET /melete/v1/hello"));
        assert!(!is_link(b"ML"));
    }
}
