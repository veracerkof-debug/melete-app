// Учебник, части 5–6 «Тема», «Практика»: детектив листа, сжатие формы, пение с тюнером, гаммы без корня, книги;
// новые виды вопросов тренировки. Темы и фразы схем — свои, учебные (мелодии стандартов под авторским правом).
// Пение: микрофон — только по нажатию «Петь», звук разбирается на устройстве (YIN), поток закрывается сразу после.
import { N, pcOf, nm, up, rootN, MAJ_ROOTS, IV, REL_MIN, CIRCLE, chordById, scaleById } from './engine.js';
import { staffSVG, seg, sel, playBtn, simp } from './draw.js';
import { scoreSVG } from './score.js';
import { yin, refinePitch, freqToNote } from '../../../audio/pitch.js';

const SHARP = [N(0, 0), N(0, 1), N(1, 0), N(1, 1), N(2, 0), N(3, 0), N(3, 1), N(4, 0), N(4, 1), N(5, 0), N(5, 1), N(6, 0)];
const FLAT = [N(0, 0), N(1, -1), N(1, 0), N(2, -1), N(2, 0), N(3, 0), N(4, -1), N(4, 0), N(5, -1), N(5, 0), N(6, -1), N(6, 0)];
const mod = (x) => ((x % 12) + 12) % 12;
const noteOf = (m, flats) => (flats ? FLAT : SHARP)[mod(m)];
const near = (pc, lo) => lo + ((pc - lo % 12 + 120) % 12);
const SEM = { 1: 0, b9: 1, 9: 2, '#9': 3, b3: 3, 3: 4, 11: 5, 4: 5, '#11': 6, b5: 6, 5: 7, '#5': 8, b13: 8, 6: 9, 13: 9, bb7: 9, b7: 10, 7: 11 };
function placeUp(pc, degs, lo) { const out = []; let prev = lo - 1; degs.forEach((d) => { let m = near(mod(pc + SEM[d]), lo); while (m <= prev) m += 12; out.push(m); prev = m; }); return out; }
const voice = (r, degs) => { const p = pcOf(rootN(r)); return [near(p, 36), ...placeUp(p, degs, 52)]; };

// Пение: один активный разбор микрофона на всё приложение; stopSing — при уходе из главы
let active = null;
export function stopSing() { if (active) { const a = active; active = null; cancelAnimationFrame(a.raf); try { a.mic.stop(); } catch { /* уже закрыт */ } } }

