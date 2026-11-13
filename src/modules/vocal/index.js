// Вокал (DECISIONS «Вокал» 13.11 и 14.11.2026, тема — docs/vocal.md). Сначала — диапазон голоса (проверка голосом,
// ввод вручную или по типу), только потом распевки и импровизация. Три раздела:
// • Голос — диапазон двух уровней: рабочий (поёт уверенно) и физический (берёт без крика, но пока неудобно); тип голоса
//   с оговоркой; края ведутся пальцем; дневник проверок. Проверка — три шага: вниз до предела, вверх до предела,
//   спеть удобно (рабочий — по свободному пению, voicetype.js: workingOf).
// • Распевки — упражнение из библиотеки (exercises.js, уровни: основа → дальше → сложнее) разворачивается по рабочему
//   диапазону и «зоне роста» к физическому (warmup.js: trainRange, buildRun): аккорд перед шагом рядом с голосом, тоника
//   под пением, тихая мелодия по желанию. Сверху — ноты шага (текущая нота подсвечена), ниже — полоса высоты: дорожки
//   нот, зоны диапазона, целевые ноты со слогами, линия голоса и попадание.
// • Импровизация — свой дрон (тоника и квинта, шина «vocal», без арпеджиатора «Пэдов» — тот звучал низко и не уходил,
//   слово автора 14.11.2026), лад вручную или «Авто» (voicetype.js: detectMode); линия голоса окрашена по отклонению
//   от ближайшей ступени, у текущей ноты — цель и центы; итог — где по ступеням уходит вниз или вверх.
// Данные человека — ctx.data() (settings.vocal: range { lo, hi, plo, phi, at }, type, hist); устройство — ctx.store.
// Звук — по docs/tech/audio.md: ноты на точное время звуковых часов, отпускание — таймером часов (как секвенсор
// студии), всё снимается при остановке; «играть» снимает паузу из шторки. Микрофон — только анализ на устройстве.
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';
import './vocal.css';
import meta, { ICON } from './meta.js';
import { EXERCISES, PROGRAMS, PROGRAM_IDS, LEVELS, exById } from './exercises.js';
import { buildRun, runSeconds, syllable, spellNote, noteName, trainRange } from '../../music/warmup.js';
import { TYPES, voiceType, typeComfort, typeRange, createNoteTracker, rangeOf, workingOf, scoreNote, improvSummary, detectMode } from '../../music/voicetype.js';
import { yin, refinePitch, createPitchSmoother } from '../../audio/pitch.js';
import { every, after, cancel } from '../../audio/clock.js';
import { presetOf } from '../../audio/synth.js';
import { SCALES } from '../../music/theory.js';
import { MAJ_NAMES } from '../../music/notes.js';
import { swipe } from '../../ui/gestures.js';
import { scoreSVG } from '../book/book/score.js';
import BRAVURA from '@coderline/alphatab/font/Bravura.woff2?url';

let fontOn = null;
function loadFont() {
  if (fontOn || typeof FontFace === 'undefined') return;
  fontOn = true;
  new FontFace('Melete Bravura', 'url(' + BRAVURA + ')').load().then((f) => document.fonts.add(f)).catch(() => { fontOn = false; });
}

const SOUNDS = ['', 'piano', 'wfelt', 'wkpad', 'organ', 'fmep', 'sine', 'bell', 'wair'];
const DRONE_SOUNDS = ['wair', 'wwarm', 'wchoir', 'organ', 'sine'];
// Лады импровизации: «Авто» и все основные; для автоопределения — без «Авто»
const IM_SCALES = ['auto', 'major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixo', 'locrian', 'harm', 'mel', 'phrygdom', 'hungmin', 'pmaj', 'pmin', 'blues'];
const IM_CANDS = Object.fromEntries(IM_SCALES.filter((k) => k !== 'auto').map((k) => [k, SCALES[k][0]]));
const GUIDE_VEL = { off: 0, soft: 0.3, full: 0.62 };
const GROW = ['0', '2', '4', 'all']; // зона роста: полутонов за рабочим диапазоном к физическому
const PROG_MAX_SEC = 90; // упражнение в программе — не дольше (дальше шаг по тону)
const ROMAN = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII'];
const I = {
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1.2" fill="currentColor"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/><circle cx="4" cy="18" r="1.2" fill="currentColor"/></svg>',
  drone: '<svg viewBox="0 0 24 24"><path d="M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
};

let host = null, ctx = null, size = 'full', root = null;
let P = null; // идущая распевка
let M = null; // микрофон: { mic, timer, smooth, samples: [{ t, m }] }
let T = null; // проверка диапазона: { on, phase: 'low' | 'high' | 'work', notes: { low, high, work }, tr } | { res }
let IM = null; // импровизация: { on, notes: [{ m, t0, t1, dur }], tr, drone: [ключи] }
let raf = 0, seq = 0, tipShown = false, offSwipe = null, cam = null, lastStep = -1, lastNote = -1, edge = 'lo';

const S = () => {
  const s = ctx.store.all();
  if (!['warm', 'improv', 'voice'].includes(s.sec)) s.sec = 'warm';
  if (!exById(s.ex)) s.ex = 'hum'; // начинают с лёгкого
  if (!SOUNDS.includes(s.sound)) s.sound = '';
  if (!GUIDE_VEL[s.guide] && s.guide !== 'off') s.guide = 'soft';
  if (!(s.tempo >= 0.6 && s.tempo <= 1.4)) s.tempo = 1;
  if (![1, 2].includes(s.step)) s.step = 1;
  if (!['updown', 'up'].includes(s.dir)) s.dir = 'updown';
  if (!GROW.includes(String(s.grow))) s.grow = '2';
  if (typeof s.listen !== 'boolean') s.listen = true;
  if (!IM_SCALES.includes(s.imScale)) s.imScale = 'auto';
  if (!(s.imPc >= 0 && s.imPc < 12)) s.imPc = 0;
  if (typeof s.imDrone !== 'boolean') s.imDrone = true;
  if (!DRONE_SOUNDS.includes(s.imSound)) s.imSound = 'wair';
  return s;
};
// Данные человека: range { lo, hi — рабочий; plo, phi — физический; at }, type, hist. Прежний вид (13.11: xlo, xhi —
// «крайние») читается как физический
const D = () => {
  const d = ctx.data();
  if (!Array.isArray(d.hist)) d.hist = [];
  if (!TYPES.some((x) => x[0] === d.type)) d.type = null;
  const r = d.range;
  if (r && r.plo == null) { r.plo = Math.min(r.xlo ?? r.lo, r.lo); r.phi = Math.max(r.xhi ?? r.hi, r.hi); }
  return d;
};
const hasRange = () => { const r = D().range; return !!(r && r.hi > r.lo); };
const myRange = () => (hasRange() ? D().range : null);
const typeName = (id) => ctx.t('type.' + id);
const esc = (s) => ctx.ui.esc(s);
const syn = () => ctx.audio.synth;
const now = () => ctx.audio.now();

/* ---------- распевка: прогон и звук ---------- */

function exRange(ex) {
  const r = myRange();
  if (ex.cool) return { lo: r.lo, hi: r.lo + Math.max(7, Math.round((r.hi - r.lo) * 0.66)) };
  const g = S().grow;
  return trainRange(r, g === 'all' ? 'all' : +g);
}
const bpmOf = (ex) => (ex.bpm || 100) * S().tempo;
const spbOf = (ex) => 60 / bpmOf(ex);
function runOf(ex, inProg) {
  if (ex.free || !hasRange()) return null;
  const s = S(), spb = spbOf(ex);
  return buildRun(ex, exRange(ex), { step: ex.step || s.step, dir: ex.dir || s.dir, maxBeats: inProg ? PROG_MAX_SEC / spb : 0 });
}
const freeSec = (ex) => ex.free.reduce((a, x) => a + x[1], 0) * (ex.rep || 1);
const exSec = (ex, inProg) => (ex.free ? freeSec(ex) : runSeconds(runOf(ex, inProg) || { beats: 0 }, bpmOf(ex)));
const progSec = (id) => PROGRAMS[id].reduce((a, x) => a + exSec(exById(x), true) + 2, 0);
const patch = () => (S().sound ? presetOf(S().sound) : null);

