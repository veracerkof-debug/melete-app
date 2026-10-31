// Учебник, произведения (pieces.js): ноты под выбранный инструмент (пианино — скрипичный ключ; гитара — скрипичный ключ
// октавой выше звучания и табулатура; бас — басовый ключ и табулатура), прослушивание с аккомпанементом в двух темпах,
// проверка игры микрофоном — ноты по порядку (повторы одной высоты подряд — одна нота: микрофон не слышит новое
// касание той же ноты). piece — одно произведение (cfg: { id }), pieces — список всех с выбором (справочник).
import { parseMel, beam, melEvents } from './labs1.js';
import { PIECES, tabOf, shiftFor } from './pieces.js';
import { scoreSVG, durOf } from './score.js';
import { listen, stopSing } from './labs5.js';
import { N, NAT, nm } from './engine.js';
import { seg, playBtn } from './draw.js';

const mod = (x) => ((x % 12) + 12) % 12;
const SHARP = [N(0, 0), N(0, 1), N(1, 0), N(1, 1), N(2, 0), N(3, 0), N(3, 1), N(4, 0), N(4, 1), N(5, 0), N(5, 1), N(6, 0)];
const ROOTS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// «Am», «G7», «Dm/C», «C# C» → { r, minor, bass }
function chordOf(s) {
  const x = /^([A-G])([#b♯♭]?)(m(?!aj))?[^/]*(?:\/([A-G])([#b♯♭]?))?$/.exec(s); if (!x) return null;
  const acc = (a) => (a === '#' || a === '♯' ? 1 : a === 'b' || a === '♭' ? -1 : 0);
  const r = mod(ROOTS[x[1]] + acc(x[2]));
  return { r, minor: !!x[3], seventh: /7/.test(s), bass: x[4] ? mod(ROOTS[x[4]] + acc(x[5])) : r };
}
const near = (pc, lo) => lo + ((pc - lo % 12 + 120) % 12);

// Ноты произведения: из записи или (arp) — перебором аккордов по тактам 6/8
function itemsOf(pc) {
  if (pc.arp) {
    const out = [];
    pc.ch.forEach((c, i) => { const x = chordOf(c); if (!x) return; const r = near(x.r, 57), t3 = r + (x.minor ? 3 : 4), t5 = r + 7;
      [r - 12, t3, t5, r + 12, t5, t3].forEach((m) => out.push({ n: SHARP[mod(m)], m, d: 'e' })); out.push({ bar: i === pc.ch.length - 1 ? '|.' : '|' }); });
    return beam(out, 1.5);
  }
  return beam(parseMel(pc.mel).map((x) => (x.bar === '|.' ? x : x)), pc.beat === 'e' ? 0.5 : 1);
}
const shiftOf = (pc, inst) => shiftFor(pc, inst, itemsOf(pc).filter((x) => !x.bar && !x.rest).map((x) => x.m));

// Табулатура строкой нот: числа ладов на линиях струн
function tabSVG(cells, inst) {
  const n = inst === 'b' ? 4 : 6, names = inst === 'b' ? ['G', 'D', 'A', 'E'] : ['e', 'B', 'G', 'D', 'A', 'E'], W = 26 + cells.length * 22, H = 10 + (n - 1) * 12 + 10;
  let s = '<svg class="bktab2" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="TAB" style="max-width:' + W * 1.6 + 'px">';
  for (let k = 0; k < n; k++) s += '<line x1="18" x2="' + (W - 4) + '" y1="' + (10 + k * 12) + '" y2="' + (10 + k * 12) + '"/><text class="tsn" x="4" y="' + (13 + k * 12) + '">' + names[k] + '</text>';
  cells.forEach((c, i) => {
    const x = 30 + i * 22;
    if (c === '|') { s += '<line class="tbar" x1="' + x + '" x2="' + x + '" y1="10" y2="' + (10 + (n - 1) * 12) + '"/>'; return; }
    if (!c) return;
    const row = n - 1 - c.s, y = 10 + row * 12;
    s += '<rect x="' + (x - 7) + '" y="' + (y - 6) + '" width="14" height="12" class="tbg"/><text class="tfr" x="' + x + '" y="' + (y + 4) + '">' + c.f + '</text>';
  });
  return s + '</svg>';
}

export function pieceLabs({ T, snd, mic, ui }) {
  const LABS = {};
  // Ноты под инструмент: сдвиг на октавы, у гитары и баса запись — на октаву выше звучания
  function view(pc, inst) {
    const sh = shiftOf(pc, inst), wr = inst === 'p' ? 0 : 12, items = itemsOf(pc);
    const shown = items.map((x) => (x.bar || x.rest ? x : { ...x, m: x.m + sh + wr }));
    const sound = items.map((x) => (x.bar || x.rest ? x : { ...x, m: x.m + sh }));
    return { shown, sound };
  }
  // Ряды по 4 такта: ноты, под ними — табулатура (гитара, бас)
  function rowsHTML(pc, inst) {
    const { shown, sound } = view(pc, inst), rows = [[]], tabs = [[]]; let bars = 0;
    const tab = inst === 'p' ? null : tabOf(sound.map((x) => (x.bar || x.rest ? null : x.m)), inst);
    shown.forEach((x, i) => {
      rows[rows.length - 1].push(x);
      if (tab) { if (x.bar) tabs[tabs.length - 1].push('|'); else if (!x.rest) tabs[tabs.length - 1].push(tab[i]); }
      if (x.bar && ++bars % 4 === 0 && i < shown.length - 1) { rows.push([]); tabs.push([]); }
    });
    const clef = inst === 'b' ? 'bass' : 'treble';
    return rows.map((r, k) => scoreSVG(r, { clef, time: k ? null : pc.time, sig: pc.sig || 0, unit: 22 }) + (tab ? tabSVG(tabs[k], inst) : '')).join('');
  }
  // Последовательность для проверки: звучащие ноты без повторов подряд
  const targets = (pc, inst) => { const out = []; view(pc, inst).sound.forEach((x) => { if (x.bar || x.rest) return; if (!out.length || out[out.length - 1].m !== x.m) out.push(x); }); return out; };
  function play(pc, s, el) {
    const k = s.slow ? 0.75 : 1, bpm = pc.bpm * k * (pc.beat === 'e' ? 0.5 : 1), items = itemsOf(pc), sh = shiftOf(pc, s.inst);
    const { ev } = melEvents(items, bpm), q = 60 / bpm, notes = ev.map(([t, m, d]) => [t, m + sh, d, 0.7]);
    if (s.acc && pc.ch) {
      // аккомпанемент: по тактам — бас и трезвучие (аккорды такта делят его поровну)
      let t = 0, bar = 0, start = 0;
      const flush = () => { const c = (pc.ch[bar] || '').split(/\s+/).filter(Boolean), len = t - start; c.forEach((x, i) => { const y = chordOf(x); if (!y) return; const at = start + (len * i) / c.length, d = len / c.length; const r = near(y.r, 53);
        notes.push([at, near(y.bass, 36), d * 0.95, 0.5], [at, [r, r + (y.minor ? 3 : 4), r + 7, ...(y.seventh ? [r + 10] : [])], d * 0.9, 0.35]); }); };
      items.forEach((x) => { if (x.bar) { flush(); bar++; start = t; return; } t += durOf(x) * q; });
      if (t > start + 1e-6) flush();
    }
    snd.play({ notes });
    void el;
  }

  LABS.piece = {
    st: { id: 'ode', inst: 'p', slow: 0, acc: 1, on: false, k: 0, done: false, err: '' },
    render(s) {
      const pc = PIECES[s.id]; if (!pc) return '';
      const tg = targets(pc, s.inst), cur = tg[s.k];
      return '<div class="pchead"><b>' + T('pc.' + s.id) + '</b><span>' + T('pc.' + s.id + '.by') + '</span></div>' +
        '<div class="bkctl">' + seg('slow', [[0, T('pc.norm')], [1, T('pc.slow')]], s.slow) + (pc.ch ? '<button class="chipc' + (s.acc ? ' on' : '') + '" data-a="acc" aria-pressed="' + !!s.acc + '">' + T('pc.acc') + '</button>' : '') + '</div>' +
        '<div class="pcrows">' + rowsHTML(pc, s.inst) + '</div>' +
        '<div class="xnow">' + (s.done ? T('lx.done') : s.on && cur ? T('pc.prog', { k: s.k + 1, n: tg.length, x: nm(cur.n) }) : '') + '</div>' + (s.err ? '<p class="bkhint">' + T('sg.err.' + s.err) + '</p>' : '') +
        '<div class="bkrow">' + playBtn('data-a="hear"', T('ui.play')) + (s.on ? '<button class="chipc on" data-a="stop">' + T('lx.stop') + '</button>' : '<button class="chipc" data-a="go">' + T('lx.go') + '</button>') + '</div>';
    },
    on(s, a, el) {
      const pc = PIECES[s.id]; if (!pc) return false;
      if (a === 'acc') { s.acc = s.acc ? 0 : 1; return; }
      if (a === 'hear') { play(pc, s, el); return false; }
      if (a === 'stop') { stopSing(); s.on = false; return; }
      if (a !== 'go') return false;
      if (!mic) { s.err = 'none'; return; }
      const tg = targets(pc, s.inst);
      snd.stop(); s.on = true; s.err = ''; if (s.done || s.k >= tg.length) { s.k = 0; s.done = false; }
      let hold = 0;
      listen(mic, ({ dt, midi, cents }) => {
        if (!s.on) return false;
        const want = tg[s.k];
        if (midi != null && want && mod(midi) === mod(want.m) && Math.abs(cents) < 40) hold += dt; else hold = 0;
        if (hold > 0.12) { hold = 0; s.k++; if (s.k >= tg.length) { s.done = true; s.on = false; ui.redraw(el); return false; } ui.redraw(el); }
        return true;
      }, (e) => { s.on = false; s.err = e; ui.redraw(el); });
    },
  };

  // Все произведения: выбор и то же окно
  LABS.pieces = {
    st: { ...LABS.piece.st, id: 'twinkle' },
    render(s) {
      return '<div class="bkctl">' + seg('inst', [['p', T('lx.i.p')], ['g', T('lx.i.g')], ['b', T('lx.i.b')]], s.inst) + '</div>' +
        '<div class="pclist">' + Object.keys(PIECES).map((id) => '<button class="chipc wide' + (id === s.id ? ' on' : '') + '" data-a="pick:' + id + '">' + T('pc.' + id) + '</button>').join('') + '</div>' + LABS.piece.render(s);
    },
    set() { stopSing(); },
    on(s, a, el) { if (a.startsWith('pick:')) { stopSing(); Object.assign(s, { id: a.slice(5), k: 0, on: false, done: false }); return; } return LABS.piece.on(s, a, el); },
  };
  void NAT;
  return LABS;
}