/* ---------- Детектив листа (Левайн, гл. 19): верно / ошибка / по желанию ---------- */
// sym — как в листе; mel — нота мелодии (буква, midi) или null; v — ok | err | opt; fix — исправленный символ
const DET = [
  { r: 'F', sym: 'maj7♯11', degs: ['3', '5', '7', '#11'], mel: ['B♭', 70], v: 'err', fix: ['F', 'maj7', ['3', '5', '7', '9']] },
  { r: 'G', sym: 'm7', degs: ['b3', '5', 'b7', '9'], mel: ['D', 74], v: 'opt', fix: ['G', 'm6', ['b3', '5', '6', '9']] },
  { r: 'B♭', sym: '7♭9', degs: ['3', 'b7', 'b9', '13'], mel: ['D', 74], v: 'opt', fix: ['B♭', '7', ['3', 'b7', '9', '13']] },
  { r: 'E♭', sym: 'maj7', degs: ['3', '5', '7', '9'], mel: ['G', 67], v: 'ok' },
  { r: 'D♭', sym: '7alt', degs: ['3', 'b7', '#9', 'b13'], mel: ['B♭', 70], v: 'err', fix: ['D♭', '7♯11', ['3', 'b7', '9', '#11']] },
  { r: 'C', sym: '7alt', degs: ['3', 'b7', '#9', 'b13'], mel: ['G', 67], v: 'err', fix: ['C', '7', ['3', 'b7', '9', '13']] },
  { r: 'G', sym: 'm7♭5', degs: ['b3', 'b5', 'b7', '11'], mel: ['E', 76], v: 'err', fix: ['G', 'm7', ['b3', '5', 'b7', '9']] },
  { r: 'G', sym: '7♯11', degs: ['3', 'b7', '9', '#11'], mel: ['C♯', 73], v: 'opt', fix: ['G', '7♭9', ['3', 'b7', 'b9', '13']] },
  { r: 'G', sym: '7♭9', degs: ['3', 'b7', 'b9', '13'], mel: ['A', 69], v: 'err', fix: ['G', '13', ['3', 'b7', '9', '13']] },
  { r: 'C', sym: 'm6', degs: ['b3', '5', '6', '9'], mel: ['A♭', 68], v: 'err', fix: ['G', '7♭9', ['3', 'b7', 'b9', 'b13']] },
  { r: 'D', sym: 'm7♭5', degs: ['b3', 'b5', 'b7', '11'], mel: null, v: 'opt', fix: ['D', 'm7', ['b3', '5', 'b7', '9']] },
  { r: 'F', sym: '7alt', degs: ['3', 'b7', '#9', 'b13'], mel: ['D', 74], v: 'err', fix: ['F', '7♭9', ['3', 'b7', 'b9', '13']] },
  { r: 'C', sym: 'maj7', degs: ['3', '5', '7', '9'], mel: ['E', 76], v: 'ok' },
];
/* ---------- Сжатие формы: своя учебная AABA ---------- */
const SQ_A = ['Cmaj7', 'Am7', 'Dm7 G7', 'Em7 A7', 'Dm7', 'G7'], SQ_E = [['Cmaj7 A7', 'Dm7 G7'], ['Cmaj7', 'Gm7 C7'], ['C6', 'C6']];
const SQ_B = ['Fmaj7', 'Fm7 B♭7', 'Em7', 'A7', 'Dm7', 'D7', 'Dm7', 'G7'];