// Звук шага — на точное время звуковых часов; отпускание — таймером часов за 60 мс до конца, с точным временем конца
// (как секвенсор студии: off с будущим временем сразу забирает голос — длинная тоника оборвалась бы)
function schedStep(st) {
  const s = S(), ex = P.ex, spb = P.spb, at = (b) => P.t0 + b * spb, pt = patch(), sy = syn();
  if (!sy) return;
  const run = P;
  const on = (m, a, b, vel) => {
    const k = 'vc' + seq++;
    sy.on(m, k, { bus: 'vocal', patch: pt, vel, at: a });
    run.live.set(k, after(Math.max(0, (b - now()) * 1000 - 60), () => { run.live.delete(k); sy.off(k, false, b); }));
  };
  const lead = st.lead;
  lead.ms.forEach((m, j) => on(m, at(lead.t) + j * 0.012, at(lead.t + lead.d) - 0.03, 0.5));
  const first = st.sing[0], last = st.sing[st.sing.length - 1];
  if (first) lead.ms.slice(0, 2).forEach((m) => on(m, at(first.t), at(last.t + last.d), 0.22)); // бас и тоника под пением
  const gv = GUIDE_VEL[s.guide] || 0;
  if (gv) st.sing.forEach((n) => on(n.m, at(n.t), at(n.t + n.d * (ex.stacc ? 0.45 : n.m2 != null ? 0.3 : 0.92)), gv));
}
function releaseAll() {
  const sy = syn();
  if (!P || !P.live) return;
  P.live.forEach((tm, k) => { cancel(tm); if (sy) sy.off(k, true); });
  P.live.clear();
}

// Перед любым звуком: всё прежнее — стоп (импровизация с её дроном, проверка), пауза из шторки — снята
function quietOthers() { improvStop(); if (T && T.on) { micOff(); T = null; } }
function startEx(ex, prog = null) {
  if (!hasRange()) { render(); return; }
  stopPlay(true);
  quietOthers();
  ctx.audio.unlock();
  if (ctx.audio.release) ctx.audio.release();
  if (!syn()) { ctx.ui.toast(ctx.t('noSound')); return; }
  const s = S();
  if (!tipShown && s.listen && !s.tipSeen) { tipShown = true; s.tipSeen = true; ctx.store.save(); ctx.ui.toast(ctx.t('tipPhones')); }
  lastStep = -1; lastNote = -1;
  P = { ex, prog, run: runOf(ex, !!prog), spb: spbOf(ex), t0: now() + 0.25, next: 0, live: new Map(), acc: {}, wall: performance.now() + 250, timer: 0 };
  P.timer = every(80, tick);
  if (s.listen && !ex.free) micOn();
  render();
  loop();
}
function tick() {
  if (!P || !P.timer) return;
  const t = now(), ex = P.ex;
  if (ex.free) { if ((performance.now() - P.wall) / 1000 >= freeSec(ex)) finish(); return; }
  const steps = P.run.steps;
  while (P.next < steps.length && P.t0 + steps[P.next].t0 * P.spb < t + 1.2) schedStep(steps[P.next++]);
  if (t > P.t0 + P.run.beats * P.spb + 0.2) finish();
}
function finish() {
  const prog = P && P.prog, p = hitPct();
  stopPlay(true);
  if (prog && prog.i + 1 < PROGRAMS[prog.id].length) {
    const i = prog.i + 1, ex = exById(PROGRAMS[prog.id][i]);
    S().ex = ex.id; ctx.store.save();
    P = { ex, prog: { ...prog, i }, run: runOf(ex, true), spb: spbOf(ex), wait: true, live: new Map(), acc: {} };
    render();
    const id = every(1600, () => { cancel(id); if (P && P.wait && P.ex === ex) startEx(ex, { ...prog, i }); });
    return;
  }
  ctx.ui.toast(p != null ? ctx.t('hit', { p }) : ctx.t('done'));
  render();
}
function stopPlay(quiet) {
  if (!P) return;
  cancel(P.timer);
  P.timer = 0;
  releaseAll();
  micOff();
  P = null;
  if (!quiet) render();
}
const playing = () => !!(P && !P.wait && P.timer);

// Голос против целевой ноты: медиана отклонения (полутоны, без учёта октавы) по пробам внутри ноты
function noteRes(key) {
  const a = P && P.acc[key];
  if (!a || a.length < 3) return null;
  const s = a.slice().sort((x, y) => x - y), md = Math.abs(s[s.length >> 1]);
  return md <= 0.5 ? 'ok' : md <= 1 ? 'near' : 'miss';
}
function hitPct() {
  if (!P || P.ex.free) return null;
  const ks = Object.keys(P.acc);
  if (ks.length < 3) return null;
  return Math.round((ks.filter((k) => noteRes(k) === 'ok').length / ks.length) * 100);
}
function warmSample(t, m) {
  if (!playing() || !P.run) return;
  const b = (t - 0.08 - P.t0) / P.spb;
  for (const st of P.run.steps) {
    if (b < st.t0 || b > st.end) continue;
    const n = st.sing.find((x) => b >= x.t + 0.12 / P.spb && b <= x.t + x.d - 0.05 / P.spb);
    if (n && n.m2 == null) { const d = m - n.m, f = ((d % 12) + 18) % 12 - 6; (P.acc[st.i + ':' + n.k] ||= []).push(f); }
    return;
  }
}

/* ---------- микрофон ---------- */

async function micOn() {
  if (M) return;
  M = { mic: null, timer: 0, smooth: createPitchSmoother(), samples: [], last: 0 };
  const m0 = M;
  try { m0.mic = await ctx.mic.request(); } catch (err) { if (M === m0) M = null; ctx.ui.toast(ctx.t(err && err.reason === 'denied' ? 'micDenied' : 'micNone')); render(); return; }
  if (M !== m0) { m0.mic.stop(); return; }
  // анализ — не звук: обычный интервал хватает (как в тренажёре слуха); рисование — кадрами
  M.timer = setInterval(() => {
    let buf;
    try { buf = m0.mic.read(); } catch { return; }
    let f = yin(buf, m0.mic.sampleRate, 0.01);
    if (f) f = refinePitch(buf, f, m0.mic.sampleRate);
    if (f && (f < 55 || f > 1600)) f = 0;
    const t = now(), m = f ? 69 + 12 * Math.log2(m0.smooth(f) / 440) : 0;
    if (m) { m0.samples.push({ t, m }); m0.last = t; } else if (m0.samples.length && t - m0.last > 0.15) m0.samples.push({ t, m: 0 });
    while (m0.samples.length && m0.samples[0].t < t - 12) m0.samples.shift();
    if (m) warmSample(t, m);
    if (T && T.on) testSample(t, m);
    if (IM && IM.on) improvSample(t, m);
  }, 50);
  if (!raf) loop();
}
function micOff() {
  if (!M) return;
  clearInterval(M.timer);
  if (M.mic) { try { M.mic.stop(); } catch { /* уже закрыт */ } }
  M = null;
}

/* ---------- рисование ---------- */

let colors = null;
function readColors() {
  const cs = getComputedStyle(host);
  const v = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
  colors = { ink: v('--ink', '#222'), l2: v('--l2', '#888'), l3: v('--l3', '#bbb'), fill: v('--fill', '#eee'), fill2: v('--fill2', '#ddd'), cell: v('--cell', '#fff'),
    tint: v('--tint', '#9C7242'), sep: v('--sep', '#ddd'), on: v('--on-tint', '#fff'), ok: '#3E9A5E', near: '#D09A2A', miss: '#CC5546' };
}
function canvasOf() {
  const cv = root && root.querySelector('canvas');
  if (!cv) return null;
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  if (!r.width || !r.height) return null;
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, r.width, r.height);
  return { g, W: r.width, H: r.height };
}
const busy = () => playing() || !!(M && M.mic) || !!(P && P.ex.free && P.timer) || !!(IM && IM.on);
function loop() {
  cancelAnimationFrame(raf);
  const go = () => {
    if (!host) { raf = 0; return; }
    draw();
    raf = busy() ? requestAnimationFrame(go) : 0;
  };
  raf = requestAnimationFrame(go);
}
// Раздел на экране: без диапазона — «Голос»; в четверти и полоске — только распевки
const secNow = () => (!hasRange() && size !== 'quarter' && size !== 'strip' ? 'voice' : size === 'quarter' || size === 'strip' ? 'warm' : S().sec);
function draw() {
  const sec = secNow();
  if (sec === 'warm') drawWarm();
  else if (sec === 'improv') drawImprov();
  else if (sec === 'voice' && T && T.on) drawTest();
  if (P) updSub();
}

