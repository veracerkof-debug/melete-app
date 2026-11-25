// Чтение Библии «по норме» и свои напоминания (слово автора 24.11.2026, церковный режим). Без DOM.
// Норма — N глав или N минут в день, без конца плана. Библия по порядку с выбранной главы или свободно.
// Мягко по умолчанию: ничего не «сгорает». Строгий режим включается явно: «дни по норме» видны только самому человеку,
// пропуск можно догнать (сверх нормы прочитанное закрывает прежние дни), ничего не обнуляется молча.
// Состояние — settings.bible.norm и settings.bible.notes (в общих данных, попадают в копию); ничего не уходит наружу.
import { ALL } from './bible.js';
import { dayKeyOf } from './reading.js';
import { weekday } from './time.js';

export const NORM_DEFAULT = { on: false, kind: 'ch', n: 1, order: 'seq', from: ALL[0], strict: false, since: null };
export const KINDS = ['ch', 'min'], ORDERS = ['seq', 'free'];
export const N_RANGE = { ch: [1, 20], min: [5, 240] };
export const NOTES_MAX = 10, NOTE_REPEATS = [30, 60, 90, 120]; // «настойчивое» повторение: через сколько минут после времени
const DAY = 864e5;

const clampN = (kind, n) => { const [a, z] = N_RANGE[kind] || N_RANGE.ch; return Math.max(a, Math.min(z, Math.round(+n) || a)); };
export function normOf(b) {
  const x = { ...NORM_DEFAULT, ...((b && b.norm) || {}) };
  x.kind = KINDS.includes(x.kind) ? x.kind : 'ch'; x.order = ORDERS.includes(x.order) ? x.order : 'seq';
  x.n = clampN(x.kind, x.n); x.from = ALL.includes(x.from) ? x.from : ALL[0]; x.strict = !!x.strict; x.on = !!x.on && !!x.since;
  return x;
}
export const normOn = (b) => normOf(b).on;

// Изменить норму (b — settings.bible); включение с нуля начинает счёт с сегодняшнего дня; выключение ничего не стирает
export function setNorm(b, patch, todayKey) {
  const cur = { ...NORM_DEFAULT, ...(b.norm || {}) }, next = { ...cur, ...patch };
  next.kind = KINDS.includes(next.kind) ? next.kind : 'ch'; next.order = ORDERS.includes(next.order) ? next.order : 'seq';
  next.n = clampN(next.kind, next.n); next.from = ALL.includes(next.from) ? next.from : ALL[0]; next.strict = !!next.strict;
  if (patch.on && !cur.on) next.since = todayKey; // каждое включение — новый отсчёт, прочитанное остаётся прочитанным
  next.on = !!next.on;
  b.norm = next;
  return normOf(b);
}

const dayNum = (key) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); };
const keyAt = (ts) => dayKeyOf(ts);

// Сколько единиц нормы набрано за день: главы (по отметкам «прочитано») или минуты (занятия в Библии)
export function unitsOn(b, sessions, key, kind = normOf(b).kind) {
  if (kind === 'min') return Math.floor((sessions || []).filter((s) => s.type === 'tool' && s.tool === 'bible' && keyAt(s.start) === key).reduce((a, s) => a + (s.dur || 0), 0) / 60);
  return Object.values((b && b.read) || {}).filter((ts) => keyAt(ts) === key).length;
}
function unitsSince(b, sessions, since, nowKey, kind) {
  if (kind === 'min') return Math.floor((sessions || []).filter((s) => s.type === 'tool' && s.tool === 'bible' && keyAt(s.start) >= since && keyAt(s.start) <= nowKey).reduce((a, s) => a + (s.dur || 0), 0) / 60);
  return Object.values((b && b.read) || {}).filter((ts) => keyAt(ts) >= since && keyAt(ts) <= nowKey).length;
}

// Состояние нормы на сегодня: { on, kind, n, strict, today, todayDone, elapsed, covered, debt, streak }
//   elapsed — дней с начала (сегодня включительно); covered — дней, закрытых всем прочитанным (раньше — самые ранние);
//   debt — сколько дней можно догнать (сегодняшний ещё не начатый день долгом не считается); streak — только в строгом режиме и без долга
export function normStatus(b, sessions, now = Date.now()) {
  const x = normOf(b);
  if (!x.on) return { on: false };
  const nowKey = keyAt(now), elapsed = Math.max(1, dayNum(nowKey) - dayNum(x.since) + 1);
  const today = unitsOn(b, sessions, nowKey, x.kind), todayDone = today >= x.n;
  const total = unitsSince(b, sessions, x.since, nowKey, x.kind), covered = Math.min(elapsed, Math.floor(total / x.n));
  const debt = Math.max(0, elapsed - covered - (todayDone ? 0 : 1));
  return { on: true, kind: x.kind, n: x.n, strict: x.strict, order: x.order, today, todayDone, elapsed, covered, debt, streak: x.strict && debt === 0 ? covered : null };
}

