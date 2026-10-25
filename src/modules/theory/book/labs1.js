// Учебник, часть 1 «Музыкальная грамота»: схемы глав sound, rhythm, meter, pitch, mode, keys, melody, perform.
// Контракт тот же, что в labs.js: { st, render(st) → HTML, on(st, действие, el), set?(st, ключ) }. Строки — T(ключ),
// таблицы названий — L (нот: L.NN, октав — строки oc.*, стихи — L.VERSE). Звук — snd.play / seq / chord.
import { NAT, N, pcOf, nm, parseNote, up, rootN, ALL12, MAJ_ROOTS, ivByKey, CIRCLE, REL_MIN, SIG, scaleById } from './engine.js';
import { keyboardSVG, marksOf, seg, sel, playBtn, esc, simp } from './draw.js';
import { scoreSVG, beatNotes, durOf } from './score.js';

// midi ↔ нота: буква со знаком по номеру ступени (диатонический номер) или «удобная» с диезами/бемолями
const SHARP = [N(0, 0), N(0, 1), N(1, 0), N(1, 1), N(2, 0), N(3, 0), N(3, 1), N(4, 0), N(4, 1), N(5, 0), N(5, 1), N(6, 0)];
const FLAT = [N(0, 0), N(1, -1), N(1, 0), N(2, -1), N(2, 0), N(3, 0), N(4, -1), N(4, 0), N(5, -1), N(5, 0), N(6, -1), N(6, 0)];
const noteOf = (m, flats = false) => (flats ? FLAT : SHARP)[((m % 12) + 12) % 12];
const dOf = (n, m) => (Math.round((m - NAT[n.l] - n.a) / 12) - 1) * 7 + n.l; // диатонический номер (C4 = 28)
const fromD = (d, a = 0) => { const l = ((d % 7) + 7) % 7, o = Math.floor(d / 7) + 1; return { n: N(l, a), m: o * 12 + NAT[l] + a }; };
const octIdx = (n, m) => Math.round((m - NAT[n.l] - n.a) / 12) - 1;

