// Пульт выступления (расширение медиатеки, DECISIONS 2026-11-15): данные и чистые функции без DOM.
// Выступление (событие) → номера. У номера может быть трек из медиатеки, а может не быть — тогда это запись «чтобы
// иметь в виду»: заметка, метки, фон. Звуки — банки пэдов (сбивки, мемы, «верно/неверно»): свои файлы, своя сетка,
// режимы и громкость. Всё кастомизируется; умолчания — пустые банки, звуки человек добавляет сам.
// Хранится у устройства (device.show через ctx.store), файлы — в медиатеке (ссылки по id).

export const PAD_MODES = ['shot', 'loop', 'hold']; // один раз / петля до повторного касания / пока держат
export const PAD_AGAIN = ['restart', 'stop', 'layer']; // повторное касание играющего пада: с начала / стоп / поверх
export const PAD_COLORS = ['pink', 'amber', 'teal', 'green', 'red', 'violet', 'blue', 'gray'];
export const NUM_KINDS = ['track', 'none']; // номер с треком и номер без трека
export const COLS = [2, 5], ROWS = [1, 6]; // границы сетки банка

const uid = (p) => p + Math.random().toString(36).slice(2, 9);
const clamp = (v, a, b, d) => { v = +v; return Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d; };
const pick = (v, list, d) => (list.includes(v) ? v : d);

/* ---------- громкость: шкала 0…100 ---------- */
// 40·lg(v/100): 100 → 0 дБ, 50 → −12 дБ, 10 → −40 дБ; ниже 1 — тишина. Шкала ровная на слух: ползунок плавный по всей длине
export const faderDb = (v) => (v < 1 ? -Infinity : 40 * Math.log10(Math.min(100, v) / 100));
export const faderGain = (v) => (v < 1 ? 0 : Math.pow(Math.min(100, v) / 100, 2));
export const gainFader = (g) => (g <= 0 ? 0 : Math.round(Math.sqrt(g) * 100));
export const dbText = (v) => (v < 1 ? '−∞' : (v >= 100 ? '0' : '−' + Math.round(-faderDb(v))));

/* ---------- пэды и банки ---------- */
export function newPad(o = {}) {
  return normalizePad({ id: uid('p'), ...o });
}
export function normalizePad(p) {
  const o = { ...p };
  if (!o.id) o.id = uid('p');
  o.name = typeof o.name === 'string' ? o.name.slice(0, 40) : '';
  o.file = typeof o.file === 'string' && o.file ? o.file : null; // id записи медиатеки
  o.color = pick(o.color, PAD_COLORS, 'pink');
  o.mode = pick(o.mode, PAD_MODES, 'shot');
  o.again = pick(o.again, PAD_AGAIN, 'restart');
  o.level = clamp(o.level, 0, 100, 100);
  o.fadeIn = clamp(o.fadeIn, 0, 30, 0);   // секунд
  o.fadeOut = clamp(o.fadeOut, 0, 30, 0.05);
  o.group = clamp(o.group, 0, 9, 0) | 0;   // 0 — без группы; в группе один звук глушит другой
  o.duck = !!o.duck;                       // приглушать основной трек, пока играет
  o.from = clamp(o.from, 0, 36000, 0);     // начало и конец отрезка, с (0 — весь файл)
  o.to = clamp(o.to, 0, 36000, 0);
  if (o.to && o.to <= o.from) o.to = 0;
  return o;
}
export function newBank(name = '', o = {}) {
  return normalizeBank({ id: uid('b'), name, ...o });
}
export function normalizeBank(b) {
  const o = { ...b };
  if (!o.id) o.id = uid('b');
  o.name = typeof o.name === 'string' ? o.name.slice(0, 24) : '';
  o.cols = clamp(o.cols, COLS[0], COLS[1], 3) | 0;
  o.rows = clamp(o.rows, ROWS[0], ROWS[1], 4) | 0;
  o.pinned = !!o.pinned; // закреплённый банк виден внизу на любой странице звуков
  const n = o.cols * o.rows, src = Array.isArray(o.pads) ? o.pads : [];
  o.pads = Array.from({ length: n }, (_, i) => (src[i] && typeof src[i] === 'object' ? normalizePad(src[i]) : null));
  return o;
}
// Новая сетка тех же звуков: звуки идут по порядку строк, лишние за краем не пропадают, а ждут — возвращаются при увеличении
export function resizeBank(b, cols, rows) {
  const spare = Array.isArray(b.spare) ? b.spare : [];
  const all = [...b.pads.map((p) => p || null)];
  const n = clamp(cols, COLS[0], COLS[1], b.cols) * clamp(rows, ROWS[0], ROWS[1], b.rows);
  const out = Array.from({ length: n }, (_, i) => all[i] || null);
  const lost = all.slice(n).filter(Boolean);
  return normalizeBank({ ...b, cols, rows, pads: out, spare: [...lost, ...spare].slice(0, 60) });
}