// Следующие count непрочитанных глав по порядку, начиная с выбранной (по кругу)
export function suggest(b, count) {
  const x = normOf(b), read = (b && b.read) || {}, i0 = ALL.indexOf(x.from), out = [];
  for (let k = 0; k < ALL.length && out.length < count; k++) { const key = ALL[(i0 + k) % ALL.length]; if (!read[key]) out.push(key); }
  return out;
}

// «Чтение дня» по норме — в том же виде, что у плана (keys, done): прочитанное сегодня и то, что читать дальше
export function normReading(b, sessions, now = Date.now()) {
  const x = normOf(b); if (!x.on) return null;
  const nowKey = keyAt(now), st = normStatus(b, sessions, now), read = (b && b.read) || {};
  const todayKeys = ALL.filter((k) => read[k] && keyAt(read[k]) === nowKey);
  if (x.kind === 'min') {
    const keys = x.order === 'seq' ? suggest(b, 1) : [];
    return { norm: true, kind: 'min', n: x.n, min: st.today, day: st.elapsed, days: null, keys, done: st.todayDone ? keys.length : 0, status: st };
  }
  const need = Math.max(0, x.n - todayKeys.length), keys = [...todayKeys.slice(0, x.n), ...(x.order === 'seq' ? suggest(b, need) : [])];
  return { norm: true, kind: 'ch', n: x.n, day: st.elapsed, days: null, keys, done: Math.min(todayKeys.length, keys.length), status: st };
}

/* ---------- свои напоминания ---------- */
// settings.bible.notes: [{ id, text, at: 'ЧЧ:ММ', days: [0..6] (0 — понедельник), persist }] — до 10
export function cleanNote(x, i = 0) {
  if (!x || typeof x !== 'object') return null;
  const at = /^([01]\d|2[0-3]):[0-5]\d$/.test(x.at || '') ? x.at : null; if (!at) return null;
  const days = [...new Set((Array.isArray(x.days) ? x.days : [0, 1, 2, 3, 4, 5, 6]).map(Number).filter((d) => d >= 0 && d <= 6))].sort();
  return { id: String(x.id || 'n' + i).slice(0, 24), text: String(x.text || '').trim().slice(0, 120), at, days: days.length ? days : [0, 1, 2, 3, 4, 5, 6], persist: !!x.persist };
}
export const notesOf = (b) => ((b && Array.isArray(b.notes)) ? b.notes : []).map(cleanNote).filter(Boolean).slice(0, NOTES_MAX);
export function saveNote(b, note, now = Date.now()) {
  const list = notesOf(b), n = cleanNote({ ...note, id: note.id || 'n' + now.toString(36) }); if (!n) return null;
  const i = list.findIndex((x) => x.id === n.id);
  if (i >= 0) list[i] = n; else if (list.length < NOTES_MAX) list.push(n); else return null;
  b.notes = list; return n;
}
export const removeNote = (b, id) => { b.notes = notesOf(b).filter((x) => x.id !== id); };

// Что запланировать на неделю вперёд: [{ ts, text }]. «Настойчивое» напоминание повторяется через 30/60/90/120 минут,
// пока норма дня не выполнена; сегодня, если норма уже выполнена, повторов нет. Не больше 10 уведомлений в день.
export function planNotes(b, status, now = Date.now(), days = 7) {
  const out = [], list = notesOf(b), todayDone = !!(status && status.on && status.todayDone);
  for (let i = 0; i < days; i++) {
    const d = new Date(now); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0);
    const wd = weekday(d.getTime()), dayItems = [];
    for (const n of list) {
      if (!n.days.includes(wd)) continue;
      const [h, m] = n.at.split(':').map(Number), base = new Date(d); base.setHours(h, m, 0, 0);
      const reps = n.persist && !(i === 0 && todayDone) ? [0, ...NOTE_REPEATS] : [0];
      reps.forEach((r, k) => { const ts = base.getTime() + r * 60000; if (ts > now + 60000 && new Date(ts).getDate() === d.getDate()) dayItems.push({ ts, text: n.text, again: k > 0 }); });
    }
    dayItems.sort((a, z) => a.ts - z.ts).slice(0, NOTES_MAX).forEach((x) => out.push(x));
  }
  return out;
}