const isBlack = (m) => [1, 3, 6, 8, 10].includes(((Math.round(m) % 12) + 12) % 12);
// Дорожки нот, как в пиано-ролле: тёмные — «чёрные клавиши», подпись C слева на полях; zone(m) — 0 вне, 1 рабочий,
// 2 зона роста (подкрашена), mark(m) — ступени лада (1 — ступень, 2 — тоника)
function lanes(g, W, H, lo, hi, y, { gutter = 30, zone = null, mark = null } = {}) {
  const lh = Math.abs(y(0) - y(1)), all = lh >= 15;
  for (let m = Math.floor(lo); m <= Math.ceil(hi); m++) {
    const y0 = y(m + 0.5), h = lh;
    const z = zone ? zone(m) : 1, mk = mark ? mark(m) : -1;
    // лад: ступени — светлые, вне лада — серые, тоника — подкрашена; без лада — как клавиши (чёрные — темнее)
    g.fillStyle = mk === 0 ? colors.fill : mk >= 1 ? colors.cell : isBlack(m) ? colors.fill : colors.cell;
    if (mk === -1 && isBlack(m)) g.globalAlpha = 0.6;
    g.fillRect(gutter, y0, W - gutter, h);
    g.globalAlpha = 1;
    if (mk === 2) { g.fillStyle = colors.tint; g.globalAlpha = 0.13; g.fillRect(gutter, y0, W - gutter, h); g.globalAlpha = 1; }
    if (z === 2) { g.fillStyle = colors.tint; g.globalAlpha = 0.07; g.fillRect(gutter, y0, W - gutter, h); g.globalAlpha = 1; }
    if (z === 0 && zone) { g.fillStyle = colors.fill; g.globalAlpha = 0.6; g.fillRect(gutter, y0, W - gutter, h); g.globalAlpha = 1; }
    if (m % 12 === 0) { g.strokeStyle = colors.sep; g.lineWidth = 1; g.beginPath(); g.moveTo(gutter, Math.round(y(m - 0.5)) + 0.5); g.lineTo(W, Math.round(y(m - 0.5)) + 0.5); g.stroke(); }
    if (all || m % 12 === 0 || mk === 2) {
      const strong = m % 12 === 0 || mk === 2;
      g.fillStyle = mk === 2 ? colors.tint : strong ? colors.ink : mk === 0 || (mk === -1 && isBlack(m)) ? colors.l3 : colors.l2;
      g.font = (strong ? '700 ' : '500 ') + (all ? 11 : 10) + 'px system-ui,sans-serif'; g.textBaseline = 'middle'; g.fillText(noteName(m), 2, y(m)); g.textBaseline = 'alphabetic';
    }
  }
  // полоска зон у края: рабочий — цветом, рост — светлее
  if (zone) for (let m = Math.floor(lo); m <= Math.ceil(hi); m++) { const z = zone(m); if (!z) continue; g.fillStyle = colors.tint; g.globalAlpha = z === 1 ? 0.9 : 0.35; g.fillRect(gutter - 4, y(m + 0.5), 3, lh); g.globalAlpha = 1; }
}
// Линия голоса; colorOf(m) — цвет пробы (по отклонению) или один цвет
function voiceLine(g, x, y, t0, t1, colorOf) {
  if (!M || !M.samples.length) return null;
  g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
  let prev = null, last = null;
  for (const s of M.samples) {
    if (s.t < t0 || s.t > t1 || !s.m) { prev = null; continue; }
    const X = x(s.t), Y = y(s.m);
    if (prev && Math.abs(s.m - prev.m) < 3) { g.strokeStyle = colorOf ? colorOf(s.m) : colors.ink; g.beginPath(); g.moveTo(prev.X, prev.Y); g.lineTo(X, Y); g.stroke(); }
    prev = { X, Y, m: s.m }; last = s;
  }
  if (last && t1 - last.t < 0.3) { g.fillStyle = colorOf ? colorOf(last.m) : colors.ink; g.beginPath(); g.arc(x(last.t), y(last.m), 5, 0, Math.PI * 2); g.fill(); }
  return last;
}
function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2)); else g.rect(x, y, w, h); g.fill(); }

function drawWarm() {
  const c = canvasOf();
  if (!c || !hasRange()) return;
  const { g, W, H } = c, s = S(), ex = (P && P.ex) || exById(s.ex);
  if (ex.free) return;
  const run = (P && P.run) || runOf(ex, false), spb = P ? P.spb : spbOf(ex);
  if (!run || !run.steps.length) return;
  // окно по высоте следует за текущим шагом (плавно): ноты крупные, а не весь диапазон сразу
  const live = playing(), b0 = live ? (now() - P.t0) / spb : 0, cur0 = run.steps.find((x) => b0 < x.end) || run.steps[0];
  const ms0 = cur0.sing.flatMap((n) => [n.m, n.m2 ?? n.m]), mlo = Math.min(...ms0), mhi = Math.max(...ms0);
  const span = Math.max(12, mhi - mlo + 6), want = (mlo + mhi) / 2;
  cam = cam == null || !live ? want : cam + (want - cam) * 0.07;
  const top = H < 280 ? 30 : 50, bot = 8, gutter = 30, lo = cam - span / 2, hi = cam + span / 2; // низкое окно — заголовок в одну строку
  const y = (m) => top + ((hi - m) / (hi - lo)) * (H - top - bot), lh = (H - top - bot) / (hi - lo);
  const pps = Math.max(70, (W - gutter) / 5.5), tc = live ? now() - P.t0 : -((W - gutter) * 0.1) / pps, xh = gutter + (W - gutter) * 0.26;
  const x = (sec) => xh + (sec - tc) * pps;
  const r = myRange(), tr = exRange(ex);
  lanes(g, W, H, lo, hi, y, { gutter, zone: (m) => (m >= r.lo && m <= r.hi ? 1 : m >= tr.lo && m <= tr.hi ? 2 : 0) });
  const lang = langOf(), bh = Math.max(10, Math.min(30, lh * 0.82));
  g.save(); g.beginPath(); g.rect(gutter, 0, W - gutter, H); g.clip();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  run.steps.forEach((st) => {
    const sx = x(st.t0 * spb), ex2 = x(st.end * spb);
    if (ex2 < gutter - 20 || sx > W + 20) return;
    // начало шага: тональность сверху
    const s0 = x(st.sing[0].t * spb);
    g.fillStyle = colors.l2; g.font = '600 11px system-ui,sans-serif'; g.fillText(MAJ_NAMES[((st.tonic % 12) + 12) % 12], s0 + 10, top - 10);
    st.sing.forEach((n) => {
      const x1 = x(n.t * spb), x2 = x((n.t + n.d) * spb), past = live && (n.t + n.d) * spb < tc, cur = live && n.t * spb <= tc && (n.t + n.d) * spb >= tc;
      const res = past ? noteRes(st.i + ':' + n.k) : null;
      const col = res ? colors[res] : cur ? colors.tint : colors.tint;
      g.globalAlpha = res || cur ? 1 : past ? 0.35 : 0.42;
      g.fillStyle = col; g.strokeStyle = col;
      const w = Math.max(6, x2 - x1 - (P && P.ex.stacc ? 0 : 3));
      if (n.m2 != null) { g.lineWidth = bh * 0.7; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1 + bh / 2, y(n.m)); g.lineTo(x2 - bh / 2, y(n.m2)); g.stroke(); }
      else rr(g, x1 + 1, y(n.m) - bh / 2, w, bh, bh / 2);
      g.globalAlpha = 1;
      const sy = syllable(ex, n.k, lang);
      if (sy) {
        const inside = n.m2 == null && w > sy.length * 8 + 8 && bh >= 14;
        g.font = '700 ' + Math.round(Math.min(15, Math.max(11, bh * 0.55))) + 'px system-ui,sans-serif';
        g.fillStyle = inside ? (res || cur ? colors.on : colors.ink) : cur ? colors.ink : colors.l2;
        g.fillText(sy, inside ? x1 + 1 + w / 2 : (x1 + x2) / 2, inside ? y(n.m) + 0.5 : y(n.m) - bh / 2 - 8);
      }
    });
  });
  g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  if (live) {
    g.globalAlpha = 0.35; g.fillStyle = colors.cell; g.fillRect(gutter, top, xh - gutter, H - top); g.globalAlpha = 1; // спетое — приглушено
    g.strokeStyle = colors.ink; g.globalAlpha = 0.25; g.lineWidth = 2; g.beginPath(); g.moveTo(xh, top - 2); g.lineTo(xh, H - bot); g.stroke(); g.globalAlpha = 1;
    voiceLine(g, (t) => x(t - P.t0), y, P.t0 + tc - (xh - gutter) / pps, P.t0 + tc + 0.2);
  }
  g.restore();
}

