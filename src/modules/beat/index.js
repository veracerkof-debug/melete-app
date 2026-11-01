// Тренажёр ритма: пять упражнений — «Повтор» (услышать и повторить), «С листа» (прочитать ноты и сыграть),
// «Диктант» (услышать и собрать из длительностей), «Держи темп» (щелчки пропадают), «Полиритм».
// Удары — касание площадки (несколько пальцев), любая клавиша, MIDI-клавиатура или хлопок в микрофон.
// Логика — src/music/rhythm.js, хлопки — src/audio/claps.js, ноты — нотная строка учебника (score.js).
// Два режима: «Тренажёр» (свои настройки) и «Уроки» (путь — ./course.js, сдача и повторение — src/music/course.js).
import './rhythm.css';
import meta from './meta.js';
import {
  CELLS, LEVELS, METERS, BARS, STRICT, SOUNDS, POLY, GAPS, DRILLS, parseMeter, poolOf, genRhythm, onsets, rhythmBeats, notation, cellNotation,
  sameRhythm, dictPush, dictFull, matchTaps, drift, polyBeats, echoDelay, normalizeData, recordRun, weekOf, weakSpots, normalizeConf,
} from '../../music/rhythm.js';
import { scoreSVG } from '../book/book/score.js';
import { perc } from '../book/book/perc.js';
import { createClaps } from '../../audio/claps.js';
import { after, cancel } from '../../audio/clock.js';
import { swipe } from '../../ui/gestures.js';
import { BEAT_COURSE, lessonConf, lessonN } from './course.js';
import { normalizeProg, findLesson, chapterOf, nextLesson, dueReviews, recordLesson, recordReview, placementPlan, applyPlacement, PASS } from '../../music/course.js';
import { courseHTML, lessonBarHTML, resultHTML, modeSeg } from '../../ui/course.js';
import BRAVURA from '@coderline/alphatab/font/Bravura.woff2?url';

let fontOn = null;
function loadFont() {
  if (fontOn || typeof FontFace === 'undefined') return;
  fontOn = true;
  new FontFace('Melete Bravura', 'url(' + BRAVURA + ')').load().then((f) => document.fonts.add(f)).catch(() => { fontOn = false; });
}

const DICON = {
  echo: '<svg viewBox="0 0 24 24"><path d="M4 12h2l2-5 3 10 2-5h2"/><path d="M18 8.5a5 5 0 0 1 0 7M20.5 6a8.5 8.5 0 0 1 0 12"/></svg>',
  read: '<svg viewBox="0 0 24 24"><path d="M3 15h18"/><ellipse cx="7.5" cy="16" rx="2.2" ry="1.6"/><ellipse cx="15.5" cy="16" rx="2.2" ry="1.6"/><path d="M9.7 16V6h8v10"/></svg>',
  dict: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="5" height="14" rx="1.5"/><rect x="10" y="5" width="5" height="14" rx="1.5"/><path d="M17 12h4M19 10v4"/></svg>',
  pulse: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8" stroke-dasharray="2 2"/><path d="M3 18h18"/></svg>',
  poly: '<svg viewBox="0 0 24 24"><path d="M4 8h16M4 16h16"/><circle cx="4" cy="8" r="1.4"/><circle cx="12" cy="8" r="1.4"/><circle cx="20" cy="8" r="1.4"/><circle cx="4" cy="16" r="1.4"/><circle cx="9.3" cy="16" r="1.4"/><circle cx="14.7" cy="16" r="1.4"/><circle cx="20" cy="16" r="1.4"/></svg>',
};
const DCOLOR = { echo: '#D2693C', read: '#567198', dict: '#866B9D', pulse: '#3E8C8C', poly: '#A75750' };
const I = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.8v14.4c0 .8.9 1.3 1.6.9l11.3-7.2c.6-.4.6-1.4 0-1.8L8.6 3.9C7.9 3.5 7 4 7 4.8z"/></svg>',
  ear: '<svg viewBox="0 0 24 24" class="f"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  stats: '<svg viewBox="0 0 24 24"><path d="M5 20v-6M10 20V9M15 20v-8M20 20V5"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2"/></svg>',
};

const pad2 = (n) => String(n).padStart(2, '0');
const dayKey = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
const DAY = 86400000;
const weekKeys = () => Array.from({ length: 7 }, (_, i) => dayKey(Date.now() - i * DAY));

// Состояние упражнения (не сохраняется)
const R = { r: null, res: null, run: null, dict: [], sess: { c: 0, t: 0 }, src: 'tap', beat: null, flash: 0, calib: null };
let host = null, ctx = null, size = 'full', claps = null, raf = 0, unswipe = null, onKey = null, onDown = null, onClick = null, untempo = null;

// Идущий урок, проверка уровня или повторение: { kind, id, q: [{ lid, rev, ch, conf, score, ans, skip }], i, done }
let L = null;
const EC = () => (L && L.cur) || normalizeConf(ctx.store.all());
const D = () => normalizeData(ctx.data());
const esc = (s) => ctx.ui.esc(s);
const ac = () => { ctx.audio.unlock(); const b = ctx.audio.bus('theory'); return b ? b.context : null; };

/* ---------- время: что человек слышит сейчас ---------- */

// Время звука, которое человек слышал в момент события (ts — performance.now события): щелчок, назначенный на t,
// слышен, когда это время равно t
function heardAt(c, ts) {
  const pt = ts == null ? performance.now() : ts;
  if (c.getOutputTimestamp) {
    const o = c.getOutputTimestamp();
    if (o && o.performanceTime > 0 && o.contextTime > 0) return o.contextTime + (pt - o.performanceTime) / 1000;
  }
  return c.currentTime - (c.outputLatency || c.baseLatency || 0) - (performance.now() - pt) / 1000;
}

/* ---------- звук ---------- */

function runOut(c) {
  const g = c.createGain();
  g.connect(ctx.audio.bus('theory'));
  return g;
}
function hush(run) {
  if (!run || !run.g) return;
  const g = run.g, c = g.context;
  try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setTargetAtTime(0, c.currentTime, 0.01); } catch { /* контекст закрыт */ }
  after(400, () => { try { g.disconnect(); } catch { /* уже */ } });
  run.g = null;
}
const click = (run, t, hi) => perc(run.g.context, run.g, hi ? 'clickHi' : 'click', t, hi ? 0.9 : 0.6);
const hit = (run, t, v = 0.85) => { if (run.sounds) run.sounds.push(t); perc(run.g.context, run.g, EC().sound, t, v); };

/* ---------- упражнение: новый ритм и запуск ---------- */

function fresh() {
  const e = EC();
  R.res = null; R.dict = [];
  if (e.drill === 'pulse' || e.drill === 'poly') { R.r = null; return; }
  R.r = genRhythm({ meter: e.meter, bars: e.bars, level: e.level, custom: e.custom });
}

function stopRun() {
  const run = R.run;
  if (!run) return;
  run.timers.forEach(cancel);
  hush(run);
  R.run = null; R.beat = null;
  if (claps) claps.floor(0);
}

