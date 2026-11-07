// Связь с телефоном: синхронизация Melete на телефоне и на компьютере в одной сети Wi-Fi (Windows — сервер, телефон —
// клиент; веб-часть — src/core/sync.js). Здесь только посредник: HTTP-сервер на порту 53319 принимает запрос телефона,
// отдаёт его окну приложения (событие sync-req: номер, метод, путь, заголовок с ключом), тело окно читает командой
// sync_body, ответ отдаёт командой sync_reply — и сервер возвращает его телефону. Решает всё окно (src/core/sync.js):
// проверка ключа, слияние данных, файлы кусками. Сервер включается кнопкой в настройках (сеть — только по воле
// человека), живёт, пока открыто окно; доступ — по коду сопряжения и ключу.
// Шифрование (DECISIONS 2026-11-02): снаружи — только TLS. У компьютера свой постоянный сертификат (создаётся один раз,
// лежит в папке данных приложения); телефон запоминает его отпечаток SHA-256 при сопряжении и дальше верит только ему
// (SyncHttpPlugin.java). TLS-шлюз на порту принимает соединение, расшифровывает и передаёт байты HTTP-серверу tiny_http,
// который слушает только 127.0.0.1 — разбор HTTP прежний.
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{Shutdown, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::Serialize;
use tauri::ipc::{InvokeBody, Request, Response};
use rustls::pki_types::{CertificateDer, PrivateKeyDer, PrivatePkcs8KeyDer};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, Manager, State};

pub const PORT: u16 = 53319;
// Melete DEV — свой порт: на одном компьютере могут стоять обе версии, и вторая не займёт порт первой
// (иначе телефон попадает не в то приложение и слышит «компьютер забыл этот телефон»)
pub const PORT_DEV: u16 = 53329;
fn port_of(app: &AppHandle) -> u16 { if app.config().identifier.ends_with(".dev") { PORT_DEV } else { PORT } }
const MAX_BODY: u64 = 32 << 20; // один запрос — до 32 МБ (файлы идут кусками по 4 МБ)

type Reply = (u16, String, Vec<u8>); // статус, тип, тело

#[derive(Default)]
pub struct SyncSrv {
    on: Arc<AtomicBool>,
    next: Arc<AtomicU64>,
    bodies: Arc<Mutex<HashMap<u64, Vec<u8>>>>,
    waits: Arc<Mutex<HashMap<u64, mpsc::Sender<Reply>>>>,
}

#[derive(Serialize, Clone)]
struct Req { rid: u64, method: String, url: String, key: String, len: usize }

#[derive(Serialize, Clone)]
pub struct Status { pub on: bool, pub port: u16, pub ips: Vec<String>, pub name: String, pub fp: String }

fn local_ips() -> Vec<String> {
    let mut out = Vec::new();
    if let Ok(list) = local_ip_address::list_afinet_netifas() {
        for (_, ip) in list { if let std::net::IpAddr::V4(v4) = ip { if !v4.is_loopback() && !v4.is_link_local() { out.push(v4.to_string()); } } }
    }
    out
}
fn host_name() -> String { std::env::var("COMPUTERNAME").unwrap_or_else(|_| "PC".into()) }

fn resp(code: u16, ctype: &str, body: Vec<u8>) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    let mut r = tiny_http::Response::from_data(body).with_status_code(code);
    if let Ok(h) = tiny_http::Header::from_bytes(&b"Content-Type"[..], ctype.as_bytes()) { r.add_header(h); }
    r
}

fn handle(app: AppHandle, on: Arc<AtomicBool>, next: Arc<AtomicU64>, bodies: Arc<Mutex<HashMap<u64, Vec<u8>>>>, waits: Arc<Mutex<HashMap<u64, mpsc::Sender<Reply>>>>, mut req: tiny_http::Request) {
    let url = req.url().to_string();
    let method = req.method().as_str().to_string();
    // знакомство — без ключа: телефон проверяет, что по адресу Melete, и узнаёт имя компьютера
    if url.starts_with("/melete/v1/hello") {
        let body = serde_json::json!({ "app": "melete", "v": 1, "name": host_name() }).to_string().into_bytes();
        let _ = req.respond(resp(200, "application/json", body));
        return;
    }
    if !url.starts_with("/melete/v1/") || !on.load(Ordering::Relaxed) { let _ = req.respond(resp(404, "text/plain", Vec::new())); return; }
    let key = req.headers().iter().find(|h| h.field.equiv("X-Melete-Key")).map(|h| h.value.as_str().to_string()).unwrap_or_default();
    let mut body = Vec::new();
    if req.as_reader().take(MAX_BODY).read_to_end(&mut body).is_err() { let _ = req.respond(resp(400, "text/plain", Vec::new())); return; }
    let rid = next.fetch_add(1, Ordering::Relaxed) + 1;
    let (tx, rx) = mpsc::channel::<Reply>();
    let len = body.len();
    if let Ok(mut b) = bodies.lock() { b.insert(rid, body); }
    if let Ok(mut w) = waits.lock() { w.insert(rid, tx); }
    let _ = app.emit("sync-req", Req { rid, method, url, key, len });
    // окно отвечает обычно за доли секунды; слияние большой истории — несколько секунд
    let out = rx.recv_timeout(Duration::from_secs(120)).unwrap_or((504, "text/plain".into(), Vec::new()));
    if let Ok(mut b) = bodies.lock() { b.remove(&rid); }
    if let Ok(mut w) = waits.lock() { w.remove(&rid); }
    let _ = req.respond(resp(out.0, &out.1, out.2));
}