// Импровизация: текущий лад — ручной или найденный по спетому
function imScale() {
  const s = S();
  if (s.imScale !== 'auto') return { id: s.imScale, auto: false };
  const best = IM && IM.notes.length ? detectMode(degTimes(), IM_CANDS)[0] : null;
  return { id: best ? best.id : null, auto: true };
}
function degTimes() {
  const s = S(), d = Array(12).fill(0);
  if (IM) IM.notes.forEach((n) => { d[(((Math.round(n.m) - s.imPc) % 12) + 12) % 12] += n.dur; });
  return d;
}
// Ближайшая ступень лада к высоте m (или ближайший полутон, пока лад не ясен) → { m — цель, c — центы, in }
function nearestTone(m, pcs) {
  const s = S();
  if (!pcs) { const n = Math.round(m); return { m: n, c: Math.round((m - n) * 100), in: true }; }
  let best = null;
  for (let k = Math.floor(m) - 2; k <= Math.ceil(m) + 2; k++) {
    if (!pcs.includes((((k - s.imPc) % 12) + 12) % 12)) continue;
    if (!best || Math.abs(m - k) < Math.abs(m - best)) best = k;
  }
  const n = Math.round(m), ins = pcs.includes((((n - s.imPc) % 12) + 12) % 12);
  return { m: best ?? n, c: Math.round((m - (best ?? n)) * 100), in: ins };
}
const devColor = (c, ins) => (!ins ? colors.miss : Math.abs(c) <= 25 ? colors.ok : Math.abs(c) <= 50 ? colors.near : colors.miss);

function drawImprov() {
  const c = canvasOf();
  if (!c || !hasRange()) return;
  const { g, W, H } = c, s = S(), r = myRange(), sc = imScale(), pcs = sc.id ? SCALES[sc.id][0] : null;
  const lo = Math.min(r.lo, r.plo ?? r.lo) - 2, hi = Math.max(r.hi, r.phi ?? r.hi) + 2, top = 40, bot = 8, gutter = 30;
  const y = (m) => top + ((hi - m) / (hi - lo)) * (H - top - bot), lh = (H - top - bot) / (hi - lo);
  lanes(g, W, H, lo, hi, y, { gutter, mark: (m) => { const d = (((m - s.imPc) % 12) + 12) % 12; return d === 0 ? 2 : !pcs ? -1 : pcs.includes(d) ? 1 : 0; } });
  const t1 = now(), span = 9, x = (t) => gutter + (W - gutter) * 0.9 - (t1 - t) * (((W - gutter) * 0.9) / span);
  g.save(); g.beginPath(); g.rect(gutter, 0, W - gutter, H); g.clip();
  // спетые ноты — тонкие полосы на ступени, цвет — точность
  if (IM && IM.notes.length) {
    const bh = Math.max(4, Math.min(10, lh * 0.35));
    IM.notes.forEach((n) => {
      if (n.t1 < t1 - span) return;
      const tn = nearestTone(n.m, pcs);
      g.fillStyle = devColor(tn.c, tn.in); g.globalAlpha = 0.45;
      rr(g, x(n.t0), y(Math.round(n.m)) - bh / 2, Math.max(4, x(n.t1) - x(n.t0)), bh, bh / 2);
      g.globalAlpha = 1;
    });
  }
  const last = voiceLine(g, x, y, t1 - span, t1 + 1, (m) => { const tn = nearestTone(m, pcs); return devColor(tn.c, tn.in); });
  // текущая нота: цель (ближайшая ступень) и зазор до неё — видно, где не дотягивает
  const lbl = root && root.querySelector('#vcnow');
  if (last && t1 - last.t < 0.25) {
    const tn = nearestTone(last.m, pcs), X = x(last.t);
    g.strokeStyle = colors.ink; g.globalAlpha = 0.5; g.lineWidth = 2; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(X - 46, y(tn.m)); g.lineTo(X + 12, y(tn.m)); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    if (Math.abs(tn.c) > 10) { g.strokeStyle = devColor(tn.c, tn.in); g.lineWidth = 3; g.beginPath(); g.moveTo(X + 10, y(last.m)); g.lineTo(X + 10, y(tn.m)); g.stroke(); }
    if (lbl) { lbl.textContent = noteName(tn.m) + (Math.abs(tn.c) > 10 ? ' · ' + (tn.c > 0 ? '+' : '−') + Math.abs(tn.c) + ' ¢ ' + ctx.t(tn.c > 0 ? 'im.high' : 'im.low') : ' ✓'); lbl.style.color = devColor(tn.c, tn.in); }
  } else if (lbl) { lbl.textContent = ''; }
  g.restore();
}

function drawTest() {
  const c = canvasOf();
  if (!c) return;
  const { g, W, H } = c, all = [...T.notes.low, ...T.notes.high, ...T.notes.work], cur = M && M.samples.length ? M.samples[M.samples.length - 1] : null;
  const ms = all.map((n) => n.m).concat(cur && cur.m ? [cur.m] : []);
  const lo = Math.min(43, ...ms) - 2, hi = Math.max(72, ...ms) + 2, y = (m) => 8 + ((hi - m) / (hi - lo)) * (H - 16), gutter = 30;
  lanes(g, W, H, lo, hi, y, { gutter });
  const t1 = now(), span = 8, x = (t) => gutter + (W - gutter) * 0.95 - (t1 - t) * (((W - gutter) * 0.95) / span);
  g.save(); g.beginPath(); g.rect(gutter, 0, W - gutter, H); g.clip();
  g.fillStyle = colors.tint;
  all.forEach((n) => { if (n.t1 > t1 - span) { g.globalAlpha = n.dur >= 0.6 ? 0.9 : 0.4; rr(g, x(n.t0), y(Math.round(n.m)) - 6, Math.max(4, x(n.t1) - x(n.t0)), 12, 6); } });
  g.globalAlpha = 1;
  voiceLine(g, x, y, t1 - span, t1 + 1);
  g.restore();
}

/* ---------- проверка диапазона ---------- */

function testStart() {
  stopPlay(true); improvStop();
  ctx.audio.unlock();
  T = { on: true, phase: 'low', notes: { low: [], high: [], work: [] }, tr: createNoteTracker({ minDur: 0.2 }) };
  micOn();
  render();
  loop();
}
function testSample(t, m) {
  const done = T.tr.push(t, m);
  if (done) T.notes[T.phase].push(done);
  const el = root && root.querySelector('#vcnow');
  if (el) el.textContent = m ? noteName(m) : '–';
  const list = T.notes[T.phase].filter((n) => n.dur >= 0.3).map((n) => Math.round(n.m)), hint = root && root.querySelector('#vcfound');
  if (hint && list.length) hint.textContent = T.phase === 'low' ? ctx.t('test.lowest', { n: noteName(Math.min(...list)) }) : T.phase === 'high' ? ctx.t('test.highest', { n: noteName(Math.max(...list)) }) : ctx.t('test.workNow', { lo: noteName(Math.min(...list)), hi: noteName(Math.max(...list)) });
}
// Итог проверки: физический — края нот, удержанных хоть 0,3 с, в шагах «вниз» и «вверх»; рабочий — по свободному пению
// (без него — середина физического без крайних терций)
function testResult() {
  const f = T.tr.flush();
  if (f) T.notes[T.phase].push(f);
  const lowR = rangeOf([...T.notes.low, ...T.notes.work], { comfort: 0.3, edge: 0.3 }), highR = rangeOf([...T.notes.high, ...T.notes.work], { comfort: 0.3, edge: 0.3 });
  if (!lowR || !highR) return null;
  const plo = Math.min(lowR.xlo, highR.xlo), phi = Math.max(lowR.xhi, highR.xhi);
  if (phi - plo < 7) return null;
  const w = workingOf(T.notes.work);
  let lo = w ? Math.max(plo, w.lo) : plo + 3, hi = w ? Math.min(phi, w.hi) : phi - 3;
  if (hi - lo < 5) { const mid = Math.round((lo + hi) / 2); lo = Math.max(plo, mid - 3); hi = Math.min(phi, lo + 6); }
  return { lo, hi, plo, phi };
}
function testNext() {
  const f = T.tr.flush();
  if (f) T.notes[T.phase].push(f);
  if (T.phase === 'low') {
    if (!T.notes.low.some((n) => n.dur >= 0.3)) { ctx.ui.toast(ctx.t('test.few')); return; }
    T.phase = 'high'; render(); return;
  }
  if (T.phase === 'high') {
    if (!T.notes.high.some((n) => n.dur >= 0.3)) { ctx.ui.toast(ctx.t('test.few')); return; }
    T.phase = 'work'; render(); return;
  }
  const r = testResult();
  if (!r) { ctx.ui.toast(ctx.t('test.few')); return; }
  micOff();
  T = { on: false, res: r };
  render();
}
function saveRange(r, toHist = true) {
  const d = D();
  d.range = { lo: r.lo, hi: r.hi, plo: Math.min(r.plo ?? r.lo, r.lo), phi: Math.max(r.phi ?? r.hi, r.hi), at: Date.now() };
  d.type = voiceType(d.range.lo, d.range.hi).id;
  if (toHist) { d.hist.push({ ...d.range }); if (d.hist.length > 60) d.hist.splice(0, d.hist.length - 60); }
  ctx.saveData();
}
// Края: plo ≤ lo < hi ≤ phi, рабочий — не уже кварты
function setEdge(which, m) {
  const r = { ...myRange() };
  r[which] = Math.max(28, Math.min(96, Math.round(m)));
  if (which === 'lo') { r.lo = Math.min(r.lo, r.hi - 5); r.plo = Math.min(r.plo, r.lo); }
  if (which === 'hi') { r.hi = Math.max(r.hi, r.lo + 5); r.phi = Math.max(r.phi, r.hi); }
  if (which === 'plo') r.plo = Math.min(r.plo, r.lo);
  if (which === 'phi') r.phi = Math.max(r.phi, r.hi);
  saveRange(r, false);
}
// Без проверки: диапазон по типу голоса — рабочий без крайних терций ориентира, физический — ориентир целиком
function rangeByType(id) { const c = typeComfort(id), f = typeRange(id); saveRange({ lo: c.lo, hi: c.hi, plo: f.lo, phi: f.hi }, false); D().type = id; ctx.saveData(); }

