// Ввод нот на стане (слово автора 22.11.2026; образец — ввод кнопками в открытых нотных редакторах): курсор на стане, ноты — буквами
// A…G, пауза, залигованное продолжение, шаг назад, длительность, диез/бемоль, октава, шаг по тональности. Чистые функции над партией
// livescore.js (`raw` — источник правды; ввод кладёт ноты ровно на сетку: время — в долях, длина — dq). Без DOM (tests/noteinput.test.js).
import { NAT, MAJI, NAT_MIN, SH, FL } from './notes.js';
import { GRIDS, gridOf, quantize, barsOf, addNote, setPitch, setFret, tabOf } from './livescore.js';

// Длительности: доли-четверти → подпись; точка — ×1,5
export const NOTE_DURS = [[4, '1'], [2, '1/2'], [1, '1/4'], [0.5, '1/8'], [0.25, '1/16']];
const SHARPS = 'FCGDAEB', FLATS = 'BEADGCF', FIFTHS = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
const EPS = 1e-6;

// base — MIDI-нота у левого края клавиш (любая: с до, с соль, с фа-диеза; окно сдвигается жестом вверх/вниз на октаву);
// kb — вид клавиш: piano (пианино), deg (ступени тональности), abc (буквы); mode — keys (клавиши) или fret (гриф: струны × лады);
// stack — «аккорд»: нота встаёт на курсор, курсор стоит (следующая — на ту же долю); f0 — первый видимый лад грифа
export const KB_VIEWS = ['piano', 'deg', 'abc'];
export const newInput = (beat = 0, p = null, o = {}) => ({ beat, dur: 1, dot: false, acc: null, oct: 0, prev: null, base: p ? startBase(p, startPitch(p)) : 60,
  kb: KB_VIEWS.includes(o.kb) ? o.kb : 'piano', mode: o.mode === 'fret' && p && p.tuning ? 'fret' : 'keys', stack: !!o.stack, f0: 0 });
export const durBeats = (inp) => inp.dur * (inp.dot ? 1.5 : 1);

// Знаки при ключе: сколько диезов/бемолей в тональности партии
export function keyAlter(letter, key) {
  const f = key ? FIFTHS[key.minor ? (key.pc + 3) % 12 : key.pc] : 0;
  if (f > 0) return SHARPS.slice(0, f).includes(letter) ? 1 : 0;
  if (f < 0) return FLATS.slice(0, -f).includes(letter) ? -1 : 0;
  return 0;
}
// Высота ноты по букве: знак — нажатый (♯ +1, ♭ −1, 0 — бекар) или по ключу; октава — ближайшая к прошлой ноте, потом сдвиг oct
export function pitchFor(letter, { prev = 60, key = null, acc = null, oct = 0 } = {}) {
  const pc = (((NAT[letter] + (acc == null ? keyAlter(letter, key) : acc)) % 12) + 12) % 12;
  let best = null;
  for (let o = 0; o <= 9; o++) { const m = 12 * o + pc; if (best == null || Math.abs(m - prev) <= Math.abs(best - prev)) best = m; }
  return Math.max(21, Math.min(108, best + 12 * oct));
}
// Стартовая высота (куда «смотрит» первая нота): середина инструмента
export const startPitch = (p) => (p.tuning && p.tuning.length ? p.tuning[Math.floor(p.tuning.length / 2)] + 5 + (p.capo || 0) : p.inst === 'voice' ? 64 : 60);

const stepsOfGrid = (p) => GRIDS[gridOf(p)];
// Сетка должна ровно ложить длину: нужной кратности — иначе переходим на восьмые или шестнадцатые (триольная сетка прямые длины не держит)
function ensureGrid(p, beats) {
  const need = [1, 2, 4].find((k) => Math.abs(beats * k - Math.round(beats * k)) < EPS) || 4, div = stepsOfGrid(p);
  if (div % need !== 0) p.grid = need === 4 ? '16' : '8';
}
// Курсор дошёл до конца последнего такта — такт добавляется
function ensureBars(p, beat) { if (beat >= barsOf(p) * p.num - EPS) p.minBars = Math.min(200, Math.floor(beat / p.num + EPS) + 1); }
const spb = (p) => 60 / Math.max(20, p.bpm || 90);
// Нота, оканчивающаяся на курсоре (последняя)
function endingAt(p, beat) {
  const ns = quantize(p).filter((n) => Math.abs(n.t + n.d - beat) < 1e-4);
  return ns.length ? ns[ns.length - 1] : null;
}