// Запуск: count — тактов отсчёта, затем фазы. kind — упражнение
function start(kind = EC().drill, { listenOnly = false } = {}) {
  const c = ac();
  if (!c) { ctx.ui.toast(ctx.t('noSound')); return; }
  stopRun();
  if (!R.r && (kind !== 'pulse' && kind !== 'poly')) fresh();
  const e = EC(), M = R.r ? parseMeter(R.r.meter) : parseMeter(e.meter);
  const swing = e.swing && !M.compound;
  let spb = 60 / e.bpm, beats = M.beats, accent = (k) => k % beats === 0;
  const run = { kind, g: runOut(c), timers: [], taps: [], exp: [], cells: [], beats: [], phases: [], clicks: [], mic: [], sounds: [], listenOnly };
  const t0 = c.currentTime + 0.25;
  let t = t0;
  const bar = () => beats * spb;
  const clickBars = (from, n, label) => { for (let k = 0; k < n * beats; k++) { const tt = from + k * spb; click(run, tt, accent(k)); run.clicks.push(tt); } run.phases.push({ a: from, b: from + n * bar(), label, beats }); return from + n * bar(); };
  // отсчёт — такт щелчков
  const countEnd = clickBars(t, 1, 'count');
  run.count = run.clicks.slice();
  t = countEnd;
  if (kind === 'poly') {
    const P = polyBeats(e.poly);
    beats = P.b;
    const bars = Math.max(2, e.bars);
    // такт «послушать»: оба голоса, затем bars тактов — только щелчки, человек играет свой голос
    for (let k = 0; k < P.b; k++) { const tt = t + k * spb; click(run, tt, k === 0); run.clicks.push(tt); }
    P.at.forEach((x) => hit(run, t + x * spb, 0.7));
    run.phases.push({ a: t, b: t + bar(), label: 'listen', beats });
    t += bar();
    const a = t;
    for (let n = 0; n < bars; n++) {
      for (let k = 0; k < P.b; k++) { const tt = t + k * spb; click(run, tt, k === 0); run.clicks.push(tt); }
      P.at.forEach((x, i) => { run.exp.push(t + x * spb); run.beats.push(i); });
      t += bar();
    }
    run.phases.push({ a, b: t, label: 'play', beats });
    run.win = [a - spb * 0.5, t];
  } else if (kind === 'pulse') {
    const lead = 2, a = t;
    for (let k = 0; k < (lead + e.gap + 1) * beats; k++) {
      const tt = t + k * spb, n = Math.floor(k / beats);
      if (n < lead || n >= lead + e.gap) { click(run, tt, accent(k)); run.clicks.push(tt); }
      run.exp.push(tt); run.beats.push(k % beats);
      run.silent = run.silent || [];
      run.silent.push(n >= lead && n < lead + e.gap);
    }
    t += (lead + e.gap + 1) * bar();
    run.phases.push({ a, b: a + lead * bar(), label: 'play', beats }, { a: a + lead * bar(), b: a + (lead + e.gap) * bar(), label: 'silent', beats }, { a: a + (lead + e.gap) * bar(), b: t, label: 'play', beats });
    run.win = [a - spb * 0.5, t];
  } else {
    const ons = onsets(R.r, { swing }), len = rhythmBeats(R.r) * spb;
    const playRhythm = (from, clicks) => {
      ons.forEach((o) => hit(run, from + o.b * spb));
      if (clicks) for (let k = 0; k < rhythmBeats(R.r); k++) { const tt = from + k * spb; click(run, tt, accent(k)); run.clicks.push(tt); }
    };
    if (kind === 'echo' || kind === 'dict' || listenOnly) {
      playRhythm(t, true);
      run.phases.push({ a: t, b: t + len, label: 'listen', beats });
      t += len;
    }
    if (kind === 'echo' || (kind === 'read' && !listenOnly)) {
      const a = t;
      if (e.click) for (let k = 0; k < rhythmBeats(R.r); k++) { const tt = a + k * spb; click(run, tt, accent(k)); run.clicks.push(tt); }
      ons.forEach((o) => { run.exp.push(a + o.b * spb); run.cells.push(cellAt(o.cell)); run.beats.push(o.beat); });
      t += len;
      run.phases.push({ a, b: t, label: 'play', beats });
      run.win = [a - spb * 0.5, t + spb * 0.25];
    }
  }
  run.t0 = t0; run.end = t; run.spb = spb;
  R.run = run; R.res = kind === 'dict' ? R.res : null;
  // эхо щелчков отсчёта в микрофоне — задержка «динамик → микрофон» и порог выше эха; после каждого щелчка,
  // чтобы порог поднялся до начала ответа
  run.count.forEach((ct, k) => run.timers.push(after((ct - c.currentTime) * 1000 + 450, () => micEcho(run, k === run.count.length - 1))));
  run.timers.push(after((t - c.currentTime) * 1000 + 350, () => finish(run)));
  render();
  loop();
}
const cellAt = (k) => { let i = 0; for (const bar of R.r.bars) for (const id of bar) { if (i === k) return id; i++; } return null; };

function micEcho(run, last) {
  if (!claps || R.run !== run) return;
  const e = EC(), d = echoDelay(run.count, run.mic.map((x) => x.t));
  if (d != null && last) { run.echo = d; e.lat.micEcho = Math.round(d * 1000); ctx.store.save(); }
  // самый громкий всплеск в окне эха щелчков — порог выше него
  const peaks = run.mic.filter((x) => run.count.some((ct) => x.t >= ct && x.t - ct <= 0.45)).map((x) => x.peak);
  if (peaks.length) claps.floor(Math.max(...peaks) * 2.2);
  if (last && !run.clicks.some((x) => x > run.count[run.count.length - 1] + 0.01)) claps.floor(0); // дальше щелчков нет
}

/* ---------- удары ---------- */

function tap(src, ev) {
  const run = R.run, c = ac();
  if (!c) return;
  const e = EC();
  if (src !== 'mic' && e.tapSound && !claps) perc(c, ctx.audio.bus('theory'), e.sound, c.currentTime, 0.55);
  flash();
  if (R.calib) { R.calib.taps.push(heardAt(c, ev && ev.timeStamp) ); R.src = src; return; }
  if (!run) { if (src !== 'mic' && padIdle()) start(); return; }
  if (!run.win) return;
  R.src = src;
  let t;
  if (src === 'mic') {
    const d = run.echo != null ? run.echo : e.lat.micEcho != null ? e.lat.micEcho / 1000 : ((c.outputLatency || 0) + (c.baseLatency || 0)) * 2 + 0.02;
    // эхо звуков ритма («послушать») и отсчёта — не удар
    if (run.sounds.concat(run.count).some((s) => ev.t - (s + d) > -0.025 && ev.t - (s + d) < 0.045)) return;
    t = ev.t - d;
  } else t = heardAt(c, ev && ev.timeStamp) - (+e.lat[src] || 0) / 1000;
  if (t >= run.win[0] && t <= run.win[1]) run.taps.push(t);
}
const padIdle = () => { const d = EC().drill; return d !== 'dict' && d !== 'home' && !(L && (R.res || L.done)); };