/* ---------- импровизация ---------- */

// Свой дрон: тоника и квинта у нижней части рабочего диапазона, держатся, пока идёт импровизация
function droneOn() {
  droneOff();
  const s = S(), sy = syn(), r = myRange();
  if (!sy || !s.imDrone) return;
  let root0 = r.lo - 5; while ((((root0 - s.imPc) % 12) + 12) % 12) root0++;
  if (root0 < 40) root0 += 12;
  const pt = presetOf(s.imSound);
  IM.drone = [root0, root0 + 7].map((m, i) => { const k = 'vcd' + seq++; sy.on(m, k, { bus: 'vocal', patch: pt, vel: i ? 0.26 : 0.34, hold: true }); return k; });
}
function droneOff() {
  const sy = syn();
  if (IM && IM.drone && sy) IM.drone.forEach((k) => sy.off(k));
  if (IM) IM.drone = null;
}
function improvGo() {
  if (IM && IM.on) { improvStop(); render(); return; }
  stopPlay(true);
  if (T && T.on) { micOff(); T = null; }
  ctx.audio.unlock();
  if (ctx.audio.release) ctx.audio.release();
  IM = { on: true, notes: [], tr: createNoteTracker({ minDur: 0.18 }), drone: null };
  droneOn();
  micOn();
  render();
  loop();
}
function improvStop() {
  if (!IM) return;
  droneOff();
  if (IM.on) micOff();
  IM.on = false;
}
function improvSample(t, m) {
  const done = IM.tr.push(t, m);
  if (!done) return;
  IM.notes.push(done);
  if (IM.notes.length > 500) IM.notes.shift();
  updImStats();
}
// Оценки по текущему ладу: доли «точно» и «в ладу», лад (авто — с уверенностью), уход по ступеням
function imStats() {
  const s = S(), sc = imScale();
  if (!IM || !IM.notes.length || !sc.id) return { sc, sm: null };
  const pcs = SCALES[sc.id][0], sm = improvSummary(IM.notes.map((n) => ({ ...n, ...scoreNote(n.m, s.imPc, pcs, 25) })));
  return { sc, sm, pcs };
}
function updImStats() {
  const el = root && root.querySelector('#vcims');
  if (!el) return;
  const { t } = ctx, { sc, sm } = imStats();
  const name = sc.id ? t('sc.' + sc.id) : t('im.listening');
  el.innerHTML = '<b>' + esc(MAJ_NAMES[S().imPc] + ' · ' + name) + (sc.auto ? ' <i>' + esc(t('im.auto')) + '</i>' : '') + '</b>' +
    (sm ? '<span class="ok">' + esc(t('im.exact', { p: Math.round(sm.exact * 100) })) + '</span><span class="sc">' + esc(t('im.inScale', { p: Math.round(sm.inScale * 100) })) + '</span>' : '');
}
// После остановки: где по ступеням уходит (средние центы на ступени, если пели хоть 1,5 с)
function degreeChips() {
  const { sm, pcs } = imStats();
  if (!sm || !pcs) return '';
  const xs = pcs.filter((d) => sm.degs[d] >= 1.5 && Math.abs(sm.cents[d]) >= 8);
  if (!xs.length) return '<div class="vcdeg"><span class="ok">' + esc(ctx.t('im.allGood')) + '</span></div>';
  return '<div class="vcdeg"><span class="l2">' + esc(ctx.t('im.drift')) + '</span>' + xs.map((d) => '<span class="' + (Math.abs(sm.cents[d]) > 25 ? 'bad' : 'mid') + '">' + ROMAN[d] + ' ' + (sm.cents[d] > 0 ? '+' : '−') + Math.abs(sm.cents[d]) + ' ¢</span>').join('') + '</div>';
}

/* ---------- экран ---------- */

const langOf = () => String((ctx.lang && ctx.lang()) || 'ru').slice(0, 2);
const exName = (ex) => ctx.t('ex.' + ex.id);
const minOf = (sec) => Math.max(1, Math.round(sec / 60));
const DOTS = (lv) => '<span class="vclv" aria-label="' + esc(ctx.t('lv.' + lv)) + '">' + [1, 2, 3].map((i) => '<i class="' + (i <= lv ? 'on' : '') + '"></i>').join('') + '</span>';

// Ноты шага: текущая нота подсвечена, слоги — под нотами
function staffHTML() {
  const s = S(), ex = (P && P.ex) || exById(s.ex);
  if (ex.free || size === 'quarter' || size === 'strip' || !hasRange()) return '';
  const run = (P && P.run) || runOf(ex, false);
  if (!run || !run.steps.length) return '';
  let st = run.steps[0], curK = -1;
  if (playing()) {
    const b = (now() - P.t0) / P.spb;
    st = run.steps.find((x) => b < x.end) || st;
    const n = st.sing.find((x) => b >= x.t && b < x.t + x.d);
    curK = n ? n.k : -1;
  }
  const lang = langOf(), D2 = { 0.25: ['s'], 0.5: ['e'], 1: ['q'], 1.5: ['q', 1], 2: ['h'], 3: ['h', 1], 4: ['w'] };
  const items = [];
  const mean = st.sing.reduce((a, n) => a + n.m, 0) / Math.max(1, st.sing.length), clef = mean < 57 ? 'bass' : 'treble';
  st.sing.forEach((n, i) => {
    const cls = n.k === curK ? 'cur' : '';
    const push = (m, ls, d, txt, extra = {}) => { const dd = D2[d] || (d > 4 ? ['w'] : ['q']); items.push({ d: dd[0], dot: !!dd[1], m, n: spellNote(st.tonic, ls, m), t: txt, c: cls, ...extra }); };
    const txt = esc(syllable(ex, n.k, lang));
    const half = Math.min(4, n.d / 2 >= 1 ? n.d / 2 : 1);
    if (n.m2 != null) { push(n.m, n.ls, half, txt, { top: n.m2 > n.m ? '↗' : '↘' }); push(n.m2, n.ls2, half, ''); }
    else push(n.m, n.ls, n.d, txt, ex.stacc ? { art: 'stacc' } : ex.dyn === 'messa' ? { top: '&lt; &gt;' } : {});
    const next = st.sing[i + 1];
    if (next && next.t > n.t + n.d + 0.01) { const r = next.t - n.t - n.d, dd = D2[r] || ['e']; items.push({ rest: true, d: dd[0], dot: !!dd[1] }); }
  });
  return scoreSVG(items, { clef, label: esc(ctx.t('staff')), unit: 17 });
}