export function themeLabs({ T, L, snd, sp, mic, ui }) {
  const LABS = {};

  LABS.detect = {
    st: { ans: '.'.repeat(DET.length) },
    render(s) {
      const right = [...s.ans].filter((x, i) => x !== '.' && x === DET[i].v[0]).length, done = [...s.ans].filter((x) => x !== '.').length;
      return '<p class="bkhint">' + T('dt.hint') + '</p><div class="dtgrid">' + DET.map((d, i) => {
        const a = s.ans[i], open = a !== '.', ok = open && a === d.v[0];
        return '<div class="dtc' + (open ? (ok ? ' ok' : ' bad') : '') + '"><b>' + nm(rootN(d.r)) + d.sym + '</b><small>' + (d.mel ? T('dt.mel', { n: d.mel[0] }) : T('dt.nomel')) + '</small>' +
          (open ? '<p>' + (ok ? '✓ ' : '✗ ' + T('dt.v.' + d.v) + '. ') + T('dt.w' + i) + '</p><div class="bkrow">' + playBtn('data-a="p:' + i + '"', T('dt.asis')) + (d.fix ? playBtn('data-a="f:' + i + '"', nm(rootN(d.fix[0])) + d.fix[1]) : '') + '</div>'
            : '<div class="dtb">' + ['ok', 'err', 'opt'].map((v) => '<button class="chipc" data-a="a:' + i + ':' + v[0] + '">' + T('dt.v.' + v) + '</button>').join('') + '</div>') + '</div>';
      }).join('') + '</div><p class="score">' + T('dt.score', { ok: right, n: done }) + '</p><div class="bkrow"><button class="chipc" data-a="reset">' + T('dt.reset') + '</button></div>';
    },
    on(s, a) {
      if (a === 'reset') { s.ans = '.'.repeat(DET.length); return; }
      if (a.startsWith('a:')) { const [, i, v] = a.split(':'), c = [...s.ans]; c[+i] = v; s.ans = c.join(''); const d = DET[+i]; snd.chord([...voice(d.r, d.degs), ...(d.mel ? [d.mel[1]] : [])], { dur: 1.8 }); return; }
      const [k, i] = a.split(':'), d = DET[+i]; if (!d) return false;
      const ch = k === 'f' && d.fix ? voice(d.fix[0], d.fix[2]) : voice(d.r, d.degs);
      snd.chord([...ch, ...(d.mel ? [d.mel[1]] : [])], { dur: 2 }); return false;
    },
  };

  LABS.squeeze = {
    st: { v: 'full' },
    render(s) {
      const A = (e) => [...SQ_A, ...SQ_E[e]], full = [['A1', A(0)], ['A2', A(1)], ['B', SQ_B], ['A3', A(2)]];
      const cnt = (bars) => bars.reduce((n, b) => n + b.split(' ').length, 0);
      const fb = full.reduce((n, [, b]) => n + b.length, 0), fc = full.reduce((n, [, b]) => n + cnt(b), 0);
      const cb = SQ_A.length + SQ_E.length * 2 + SQ_B.length, cc = cnt(SQ_A) + SQ_E.reduce((n, e) => n + cnt(e), 0) + cnt(SQ_B);
      const bar = (b, cls = '') => '<div class="bkfb' + cls + '"><b>' + b + '</b></div>';
      let body;
      if (s.v === 'full') body = full.map(([n, bs]) => '<div class="sqrow"><span class="sql s' + n[0] + '">' + n + '</span><div class="fgrid">' + bs.map((b) => bar(b)).join('') + '</div></div>').join('');
      else body = '<div class="sqrow"><span class="sql sA">A</span><div class="fgrid">' + SQ_A.map((b) => bar(b)).join('') + '</div></div>' +
        SQ_E.map((e, i) => '<div class="sqrow"><span class="sql v">' + (i + 1) + '.</span><div class="fgrid">' + e.map((b) => bar(b, ' v')).join('') + '</div></div>').join('') +
        '<div class="sqrow"><span class="sql sB">B</span><div class="fgrid">' + SQ_B.map((b) => bar(b)).join('') + '</div></div><p class="bknote">' + T('sq2.order') + '</p>';
      return '<div class="bkctl">' + seg('v', [['full', T('sq2.full')], ['short', T('sq2.short')]], s.v) + '</div>' + body +
        '<p class="score">' + (s.v === 'full' ? T('sq2.count', { b: fb, c: fc }) : T('sq2.count2', { b: cb, c: cc, b0: fb, c0: fc })) + '</p>';
    },
    on() {},
  };

  /* ---------- Пение с тюнером (Максимов, Фридкин — ступени и интервалы; Алексеев — звуки аккорда и нона) ---------- */
  const DEGSEQ = ['1 2 3', '3 2 1', '1 3 5 3 1', '5 6 7 1', '5 4 3 2 1', '2 4 7 1', '1 5 3 1'];
  const MAJ = [0, 2, 4, 5, 7, 9, 11];
  const SIV = ['b3', '3', '4', '5', '6', 'b7', '7', '8'];
  const SIVS = { b3: 3, 3: 4, 4: 5, 5: 7, 6: 9, b7: 10, 7: 11, 8: 12 };
  const rnd = (n) => Math.floor(Math.random() * n), pick = (a) => a[rnd(a.length)];
  function task(kind) {
    const keys = ['C', 'D', 'E♭', 'F', 'G', 'A', 'B♭'], k = rootN(pick(keys)), kp = pcOf(k), t0 = near(kp, 55);
    if (kind === 'deg') {
      const seq = pick(DEGSEQ).split(' ').map(Number);
      return { q: T('sg.q.deg', { k: nm(k), s: seq.join(' – ') }), prompt: [t0, t0 + 4, t0 + 7], targets: seq.map((d) => mod(kp + MAJ[d - 1])), lbl: seq.map(String) };
    }
    if (kind === 'iv') {
      const iv = pick(SIV), b = 55 + rnd(8), fl = rnd(2) === 1;
      return { q: T('sg.q.iv', { n: nm(noteOf(b, fl)), i: (L.IV[iv] || [iv])[0] }), prompt: [b], targets: [mod(b + SIVS[iv])], lbl: [String(iv)], single: true };
    }
    if (kind === 'miss') {
      const [id, degs] = pick([['maj7', ['1', '3', '5', '7']], ['m7', ['1', 'b3', '5', 'b7']], ['7', ['1', '3', '5', 'b7']]]), miss = pick(degs.filter((d) => d !== '1' && d !== '5'));
      const ms = degs.filter((d) => d !== miss).map((d) => t0 - 12 + IV[d][1]);
      return { q: T('sg.q.miss', { c: nm(k) + id }), prompt: ms, targets: [mod(kp + IV[miss][1])], lbl: [miss.replace('b', '♭')], single: true };
    }
    const [r, id] = pick([['A', 'm7'], ['G', 'maj7'], ['F', 'm7'], ['E♭', 'm7'], ['D', '7'], ['G', '7'], ['C', '7'], ['F', '7'], ['B♭', 'maj7'], ['G♭', 'maj7'], ['D', 'maj7'], ['B', 'maj7']]);
    const rp = pcOf(rootN(r)), c = chordById(id);
    return { q: T('sg.q.nine', { c: nm(rootN(r)) + id }), prompt: [near(rp, 40), ...c.f.slice(1).map((d) => near(rp, 52) + IV[d][1])], targets: [mod(rp + 2)], lbl: ['9'], single: true };
  }
  LABS.sing = {
    st: { kind: 'deg', t: null, k: 0, on: false, err: '', note: '', c: 0, done: false },
    render(s) {
      if (!s.t) { s.t = task(s.kind); s.k = 0; s.done = false; }
      const t = s.t, bars = t.targets.map((_, i) => '<span class="sgt' + (i < s.k ? ' ok' : i === s.k && s.on ? ' cur' : '') + '">' + t.lbl[i] + '</span>').join('');
      const cents = s.on && s.note ? '<div class="sgm"><span style="left:' + (50 + Math.max(-50, Math.min(50, s.c))) + '%"></span></div>' : '';
      return '<div class="bkctl">' + seg('kind', [['deg', T('sg.deg')], ['iv', T('sg.iv')], ['miss', T('sg.miss')], ['nine', T('sg.nine')]], s.kind) + '</div>' +
        '<div class="excard"><div class="exq">' + t.q + '</div><div class="sgrow">' + bars + '</div>' +
        '<div class="sgnow">' + (s.done ? T('sg.done') : s.on ? (s.note ? s.note : T('sg.listen')) : '') + '</div>' + cents +
        (s.err ? '<p class="bkhint">' + T('sg.err.' + s.err) + '</p>' : '') +
        '<div class="bkrow">' + playBtn('data-a="hear"', T('sg.hear')) + (s.on ? '<button class="chipc on" data-a="stop">' + T('sg.stop') + '</button>' : '<button class="chipc" data-a="sing">' + T('sg.sing') + '</button>') + '<button class="chipc" data-a="new">' + T('sg.new') + '</button></div></div>' +
        '<p class="bknote">' + T('sg.note') + '</p>';
    },
    set(s) { stopSing(); s.t = null; s.on = false; s.err = ''; },
    on(s, a, el) {
      if (a === 'new') { stopSing(); s.t = null; s.on = false; s.err = ''; return; }
      if (a === 'hear') { const p = s.t.prompt; if (p.length === 1) snd.seq([p], 0.6, 1.2); else snd.chord(p, { dur: 2 }); return false; }
      if (a === 'stop') { stopSing(); s.on = false; return; }
      if (a !== 'sing' || !mic) { if (a === 'sing') s.err = 'none'; return; }
      stopSing(); s.on = true; s.err = ''; s.note = ''; s.done = s.k >= s.t.targets.length;
      if (s.done) { s.k = 0; s.done = false; }
      mic().then((m) => {
        if (!s.on) { m.stop(); return; }
        const me = { mic: m, raf: 0 }; active = me;
        let hold = 0, last = performance.now(), shown = '';
        const loop = () => {
          if (active !== me) return;
          const now = performance.now(), dt = (now - last) / 1000; last = now;
          const buf = m.read(); let f = yin(buf, m.sampleRate, 0.01); if (f) f = refinePitch(buf, f, m.sampleRate);
          if (f) {
            const { midi, cents } = freqToNote(f), want = s.t.targets[s.k];
            s.c = cents; s.note = nm(noteOf(midi, true)) + ' ' + (cents >= 0 ? '+' : '') + Math.round(cents);
            if (mod(midi) === want && Math.abs(cents) < 35) hold += dt; else hold = 0;
            if (hold > 0.35) { hold = 0; s.k++; if (s.k >= s.t.targets.length) { s.done = true; s.on = false; stopSing(); ui.redraw(el); return; } }
          } else { hold = 0; s.note = ''; }
          if (s.note !== shown) { shown = s.note; ui.redraw(el); }
          me.raf = requestAnimationFrame(loop);
        };
        me.raf = requestAnimationFrame(loop);
      }).catch((e) => { s.on = false; s.err = e && e.reason === 'denied' ? 'denied' : 'none'; ui.redraw(el); });
    },
  };

  /* ---------- Гаммы без корня (Левайн, гл. 4; Алексеев, «Практическое руководство по игре ладов») ---------- */
  const MODES = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
  function patLine(s) {
    const kp = pcOf(rootN(s.key)), fl = [5, 10, 3, 8, 1, 6].includes(kp), base = near(kp, 55);
    const steps = (sc) => scaleById(sc).f.map((d) => IV[d][1]);
    const octave = (start, sc, down) => { const st = steps(sc), up8 = [...st.map((x) => start + x), start + 12]; return down ? up8.slice().reverse().map((m) => m - 12 + 12) : up8; };
    const segs = [];
    if (s.ex === 'chain' || s.ex === 'rev') {
      const order = s.ex === 'chain' ? [0, 1, 2, 3, 4, 5, 6, 0] : [0, 6, 5, 4, 3, 2, 1, 0];
      order.forEach((d, i) => { const start = base + MAJ[d], down = s.ex === 'chain' ? i % 2 === 1 : i % 2 === 0; const o = octave(start, MODES[d], false); segs.push(down ? o.slice().reverse() : o); });
    } else if (s.ex === 'chrom') {
      for (let k = 0; k < 12; k++) { const o = octave(near(mod(kp + k), 55), s.mode, false); segs.push(k % 2 ? o.slice().reverse() : o); }
    } else {
      const st = steps(s.mode), sc = [...st, 12, ...st.map((x) => x + 12)].map((x) => base + x), line = [];
      for (let i = 0; i + 2 < sc.length && line.length < 32; i++) line.push(sc[i], sc[i + 2]);
      segs.push(line);
    }
    return { segs, fl: fl || s.ex === 'chrom' };
  }
  LABS.scalepat = {
    st: { key: 'C', mode: 'mixolydian', ex: 'chain', bpm: 120 },
    render(s) {
      const { segs, fl } = patLine(s), rows = [], show = segs.slice(0, s.ex === 'chrom' ? 4 : 8);
      show.forEach((sg, i) => { if (i % 2 === 0) rows.push([]); const r = rows[rows.length - 1]; sg.forEach((m) => r.push({ n: noteOf(m, fl), m, d: 'e', bm: 'g' + i + '_' + Math.floor(r.length / 4) })); r.push({ bar: '|' }); });
      return '<div class="bkctl">' + sel('key', MAJ_ROOTS.map((r) => [r, r]), s.key, T('ui.key')) + (s.ex === 'chain' || s.ex === 'rev' ? '' : sel('mode', MODES.map((m) => [m, L.SCN[m] || m]), s.mode, T('ui.scale'))) + seg('bpm', [[80, '80'], [120, '120'], [160, '160']], s.bpm) + '</div>' +
        '<div class="bkctl">' + seg('ex', [['chain', T('sp.chain')], ['rev', T('sp.rev')], ['chrom', T('sp.chrom')], ['thirds', T('sp.thirds')]], s.ex) + '</div>' +
        rows.map((r) => scoreSVG(r, { clef: 'treble' })).join('') + '<p class="bknote">' + T('sp.n.' + s.ex) + '</p><div class="bkrow">' + playBtn('data-a="p"') + '</div>';
    },
    on(s) {
      const { segs } = patLine(s), e = 30 / s.bpm, line = segs.flat(), notes = line.map((m, i) => [i * e, m, e * 0.9, 0.55]), hits = [];
      for (let i = 0; i < line.length; i += 2) hits.push([i * e, i % 8 ? 'click' : 'clickHi', 0.3]);
      snd.play({ notes, hits }); return false;
    },
  };

  /* ---------- Что почитать: книги, по которым собран учебник ---------- */
  LABS.books = {
    st: {},
    render() { return '<div class="bklist">' + Object.entries(L.SRC || {}).map(([k, [a, b]]) => '<div class="bkli"><b>' + a + '</b><span>' + b + '</span><small>' + T('bkr.' + k) + '</small></div>').join('') + '</div>'; },
    on() {},
  };
  void sp;
  return LABS;
}