// Мелодии схем — свои, учебные. [ноты через пробел: буква, знак, октава, длительность (w h q e s, точка — «.»)]
// пример: 'G4q A4e B4e C5h' ; пауза — 'r q'
function parseMel(str) {
  return str.trim().split(/\s+/).map((tok) => {
    if (tok === '|') return { bar: '|' };
    if (tok === '||') return { bar: '|.' };
    const r = /^r([whqes])(\.?)$/.exec(tok);
    if (r) return { d: r[1], dot: !!r[2], rest: true };
    const mm = /^([A-G])(#|b)?(\d)([whqes])(\.?)(~?)$/.exec(tok);
    if (!mm) return null;
    const l = 'CDEFGAB'.indexOf(mm[1]), a = mm[2] === '#' ? 1 : mm[2] === 'b' ? -1 : 0, o = +mm[3];
    return { n: N(l, a), m: (o + 1) * 12 + NAT[l] + a, d: mm[4], dot: !!mm[5], tie: !!mm[6] };
  }).filter(Boolean);
}
// ребра: восьмые и шестнадцатые внутри одной четверти (доли) — в одну группу
function beam(items, beat = 1) {
  let t = 0, g = 0;
  items.forEach((x) => {
    if (x.bar) { t = Math.ceil(t / beat - 1e-6) * beat; return; }
    const b = Math.floor(t / beat + 1e-6);
    if (!x.rest && (x.d === 'e' || x.d === 's') && durOf(x) < beat) x.bm = 'g' + b;
    t += durOf(x); g++;
  });
  // группа из одной ноты — без ребра (флажок)
  const cnt = {}; items.forEach((x) => { if (x.bm) cnt[x.bm] = (cnt[x.bm] || 0) + 1; });
  items.forEach((x) => { if (x.bm && cnt[x.bm] < 2) delete x.bm; });
  return items;
}
// мелодия → события звука [время, midi, длит.] при темпе bpm (четверть — доля); лига складывает длительности
function melEvents(items, bpm = 90) {
  const q = 60 / bpm, out = []; let t = 0, hold = null;
  items.forEach((x) => {
    if (x.bar) return;
    const d = durOf(x) * q;
    if (!x.rest) { if (hold) hold[2] += d; else out.push(hold = [t, x.m, d]); if (!x.tie) { hold[2] *= 0.92; hold = null; } }
    t += d;
  });
  return { ev: out, len: t };
}

export function grammarLabs({ T, L, snd, fact, sp, rootSel }) {
  const LABS = {};
  const NN = L.NN || ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const ACC = { '-2': '𝄫', '-1': '♭', 0: '', 1: '♯', 2: '𝄪' };
  const syl = (n) => NN[n.l] + ACC[n.a];
  const both = (n) => (NN[0] === 'C' ? nm(n) : syl(n) + ' · ' + nm(n));
  const sc = (items, o = {}) => scoreSVG(items, { label: T('sc.staff'), ...o });
  const qsel = (el, cl) => el && el.querySelectorAll ? [...el.querySelectorAll(cl)] : [];
  const lit = (el, cl, i) => { qsel(el, cl).forEach((x, k) => x.classList.toggle('lit', k === i)); };

  /* ---------- Звук и запись ---------- */
  // Обертоны: ряд от основного тона, подписи интервалов между соседними
  const PART_IV = { 12: '8', 7: '5', 5: '4', 4: '3', 3: 'b3', 2: '2', 1: 'b2' };
  const PART_DEG = ['1', '1', '5', '1', '3', '5', 'b7', '1', '2', '3', '#4', '5', 'b6', 'b7', '7', '1'];
  LABS.overtones = {
    st: { root: 'C', n: 8 },
    parts(s) { const f0 = 36 + pcOf(rootN(s.root)); return Array.from({ length: s.n }, (_, i) => { const x = 12 * Math.log2(i + 1), m = Math.round(x); return { k: i + 1, m: f0 + m, ct: Math.round((x - m) * 100) }; }); },
    render(s) {
      const ps = this.parts(s);
      const chips = ps.map((p, i) => {
        const iv = i ? PART_IV[p.m - ps[i - 1].m] : null, n = simp(up(rootN(s.root), PART_DEG[i]));
        return '<button class="ovc' + (i < 6 ? ' maj' : '') + '" data-a="p:' + i + '"><small>' + p.k + '</small><b>' + nm(n) + '</b><span>' + (iv ? (L.IV[iv] || [iv])[0].toLowerCase() : T('ov.fund')) + (Math.abs(p.ct) > 8 ? ' · ' + (p.ct > 0 ? '+' : '') + p.ct + '¢' : '') + '</span></button>';
      }).join('');
      return '<div class="bkctl">' + rootSel('root', s.root, ['C', 'D', 'E♭', 'E', 'F', 'G', 'A', 'B♭'].map((x) => [x, x])) + seg('n', [[6, '6'], [8, '8'], [12, '12'], [16, '16']], s.n) + '</div>' +
        '<div class="ovrow">' + chips + '</div>' + keyboardSVG(marksOf(ps.map((p, i) => ({ m: p.m, c: i ? (i < 6 ? 'alt' : 'on') : 'root', t: String(p.k) }))), { lo: 36, hi: 96 }) +
        '<div class="bkrow">' + playBtn('data-a="up"', T('ov.up')) + playBtn('data-a="six"', T('ov.six')) + '</div><p class="bknote">' + T('ov.note') + '</p>';
    },
    on(s, a) {
      const ps = this.parts(s);
      if (a.startsWith('p:')) snd.chord([ps[0].m, ps[+a.slice(2)].m], { dur: 1.6 });
      if (a === 'up') snd.seq(ps.map((p) => p.m), 0.42, 0.8);
      if (a === 'six') snd.chord(ps.slice(0, 6).map((p) => p.m), { dur: 2.4, arp: 0.12 });
    },
  };
  // Октавы: названия и научная запись (C4 — до первой октавы)
  LABS.octaves = {
    st: { o: 4 },
    render(s) {
      const lo = Math.max(21, (s.o + 1) * 12), marks = {};
      for (let m = lo; m < lo + 12 && m <= 108; m++) marks[m] = { c: m % 12 === 0 ? 'root' : 'on', t: m % 12 === 0 ? 'C' + s.o : '' };
      return '<div class="bkctl">' + seg('o', [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => [i, T('oc.s' + i)]), s.o) + '</div>' +
        '<div class="bkfacts wide"><div class="bkbig">' + T('oc.n' + s.o) + '</div><dl>' + fact(T('oc.sci'), 'C' + s.o + '–B' + s.o + (s.o === 0 ? ' (' + T('oc.only') + ' A0–B0)' : s.o === 8 ? ' (' + T('oc.only') + ' C8)' : '')) +
        fact(T('oc.do'), syl(N(0, 0)) + ' ' + T('oc.g' + s.o) + ' = C' + s.o) + '</dl></div>' +
        keyboardSVG(marks, { lo: 21, hi: 108, h: 70 }) + '<div class="bkrow">' + playBtn('data-a="p"') + '</div>';
    },
    on(s) { const b = (s.o + 1) * 12; snd.seq([0, 2, 4, 5, 7, 9, 11, 12].map((x) => b + x).filter((m) => m >= 21 && m <= 108), 0.2, 0.4); },
  };
  // Нота на стане в разных ключах: та же высота — разные места
  LABS.clefs = {
    st: { d: 28, a: 0, clef: 'treble' },
    render(s) {
      const { n, m } = fromD(s.d, s.a), o = octIdx(n, m);
      const one = (clef) => '<div class="clefc' + (clef === s.clef ? ' on' : '') + '"><small>' + T('cl.' + clef) + '</small>' + sc([{ d: 'w', n, m }], { clef, w: 96 }) + '</div>';
      return '<div class="bkctl">' + seg('clef', ['treble', 'bass', 'alto', 'tenor'].map((c) => [c, T('cl.' + c)]), s.clef) +
        '<button class="ib" data-a="dn" aria-label="' + T('cl.down') + '">▼</button><button class="ib" data-a="up" aria-label="' + T('cl.up') + '">▲</button>' +
        seg('a', [[-1, '♭'], [0, '♮'], [1, '♯']], s.a) + '</div>' +
        '<div class="bktwo"><div>' + sc([{ d: 'w', n, m }], { clef: s.clef, w: 130 }) + '</div><div class="bkfacts"><div class="bkbig">' + both(n) + '</div><dl>' +
        fact(T('oc.oct'), T('oc.n' + Math.max(0, Math.min(8, o))) + ' (' + nm(n) + o + ')') + fact(T('cl.line'), T(s.d % 2 === 0 ? 'cl.onl' : 'cl.btw')) + '</dl></div></div>' +
        '<div class="clefs">' + ['treble', 'bass', 'alto', 'tenor'].map(one).join('') + '</div>' +
        keyboardSVG(marksOf([{ m, c: 'root', t: nm(n) }]), { lo: 36, hi: 84 }) + '<div class="bkrow">' + playBtn('data-a="p"') + '</div>';
    },
    on(s, a) {
      if (a === 'up' && s.d < 42) s.d++;
      if (a === 'dn' && s.d > 14) s.d--;
      const { m } = fromD(s.d, s.a); snd.chord([m], { dur: 1.2 });
    },
    set(s) { const { m } = fromD(s.d, s.a); snd.chord([m], { dur: 1.2 }); },
  };
  // Диапазоны голосов и инструментов (примерные; у инструментов — звучащие высоты)
  const RANGES = [
    ['v', 'sop', 60, 84], ['v', 'mez', 57, 81], ['v', 'alt', 53, 77], ['v', 'ten', 48, 72], ['v', 'bar', 45, 67], ['v', 'bas', 40, 64],
    ['i', 'pno', 21, 108], ['i', 'gtr', 40, 83], ['i', 'bgt', 28, 67], ['i', 'vln', 55, 100], ['i', 'vla', 48, 88], ['i', 'vcl', 36, 81], ['i', 'cb', 28, 67],
    ['i', 'fl', 60, 96], ['i', 'cl', 50, 91], ['i', 'asx', 49, 81], ['i', 'tsx', 44, 75], ['i', 'tpt', 52, 82], ['i', 'tbn', 40, 72],
  ];
  LABS.ranges = {
    st: { g: 'v', i: -1 },
    render(s) {
      const lo = 21, hi = 108, X = (m) => ((m - lo) / (hi - lo)) * 100;
      const rows = RANGES.filter((r) => r[0] === s.g).map((r, i) => '<button class="rgr' + (i === s.i ? ' on' : '') + '" data-a="r:' + i + '"><span>' + T('rg.' + r[1]) + '</span><i style="left:' + X(r[2]) + '%;width:' + (X(r[3]) - X(r[2])) + '%"></i><small>' + nm(noteOf(r[2], true)) + octIdx(noteOf(r[2], true), r[2]) + '–' + nm(noteOf(r[3], true)) + octIdx(noteOf(r[3], true), r[3]) + '</small></button>').join('');
      const ticks = [24, 36, 48, 60, 72, 84, 96, 108].map((m) => '<em style="left:' + X(m) + '%">C' + (m / 12 - 1) + '</em>').join('');
      return '<div class="bkctl">' + seg('g', [['v', T('rg.voices')], ['i', T('rg.instr')]], s.g) + '</div><div class="rgw"><div class="rgt">' + ticks + '</div>' + rows + '</div><p class="bknote">' + T('rg.note') + '</p>';
    },
    on(s, a) { if (a.startsWith('r:')) { s.i = +a.slice(2); const r = RANGES.filter((x) => x[0] === s.g)[s.i]; snd.seq([r[2], r[3]], 0.8, 1.2); } },
    set(s) { s.i = -1; },
  };

  /* ---------- Длительности ---------- */
  const B4 = { n: N(6, 0), m: 71 };
  const DUR_ROWS = [
    ['w', [{ d: 'w' }]], ['h', [{ d: 'h' }, { d: 'h' }]], ['q', [{ d: 'q' }, { d: 'q' }, { d: 'q' }, { d: 'q' }]],
    ['e', Array.from({ length: 8 }, () => ({ d: 'e' }))], ['s', Array.from({ length: 16 }, () => ({ d: 's' }))],
    ['dot', [{ d: 'h', dot: true }, { d: 'q' }, { d: 'q', dot: true }, { d: 'e' }, { d: 'q' }]],
    ['tie', [{ d: 'h', tie: true }, { d: 'q' }, { d: 'q' }, { d: 'q' }, { d: 'q', tie: true }, { d: 'e' }, { d: 'e' }]],
    ['trip', [{ d: 'e', trip: 'a' }, { d: 'e', trip: 'b' }, { d: 'e', trip: 'c' }, { d: 'q' }, { d: 'e', trip: 'a' }, { d: 'e', trip: 'b' }, { d: 'e', trip: 'c' }, { d: 'q' }]],
    ['punct', [{ d: 'e', dot: true }, { d: 's' }, { d: 'e', dot: true }, { d: 's' }, { d: 'q' }, { d: 'q' }]],
    ['rest', [{ d: 'q' }, { d: 'q', rest: true }, { d: 'e' }, { d: 'e', rest: true }, { d: 'e', rest: true }, { d: 'e' }]],
  ];
  const rowItems = (r) => beam(r[1].map((x) => ({ ...x, ...(x.rest ? {} : B4) })).concat([{ bar: '|.' }]));
  LABS.durs = {
    st: { i: 2, bpm: 72 },
    render(s) {
      return '<div class="bkctl">' + seg('bpm', [[60, '60'], [72, '72'], [96, '96']], s.bpm) + sp('du.hint') + '</div><div class="durs">' +
        DUR_ROWS.map((r, i) => '<button class="durr' + (i === s.i ? ' on' : '') + '" data-a="r:' + i + '"><b>' + T('du.' + r[0]) + '</b>' + sc(rowItems(r), { clef: null, time: i < 5 ? [4, 4] : null, unit: 22 }) + '</button>').join('') + '</div>';
    },
    on(s, a, el) {
      if (a.startsWith('r:')) s.i = +a.slice(2);
      const items = rowItems(DUR_ROWS[s.i]), { ev, len } = melEvents(items, s.bpm), q = 60 / s.bpm;
      const beats = Array.from({ length: Math.round(len / q) }, (_, k) => [k * q, k % 4 ? 'click' : 'clickHi', 0.5]);
      snd.play({ hits: beats, notes: ev.map(([t, m, d]) => [t, m, d, 0.6]) });
    },
  };

  /* ---------- Ритм-сетка: удары по долям, ровно или со свингом ---------- */
  const PRESETS = {
    q: [2, '10101010'], e: [2, '11111111'], dot: [4, '1001100110011001'], sync: [2, '11011010'], trip: [3, '111111111111'],
    off: [2, '01010101'], ch: [2, '10011010'], mix: [4, '1000101010111000'],
  };
  const makeGrid = (preset, swing) => ({
    st: { p: preset, sub: PRESETS[preset][0], cells: PRESETS[preset][1].repeat(2), swing, bpm: 96 },
    render(s) {
      const sub = s.sub, beats = s.cells.length / sub, items = [];
      for (let b = 0; b < beats; b++) {
        items.push(...beatNotes([...s.cells.slice(b * sub, b * sub + sub)].map(Number), sub, 'b' + b).map((x) => (x.rest ? x : { ...x, ...B4 })));
        if (b % 4 === 3) items.push({ bar: b === beats - 1 ? '|.' : '|' });
      }
      const cells = [...s.cells].map((c, i) => '<button class="rgc' + (c === '1' ? ' on' : '') + (i % sub === 0 ? ' beat' : '') + (i % (sub * 4) === 0 ? ' bar' : '') + '" data-a="x:' + i + '" aria-pressed="' + (c === '1') + '">' + (i % sub === 0 ? (i / sub) % 4 + 1 : '') + '</button>').join('');
      return '<div class="bkctl">' + sel('p', Object.keys(PRESETS).map((k) => [k, T('rg.p.' + k)]), s.p, T('ui.pattern')) + seg('sub', [[2, '♪'], [3, '³'], [4, '♬']], s.sub) +
        (s.sub === 2 ? seg('swing', [[0, T('rg.even')], [1, T('rg.swing')]], s.swing ? 1 : 0) : '') + seg('bpm', [[72, '72'], [96, '96'], [132, '132']], s.bpm) + '</div>' +
        '<div class="rgg" style="--n:' + s.cells.length + '">' + cells + '</div>' + sc(items, { clef: 'perc', time: [4, 4], unit: 20 }) +
        (s.sub === 2 && s.swing ? '<p class="bknote">' + T('rg.swingNote') + '</p>' : '') + '<div class="bkrow">' + playBtn('data-a="p"') + sp('rg.hint') + '</div>';
    },
    set(s, k) {
      if (k === 'p') { s.sub = PRESETS[s.p][0]; s.cells = PRESETS[s.p][1].repeat(2); }
      if (k === 'sub') s.cells = (s.sub === 3 ? '100' : s.sub === 4 ? '1000' : '10').repeat(8);
      if (k === 'swing') s.swing = !!+s.swing;
    },
    on(s, a, el) {
      if (a.startsWith('x:')) { const i = +a.slice(2), c = [...s.cells]; c[i] = c[i] === '1' ? '0' : '1'; s.cells = c.join(''); return; }
      const q = 60 / s.bpm, sub = s.sub, hits = [], marks = [];
      [...s.cells].forEach((c, i) => {
        const b = Math.floor(i / sub), k = i % sub;
        const t = b * q + (sub === 2 && s.swing ? (k ? q * 2 / 3 : 0) : (k * q) / sub);
        if (c === '1') hits.push([t, 'clave', k ? 0.65 : 0.9]);
        marks.push([t, () => lit(el, '.rgc', i)]);
      });
      for (let b = 0; b < s.cells.length / sub; b++) hits.push([b * q, b % 4 ? 'click' : 'clickHi', 0.35]);
      marks.push([(s.cells.length / sub) * q, () => lit(el, '.rgc', -1)]);
      snd.play({ hits, marks });
      return false;
    },
  });
  LABS.rgrid = makeGrid('e', true);
  LABS.syncop = makeGrid('sync', false);

  /* ---------- Метр ---------- */
  // уровни: 2 — сильная, 1 — относительно сильная, 0 — слабая; den — счётная длительность
  const METERS = {
    '2/4': [[2, 0], 4], '3/4': [[2, 0, 0], 4], '4/4': [[2, 0, 1, 0], 4], '2/2': [[2, 0], 2], '3/8': [[2, 0, 0], 8], '6/8': [[2, 0, 0, 1, 0, 0], 8],
    '9/8': [[2, 0, 0, 1, 0, 0, 1, 0, 0], 8], '12/8': [[2, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0], 8], '5/4 3+2': [[2, 0, 0, 1, 0], 4], '5/4 2+3': [[2, 0, 1, 0, 0], 4], '7/8 2+2+3': [[2, 0, 1, 0, 1, 0, 0], 8],
  };
  // схемы тактирования: точки долей (x, y в квадрате 100) — «раз» всегда вниз
  const CONDUCT = {
    2: [[50, 86], [50, 22]], 3: [[50, 86], [80, 62], [52, 20]], 4: [[50, 86], [20, 60], [82, 62], [52, 20]],
    6: [[50, 86], [38, 74], [16, 60], [70, 64], [86, 58], [52, 20]],
  };
  LABS.meter = {
    st: { m: '4/4', bpm: 90 },
    render(s) {
      const [acc, den] = METERS[s.m], n = acc.length, cnt = T('mt.count').split(' ');
      const cond = CONDUCT[n] || null;
      const pts = cond ? '<svg class="cond" viewBox="0 0 100 100"><path d="M' + cond.map((p) => p.join(' ')).join(' L') + ' Z"/>' + cond.map((p, i) => '<g class="cpt"><circle cx="' + p[0] + '" cy="' + p[1] + '" r="7"/><text x="' + p[0] + '" y="' + (p[1] + 3) + '">' + (i + 1) + '</text></g>').join('') + '</svg>' : '';
      const beats = acc.map((a, i) => '<span class="mbt a' + a + '"><b>' + (i + 1) + '</b><small>' + (cnt[i] || '') + '</small></span>').join('');
      return '<div class="bkctl">' + sel('m', Object.keys(METERS).map((k) => [k, k]), s.m, T('mt.size')) + seg('bpm', [[60, '60'], [90, '90'], [120, '120']], s.bpm) + '</div>' +
        '<div class="bkmeter">' + beats + '</div><div class="bktwo"><div>' + pts + '</div><div><p class="bknote">' + T('mt.' + (/\+/.test(s.m) ? 'mixed' : n === 2 || n === 3 ? 'simple' : 'compound')) + '</p>' +
        '<div class="bkrow">' + playBtn('data-a="p"') + '</div></div></div>';
    },
    on(s, a, el) {
      const [acc, den] = METERS[s.m], q = (60 / s.bpm) * (den === 8 ? 0.5 : den === 2 ? 2 : 1), n = acc.length, hits = [], marks = [];
      for (let b = 0; b < n * 2; b++) {
        const lv = acc[b % n]; hits.push([b * q, lv === 2 ? 'clickHi' : 'click', lv === 2 ? 0.9 : lv ? 0.6 : 0.3]);
        marks.push([b * q, () => { lit(el, '.mbt', b % n); const pts = qsel(el, '.cpt'); if (pts.length) lit(el, '.cpt', b % pts.length); }]);
      }
      marks.push([n * 2 * q, () => { lit(el, '.mbt', -1); lit(el, '.cpt', -1); }]);
      snd.play({ hits, marks });
      return false;
    },
  };
  // Стих и размер: ударные слоги — сильные доли, черта — перед ударным слогом
  LABS.verse = {
    st: { i: 0 },
    render(s) {
      const V = L.VERSE || [], v = V[s.i]; if (!v) return '';
      const sy = v.l.split(/[\s-]+/).filter(Boolean);
      let html = '';
      sy.forEach((x, k) => { const st = x === x.toUpperCase() && /\p{L}/u.test(x); html += (st && k ? '<i class="vbar">|</i>' : '') + '<span class="vsy' + (st ? ' st' : '') + '">' + x.toLowerCase() + '</span>'; });
      return '<div class="bkctl">' + seg('i', V.map((x, i) => [i, x.t]), s.i) + '</div><div class="verse">' + html + '</div><p class="bknote">' + v.n + '</p><div class="bkrow">' + playBtn('data-a="p"') + '</div>';
    },
    on(s, a, el) {
      const v = (L.VERSE || [])[s.i]; if (!v) return;
      const sy = v.l.split(/[\s-]+/).filter(Boolean), q = 0.36, hits = [], marks = [];
      sy.forEach((x, k) => { const st = x === x.toUpperCase(); hits.push([k * q, st ? 'clickHi' : 'wood', st ? 0.95 : 0.4]); marks.push([k * q, () => lit(el, '.vsy', k)]); });
      marks.push([sy.length * q, () => lit(el, '.vsy', -1)]);
      snd.play({ hits, marks });
      return false;
    },
  };

  /* ---------- Тон, полутон, знаки ---------- */
  LABS.semis = {
    st: { n: 'E' },
    render(s) {
      const p = parseNote(s.n).n, m = 60 + pcOf(p);
      const dia = simp(up(p, 'b2')), chr = N(p.l, p.a + 1), tone = up(p, '2');
      const row = (k, n2, mm) => '<button class="bkli" data-a="' + k + '"><b>' + T('se.' + k) + '</b><span>' + both(p) + ' → ' + both(n2) + '</span></button>';
      return '<div class="bkctl">' + sel('n', ALL12.map((x) => [x, x]), s.n, T('ui.root')) + '</div><div class="bktwo"><div>' +
        sc([{ d: 'h', n: p, m }, { d: 'h', n: dia, m: m + 1 }, { bar: '|' }, { d: 'h', n: p, m }, { d: 'h', n: Math.abs(chr.a) < 3 ? chr : dia, m: m + 1 }, { bar: '|' }, { d: 'h', n: p, m }, { d: 'h', n: tone, m: m + 2 }, { bar: '|.' }], { clef: 'treble' }) +
        '</div><div class="bklist">' + row('dia', dia, m + 1) + row('chr', chr, m + 1) + row('tone', tone, m + 2) + '</div></div>' +
        keyboardSVG(marksOf([{ m, c: 'root', t: nm(p) }, { m: m + 1, c: 'alt', t: '½' }, { m: m + 2, c: 'on', t: '1' }]), { lo: 55, hi: 79 });
    },
    on(s, a) { const m = 60 + pcOf(parseNote(s.n).n); snd.seq(a === 'tone' ? [m, m + 2] : [m, m + 1], 0.55, 0.8); },
  };
  // Энгармонизм: все имена одной клавиши
  LABS.enh = {
    st: { pc: 1 },
    names(pc) { const out = []; for (let l = 0; l < 7; l++) for (const a of [-2, -1, 0, 1, 2]) if ((((NAT[l] + a) % 12) + 12) % 12 === pc) out.push(N(l, a)); return out.sort((x, y) => Math.abs(x.a) - Math.abs(y.a)); },
    render(s) {
      const ns = this.names(s.pc), m = 60 + s.pc;
      return '<div class="bkctl">' + seg('pc', Array.from({ length: 12 }, (_, i) => [i, nm(noteOf(i))]), s.pc) + '</div><div class="bktwo"><div>' +
        sc(ns.map((n) => ({ d: 'w', n, m: m + (n.l === 6 && s.pc < 3 ? -12 : n.l === 0 && s.pc > 9 ? 12 : 0) })), { clef: 'treble' }) + '</div><div class="bkfacts"><div class="bkbig">' + ns.map(both).join(' = ') + '</div><p class="bknote">' + T('en.note') + '</p></div></div>' +
        keyboardSVG(marksOf([{ m, c: 'root', t: ns.map(nm).join('/') }]), { lo: 55, hi: 79 });
    },
    on() {},
    set(s) { snd.chord([60 + s.pc], { dur: 1 }); },
  };

  /* ---------- Лад и гамма ---------- */
  const MAJ = ['1', '2', '3', '4', '5', '6', '7'];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  // Свои напевы для «найди тонику»: мажорный и минорный
  const MEL = { maj: 'G4q B4e A4e G4q D5q | C5e B4e A4e B4e G4h | E5q D5e C5e B4q A4q | B4e A4e F#4e A4e G4h ||', min: 'A4q C5e B4e A4q E5q | D5e C5e B4e C5e A4h | G4q A4e B4e C5q B4q | A4h r h ||' };
  const MEL_KEY = { maj: [N(4, 0), 'ionian'], min: [N(5, 0), 'aeolian'] };
  LABS.tonic = {
    st: { k: 'maj', v: 'mel' },
    render(s) {
      const items = beam(parseMel(MEL[s.k])), [ton, scId] = MEL_KEY[s.k], degs = scaleById(scId).f;
      const pcs = degs.map((d) => pcOf(up(ton, d)));
      if (s.v === 'deg') items.forEach((x) => { if (x.n) { const i = pcs.indexOf(pcOf(x.n)); x.t = i >= 0 ? ROMAN[i] : ''; if (i === 0) x.c = 'root'; } });
      let body;
      if (s.v === 'row') {
        const set = [...new Map(items.filter((x) => x.n).map((x) => [x.m, x])).values()].sort((a, b) => a.m - b.m);
        body = sc(set.map((x) => ({ d: 'q', n: x.n, m: x.m, c: pcOf(x.n) === pcOf(ton) ? 'root' : '', t: ROMAN[pcs.indexOf(pcOf(x.n))] })), { clef: 'treble' });
      } else body = sc(items, { clef: 'treble', time: [4, 4] });
      return '<div class="bkctl">' + seg('k', [['maj', T('key.major')], ['min', T('key.minor')]], s.k) + seg('v', [['mel', T('to.mel')], ['row', T('to.row')], ['deg', T('to.deg')]], s.v) + '</div>' + body +
        '<div class="bkrow">' + playBtn('data-a="p"') + playBtn('data-a="t"', T('to.tonic')) + '</div><p class="bknote">' + T('to.note.' + s.v) + '</p>';
    },
    on(s, a) {
      const [ton] = MEL_KEY[s.k], tm = 57 + ((pcOf(ton) - 9 + 12) % 12);
      if (a === 't') { snd.chord([tm, tm + 12], { dur: 2 }); return; }
      const { ev } = melEvents(beam(parseMel(MEL[s.k])), 100); snd.play({ notes: ev });
    },
  };
  // Строение мажора: тоны и полутоны между ступенями; от любой ноты — знаки появляются сами
  LABS.majsteps = {
    st: { root: 'C' },
    render(s) {
      const r = rootN(s.root), ns = [...MAJ, '8'].map((d) => ({ n: simp(up(r, d === '8' ? '1' : d)), m: 60 + pcOf(r) + (d === '8' ? 12 : [0, 2, 4, 5, 7, 9, 11][+d - 1]) }));
      const steps = ns.slice(1).map((x, i) => (x.m - ns[i].m === 1 ? T('ms.h') : T('ms.w')));
      const signs = ns.slice(0, 7).filter((x) => x.n.a).map((x) => nm(x.n));
      return '<div class="bkctl">' + rootSel('root', s.root, MAJ_ROOTS.map((x) => [x, x])) + '</div>' +
        sc(ns.map((x, i) => ({ d: 'q', n: x.n, m: x.m, c: i % 7 === 0 ? 'root' : '', t: ROMAN[i % 7], top: i ? steps[i - 1] : '' })), { clef: 'treble' }) +
        '<div class="steps">' + steps.map((x, i) => '<span class="' + (x === T('ms.h') ? 'h' : 'w') + '">' + ROMAN[i] + '–' + ROMAN[(i + 1) % 7] + ' <b>' + x + '</b></span>').join('') + '</div>' +
        '<p class="bknote">' + (signs.length ? T('ms.signs', { s: signs.join(' ') }) : T('ms.none')) + '</p>' +
        keyboardSVG(marksOf(ns.map((x, i) => ({ m: x.m, c: i % 7 === 0 ? 'root' : 'on', t: nm(x.n) }))), { lo: 59, hi: 84 }) + '<div class="bkrow">' + playBtn('data-a="p"') + '</div>';
    },
    on(s) { const b = 60 + pcOf(rootN(s.root)); snd.seq([0, 2, 4, 5, 7, 9, 11, 12].map((x) => b + x), 0.24, 0.45); },
  };
  // Тяготения: устойчивые I–III–V, неустойчивые тянутся к ближайшему устойчивому
  // ступень (индекс) → куда тянется (7 — тоника сверху)
  const PULL = { 1: [0, 2], 3: [2], 5: [4], 6: [7] };
  LABS.pull = {
    st: { k: 'maj', i: 6, alt: 0 },
    degs(s) { return s.k === 'maj' ? [0, 2, 4, 5, 7, 9, 11, 12] : [0, 2, 3, 5, 7, 8, 11, 12]; },
    render(s) {
      const D = this.degs(s), base = s.k === 'maj' ? 60 : 57, stable = [0, 2, 4], R = (x) => ROMAN[x % 7];
      const cards = ROMAN.map((r, i) => '<button class="pc' + (stable.includes(i) ? ' st' : '') + (i === s.i ? ' on' : '') + '" data-a="d:' + i + '"><b>' + r + '</b><small>' + nm(noteOf(base + D[i])) + '</small><span>' + (stable.includes(i) ? T('pu.st') : '→ ' + PULL[i].map(R).join(' / ')) + '</span></button>').join('');
      return '<div class="bkctl">' + seg('k', [['maj', T('key.majOf', { k: 'C' })], ['min', T('key.minOf', { k: 'a' }) + ' (' + T('pu.harm') + ')']], s.k) + '</div><div class="pulls">' + cards + '</div>' +
        '<p class="bknote">' + (stable.includes(s.i) ? T('pu.stable') : T('pu.go', { a: ROMAN[s.i], b: PULL[s.i].map(R).join(T('pu.or')) })) + '</p>' +
        '<div class="bkrow">' + playBtn('data-a="op"', T('pu.around')) + '</div>';
    },
    on(s, a) {
      const D = this.degs(s), base = s.k === 'maj' ? 60 : 57, tri = [base - 12, base + D[2] - 12, base + D[4] - 12];
      if (a === 'op') { snd.play({ notes: [[0, tri, 2.6, 0.3], [0.2, base - 1, 0.45], [0.7, base + 2, 0.45], [1.2, base, 1.2]] }); return false; }
      if (a.startsWith('d:')) { const i = +a.slice(2); s.alt = s.i === i ? s.alt + 1 : 0; s.i = i; }
      const tg = PULL[s.i], notes = [[0, tri, 2.4, 0.3], [0.2, base + D[s.i], 0.9]];
      if (tg) notes.push([1.15, base + D[tg[s.alt % tg.length]], 1.1]);
      snd.play({ notes });
    },
  };
  // Тетрахорды: мажор = два одинаковых (тон–тон–полутон) через тон; верхний — нижний следующей гаммы
  const TETRA = [['maj', [2, 2, 1]], ['min', [2, 1, 2]], ['phr', [1, 2, 2]], ['harm', [1, 3, 1]]];
  LABS.tetra = {
    st: { i: 0, k: 0 },
    render(s) {
      const r = rootN(CIRCLE[s.i]), b = 60 + pcOf(r) - (pcOf(r) > 6 ? 12 : 0);
      const ns = [...MAJ, '8'].map((d, k) => ({ n: simp(up(r, d === '8' ? '1' : d)), m: b + [0, 2, 4, 5, 7, 9, 11, 12][k] }));
      const sig = SIG[s.i];
      return '<div class="bkctl"><b class="bkbig">' + T('key.majOf', { k: CIRCLE[s.i] }) + '</b><button class="chipc wide" data-a="next">' + T('te.next') + ' →</button>' + (s.i ? '<button class="chipc wide" data-a="reset">' + T('te.reset') + '</button>' : '') + '</div>' +
        sc(ns.map((x, k) => ({ d: 'q', n: x.n, m: x.m, c: k < 4 ? 'alt' : 'b', t: k === 3 ? T('te.low') : k === 7 ? T('te.up') : '' })), { clef: 'treble' }) +
        '<p class="bknote">' + (sig ? T('te.sig', { n: sig > 0 ? sig + '♯' : -sig + '♭', s: nm(ns[6].n) }) : T('te.c')) + '</p>' +
        '<h4>' + T('te.kinds') + '</h4><div class="bkchips">' + TETRA.map(([k, st], i) => '<button class="chipc wide' + (i === s.k ? ' on' : '') + '" data-a="k:' + i + '">' + T('te.' + k) + ' · ' + st.map((x) => (x === 1 ? '½' : x === 2 ? '1' : '1½')).join('–') + '</button>').join('') + '</div>';
    },
    on(s, a) {
      if (a === 'next') s.i = (s.i + 1) % 7;
      if (a === 'reset') s.i = 0;
      if (a.startsWith('k:')) { s.k = +a.slice(2); let m = 64; snd.seq([m, ...TETRA[s.k][1].map((x) => (m += x))], 0.3, 0.5); return; }
      const r = rootN(CIRCLE[s.i]), b = 60 + pcOf(r) - (pcOf(r) > 6 ? 12 : 0); snd.seq([0, 2, 4, 5, 7, 9, 11, 12].map((x) => b + x), 0.22, 0.42);
    },
  };
  // Мажор и три минора от одной тоники (+ гармонический мажор)
  const MODES = [['maj', '1 2 3 4 5 6 7'], ['nat', '1 2 b3 4 5 b6 b7'], ['harm', '1 2 b3 4 5 b6 7'], ['mel', '1 2 b3 4 5 6 7'], ['melDown', '1 2 b3 4 5 b6 b7'], ['hmaj', '1 2 3 4 5 b6 7']];
  LABS.minors = {
    st: { root: 'A' },
    render(s) {
      const r = rootN(s.root);
      return '<div class="bkctl">' + rootSel('root', s.root, ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((x) => [x, x])) + '</div><div class="bright">' +
        MODES.map(([k, f], i) => { const dg = f.split(' '); return '<button class="brow" data-a="m:' + i + '"><span class="bn">' + T('mi.' + k) + '</span><span class="bd">' + dg.map((d, j) => '<i class="' + ((k === 'harm' && j === 6) || (k === 'mel' && j > 4) || (k === 'hmaj' && j === 5) ? 'chg' : /^b/.test(d) ? 'alt' : '') + '">' + nm(simp(up(r, d))) + '</i>').join('') + '</span></button>'; }).join('') + '</div><p class="bknote">' + T('mi.note') + '</p>';
    },
    on(s, a) {
      if (!a.startsWith('m:')) return;
      const r = rootN(s.root), i = +a.slice(2), dg = MODES[i][1].split(' '), b = 57 + ((pcOf(r) - 9 + 12) % 12);
      const ms = dg.map((d) => b + ({ 1: 0, 2: 2, b3: 3, 3: 4, 4: 5, 5: 7, b6: 8, 6: 9, b7: 10, 7: 11 })[d]).concat([b + 12]);
      snd.seq(MODES[i][0] === 'melDown' ? ms.reverse() : ms, 0.22, 0.42);
    },
  };

  /* ---------- Тональности ---------- */
  const MAJ_BY_SIG = ['C♭', 'G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯'];
  const MIN_BY_SIG = ['a♭', 'e♭', 'b♭', 'f', 'c', 'g', 'd', 'a', 'e', 'b', 'f♯', 'c♯', 'g♯', 'd♯', 'a♯'];
  const ORDER_SH = ['F', 'C', 'G', 'D', 'A', 'E', 'B'], ORDER_FL = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  LABS.keysig = {
    st: { k: 2 },
    render(s) {
      const k = s.k, maj = MAJ_BY_SIG[k + 7], min = MIN_BY_SIG[k + 7];
      const list = k > 0 ? ORDER_SH.map((x) => x + '♯') : ORDER_FL.map((x) => x + '♭');
      const rule = k > 0 ? T('ks.sharp', { last: list[k - 1], t: maj }) : k < -1 ? T('ks.flat', { pen: list[-k - 2], t: maj }) : k === -1 ? T('ks.one') : T('ks.none');
      return '<div class="bkctl"><button class="ib" data-a="dn" aria-label="−">−</button><b class="ksn">' + (k === 0 ? '0' : Math.abs(k) + (k > 0 ? '♯' : '♭')) + '</b><button class="ib" data-a="up" aria-label="+">+</button></div>' +
        '<div class="bktwo"><div>' + sc([], { clef: 'treble', sig: k, w: 180 }) + sc([], { clef: 'bass', sig: k, w: 180 }) + '</div><div class="bkfacts"><div class="bkbig">' + T('key.majOf', { k: maj }) + ' · ' + T('key.minOf', { k: min }) + '</div><dl>' +
        fact(T('ks.order'), list.map((x, i) => (i < Math.abs(k) ? '<b>' + x + '</b>' : '<span class="dim">' + x + '</span>')).join(' ')) + '</dl><p class="bknote">' + rule + '</p></div></div>' +
        '<div class="bkrow">' + playBtn('data-a="maj"', T('key.major')) + playBtn('data-a="min"', T('key.minor')) + '</div>';
    },
    on(s, a) {
      if (a === 'up' && s.k < 7) s.k++;
      if (a === 'dn' && s.k > -7) s.k--;
      if (a === 'maj' || a === 'min') {
        const t = rootN(a === 'maj' ? MAJ_BY_SIG[s.k + 7] : MIN_BY_SIG[s.k + 7].toUpperCase()), b = 57 + ((pcOf(t) - 9 + 12) % 12);
        snd.chord(a === 'maj' ? [b, b + 4, b + 7] : [b, b + 3, b + 7], { dur: 1.6 }); return false;
      }
    },
  };
  // Родство: тональности, отличающиеся не больше чем на один знак, + одноимённая
  LABS.related = {
    st: { i: 0, minor: false },
    render(s) {
      const i = s.i, at = (k) => (k + 12) % 12, maj = (k) => CIRCLE[at(k)], min = (k) => REL_MIN[at(k)].toLowerCase();
      const home = s.minor ? min(i) : maj(i);
      const rel = s.minor ? [[maj(i), 'par'], [min(i + 1), 'dom'], [maj(i + 1), 'domPar'], [min(i - 1), 'sub'], [maj(i - 1), 'subPar']] : [[min(i), 'par'], [maj(i + 1), 'dom'], [min(i + 1), 'domPar'], [maj(i - 1), 'sub'], [min(i - 1), 'subPar']];
      const same = s.minor ? REL_MIN[at(i)] : maj(i).toLowerCase(), harm = s.minor ? [maj(i + 4), 'hDom'] : [maj(i - 1).toLowerCase(), 'hSub'];
      const chip = ([k, t]) => '<button class="chipc" data-a="go:' + k + '"><b>' + k + '</b><small>' + T('re.' + t) + '</small></button>';
      return '<div class="bkctl">' + sel('i', CIRCLE.map((x, j) => [j, s.minor ? min(j) : x]), s.i, T('ui.key')) + seg('minor', [[0, T('key.major')], [1, T('key.minor')]], s.minor ? 1 : 0) + '</div>' +
        '<div class="bkbig">' + (s.minor ? T('key.minOf', { k: home }) : T('key.majOf', { k: home })) + '</div><div class="bkchips">' + rel.map(chip).join('') + '</div><h4>' + T('re.more') + '</h4><div class="bkchips">' + chip([same, 'same']) + chip(harm) + '</div><p class="bknote">' + T('re.note') + '</p>';
    },
    set(s, k) { if (k === 'minor') s.minor = !!+s.minor; },
    on(s, a) {
      if (!a.startsWith('go:')) return false;
      const k = a.slice(3), minor = k === k.toLowerCase(), t = rootN(k.charAt(0).toUpperCase() + k.slice(1)), b = 55 + ((pcOf(t) - 7 + 12) % 12);
      const h = rootN(s.minor ? REL_MIN[s.i] : CIRCLE[s.i]), hb = 55 + ((pcOf(h) - 7 + 12) % 12);
      snd.prog([s.minor ? [hb, hb + 3, hb + 7] : [hb, hb + 4, hb + 7], minor ? [b, b + 3, b + 7] : [b, b + 4, b + 7]], 1.1);
      return false;
    },
  };
  // Один звук — разные ступени: в каких тональностях данный звук — I, II … VII
  LABS.degreeof = {
    st: { n: 'C' },
    render(s) {
      const p = parseNote(s.n).n, rows = MAJ.map((d, i) => {
        const tm = simp(up(p, ['1', 'b7', 'b6', '5', '4', 'b3', 'b2'][i])), tn = simp(up(p, ['1', 'b7', 'b6', '5', '4', 'b3', '2'][i]));
        const minorDeg = ['1', 'b7', '6', '5', '4', '3', 'b2'][i], tmin = simp(up(p, minorDeg));
        return '<tr class="click" data-a="r:' + i + '"><th>' + ROMAN[i] + '</th><td>' + T('key.majOf', { k: nm(tm) }) + '</td><td>' + T('key.minOf', { k: nm(tmin).toLowerCase() }) + (i === 6 ? ' ' + T('dg.natural') : '') + '</td></tr>';
      }).join('');
      return '<div class="bkctl">' + sel('n', ALL12.map((x) => [x, x]), s.n, T('ui.root')) + '</div><div class="bktw"><table><thead><tr><th>' + T('dg.deg') + '</th><th>' + T('key.major') + '</th><th>' + T('key.minor') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="bknote">' + T('dg.note', { n: both(p) }) + '</p>';
    },
    on(s, a) {
      if (!a.startsWith('r:')) return false;
      const i = +a.slice(2), p = parseNote(s.n).n, t = simp(up(p, ['1', 'b7', 'b6', '5', '4', 'b3', 'b2'][i])), b = 55 + ((pcOf(t) - 7 + 12) % 12), nm0 = b + ((pcOf(p) - pcOf(t) + 12) % 12);
      snd.play({ notes: [[0, [b, b + 4, b + 7], 1.2, 0.35], [1.25, nm0 + 12, 1.2]] });
      return false;
    },
  };
  // Транспозиция: своя мелодия в до мажоре → в выбранную тональность (по интервалу; знаки — новой тональности)
  const TR_MEL = 'C4q E4e G4e C5q B4e A4e | G4q F4e E4e D4h | E4e F4e G4e A4e B4q G4q | C5h. r q ||';
  LABS.transp = {
    st: { to: 'F' },
    render(s) {
      const to = rootN(s.to), shift = ((pcOf(to) + 6) % 12) - 6;
      const tr = (x) => (x.n ? { ...x, n: simp(up(x.n, ivKeyOf(to))), m: x.m + shift } : x);
      const src = beam(parseMel(TR_MEL)), dst = beam(parseMel(TR_MEL)).map(tr);
      const k = SIG[CIRCLE.indexOf(s.to)] != null ? SIG[CIRCLE.indexOf(s.to)] : 0;
      dst.forEach((x) => { if (x.n) x.noAcc = true; });
      return '<div class="bkctl">' + sel('to', CIRCLE.map((x) => [x, x]), s.to, T('ui.key')) + '</div><small class="bklbl">' + T('key.majOf', { k: 'C' }) + '</small>' + sc(src, { clef: 'treble', time: [4, 4] }) +
        '<small class="bklbl">' + T('key.majOf', { k: s.to }) + ' · ' + T('tr.by', { iv: (L.IV[ivKeyOf(to)] || [''])[0].toLowerCase() + (shift < 0 ? ' ' + T('tr.down') : ' ' + T('tr.up')) }) + '</small>' + sc(dst, { clef: 'treble', time: [4, 4], sig: k }) +
        '<div class="bkrow">' + playBtn('data-a="a"', 'C') + playBtn('data-a="b"', s.to) + '</div>';
    },
    on(s, a) {
      const to = rootN(s.to), shift = ((pcOf(to) + 6) % 12) - 6, items = beam(parseMel(TR_MEL));
      const { ev } = melEvents(items, 104); snd.play({ notes: ev.map(([t, m, d]) => [t, m + (a === 'b' ? shift : 0), d]) });
    },
  };
  // интервал от C до тоники (ключ из L.IV): для правописания транспонированной мелодии
  function ivKeyOf(to) {
    const pc = pcOf(to), l = to.l;
    const map = { 0: '1', 1: l === 1 ? 'b2' : '#1', 2: '2', 3: l === 2 ? 'b3' : '#2', 4: '3', 5: '4', 6: l === 4 ? 'b5' : '#4', 7: '5', 8: l === 5 ? 'b6' : '#5', 9: '6', 10: 'b7', 11: l === 0 ? 'b2' : '7' };
    return map[pc];
  }

  /* ---------- Мелодия и строение ---------- */
  // Период из двух предложений: 1-е кончается на V ступени (половинная каденция), 2-е — на тонике
  const PERIOD = 'E4q G4q C5q B4e A4e | G4q A4e G4e E4h | F4q A4q D5q C5e B4e | A4q B4e A4e G4h | E4q G4q C5q B4e A4e | G4q A4e G4e E4h | F4q D5q B4q G4q | C5h. r q ||';
  LABS.period = {
    st: { v: 'phr' },
    render(s) {
      const items = beam(parseMel(PERIOD)); let bar = 0, k = 0;
      items.forEach((x) => { if (x.bar) { bar++; return; } x.bar0 = bar; x.k = k++; });
      const zone = { mot: (b) => (b % 2 === 0 ? 'alt' : ''), phr: (b) => (Math.floor(b / 2) % 2 === 0 ? 'alt' : 'b'), sen: (b) => (b < 4 ? 'alt' : 'b') }[s.v];
      items.forEach((x) => { if (!x.bar && !x.rest) x.c = zone(x.bar0); });
      const last = (b) => items.filter((x) => !x.bar && !x.rest && x.bar0 === b).pop();
      last(3).t = T('pe.half'); last(7).t = T('pe.full');
      const cut = items.findIndex((x) => x.bar && x.bar !== '|.' && items.slice(0, items.indexOf(x) + 1).filter((z) => z.bar).length === 4) + 1;
      return '<div class="bkctl">' + seg('v', [['mot', T('pe.mot')], ['phr', T('pe.phr')], ['sen', T('pe.sen')]], s.v) + '</div>' +
        sc(items.slice(0, cut), { clef: 'treble', time: [4, 4] }) + sc(items.slice(cut), { clef: 'treble' }) +
        '<p class="bknote">' + T('pe.note.' + s.v) + '</p><div class="bkrow">' + playBtn('data-a="p"') + playBtn('data-a="a"', T('pe.first')) + '</div>';
    },
    on(s, a) { const items = beam(parseMel(PERIOD)), { ev } = melEvents(items, 108); snd.play({ notes: a === 'a' ? ev.slice(0, ev.length / 2 | 0) : ev }); },
  };
  // Мелодические каденции: одна фраза — разные окончания
  const CAD = { full: 'B4q D5q | C5w', imp: 'F4q D4q | E4w', half: 'E4q F4q | G4w', half2: 'C5q A4q | B4w' };
  const CAD_HEAD = 'C5q B4e A4e G4q E4q | F4q A4q ';
  LABS.cadmel = {
    st: { c: 'full' },
    render(s) {
      const items = beam(parseMel(CAD_HEAD + CAD[s.c] + ' ||'));
      const tail = items.filter((x) => x.n).slice(-2); tail.forEach((x) => { x.c = 'root'; });
      return '<div class="bkctl">' + seg('c', Object.keys(CAD).map((k) => [k, T('cm.' + k)]), s.c) + '</div>' + sc(items, { clef: 'treble', time: [4, 4] }) +
        '<p class="bknote">' + T('cm.n.' + s.c) + '</p><div class="bkrow">' + playBtn('data-a="p"') + '</div>';
    },
    on(s) { const { ev } = melEvents(beam(parseMel(CAD_HEAD + CAD[s.c])), 100); snd.play({ notes: ev }); },
  };
  // Секвенция: мотив повторяется от других ступеней — внутри лада (тональная) или точно (модулирующая)
  const MOT = [[0, 'e'], [1, 'e'], [2, 'e'], [0, 'e'], [4, 'q']]; // ступени от начала, длительности
  LABS.sequence = {
    st: { k: 'dia', dir: 'down' },
    render(s) { return '<div class="bkctl">' + seg('k', [['dia', T('sq.dia')], ['mod', T('sq.mod')]], s.k) + seg('dir', [['down', T('sq.down')], ['up', T('sq.up')]], s.dir) + '</div>' + sc(this.items(s), { clef: 'treble', time: [4, 4] }) + '<p class="bknote">' + T('sq.n.' + s.k) + '</p><div class="bkrow">' + playBtn('data-a="p"') + '</div>'; },
    items(s) {
      const out = [], step = s.dir === 'down' ? -1 : 1, majSemis = [0, 2, 4, 5, 7, 9, 11];
      for (let r = 0; r < 3; r++) {
        MOT.forEach(([dg, d]) => {
          if (s.k === 'dia') { const D = 30 + 2 + r * step + dg; const l = ((D % 7) + 7) % 7, o = Math.floor(D / 7) + 1; out.push({ d, n: N(l, 0), m: o * 12 + majSemis[l] }); }
          else { const base = 64 + r * step * 2, mm = base + [0, 2, 4, 5, 7, 9, 11][dg] - [0, 2, 4, 5, 7, 9, 11][0]; const n = noteOf(mm, step < 0); out.push({ d, n, m: mm }); }
        });
        out.push({ d: 'q', rest: true }, { bar: r === 2 ? '|.' : '|' });
      }
      return beam(out);
    },
    on(s) { const { ev } = melEvents(this.items(s), 112); snd.play({ notes: ev }); },
  };

  /* ---------- Исполнение: темп, громкость, штрихи, украшения ---------- */
  // Темпы: примерные числа ударов в минуту (в учебниках их нет — ориентир, а не правило)
  const TEMPI = [['Largo', 46], ['Lento', 52], ['Adagio', 64], ['Andante', 80], ['Andantino', 88], ['Moderato', 100], ['Allegretto', 112], ['Allegro', 132], ['Vivace', 156], ['Presto', 184]];
  LABS.tempo = {
    st: { i: 3 },
    render(s) {
      return '<div class="tempi">' + TEMPI.map(([n, b], i) => '<button class="bkli' + (i === s.i ? ' on' : '') + '" data-a="t:' + i + '"><b>' + n + '</b><span>' + T('tm.' + n) + ' · ≈ ' + b + '</span></button>').join('') + '</div>' +
        '<div class="bkrow">' + playBtn('data-a="acc"', 'accelerando') + playBtn('data-a="rit"', 'ritardando') + '</div><p class="bknote">' + T('tm.note') + '</p>';
    },
    on(s, a) {
      if (a.startsWith('t:')) s.i = +a.slice(2);
      const hits = [];
      if (a === 'acc' || a === 'rit') { let t = 0; for (let k = 0; k < 16; k++) { const b = a === 'acc' ? 70 + k * 6 : 160 - k * 6; hits.push([t, k % 4 ? 'click' : 'clickHi', 0.6]); t += 60 / b; } }
      else { const q = 60 / TEMPI[s.i][1]; for (let k = 0; k < 8; k++) hits.push([k * q, k % 4 ? 'click' : 'clickHi', 0.6]); }
      snd.play({ hits });
    },
  };
  const DYNS = [['pp', 0.12], ['p', 0.25], ['mp', 0.42], ['mf', 0.6], ['f', 0.8], ['ff', 1]];
  const PHR = 'C5q D5q E5q G5q | F5q E5q D5q C5q';
  LABS.dyn = {
    st: { i: 3 },
    render(s) {
      return '<div class="bkchips">' + DYNS.map(([d], i) => '<button class="chipc wide' + (i === s.i ? ' on' : '') + '" data-a="d:' + i + '"><b class="dynt">' + d + '</b><small>' + T('dy.' + d) + '</small></button>').join('') + '</div>' +
        '<div class="bkrow">' + playBtn('data-a="cr"', 'crescendo') + playBtn('data-a="dim"', 'diminuendo') + playBtn('data-a="sf"', 'sforzando') + '</div><p class="bknote">' + T('dy.note') + '</p>';
    },
    on(s, a) {
      const ms = parseMel(PHR).filter((x) => x.n).map((x) => x.m), q = 0.42;
      if (a.startsWith('d:')) { s.i = +a.slice(2); snd.play({ notes: ms.slice(0, 4).map((m, k) => [k * q, m, 0.4, DYNS[s.i][1]]) }); return; }
      const vel = (k) => (a === 'cr' ? 0.1 + k * 0.12 : a === 'dim' ? 1 - k * 0.12 : k === 4 ? 1 : 0.3);
      snd.play({ notes: ms.map((m, k) => [k * q, m, 0.4, vel(k)]) });
      return false;
    },
  };
  // Штрихи: одна фраза — legato, non legato, staccato, tenuto, акценты
  const ART = [['leg', 1.05, 0.55, null], ['nonleg', 0.8, 0.55, null], ['stacc', 0.3, 0.55, 'stacc'], ['ten', 0.98, 0.6, 'ten'], ['acc', 0.7, 0.55, 'acc'], ['marc', 0.55, 0.6, 'marc']];
  LABS.artic = {
    st: { i: 0 },
    render(s) {
      const [k, , , mark] = ART[s.i], items = parseMel(PHR + ' ||').map((x) => (x.n ? { ...x, art: mark || undefined } : x));
      if (k === 'leg') { items[0].slur = 3; items[5].slur = 3; }
      return '<div class="bkctl">' + seg('i', ART.map(([n], i) => [i, T('ar.' + n)]), s.i) + '</div>' + sc(items, { clef: 'treble', time: [4, 4] }) + (k === 'leg' ? '<p class="bknote">' + T('ar.slur') + '</p>' : '') +
        '<p class="bknote">' + T('ar.n.' + k) + '</p><div class="bkrow">' + playBtn('data-a="p"') + '</div>';
    },
    on(s) {
      const [k, len, vel] = ART[s.i], ms = parseMel(PHR).filter((x) => x.n).map((x) => x.m), q = 0.45;
      snd.play({ notes: ms.map((m, j) => [j * q, m, q * len, (k === 'acc' || k === 'marc') && j % 4 === 0 ? 1 : k === 'acc' || k === 'marc' ? 0.45 : vel]) });
    },
  };
  // Мелизмы: как записан и как звучит (C5, в до мажоре)
  const ORN = {
    grace: { w: [{ d: 'e', n: N(1, 0), m: 74, grace: true, slash: true }, { d: 'h', n: N(0, 0), m: 72 }], s: [[0, 74, 0.07], [0.07, 72, 1]] },
    appog: { w: [{ d: 'q', n: N(1, 0), m: 74, grace: true }, { d: 'h', n: N(0, 0), m: 72 }], s: [[0, 74, 0.5], [0.5, 72, 0.5]] },
    trill: { w: [{ d: 'h', n: N(0, 0), m: 72, orn: 'tr' }], s: Array.from({ length: 12 }, (_, i) => [i * 0.08, i % 2 ? 74 : 72, 0.09]).concat([[0.96, 72, 0.3]]) },
    mord: { w: [{ d: 'h', n: N(0, 0), m: 72, orn: 'mord' }], s: [[0, 72, 0.08], [0.08, 74, 0.08], [0.16, 72, 0.9]] },
    mordL: { w: [{ d: 'h', n: N(0, 0), m: 72, orn: 'mordL' }], s: [[0, 72, 0.08], [0.08, 71, 0.08], [0.16, 72, 0.9]] },
    turn: { w: [{ d: 'h', n: N(0, 0), m: 72, orn: 'turn' }], s: [[0, 74, 0.12], [0.12, 72, 0.12], [0.24, 71, 0.12], [0.36, 72, 0.7]] },
    ferm: { w: [{ d: 'h', n: N(0, 0), m: 72, orn: 'ferm' }], s: [[0, 72, 2.2]] },
  };
  LABS.orn = {
    st: { k: 'grace' },
    render(s) {
      const o = ORN[s.k];
      return '<div class="bkctl">' + seg('k', Object.keys(ORN).map((k) => [k, T('or.' + k)]), s.k) + '</div><div class="bktwo"><div>' + sc(o.w.concat([{ bar: '|.' }]), { clef: 'treble' }) + '</div><div><p class="bknote">' + T('or.n.' + s.k) + '</p>' +
        '<div class="bkrow">' + playBtn('data-a="p"', T('or.play')) + playBtn('data-a="slow"', T('or.slow')) + '</div></div></div>';
    },
    on(s, a) { const k = a === 'slow' ? 3 : 1; snd.play({ notes: ORN[s.k].s.map(([t, m, d]) => [t * k, m, d * k]) }); },
  };
  void esc;
  return LABS;
}