function overlayHTML() {
  const s = S(), ex = (P && P.ex) || exById(s.ex), t = ctx.t;
  let sub;
  if (P && P.prog) sub = t('progOf', { name: t('prog.' + P.prog.id), i: P.prog.i + 1, n: PROGRAMS[P.prog.id].length });
  else if (ex.free) sub = t('freeMin', { min: minOf(freeSec(ex)) });
  else { const r = exRange(ex); sub = t('idle', { lo: noteName(r.lo), hi: noteName(r.hi), min: minOf(exSec(ex)) }); }
  return '<div class="vcov"><b>' + DOTS(ex.lv || 1) + esc(exName(ex)) + '</b><span id="vcsub">' + esc(sub) + '</span>' + (!playing() && size !== 'quarter' ? '<span class="how">' + esc(t('how.' + ex.id)) + '</span>' : '') + '</div>';
}
function freeHTML() { return P && P.ex.free ? '<div class="vcfree" id="vcfree"></div>' : ''; }
function updFree() {
  const el = root && root.querySelector('#vcfree');
  if (!el || !P || !P.ex.free) return;
  const ex = P.ex, total = ex.free.reduce((a, x) => a + x[1], 0), el2 = (performance.now() - P.wall) / 1000;
  if (el2 < 0) { el.innerHTML = ''; return; }
  const rep = Math.floor(el2 / total), inRep = el2 - rep * total;
  let acc = 0, ph = ex.free[0];
  for (const x of ex.free) { if (inRep < acc + x[1]) { ph = x; break; } acc += x[1]; }
  const left = Math.max(1, Math.ceil(acc + ph[1] - inRep));
  el.innerHTML = '<b>' + esc(ctx.t('ph.' + ph[0])) + '</b><i>' + left + '</i><span>' + esc(ctx.t('phRep', { n: Math.min(rep + 1, ex.rep || 1), m: ex.rep || 1 })) + '</span>';
}

function barHTML() {
  const { t, ui } = ctx, on = playing() || (P && P.wait), pl = '<button class="bigplay" data-x="play" aria-label="' + esc(t(on ? 'stop' : 'play')) + '">' + (on ? ui.icons.stop : ui.icons.play) + '</button>';
  if (size === 'strip') return pl;
  return '<div class="vcbar">' + ui.icb('data-x="list"', I.list, t('list')) + ui.icb('data-x="prev"', ui.icons.left, t('prev')) + pl +
    ui.icb('data-x="next"', ui.icons.right, t('next')) + ui.icb('data-x="set"', ui.icons.gear, t('settings')) + '</div>';
}
function secsHTML() {
  if (size === 'quarter' || size === 'strip' || !hasRange()) return '';
  return '<div class="vchd">' + ctx.ui.seg('vcsec', [['warm', ctx.t('sec.warm')], ['improv', ctx.t('sec.improv')], ['voice', ctx.t('sec.voice')]], S().sec, ctx.t('name')) + '</div>';
}

function warmHTML() {
  if (!hasRange()) return '<div class="vcneed"><b>' + esc(ctx.t('need.title')) + '</b><span>' + esc(ctx.t('need.small')) + '</span></div>';
  if (size === 'strip') {
    const ex = (P && P.ex) || exById(S().ex);
    return ctx.ui.icb('data-x="prev"', ctx.ui.icons.left, ctx.t('prev')) + '<div class="vcmid"><b>' + esc(exName(ex)) + '</b><span id="vcsub"></span></div>' + barHTML() + ctx.ui.icb('data-x="next"', ctx.ui.icons.right, ctx.t('next'));
  }
  return '<div class="vcstaff" id="vcstaff">' + staffHTML() + '</div><div class="vcsurf" id="vcsurf"><canvas aria-hidden="true"></canvas>' + overlayHTML() + freeHTML() + '</div>' + barHTML();
}

function improvHTML() {
  const { t, ui } = ctx, s = S(), on = !!(IM && IM.on), stopped = IM && !IM.on && IM.notes.length;
  return '<div class="vcsurf solo"><canvas aria-hidden="true"></canvas><div class="vcim" id="vcims"></div><div class="vcnowim" id="vcnow"></div>' +
    (on ? '' : stopped ? '<div class="vcfree bottom">' + degreeChips() + '</div>' : '<div class="vcfree"><span style="max-width:420px">' + esc(t('im.hint')) + '</span></div>') + '</div>' +
    '<div class="vcbar">' + ui.icb('data-x="pcdn"', ui.icons.left, t('tonicPrev')) + '<button class="ic txt" data-x="scale" aria-label="' + esc(t('im.scale')) + '">' + esc(MAJ_NAMES[s.imPc] + ' · ' + t('sc.' + s.imScale)) + '</button>' + ui.icb('data-x="pcup"', ui.icons.right, t('tonicNext')) +
    ui.icb('data-x="drone" aria-pressed="' + s.imDrone + '"', I.drone, t('im.drone'), s.imDrone ? 'act' : '') +
    '<button class="bigplay" data-x="imgo" aria-label="' + esc(t(on ? 'im.stop' : 'im.start')) + '">' + (on ? ui.icons.stop : ui.icons.mic) + '</button></div>';
}

// Полоса диапазона: дорожка с подписями C; физический — светлее, рабочий — цветом; четыре края ведутся пальцем
function rangeBarHTML(r, edit) {
  const a = Math.min(36, r.plo - 3), b = Math.max(84, r.phi + 3), p = (m) => ((m - a) / (b - a)) * 100 + '%', w = (x, y) => ((y - x) / (b - a)) * 100 + '%';
  let ticks = '';
  for (let m = Math.ceil(a / 12) * 12; m <= b; m += 12) ticks += '<span class="tk" style="left:' + p(m) + '">' + noteName(m) + '</span>';
  const hd = (k, m) => '<div class="hd ' + k + (edit && edge === k ? ' sel' : '') + '" data-hd="' + k + '" style="left:' + p(m) + '" role="slider" aria-label="' + esc(ctx.t('edge.' + k)) + '" aria-valuetext="' + noteName(m) + '"></div>';
  const vt = voiceType(r.lo, r.hi).id;
  return '<div class="vcrl" id="vcrl" data-a="' + a + '" data-b="' + b + '"><div class="trk"></div><div class="ext" style="left:' + p(r.plo) + ';width:' + w(r.plo, r.phi) + '"></div>' +
    '<div class="cmf" style="left:' + p(r.lo) + ';width:' + w(r.lo, r.hi) + '"></div>' + (edit ? hd('plo', r.plo) + hd('lo', r.lo) + hd('hi', r.hi) + hd('phi', r.phi) : '') + ticks + '</div>' +
    '<div class="vcrefs" aria-label="' + esc(ctx.t('v.refs')) + '">' + TYPES.map(([id, lo, hi]) => '<div class="vcref' + (vt === id ? ' on' : '') + '"><i style="left:' + p(lo) + ';width:' + w(lo, hi) + '"></i><span style="' + ((hi - a) / (b - a) > 0.72 ? 'right:calc(' + (100 - ((lo - a) / (b - a)) * 100) + '% + 6px)' : 'left:calc(' + p(hi) + ' + 6px)') + '">' + esc(typeName(id)) + '</span></div>').join('') + '</div>';
}
function edgesHTML(r) {
  const { ui, t } = ctx;
  return '<div class="vcedges" role="group" aria-label="' + esc(t('v.adj')) + '">' + ['plo', 'lo', 'hi', 'phi'].map((k) => '<button class="vcedge ' + k + '" data-edge="' + k + '" aria-pressed="' + (edge === k) + '"><span>' + esc(t('edge.' + k)) + '</span><b>' + noteName(r[k]) + '</b></button>').join('') + '</div>' +
    '<div class="vcadj">' + ui.icb('data-adj="-1"', ui.icons.left, t('v.down')) + '<span class="l2">' + esc(t('v.adj')) + '</span>' + ui.icb('data-adj="1"', ui.icons.right, t('v.up')) + '</div>';
}
function rangeText(r) {
  const t = ctx.t;
  return '<div class="vcrt"><div><span class="dot w"></span>' + esc(t('v.work')) + ' <b>' + noteName(r.lo) + '–' + noteName(r.hi) + '</b></div><div><span class="dot p"></span>' + esc(t('v.phys')) + ' <b>' + noteName(r.plo) + '–' + noteName(r.phi) + '</b></div></div>';
}