function flash() {
  const p = host && host.querySelector('.rypad');
  if (!p) return;
  p.classList.remove('hit'); void p.offsetWidth; p.classList.add('hit');
}

function finish(run) {
  if (R.run !== run) return;
  const e = EC(), tol = STRICT[e.strict] / 1000;
  if (run.listenOnly || run.kind === 'dict') { stopRun(); render(); return; }
  const res = matchTaps(run.exp, run.taps.slice().sort((a, b) => a - b), run.kind === 'pulse' ? tol * 1.5 : tol);
  res.kind = run.kind;
  if (run.kind === 'pulse') {
    const errs = res.hits.map((h, i) => (run.silent[i] ? h.err : null));
    res.drift = Math.round(drift(errs) * 10) / 10;
    const g = errs.filter((x) => x != null);
    res.gapMean = g.length ? Math.round(g.reduce((s, x) => s + x, 0) / g.length) : 0;
    res.silent = run.silent;
  }
  res.win = run.win; res.spb = run.spb; res.phases = run.phases.filter((p) => p.label !== 'count' && p.label !== 'listen');
  R.res = res;
  R.sess.t++; if (res.pass) R.sess.c++;
  lt(res.score);
  recordRun(D(), { drill: run.kind, res, cells: run.cells.length ? run.cells : null, beats: run.beats, day: dayKey(Date.now()) });
  ctx.saveData();
  stopRun();
  render();
}

/* ---------- диктант ---------- */

function dictAdd(id) {
  if (!R.r || R.res) return;
  const e = EC(), nb = dictPush(R.dict, R.r.meter, id, R.r.bars.length);
  if (!nb) { ctx.ui.toast(ctx.t('dictNoFit')); return; }
  R.dict = nb;
  // ячейка звучит — сразу слышно, что выбрано
  const c = ac(), run = { g: runOut(c) }, spb = 60 / e.bpm;
  onsets({ meter: R.r.meter, bars: [[id]] }).forEach((o) => hit(run, c.currentTime + 0.03 + o.b * spb, 0.6));
  after(CELLS[id].beats * spb * 1000 + 400, () => hush(run));
  render();
}
function dictCheck() {
  if (!R.r || !dictFull(R.dict, R.r.meter, R.r.bars.length)) return;
  const user = { meter: R.r.meter, bars: R.dict };
  const exp = onsets(R.r), got = onsets(user), key = (o) => Math.round(o.b * 12);
  const gs = new Set(got.map(key)), es = new Set(exp.map(key));
  const marks = exp.map((o) => (gs.has(key(o)) ? 'ok' : 'miss'));
  const ok = sameRhythm(R.r, user);
  const hits = exp.map((o, i) => ({ t: o.b, tap: null, err: marks[i] === 'ok' ? 0 : null, g: marks[i] }));
  const extra = got.filter((o) => !es.has(key(o)));
  const res = { kind: 'dict', hits, extra, pass: ok, score: exp.length ? marks.filter((m) => m === 'ok').length / (exp.length + extra.length) : 0, ok: marks.filter((m) => m === 'ok').length, miss: marks.filter((m) => m === 'miss').length, mean: 0, abs: 0, marks, userMarks: got.map((o) => (es.has(key(o)) ? 'ok' : 'off')) };
  R.res = res;
  R.sess.t++; if (ok) R.sess.c++;
  lt(res.score);
  recordRun(D(), { drill: 'dict', res, cells: exp.map((o) => cellAt(o.cell)), day: dayKey(Date.now()) });
  ctx.saveData();
  render();
}

/* ---------- микрофон ---------- */

async function micToggle() {
  const { t, ui } = ctx;
  if (claps) { claps.stop(); claps = null; render(); return; }
  const c = ac();
  try {
    claps = await createClaps({ open: () => ctx.mic.request(), c, onHit: (x) => { if (R.run) R.run.mic.push(x); tap('mic', x); } });
  } catch (err) { ui.toast(t(err.reason === 'denied' ? 'micDenied' : 'micNone')); return; }
  if (!host) { claps.stop(); claps = null; return; }
  ui.toast(t('micHint'));
  render();
}

/* ---------- подстройка задержки ---------- */

function calibSheet() {
  const { t, ui } = ctx;
  let sh = null;
  const body = () => ui.snav(t('cal.title')) + '<p class="ftr" style="margin-top:0">' + t('cal.ftr') + '</p>' +
    '<button class="rypad rycalpad" data-cal aria-label="' + t('padAria') + '"><b class="rybeat num" id="rcalb">' + (R.calib ? '' : '▶') + '</b><span class="rystate" id="rcals">' +
    (R.calib ? t('cal.go') : t('cal.start')) + '</span></button><div class="group" style="margin-top:12px">' +
    ['tap', 'key', 'midi'].map((k) => '<div class="cell"><span class="grow">' + t('src.' + k) + '</span><span class="val num">' + (EC().lat[k] ? (EC().lat[k] > 0 ? '+' : '') + EC().lat[k] + ' ' + t('ms') : '0') + '</span></div>').join('') +
    '</div><div class="group" style="margin-top:12px"><button class="cell danger center" data-calreset>' + t('cal.reset') + '</button></div>';
  const go = () => {
    const c = ac();
    if (!c) return;
    stopRun();
    const g = runOut(c), spb = 60 / 90, t0 = c.currentTime + 0.3, exp = [];
    for (let k = 0; k < 12; k++) { perc(c, g, k % 4 === 0 ? 'clickHi' : 'click', t0 + k * spb, 0.8); if (k >= 4) exp.push(t0 + k * spb); }
    R.calib = { taps: [], exp };
    const b = document.getElementById('rcalb'), s = document.getElementById('rcals');
    if (s) s.textContent = t('cal.go');
    const tick = () => { if (!R.calib) return; const h = heardAt(c); const k = Math.floor((h - t0) / spb); if (b) b.textContent = k >= 0 && k < 12 ? (k < 4 ? String(4 - k) : String((k % 4) + 1)) : ''; requestAnimationFrame(tick); };
    tick();
    after((t0 + 12 * spb - c.currentTime) * 1000 + 400, () => {
      const cal = R.calib; R.calib = null;
      try { g.disconnect(); } catch { /* уже */ }
      if (!cal) return;
      const res = matchTaps(cal.exp, cal.taps.sort((a, x) => a - x), 0.08);
      const errs = res.hits.filter((h) => h.err != null).map((h) => h.err).sort((a, x) => a - x);
      if (errs.length < 5) { ui.toast(t('cal.few')); if (sh) sh.update(); return; }
      const med = errs[Math.floor(errs.length / 2)], src = R.src === 'mic' ? 'tap' : R.src, e = EC();
      e.lat[src] = Math.round((+e.lat[src] || 0) + med);
      ctx.store.save();
      ui.toast(t('cal.done', { src: t('src.' + src), ms: (e.lat[src] > 0 ? '+' : '') + e.lat[src] }));
      if (sh) sh.update();
    });
  };
  ui.sheet(body, (el, s) => {
    sh = s;
    el.addEventListener('pointerdown', (ev) => { if (ev.target.closest('[data-cal]') && R.calib) { ev.preventDefault(); tap('tap', ev); } });
    el.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-cal]') && !R.calib) go();
      if (ev.target.closest('[data-calreset]')) { const e = EC(); e.lat = {}; ctx.store.save(); s.update(); }
    });
  }, { onClose: () => { R.calib = null; } });
}

