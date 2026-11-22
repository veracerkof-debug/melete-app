// Студия: каталог готовых рисунков («Рисунки»). Чистые функции, без звука и DOM; рисунки — данные (свои, не чужие файлы).
// Идея (по образцу открытых студий, DECISIONS 2026-11-22): бас, клавиши и пэды играют по аккордам проекта, ударные и
// аккорды — сами по себе. Бросил рисунок на любые такты — он ложится по тем аккордам, что там есть (нет аккордов —
// от тоники тональности); вся протяжённость аккордов под рисунком закрывается им целиком, повтором.
// Рисунок не хранится в проекте как «рисунок»: он превращается в обычный клип (ноты, удары, аккорды) — правится как любой.
//   семья: chords (последовательности) | drums | bass | keys | pads
//   ударные: lanes { kick, snare, hat, ohat, clap } — по строке в такт, 16 знаков (x — удар), для 4/4
//   бас/клавиши/пэды: bars — такты в рисунке, ev — по такту список [шаг шестнадцатой, длина в шестнадцатых, тон]
// Размер не 4/4: шаги такта берутся по числу долей (3/4 — 12 шагов, 6/8 в проекте — 6 долей — 24 шага повторяет рисунок).
import { newTrack, newData, newClip, setChord, chordNotes, diatonicChords, dataBeats, clipsOf, piecePasses, CLIPS_MAX, STEP } from './project.js';

export const FAMILIES = ['chords', 'drums', 'bass', 'keys', 'pads'];
const SPAN_MAX_BARS = 32, TRACKS_MAX = 24;

const P = (...a) => a.map((s) => s.padEnd(16, '.'));
const drums = (id, bars, lanes) => ({ id, fam: 'drums', bars, lanes });
const part = (id, fam, bars, ev, extra = {}) => ({ id, fam, bars, ev, ...extra });
const prog = (id, bars, ch, extra = {}) => ({ id, fam: 'chords', bars, ch, ...extra }); // ch: [ступень 1…7, такты, вид?]