function voiceHTML() {
  const { t, ui } = ctx, d = D();
  if (T && T.on) {
    const ph = T.phase;
    return '<div class="vcsurf solo"><canvas aria-hidden="true"></canvas></div><div class="vctest"><div class="vcsteps">' + ['low', 'high', 'work'].map((k, i) => '<i class="' + (k === ph ? 'on' : ['low', 'high', 'work'].indexOf(ph) > i ? 'done' : '') + '">' + (i + 1) + '</i>').join('') + '</div>' +
      '<b class="ttl">' + esc(t('test.' + ph + 'T')) + '</b><div class="l2">' + esc(t('test.' + ph)) + '</div><div class="now num" id="vcnow">–</div><div class="l2" id="vcfound"></div>' +
      '<div class="vcbtns"><button class="btn" data-x="tcancel">' + esc(t('test.cancel')) + '</button><button class="btn fill" data-x="tnext">' + esc(t(ph === 'work' ? 'test.done' : 'test.next')) + '</button></div></div>';
  }
  if (T && T.res) {
    const r = T.res, vt = voiceType(r.lo, r.hi);
    return '<div class="vcv"><div class="card"><h3>' + esc(t('v.title')) + '</h3><div class="big typ">' + esc(t('v.type', { type: typeName(vt.id) })) + '</div>' + rangeText(r) +
      rangeBarHTML(r, false) + '<div class="l2">' + esc(t('v.explain')) + '</div><div class="l2">' + esc(t('v.disclaimer')) + '</div><div class="vcbtns"><button class="btn" data-x="tagain">' + esc(t('test.again')) + '</button><button class="btn fill" data-x="tsave">' + esc(t('test.save')) + '</button></div></div></div>';
  }
  if (!hasRange()) {
    return '<div class="vcv"><div class="card first"><h3>' + esc(t('need.title')) + '</h3><div class="l2">' + esc(t('need.text')) + '</div>' +
      '<div class="vcbtns col"><button class="btn fill" data-x="test">' + ui.icons.mic.replace('<svg', '<svg width="20" height="20"') + esc(t('v.check')) + '</button></div>' +
      '<div class="l2">' + esc(t('need.manual')) + '</div><div class="vctypes">' + TYPES.map(([id]) => '<button data-type="' + id + '">' + esc(typeName(id)) + '</button>').join('') + '</div></div></div>';
  }
  const r = myRange(), vt = voiceType(r.lo, r.hi).id;
  return '<div class="vcv"><div class="card"><h3>' + esc(t('v.title')) + '</h3><div class="big typ">' + esc(t('v.type', { type: typeName(vt) })) + '</div>' + rangeText(r) +
    rangeBarHTML(r, true) + edgesHTML(r) + '<div class="l2">' + esc(t('v.explain')) + '</div><div class="l2">' + esc(t('v.disclaimer')) + '</div>' +
    '<div class="vcbtns"><button class="btn fill" data-x="test">' + ui.icons.mic.replace('<svg', '<svg width="20" height="20"') + esc(t('v.recheck')) + '</button></div></div>' +
    (d.hist.length ? '<div class="card"><h3>' + esc(t('v.hist')) + '</h3><div class="vchist">' + d.hist.slice(-8).reverse().map((h) => '<div><span>' + esc(new Date(h.at).toLocaleDateString()) + '</span><span class="num">' + noteName(h.lo) + '–' + noteName(h.hi) + ' <i>(' + noteName(h.plo ?? h.xlo ?? h.lo) + '–' + noteName(h.phi ?? h.xhi ?? h.hi) + ')</i></span><span class="typ">' + esc(typeName(voiceType(h.lo, h.hi).id)) + '</span></div>').join('') + '</div></div>' : '') + '</div>';
}

function render() {
  if (!host) return;
  readColors();
  const sec = secNow();
  const body = sec === 'warm' ? warmHTML() : sec === 'improv' ? improvHTML() : voiceHTML();
  root.className = 'vc ' + size + ' s-' + sec + (sec === 'voice' && T && T.on ? ' test' : '');
  root.innerHTML = (size === 'strip' ? '' : secsHTML()) + body;
  if (sec === 'warm' && size !== 'strip') loadFont();
  requestAnimationFrame(() => { draw(); updFree(); updSub(); if (sec === 'improv') updImStats(); });
  if (busy()) loop();
}
// Строка шага и ноты шага во время прогона — без перерисовки окна (не сбивать жест)
function updSub() {
  if (P && P.ex.free) { updFree(); return; }
  const el = root && root.querySelector('#vcsub');
  if (!el || !playing() || !P.run) return;
  const b = (now() - P.t0) / P.spb, i = Math.max(0, P.run.steps.findIndex((x) => b < x.end)), st = P.run.steps[i];
  if (!st) return;
  const n = st.sing.find((x) => b >= x.t && b < x.t + x.d), k = n ? i * 100 + n.k : -1;
  if (i !== lastStep) {
    lastStep = i;
    el.textContent = (P.prog ? ctx.t('progOf', { name: ctx.t('prog.' + P.prog.id), i: P.prog.i + 1, n: PROGRAMS[P.prog.id].length }) + ' · ' : '') + ctx.t('step', { n: i + 1, m: P.run.steps.length }) + ' · ' + MAJ_NAMES[((st.tonic % 12) + 12) % 12];
  }
  if (k !== lastNote) { lastNote = k; const sf = root.querySelector('#vcstaff'); if (sf) sf.innerHTML = staffHTML(); }
}

/* ---------- шторки ---------- */

function listSheet() {
  const { t, ui } = ctx;
  const body = () => {
    const s = S();
    return ui.snav(t('list')) + '<div class="hdr">' + esc(t('prog.title')) + '</div><div class="vcpr">' + PROGRAM_IDS.map((id) => '<button data-prog="' + id + '"' + (id === 'base' ? ' class="rec"' : '') + '><b>' + esc(t('prog.' + id)) + '</b><span>' + esc(t('progMin', { min: minOf(progSec(id)), n: PROGRAMS[id].length })) + '</span></button>').join('') + '</div>' +
      LEVELS.map((lv) => '<div class="hdr">' + DOTS(lv) + esc(t('lv.' + lv)) + '</div><div class="group">' + EXERCISES.filter((x) => (x.lv || 1) === lv).map((x) => '<button class="cell" data-ex="' + x.id + '" aria-pressed="' + (s.ex === x.id) + '"><span class="grow">' + esc(exName(x)) + ' <span class="vcgr">' + esc(t('g.' + x.g)) + '</span><span class="vcexh">' + esc(t('how.' + x.id)) + '</span></span>' + (s.ex === x.id ? ui.icons.check : '') + '</button>').join('') + '</div>').join('');
  };
  ui.sheet(body, (el, sh) => el.addEventListener('click', (e) => {
    const g = (q) => e.target.closest(q);
    let b;
    if (g('[data-close]')) { sh.close(); return; }
    if ((b = g('[data-ex]'))) { stopPlay(true); S().ex = b.dataset.ex; ctx.store.save(); sh.close(); render(); }
    else if ((b = g('[data-prog]'))) { const id = b.dataset.prog, ex = exById(PROGRAMS[id][0]); S().ex = ex.id; ctx.store.save(); sh.close(); startEx(ex, { id, i: 0 }); }
  }));
}