// Нота буквой → в партию на курсор; курсор вперёд. → высота (для звука)
export function enter(p, inp, letter) {
  return put(p, inp, pitchFor(letter, { prev: inp.prev == null ? startPitch(p) : inp.prev, key: p.key, acc: inp.acc, oct: inp.oct }));
}
// Нота высотой m (клавиша полосы тональности; знак нажатой ♭/♯ — к ней) → в партию на курсор; курсор вперёд
export function enterPitch(p, inp, m) { return put(p, inp, Math.max(21, Math.min(108, m + (inp.acc || 0)))); }
// Нота с грифа: струна s (с тонкой, 1…) и лад f (от капо) → высота по строю; струна и лад запоминаются (на табах — как нажато)
export function enterFret(p, inp, s, f) {
  if (!p.tuning) return null;
  const idx = p.tuning.length - s;
  if (idx < 0 || idx >= p.tuning.length) return null;
  return put(p, inp, p.tuning[idx] + (p.capo || 0) + Math.max(0, Math.min(24, f)), { s, f: Math.max(0, Math.min(24, f)) });
}
function put(p, inp, m, fr = null) {
  const d = durBeats(inp);
  ensureGrid(p, d); ensureGrid(p, inp.beat);
  const t0 = inp.beat * spb(p);
  // новая нота встаёт на место прежней на этой доле; в режиме «аккорд» — только на место той же высоты или той же струны
  p.raw = p.raw.filter((r) => Math.abs(r.t - t0) > 1e-4 || (inp.stack && (fr ? r.s !== fr.s && r.m !== m : r.m !== m)));
  addNote(p, inp.beat, m, d);
  if (fr) { const i = p.raw.findIndex((r) => Math.abs(r.t - t0) < 1e-4 && r.m === m); if (i >= 0) setFret(p, i, fr.s, fr.f); }
  if (!inp.stack) inp.beat += d;
  inp.prev = m; inp.acc = null; inp.oct = 0;
  ensureBars(p, inp.beat);
  return m;
}
// Ноты, звучащие на курсоре (аккорд, который набирается): [{ s, f }] — для подсветки на грифе
export function atCursor(p, inp) {
  const ns = quantize(p), tf = tabOf(p, ns);
  return ns.map((n, k) => ({ n, f: tf[k] })).filter((x) => Math.abs(x.n.t - inp.beat) < 1e-4).map((x) => ({ m: x.n.m, s: x.f ? x.f.s : null, f: x.f ? x.f.f : null }));
}
// Клавиши «пианино» от ноты base: белые и чёрные в настоящей раскладке; x и w — в долях белой клавиши от левого края окна;
// видимы те, что хоть частью попадают в окно шириной whites (чёрную начальную ноту окно показывает с её края)
const WIDX = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6], BLACK = [1, 3, 6, 8, 10];
const whiteIdx = (m) => 7 * Math.floor(m / 12) + WIDX[((m % 12) + 12) % 12];
export function pianoKeys(p, base, whites = 8, { blacks = true } = {}) {
  const k = p.key || { pc: 0, minor: false }, names = FIFTHS[k.minor ? (k.pc + 3) % 12 : k.pc] < 0 ? FL : SH;
  const isB = (m) => BLACK.includes(((m % 12) + 12) % 12);
  const x0 = isB(base) ? whiteIdx(base + 1) - 0.3 : whiteIdx(base), out = [];
  for (let m = base - 1; m <= base + whites * 2; m++) {
    const b = isB(m);
    if (b && !blacks) continue;
    const x = (b ? whiteIdx(m + 1) - 0.3 : whiteIdx(m)) - x0, w = b ? 0.6 : 1;
    if (Math.min(x + w, whites) - Math.max(x, 0) < w * 0.6) continue; // чёрная узкая полоска у края — не клавиша
    out.push({ m, black: b, x, w, label: names[((m % 12) + 12) % 12], oct: octaveOf(m), c: ((m % 12) + 12) % 12 === 0, tonic: ((m % 12) + 12) % 12 === k.pc });
  }
  return out;
}
// Сдвиг окна клавиш: на semis полутонов (октава — 12); в пределах рояля
export const shiftBase = (inp, semis) => { inp.base = Math.max(24, Math.min(96, inp.base + semis)); return inp.base; };
// Окно с ноты данного названия (0…11) — в той же октаве, что и сейчас
export const baseAtPc = (inp, pc) => { inp.base = Math.max(24, Math.min(96, 12 * Math.floor(inp.base / 12) + pc)); return inp.base; };
// Первый видимый лад грифа (окно в 7 ладов)
export const FRET_WIN = 7;
export const shiftFret = (inp, d) => { inp.f0 = Math.max(0, Math.min(24 - FRET_WIN + 1, inp.f0 + d)); return inp.f0; };
// Клавиши полосы: ступени тональности от base (тоники) до октавы — ни одной «чужой» ноты; знаки — жестом
export function scaleKeys(p, base) {
  const k = p.key || { pc: 0, minor: false }, sc = k.minor ? NAT_MIN : MAJI, names = [FIFTHS[k.minor ? (k.pc + 3) % 12 : k.pc] < 0 ? FL : SH][0];
  return Array.from({ length: 8 }, (_, i) => { const m = base + (i < 7 ? sc[i] : 12); return { m, label: names[((m % 12) + 12) % 12], deg: (i % 7) + 1, tonic: i === 0 || i === 7 }; });
}
// Тоника тональности, с которой начинается окно полосы, чтобы нота near попала в него
export function startBase(p, near) {
  const k = p.key || { pc: 0, minor: false };
  return Math.max(24, Math.min(96, near - ((((near - k.pc) % 12) + 12) % 12)));
}
export const octaveOf = (m) => Math.floor(m / 12) - 1;
// Пауза: курсор вперёд
export function rest(p, inp) { inp.beat += durBeats(inp); ensureBars(p, inp.beat); }
// Залигованное продолжение: нота, оканчивающаяся на курсоре, становится длиннее; нет такой — как пауза
export function tie(p, inp) {
  const d = durBeats(inp), n = endingAt(p, inp.beat);
  ensureGrid(p, d);
  if (n) { const r = p.raw[n.i]; r.dq = n.d + d; r.d = r.dq * spb(p); }
  inp.beat += d; ensureBars(p, inp.beat);
  return !!n;
}
// Шаг назад: нота, оканчивающаяся на курсоре, убирается и курсор встаёт на её начало; иначе курсор на длительность назад
export function back(p, inp) {
  if (inp.stack) { // «аккорд»: курсор стоит — уходит последняя нота на курсоре
    const at = quantize(p).filter((x) => Math.abs(x.t - inp.beat) < 1e-4);
    if (at.length) { p.raw.splice(at[at.length - 1].i, 1); return true; }
  }
  const n = endingAt(p, inp.beat);
  if (n) { p.raw.splice(n.i, 1); inp.beat = n.t; inp.prev = null; const l = lastBefore(p, inp.beat); if (l) inp.prev = l.m; return true; }
  inp.beat = Math.max(0, inp.beat - durBeats(inp));
  return false;
}
const lastBefore = (p, beat) => { const ns = quantize(p).filter((n) => n.t < beat - EPS); return ns.length ? ns[ns.length - 1] : null; };
// ♯ и ♭: нажатие ставит знак на следующую ноту; повтор той же кнопки — бекар (0), ещё раз — по ключу
export function accent(inp, a) { inp.acc = inp.acc === a ? 0 : inp.acc === 0 ? null : a; return inp.acc; }
export const octave = (inp, d) => { inp.oct = Math.max(-3, Math.min(3, inp.oct + d)); return inp.oct; };
// Шаг по тональности: последняя нота (оканчивающаяся на курсоре) — на ступень вверх или вниз; нет — без изменений
export function stepNote(p, inp, d) {
  const n = endingAt(p, inp.beat);
  if (!n) return null;
  const k = p.key || { pc: 0, minor: false }, scale = (k.minor ? NAT_MIN : MAJI).map((v) => (k.pc + v) % 12);
  let m = n.m;
  for (let i = 0; i < 12; i++) { m += d; if (scale.includes(((m % 12) + 12) % 12)) break; }
  setPitch(p, n.i, Math.max(21, Math.min(108, m)));
  inp.prev = p.raw[n.i].m;
  return p.raw[n.i].m;
}
// Курсор на долю (с привязкой к сетке ввода: долям и их половинам)
export function moveTo(p, inp, beat) { inp.beat = Math.max(0, Math.round(beat * 4) / 4); const l = lastBefore(p, inp.beat + EPS); inp.prev = l ? l.m : null; }
// Подпись места: такт и доля в такте
export const posOf = (p, inp) => ({ bar: Math.floor(inp.beat / p.num + EPS) + 1, beat: Math.round((inp.beat % p.num + EPS) * 100) / 100 + 1 });