export const LOOPS = [
  // --- последовательности аккордов: ступени тональности, звучат в любой ---
  prog('pop', 4, [[1, 1], [5, 1], [6, 1], [4, 1]]),
  prog('fifties', 4, [[1, 1], [6, 1], [4, 1], [5, 1]]),
  prog('sad', 4, [[6, 1], [4, 1], [1, 1], [5, 1]]),
  prog('twofive', 4, [[2, 1], [5, 1], [1, 2]], { sev: true }),
  prog('fourfive', 4, [[1, 1], [4, 1], [5, 1], [4, 1]]),
  prog('blues', 12, [[1, 4, '7'], [4, 2, '7'], [1, 2, '7'], [5, 1, '7'], [4, 1, '7'], [1, 1, '7'], [5, 1, '7']]),
  // --- ударные ---
  drums('floor', 2, { kick: P('x...x...x...x...', 'x...x...x...x...'), clap: P('....x.......x...', '....x.......x...'), ohat: P('..x...x...x...x.', '..x...x...x...x.'), hat: P('x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.xx') }),
  drums('rock', 2, { kick: P('x.......x.x.....', 'x.......x.x...x.'), snare: P('....x.......x...', '....x.......x...'), hat: P('x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.'), ohat: P('', '..............x.') }),
  drums('bap', 2, { kick: P('x.....x...x.....', 'x.....x...x..x..'), snare: P('....x.......x...', '....x.......x...'), hat: P('x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.xxx.') }),
  drums('trap', 2, { kick: P('x.......x.x.....', 'x.....x.....x...'), snare: P('........x.......', '........x.......'), hat: P('x.x.x.xxx.x.x.xx', 'x.x.xxxxx.x.x.x.'), clap: P('', '..............x.') }),
  drums('bossa', 2, { kick: P('x.....x.x.....x.', 'x.....x.x.....x.'), snare: P('x..x..x...x.x...', '..x.x...x..x..x.'), hat: P('x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.') }),
  drums('jazz', 2, { hat: P('x...x.x.x...x.x.', 'x...x.x.x...x.x.'), kick: P('x.......x.......', 'x.......x.......'), snare: P('', '..........x...x.') }),
  drums('fill', 1, { kick: P('x...x...........'), snare: P('........x.x.xxxx'), clap: P('............x.x.') }),
  // --- бас: тон — r корень, 3 терция, 5 квинта, 6 секста, 7 септима, 8 октава, a подход к следующему аккорду ---
  part('rootEights', 'bass', 2, [[[0, 2, 'r'], [2, 2, 'r'], [4, 2, 'r'], [6, 2, 'r'], [8, 2, 'r'], [10, 2, 'r'], [12, 2, 'r'], [14, 2, 'r']], [[0, 2, 'r'], [2, 2, 'r'], [4, 2, 'r'], [6, 2, 'r'], [8, 2, 'r'], [10, 2, 'r'], [12, 2, 'r'], [14, 2, '5']]]),
  part('octavePump', 'bass', 2, [[[0, 2, 'r'], [2, 2, '8'], [4, 2, 'r'], [6, 2, '8'], [8, 2, 'r'], [10, 2, '8'], [12, 2, 'r'], [14, 2, '8']], [[0, 2, 'r'], [2, 2, '8'], [4, 2, 'r'], [6, 2, '8'], [8, 2, 'r'], [10, 2, '8'], [12, 2, '5'], [14, 2, '8']]]),
  part('walking', 'bass', 4, [[[0, 4, 'r'], [4, 4, '3'], [8, 4, '5'], [12, 4, 'a']], [[0, 4, 'r'], [4, 4, '5'], [8, 4, '3'], [12, 4, 'a']], [[0, 4, 'r'], [4, 4, '3'], [8, 4, '6'], [12, 4, 'a']], [[0, 4, 'r'], [4, 4, '5'], [8, 4, '8'], [12, 4, 'a']]]),
  part('funk', 'bass', 2, [[[0, 3, 'r'], [3, 1, 'r'], [6, 2, '8'], [8, 2, 'r'], [10, 2, '5'], [12, 1, 'r'], [14, 2, '7']], [[0, 3, 'r'], [4, 2, '5'], [6, 2, '8'], [8, 3, 'r'], [11, 1, '7'], [12, 2, '5'], [14, 2, 'a']]]),
  // --- клавиши: удар целого аккорда ---
  part('block', 'keys', 2, [[[0, 8], [8, 8]], [[0, 8], [8, 6], [14, 2]]], { voice: 'piano' }),
  part('stabs', 'keys', 2, [[[2, 2], [6, 2], [10, 2], [14, 2]], [[2, 2], [6, 2], [10, 2], [13, 2]]], { voice: 'fmep' }),
  part('rhodes', 'keys', 2, [[[0, 5], [6, 3], [10, 5]], [[0, 3], [3, 5], [8, 8]]], { voice: 'fmep' }),
  part('arp', 'keys', 2, [[[0, 2, 0], [2, 2, 1], [4, 2, 2], [6, 2, 3], [8, 2, 2], [10, 2, 1], [12, 2, 2], [14, 2, 1]], [[0, 2, 0], [2, 2, 1], [4, 2, 2], [6, 2, 3], [8, 2, 2], [10, 2, 1], [12, 2, 0], [14, 2, 1]]], { arp: true, voice: 'piano' }),
  // --- пэды: длинные звуки на весь аккорд ---
  part('warm', 'pads', 4, [], { voice: 'wwarm', hold: 0 }),
  part('swell', 'pads', 4, [], { voice: 'wair', hold: 2 }),
];
export const loopById = (id) => LOOPS.find((l) => l.id === id) || null;
export const loopsOf = (fam) => LOOPS.filter((l) => l.fam === fam);

/* ---------- аккорды проекта ---------- */