/* ---------- номера, метки, выступления ---------- */
export function newCue(t = 0, text = '') {
  return { id: uid('c'), t: Math.max(0, Math.round(+t * 10) / 10 || 0), text: String(text).slice(0, 200) };
}
export function normalizeNumber(n) {
  const o = { ...n };
  if (!o.id) o.id = uid('n');
  o.title = typeof o.title === 'string' ? o.title.slice(0, 80) : '';
  o.kind = pick(o.kind, NUM_KINDS, 'none');
  o.file = o.kind === 'track' && typeof o.file === 'string' && o.file ? o.file : null; // запись медиатеки
  o.note = typeof o.note === 'string' ? o.note.slice(0, 4000) : '';
  o.at = Number.isFinite(+o.at) && o.at !== null && o.at !== '' ? Math.max(0, Math.min(1439, Math.round(+o.at))) : null; // минута суток, null — без времени
  o.dur = clamp(o.dur, 0, 86400, 0);       // запланированная длительность, с (0 — не задана)
  o.shift = clamp(o.shift, -12, 12, 0) | 0; // сдвиг тональности, полутонов
  o.level = clamp(o.level, 0, 100, 80);
  o.fadeIn = clamp(o.fadeIn, 0, 60, 0);
  o.fadeOut = clamp(o.fadeOut, 0, 60, 0);
  o.cues = (Array.isArray(o.cues) ? o.cues : []).filter((c) => c && Number.isFinite(+c.t)).map((c) => ({ id: c.id || uid('c'), t: Math.max(0, +c.t), text: String(c.text || '').slice(0, 200) })).sort((a, b) => a.t - b.t);
  o.done = !!o.done;
  return o;
}
export const newNumber = (o = {}) => normalizeNumber({ id: uid('n'), ...o });

export function normalizeEvent(e) {
  const o = { ...e };
  if (!o.id) o.id = uid('e');
  o.title = typeof o.title === 'string' ? o.title.slice(0, 80) : '';
  o.start = Number.isFinite(+o.start) && o.start ? +o.start : 0;  // время начала, мс (0 — не задано)
  o.timer = pick(o.timer, ['none', 'start', 'length'], 'start');   // таймер: нет / до начала и идёт / обратный отсчёт длины
  o.length = clamp(o.length, 0, 86400, 0);                         // длительность, с
  o.note = typeof o.note === 'string' ? o.note.slice(0, 4000) : '';
  o.numbers = (Array.isArray(o.numbers) ? o.numbers : []).map(normalizeNumber);
  o.updatedAt = o.updatedAt || Date.now();
  return o;
}
export const newEvent = (o = {}) => normalizeEvent({ id: uid('e'), ...o });

// Последняя метка не позже момента at (с) и ближайшая следующая: для подсказки на пульте
export function cueNow(n, at) {
  const L = n && n.cues ? n.cues : [];
  let prev = null, next = null;
  for (const c of L) { if (c.t <= at) prev = c; else { next = c; break; } }
  return { prev, next, in: next ? next.t - at : null };
}
export function addCue(n, t, text) { n.cues.push(newCue(t, text)); n.cues.sort((a, b) => a.t - b.t); return n; }