/* ---------- рисование ---------- */

function score(r, marks, { split = true, label = '' } = {}) {
  const M = parseMeter(r.meter);
  const rows = split && r.bars.length > 2 ? [r.bars.slice(0, 2), r.bars.slice(2)] : [r.bars];
  let hit0 = 0;
  return rows.map((bars, i) => {
    const part = { meter: r.meter, bars };
    const n = onsets(part).length, mk = marks ? marks.slice(hit0, hit0 + n) : null;
    hit0 += n;
    const items = notation(part, mk);
    if (i < rows.length - 1) items[items.length - 1] = { bar: '|' };
    return scoreSVG(items, { clef: 'perc', up: true, time: i === 0 ? [M.num, M.den] : null, label: label || ctx.t('scoreAria') });
  }).join('');
}

// Полоса итога: ожидаемые удары — риски, удары человека — точки по цвету точности
function lineSVG(res) {
  const [a, b] = res.win, W = 1000, x = (t) => ((t - a) / (b - a)) * W;
  let s = '<svg class="ryline" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">';
  (res.phases || []).forEach((p) => { if (p.label === 'silent') s += '<rect class="sil" x="' + x(p.a) + '" y="0" width="' + (x(p.b) - x(p.a)) + '" height="60"/>'; });
  for (let t = res.phases && res.phases[0] ? res.phases[0].a : a; t < b - 1e-6; t += res.spb) s += '<line class="g" x1="' + x(t) + '" x2="' + x(t) + '" y1="44" y2="56"/>';
  res.hits.forEach((h) => {
    s += '<line class="e" x1="' + x(h.t) + '" x2="' + x(h.t) + '" y1="14" y2="46"/>';
    if (h.tap != null) s += '<circle class="' + h.g + '" cx="' + x(h.tap) + '" cy="30" r="7"/>';
    else s += '<circle class="miss" cx="' + x(h.t) + '" cy="30" r="7"/>';
  });
  res.extra.forEach((t) => { s += '<circle class="extra" cx="' + x(t) + '" cy="30" r="6"/>'; });
  return s + '</svg>';
}

function verdict(res) {
  const { t } = ctx;
  if (res.kind === 'dict') return '<b>' + t(res.pass ? 'right' : 'dictWrong') + '</b>';
  const parts = [];
  const n = res.hits.length;
  if (res.pass) parts.push('<b>' + t('right') + '</b>');
  else parts.push('<b>' + t('inTime', { n: res.ok + (res.near || 0), m: n }) + '</b>');
  if (res.miss) parts.push(t('missN', { n: res.miss }));
  if (res.extra.length) parts.push(t('extraN', { n: res.extra.length }));
  if (res.abs) parts.push(t('avgMs', { ms: res.abs }));
  if (Math.abs(res.mean) >= 10) parts.push(t(res.mean < 0 ? 'rush' : 'drag', { ms: Math.abs(res.mean) }));
  let s = parts.join(' · ');
  if (res.kind === 'pulse' && Math.abs(res.drift) >= 1.5) s += '<br>' + t(res.drift < 0 ? 'speedsUp' : 'slowsDown', { ms: Math.abs(res.drift) });
  else if (res.kind === 'pulse' && res.gapMean) s += '<br>' + t('silentMean', { ms: (res.gapMean > 0 ? '+' : '') + res.gapMean });
  // похоже на задержку устройства — все удары сдвинуты в одну сторону
  const e = EC(), src = R.src === 'mic' ? null : R.src;
  if (src && !e.lat[src] && Math.abs(res.mean) >= 35 && res.hits.filter((h) => h.err != null).every((h) => Math.sign(h.err) === Math.sign(res.mean))) s += '<br><button class="link" data-x="calib">' + t('latTip') + '</button>';
  return s;
}

/* ---------- уроки ---------- */

function prog() { const d = D(); return normalizeProg(d.course || (d.course = {})); }
const lname = (id) => ctx.t('ls.' + id), cname = (id) => ctx.t('lch.' + id);
const confOf = (l) => lessonConf(normalizeConf(ctx.store.all()), l);

// Оценка попытки урока (одна на вопрос)
function lt(score) { if (!L || L.done) return; const x = L.q[L.i]; if (x && x.score == null) { x.score = score; x.ans = score >= PASS; } }

function setQ() {
  L.cur = L.q[L.i].conf;
  stopRun(); fresh(); render();
  if (L.cur.drill === 'dict') start('dict');
}
function begin(kind, id, q) { stopRun(); L = { kind, id, q, i: 0, done: null }; setQ(); }

function startLesson(id) {
  const l = findLesson(BEAT_COURSE, id);
  if (!l) return;
  const conf = confOf(l), q = [];
  dueReviews(BEAT_COURSE, prog(), Date.now(), id).slice(0, 1).forEach((r) => q.push({ lid: r.id, rev: true, conf: confOf(r) }));
  for (let k = 0; k < lessonN(l); k++) q.push({ lid: id, conf });
  begin('lesson', id, q);
}
function startReview() {
  const q = dueReviews(BEAT_COURSE, prog(), Date.now()).slice(0, 5).map((r) => ({ lid: r.id, rev: true, conf: confOf(r) }));
  if (q.length) begin('review', null, q);
}
// Проверка уровня: по одной попытке из первого, среднего и последнего урока глав; главы идут по нарастающей — не
// справились с первым уроком главы — дальше не проверяем, ошибка в середине главы — переходим к следующей
function startPlacement() {
  const course = BEAT_COURSE.filter((c) => c.id !== 'poly' && c.id !== 'hold');
  begin('place', null, placementPlan(course, 1).map((x) => ({ lid: x.id, ch: x.ch, first: x.i === 0, conf: confOf(findLesson(BEAT_COURSE, x.id)) })));
}

function advance() {
  if (!L || L.done) return;
  const x = L.q[L.i];
  if (x.score == null) { x.score = 0; x.ans = false; }
  if (L.kind === 'place' && !x.ans) L.q.forEach((y, k) => { if (k > L.i && (y.ch === x.ch || x.first)) y.skip = true; });
  let j = L.i + 1;
  while (j < L.q.length && L.q[j].skip) j++;
  if (j < L.q.length) { L.i = j; setQ(); return; }
  finishL();
}