// Все аккорды проекта по доле: { t, d, pc, type } от начала песни (клипы аккордовых дорожек, с повторами и сдвигом)
export function chordsTimeline(p) {
  const out = [];
  p.clips.forEach((c) => {
    const tr = p.tracks.find((t) => t.id === c.tr);
    if (!tr || tr.kind !== 'chords' || c.mute || !c.data || !c.data.chords || !c.data.chords.length) return;
    const total = dataBeats(p, c.data);
    if (!total) return;
    const semi = c.semi || 0, { offs, k } = piecePasses(p, c);
    offs.forEach((off) => c.data.chords.forEach((ch) => {
      const a = Math.max(0, off + ch.t * k), e = Math.min(c.len, off + (ch.t + ch.d) * k);
      if (e - a > 1e-6) out.push({ t: c.at + a, d: e - a, pc: (ch.pc + semi + 120) % 12, type: ch.type });
    }));
  });
  return out.sort((a, b) => a.t - b.t);
}
export const chordAtBeat = (tl, b) => tl.find((c) => b >= c.t - 1e-6 && b < c.t + c.d - 1e-6) || null;
// Тоника тональности — запасной аккорд, пока аккордов нет
const tonic = (p) => ({ pc: p.key.pc, type: p.key.minor ? 'min' : 'maj' });
// Сколько долей закрыть рисунком, поставленным на долю at: аккорды подряд от этого места, целыми тактами (не короче самого рисунка, не длиннее 32 тактов)
export function spanFrom(p, loop, at, tl = chordsTimeline(p)) {
  const own = loop.bars * p.num;
  if (loop.fam === 'chords') return own;
  let end = at;
  const first = chordAtBeat(tl, at);
  if (first) { end = first.t + first.d; tl.forEach((c) => { if (c.t >= first.t + first.d - 1e-6 && c.t <= end + 1e-6) end = Math.max(end, c.t + c.d); }); }
  const bars = Math.ceil((end - at) / p.num - 1e-6);
  return Math.min(SPAN_MAX_BARS, Math.max(loop.bars, bars)) * p.num;
}

/* ---------- построение ---------- */

const inRange = (m, lo, hi) => { while (m < lo) m += 12; while (m >= hi) m -= 12; return m; };
const rootMidi = (pc, lo = 28) => inRange(pc, lo, lo + 12);
const toneOffset = (tone, type) => {
  const ivs = chordNotes(0, type);
  if (tone === 'r') return 0;
  if (tone === '3') return ivs[1];
  if (tone === '5') return ivs.find((v) => v === 6 || v === 7 || v === 8) || 7;
  if (tone === '7') return ivs[3] != null && ivs[3] < 12 ? ivs[3] : 10;
  if (tone === '6') return 9;
  if (tone === '8') return 12;
  return 0;
};
// Бас-нота рисунка в данный момент: тон относительно аккорда; 'a' — шаг к корню следующего аккорда снизу (нет смены — квинта)
function bassMidi(tone, ch, next) {
  const root = rootMidi(ch.pc);
  if (tone === 'a') {
    if (!next || next.pc === ch.pc) return root + toneOffset('5', ch.type);
    const to = rootMidi(next.pc, 28), m = to - 1;
    return m < 26 ? m + 12 : m;
  }
  return Math.min(48, root + toneOffset(tone, ch.type));
}
// Голос аккорда (клавиши и пэды): ближайшее к прошлому обращение, около середины клавиатуры
function voicing(ch, prev, low = 48, target = 62) {
  const ivs = chordNotes(0, ch.type), root = inRange(ch.pc, low, low + 12);
  let best = null;
  for (let k = 0; k < ivs.length; k++) {
    const ns = ivs.map((v, i) => root + v + (i < k ? 12 : 0)).sort((a, b) => a - b);
    const mid = ns.reduce((s, x) => s + x, 0) / ns.length;
    const move = prev && prev.length === ns.length ? ns.reduce((s, x, i) => s + Math.abs(x - prev[i]), 0) : 0;
    const cost = Math.abs(mid - target) * 0.6 + move;
    if (!best || cost < best.cost) best = { ns, cost };
  }
  return best.ns;
}
const stepsPerBar = (p) => Math.round(p.num / STEP);
// Рисунок такта на нужную длину такта проекта: короче 16 — обрезан, длиннее — повторён
const fitBar = (list, spb, get) => { const out = []; for (let o = 0; o < spb; o += 16) list.forEach((e) => { const s = get(e) + o; if (s < spb) out.push([e, s]); }); return out; };

