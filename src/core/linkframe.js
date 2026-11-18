// Канал событий (Melete DEV): формат кадров. Чистые функции без DOM и сети — их же повторяют Rust (src-tauri/src/link.rs)
// и Java (LinkPlugin.java); формат и коды — docs/link.md.
//
// После рукопожатия TLS клиент шлёт 5 байт: «MLNK» и версию (1). Дальше в обе стороны — кадры:
//   [тип: 1 байт][длина полезной нагрузки: 2 байта, старший первым][нагрузка: 0…65535 байт]
export const MAGIC = [0x4d, 0x4c, 0x4e, 0x4b]; // «MLNK»
export const VERSION = 1;
export const MAX_PAYLOAD = 0xffff;
export const HEAD = 3;

// Служебные типы (0x01–0x1F)
export const T = { HELLO: 0x01, WELCOME: 0x02, ERROR: 0x03, PING: 0x04, PONG: 0x05, BYE: 0x06 };
// 0x20–0x7F — события: нагрузка начинается с метки времени отправителя (8 байт, float64, мс), дальше данные приложения
// 0x80–0xFE — «сырые» кадры приложения: нагрузка как есть; 0xFF — зарезервирован
export const EVENT_MIN = 0x20, EVENT_MAX = 0x7f, RAW_MIN = 0x80, RAW_MAX = 0xfe;
export const isEvent = (type) => type >= EVENT_MIN && type <= EVENT_MAX;
export const isApp = (type) => type >= EVENT_MIN && type <= RAW_MAX;

export const preamble = () => new Uint8Array([...MAGIC, VERSION]);

// Кадр → байты. Нагрузка длиннее 65535 — ошибка (крупное — по HTTPS, не по каналу событий)
export function encode(type, payload = new Uint8Array(0)) {
  if (!Number.isInteger(type) || type < 1 || type > 0xff) throw new RangeError('type');
  if (payload.length > MAX_PAYLOAD) throw new RangeError('payload');
  const out = new Uint8Array(HEAD + payload.length);
  out[0] = type; out[1] = payload.length >> 8; out[2] = payload.length & 0xff;
  out.set(payload, HEAD);
  return out;
}

// Потоковый разборщик: feed(bytes) возвращает целые кадры [{ type, payload }], остаток копится до следующего куска.
// Тип 0 — повреждённый поток: бросает ошибку, соединение закрывают.
export function createParser() {
  let buf = new Uint8Array(0);
  return {
    feed(chunk) {
      if (chunk && chunk.length) {
        const nb = new Uint8Array(buf.length + chunk.length);
        nb.set(buf); nb.set(chunk, buf.length); buf = nb;
      }
      const out = [];
      let p = 0;
      while (buf.length - p >= HEAD) {
        const type = buf[p], len = (buf[p + 1] << 8) | buf[p + 2];
        if (type === 0) throw new Error('frame type 0');
        if (buf.length - p - HEAD < len) break;
        out.push({ type, payload: buf.slice(p + HEAD, p + HEAD + len) });
        p += HEAD + len;
      }
      if (p) buf = buf.slice(p);
      return out;
    },
    get pending() { return buf.length; },
  };
}

// Начало потока на стороне, принимающей соединение: «MLNK» + версия. → { ok, version, rest } | { ok: false }
export function readPreamble(bytes) {
  if (bytes.length < 5) return { ok: false, short: true };
  for (let i = 0; i < 4; i++) if (bytes[i] !== MAGIC[i]) return { ok: false };
  return { ok: true, version: bytes[4], rest: bytes.slice(5) };
}

// Кадры PING / PONG: время — float64, мс на часах отправителя этого кадра
export function packPing(seq, t0) {
  const v = new DataView(new ArrayBuffer(12)); v.setUint32(0, seq >>> 0); v.setFloat64(4, t0); return new Uint8Array(v.buffer);
}
export function unpackPing(b) {
  if (b.length < 12) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength); return { seq: v.getUint32(0), t0: v.getFloat64(4) };
}
export function packPong(seq, t0, t1, t2) {
  const v = new DataView(new ArrayBuffer(28)); v.setUint32(0, seq >>> 0); v.setFloat64(4, t0); v.setFloat64(12, t1); v.setFloat64(20, t2); return new Uint8Array(v.buffer);
}
export function unpackPong(b) {
  if (b.length < 28) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { seq: v.getUint32(0), t0: v.getFloat64(4), t1: v.getFloat64(12), t2: v.getFloat64(20) };
}
// Событие: метка отправителя + данные
export function packEvent(ts, data = new Uint8Array(0)) {
  const out = new Uint8Array(8 + data.length); new DataView(out.buffer).setFloat64(0, ts); out.set(data, 8); return out;
}
export function unpackEvent(b) {
  if (b.length < 8) return null;
  return { ts: new DataView(b.buffer, b.byteOffset, b.byteLength).getFloat64(0), data: b.slice(8) };
}
const enc = new TextEncoder(), dec = new TextDecoder();
export const packJson = (o) => enc.encode(JSON.stringify(o));
export const unpackJson = (b) => { try { return JSON.parse(dec.decode(b)); } catch { return null; } };