function finishL() {
  stopRun();
  const p = prog(), now = Date.now(), by = {};
  L.q.forEach((x) => { if (!x.skip) (by[x.lid] = by[x.lid] || []).push(!!x.ans); });
  if (L.kind === 'place') L.done = { placement: { n: applyPlacement(BEAT_COURSE, p, by, now).length } };
  else {
    Object.entries(by).forEach(([id, oks]) => { if (L.kind === 'review' || id !== L.id) recordReview(p, id, oks.every(Boolean), now); });
    const all = L.kind === 'review' ? L.q : L.q.filter((x) => !x.rev);
    const score = all.length ? all.reduce((sum, x) => sum + (x.score || 0), 0) / all.length : 0;
    if (L.kind === 'lesson') recordLesson(p, L.id, score, now);
    L.done = { score };
  }
  ctx.saveData();
  render();
}

function stopLesson() {
  stopRun();
  L = null; R.r = null; R.res = null;
  const e = normalizeConf(ctx.store.all());
  e.drill = 'home'; e.view = 'course';
  ctx.store.save();
  render();
}

function lessonResult() {
  const { t } = ctx, nx = nextLesson(BEAT_COURSE, prog()), ch = L.id ? chapterOf(BEAT_COURSE, L.id) : null;
  return '<div class="rywrap">' + resultHTML({ t, esc, name: L.kind === 'review' ? t('crs.review') : lname(L.id), score: L.done.score ?? 1, next: nx && nx.id, nextName: nx ? lname(nx.id) : '',
    book: ch && ch.book, placement: L.done.placement }) + '</div>';
}

function homeHTML() {
  const { t, ui } = ctx, e = EC(), d = D(), w = weekOf(d, weekKeys()), view = e.view === 'course' ? 'course' : 'free';
  const top = '<div class="ryhtop">' + modeSeg(t, view) + '</div>';
  if (view === 'course') return '<div class="rywrap ryhome">' + top + courseHTML({ course: BEAT_COURSE, p: prog(), t, esc, title: lname, chTitle: cname, now: Date.now() }) + '</div>';
  const lv = e.custom && e.custom.length ? t('lvCustom') : t('lv.' + e.level);
  return '<div class="rywrap ryhome">' + top + '<div class="rydash"><div class="rydtxt"><div class="l2" style="font-size:14px">' + t('week') + '</div><div class="big num">' + w.n + ' <small class="l2">' +
    ctx.tn('exN', w.n) + '</small></div><div class="l2" style="font-size:14px">' + (w.n ? t('weekAcc', { p: Math.round(w.acc * 100), ms: w.abs }) : t('noRuns')) + '</div></div>' +
    '<div class="rydbtns">' + ui.icb('data-x="stats"', I.stats, t('statsBtn'), 'sm') + ui.icb('data-x="set"', ui.icons.gear, t('settings'), 'sm') + '</div></div>' +
    '<button class="ryconf" data-x="set"><span>' + esc(lv) + '</span><span class="num">' + e.meter + '</span><span class="num">♩ = ' + e.bpm + '</span><span>' + t('strict.' + e.strict) + '</span></button>' +
    '<div class="rygrid">' + DRILLS.map((id) => {
      const s = d.drills[id], p = s && s.t ? s.c / s.t : 0;
      return '<button class="rycardd" data-x="drill" data-v="' + id + '" style="--c:' + DCOLOR[id] + '"><span class="ryic">' + DICON[id] + '</span>' +
        (s && s.t ? '<span class="rypct num">' + Math.round(p * 100) + '%</span>' : '') + '<span class="ryn">' + t('d.' + id) + '</span><span class="rys">' + t('ds.' + id) + '</span></button>';
    }).join('') + '</div></div>';
}

function headHTML() {
  const { t, ui } = ctx, e = EC(), d = e.drill;
  if (L) {
    return lessonBarHTML({ t, esc, name: L.kind === 'place' ? t('crs.place') : L.kind === 'review' ? t('crs.review') : lname(L.id), i: L.i, n: L.q.length, review: L.kind === 'lesson' && L.q[L.i].rev }) +
      '<div class="ryhead" style="--c:' + DCOLOR[d] + '"><b class="ryhn">' + t('d.' + d) + '</b><span class="rytempo num">♩ ' + e.bpm + '</span>' +
      (d === 'dict' ? '' : '<button class="ic sm rymic' + (claps ? ' on' : '') + '" data-x="mic" aria-pressed="' + !!claps + '" aria-label="' + t(claps ? 'micOff' : 'micOn') + '" title="' + t(claps ? 'micOff' : 'micOn') + '">' + ui.icons.mic + '</button>') + '</div>';
  }
  return '<div class="ryhead" style="--c:' + DCOLOR[d] + '"><button class="mlback" data-x="drill" data-v="home" aria-label="' + t('backAria') + '">' + t('back') + '</button><b class="ryhn">' + t('d.' + d) +
    '</b><span class="rysc num" aria-label="' + t('sessAria', { c: R.sess.c, t: R.sess.t }) + '"><b>' + R.sess.c + '</b>/' + R.sess.t + '</span>' +
    '<button class="rytempo num" data-x="tempo" data-tempo aria-label="' + t('tempoAria', { n: e.bpm }) + '">♩ ' + e.bpm + '</button>' +
    (d === 'dict' ? '' : '<button class="ic sm rymic' + (claps ? ' on' : '') + '" data-x="mic" aria-pressed="' + !!claps + '" aria-label="' + t(claps ? 'micOff' : 'micOn') + '" title="' + t(claps ? 'micOff' : 'micOn') + '">' + ui.icons.mic + '</button>') +
    ui.icb('data-x="set"', ui.icons.gear, t('settings'), 'sm') + '</div>';
}

function padHTML(stateKey, sub = '') {
  const { t } = ctx;
  return '<button class="rypad" data-pad aria-label="' + t('padAria') + '"><b class="rybeat num" id="rbeat"></b><span class="rystate" id="rstate">' + t(stateKey) + '</span>' +
    (sub ? '<span class="rysub">' + sub + '</span>' : '') + '</button>';
}