// Данные клипа для рисунка loop, поставленного на долю at на span долей (аккорды проекта tl; нет — тоника)
export function buildLoop(p, loop, at, span = spanFrom(p, loop, at), tl = chordsTimeline(p)) {
  const spb = stepsPerBar(p), bars = Math.max(1, Math.round(span / p.num));
  if (loop.fam === 'chords') {
    const dc = diatonicChords(p.key, !!loop.sev), d = newData('chords', loop.bars);
    let t = 0;
    loop.ch.forEach(([deg, n, type]) => { const c = dc[(deg - 1 + 7) % 7]; setChord(d, t, n * p.num, c.pc, type || c.type); t += n * p.num; });
    return { kind: 'chords', data: d, len: loop.bars * p.num, loop: false };
  }
  if (loop.fam === 'drums') {
    const d = newData('drums', loop.bars);
    Object.entries(loop.lanes).forEach(([lane, rows]) => rows.forEach((row, b) => {
      for (let k = 0; k < spb; k++) if (row[k % 16] === 'x') (d.steps[lane] || (d.steps[lane] = [])).push(b * spb + k);
    }));
    Object.values(d.steps).forEach((a) => a.sort((x, y) => x - y));
    return { kind: 'drums', data: d, len: span, loop: true };
  }
  const notes = [], chAt = (b) => chordAtBeat(tl, at + b) || tonic(p);
  const untilChange = (b) => { const nx = tl.find((c) => c.t > at + b + 1e-6); return nx ? nx.t - (at + b) : Infinity; };
  let prevV = null;
  if (loop.fam === 'pads') {
    const hold = loop.hold ? loop.hold * p.num : Infinity;
    let b = 0;
    while (b < span - 1e-6) {
      const ch = chAt(b), d = Math.min(span - b, untilChange(b), hold === Infinity ? span : hold);
      const ns = voicing(ch, prevV, 48, 60); prevV = ns;
      [ns[0] - 12, ...ns].forEach((m) => notes.push({ t: b, d, m, v: 0.55 }));
      b += d;
    }
  } else {
    for (let bar = 0; bar < bars; bar++) {
      const list = loop.ev[bar % loop.bars];
      fitBar(list, spb, (e) => e[0]).forEach(([e, s]) => {
        const t0 = bar * p.num + s * STEP, ch = chAt(t0), len = Math.min(e[1] * STEP, untilChange(t0), span - t0);
        if (len <= 1e-6) return;
        if (loop.fam === 'bass') {
          const next = chordAtBeat(tl, at + bar * p.num + p.num) || null;
          notes.push({ t: t0, d: len, m: bassMidi(e[2], ch, next && next.pc !== ch.pc ? next : null), v: s % 4 === 0 ? 0.9 : 0.75 });
        } else if (loop.arp) {
          const ns = voicing(ch, null, 48, 62), top = ns.length, idx = e[2];
          notes.push({ t: t0, d: len, m: ns[idx % top] + 12 * Math.floor(idx / top), v: s % 8 === 0 ? 0.75 : 0.6 });
        } else {
          const ns = voicing(ch, prevV, 48, 62); prevV = ns;
          ns.forEach((m) => notes.push({ t: t0, d: len, m, v: s % 4 === 0 ? 0.75 : 0.62 }));
        }
      });
    }
  }
  notes.sort((a, b) => a.t - b.t || a.m - b.m);
  const d = newData('notes', bars); d.notes = notes.filter((n) => n.t < bars * p.num);
  return { kind: 'notes', data: d, len: span, loop: false };
}

/* ---------- куда ложится ---------- */

