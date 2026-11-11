// Тело запроса окна → байты. Окно шлёт Uint8Array «сырым» телом (InvokeBody::Raw), но на Linux (WebKitGTK) Tauri
// иногда передаёт его через JSON — массивом чисел или объектом { "0": 123, "1": 34, … }. Раньше такой запрос
// отклонялся («raw body expected») или байты превращались в текст JSON: компьютер отвечал телефону вместо ключа
// сопряжения кашей — «сопряжено, ключ пустой, 401, компьютер забыл телефон» (отчёт автора 11.11.2026).
use std::borrow::Cow;
use tauri::ipc::InvokeBody;

pub fn json_bytes(v: &serde_json::Value) -> Vec<u8> {
    use serde_json::Value;
    match v {
        Value::Array(a) => a.iter().map(|x| x.as_u64().unwrap_or(0) as u8).collect(),
        Value::Object(m) if !m.is_empty() && m.keys().all(|k| k.parse::<usize>().is_ok()) => {
            let mut out = vec![0u8; m.len()];
            for (k, x) in m { if let Ok(i) = k.parse::<usize>() { if i < out.len() { out[i] = x.as_u64().unwrap_or(0) as u8; } } }
            out
        }
        Value::String(s) => s.as_bytes().to_vec(),
        Value::Null => Vec::new(),
        other => other.to_string().into_bytes(),
    }
}

pub fn bytes(b: &InvokeBody) -> Cow<'_, [u8]> {
    match b {
        InvokeBody::Raw(r) => Cow::Borrowed(r.as_slice()),
        InvokeBody::Json(v) => Cow::Owned(json_bytes(v)),
    }
}

#[cfg(test)]
mod tests {
    use super::json_bytes;
    #[test]
    fn json_variants() {
        let txt = br#"{"key":"ab"}"#;
        let arr = serde_json::Value::Array(txt.iter().map(|b| serde_json::json!(b)).collect());
        assert_eq!(json_bytes(&arr), txt.to_vec());
        let mut obj = serde_json::Map::new();
        for (i, b) in txt.iter().enumerate().rev() { obj.insert(i.to_string(), serde_json::json!(b)); }
        assert_eq!(json_bytes(&serde_json::Value::Object(obj)), txt.to_vec());
        assert_eq!(json_bytes(&serde_json::json!("hi")), b"hi".to_vec());
        assert_eq!(json_bytes(&serde_json::Value::Null), Vec::<u8>::new());
    }
}
