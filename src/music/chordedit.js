// Правка аккордов записи (rec.ana.chords: [{ t, d, c }], c — подпись ChordMini «A:min», null — «нет аккорда»).
// Чистые функции без DOM: ручная правка в плеере медиатеки и предложения нейросети (core/ai/proposals.js) идут через них.
// Каждая функция возвращает НОВЫЙ нормализованный список (по возрастанию t, без наложений, равные соседи слиты).
import { CHORD_LABELS, QUALS, parseChord } from '../audio/mirpost.js';

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const EDIT_QUALS = ['', 'min', '7', 'maj7', 'min7', 'dim', 'aug', 'sus2', 'sus4', 'maj6', 'min6', 'dim7', 'hdim7', 'minmaj7']; // порядок кнопок шторки
const r2 = (x) => Math.round(x * 100) / 100;
export const labelOf = (pc, q = '') => (QUALS.includes(q) ? ROOTS[((pc % 12) + 12) % 12] + (q ? ':' + q : '') : null);
export const isLabel = (c) => c == null || CHORD_LABELS.includes(c);

// Записанное человеком или моделью название («Am7», «F#m», «Bb», «C/E», «Cmaj9», «N») → подпись словаря.
// → { ok: true, c: подпись | null (нет аккорда) } | { ok: false }. Басовая нота после «/» отбрасывается, расширения
// (9, 11, 13) сводятся к ближайшему виду словаря — других видов в разборе записи нет.
const ALIAS = [
  [/^(maj7|Maj7|M7|Δ7?|Δ)$/, 'maj7'], [/^(m(aj)?7?\(?maj7\)?|mM7|minmaj7|m\(M7\)|−Δ)$/i, 'minmaj7'],
  [/^(m7(b5|♭5)|ø7?|hdim7|min7(b5|♭5))$/, 'hdim7'], [/^(dim7|°7|o7)$/, 'dim7'], [/^(dim|°|o|mb5|m♭5)$/, 'dim'], [/^(aug|\+|aug7|\+7)$/, 'aug'],
  [/^(m6|min6|-6)$/, 'min6'], [/^(6|maj6|6\/9|69)$/, 'maj6'],
  [/^(m7|min7|-7|m9|min9|m11|m13)$/, 'min7'], [/^(7|9|11|13|7sus4|dom7|7\(.*\)|7[b#♭♯]\d+)$/, '7'], [/^(maj9|maj11|maj13|M9|maj7\(.*\))$/, 'maj7'],
  [/^(m|min|-|mi)$/, 'min'], [/^(sus4|sus)$/, 'sus4'], [/^sus2$/, 'sus2'], [/^(maj|M|add9|add2|add11|5)?$/, ''],
];
export function parseText(s) {
  const raw = String(s == null ? '' : s).trim();
  if (!raw || /^(n|x|nc|n\.c\.?|-|—|·)$/i.test(raw)) return { ok: true, c: null };
  const m = /^([A-Ga-g])([#♯b♭]?)(.*?)(?:\/[A-Ga-g][#♯b♭]?)?$/.exec(raw.replace(/\s+/g, ''));
  if (!m) return { ok: false };
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()];
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0;
  const rest = m[3];
  for (const [re, q] of ALIAS) if (re.test(rest)) return { ok: true, c: labelOf(base + acc, q) };
  return { ok: false };
}

// Порядок, без наложений, равные соседние слиты. Пропуски (нет разбора) остаются как есть
export function norm(list) {
  const a = (list || []).filter((x) => x && Number.isFinite(x.t) && Number.isFinite(x.d) && x.d > 0.01 && isLabel(x.c == null ? null : x.c))
    .map((x) => ({ t: r2(Math.max(0, x.t)), d: r2(x.d), c: x.c == null ? null : x.c })).sort((p, q) => p.t - q.t);
  const out = [];
  for (let i = 0; i < a.length; i++) {
    const cur = { ...a[i] }, nx = a[i + 1];
    if (nx && cur.t + cur.d > nx.t) cur.d = r2(nx.t - cur.t);
    if (cur.d <= 0.01) continue;
    const last = out[out.length - 1];
    if (last && last.c === cur.c && Math.abs(last.t + last.d - cur.t) < 0.02) last.d = r2(cur.t + cur.d - last.t);
    else out.push(cur);
  }
  return out;
}

// Положить аккорд c на отрезок [t0, t1): всё, что там было, обрезается или делится
export function setRange(list, t0, t1, c) {
  if (!(t1 > t0) || !isLabel(c)) return norm(list);
  const out = [];
  for (const x of list) {
    const e = x.t + x.d;
    if (e <= t0 + 0.005 || x.t >= t1 - 0.005) { out.push({ ...x }); continue; }
    if (x.t < t0 - 0.005) out.push({ t: x.t, d: t0 - x.t, c: x.c });
    if (e > t1 + 0.005) out.push({ t: t1, d: e - t1, c: x.c });
  }
  out.push({ t: t0, d: t1 - t0, c });
  return norm(out);
}
// Сменить подпись у отрезка i (границы те же)
export const setAt = (list, i, c) => (list[i] && isLabel(c) ? norm(list.map((x, k) => (k === i ? { ...x, c } : x))) : norm(list));
// Все отрезки с подписью from → to («заменить везде»)
export const replaceAll = (list, from, to) => (isLabel(to) ? norm(list.map((x) => (x.c === from ? { ...x, c: to } : x))) : norm(list));
// Делить отрезок i в момент t (если он внутри; обе половины сохраняют аккорд — потом одну из них правят)
export function split(list, i, t) {
  const x = list[i];
  if (!x || !(t > x.t + 0.1) || !(t < x.t + x.d - 0.1)) return norm(list);
  const out = list.slice(); out.splice(i, 1, { t: x.t, d: t - x.t, c: x.c }, { t, d: x.t + x.d - t, c: x.c });
  // norm слил бы равные половины обратно — разделяем вручную: возвращаем сырой список с порядком
  return out.map((y) => ({ t: r2(y.t), d: r2(y.d), c: y.c }));
}
// Склеить отрезок i со следующим (остаётся аккорд отрезка i)
export function mergeNext(list, i) {
  if (!list[i] || !list[i + 1]) return norm(list);
  const out = list.slice(); const a = out[i], b = out[i + 1];
  out.splice(i, 2, { t: a.t, d: b.t + b.d - a.t, c: a.c });
  return norm(out);
}
// Полутона: подпись сдвигается по корню, вид сохраняется
export function shiftLabel(c, n) {
  const p = parseChord(c);
  return p ? labelOf(p.pc + n, p.q) : c;
}

// Предложение нейросети: items [{ t, d?, c: «Am7» }] — каждый ставит аккорд с t на d секунд; нет d — до следующего элемента,
// у последнего — до конца отрезка, где он стоит. dur — длина записи. → { chords, n (применено), bad (отброшено) }
export function applyItems(list, items, dur = 0) {
  const src = (Array.isArray(items) ? items : []).filter((x) => x && Number.isFinite(+x.t) && +x.t >= 0 && (!dur || +x.t < dur + 1))
    .map((x) => ({ t: +x.t, d: x.d == null ? null : +x.d, c: x.c })).sort((a, b) => a.t - b.t).slice(0, 2000);
  let out = norm(list), n = 0, bad = (Array.isArray(items) ? items.length : 0) - src.length;
  src.forEach((it, k) => {
    const pr = parseText(it.c); if (!pr.ok) { bad++; return; }
    const next = src[k + 1];
    let end = it.d && it.d > 0 ? it.t + it.d : next ? next.t : null;
    if (end == null) { const at = out.find((x) => x.t <= it.t + 0.005 && x.t + x.d > it.t + 0.005); end = at ? at.t + at.d : dur || it.t + 2; }
    if (dur) end = Math.min(end, dur);
    if (!(end > it.t + 0.05)) { bad++; return; }
    out = setRange(out, it.t, end, pr.c); n++;
  });
  return { chords: out, n, bad };
}

// Пометка правки в разборе записи: первый раз — запоминаем, как посчитано (кнопка «Как посчитано»); cedit — время правки.
// Пересчёт моделью (autostems) и слияние при синхронизации такую запись не затирают
export function markEdited(ana, chords, now = Date.now()) {
  const a = ana || {};
  if (!a.cauto && Array.isArray(a.chords)) a.cauto = a.chords.map((x) => ({ ...x }));
  a.chords = chords; a.cedit = now;
  return a;
}
export function resetEdited(ana, now = Date.now()) {
  if (!ana || !Array.isArray(ana.cauto)) return ana;
  ana.chords = ana.cauto.map((x) => ({ ...x })); delete ana.cauto; ana.cedit = now; // возврат — тоже правка: время новее, синхронизация донесёт его
  return ana;
}

// Подпись словаря → обычное название («A:min7» → «Am7») для нейросети; нет аккорда → «N»
const TXT = { '': '', min: 'm', dim: 'dim', aug: 'aug', min6: 'm6', maj6: '6', min7: 'm7', minmaj7: 'mMaj7', maj7: 'maj7', 7: '7', dim7: 'dim7', hdim7: 'm7b5', sus2: 'sus2', sus4: 'sus4' };
export function labelText(c) { const p = parseChord(c); return p ? ROOTS[p.pc] + (TXT[p.q] ?? p.q) : 'N'; }
