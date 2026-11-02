// Пресеты диктофона — без DOM. Пресет = обработка голоса (vocal.js: режим или свои ручки) + цепочка эффектов
// приложения (fx.js) + усиление. Готовые — режимы vocal.js с чистой цепочкой; свои — с именем, сколько угодно.
// Правка любого пресета звучит сразу, но сам пресет не меняется, пока не нажато «Сохранить» (свой) или
// «Сохранить как…» (новый). Готовые не портятся никогда. Настройки диктофона: s.cur — выбранный пресет
// ('music' или 'u:…'), s.presets — свои, s.voice / s.chain / s.fx.gain — то, что звучит сейчас.
import { MODE_IDS, normalizeVoiceSet } from './vocal.js';
import { normalizeFx } from './fx.js';

export const BUILTIN = ['raw', 'music', 'speech', 'vocal', 'radio', 'band'].filter((k) => MODE_IDS.includes(k));
export const isUser = (id) => typeof id === 'string' && id.startsWith('u:');

// Цепочка без вида панели (simple/adv — это вид, а не звук)
const sound = (chain) => { const c = { ...normalizeFx(chain) }; delete c.mode; return c; };
export const NEUTRAL = sound({});
// Цепочка ничего не меняет в звуке: эффекты выключены, у звучащего вида эквалайзера (простой, если вид не выбран)
// нет подъёмов и включённых срезов. Срез 80 Гц прежнего умолчания в продвинутом виде, пока вид простой, не звучит
const AMOUNTS = ['comp', 'drive', 'trem', 'delay', 'chorus', 'rev'];
export function neutralChain(chain) {
  const c = normalizeFx(chain);
  if (AMOUNTS.some((k) => +c[k] > 0)) return false;
  const bands = c.mode === 'adv' ? c.adv : c.simple;
  return !bands.some((b) => b.on && (b.type === 'highpass' || b.type === 'lowpass' || +b.g !== 0));
}
const snap = (voice, chain, gain) => JSON.stringify([normalizeVoiceSet(voice), sound(chain), +gain || 0]);

export function normalizePresets(list) {
  return (Array.isArray(list) ? list : []).filter((p) => p && isUser(p.id)).map((p) => ({
    id: p.id, name: String(p.name || '').slice(0, 40) || '—', voice: normalizeVoiceSet(p.voice), chain: sound(p.chain), gain: +p.gain || 0,
  }));
}

// Что даёт пресет id: { voice, chain, gain } или null
export function presetSound(s, id) {
  if (BUILTIN.includes(id)) return { voice: normalizeVoiceSet({ mode: id }), chain: { ...NEUTRAL }, gain: 0 };
  const p = (s.presets || []).find((x) => x.id === id);
  return p ? { voice: p.voice, chain: { ...p.chain }, gain: p.gain } : null;
}

// Звучит не так, как сохранено в выбранном пресете
export function isDirty(s) {
  const p = presetSound(s, s.cur);
  return !!p && snap(s.voice, s.chain, s.fx && s.fx.gain) !== snap(p.voice, p.chain, p.gain);
}

// Выбрать пресет: звук пресета становится текущим (вид панели эффектов сохраняется)
export function applyPreset(s, id) {
  const p = presetSound(s, id);
  if (!p) return false;
  const view = s.chain && s.chain.mode;
  s.cur = id; s.voice = p.voice; s.chain = normalizeFx({ ...p.chain, mode: view || null }); s.fx = { ...(s.fx || {}), gain: p.gain };
  return true;
}

const newId = (rnd = Math.random) => 'u:' + Date.now().toString(36) + rnd().toString(36).slice(2, 6);
// Сохранить текущий звук новым пресетом → id
export function saveAs(s, name, rnd) {
  const id = newId(rnd);
  s.presets = normalizePresets(s.presets).concat([{ id, name: String(name || '').trim().slice(0, 40) || '—', voice: normalizeVoiceSet(s.voice), chain: sound(s.chain), gain: +(s.fx && s.fx.gain) || 0 }]);
  s.cur = id;
  return id;
}
// Записать текущий звук в выбранный свой пресет
export function overwrite(s) {
  if (!isUser(s.cur)) return false;
  s.presets = normalizePresets(s.presets).map((p) => (p.id === s.cur ? { ...p, voice: normalizeVoiceSet(s.voice), chain: sound(s.chain), gain: +(s.fx && s.fx.gain) || 0 } : p));
  return true;
}
export function rename(s, id, name) {
  const nm = String(name || '').trim().slice(0, 40);
  if (!nm) return false;
  s.presets = normalizePresets(s.presets).map((p) => (p.id === id ? { ...p, name: nm } : p));
  return true;
}
// Удалить свой пресет; если он был выбран — выбрать «Музыку» (звук не меняется до выбора: текущее остаётся правкой)
export function remove(s, id) {
  s.presets = normalizePresets(s.presets).filter((p) => p.id !== id);
  if (s.cur === id) s.cur = BUILTIN.includes('music') ? 'music' : BUILTIN[0];
}
// Переставить свой пресет (перенос жестом)
export function move(s, from, to) {
  const list = normalizePresets(s.presets);
  if (from < 0 || from >= list.length) return;
  const [x] = list.splice(from, 1);
  list.splice(Math.max(0, Math.min(list.length, to)), 0, x);
  s.presets = list;
}

// Переезд (02.11.2026): до пресетов был один режим и общая цепочка. Свой режим или настроенная цепочка становятся
// своим пресетом с именем name — звук не меняется; иначе выбран готовый режим
export function migratePresets(s, name) {
  if (s.cur && (BUILTIN.includes(s.cur) || (s.presets || []).some((p) => p.id === s.cur))) return false;
  s.presets = normalizePresets(s.presets);
  const v = normalizeVoiceSet(s.voice);
  if (v.mode === 'own' || !neutralChain(s.chain) || (+(s.fx && s.fx.gain) || 0) !== 0) { saveAs(s, name); return true; }
  applyPreset(s, BUILTIN.includes(v.mode) ? v.mode : 'music'); // звук тот же (цепочка ничего не делала), запись — чистая
  return true;
}
