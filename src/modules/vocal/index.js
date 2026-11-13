// Вокал (слово автора 13.11.2026, DECISIONS «Вокал», тема — docs/vocal.md). Три раздела:
// • Распевки — упражнение из библиотеки (exercises.js) разворачивается по диапазону человека (src/music/warmup.js):
//   аккорд перед шагом, тоника под пением, по желанию тихая мелодия; звук — своя шина «vocal» и выбранный тембр.
//   Поверхность — полоса высоты: целевые ноты шага со слогами и линия голоса с микрофона; над ней — ноты шага.
//   Программы («Быстрая», «Полная», «Перед выступлением»…) — упражнения подряд, каждое — не дольше полутора минут.
// • Импровизация — дрон на тонике (общий инструмент «Пэды», звук — его), лад; спетые ноты раскладываются по ступеням:
//   точно / в ладу, но неточно / мимо лада (src/music/voicetype.js: scoreNote).
// • Голос — проверка диапазона (вниз, потом вверх), удобный и крайний диапазон, тип голоса с оговоркой, правка краёв
//   пальцем, дневник проверок. Без проверки — диапазон по выбранному типу.
// Данные человека (диапазон, тип, дневник) — ctx.data() (в копии и синхронизации); настройки устройства — ctx.store.
// Звук — по правилам docs/tech/audio.md: ноты планируются на точное время звуковых часов, таймер — clock.js (every),
// всё отпускается при остановке. Микрофон — только анализ на устройстве (ctx.mic), ничего не пишется.
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';
import './vocal.css';
import meta, { ICON } from './meta.js';
import { EXERCISES, GROUPS, PROGRAMS, PROGRAM_IDS, exById } from './exercises.js';
import { buildRun, runSeconds, syllable, spellNote, noteName } from '../../music/warmup.js';
import { TYPES, voiceType, typeComfort, createNoteTracker, rangeOf, scoreNote, improvSummary } from '../../music/voicetype.js';
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
const IM_SCALES = ['major', 'minor', 'pmaj', 'pmin', 'dorian', 'mixo', 'blues', 'harm'];
const GUIDE_VEL = { off: 0, soft: 0.3, full: 0.62 };
const PROG_MAX_SEC = 90; // упражнение в программе — не дольше (дальше шаг по тону)
const I = {
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1.2" fill="currentColor"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/><circle cx="4" cy="18" r="1.2" fill="currentColor"/></svg>',
  drone: '<svg viewBox="0 0 24 24"><path d="M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0"/></svg>',
};

let host = null, ctx = null, size = 'full', root = null;
let P = null; // идущая распевка
let M = null; // микрофон: { mic, timer, smooth, samples: [{ t, m }] }
let T = null; // проверка диапазона
let IM = null; // импровизация
let raf = 0, seq = 0, tipShown = false, offSwipe = null, cam = null;

const S = () => {
  const s = ctx.store.all();
  if (!['warm', 'improv', 'voice'].includes(s.sec)) s.sec = 'warm';
  if (!exById(s.ex)) s.ex = 'trill5';
  if (!SOUNDS.includes(s.sound)) s.sound = '';
  if (!GUIDE_VEL[s.guide] && s.guide !== 'off') s.guide = 'soft';
  if (!(s.tempo >= 0.6 && s.tempo <= 1.4)) s.tempo = 1;
  if (![1, 2].includes(s.step)) s.step = 1;
  if (!['updown', 'up'].includes(s.dir)) s.dir = 'updown';
  if (!(s.extra >= 0 && s.extra <= 4)) s.extra = 0;
  if (typeof s.listen !== 'boolean') s.listen = true;
  if (!IM_SCALES.includes(s.imScale)) s.imScale = 'major';
  if (!(s.imPc >= 0 && s.imPc < 12)) s.imPc = 0;
  if (typeof s.imDrone !== 'boolean') s.imDrone = true;
  return s;
};
// Данные человека: { range: { lo, hi, xlo, xhi, at } | null, type, hist: [] }
const D = () => {
  const d = ctx.data();
  if (!Array.isArray(d.hist)) d.hist = [];
  if (!TYPES.some((x) => x[0] === d.type)) d.type = null;
  return d;
};
// Рабочий диапазон: проверенный или по типу (по умолчанию — баритон: средний из мужских и низкий из женских ориентиров)
const myRange = () => { const d = D(); return d.range && d.range.hi > d.range.lo ? d.range : typeComfort(d.type || 'bari'); };
const typeName = (id) => ctx.t('type.' + id);
const esc = (s) => ctx.ui.esc(s);

/* ---------- распевка: прогон и звук ---------- */

function exRange(ex) {
  const r = myRange();
  return ex.cool ? { lo: r.lo, hi: r.lo + Math.max(7, Math.round((r.hi - r.lo) * 0.66)) } : r;
}
const bpmOf = (ex) => (ex.bpm || 100) * S().tempo;
const spbOf = (ex) => 60 / bpmOf(ex);
function runOf(ex, inProg) {
  if (ex.free) return null;
  const s = S(), spb = spbOf(ex);
  return buildRun(ex, exRange(ex), { extra: ex.cool ? 0 : s.extra, step: ex.step || s.step, dir: ex.dir || s.dir, maxBeats: inProg ? PROG_MAX_SEC / spb : 0 });
}
const freeSec = (ex) => ex.free.reduce((a, x) => a + x[1], 0) * (ex.rep || 1);
const exSec = (ex, inProg) => (ex.free ? freeSec(ex) : runSeconds(runOf(ex, inProg), bpmOf(ex)));
const progSec = (id) => PROGRAMS[id].reduce((a, x) => a + exSec(exById(x), true) + 2, 0);