function setSheet() {
  const { t, ui } = ctx;
  const body = () => {
    const s = S();
    return ui.snav(t('settings')) + (ctx.schedule ? '<div class="group"><button class="cell" data-sched><span class="grow">' + esc(t('set.sched')) + '<span class="vcexh">' + esc(t('ftr.sched')) + '</span></span>' + ui.icons.chev + '</button></div>' : '') +
      '<div class="group"><div class="cellcol"><span>' + esc(t('set.grow')) + '</span><div style="margin-top:8px">' + ui.seg('vcgrow', GROW.map((g) => [g, t('grow.' + g)]), s.grow, t('set.grow')) + '</div></div></div><p class="ftr">' + esc(t('ftr.grow')) + '</p>' +
      '<div class="hdr">' + esc(t('set.sound')) + '</div><div class="group">' + SOUNDS.map((k) => '<button class="cell" data-snd="' + k + '"><span class="grow">' + esc(k ? t('pre.' + k) : t('snd.cur')) + '</span>' + (s.sound === k ? ui.icons.check : '') + '</button>').join('') + '</div>' +
      '<div class="group"><div class="cellcol"><span>' + esc(t('set.guide')) + '</span><div style="margin-top:8px">' + ui.seg('vcguide', [['off', t('guide.off')], ['soft', t('guide.soft')], ['full', t('guide.full')]], s.guide, t('set.guide')) + '</div></div></div><p class="ftr">' + esc(t('ftr.guide')) + '</p>' +
      '<div class="group"><div class="cell"><span class="grow">' + esc(t('set.tempo')) + ' · <b class="num">' + Math.round(s.tempo * 100) + ' %</b></span>' + ui.stepper('vctempo', t('set.tempo')) + '</div>' +
      '<div class="cellcol"><span>' + esc(t('set.step')) + '</span><div style="margin-top:8px">' + ui.seg('vcstep', [[1, t('step.1')], [2, t('step.2')]], s.step, t('set.step')) + '</div></div>' +
      '<div class="cellcol"><span>' + esc(t('set.dir')) + '</span><div style="margin-top:8px">' + ui.seg('vcdir', [['updown', t('dir.updown')], ['up', t('dir.up')]], s.dir, t('set.dir')) + '</div></div></div>' +
      '<div class="group"><div class="cell"><span class="grow">' + esc(t('set.listen')) + '</span>' + ui.sw('vclisten', s.listen, t('set.listen')) + '</div></div><p class="ftr">' + esc(t('tipPhones') + '. ' + t('ftr.listen')) + '</p>';
  };
  ui.sheet(body, (el, sh) => {
    const ch = () => { ctx.store.save(); sh.update(); if (!playing()) render(); };
    el.addEventListener('click', (e) => {
      const g = (q) => e.target.closest(q), s = S();
      let b;
      if (g('[data-close]')) { sh.close(); return; }
      if (g('[data-sched]')) { sh.close(); ctx.schedule(); return; }
      if ((b = g('[data-snd]'))) {
        s.sound = b.dataset.snd; ch();
        const sy = syn();
        if (!playing() && sy && hasRange()) { // проба тембра: аккорд на 0,7 с, отпускание — по звуковым часам
          ctx.audio.unlock();
          const r = runOf(exById(s.ex).p ? exById(s.ex) : exById('ma5'), false), k = 'vcp' + seq++;
          if (r) r.steps[0].lead.ms.forEach((m, j) => { sy.on(m, k + j, { bus: 'vocal', patch: patch(), vel: 0.5 }); after(700, () => sy.off(k + j)); });
        }
      }
      else if ((b = g('[data-seg="vcgrow"] [data-v]'))) { s.grow = b.dataset.v; ch(); }
      else if ((b = g('[data-seg="vcguide"] [data-v]'))) { s.guide = b.dataset.v; ch(); }
      else if ((b = g('[data-seg="vcstep"] [data-v]'))) { s.step = +b.dataset.v; ch(); }
      else if ((b = g('[data-seg="vcdir"] [data-v]'))) { s.dir = b.dataset.v; ch(); }
      else if ((b = g('[data-step="vctempo"]'))) { s.tempo = Math.max(0.6, Math.min(1.4, Math.round((s.tempo + 0.05 * +b.dataset.d) * 100) / 100)); ch(); }
    });
    el.addEventListener('change', (e) => { if (e.target.dataset.sw === 'vclisten') { S().listen = e.target.checked; ctx.store.save(); if (!e.target.checked) micOff(); } });
  });
}

function scaleSheet() {
  const { t, ui } = ctx;
  const body = () => {
    const s = S();
    return ui.snav(t('im.scale')) + '<div class="group">' + IM_SCALES.map((k) => '<button class="cell" data-sc="' + k + '"><span class="grow">' + esc(t('sc.' + k)) + (k === 'auto' ? '<span class="vcexh">' + esc(t('im.autoHint')) + '</span>' : '') + '</span>' + (s.imScale === k ? ui.icons.check : '') + '</button>').join('') + '</div>' +
      '<div class="hdr">' + esc(t('im.droneSound')) + '</div><div class="group">' + DRONE_SOUNDS.map((k) => '<button class="cell" data-dsnd="' + k + '"><span class="grow">' + esc(t('pre.' + k)) + '</span>' + (s.imSound === k ? ui.icons.check : '') + '</button>').join('') + '</div>';
  };
  ui.sheet(body, (el, sh) => el.addEventListener('click', (e) => {
    let b;
    if (e.target.closest('[data-close]')) { sh.close(); return; }
    if ((b = e.target.closest('[data-sc]'))) { S().imScale = b.dataset.sc; ctx.store.save(); sh.close(); render(); }
    else if ((b = e.target.closest('[data-dsnd]'))) { S().imSound = b.dataset.dsnd; ctx.store.save(); sh.update(); if (IM && IM.on) droneOn(); }
  }));
}

/* ---------- действия ---------- */

function stepEx(d) {
  const s = S(), i = EXERCISES.findIndex((x) => x.id === s.ex), ex = EXERCISES[(i + d + EXERCISES.length) % EXERCISES.length];
  const was = playing() && !(P && P.prog);
  stopPlay(true);
  s.ex = ex.id; ctx.store.save();
  if (was) startEx(ex); else render();
}

function onClick(e) {
  const g = (q) => e.target.closest(q);
  let b;
  if ((b = g('[data-seg="vcsec"] [data-v]'))) { const v = b.dataset.v; if (v !== S().sec) { stopPlay(true); quietOthers(); S().sec = v; ctx.store.save(); render(); } return; }
  if ((b = g('[data-type]'))) { rangeByType(b.dataset.type); S().sec = 'voice'; ctx.store.save(); edge = 'hi'; render(); ctx.ui.toast(ctx.t('need.typeSet')); return; }
  if ((b = g('[data-edge]'))) { edge = b.dataset.edge; render(); return; }
  if ((b = g('[data-adj]'))) { const r = myRange(); if (r) { setEdge(edge, r[edge] + +b.dataset.adj); render(); } return; }
  if (!(b = g('[data-x]'))) return;
  const x = b.dataset.x, s = S();
  if (x === 'play') { if (playing() || (P && P.wait)) stopPlay(); else startEx(exById(s.ex)); }
  else if (x === 'list') listSheet();
  else if (x === 'set') setSheet();
  else if (x === 'prev') stepEx(-1);
  else if (x === 'next') stepEx(1);
  else if (x === 'imgo') improvGo();
  else if (x === 'pcup' || x === 'pcdn') { s.imPc = (s.imPc + (x === 'pcup' ? 1 : 11)) % 12; ctx.store.save(); if (IM) { IM.notes = []; if (IM.on) droneOn(); } render(); }
  else if (x === 'scale') scaleSheet();
  else if (x === 'drone') { s.imDrone = !s.imDrone; ctx.store.save(); if (IM && IM.on) { if (s.imDrone) droneOn(); else droneOff(); } render(); }
  else if (x === 'test' || x === 'tagain') testStart();
  else if (x === 'tnext') testNext();
  else if (x === 'tcancel') { micOff(); T = null; render(); }
  else if (x === 'tsave') { saveRange(T.res); T = null; S().sec = 'warm'; ctx.store.save(); render(); ctx.ui.toast(ctx.t('v.saved')); }
}

// Края диапазона — ведением пальца по полосе (жест не прячется за кнопкой)
let drag = null;
function onDown(e) {
  const hd = e.target.closest('[data-hd]');
  if (!hd) return;
  const bar = hd.closest('#vcrl');
  drag = { which: hd.dataset.hd, bar, a: +bar.dataset.a, b: +bar.dataset.b, id: e.pointerId };
  edge = drag.which;
  if (hd.setPointerCapture) hd.setPointerCapture(e.pointerId);
  e.preventDefault();
}
function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const r = drag.bar.getBoundingClientRect(), m = Math.round(drag.a + ((e.clientX - r.left) / r.width) * (drag.b - drag.a)), cur = myRange();
  if (!cur || m === cur[drag.which]) return;
  setEdge(drag.which, m);
  render();
  const nb = root.querySelector('#vcrl [data-hd="' + drag.which + '"]');
  if (nb) { drag.bar = root.querySelector('#vcrl'); if (nb.setPointerCapture) nb.setPointerCapture(e.pointerId); }
}
function onUp() { drag = null; }

export default {
  ...meta,
  icon: ICON,
  i18n: { ru, uz, en, el },
  status(c) {
    const d = c.data(), r = d.range;
    if (!r || !(r.hi > r.lo)) return c.t('need.status');
    return noteName(r.lo) + '–' + noteName(r.hi) + ' · ' + c.t('type.' + voiceType(r.lo, r.hi).id);
  },
  mount(el, c, sz) {
    host = el; ctx = c; size = sz || 'full';
    root = document.createElement('div');
    host.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    const warmNow = () => secNow() === 'warm';
    offSwipe = swipe(root, { left: () => { if (warmNow()) stepEx(1); }, right: () => { if (warmNow()) stepEx(-1); }, ok: (e) => !!e.target.closest('.vcsurf, .vcstaff, .vcmid') });
    render();
  },
  resize(sz) { size = sz; render(); },
  unmount() {
    stopPlay(true);
    improvStop();
    micOff();
    T = null;
    cancelAnimationFrame(raf); raf = 0;
    if (offSwipe) { offSwipe(); offSwipe = null; }
    if (root) root.remove();
    host = null; root = null;
  },
};