function drillHTML() {
  const { t } = ctx, e = EC(), d = e.drill, res = R.res, run = R.run;
  if (!R.r && d !== 'pulse' && d !== 'poly') fresh();
  const next = res ? (L ? '<div class="rybtns one"><button class="btn fill ebtn" data-x="lnext">' + t('next') + '</button></div>'
    : '<div class="rybtns"><button class="btn ebtn" data-x="again">' + t('again') + '</button><button class="btn fill ebtn" data-x="next">' + t('next') + '</button></div>') : '';
  const fb = res ? '<div class="ryfb ' + (res.pass ? 'ok' : 'bad') + '" aria-live="polite">' + verdict(res) + '</div>' : '';
  const inputs = t('inputs' + (claps ? 'Mic' : ''));
  if (d === 'dict') {
    const pool = poolOf(R.r.meter, e.level, e.custom), full = dictFull(R.dict, R.r.meter, R.r.bars.length);
    const user = R.dict.length ? score({ meter: R.r.meter, bars: R.dict }, res ? res.userMarks : null, { label: t('yourAnswer') }) : '<div class="ryempty">' + t('dictEmpty', { n: ctx.tn('barsN', R.r.bars.length) }) + '</div>';
    return '<div class="rywrap ryh">' + headHTML() + '<div class="rycard"><button class="ryplay' + (run ? ' playing' : '') + '" data-x="listen" aria-label="' + t('listen') + '" style="--c:' + DCOLOR.dict + '">' + I.play + '</button>' +
      '<div class="ryscore">' + user + '</div>' + (res && !res.pass ? '<div class="rysol"><small>' + t('solution') + '</small><div class="ryscore">' + score(R.r, res.marks) + '</div></div>' : '') + fb + '</div>' +
      (res ? next : '<div class="rypal">' + pool.map((c) => '<button class="rycell" data-x="cell" data-v="' + c.id + '" aria-label="' + esc(t('cell.' + c.id.replace('c.', 'c_'))) + '">' +
        scoreSVG(cellNotation(c.id), { clef: null, line: true, up: true, unit: 11, label: '' }) + '</button>').join('') + '</div><div class="rybtns"><button class="btn ebtn" data-x="undo"' + (R.dict.length ? '' : ' disabled') + '>' + I.undo + t('undo') +
        '</button><button class="btn fill ebtn" data-x="check"' + (full ? '' : ' disabled') + '>' + t('check') + '</button></div>') + '</div>';
  }
  let top = '';
  if (d === 'read' || d === 'echo') {
    const show = d === 'read' || res;
    top = '<div class="rycard">' + (show ? '<div class="ryscore">' + score(R.r, res ? res.hits.map((h) => h.g) : null) + '</div>' : '<div class="ryhide" aria-hidden="true">' + '♩ ? ♪ ?' + '</div>') + fb +
      (res ? lineSVG(res) : '') + '</div>';
  } else if (d === 'pulse') {
    top = '<div class="rycard"><div class="ryinfo">' + t('pulseInfo', { gap: ctx.tn('barsN', e.gap) }) + '</div>' + fb + (res ? lineSVG(res) : '') + '</div>';
  } else if (d === 'poly') {
    const P = polyBeats(e.poly);
    top = '<div class="rycard"><div class="rypoly"><div><b class="num">' + P.a + '</b><span>' + t('polyYou') + '</span></div><div class="rypx">:</div><div><b class="num">' + P.b + '</b><span>' + t('polyClick') + '</span></div></div>' +
      polyGrid(P) + fb + (res ? lineSVG(res) : '') + '</div>';
  }
  const state = run ? 'count' : res ? 'tapAgain' : 'tapStart';
  return '<div class="rywrap ryh">' + headHTML() + top + padHTML(state, run ? '' : inputs) + next +
    (d === 'read' && !run && !res ? '<button class="link rylisten" data-x="listen">' + I.ear + t('listenFirst') + '</button>' : '') + '</div>';
}

function polyGrid(P) {
  const W = 300;
  const row = (n, y, cls) => Array.from({ length: n }, (_, i) => '<circle class="' + cls + '" cx="' + (12 + (i * (W - 24)) / n) + '" cy="' + y + '" r="7"/>').join('') + '<line x1="12" x2="' + (W - 12) + '" y1="' + y + '" y2="' + y + '"/>';
  return '<svg class="rypgrid" viewBox="0 0 300 64" aria-hidden="true">' + row(P.a, 16, 'you') + row(P.b, 48, 'clk') + '</svg>';
}

function render() {
  if (!host) return;
  loadFont();
  const e = EC();
  host.innerHTML = L && L.done ? lessonResult() : e.drill === 'home' ? homeHTML() : drillHTML();
}

// Показ доли и фазы, пока идёт упражнение
function loop() {
  cancelAnimationFrame(raf);
  const run = R.run;
  if (!run || !host) return;
  const c = run.g ? run.g.context : null;
  if (!c) return;
  const h = heardAt(c), b = host.querySelector('#rbeat'), s = host.querySelector('#rstate'), pad = host.querySelector('.rypad');
  const ph = run.phases.find((p) => h >= p.a && h < p.b);
  if (ph && b) {
    const k = Math.floor((h - ph.a) / run.spb + 1e-6), n = ph.beats;
    b.textContent = ph.label === 'count' ? String(n - (k % n)) : String((k % n) + 1);
    if (s) s.textContent = ctx.t('ph.' + (ph.label === 'play' && run.kind === 'echo' ? 'repeat' : ph.label));
    if (pad) pad.dataset.ph = ph.label;
  }
  raf = requestAnimationFrame(loop);
}

/* ---------- шторки ---------- */