/* ---------- Новые виды вопросов тренировки ---------- */
export function extraEx({ T, L, scName, opts, shuffle, voiceSimple }) {
  const rnd = (n) => Math.floor(Math.random() * n), pick = (a) => a[rnd(a.length)];
  const nmS = (s) => nm(rootN(s));
  const ivName = (k) => (L.IV[k] || [k, k])[0];
  const KEYS = ['C', 'D', 'E♭', 'E', 'F', 'G', 'A♭', 'A', 'B♭'];
  const tri = (p, q) => ({ maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] })[q].map((x) => p + x);
  return {
    staff() {
      const clef = pick(['t', 'b']), m = clef === 't' ? 60 + rnd(22) : 40 + rnd(22), fl = rnd(3) === 0, n = noteOf(m, fl), a = nm(n), pool = [...new Set(SHARP.concat(FLAT).map(nm))];
      return { q: T('ex.q.staff'), show: staffSVG([{ n, m }], { mode: 'seq' }), a, o: opts(a, pool), play: [[m]] };
    },
    degof() {
      const k = rootN(pick(KEYS)), d = 1 + rnd(7), n = simp(up(k, String(d))), a = nm(k);
      return { q: T('ex.q.degof', { n: nm(n), d: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][d - 1] }), a, o: opts(a, KEYS.map(nmS)), prog: [voiceSimple({ r: k, id: 'maj7' })] };
    },
    rel() {
      const i = rnd(12), maj = CIRCLE[i], a = REL_MIN[i] + ' ' + T('ex.minor');
      return { q: T('ex.q.rel', { k: maj }), a, o: opts(a, REL_MIN.map((x) => x + ' ' + T('ex.minor'))) };
    },
    ivbuild() {
      const iv = pick(['b3', '3', '4', '5', 'b6', '6', 'b7', '7', 'b2', '2', '#4']), r = rootN(pick(KEYS)), n = simp(up(r, iv)), a = nm(n);
      const m0 = near(pcOf(r), 60), pool = [...new Set(SHARP.concat(FLAT).map(nm))];
      return { q: T('ex.q.ivbuild', { n: nm(r), i: ivName(iv) }), a, o: opts(a, pool), play: [[m0], [m0 + IV[iv][1]]] };
    },
    inv() {
      const P = [['b2', '7'], ['2', 'b7'], ['b3', '6'], ['3', 'b6'], ['4', '5'], ['#4', 'b5'], ['5', '4'], ['b6', '3'], ['6', 'b3'], ['b7', '2'], ['7', 'b2']], [x, y] = pick(P);
      return { q: T('ex.q.inv', { i: ivName(x) }), a: ivName(y), o: opts(ivName(y), P.map((p) => ivName(p[1]))) };
    },
    triear() {
      const q = pick(['maj', 'min', 'dim', 'aug']), b = 52 + rnd(10), names = { maj: T('ex.tq.maj'), min: T('ex.tq.min'), dim: T('ex.tq.dim'), aug: T('ex.tq.aug') };
      return { q: T('ex.q.triear'), a: names[q], o: shuffle(Object.values(names)), block: tri(b, q), ear: true };
    },
    invear() {
      const b = 52 + rnd(8), k = rnd(3), ms = [[0, 4, 7], [4, 7, 12], [7, 12, 16]][k].map((x) => b + x), names = ['5/3', '6', '6/4'];
      return { q: T('ex.q.invear'), a: names[k], o: names.slice(), block: ms, ear: true };
    },
    parent() {
      const P = [['7alt', 'b2', 'melmin'], ['7♯11', '5', 'melmin'], ['m7♭5', 'b3', 'melmin'], ['m(maj7)', '1', 'melmin'], ['7sus4♭9', 'b7', 'melmin'], ['m7', 'b7', 'ionian'], ['7', '4', 'ionian'], ['maj7♯11', '5', 'ionian']];
      const [id, d, sc] = pick(P), r = rootN(pick(KEYS)), mk = (x) => nm(simp(up(r, x[1]))) + ' ' + scName(x[2]), a = mk([id, d, sc]);
      return { q: T('ex.q.parent', { c: nm(r) + id }), a, o: opts(a, P.map(mk)), prog: [voiceSimple({ r, id: id.startsWith('m') ? (id === 'm7' ? 'm7' : id === 'm7♭5' ? 'm7♭5' : 'm(maj7)') : id.startsWith('maj') ? 'maj7' : '7' })] };
    },
    twin() {
      const r = rootN(pick(KEYS)), alt = rnd(2) === 0, tw = simp(up(r, 'b5')), a = nm(tw) + (alt ? '7♯11' : '7alt');
      return { q: T('ex.q.twin', { c: nm(r) + (alt ? '7alt' : '7♯11') }), a, o: opts(a, KEYS.map((x) => nmS(x) + (alt ? '7♯11' : '7alt'))), prog: [voiceSimple({ r, id: '7' }), voiceSimple({ r: tw, id: '7' })] };
    },
    dim7() {
      const g = rnd(3), roots = [0, 3, 6, 9].map((x) => MAJ_ROOTS[mod(g + 1 + x)]), fmt = (rs) => rs.map((x) => x).join(' '), a = fmt(roots);
      const others = [1, 2].map((h) => fmt([0, 3, 6, 9].map((x) => MAJ_ROOTS[mod(g + h + 1 + x)])));
      const dim = MAJ_ROOTS[mod(g + 2)];
      return { q: T('ex.q.dim7', { c: dim + '°7' }), a, o: shuffle([a, ...others]) };
    },
    countdown() {
      const k = rootN(pick(['C', 'D', 'F', 'G', 'B♭', 'E♭'])), f = (kk) => { const c = (d, q) => nm(simp(up(kk, d))) + q; return [c('2', 'm7'), c('b3', '7'), c('b6', 'maj7'), c('7', '7'), c('3', 'maj7'), c('5', '7'), c('1', 'maj7')].join(' '); };
      const a = f(k);
      return { q: T('ex.q.countdown', { k: nm(k) }), a, o: opts(a, ['C', 'D', 'F', 'G', 'B♭', 'E♭', 'A'].map((x) => f(rootN(x)))) };
    },
    locv() {
      const k = rootN(pick(KEYS)), v = simp(up(k, '5')), b2 = simp(up(k, 'b2')), a = nm(b2) + '/' + nm(v);
      return { q: T('ex.q.locv', { k: nm(k) }), a, o: opts(a, KEYS.map((x) => { const kk = rootN(x); return nm(simp(up(kk, 'b2'))) + '/' + nm(simp(up(kk, '5'))); }).concat([nm(simp(up(k, '2'))) + '/' + nm(v)])) };
    },
    verdict() {
      const C = [['G', '7alt', 'A', 'err'], ['B♭', '7♭9', 'D', 'opt'], ['F', 'maj7♯11', 'B♭', 'err'], ['C', 'maj7', 'E', 'ok'], ['G', '7♭9', 'A', 'err'], ['D♭', '7alt', 'B♭', 'err'], ['E', 'm7♭5', 'C♯', 'err'], ['D', 'm7', 'F', 'ok'], ['A', '7', 'C♯', 'ok'], ['C', '7alt', 'D', 'err']];
      const [r, id, mel, v] = pick(C), a = T('dt.v.' + v);
      return { q: T('ex.q.verdict', { c: nmS(r) + id, n: mel }), a, o: ['ok', 'err', 'opt'].map((x) => T('dt.v.' + x)) };
    },
    m6over() {
      const P = [['E', 'm7♭5', 'b3'], ['A', '7alt', 'b2'], ['D', 'm7', '1'], ['C', 'maj7', '6'], ['C', '7♯9', '1'], ['G', '7', '5'], ['F♯', 'm7♭5', 'b3']], [r, id, d] = pick(P), rr = rootN(r), a = nm(simp(up(rr, d))) + 'm6';
      return { q: T('ex.q.m6over', { c: nm(rr) + id }), a, o: opts(a, MAJ_ROOTS.map((x) => x + 'm6')), prog: [voiceSimple({ r: rr, id: id === '7alt' || id === '7♯9' ? '7' : id })] };
    },
    secdom() {
      const k = rootN(pick(['C', 'F', 'G', 'D', 'B♭', 'E♭'])), T5 = [['6', '2', 'm7'], ['7', '3', 'm7'], ['1', '4', 'maj7'], ['2', '5', '7'], ['3', '6', 'm7']], [d, tgt, q] = pick(T5);
      const a = nm(simp(up(k, tgt))) + q, all = T5.map((x) => nm(simp(up(k, x[1]))) + x[2]);
      return { q: T('ex.q.secdom', { c: nm(simp(up(k, d))) + '7', k: nm(k) }), a, o: opts(a, all), prog: [voiceSimple({ r: simp(up(k, d)), id: '7' }), voiceSimple({ r: simp(up(k, tgt)), id: q })] };
    },
    flen() {
      const F = [['8-8-8-8', 32], ['16-16-8-16', 56], ['12-12-8-12', 44], ['8-8-8-12', 36], ['16-16-16-16', 64], ['8-8-4-8', 28]], [f, n] = pick(F);
      return { q: T('ex.q.flen', { f }), a: String(n), o: opts(String(n), F.map((x) => String(x[1]))) };
    },
    clave() {
      const k = rnd(3), names = ['3-2', '2-3', T('cl.rumba') + ' 3-2'], cells = [[0, 3, 6, 10, 12], [2, 4, 8, 11, 14], [0, 3, 7, 10, 12]][k], e = 0.15, hits = [];
      for (let r = 0; r < 2; r++) cells.forEach((i) => hits.push([r * 16 * e + i * e, 'clave', 0.85]));
      for (let i = 0; i < 32; i += 2) hits.push([i * e, i % 8 ? 'click' : 'clickHi', 0.25]);
      return { q: T('ex.q.clave'), a: names[k], o: names.slice(), hits, ear: true };
    },
  };
}
