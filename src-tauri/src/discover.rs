// Автопоиск устройств Melete в локальной сети (docs/ecosystem.md, «Автопоиск»): mDNS-служба `_melete._tcp.local.`,
// совместимая с NsdManager телефона (android/…/NetDiscoveryPlugin.java). Объявление — только пока включён приём
// подключений (sync_start/sync_stop) и несёт тип, имя, порт, версию и первые 8 символов отпечатка: никаких ключей,
// кодов и данных. Поиск — только по команде окна (кнопка «Искать устройства»), с таймаутом. Сопряжение остаётся
// по коду; автопоиск ничего не сопрягает. Сбой mDNS (нет сети, порт занят) молча означает «ничего не найдено».
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use serde::Serialize;
use std::sync::Mutex;
use std::time::{Duration, Instant};

const TY: &str = "_melete._tcp.local.";

static ANNOUNCE: Mutex<Option<(ServiceDaemon, String)>> = Mutex::new(None);

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct Found { pub name: String, #[serde(rename = "type")] pub kind: String, pub addr: String, pub port: u16, pub id: String }

// Имя экземпляра: без точек и служебных символов (DNS-метка)
fn label(name: &str) -> String {
    let s: String = name.chars().map(|c| if c.is_alphanumeric() || c == '-' { c } else { '-' }).collect();
    let s = s.trim_matches('-').to_string();
    if s.is_empty() { "melete".into() } else { s.chars().take(40).collect() }
}

// Объявить себя; повторный вызов заменяет прежнее объявление. Ошибки не всплывают: автопоиск — удобство, не условие
pub fn announce(name: &str, port: u16, fp: &str) {
    stop();
    let run = || -> Result<(ServiceDaemon, String), String> {
        let d = ServiceDaemon::new().map_err(|e| e.to_string())?;
        let l = label(name);
        let fp8: String = fp.chars().take(8).collect();
        let props = [("type", "desktop"), ("v", "1"), ("fp8", fp8.as_str()), ("name", name)];
        let info = ServiceInfo::new(TY, &format!("Melete-{}", l), &format!("melete-{}.local.", l), "", port, &props[..]).map_err(|e| e.to_string())?.enable_addr_auto();
        let full = info.get_fullname().to_string();
        d.register(info).map_err(|e| e.to_string())?;
        Ok((d, full))
    };
    if let Ok(x) = run() { if let Ok(mut g) = ANNOUNCE.lock() { *g = Some(x); } }
}

// Перестать объявлять (приём выключен)
pub fn stop() {
    let old = ANNOUNCE.lock().ok().and_then(|mut g| g.take());
    if let Some((d, full)) = old { let _ = d.unregister(&full); std::thread::sleep(Duration::from_millis(60)); let _ = d.shutdown(); }
}

// Разбор найденной службы в запись списка; свои объявления отбрасывает окно (по id/адресу), здесь — только формат
fn found_of(info: &ServiceInfo) -> Option<Found> {
    let ip = info.get_addresses_v4().into_iter().next()?.to_string();
    let kind = match info.get_property_val_str("type") { Some("phone") => "phone", _ => "desktop" }.to_string();
    let name = info.get_property_val_str("name").map(|s| s.to_string()).unwrap_or_else(|| info.get_fullname().split('.').next().unwrap_or("Melete").trim_start_matches("Melete-").to_string());
    let fp8 = info.get_property_val_str("fp8").unwrap_or("");
    let id = if fp8.is_empty() { format!("{}:{}", ip, info.get_port()) } else { fp8.to_string() };
    Some(Found { name, kind, addr: ip, port: info.get_port(), id })
}

// Искать timeout_ms миллисекунд; блокирует поток (вызывать из spawn_blocking)
pub fn find(timeout_ms: u64) -> Vec<Found> {
    let ms = timeout_ms.clamp(500, 15000);
    let mut out: Vec<Found> = Vec::new();
    let Ok(d) = ServiceDaemon::new() else { return out };
    if let Ok(rx) = d.browse(TY) {
        let end = Instant::now() + Duration::from_millis(ms);
        loop {
            let left = end.saturating_duration_since(Instant::now());
            if left.is_zero() { break; }
            match rx.recv_timeout(left) {
                Ok(ServiceEvent::ServiceResolved(info)) => { if let Some(f) = found_of(&info) { if !out.iter().any(|o| o.addr == f.addr && o.port == f.port) { out.push(f); } } }
                Ok(_) => {}
                Err(_) => break,
            }
        }
        let _ = d.stop_browse(TY);
    }
    let _ = d.shutdown();
    out
}

#[tauri::command]
pub async fn discover_find(timeout_ms: Option<u64>) -> Vec<Found> {
    tauri::async_runtime::spawn_blocking(move || find(timeout_ms.unwrap_or(8000))).await.unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn label_is_dns_safe() {
        assert_eq!(label("Мой ПК #1"), "Мой-ПК--1");
        assert_eq!(label("..."), "melete");
        assert!(label(&"a".repeat(100)).len() <= 40);
    }
}