function settingsSheet() {
  const { t, ui } = ctx, e = EC();
  const seg = (attr, list, cur, lab) => '<div class="seg" role="group" aria-label="' + lab + '">' + list.map(([k, n]) => '<button data-' + attr + '="' + k + '" aria-pressed="' + (String(cur) === String(k)) + '">' + n + '</button>').join('') + '</div>';
  const body = () => {
    const M = parseMeter(e.meter), custom = e.custom && e.custom.length;
    const all = Object.values(CELLS).filter((c) => c.compound === M.compound), on = new Set(custom ? e.custom : poolOf(M, e.level).map((c) => c.id));
    return ui.snav(t('set.title')) +
      '<div class="hdr" style="margin-top:4px">' + t('set.level') + '</div><div class="group"><div class="cellcol">' + seg('lv', LEVELS.map((k) => [k, k]), custom ? 0 : e.level, t('set.level')) +
      '<div class="segcap">' + (custom ? t('lvCustom') : t('lv.' + e.level) + ' — ' + t('lvs.' + e.level)) + '</div></div></div>' +
      '<div class="hdr">' + t('set.cells') + '</div><div class="group"><div class="cellcol"><div class="rypick">' + all.map((c) => '<button type="button" class="rycell sm' + (on.has(c.id) ? ' on' : '') + '" data-it="' + c.id + '" aria-pressed="' + on.has(c.id) + '" aria-label="' + esc(t('cell.' + c.id.replace('c.', 'c_'))) + '">' +
        scoreSVG(cellNotation(c.id), { clef: null, line: true, up: true, unit: 11, label: '' }) + '</button>').join('') + '</div></div></div><p class="ftr">' + t('ftr.cells') + '</p>' +
      '<div class="hdr">' + t('set.meter') + '</div><div class="group"><div class="cellcol">' + seg('mt', METERS.slice(0, 4).map((k) => [k, k]), e.meter, t('set.meter')) + '</div><div class="cellcol">' + seg('mt', METERS.slice(4).map((k) => [k, k]), e.meter, t('set.meter')) +
      '</div><div class="cellcol">' + seg('bars', BARS.map((k) => [k, ctx.tn('barsN', k)]), e.bars, t('set.bars')) + '</div></div>' +
      '<div class="hdr">' + t('set.tempo') + '</div><div class="group"><div class="cell"><span class="grow num" style="font-size:22px">♩ = ' + e.bpm + '</span>' + ui.stepper('bpm', t('set.tempo')) + '</div><div class="cellcol">' +
        seg('bpmq', [60, 80, 100, 120, 140].map((k) => [k, k]), e.bpm, t('set.tempo')) + '</div></div><p class="ftr">' + t('ftr.tempo') + '</p>' +
      '<div class="hdr">' + t('set.strict') + '</div><div class="group"><div class="cellcol">' + seg('st', Object.keys(STRICT).map((k) => [k, t('strict.' + k) + ' ±' + STRICT[k]]), e.strict, t('set.strict')) + '</div></div>' +
      '<div class="group" style="margin-top:12px"><div class="cell"><span class="grow">' + t('set.click') + '</span>' + ui.sw('click', e.click, t('set.click')) + '</div>' +
        (!M.compound ? '<div class="cell"><span class="grow">' + t('set.swing') + '</span>' + ui.sw('swing', e.swing, t('set.swing')) + '</div>' : '') +
        '<div class="cell"><span class="grow">' + t('set.tapSound') + '</span>' + ui.sw('tapSound', e.tapSound, t('set.tapSound')) + '</div></div><p class="ftr">' + t('ftr.click') + '</p>' +
      '<div class="hdr">' + t('set.sound') + '</div><div class="group"><div class="cellcol">' + seg('snd', SOUNDS.map((k) => [k, t('snd.' + k)]), e.sound, t('set.sound')) + '</div></div>' +
      '<div class="hdr">' + t('d.pulse') + '</div><div class="group"><div class="cellcol">' + seg('gap', GAPS.map((k) => [k, k]), e.gap, t('set.gap')) + '<div class="segcap">' + t('set.gap') + '</div></div></div>' +
      '<div class="hdr">' + t('d.poly') + '</div><div class="group"><div class="cellcol">' + seg('poly', POLY.map((k) => [k, k]), e.poly, t('d.poly')) + '</div></div>' +
      '<div class="group" style="margin-top:12px"><button class="cell" data-cal><span class="grow">' + t('cal.title') + '</span>' + ui.icons.chev + '</button></div><p class="ftr">' + t('ftr.cal') + '</p>';
  };
  ui.sheet(body, (el, sh) => {
    const re = () => { ctx.store.save(); sh.update(); stopRun(); fresh(); render(); };
    el.addEventListener('click', (ev) => {
      const g = (s) => ev.target.closest(s);
      let b;
      if ((b = g('[data-lv]'))) { e.level = +b.dataset.lv; e.custom = null; }
      else if ((b = g('[data-it]'))) {
        const M = parseMeter(e.meter), cur = new Set(e.custom && e.custom.length ? e.custom : poolOf(M, e.level).map((c) => c.id));
        if (cur.has(b.dataset.it)) cur.delete(b.dataset.it); else cur.add(b.dataset.it);
        if (![...cur].some((id) => CELLS[id] && !CELLS[id].rest)) { ctx.ui.toast(t('needHit')); return; }
        e.custom = [...cur];
      }
      else if ((b = g('[data-mt]'))) { const was = parseMeter(e.meter).compound; e.meter = b.dataset.mt; if (was !== parseMeter(e.meter).compound) e.custom = null; }
      else if ((b = g('[data-bars]'))) e.bars = +b.dataset.bars;
      else if ((b = g('[data-step="bpm"]'))) e.bpm = Math.max(40, Math.min(200, e.bpm + +b.dataset.d));
      else if ((b = g('[data-bpmq]'))) e.bpm = +b.dataset.bpmq;
      else if ((b = g('[data-st]'))) e.strict = b.dataset.st;
      else if ((b = g('[data-snd]'))) e.sound = b.dataset.snd;
      else if ((b = g('[data-gap]'))) e.gap = +b.dataset.gap;
      else if ((b = g('[data-poly]'))) e.poly = b.dataset.poly;
      else if (g('[data-cal]')) { calibSheet(); return; }
      else return;
      re();
    });
    el.addEventListener('change', (ev) => {
      const k = ev.target.dataset.sw;
      if (!['click', 'swing', 'tapSound'].includes(k)) return;
      e[k] = ev.target.checked;
      re();
    });
  });
}

function statsSheet() {
  const { t, ui } = ctx, d = D(), w = weekOf(d, weekKeys()), weak = weakSpots(d);
  ui.sheet(() => ui.snav(t('st.title')) +
    '<div class="tiles num"><div class="tile"><b>' + w.n + '</b><span>' + t('st.week') + '</span></div><div class="tile"><b>' + (w.n ? Math.round(w.acc * 100) + '%' : '—') + '</b><span>' + t('st.acc') +
    '</span></div><div class="tile"><b>' + (w.abs ? '±' + w.abs : '—') + '</b><span>' + t('st.ms') + '</span></div></div>' +
    (() => { const ws = [3, 2, 1, 0].map((k) => weekOf(d, Array.from({ length: 7 }, (_, i) => dayKey(Date.now() - (k * 7 + i) * DAY)))); return ws.some((x) => x.n) ?
      '<div class="card"><div class="ch"><span>' + t('st.weeks') + '</span><span></span></div><div class="rywk">' + ws.map((x, i) => '<div><b class="num">' + (x.n ? Math.round(x.acc * 100) + '%' : '—') + '</b><span>' +
        t(i === 3 ? 'st.thisWeek' : 'st.weeksAgo', { n: 3 - i }) + '</span></div>').join('') + '</div></div>' : ''; })() +
    '<div class="card"><div class="ch"><span>' + t('st.drills') + '</span><span></span></div>' + DRILLS.map((id) => {
      const s = d.drills[id]; if (!s || !s.t) return '';
      const p = Math.round((s.c / s.t) * 100);
      return '<div class="hrow"><span class="n">' + t('d.' + id) + '</span><span class="hb"><i style="width:' + p + '%;background:' + (p >= 80 ? '#34C759' : p >= 50 ? 'var(--tint)' : '#FF3B30') + '"></i></span><span class="num l2" style="font-size:13px">' + p + '% · ' + s.t + '</span></div>';
    }).join('') + '</div>' +
    (weak.cells.length || weak.beats.length ? '<div class="card"><div class="ch"><span>' + t('st.weak') + '</span><span></span></div>' +
      weak.cells.map((x) => '<div class="hrow"><span class="n ryweak">' + (CELLS[x.id] ? scoreSVG(cellNotation(x.id), { clef: null, line: true, up: true, unit: 11, label: '' }) : '') + '</span><span class="hb"><i style="width:' + Math.round(x.p * 100) + '%;background:#FF3B30"></i></span><span class="num l2" style="font-size:13px">' + Math.round(x.p * 100) + '%</span></div>').join('') +
      weak.beats.map((x) => '<div class="hrow"><span class="n">' + t('st.beat', { n: x.beat + 1 }) + '</span><span class="l2" style="font-size:14px">' + t(x.ms < 0 ? 'rush' : 'drag', { ms: Math.abs(x.ms) }) + '</span></div>').join('') + '</div>' : '') +
    '<p class="ftr">' + t('st.ftr') + '</p>');
}

