// Аккорды записи → текст в формате песни Melete («[Am] слово», строки по тактам «| Am | F C |», разделы по меткам записи).
// Чистая функция без DOM: окно «Аккорды в текст» в плеере медиатеки (копировать, добавить в песню) и проверки идут через неё.
import { labelText } from './chordedit.js';

const nm = (c) => (c == null ? null : labelText(c));
// Сжатый ряд [{ t, n }]: без «нет аккорда» и без повторов подряд
function seq(chords) {
  const out = [];
  for (const x of chords || []) { const n = nm(x.c); if (!n || n === 'N') continue; if (!out.length || out[out.length - 1].n !== n) out.push({ t: x.t, n }); }
  return out;
}
const heading = (name) => '\n' + String(name || '').trim();

// ana: { chords, downbeats }, opts: { marks: [{ t, name }], lines: [{ t, text }] (текст записи с временем строк), perLine (тактов в строке, 4) }
export function chordText(ana, opts = {}) {
  const S = seq(ana && ana.chords), marks = (opts.marks || []).filter((m) => m && m.name && Number.isFinite(m.t)).sort((a, b) => a.t - b.t);
  if (!S.length) return '';
  const lines = (opts.lines || []).filter((l) => l && String(l.text || '').trim()), out = [];
  let mi = 0;
  const pushMarks = (until) => { while (mi < marks.length && marks[mi].t <= until + 0.05) out.push(heading(marks[mi++].name)); };
  if (lines.length) {
    let ci = 0;
    // до первой строки — вступление одной строкой аккордов
    const first = lines[0].t, intro = [];
    while (ci < S.length && S[ci].t < first - 0.3) intro.push(S[ci++].n);
    if (intro.length) out.push('[' + intro.join('] [') + ']');
    lines.forEach((l, i) => {
      pushMarks(l.t);
      const end = i + 1 < lines.length ? lines[i + 1].t : Infinity, words = String(l.text).trim().split(/\s+/), got = [];
      while (ci < S.length && S[ci].t < end - 0.05) got.push(S[ci++]);
      // аккорд встаёт перед словом, на которое пришёлся по времени (слова — равными долями строки)
      const span = Number.isFinite(end) ? Math.max(0.5, end - l.t) : Math.max(2, (got.length ? got[got.length - 1].t - l.t : 0) + 2);
      const at = words.map(() => '');
      got.forEach((g) => { const k = Math.min(words.length - 1, Math.max(0, Math.floor(((g.t - l.t) / span) * words.length))); at[k] += '[' + g.n + ']'; });
      out.push(words.map((w, k) => at[k] + w).join(' '));
    });
    return out.join('\n').replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
  }
  const downs = ((ana && ana.downbeats) || []).filter(Number.isFinite);
  if (downs.length >= 2) {
    const per = Math.max(1, opts.perLine || 4), bars = [];
    for (let i = 0; i < downs.length; i++) {
      const b0 = downs[i], b1 = i + 1 < downs.length ? downs[i + 1] : Infinity;
      const here = S.filter((s) => s.t >= b0 - 0.05 && s.t < b1 - 0.05).map((s) => s.n);
      if (!here.length) { const prev = [...S].reverse().find((s) => s.t < b0 - 0.05); if (prev) here.push(prev.n); }
      if (here.length) bars.push({ t: b0, c: here });
    }
    let row = [];
    const flush = () => { if (row.length) { out.push('| ' + row.join(' | ') + ' |'); row = []; } };
    bars.forEach((b) => { if (mi < marks.length && marks[mi].t <= b.t + 0.05) { flush(); pushMarks(b.t); } row.push(b.c.join(' ')); if (row.length >= per) flush(); });
    flush();
    return out.join('\n').replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
  }
  for (let i = 0; i < S.length; i += 8) out.push(S.slice(i, i + 8).map((s) => s.n).join(' '));
  return out.join('\n');
}
