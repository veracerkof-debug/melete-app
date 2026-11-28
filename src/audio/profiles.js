// Профили вывода (слово автора 28.11.2026: «разные настройки эквалайзера и уровней под разные устройства вывода, особенно Bluetooth»).
// Профиль привязан к устройству вывода (ключ route.js: тип + имя) и хранит уровни громкости шин, общую громкость, выключенные шины и эффекты
// каждой шины (эквалайзер и прочее, fx.js). Применяется ТОЛЬКО параметрами через микшер — плавно, узлы не создаются и не переподключаются
// (правило надёжности звука). Хранится на устройстве (device.profiles), не синхронизируется. Без DOM и без звука.
import { BUSES, mixKey } from './mixer.js';

export const PROFILES_MAX = 24;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, +v || 0));
const copy = (o) => JSON.parse(JSON.stringify(o));
export const defaults = () => ({ list: [], auto: true, last: '' });
export function normalize(p) {
  const o = p && typeof p === 'object' ? p : {};
  return { list: (Array.isArray(o.list) ? o.list : []).filter((x) => x && typeof x.id === 'string' && x.snap).slice(0, PROFILES_MAX).map(cleanProfile), auto: o.auto !== false, last: typeof o.last === 'string' ? o.last : '' };
}
function cleanProfile(x) {
  return { id: x.id, name: String(x.name || '').slice(0, 40), key: String(x.key || '').slice(0, 120), label: String(x.label || '').slice(0, 80), at: +x.at || 0, snap: cleanSnap(x.snap) };
}
function cleanSnap(s) {
  const out = { master: clamp(s.master == null ? 1 : s.master, 0, 1), levels: {}, mute: {}, fx: {} };
  for (const [k, v] of Object.entries(s.levels || {})) if (typeof v === 'number') out.levels[k] = clamp(v, 0, 1.5);
  for (const [k, v] of Object.entries(s.mute || {})) out.mute[k] = !!v;
  for (const [k, v] of Object.entries(s.fx || {})) if (v && typeof v === 'object') out.fx[k] = copy(v);
  return out;
}

// Снимок текущих уровней и эффектов микшера (mx — device.mix)
export function capture(mx) {
  const snap = { master: clamp(mx.master == null ? 1 : mx.master, 0, 1), levels: {}, mute: {}, fx: {} };
  for (const bus of BUSES) {
    const k = mixKey(bus);
    if (typeof mx[k] === 'number') snap.levels[k] = mx[k];
    snap.mute[k] = !!(mx.mute && mx.mute[k]);
    if (mx.fx && mx.fx[k]) snap.fx[k] = copy(mx.fx[k]);
  }
  return snap;
}

// Применить снимок через микшер (set / toggleMute / setMaster / setFx — все плавные); → число изменённых значений
export function restore(mixer, mx, snap) {
  const s = cleanSnap(snap); let n = 0;
  if (Math.abs((mx.master == null ? 1 : mx.master) - s.master) > 1e-6) { mixer.setMaster(s.master); n++; }
  for (const bus of BUSES) {
    const k = mixKey(bus);
    if (k in s.levels && Math.abs((mx[k] == null ? 1 : mx[k]) - s.levels[k]) > 1e-6) { mixer.set(bus, s.levels[k]); n++; }
    const was = !!(mx.mute && mx.mute[k]);
    if (k in s.mute && was !== s.mute[k]) { mixer.toggleMute(bus); n++; }
    if (s.fx[k] && JSON.stringify(mx.fx && mx.fx[k] ? mx.fx[k] : null) !== JSON.stringify(s.fx[k])) { mixer.setFx(bus, s.fx[k]); n++; }
  }
  return n;
}

export const forKey = (profiles, key) => (key ? profiles.list.find((p) => p.key === key) || null : null);
const newId = () => 'pf' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
// Сохранить текущие настройки как профиль устройства key: есть — обновляется, нет — создаётся. → профиль или null (много профилей)
export function save(profiles, { key, label, name }, mx, now = Date.now()) {
  let p = forKey(profiles, key);
  if (!p) { if (profiles.list.length >= PROFILES_MAX) return null; p = { id: newId(), name: String(name || label || key).slice(0, 40), key, label: String(label || '').slice(0, 80), at: now, snap: null }; profiles.list.push(p); }
  p.snap = capture(mx); p.at = now; if (label) p.label = String(label).slice(0, 80);
  return p;
}
export function remove(profiles, id) { profiles.list = profiles.list.filter((p) => p.id !== id); }
export function rename(profiles, id, name) { const p = profiles.list.find((x) => x.id === id); if (p) p.name = String(name || '').trim().slice(0, 40) || p.name; }