const syn = () => ctx.audio.synth;
const patch = () => (S().sound ? presetOf(S().sound) : null);
const now = () => ctx.audio.now();

// Запланировать звук шага на точное время звуковых часов (аккорд перед шагом, тоника под пением, мелодия)
function schedStep(st) {
  const s = S(), ex = P.ex, spb = P.spb, at = (b) => P.t0 + b * spb, pt = patch(), sy = syn();
  if (!sy) return;
  // как в секвенсоре студии: нота — на точное время; отпускание — таймером звуковых часов за 60 мс до конца, с точным
  // временем конца (off с будущим временем сразу забирает голос — длинная тоника оборвалась бы, «Стоп» её бы не снял)
  const on = (m, a, b, vel) => {
    const k = 'vc' + seq++, run = P;
    sy.on(m, k, { bus: 'vocal', patch: pt, vel, at: a });
    run.live.set(k, after(Math.max(0, (b - now()) * 1000 - 60), () => { run.live.delete(k); sy.off(k, false, b); }));
  };
  const lead = st.lead;
  lead.ms.forEach((m, j) => on(m, at(lead.t) + j * 0.012, at(lead.t + lead.d) - 0.03, 0.5));
  const first = st.sing[0], last = st.sing[st.sing.length - 1];
  if (first) st.lead.ms.slice(0, 2).forEach((m) => on(m, at(first.t), at(last.t + last.d), 0.24)); // тоника и бас под пением
  const gv = GUIDE_VEL[s.guide] || 0;
  if (gv) st.sing.forEach((n) => on(n.m, at(n.t), at(n.t + n.d * (ex.stacc ? 0.45 : n.m2 != null ? 0.3 : 0.92)), gv));
}
function releaseAll() {
  const sy = syn();
  if (!P) return;
  P.live.forEach((tm, k) => { cancel(tm); if (sy) sy.off(k, true); });
  P.live.clear();
}

function startEx(ex, prog = null) {
  stopPlay(true);
  ctx.audio.unlock();
  const s = S();
  if (!tipShown && s.listen && !s.tipSeen) { tipShown = true; s.tipSeen = true; ctx.store.save(); ctx.ui.toast(ctx.t('tipPhones')); }
  const t0 = now() + 0.25;
  lastStep = -1;
  P = { ex, prog, run: runOf(ex, !!prog), spb: spbOf(ex), t0, next: 0, live: new Map(), res: {}, acc: {}, wall: performance.now() + 250, timer: 0 };
  P.timer = every(80, tick);
  if (s.listen && !ex.free) micOn();
  render();
  loop();
}
// Тик звуковых часов: досоздать шаги на секунду вперёд, закончить прогон
function tick() {
  if (!P) return;
  const t = now(), ex = P.ex;
  if (ex.free) {
    if ((performance.now() - P.wall) / 1000 >= freeSec(ex)) finish();
    return;
  }
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
    P = { ex, prog: { ...prog, i }, run: runOf(ex, true), spb: spbOf(ex), wait: true, live: new Map(), res: {}, acc: {} };
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
  releaseAll();
  micOff();
  P = null;
  if (!quiet) render();
}
const playing = () => !!(P && !P.wait && P.timer);

