// Учебник, уроки: проверки упражнений — сыграть ноты (микрофон, высота по YIN, как в тюнере), сыграть аккорды (микрофон,
// хрома по спектру, как в «Определителе»), отстучать ритм касаниями под метроном, открыть инструмент приложения
// с нужной настройкой. Настройка — из урока (lessons.js: cfg) поверх st; inst — инструмент: p пианино, g гитара, b бас.
// Микрофон — только по кнопке «Играть», звук разбирается на устройстве, поток закрывается после проверки.
import { N, NAT, nm } from './engine.js';
import { playBtn } from './draw.js';
import { scoreSVG, beatNotes } from './score.js';
import { listen, stopSing } from './labs5.js';
import { chromaOfSpectrum } from '../../../music/analyze.js';

const mod = (x) => ((x % 12) + 12) % 12;
// «C4», «F#3», «Bb2» → { n, m }
export function parseNote(s) {
  const x = /^([A-G])(#|b)?(-?\d)$/.exec(String(s).trim()); if (!x) return null;
  const l = 'CDEFGAB'.indexOf(x[1]), a = x[2] === '#' ? 1 : x[2] === 'b' ? -1 : 0;
  return { n: N(l, a), m: (+x[3] + 1) * 12 + NAT[l] + a };
}
// «Am», «G7», «F#m» → { r — высота корня 0…11, minor, name }
export function parseChordName(s) {
  const x = /^([A-G])(#|b|♯|♭)?(m(?!aj))?/.exec(String(s).trim()); if (!x) return null;
  const a = x[2] === '#' || x[2] === '♯' ? 1 : x[2] === 'b' || x[2] === '♭' ? -1 : 0;
  return { r: mod(NAT['CDEFGAB'.indexOf(x[1])] + a), minor: !!x[3], name: String(s).replace('#', '♯').replace(/b(?=m|7|$)/, '♭') };
}
// Лучшее трезвучие по хроме (12 сил): { r, minor, score }
export function bestTriad(c) {
  let best = null; const sum = c.reduce((a, b) => a + b, 0);
  for (let r = 0; r < 12; r++) for (const minor of [false, true]) {
    const tones = [r, r + (minor ? 3 : 4), r + 7].map(mod), inn = c[tones[0]] * 1.1 + c[tones[1]] + c[tones[2]] * 0.8;
    const score = inn - 0.25 * (sum - c[tones[0]] - c[tones[1]] - c[tones[2]]);
    if (!best || score > best.score) best = { r, minor, score };
  }
  return best;
}

export function lessonLabs({ T, snd, mic, ui, tools }) {
  const LABS = {};
  const micBtn = (on) => (on ? '<button class="chipc on" data-a="stop">' + T('lx.stop') + '</button>' : '<button class="chipc" data-a="go">' + T('lx.go') + '</button>');
  const errTxt = (s) => (s.err ? '<p class="bkhint">' + T('sg.err.' + s.err) + '</p>' : '');

  /* ---------- Сыграть ноты: по очереди, октава любая ---------- */
  LABS.xplay = {
    st: { n: { p: 'C4 D4 E4 F4 G4' }, inst: 'p', k: 0, on: false, err: '', now: '', done: false },
    list(s) { return String((s.n && (s.n[s.inst] || s.n.p || s.n.g || s.n.b)) || '').split(/\s+/).map(parseNote).filter(Boolean); },
    render(s) {
      const ns = this.list(s);
      return '<div class="xrow">' + ns.map((x, i) => '<span class="xn' + (i < s.k ? ' ok' : i === s.k && s.on ? ' cur' : '') + '">' + nm(x.n) + '</span>').join('') + '</div>' +
        '<div class="xnow">' + (s.done ? T('lx.done') : s.on ? s.now || T('sg.listen') : '') + '</div>' + errTxt(s) +
        '<div class="bkrow">' + playBtn('data-a="hear"', T('lx.hear')) + micBtn(s.on) + '</div>';
    },
    on(s, a, el) {
      const ns = this.list(s);
      if (a === 'hear') { snd.seq(ns.map((x) => x.m), 0.5, 0.6); return false; }
      if (a === 'stop') { stopSing(); s.on = false; return; }
      if (a !== 'go') return false;
      if (!mic) { s.err = 'none'; return; }
      snd.stop(); s.on = true; s.err = ''; s.now = ''; if (s.done || s.k >= ns.length) { s.k = 0; s.done = false; }
      let hold = 0, shown = '';
      listen(mic, ({ dt, midi, cents }) => {
        if (!s.on) return false;
        if (midi != null) {
          const want = ns[s.k];
          s.now = want && mod(midi) === mod(want.m) ? nm(want.n) + ' ✓' : '…';
          if (want && mod(midi) === mod(want.m) && Math.abs(cents) < 40) hold += dt; else hold = 0;
          if (hold > 0.15) { hold = 0; s.k++; if (s.k >= ns.length) { s.done = true; s.on = false; ui.redraw(el); return false; } ui.redraw(el); }
        } else hold = 0;
        if (s.now !== shown) { shown = s.now; ui.redraw(el); }
        return true;
      }, (e) => { s.on = false; s.err = e; ui.redraw(el); });
    },
  };

  /* ---------- Сыграть аккорды: по очереди, мажор или минор и корень ---------- */
  LABS.xchord = {
    st: { ch: { p: 'C F G' }, inst: 'p', k: 0, on: false, err: '', now: '', done: false },
    list(s) { return String((s.ch && (s.ch[s.inst] || s.ch.p || s.ch.g)) || '').split(/\s+/).map(parseChordName).filter(Boolean); },
    render(s) {
      const cs = this.list(s);
      return '<div class="xrow">' + cs.map((x, i) => '<span class="xn ch' + (i < s.k ? ' ok' : i === s.k && s.on ? ' cur' : '') + '">' + x.name + '</span>').join('') + '</div>' +
        '<div class="xnow">' + (s.done ? T('lx.done') : s.on ? s.now || T('sg.listen') : '') + '</div>' + errTxt(s) +
        '<div class="bkrow">' + playBtn('data-a="hear"', T('lx.hear')) + micBtn(s.on) + '</div><p class="bknote">' + T('lx.chordHint') + '</p>';
    },
    on(s, a, el) {
      const cs = this.list(s);
      const voice = (x) => [48 + x.r, 60 + x.r, 60 + x.r + (x.minor ? 3 : 4), 60 + x.r + 7].map((m) => (m > 71 ? m - 12 : m));
      if (a === 'hear') { snd.prog(cs.map(voice), 1.2); return false; }
      if (a === 'stop') { stopSing(); s.on = false; return; }
      if (a !== 'go') return false;
      if (!mic) { s.err = 'none'; return; }
      snd.stop(); s.on = true; s.err = ''; s.now = ''; if (s.done || s.k >= cs.length) { s.k = 0; s.done = false; }
      const acc = new Float64Array(12); let buf = null, t = 0, hold = 0, shown = '';
      listen(mic, ({ m, dt }) => {
        if (!s.on) return false;
        if (!m.analyser) return true;
        t += dt; if (t < 0.08) return true; const step = t; t = 0;
        buf = buf || new Float32Array(m.analyser.frequencyBinCount);
        m.analyser.getFloatFrequencyData(buf);
        const { chroma, level } = chromaOfSpectrum(buf, m.sampleRate);
        const decay = Math.exp(-step / 0.5);
        for (let i = 0; i < 12; i++) acc[i] = acc[i] * decay + (level > 0.02 ? chroma[i] : 0);
        const want = cs[s.k], b = level > 0.02 ? bestTriad(acc) : null;
        s.now = b ? (b.r === want.r && b.minor === want.minor ? want.name + ' ✓' : '…') : '';
        if (b && want && b.r === want.r && b.minor === want.minor) hold += step; else hold = 0;
        if (hold > 0.4) { hold = 0; acc.fill(0); s.k++; if (s.k >= cs.length) { s.done = true; s.on = false; ui.redraw(el); return false; } ui.redraw(el); }
        if (s.now !== shown) { shown = s.now; ui.redraw(el); }
        return true;
      }, (e) => { s.on = false; s.err = e; ui.redraw(el); });
    },
  };

  /* ---------- Отстучать ритм: такт отсчёта, затем рисунок касаниями ---------- */
  // cells — клетки рисунка (1 — удар), sub — клеток в доле, bpm. Постоянная задержка (экран, звук) вычитается: середина ошибок
  LABS.xtap = {
    st: { cells: '1010101010101010', sub: 2, num: 4, bpm: 72, run: false, taps: [], res: null },
    times(s) { const q = 60 / s.bpm, out = []; [...s.cells].forEach((c, i) => { if (c === '1') out.push((s.num + i / s.sub) * q); }); return out; },
    render(s) {
      const items = [], beats = s.cells.length / s.sub;
      for (let b = 0; b < beats; b++) { items.push(...beatNotes([...s.cells.slice(b * s.sub, b * s.sub + s.sub)].map(Number), s.sub, 'b' + b)); if (b % s.num === s.num - 1) items.push({ bar: b === beats - 1 ? '|.' : '|' }); }
      const r = s.res;
      return scoreSVG(items, { clef: 'perc', time: [s.num, 4], unit: 20 }) +
        (s.run ? '<button class="xtapb" data-a="tap" aria-label="' + T('lx.tap') + '">' + T('lx.tap') + '</button>'
          : '<div class="bkrow">' + playBtn('data-a="hear"', T('lx.hear')) + '<button class="chipc" data-a="go">' + T('lx.tapGo', { bpm: s.bpm }) + '</button></div>') +
        (r ? '<p class="xres ' + (r.ok === r.n && !r.extra ? 'ok' : '') + '">' + T('lx.tapRes', { ok: r.ok, n: r.n, x: r.extra }) + '</p>' : '<p class="bknote">' + T('lx.tapHint') + '</p>');
    },
    on(s, a, el) {
      const q = 60 / s.bpm, exp = this.times(s), end = exp.length ? exp[exp.length - 1] + q : 8 * q;
      const clicks = []; for (let b = 0; b * q < end; b++) clicks.push([b * q, b % s.num ? 'click' : 'clickHi', b < s.num ? 0.7 : 0.35]);
      if (a === 'hear') { snd.play({ hits: [...clicks, ...exp.map((t) => [t, 'clave', 0.8])] }); return false; }
      if (a === 'tap') { if (s.run) s.taps.push(performance.now() / 1000 - s.t0); return false; }
      if (a !== 'go') return false;
      s.run = true; s.taps = []; s.res = null; s.t0 = performance.now() / 1000 + 0.06;
      snd.play({ hits: clicks, marks: [[end + 0.3, () => {
        s.run = false;
        // ошибки касаний до ближайшего удара; постоянная задержка — середина
        const errs = s.taps.map((t) => exp.reduce((b, e) => (Math.abs(t - e) < Math.abs(b) ? t - e : b), Infinity)).filter((x) => Math.abs(x) < 0.35).sort((x, y) => x - y);
        const lat = errs.length ? errs[Math.floor(errs.length / 2)] : 0, used = new Set(); let ok = 0;
        s.taps.forEach((t) => { const i = exp.findIndex((e, k) => !used.has(k) && Math.abs(t - lat - e) < 0.07); if (i >= 0) { used.add(i); ok++; } });
        s.res = { ok, n: exp.length, extra: s.taps.length - ok };
        ui.redraw(el);
      }]] });
    },
  };

  /* ---------- Открыть инструмент приложения с настройкой урока ---------- */
  LABS.xtool = {
    st: { tool: 'metro', bpm: 0 },
    render(s) { return '<div class="bkrow"><button class="chipc xtool" data-a="open">' + T('lx.open.' + s.tool, { bpm: s.bpm }) + ' ›</button></div>'; },
    on(s) { if (tools) tools(s.tool, s); return false; },
  };

  return LABS;
}