// Таймер выступления на момент now (мс): { state: 'none'|'before'|'run'|'over', secs } — secs всегда ≥ 0
export function eventTimer(ev, now) {
  if (!ev || ev.timer === 'none' || !ev.start) return { state: 'none', secs: 0 };
  const d = (now - ev.start) / 1000;
  if (d < 0) return { state: 'before', secs: Math.ceil(-d) };
  if (ev.timer === 'length' && ev.length) return d < ev.length ? { state: 'run', secs: Math.ceil(ev.length - d) } : { state: 'over', secs: Math.floor(d - ev.length) };
  return { state: 'run', secs: Math.floor(d) };
}
export function clock(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60, p = (v) => String(v).padStart(2, '0');
  return (h ? h + ':' + p(m) : m) + ':' + p(x);
}
export const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
// «1:05», «65», «1:05.5» → секунды; иначе null
export function parseTime(str) {
  const m = /^\s*(?:(\d+):)?(\d{1,2})(?:[.,](\d))?\s*$/.exec(String(str));
  if (!m) { const n = /^\s*(\d+)\s*$/.exec(String(str)); return n ? +n[1] : null; }
  return (+(m[1] || 0)) * 60 + +m[2] + (m[3] ? +m[3] / 10 : 0);
}
export const hhmm = (min) => (min == null ? '' : String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'));
export function parseHhmm(str) {
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(String(str));
  return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null;
}

/* ---------- всё хранилище ---------- */
export const DEFAULT_UI = { info: true, buzz: true, timer: true, awake: true, confirmStop: false, dock: true };
export function normalizeShow(s = {}) {
  const o = { ...s };
  o.v = 1;
  o.ui = { ...DEFAULT_UI, ...(o.ui || {}) };
  Object.keys(DEFAULT_UI).forEach((k) => { o.ui[k] = !!o.ui[k]; });
  o.page = pick(o.page, ['prog', 'desk', 'pads'], 'prog');
  o.deckLevel = clamp(o.deckLevel, 0, 100, 85);          // фейдер основного трека
  o.goFade = clamp(o.goFade, 0, 10, 2);                  // с: плавный переход по «ГО», если у номера свой уход не задан
  o.cur = typeof o.cur === 'string' ? o.cur : null;      // идущий номер
  o.level = clamp(o.level, 0, 100, 85);                  // общая громкость звуков
  o.duckAmount = clamp(o.duckAmount, 0, 100, 40);        // на сколько процентов приглушать основной трек
  o.duckTime = clamp(o.duckTime, 0.05, 3, 0.25);         // с: нарастание приглушения
  o.banks = Array.isArray(o.banks) && o.banks.length ? o.banks.map(normalizeBank) : defaultBanks();
  if (!o.banks.some((b) => !b.pinned)) o.banks.unshift(newBank('', { cols: 3, rows: 4 }));
  o.bank = o.banks.some((b) => b.id === o.bank && !b.pinned) ? o.bank : o.banks.find((b) => !b.pinned).id;
  o.events = (Array.isArray(o.events) ? o.events : []).map(normalizeEvent);
  o.event = o.events.some((e) => e.id === o.event && !e.deleted) ? o.event : (o.events.find((e) => !e.deleted) || {}).id || null;
  if (!o.cur || !((o.events.find((e) => e.id === o.event) || { numbers: [] }).numbers.some((n) => n.id === o.cur))) o.cur = null;
  return o;
}
// Пустые банки: названия без звуков. Звуки человек добавляет сам (слово автора 15.11.2026: ничего не зашито)
export function defaultBanks() {
  return [
    newBank('', { cols: 3, rows: 4 }),
    newBank('', { cols: 2, rows: 1, pinned: true, pads: [newPad({ color: 'green' }), newPad({ color: 'red' })] }),
  ];
}
export const bankOf = (s, id = s.bank) => s.banks.find((b) => b.id === id) || s.banks.find((b) => !b.pinned);
export const dockOf = (s) => s.banks.find((b) => b.pinned) || null;
export const eventOf = (s, id = s.event) => s.events.find((e) => e.id === id && !e.deleted) || null;
export function padById(s, id) {
  for (const b of s.banks) { const p = b.pads.find((x) => x && x.id === id); if (p) return p; }
  return null;
}

// Номер, что идёт, и следующий не отыгранный за ним (или первый не отыгранный, если ничего не идёт)
export function currentNumber(s) { const e = eventOf(s); return e ? e.numbers.find((n) => n.id === s.cur) || null : null; }
export function nextNumber(s) {
  const e = eventOf(s); if (!e) return null;
  const i = e.numbers.findIndex((n) => n.id === s.cur);
  return e.numbers.slice(i + 1).find((n) => !n.done) || (i < 0 ? e.numbers.find((n) => !n.done) || null : null);
}