// Сертификат компьютера: DER сертификата и ключа (PKCS#8) в папке данных; нет — создать один раз. → (настройка TLS, отпечаток)
fn tls(app: &AppHandle) -> Result<(Arc<rustls::ServerConfig>, String), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let _ = std::fs::create_dir_all(&dir);
    let (cp, kp) = (dir.join("sync-cert.der"), dir.join("sync-key.der"));
    let (cert, key) = match (std::fs::read(&cp), std::fs::read(&kp)) {
        (Ok(c), Ok(k)) if !c.is_empty() && !k.is_empty() => (c, k),
        _ => {
            let ck = rcgen::generate_simple_self_signed(vec!["melete.local".to_string()]).map_err(|e| e.to_string())?;
            let (c, k) = (ck.cert.der().to_vec(), ck.key_pair.serialize_der());
            std::fs::write(&cp, &c).map_err(|e| e.to_string())?;
            std::fs::write(&kp, &k).map_err(|e| e.to_string())?;
            (c, k)
        }
    };
    let fp = fingerprint(&cert);
    Ok((tls_cfg(cert, key)?, fp))
}
fn tls_cfg(cert: Vec<u8>, key: Vec<u8>) -> Result<Arc<rustls::ServerConfig>, String> {
    let provider = Arc::new(rustls::crypto::ring::default_provider());
    let cfg = rustls::ServerConfig::builder_with_provider(provider)
        .with_safe_default_protocol_versions().map_err(|e| e.to_string())?
        .with_no_client_auth()
        .with_single_cert(vec![CertificateDer::from(cert)], PrivateKeyDer::Pkcs8(PrivatePkcs8KeyDer::from(key)))
        .map_err(|e| e.to_string())?;
    Ok(Arc::new(cfg))
}
// Отпечаток — SHA-256 сертификата (DER), шестнадцатеричный, строчные буквы: так же считает телефон
pub fn fingerprint(der: &[u8]) -> String { Sha256::digest(der).iter().map(|b| format!("{:02x}", b)).collect() }
fn cert_fp(app: &AppHandle) -> String {
    app.path().app_data_dir().ok().and_then(|d| std::fs::read(d.join("sync-cert.der")).ok()).map(|c| fingerprint(&c)).unwrap_or_default()
}