export const roleOf = (loop) => (loop.fam === 'bass' ? 'bass' : loop.fam === 'keys' ? 'keys' : loop.fam === 'pads' ? 'pad' : null);
const trackFits = (tr, loop) => {
  if (loop.fam === 'chords') return tr.kind === 'chords';
  if (loop.fam === 'drums') return tr.kind === 'drums';
  if (tr.kind !== 'notes') return false;
  const role = roleOf(loop);
  return tr.role === role || (!tr.role && role === 'bass' && tr.inst === 'abass');
};
const busy = (p, tr, at, len) => clipsOf(p, tr).some((c) => c.at < at + len - 1e-6 && c.at + c.len > at + 1e-6);
// Дорожка для рисунка: заданная (если подходит и свободна), иначе первая подходящая свободная, иначе — новая
export function targetTrack(p, loop, at, len, want = null) {
  const w = want && p.tracks.find((t) => t.id === want);
  if (w && trackFits(w, loop) && !busy(p, w, at, len)) return { tr: w, fresh: false };
  const found = p.tracks.find((t) => trackFits(t, loop) && !busy(p, t, at, len));
  if (found) return { tr: found, fresh: false };
  if (p.tracks.length >= TRACKS_MAX) return null;
  const kind = loop.fam === 'chords' ? 'chords' : loop.fam === 'drums' ? 'drums' : 'notes';
  const patch = {};
  if (kind === 'notes') { patch.role = roleOf(loop); patch.inst = loop.fam === 'bass' ? 'abass' : loop.voice || 'piano'; }
  if (loop.fam === 'bass') patch.oct = 0;
  return { tr: newTrack(kind, p.tracks.length, patch), fresh: true };
}
// Поставить рисунок: клип ложится в проект (при необходимости — новая дорожка). → { tr, clip, fresh } или null (нет места)
export function placeLoop(p, loop, at, want = null) {
  const beat = Math.max(0, Math.round(at / p.num) * p.num); // к такту
  if (p.clips.length >= CLIPS_MAX) return null;
  const tl = chordsTimeline(p), span = spanFrom(p, loop, beat, tl), built = buildLoop(p, loop, beat, span, tl), tg = targetTrack(p, loop, beat, built.len, want);
  if (!tg) return null;
  if (tg.fresh) p.tracks.push(tg.tr);
  const c = newClip(p, tg.tr, beat, built.len, built.data);
  c.loop = built.loop;
  p.clips.push(c); p.clips.sort((a, b) => a.at - b.at);
  return { tr: tg.tr, clip: c, fresh: tg.fresh };
}

/* ---------- мини-картинка плитки ---------- */

// Клетки для рисования: { cols, rows, cells: [[колонка, ряд, длина]] } — по рисунку, не по тональности
const LANE_ROW = { ohat: 0, hat: 1, clap: 2, snare: 3, kick: 4 };
const TONE_ROW = { 8: 0, 7: 1, 6: 1, 5: 2, 3: 3, a: 3, r: 4 };
export function loopShape(loop) {
  const cols = loop.bars * 16, cells = [];
  if (loop.fam === 'drums') {
    Object.entries(loop.lanes).forEach(([lane, rows]) => rows.forEach((row, b) => { for (let k = 0; k < 16; k++) if (row[k] === 'x') cells.push([b * 16 + k, LANE_ROW[lane], 1]); }));
    return { cols, rows: 5, cells };
  }
  if (loop.fam === 'chords') return { cols: 0, rows: 0, cells: [] };
  loop.ev.forEach((list, b) => list.forEach(([s, l, tone]) => {
    if (loop.fam === 'bass') cells.push([b * 16 + s, TONE_ROW[tone] == null ? 4 : TONE_ROW[tone], l]);
    else if (loop.arp) cells.push([b * 16 + s, 4 - Math.min(4, tone), l]);
    else [1, 2, 3].forEach((r) => cells.push([b * 16 + s, r, l]));
  }));
  if (loop.fam === 'pads') for (let b = 0; b < loop.bars; b += loop.hold || loop.bars) [1, 2, 3].forEach((r) => cells.push([b * 16, r, (loop.hold || loop.bars) * 16]));
  return { cols, rows: 5, cells };
}
// Подпись последовательности аккордов: ступени тональности (I V vi IV)
export function progLabel(p, loop) {
  const dc = diatonicChords(p.key, !!loop.sev);
  return loop.ch.map(([deg, , type]) => { const r = dc[(deg - 1 + 7) % 7].rn; return type === '7' && !/7$/.test(r) ? r + '7' : r; }).join(' ');
}
