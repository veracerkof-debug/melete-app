// Компьютер подключается к телефону (Melete DEV, связь всех со всеми; слово автора 07.11.2026): HTTPS-запрос к другому
// устройству Melete с закреплённым отпечатком сертификата — то же, что SyncHttpPlugin.java делает на телефоне. У
// устройства свой сертификат (не от удостоверяющего центра — его в своей сети не бывает): при сопряжении pin пуст —
// принять любой и вернуть его отпечаток SHA-256; дальше — верить только сертификату с этим отпечатком (иначе ошибка
// "pin"). Имя узла не проверяется: адрес — IP в своей сети, подлинность даёт отпечаток. Без Tauri: чистая функция.
use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use rustls::client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier};
use rustls::pki_types::{CertificateDer, ServerName, UnixTime};
use rustls::{DigitallySignedStruct, SignatureScheme};
use sha2::{Digest, Sha256};

#[derive(Debug)]
struct Pin { pin: String, seen: Arc<Mutex<String>>, provider: Arc<rustls::crypto::CryptoProvider> }

fn hex(b: &[u8]) -> String { b.iter().map(|x| format!("{:02x}", x)).collect() }

impl ServerCertVerifier for Pin {
    fn verify_server_cert(&self, end: &CertificateDer<'_>, _i: &[CertificateDer<'_>], _n: &ServerName<'_>, _o: &[u8], _t: UnixTime) -> Result<ServerCertVerified, rustls::Error> {
        let fp = hex(&Sha256::digest(end.as_ref()));
        *self.seen.lock().unwrap() = fp.clone();
        if self.pin.is_empty() || self.pin == fp { Ok(ServerCertVerified::assertion()) } else { Err(rustls::Error::General("pin".into())) }
    }
    fn verify_tls12_signature(&self, m: &[u8], c: &CertificateDer<'_>, d: &DigitallySignedStruct) -> Result<HandshakeSignatureValid, rustls::Error> {
        rustls::crypto::verify_tls12_signature(m, c, d, &self.provider.signature_verification_algorithms)
    }
    fn verify_tls13_signature(&self, m: &[u8], c: &CertificateDer<'_>, d: &DigitallySignedStruct) -> Result<HandshakeSignatureValid, rustls::Error> {
        rustls::crypto::verify_tls13_signature(m, c, d, &self.provider.signature_verification_algorithms)
    }
    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> { self.provider.signature_verification_algorithms.supported_schemes() }
}

pub struct Resp { pub status: u16, pub body: Vec<u8>, pub fp: String }

// url — https://ip:port/путь; pin — отпечаток, которому верить ('' — любому, только при сопряжении)
pub fn request(method: &str, url: &str, key: &str, body: Option<&[u8]>, pin: &str, timeout: Duration) -> Result<Resp, String> {
    let rest = url.strip_prefix("https://").ok_or("url")?;
    let (hostport, path) = match rest.find('/') { Some(i) => (&rest[..i], &rest[i..]), None => (rest, "/") };
    let host = hostport.rsplit_once(':').map(|(h, _)| h).unwrap_or(hostport).trim_matches(|c| c == '[' || c == ']').to_string();
    let addr = hostport.to_socket_addrs().map_err(|e| e.to_string())?.next().ok_or("addr")?;
    let provider = Arc::new(rustls::crypto::ring::default_provider());
    let seen = Arc::new(Mutex::new(String::new()));
    let v = Pin { pin: pin.to_lowercase(), seen: seen.clone(), provider: provider.clone() };
    let cfg = rustls::ClientConfig::builder_with_provider(provider)
        .with_safe_default_protocol_versions().map_err(|e| e.to_string())?
        .dangerous().with_custom_certificate_verifier(Arc::new(v))
        .with_no_client_auth();
    let name = ServerName::try_from(host.clone()).map_err(|e| e.to_string())?.to_owned();
    let conn = rustls::ClientConnection::new(Arc::new(cfg), name).map_err(|e| e.to_string())?;
    let sock = TcpStream::connect_timeout(&addr, Duration::from_secs(6)).map_err(|e| e.to_string())?;
    sock.set_read_timeout(Some(timeout)).ok();
    sock.set_write_timeout(Some(timeout)).ok();
    let mut tls = rustls::StreamOwned::new(conn, sock);
    let b = body.unwrap_or(&[]);
    let head = format!("{method} {path} HTTP/1.1\r\nHost: {hostport}\r\nContent-Type: application/json\r\n{}Content-Length: {}\r\nConnection: close\r\n\r\n",
        if key.is_empty() { String::new() } else { format!("X-Melete-Key: {key}\r\n") }, b.len());
    let wr = tls.write_all(head.as_bytes()).and_then(|_| tls.write_all(b)).and_then(|_| tls.flush());
    if let Err(e) = wr {
        let fp = seen.lock().unwrap().clone();
        return Err(if !pin.is_empty() && !fp.is_empty() && fp != pin.to_lowercase() { "pin".into() } else { e.to_string() });
    }
    let mut raw = Vec::new();
    let mut buf = [0u8; 65536];
    loop {
        match tls.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => raw.extend_from_slice(&buf[..n]),
            // сервер закрыл соединение без close_notify — ответ уже целиком (Connection: close)
            Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(e) => return Err(e.to_string()),
        }
    }
    let fp = seen.lock().unwrap().clone();
    let end = raw.windows(4).position(|w| w == b"\r\n\r\n").ok_or("http")?;
    let head = String::from_utf8_lossy(&raw[..end]).to_string();
    let status: u16 = head.split_whitespace().nth(1).and_then(|s| s.parse().ok()).ok_or("http")?;
    let mut body = raw[end + 4..].to_vec();
    if let Some(len) = head.lines().find_map(|l| { let (k, v) = l.split_once(':')?; if k.trim().eq_ignore_ascii_case("content-length") { v.trim().parse::<usize>().ok() } else { None } }) { body.truncate(len); }
    Ok(Resp { status, body, fp })
}

// base64 для ответа окну (двоичные куски файлов)
pub fn b64(data: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for c in data.chunks(3) {
        let n = (c[0] as u32) << 16 | (*c.get(1).unwrap_or(&0) as u32) << 8 | *c.get(2).unwrap_or(&0) as u32;
        out.push(T[(n >> 18) as usize & 63] as char);
        out.push(T[(n >> 12) as usize & 63] as char);
        out.push(if c.len() > 1 { T[(n >> 6) as usize & 63] as char } else { '=' });
        out.push(if c.len() > 2 { T[n as usize & 63] as char } else { '=' });
    }
    out
}

#[derive(serde::Serialize)]
pub struct HttpOut { pub status: u16, pub data: String, pub fp: String }