// Одно соединение телефона: TLS снаружи ↔ открытый HTTP к tiny_http внутри. Два потока: из сети внутрь и изнутри в сеть;
// блокирующее чтение сокетов — без замка, замок — только на разбор и шифрование. Конец любой стороны закрывает обе
fn bridge(cfg: Arc<rustls::ServerConfig>, tcp: TcpStream, inner_port: u16) {
    let conn = match rustls::ServerConnection::new(cfg) { Ok(c) => Arc::new(Mutex::new(c)), Err(_) => return };
    let inner = match TcpStream::connect(("127.0.0.1", inner_port)) { Ok(s) => s, Err(_) => return };
    let idle = Some(Duration::from_secs(180)); // дольше, чем окно думает над запросом (120 с)
    let _ = tcp.set_read_timeout(idle); let _ = inner.set_read_timeout(idle);
    let _ = tcp.set_nodelay(true); let _ = inner.set_nodelay(true);
    let (Ok(mut net_r), Ok(mut net_w2), Ok(mut in_r)) = (tcp.try_clone(), tcp.try_clone(), inner.try_clone()) else { return };
    let mut net_w = tcp; let mut in_w = inner;
    let c2 = conn.clone();
    // изнутри в сеть: ответ tiny_http шифруется и уходит телефону
    let out = std::thread::spawn(move || {
        let mut buf = vec![0u8; 64 * 1024];
        loop {
            let n = match in_r.read(&mut buf) { Ok(0) | Err(_) => break, Ok(n) => n };
            let Ok(mut c) = c2.lock() else { break };
            if c.writer().write_all(&buf[..n]).is_err() { break; }
            let mut ok = true;
            while c.wants_write() { if c.write_tls(&mut net_w2).is_err() { ok = false; break; } }
            if !ok { break; }
        }
        if let Ok(mut c) = c2.lock() { c.send_close_notify(); while c.wants_write() { if c.write_tls(&mut net_w2).is_err() { break; } } }
        let _ = net_w2.shutdown(Shutdown::Both); let _ = in_r.shutdown(Shutdown::Both);
    });
    // из сети внутрь: рукопожатие и запросы телефона, расшифрованное — tiny_http
    let mut buf = vec![0u8; 64 * 1024];
    let mut plain = vec![0u8; 64 * 1024];
    'net: loop {
        let n = match net_r.read(&mut buf) { Ok(0) | Err(_) => break, Ok(n) => n };
        let Ok(mut c) = conn.lock() else { break };
        let mut rd = &buf[..n];
        while !rd.is_empty() {
            if c.read_tls(&mut rd).is_err() || c.process_new_packets().is_err() {
                while c.wants_write() { if c.write_tls(&mut net_w).is_err() { break; } } // сообщить телефону о сбое
                break 'net;
            }
            loop {
                match c.reader().read(&mut plain) {
                    Ok(0) => break 'net, // телефон закрыл соединение
                    Ok(k) => { if in_w.write_all(&plain[..k]).is_err() { break 'net; } }
                    Err(_) => break, // расшифрованного больше нет
                }
            }
        }
        while c.wants_write() { if c.write_tls(&mut net_w).is_err() { break 'net; } }
    }
    let _ = in_w.shutdown(Shutdown::Both); let _ = net_w.shutdown(Shutdown::Both);
    let _ = out.join();
}

fn serve(app: AppHandle, cfg: Arc<rustls::ServerConfig>, on: Arc<AtomicBool>, next: Arc<AtomicU64>, bodies: Arc<Mutex<HashMap<u64, Vec<u8>>>>, waits: Arc<Mutex<HashMap<u64, mpsc::Sender<Reply>>>>) {
    let fail = |e: String| { let _ = app.emit("sync-error", e); on.store(false, Ordering::Relaxed); };
    let server = match tiny_http::Server::http(("127.0.0.1", 0)) { Ok(s) => s, Err(e) => return fail(e.to_string()) };
    let Some(inner_port) = server.server_addr().to_ip().map(|a| a.port()) else { return fail("inner".into()) };
    let listener = match TcpListener::bind(("0.0.0.0", port_of(&app))) { Ok(l) => l, Err(e) => return fail(e.to_string()) };
    let _ = listener.set_nonblocking(true);
    let on2 = on.clone();
    let gate = std::thread::spawn(move || {
        while on2.load(Ordering::Relaxed) {
            match listener.accept() {
                Ok((tcp, _)) => { let _ = tcp.set_nonblocking(false); let c = cfg.clone(); std::thread::spawn(move || bridge(c, tcp, inner_port)); }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => std::thread::sleep(Duration::from_millis(100)),
                Err(_) => std::thread::sleep(Duration::from_millis(100)),
            }
        }
    });
    while on.load(Ordering::Relaxed) {
        let req = match server.recv_timeout(Duration::from_millis(500)) { Ok(Some(r)) => r, Ok(None) => continue, Err(_) => break };
        let (a, o, n, b, w) = (app.clone(), on.clone(), next.clone(), bodies.clone(), waits.clone());
        std::thread::spawn(move || handle(a, o, n, b, w, req));
    }
    let _ = gate.join();
}

#[tauri::command]
pub fn sync_start(app: AppHandle, st: State<'_, SyncSrv>) -> Status {
    if !st.on.swap(true, Ordering::Relaxed) {
        let (o, n, b, w) = (st.on.clone(), st.next.clone(), st.bodies.clone(), st.waits.clone());
        // сертификат — сразу (первый раз создаётся): отпечаток нужен в ответе, телефон сверяет его по экрану
        match tls(&app) {
            Ok((cfg, _)) => { let a = app.clone(); std::thread::spawn(move || serve(a, cfg, o, n, b, w)); }
            Err(e) => { let _ = app.emit("sync-error", e); st.on.store(false, Ordering::Relaxed); }
        }
    }
    sync_status(app, st)
}
#[tauri::command]
pub fn sync_stop(st: State<'_, SyncSrv>) {
    st.on.store(false, Ordering::Relaxed);
    if let Ok(mut w) = st.waits.lock() { for (_, tx) in w.drain() { let _ = tx.send((503, "text/plain".into(), Vec::new())); } }
}
// Адреса компьютера в сети и его имя — и для раздачи гостям (guest.rs)
pub fn sync_status_plain() -> (Vec<String>, String) { (local_ips(), host_name()) }
#[tauri::command]
pub fn sync_status(app: AppHandle, st: State<'_, SyncSrv>) -> Status { Status { on: st.on.load(Ordering::Relaxed), port: port_of(&app), ips: local_ips(), name: host_name(), fp: cert_fp(&app) } }

// Тело запроса rid — окну (двоичное, без base64)
#[tauri::command]
pub fn sync_body(st: State<'_, SyncSrv>, rid: u64) -> Response {
    let b = st.bodies.lock().ok().and_then(|m| m.get(&rid).cloned()).unwrap_or_default();
    Response::new(b)
}
// Ответ окна на запрос: тело — сырые байты, номер, статус и тип — в заголовках
#[tauri::command]
pub fn sync_reply(st: State<'_, SyncSrv>, request: Request<'_>) -> Result<(), String> {
    let h = request.headers();
    let get = |k: &str| h.get(k).and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
    let rid: u64 = get("rid").parse().map_err(|_| "rid")?;
    let code: u16 = get("status").parse().unwrap_or(200);
    let ctype = { let c = get("ctype"); if c.is_empty() { "application/json".to_string() } else { c } };
    let body = match request.body() { InvokeBody::Raw(b) => b.clone(), InvokeBody::Json(v) => v.to_string().into_bytes() };
    if let Ok(mut w) = st.waits.lock() { if let Some(tx) = w.remove(&rid) { let _ = tx.send((code, ctype, body)); } }
    Ok(())
}

// Окно → запрос к другому устройству; bin — тело ответа base64 (куски файлов), иначе текст (JSON)
#[tauri::command]
pub async fn net_http(method: String, url: String, key: String, body: Option<String>, bin: bool, pin: String, timeout: Option<u64>) -> Result<crate::netcli::HttpOut, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let r = crate::netcli::request(&method, &url, &key, body.as_deref().map(|s| s.as_bytes()), &pin, std::time::Duration::from_millis(timeout.unwrap_or(60000)))?;
        let data = if bin { crate::netcli::b64(&r.body) } else { String::from_utf8_lossy(&r.body).to_string() };
        Ok(crate::netcli::HttpOut { status: r.status, data, fp: r.fp })
    }).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    // Шлюз TLS: настоящий клиент (curl) — рукопожатие, большой запрос и ответ туда-обратно, несколько запросов
    // в одном соединении; отпечаток совпадает с тем, что считает openssl
    #[test]
    fn tls_bridge_roundtrip() {
        let ck = rcgen::generate_simple_self_signed(vec!["melete.local".to_string()]).unwrap();
        let (cert, key) = (ck.cert.der().to_vec(), ck.key_pair.serialize_der());
        let fp = fingerprint(&cert);
        let cfg = tls_cfg(cert.clone(), key).unwrap();
        let server = tiny_http::Server::http(("127.0.0.1", 0)).unwrap();
        let inner = server.server_addr().to_ip().unwrap().port();
        std::thread::spawn(move || {
            for mut req in server.incoming_requests() {
                let mut b = Vec::new(); req.as_reader().read_to_end(&mut b).unwrap();
                let body = format!("{} {} {}", req.method(), req.url(), b.len()).into_bytes();
                let _ = req.respond(tiny_http::Response::from_data(body));
            }
        });
        let l = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let port = l.local_addr().unwrap().port();
        std::thread::spawn(move || { for s in l.incoming() { let c = cfg.clone(); std::thread::spawn(move || bridge(c, s.unwrap(), inner)); } });
        let dir = std::env::temp_dir().join(format!("melete-tls-{}", port));
        std::fs::create_dir_all(&dir).unwrap();
        let big = dir.join("big.bin");
        std::fs::write(&big, vec![7u8; 3 << 20]).unwrap();
        let url = format!("https://127.0.0.1:{}/melete/v1/put", port);
        let out = std::process::Command::new("curl").args(["-sk", "--max-time", "20", "--data-binary", &format!("@{}", big.display()), &url, &url]).output().unwrap();
        assert_eq!(String::from_utf8_lossy(&out.stdout), format!("POST /melete/v1/put {}POST /melete/v1/put {}", 3 << 20, 3 << 20));
        // без TLS — не отвечает открытым текстом
        let plain = std::process::Command::new("curl").args(["-s", "--max-time", "5", &format!("http://127.0.0.1:{}/melete/v1/hello", port)]).output().unwrap();
        assert!(plain.stdout.is_empty());
        let pem = dir.join("c.der"); std::fs::write(&pem, &cert).unwrap();
        let o = std::process::Command::new("openssl").args(["x509", "-inform", "der", "-in", pem.to_str().unwrap(), "-noout", "-fingerprint", "-sha256"]).output().unwrap();
        let theirs = String::from_utf8_lossy(&o.stdout).split('=').nth(1).unwrap().trim().replace(':', "").to_lowercase();
        assert_eq!(theirs, fp);
        let _ = std::fs::remove_dir_all(&dir);
    }
}