// Темп жестом: провести по кнопке темпа влево/вправо (шаг — 1 удар в минуту на 6 px)
function tempoDrag(el) {
  let x0 = null, b0 = 0, moved = false;
  const down = (ev) => { const b = ev.target.closest('[data-tempo]'); if (!b) return; x0 = ev.clientX; b0 = EC().bpm; moved = false; };
  const move = (ev) => {
    if (x0 == null) return;
    const d = Math.round((ev.clientX - x0) / 6);
    if (!moved && Math.abs(ev.clientX - x0) < 8) return;
    moved = true;
    const e = EC(), v = Math.max(40, Math.min(200, b0 + d));
    if (v !== e.bpm) { e.bpm = v; const b = host.querySelector('[data-tempo]'); if (b) b.textContent = '♩ ' + v; }
  };
  const up = () => { if (x0 == null) return; x0 = null; if (moved) { ctx.store.save(); R.dragged = Date.now(); } };
  el.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
}

function tempoSheet() {
  const { t, ui } = ctx, e = EC();
  ui.sheet(() => ui.snav(t('set.tempo')) + '<div style="text-align:center;font-size:56px;font-weight:300;margin:8px 0" class="num">♩ = ' + e.bpm + '</div><div class="group"><div class="cell"><span class="grow">' + t('set.tempo') + '</span>' +
    ui.stepper('bpm', t('set.tempo')) + '</div><div class="cellcol">' + ui.seg('bpmq', [60, 80, 100, 120, 140].map((v) => [v, v]), e.bpm, t('set.tempo')) + '</div></div><p class="ftr">' + t('ftr.tempo') + '</p>',
  (el, sh) => el.addEventListener('click', (ev) => {
    const s = ev.target.closest('[data-step="bpm"]'), q = ev.target.closest('[data-seg="bpmq"] [data-v]');
    if (s) e.bpm = Math.max(40, Math.min(200, e.bpm + +s.dataset.d)); else if (q) e.bpm = +q.dataset.v; else return;
    ctx.store.save(); sh.update(); render();
  }));
}

/* ---------- действия ---------- */

function act(a, el) {
  const e = EC();
  switch (a) {
    case 'drill': stopRun(); e.drill = el.dataset.v; ctx.store.save(); fresh(); render(); break;
    case 'lnext': advance(); break;
    case 'lgo': startLesson(el.dataset.v); break;
    case 'lagain': if (L && L.kind === 'lesson') startLesson(L.id); else if (L && L.kind === 'review') startReview(); break;
    case 'lhome': stopLesson(); break;
    case 'lplace': startPlacement(); break;
    case 'lskip': { const p = prog(); p.pl = -1; ctx.saveData(); render(); break; }
    case 'lrev': startReview(); break;
    case 'lbook': ctx.openIn('book', { book: { ch: el.dataset.v, sec: 'school' } }); break;
    case 'again': R.res = null; R.dict = []; render(); if (e.drill !== 'dict') start(); else start('dict'); break;
    case 'next': stopRun(); fresh(); render(); if (e.drill === 'dict') start('dict'); break;
    case 'listen': start(e.drill === 'dict' ? 'dict' : e.drill, { listenOnly: e.drill !== 'dict' }); break;
    case 'cell': dictAdd(el.dataset.v); break;
    case 'undo': { const b = R.dict.map((x) => x.slice()); const last = b[b.length - 1]; if (last) { last.pop(); if (!last.length) b.pop(); } R.dict = b; render(); break; }
    case 'check': dictCheck(); break;
    case 'mic': micToggle(); break;
    case 'set': settingsSheet(); break;
    case 'stats': statsSheet(); break;
    case 'calib': calibSheet(); break;
    case 'tempo': if (!R.dragged || Date.now() - R.dragged > 250) tempoSheet(); break;
  }
}

function bind() {
  onClick = (ev) => {
    if (ev.target.closest('[data-pad]')) return; // площадка — по pointerdown
    const md = ev.target.closest('[data-seg="xmode"] [data-v]');
    if (md) { const e = normalizeConf(ctx.store.all()); e.view = md.dataset.v; ctx.store.save(); render(); return; }
    const x = ev.target.closest('[data-x]');
    if (x && !x.disabled) act(x.dataset.x, x);
  };
  // Площадка: каждое касание (и каждым пальцем) — удар; до начала — запуск
  onDown = (ev) => {
    if (!ev.target.closest('[data-pad]')) return;
    ev.preventDefault();
    tap('tap', ev);
  };
  // Клавиатура компьютера: любая клавиша (кроме служебных) — удар; поля ввода не трогаются
  onKey = (ev) => {
    if (!host || !host.isConnected || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tg = ev.target, tag = tg && tg.tagName;
    if ((tag === 'BUTTON' && !R.run) || tag === 'INPUT' || tag === 'TEXTAREA' || (tg && tg.isContentEditable) || ['Escape', 'Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(ev.key)) return;
    const d = EC().drill;
    if (d === 'home' || d === 'dict' || document.querySelector('.sheet')) return;
    if (ev.key === ' ' || ev.key === 'Enter') ev.preventDefault();
    tap('key', ev);
  };
  host.addEventListener('click', onClick);
  host.addEventListener('pointerdown', onDown);
  window.addEventListener('keydown', onKey);
  untempo = tempoDrag(host);
  // Смахивание по карточке: влево — новый ритм, вправо — сыграть этот ещё раз
  unswipe = swipe(host, {
    left: () => { if (EC().drill !== 'home') act('next'); },
    right: () => { if (EC().drill !== 'home') act('again'); },
    ok: (ev) => !!ev.target.closest('.rycard') && !R.run && !L,
  });
}

export default {
  ...meta,
  status(c) {
    const w = weekOf(normalizeData(c.data()), weekKeys());
    return w.n ? c.tn('statusWeek', w.n, { p: Math.round(w.acc * 100) }) : c.t('statusIdle');
  },
  mount(el, c, sz = 'full') {
    host = el; ctx = c; size = sz;
    render();
    bind();
  },
  resize(sz) { size = sz; render(); },
  midiIn(e) { if (e && e.k === 'on') tap('midi', null); },
  midiStop() {},
  unmount() {
    stopRun();
    cancelAnimationFrame(raf);
    if (claps) { claps.stop(); claps = null; }
    if (host) { host.removeEventListener('click', onClick); host.removeEventListener('pointerdown', onDown); }
    window.removeEventListener('keydown', onKey);
    if (unswipe) { unswipe(); unswipe = null; }
    if (untempo) { untempo(); untempo = null; }
    R.calib = null;
    L = null;
    host = null;
  },
};