// Голос против целевой ноты: медиана отклонения (полутоны, без учёта октавы) по пробам внутри ноты
function noteRes(key) {
  const a = P.acc[key];
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
// Проба высоты во время распевки: к какой ноте шага относится (со слышимой задержкой ~80 мс)
function warmSample(t, m) {
  if (!P || !P.run) return;
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
  try { m0.mic = await ctx.mic.request(); } catch (err) { if (M === m0) M = null; ctx.ui.toast(ctx.t(err && err.reason === 'denied' ? 'micDenied' : 'micNone')); return; }
  if (M !== m0) { m0.mic.stop(); return; }
  // анализ — не звук: обычный интервал хватает (как в тренажёре слуха), рисование — кадрами
  M.timer = setInterval(() => {
    const buf = m0.mic.read();
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
}
function micOff() {
  if (!M) return;
  clearInterval(M.timer);
  if (M.mic) M.mic.stop();
  M = null;
}

/* ---------- рисование ---------- */

let colors = null;
function readColors() {
  const cs = getComputedStyle(host);
  const v = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
  colors = { ink: v('--ink', '#222'), l2: v('--l2', '#888'), l3: v('--l3', '#bbb'), fill: v('--fill', '#eee'), fill2: v('--fill2', '#ddd'), tint: v('--tint', '#9C7242'), sep: v('--sep', '#ddd'), ok: '#3E8E5A', near: '#C79A2E', miss: '#C2564B' };
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
function loop() {
  cancelAnimationFrame(raf);
  const go = () => {
    if (!host) return;
    draw();
    if (playing() || (M && M.mic) || (P && P.ex.free && P.timer)) raf = requestAnimationFrame(go); else raf = 0;
  };
  raf = requestAnimationFrame(go);
}
// Раздел на экране: в четверти и полоске — только распевки
const secNow = () => (size === 'quarter' || size === 'strip' ? 'warm' : S().sec);
function draw() {
  const sec = secNow();
  if (sec === 'warm') drawWarm();
  else if (sec === 'improv') drawImprov();
  else if (sec === 'voice' && T && T.on) drawTest();
  if (P) updSub(); // строка шага и ноты шага — вместе с кадром
}

function semGrid(g, W, H, lo, hi, y, mark) {
  g.lineWidth = 1;
  for (let m = Math.ceil(lo); m <= hi; m++) {
    const yy = Math.round(y(m)) + 0.5, isC = m % 12 === 0;
    g.strokeStyle = mark && mark(m) ? colors.fill2 : colors.fill;
    if (mark && mark(m)) { g.fillStyle = mark(m) === 2 ? colors.fill2 : colors.fill; g.globalAlpha = 0.7; g.fillRect(0, y(m + 0.5), W, y(m - 0.5) - y(m + 0.5)); g.globalAlpha = 1; }
    g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke();
    if (isC || (mark && mark(m) === 2)) { g.fillStyle = colors.l2; g.font = '11px system-ui,sans-serif'; g.fillText(noteName(m), 4, yy - 3); }
  }
}
function voiceLine(g, x, y, t0, t1, col) {
  if (!M || !M.samples.length) return;
  g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col || colors.ink;
  g.beginPath();
  let pen = false, pm = 0;
  for (const s of M.samples) {
    if (s.t < t0 || s.t > t1 || !s.m) { pen = false; continue; }
    const X = x(s.t), Y = y(s.m);
    if (pen && Math.abs(s.m - pm) < 3) g.lineTo(X, Y); else g.moveTo(X, Y);
    pen = true; pm = s.m;
  }
  g.stroke();
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fill(); }

function drawWarm() {
  const c = canvasOf();
  if (!c) return;
  const { g, W, H } = c, s = S(), ex = (P && P.ex) || exById(s.ex);
  if (ex.free) return;
  const run = (P && P.run) || runOf(ex, false), spb = P ? P.spb : spbOf(ex);
  if (!run || !run.steps.length) return;
  // окно по высоте следует за текущим шагом (плавно), а не показывает весь диапазон: ноты крупные
  const live0 = playing(), b0 = live0 ? (now() - P.t0) / spb : 0, cur0 = run.steps.find((x) => b0 < x.end) || run.steps[0];
  const ms0 = cur0.sing.flatMap((n) => [n.m, n.m2 ?? n.m]), mlo = Math.min(...ms0), mhi = Math.max(...ms0);
  const span = Math.max(14, mhi - mlo + 8), want = (mlo + mhi) / 2;
  cam = cam == null || !live0 ? want : cam + (want - cam) * 0.06;
  const lo = cam - span / 2, hi = cam + span / 2, top = 46, bot = 14;
  const y = (m) => top + ((hi - m) / (hi - lo)) * (H - top - bot), pps = Math.max(60, W / 6.5);
  const live = playing(), tc = live ? now() - P.t0 : -((W * 0.12) / pps), xh = W * 0.28;
  const x = (sec) => xh + (sec - tc) * pps;
  semGrid(g, W, H, lo, hi, y);
  const lang = langOf(), bh = Math.max(6, Math.min(16, (H - top - bot) / (hi - lo) * 0.7));
  g.font = '600 12px system-ui,sans-serif'; g.textAlign = 'center';
  run.steps.forEach((st) => {
    const sx = x(st.t0 * spb), ex2 = x(st.end * spb);
    if (ex2 < -20 || sx > W + 20) return;
    st.sing.forEach((n) => {
      const x1 = x(n.t * spb), x2 = x((n.t + n.d) * spb), r = P && P.acc ? noteRes(st.i + ':' + n.k) : null, past = live && (n.t + n.d) * spb < tc;
      const cur = live && n.t * spb <= tc && (n.t + n.d) * spb >= tc;
      const col = r && past ? colors[r] : cur ? colors.tint : colors.l3;
      g.fillStyle = col; g.strokeStyle = col;
      if (n.m2 != null) { g.lineWidth = bh * 0.7; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1 + 3, y(n.m)); g.lineTo(x2 - 3, y(n.m2)); g.stroke(); }
      else rr(g, x1 + 1, y(n.m) - bh / 2, Math.max(4, x2 - x1 - (P && P.ex.stacc ? 0 : 3)), bh, bh / 2);
      const sy = syllable(ex, n.k, lang);
      if (sy && x2 - x1 > 14) { g.fillStyle = cur ? colors.ink : colors.l2; g.fillText(sy, (x1 + x2) / 2, y(n.m) - bh / 2 - 4); }
    });
  });
  g.textAlign = 'start';
  if (live) {
    g.strokeStyle = colors.sep; g.lineWidth = 1.5; g.beginPath(); g.moveTo(xh, top - 6); g.lineTo(xh, H - 4); g.stroke();
    voiceLine(g, (t) => x(t - P.t0), y, P.t0 + tc - xh / pps, P.t0 + tc + 0.2);
  }
}

function drawImprov() {
  const c = canvasOf();
  if (!c) return;
  const { g, W, H } = c, s = S(), r = myRange(), lo = r.lo - 4, hi = r.hi + 4, top = 34, bot = 10;
  const pcs = SCALES[s.imScale][0], y = (m) => top + ((hi - m) / (hi - lo)) * (H - top - bot);
  semGrid(g, W, H, lo, hi, y, (m) => { const d = (((m - s.imPc) % 12) + 12) % 12; return d === 0 ? 2 : pcs.includes(d) ? 1 : 0; });
  const t1 = now(), span = 9, x = (t) => W * 0.92 - (t1 - t) * ((W * 0.92) / span);
  if (IM && IM.notes.length) {
    const bh = Math.max(5, Math.min(14, (H - top - bot) / (hi - lo) * 0.7));
    IM.notes.forEach((n) => {
      if (n.t1 < t1 - span) return;
      g.fillStyle = n.exact ? colors.ok : n.inScale ? colors.near : colors.miss;
      rr(g, x(n.t0), y(n.n) - bh / 2, Math.max(4, x(n.t1) - x(n.t0)), bh, bh / 2);
    });
  }
  voiceLine(g, x, y, t1 - span, t1 + 1);
}

function drawTest() {
  const c = canvasOf();
  if (!c) return;
  const { g, W, H } = c, cur = M && M.samples.filter((x) => x.m);
  const ms = (T.notes.map((n) => n.m)).concat(cur && cur.length ? [cur[cur.length - 1].m] : []);
  const lo = Math.min(40, ...ms) - 2, hi = Math.max(76, ...ms) + 2, y = (m) => 8 + ((hi - m) / (hi - lo)) * (H - 16);
  semGrid(g, W, H, lo, hi, y);
  const t1 = now(), span = 8, x = (t) => W * 0.95 - (t1 - t) * ((W * 0.95) / span);
  g.fillStyle = colors.tint;
  T.notes.forEach((n) => { if (n.t1 > t1 - span) { g.globalAlpha = n.dur >= 1 ? 1 : 0.45; rr(g, x(n.t0), y(n.m) - 5, Math.max(4, x(n.t1) - x(n.t0)), 10, 5); } });
  g.globalAlpha = 1;
  voiceLine(g, x, y, t1 - span, t1 + 1);
}

/* ---------- проверка диапазона и импровизация: пробы ---------- */

function testSample(t, m) {
  const done = T.tr.push(t, m);
  if (done) T.notes.push(done);
  T.cur = m || 0;
  if (!raf) loop();
  const el = root && root.querySelector('#vcnow');
  if (el) el.textContent = m ? noteName(m) : '–';
  const lo = root && root.querySelector('#vclo'), hi = root && root.querySelector('#vchi'), ok = T.notes.filter((n) => n.dur >= 0.25).map((n) => Math.round(n.m));
  if (lo && ok.length) lo.textContent = ctx.t('test.lowest', { n: noteName(Math.min(...ok)) });
  if (hi && ok.length) hi.textContent = ctx.t('test.highest', { n: noteName(Math.max(...ok)) });
}
function improvSample(t, m) {
  const done = IM.tr.push(t, m);
  if (!done) return;
  const s = S(), x = scoreNote(done.m, s.imPc, SCALES[s.imScale][0], 30);
  IM.notes.push({ ...done, ...x });
  if (IM.notes.length > 400) IM.notes.shift();
  const sm = improvSummary(IM.notes), el = root && root.querySelector('#vcims');
  if (el) el.innerHTML = '<span class="ok">' + esc(ctx.t('im.exact', { p: Math.round(sm.exact * 100) })) + '</span><span class="sc">' + esc(ctx.t('im.inScale', { p: Math.round(sm.inScale * 100) })) + '</span>';
}

/* ---------- экран ---------- */

const langOf = () => String((ctx.lang && ctx.lang()) || 'ru').slice(0, 2);
const exName = (ex) => ctx.t('ex.' + ex.id);
const minOf = (sec) => Math.max(1, Math.round(sec / 60));

function staffHTML() {
  const s = S(), ex = (P && P.ex) || exById(s.ex);
  if (ex.free || size === 'quarter' || size === 'strip') return '';
  const run = (P && P.run) || runOf(ex, false);
  if (!run || !run.steps.length) return '';
  let st = run.steps[0];
  if (playing()) { const b = (now() - P.t0) / P.spb; st = run.steps.find((x) => b < x.end) || st; }
  const lang = langOf(), D2 = { 0.25: ['s'], 0.5: ['e'], 1: ['q'], 1.5: ['q', 1], 2: ['h'], 3: ['h', 1], 4: ['w'] };
  const items = [];
  const mean = st.sing.reduce((a, n) => a + n.m, 0) / Math.max(1, st.sing.length), clef = mean < 57 ? 'bass' : 'treble';
  st.sing.forEach((n, i) => {
    const push = (m, ls, d, txt, extra = {}) => {
      const dd = D2[d] || (d > 4 ? ['w'] : ['q']);
      items.push({ d: dd[0], dot: !!dd[1], m, n: spellNote(st.tonic, ls, m), t: txt, ...extra });
    };
    const txt = esc(syllable(ex, n.k, lang));
    if (n.m2 != null) { push(n.m, n.ls, Math.min(4, n.d / 2 >= 1 ? n.d / 2 : 1), txt, { top: n.m2 > n.m ? '↗' : '↘' }); push(n.m2, n.ls2, Math.min(4, n.d / 2 >= 1 ? n.d / 2 : 1), ''); }
    else push(n.m, n.ls, n.d, txt, ex.stacc ? { art: 'stacc' } : ex.dyn === 'messa' ? { top: '&lt; &gt;' } : {});
    const next = st.sing[i + 1];
    if (next && next.t > n.t + n.d + 0.01) { const r = next.t - n.t - n.d, dd = D2[r] || ['e']; items.push({ rest: true, d: dd[0], dot: !!dd[1] }); }
  });
  return scoreSVG(items, { clef, label: esc(ctx.t('staff')), unit: 20 });
}

function overlayHTML() {
  const s = S(), ex = (P && P.ex) || exById(s.ex), t = ctx.t;
  let sub;
  if (P && P.prog) sub = t('progOf', { name: t('prog.' + P.prog.id), i: P.prog.i + 1, n: PROGRAMS[P.prog.id].length });
  else if (ex.free) sub = t('progMin', { min: minOf(freeSec(ex)), n: 1 }).split(' · ')[0];
  else sub = t('idle', { lo: noteName(exRange(ex).lo), hi: noteName(exRange(ex).hi), min: minOf(exSec(ex)) });
  return '<div class="vcov"><b>' + esc(exName(ex)) + '</b><span id="vcsub">' + esc(sub) + '</span>' + (!playing() && size !== 'quarter' ? '<span class="how">' + esc(t('how.' + ex.id)) + '</span>' : '') + '</div>';
}

function freeHTML() {
  const ex = P && P.ex;
  if (!ex || !ex.free) return '';
  return '<div class="vcfree" id="vcfree"></div>';
}
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
  if (size === 'quarter' || size === 'strip') return '';
  const s = S();
  return '<div class="vchd">' + ctx.ui.seg('vcsec', [['warm', ctx.t('sec.warm')], ['improv', ctx.t('sec.improv')], ['voice', ctx.t('sec.voice')]], s.sec, ctx.t('name')) + '</div>';
}

function warmHTML() {
  if (size === 'strip') {
    const ex = (P && P.ex) || exById(S().ex);
    return ctx.ui.icb('data-x="prev"', ctx.ui.icons.left, ctx.t('prev')) + '<div class="vcmid"><b>' + esc(exName(ex)) + '</b><span id="vcsub"></span></div>' + barHTML() + ctx.ui.icb('data-x="next"', ctx.ui.icons.right, ctx.t('next'));
  }
  return '<div class="vcstaff" id="vcstaff">' + staffHTML() + '</div><div class="vcsurf" id="vcsurf"><canvas aria-hidden="true"></canvas>' + overlayHTML() + freeHTML() + '</div>' + barHTML();
}

function improvHTML() {
  const { t, ui } = ctx, s = S(), on = !!(IM && IM.on);
  return '<div class="vcsurf solo"><canvas aria-hidden="true"></canvas><div class="vcim" id="vcims"></div>' + (on ? '' : '<div class="vcfree"><span style="max-width:420px">' + esc(t('im.hint')) + '</span></div>') + '</div>' +
    '<div class="vcbar">' + ui.icb('data-x="pcdn"', ui.icons.left, t('tonicPrev')) + '<button class="ic txt" data-x="scale" aria-label="' + esc(t('im.scale')) + '">' + esc(MAJ_NAMES[s.imPc] + ' · ' + t('sc.' + s.imScale)) + '</button>' + ui.icb('data-x="pcup"', ui.icons.right, t('tonicNext')) +
    ui.icb('data-x="drone" aria-pressed="' + s.imDrone + '"', I.drone, t('im.drone'), s.imDrone ? 'act' : '') +
    '<button class="bigplay" data-x="imgo" aria-label="' + esc(t(on ? 'im.stop' : 'im.start')) + '">' + (on ? ui.icons.stop : ui.icons.mic) + '</button></div>';
}

// Полоса диапазона: дорожка от E2 до C6 (или шире, если голос шире), крайние — светлее, удобный — цветом; края — ведутся
const RL = () => { const d = D(), r = d.range; return { a: Math.min(38, r ? r.xlo - 2 : 99), b: Math.max(86, r ? r.xhi + 2 : 0) }; };
function rangeBarHTML(r) {
  const { a, b } = RL(), p = (m) => ((m - a) / (b - a)) * 100 + '%', w = (x, y) => ((y - x) / (b - a)) * 100 + '%';
  let ticks = '';
  for (let m = Math.ceil(a / 12) * 12; m <= b; m += 12) ticks += '<span class="tk" style="left:' + p(m) + '">' + noteName(m) + '</span>';
  return '<div class="vcrl" id="vcrl" data-a="' + a + '" data-b="' + b + '"><div class="trk"></div>' + (r.xlo != null ? '<div class="ext" style="left:' + p(r.xlo) + ';width:' + w(r.xlo, r.xhi) + '"></div>' : '') +
    '<div class="cmf" style="left:' + p(r.lo) + ';width:' + w(r.lo, r.hi) + '"></div><span class="lab" style="left:' + p(r.lo) + '">' + noteName(r.lo) + '</span><span class="lab" style="left:' + p(r.hi) + '">' + noteName(r.hi) + '</span>' +
    '<div class="hd" data-hd="lo" style="left:' + p(r.lo) + '" role="slider" aria-label="' + esc(ctx.t('v.comfort')) + '" aria-valuetext="' + noteName(r.lo) + '"></div><div class="hd" data-hd="hi" style="left:' + p(r.hi) + '" role="slider" aria-label="' + esc(ctx.t('v.comfort')) + '" aria-valuetext="' + noteName(r.hi) + '"></div>' + ticks + '</div>' +
    '<div class="vcrefs" aria-label="' + esc(ctx.t('v.refs')) + '">' + TYPES.map(([id, lo, hi]) => '<div class="vcref' + (voiceType(r.lo, r.hi).id === id ? ' on' : '') + '"><i style="left:' + p(lo) + ';width:' + w(lo, hi) + '"></i><span style="' + ((hi - a) / (b - a) > 0.72 ? 'right:calc(' + (100 - ((lo - a) / (b - a)) * 100) + '% + 6px)' : 'left:calc(' + p(hi) + ' + 6px)') + '">' + esc(typeName(id)) + '</span></div>').join('') + '</div>';
}

function voiceHTML() {
  const { t, ui } = ctx, d = D();
  if (T && T.on) {
    return '<div class="vcsurf solo"><canvas aria-hidden="true"></canvas></div><div class="vctest"><div class="l2">' + esc(t(T.phase === 'low' ? 'test.low' : 'test.high')) + '</div><div class="now num" id="vcnow">–</div>' +
      '<div class="ext2"><span id="vclo"></span><span id="vchi"></span></div><div class="vcbtns"><button class="btn" data-x="tcancel">' + esc(t('test.cancel')) + '</button><button class="btn fill" data-x="tnext">' + esc(t(T.phase === 'low' ? 'test.next' : 'test.done')) + '</button></div></div>';
  }
  if (T && T.res) {
    const r = T.res, vt = voiceType(r.lo, r.hi);
    return '<div class="vcv"><div class="card"><h3>' + esc(t('v.title')) + '</h3><div class="big typ">' + esc(t('v.type', { type: typeName(vt.id) })) + '</div><div class="l2">' + esc(t('test.result', { lo: noteName(r.lo), hi: noteName(r.hi), xlo: noteName(r.xlo), xhi: noteName(r.xhi) })) + '</div>' +
      rangeBarHTML(r) + '<div class="l2">' + esc(t('v.disclaimer')) + '</div><div class="vcbtns"><button class="btn" data-x="tagain">' + esc(t('test.again')) + '</button><button class="btn fill" data-x="tsave">' + esc(t('test.save')) + '</button></div></div></div>';
  }
  const r = d.range, rr2 = myRange(), vt = r ? voiceType(r.lo, r.hi).id : d.type || 'bari';
  return '<div class="vcv"><div class="card"><h3>' + esc(t('v.title')) + '</h3>' +
    (r ? '<div class="big typ">' + esc(t('v.type', { type: typeName(vt) })) + '</div><div class="l2">' + esc(t('v.comfort')) + ': ' + noteName(r.lo) + '–' + noteName(r.hi) + (r.xlo != null ? ' · ' + esc(t('v.extreme')) + ': ' + noteName(r.xlo) + '–' + noteName(r.xhi) : '') + '</div>'
      : '<div class="l2">' + esc(t('v.none')) + '</div><div class="vctypes">' + TYPES.map(([id]) => '<button data-type="' + id + '" aria-pressed="' + (vt === id) + '">' + esc(typeName(id)) + '</button>').join('') + '</div>') +
    rangeBarHTML(rr2) +
    '<div class="vcadj"><span class="grp">' + ui.icb('data-adj="lo:-1"', ui.icons.left, t('v.loDown'), 'sm') + ui.icb('data-adj="lo:1"', ui.icons.right, t('v.loUp'), 'sm') + '</span><span class="grp">' + ui.icb('data-adj="hi:-1"', ui.icons.left, t('v.hiDown'), 'sm') + ui.icb('data-adj="hi:1"', ui.icons.right, t('v.hiUp'), 'sm') + '</span></div><div class="l2">' + esc(t('v.adj')) + '</div>' +
    '<div class="l2">' + esc(t('v.disclaimer')) + '</div><div class="vcbtns"><button class="btn fill" data-x="test">' + ui.icons.mic.replace('<svg', '<svg width="20" height="20"') + esc(t(r ? 'v.recheck' : 'v.check')) + '</button></div></div>' +
    (d.hist.length ? '<div class="card"><h3>' + esc(t('v.hist')) + '</h3><div class="vchist">' + d.hist.slice(-8).reverse().map((h) => '<div><span>' + esc(new Date(h.at).toLocaleDateString()) + '</span><span class="num">' + noteName(h.lo) + '–' + noteName(h.hi) + '</span><span class="typ">' + esc(typeName(voiceType(h.lo, h.hi).id)) + '</span></div>').join('') + '</div></div>' : '') + '</div>';
}

function render() {
  if (!host) return;
  readColors();
  const sec = secNow();
  const body = sec === 'warm' ? warmHTML() : sec === 'improv' ? improvHTML() : voiceHTML();
  root.className = 'vc ' + size + ' s-' + sec + (sec === 'voice' && T && T.on ? ' test' : '');
  root.innerHTML = (size === 'strip' ? '' : secsHTML()) + body;
  if (sec === 'warm' && size !== 'strip') loadFont();
  requestAnimationFrame(() => { draw(); updFree(); updSub(); });
  if (playing() || (M && M.mic) || (P && P.ex.free && P.timer)) loop();
}
// Строка шага во время прогона — без перерисовки (не сбивать жест)
let lastStep = -1;
function updSub() {
  const el = root && root.querySelector('#vcsub');
  if (P && P.ex.free) updFree();
  if (!el || !playing() || !P.run) return;
  const b = (now() - P.t0) / P.spb, i = Math.max(0, P.run.steps.findIndex((x) => b < x.end)), st = P.run.steps[i];
  if (!st) return;
  if (i !== lastStep) {
    lastStep = i;
    el.textContent = (P.prog ? ctx.t('progOf', { name: ctx.t('prog.' + P.prog.id), i: P.prog.i + 1, n: PROGRAMS[P.prog.id].length }) + ' · ' : '') + ctx.t('step', { n: i + 1, m: P.run.steps.length }) + ' · ' + MAJ_NAMES[((st.tonic % 12) + 12) % 12];
    const sf = root.querySelector('#vcstaff');
    if (sf) sf.innerHTML = staffHTML();
  }
}

/* ---------- шторки ---------- */

function listSheet() {
  const { t, ui } = ctx;
  const body = () => {
    const s = S();
    return ui.snav(t('list')) + '<div class="hdr">' + esc(t('prog.title')) + '</div><div class="vcpr">' + PROGRAM_IDS.map((id) => '<button data-prog="' + id + '"><b>' + esc(t('prog.' + id)) + '</b><span>' + esc(t('progMin', { min: minOf(progSec(id)), n: PROGRAMS[id].length })) + '</span></button>').join('') + '</div>' +
      GROUPS.map((g) => '<div class="hdr">' + esc(t('g.' + g)) + '</div><div class="group">' + EXERCISES.filter((x) => x.g === g).map((x) => '<button class="cell" data-ex="' + x.id + '" aria-pressed="' + (s.ex === x.id) + '"><span class="grow">' + esc(exName(x)) + '<span class="vcexh">' + esc(t('how.' + x.id)) + '</span></span>' + (s.ex === x.id ? ui.icons.check : '') + '</button>').join('') + '</div>').join('');
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
    return ui.snav(t('settings')) + (ctx.schedule ? '<div class="group"><button class="cell" data-sched><span class="grow">' + esc(t('set.sched')) + '<span class="vcexh">' + esc(t('ftr.sched')) + '</span></span>' + ui.icons.chev + '</button></div>' : '') + '<div class="hdr">' + esc(t('set.sound')) + '</div><div class="group">' + SOUNDS.map((k) => '<button class="cell" data-snd="' + k + '"><span class="grow">' + esc(k ? t('pre.' + k) : t('snd.cur')) + '</span>' + (s.sound === k ? ui.icons.check : '') + '</button>').join('') + '</div>' +
      '<div class="group"><div class="cellcol"><span>' + esc(t('set.guide')) + '</span><div style="margin-top:8px">' + ui.seg('vcguide', [['off', t('guide.off')], ['soft', t('guide.soft')], ['full', t('guide.full')]], s.guide, t('set.guide')) + '</div></div></div><p class="ftr">' + esc(t('ftr.guide')) + '</p>' +
      '<div class="group"><div class="cell"><span class="grow">' + esc(t('set.tempo')) + ' · <b class="num">' + Math.round(s.tempo * 100) + ' %</b></span>' + ui.stepper('vctempo', t('set.tempo')) + '</div>' +
      '<div class="cellcol"><span>' + esc(t('set.step')) + '</span><div style="margin-top:8px">' + ui.seg('vcstep', [[1, t('step.1')], [2, t('step.2')]], s.step, t('set.step')) + '</div></div>' +
      '<div class="cellcol"><span>' + esc(t('set.dir')) + '</span><div style="margin-top:8px">' + ui.seg('vcdir', [['updown', t('dir.updown')], ['up', t('dir.up')]], s.dir, t('set.dir')) + '</div></div>' +
      '<div class="cellcol"><span>' + esc(t('set.extra')) + '</span><div style="margin-top:8px">' + ui.seg('vcextra', [0, 1, 2, 3, 4].map((n) => [n, n ? '+' + n : '0']), s.extra, t('set.extra')) + '</div></div></div><p class="ftr">' + esc(t('ftr.extra')) + '</p>' +
      '<div class="group"><div class="cell"><span class="grow">' + esc(t('set.listen')) + '</span>' + ui.sw('vclisten', s.listen, t('set.listen')) + '</div></div><p class="ftr">' + esc(t('tipPhones') + '. ' + t('ftr.listen')) + '</p>';
  };
  ui.sheet(body, (el, sh) => {
    const ch = () => { ctx.store.save(); sh.update(); if (!playing()) render(); };
    el.addEventListener('click', (e) => {
      const g = (q) => e.target.closest(q), s = S();
      let b;
      if (g('[data-close]')) { sh.close(); return; }
      if (g('[data-sched]')) { sh.close(); ctx.schedule(); return; }
      if ((b = g('[data-snd]'))) { s.sound = b.dataset.snd; ch(); const ex = exById(s.ex); if (!playing() && ex.p) { ctx.audio.unlock(); const r = runOf(ex, false); if (r) { const sy = syn(); const k = 'vcp' + seq++; r.steps[0].lead.ms.forEach((m, j) => { sy.on(m, k + j, { bus: 'vocal', patch: patch(), vel: 0.5 }); after(700, () => sy.off(k + j)); }); /* проба тембра: отпускание — по звуковым часам */ } } }
      else if ((b = g('[data-seg="vcguide"] [data-v]'))) { s.guide = b.dataset.v; ch(); }
      else if ((b = g('[data-seg="vcstep"] [data-v]'))) { s.step = +b.dataset.v; ch(); }
      else if ((b = g('[data-seg="vcdir"] [data-v]'))) { s.dir = b.dataset.v; ch(); }
      else if ((b = g('[data-seg="vcextra"] [data-v]'))) { s.extra = +b.dataset.v; ch(); }
      else if ((b = g('[data-step="vctempo"]'))) { s.tempo = Math.max(0.6, Math.min(1.4, Math.round((s.tempo + 0.05 * +b.dataset.d) * 100) / 100)); ch(); }
    });
    el.addEventListener('change', (e) => { if (e.target.dataset.sw === 'vclisten') { S().listen = e.target.checked; ctx.store.save(); if (!e.target.checked) micOff(); } });
  });
}

function scaleSheet() {
  const { t, ui } = ctx;
  ui.sheet(() => ui.snav(t('im.scale')) + '<div class="group">' + IM_SCALES.map((k) => '<button class="cell" data-sc="' + k + '"><span class="grow">' + esc(t('sc.' + k)) + '</span>' + (S().imScale === k ? ui.icons.check : '') + '</button>').join('') + '</div>',
    (el, sh) => el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sc]');
      if (e.target.closest('[data-close]')) { sh.close(); return; }
      if (b) { S().imScale = b.dataset.sc; ctx.store.save(); sh.close(); if (IM) IM.notes = []; render(); }
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

function improvGo() {
  const s = S();
  if (IM && IM.on) { improvStop(); render(); return; }
  ctx.audio.unlock();
  IM = { on: true, notes: [], tr: createNoteTracker({ minDur: 0.18 }), drone: false };
  if (s.imDrone && ctx.audio.drone) { ctx.audio.drone.tonic(s.imPc); IM.drone = true; }
  micOn();
  render();
  loop();
}
function improvStop() {
  if (!IM) return;
  if (IM.drone && ctx.audio.drone) ctx.audio.drone.stop();
  IM.on = false;
  micOff();
}

function testStart() {
  ctx.audio.unlock();
  T = { on: true, phase: 'low', notes: [], tr: createNoteTracker({ minDur: 0.2 }) };
  micOn();
  render();
  loop();
}
function testNext() {
  const f = T.tr.flush();
  if (f) T.notes.push(f);
  if (T.phase === 'low') { T.phase = 'high'; render(); return; }
  const r = rangeOf(T.notes);
  if (!r || r.hi - r.lo < 3) { ctx.ui.toast(ctx.t('test.few')); return; }
  micOff();
  T = { on: false, res: r };
  render();
}
function saveRange(r, toHist = true) {
  const d = D();
  d.range = { lo: r.lo, hi: r.hi, xlo: r.xlo ?? r.lo, xhi: r.xhi ?? r.hi, at: Date.now() };
  if (toHist) { d.hist.push({ ...d.range }); if (d.hist.length > 60) d.hist.splice(0, d.hist.length - 60); }
  ctx.saveData();
}
function adjust(which, dm) {
  const r = { ...myRange() };
  r[which] = Math.max(24, Math.min(100, r[which] + dm));
  if (r.hi - r.lo < 5) return;
  r.xlo = Math.min(r.xlo ?? r.lo, r.lo); r.xhi = Math.max(r.xhi ?? r.hi, r.hi);
  saveRange(r, false);
  render();
}

function onClick(e) {
  const g = (q) => e.target.closest(q);
  let b;
  if ((b = g('[data-seg="vcsec"] [data-v]'))) { const v = b.dataset.v; if (v !== S().sec) { stopPlay(true); improvStop(); if (T && T.on) { micOff(); T = null; } S().sec = v; ctx.store.save(); render(); } return; }
  if ((b = g('[data-type]'))) { D().type = b.dataset.type; ctx.saveData(); render(); return; }
  if ((b = g('[data-adj]'))) { const [k, v] = b.dataset.adj.split(':'); adjust(k, +v); return; }
  if (!(b = g('[data-x]'))) return;
  const x = b.dataset.x, s = S();
  if (x === 'play') { if (playing() || (P && P.wait)) stopPlay(); else startEx(exById(s.ex)); }
  else if (x === 'list') listSheet();
  else if (x === 'set') setSheet();
  else if (x === 'prev') stepEx(-1);
  else if (x === 'next') stepEx(1);
  else if (x === 'imgo') improvGo();
  else if (x === 'pcup' || x === 'pcdn') { s.imPc = (s.imPc + (x === 'pcup' ? 1 : 11)) % 12; ctx.store.save(); if (IM && IM.on && IM.drone) ctx.audio.drone.tonic(s.imPc); if (IM) IM.notes = []; render(); }
  else if (x === 'scale') scaleSheet();
  else if (x === 'drone') { s.imDrone = !s.imDrone; ctx.store.save(); if (IM && IM.on) { if (s.imDrone) { ctx.audio.drone.tonic(s.imPc); IM.drone = true; } else if (IM.drone) { ctx.audio.drone.stop(); IM.drone = false; } } render(); }
  else if (x === 'test') testStart();
  else if (x === 'tnext') testNext();
  else if (x === 'tcancel') { micOff(); T = null; render(); }
  else if (x === 'tagain') testStart();
  else if (x === 'tsave') { saveRange(T.res); T = null; render(); }
}

// Края удобного диапазона — ведением пальца по полосе (DECISIONS: жест не прячется за кнопкой)
let drag = null;
function onDown(e) {
  const hd = e.target.closest('[data-hd]');
  if (!hd) return;
  const bar = hd.closest('#vcrl');
  drag = { which: hd.dataset.hd, bar, a: +bar.dataset.a, b: +bar.dataset.b, id: e.pointerId };
  hd.setPointerCapture && hd.setPointerCapture(e.pointerId);
  e.preventDefault();
}
function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const r = drag.bar.getBoundingClientRect(), m = Math.round(drag.a + ((e.clientX - r.left) / r.width) * (drag.b - drag.a));
  const cur = myRange();
  if (m === cur[drag.which]) return;
  adjust(drag.which, m - cur[drag.which]);
  const nb = root.querySelector('#vcrl [data-hd="' + drag.which + '"]');
  if (nb) { drag.bar = root.querySelector('#vcrl'); nb.setPointerCapture && nb.setPointerCapture(e.pointerId); }
}
function onUp() { drag = null; }

export default {
  ...meta,
  icon: ICON,
  i18n: { ru, uz, en, el },
  status(c) {
    const d = c.data(), r = d.range;
    const vt = r ? voiceType(r.lo, r.hi).id : d.type || 'bari';
    const rg = r || typeComfort(vt);
    return noteName(rg.lo) + '–' + noteName(rg.hi) + ' · ' + c.t('type.' + vt);
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
    offSwipe = swipe(root, { left: () => { if (S().sec === 'warm' || size === 'quarter' || size === 'strip') stepEx(1); }, right: () => { if (S().sec === 'warm' || size === 'quarter' || size === 'strip') stepEx(-1); }, ok: (e) => !!e.target.closest('.vcsurf, .vcstaff, .vcmid') });
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
