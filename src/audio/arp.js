// Арпеджиатор пэдов (слово автора 06.11.2026, пункт 16: вместо тампуры). Цель — не заменить музыканта, а дать фону
// жизнь и движение: аккорд звучащего пэда играется рисунком из «устойчивых ходов» (вверх, вниз, ломаный, Альберти,
// педаль, дуга…); «Жизнь» — как часто рисунок меняется, проходящие ноты, сдвиги на октаву, лёгкая неровность
// времени и силы; «Плотность» — сколько нот звучит (остальное — паузы); «Длина» — сколько держится нота.
// Звук — любой звук пианино (synth.js) со всеми эффектами шины пэдов; темп — метронома, если он идёт (сетка по его
// долям), иначе свой. Спутник «Глайдер рядом» — тянущаяся воздушная мелодия по ступеням той же тональности с эхом.
// Логика рисунков — чистые функции (tests/arp.test.js); планировщик — на часах звука (clock.js), без setTimeout.
import { CHORDS } from './drone.js';
import { holdAt } from './param.js';
import { presetOf, PRESETS } from './synth.js';
import { every, cancel } from './clock.js';
import { getContext, midiFreq } from './context.js';

// Рисунки — номера нот в «лесенке» аккорда (0 — нижняя); выходящие за край — через октаву
export const MOTIFS = {
  up: [0, 1, 2, 3], down: [3, 2, 1, 0], updown: [0, 1, 2, 3, 2, 1], broken: [0, 2, 1, 3], alberti: [0, 2, 1, 2],
  pedal: [0, 2, 0, 1, 0, 3, 0, 2], arc: [0, 1, 2, 3, 4, 3, 2, 1], wave: [0, 2, 4, 3, 1, 2], open: [0, 3, 1, 4],
};
export const STYLES = ['mix', 'up', 'down', 'updown', 'broken', 'alberti', 'pedal', 'arc'];
// «Смешивать»: только плавные и надёжные ходы
const MIX = ['up', 'updown', 'broken', 'alberti', 'pedal', 'arc', 'wave', 'open'];
export const RATES = { '1/4': 1, '1/8': 2, '1/8t': 3, '1/16': 4 }; // нот на долю
export const ARP_SOUNDS = ['wkpad', 'wfelt', 'fmep', 'bell', 'sine', 'wflute', 'piano', 'organ']; // любой звук пианино; первыми — мягкие

// Громкость ползунком 0…1: LVL0 — прежний фон (0 дБ), вниз до −18 дБ, вверх до +12 дБ
export const LVL0 = 0.4;
export const lvlDb = (v) => (v >= LVL0 ? ((v - LVL0) / (1 - LVL0)) * 12 : ((v - LVL0) / LVL0) * 18);
export const lvlGain = (v) => Math.pow(10, lvlDb(v) / 20);
const dbLvl = (db) => Math.max(0, Math.min(1, db >= 0 ? LVL0 + (db / 12) * (1 - LVL0) : LVL0 + (db / 18) * LVL0));

export function normalizeArp(a = {}) {
  const o = { ...a };
  if (o.on == null) o.on = false;
  if (!STYLES.includes(o.style)) o.style = 'mix';
  if (!RATES[o.rate]) o.rate = '1/8';
  if (!(o.range >= 1 && o.range <= 3)) o.range = 2;
  for (const [k, d] of [['life', 0.5], ['density', 0.85], ['gate', 0.6], ['vol', 0.7], ['swing', 0]]) if (!(o[k] >= 0 && o[k] <= 1)) o[k] = d;
  if (!(o.bpm >= 40 && o.bpm <= 200)) o.bpm = 84;
  if (!o.sound || !(PRESETS[o.sound] || presetOf(o.sound))) o.sound = 'wkpad';
  // громкость (слово автора 14.11.2026): по умолчанию — фон, как раньше; можно до «сильно слышно» (+12 дБ)
  // прежняя «Громкость» (сила нот 0,1…1, по умолчанию 0,7) — переводится в уровень, тише остаётся тише
  if (!(o.lvl >= 0 && o.lvl <= 1)) o.lvl = o.vol > 0 && o.vol !== 0.7 ? dbLvl(20 * Math.log10(o.vol / 0.7)) : LVL0;
  o.glide = { on: false, vol: 0.5, echo: 0.6, busy: 0.4, ...(o.glide || {}) };
  if (!(o.glide.lvl >= 0 && o.glide.lvl <= 1)) o.glide.lvl = o.glide.vol > 0 && o.glide.vol !== 0.5 ? dbLvl(20 * Math.log10(o.glide.vol / 0.5)) : LVL0;
  return o;
}

// Лесенка аккорда: ноты созвучия pc+chord от октавы low на range октав (+ верхняя тоника)
export function ladder(pc, chord, low = 3, range = 2) {
  const offs = [...new Set((CHORDS[chord] || CHORDS.maj).map((x) => x % 12))].sort((a, b) => a - b);
  // одна-две ноты (тоника, квинта) — добавить терцию из лада, иначе рисунок пустой
  if (offs.length < 3) offs.splice(1, 0, chord === 'min' || chord === 'hmin' ? 3 : 4);
  const base = 12 * (low + 1) + pc, out = [];
  for (let o = 0; o < range; o++) offs.forEach((x) => out.push(base + 12 * o + x));
  out.push(base + 12 * range);
  return [...new Set(out)].sort((a, b) => a - b);
}
// Ступени лада для проходящих нот и мелодии спутника: мажор / натуральный минор от pc
export const scaleOf = (pc, chord) => ((chord === 'min' || chord === 'hmin' || chord === 'dim') ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map((x) => (pc + x) % 12);
// Лад для проходящих нот и спутника — тональность, а не аккорд сам по себе (слово автора 14.11.2026: «привязать к
// тональности»): у ii в до мажоре (ре минор) — си, а не си-бемоль. key — тоника мажора (круг квинт пэдов) или null:
// тогда тональность угадывается — прежняя, если аккорд в ней свой, иначе та, где аккорд ближе к главным (I, IV, V…)
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const DEG_PREF = [0, 5, 7, 9, 2, 4, 11]; // аккорд на I, IV, V, vi, ii, iii, vii — от главных к побочным
export function keyFor(pc, chord, key = null, prev = null) {
  const tones = [...new Set((CHORDS[chord] || CHORDS.maj).map((x) => (pc + x) % 12))];
  const fits = (k) => tones.every((x) => MAJ.includes((x - k + 12) % 12));
  if (key != null && fits(key)) return key;
  if (prev != null && fits(prev)) return prev;
  for (const d of DEG_PREF) { const k = (pc - d + 12) % 12; if (fits(k)) return k; }
  return null;
}
export function keyScale(pc, chord, key = null, prev = null) {
  const k = keyFor(pc, chord, key, prev);
  return k == null ? scaleOf(pc, chord) : MAJ.map((x) => (k + x) % 12);
}
// Голосоведение: нижняя нота лесенки нового аккорда — ближайшая к прежней (в пределах октавы вокруг base), а не всегда
// с той же октавы: до → си не прыгает на септиму вниз, а сдвигается на полутон
export function nearRoot(pc, prevRoot, base) {
  const ref = prevRoot || base;
  let m = ref - ((ref - pc) % 12 + 12) % 12; // не выше ref
  if (ref - m > 6) m += 12;
  return Math.max(base - 5, Math.min(base + 7, m));
}
const at = (lad, i) => { const n = lad.length - 1, o = Math.floor(i / n); return lad[((i % n) + n) % n] + 12 * o; };

// Нота рисунка: ступень i лесенки; pass — проходящая (ступень лада над ней) — изредка и не на сильной доле
export function noteAt(lad, i, scale = null) {
  const m = at(lad, i);
  if (!scale) return m;
  const up = m + 2;
  return scale.includes(up % 12) ? up : scale.includes((up - 1) % 12) ? up - 1 : m;
}

// Такт рисунка: steps нот → [{ m, vel, rest, dt }] (dt — сдвиг времени в долях шага); rnd — генератор 0…1
export function barNotes(a, lad, steps, prev, rnd = Math.random, scale = null) {
  const life = a.life, pick = () => {
    if (a.style !== 'mix') return a.style;
    if (prev && rnd() > life * 0.9) return prev; // рисунок держится, пока «Жизнь» не позовёт сменить
    const c = MIX.filter((x) => x !== prev);
    return c[Math.floor(rnd() * c.length)];
  };
  const name = pick(), mot = MOTIFS[name], shift = rnd() < life * 0.25 ? Math.floor(lad.length / 2) : 0, out = [];
  for (let s = 0; s < steps; s++) {
    const i = mot[s % mot.length] + shift, pass = !!scale && s % 2 === 1 && rnd() < life * 0.15;
    const m = noteAt(lad, i, pass ? scale : null);
    const strong = s === 0, beat = s % Math.max(1, steps / 4) === 0;
    const rest = !strong && rnd() > a.density;
    const vel = Math.max(0.25, Math.min(1, (strong ? 0.95 : beat ? 0.8 : 0.62) + (rnd() - 0.5) * 0.16 * life));
    out.push({ m, i, pass, vel, rest, dt: (rnd() - 0.5) * 0.08 * life });
  }
  return { name, notes: out };
}

// Мелодия спутника: следующая нота — ступень лада рядом с прежней (шаг 1–2 ступени, изредка скачок на терцию),
// в пределах октавы над аккордом; сильные доли тянутся к нотам аккорда
export function glideNext(prev, pc, chord, rnd = Math.random, lo = 64, hi = 79, scale = null) {
  const sc = scale || scaleOf(pc, chord), ch = (CHORDS[chord] || CHORDS.maj).map((x) => (pc + x) % 12);
  const notes = []; for (let m = lo; m <= hi; m++) if (sc.includes(m % 12)) notes.push(m);
  let i = notes.indexOf(prev); if (i < 0) i = notes.findIndex((m) => ch.includes(m % 12));
  const r = rnd(), d = r < 0.35 ? -1 : r < 0.7 ? 1 : r < 0.82 ? -2 : r < 0.94 ? 2 : (rnd() < 0.5 ? -3 : 3);
  let j = Math.max(0, Math.min(notes.length - 1, i + d));
  if (rnd() < 0.5) { const k = [j, j - 1, j + 1].find((x) => notes[x] != null && ch.includes(notes[x] % 12)); if (k != null) j = k; }
  return notes[j];
}

// Счёт сыгранных нот (самопроверка и проверки в браузере)
export const arpStat = { notes: 0, glide: 0 };

// Движок: drone — пэды (что звучит), synth — общий синтезатор, metro — метроном, mixer — шины, getArp() — настройки
export function createArp({ drone, synth, metro, mixer, getArp, getDrone, getA4 = () => 440 }) {
  let timer = 0, next = 0, step = 0, bar = null, prevName = null, keyN = 0, glide = null, gNext = 0, gNote = 0;
  let sig = '', lad = null, root = 0, keyPc = null, scale = null; // звучащий аккорд и его лесенка, тональность
  let outG = null; // своя громкость арпеджиатора → шина пэдов (узел создаётся раз на контекст, правится параметром)
  const out = (c, a) => {
    if (!outG || outG.context !== c) { outG = c.createGain(); outG.gain.value = lvlGain(a.lvl); outG.connect(mixer.bus('drone')); }
    outG.gain.setTargetAtTime(lvlGain(a.lvl), c.currentTime, 0.05);
    return outG;
  };
  const lookahead = 0.25;
  const beatLen = () => 60 / (metro && metro.running ? metro.cfg.bpm : normalizeArp(getArp()).bpm);
  // сетка по долям метронома: ближайшая доля из его очереди
  const anchor = () => { if (!metro || !metro.running || !metro.queue) return null; const b = metro.queue.find((x) => x.s === 0); return b ? b.t : null; };

  function tick() {
    const c = getContext(mixer.state.mode), a = normalizeArp(getArp());
    if (!c || !a.on || !drone.on) { stop(); return; }
    const d = getDrone(), per = RATES[a.rate], st = beatLen() / per, steps = per * 4;
    const anc = anchor();
    if (anc != null) { const k = Math.ceil((next - anc) / st - 0.001); const snap = anc + k * st; if (Math.abs(snap - next) > 0.004) next = Math.max(c.currentTime + 0.02, snap); }
    if (next < c.currentTime) next = c.currentTime + 0.05;
    const low = Math.max(2, Math.min(4, [2, 3, 4].find((o) => d.layers && d.layers[o]) ?? 3));
    // аккорд сменился — лесенка перестраивается сразу (не с нового такта), рисунок продолжается с того же места,
    // нижняя нота — ближайшая к прежней; лад — по тональности (круг квинт пэдов задаёт её явно)
    const s2 = d.pc + ':' + drone.chord + ':' + a.range + ':' + low;
    if (s2 !== sig || !lad) {
      sig = s2;
      root = nearRoot(d.pc, lad ? root : 0, 12 * (low + 2));
      const l0 = ladder(0, drone.chord, low + 1, a.range);
      lad = l0.map((m) => m - l0[0] + root);
      keyPc = keyFor(d.pc, drone.chord, d.view === 'circle' && d.ckey != null ? (d.ckey * 7) % 12 : null, keyPc);
      scale = keyPc == null ? scaleOf(d.pc, drone.chord) : MAJ.map((x) => (keyPc + x) % 12);
    }
    while (next < c.currentTime + lookahead) {
      if (!bar || step % steps === 0) { bar = barNotes(a, lad, steps, prevName, Math.random, scale); prevName = bar.name; }
      const n = bar.notes[step % steps], sw = a.swing && per === 2 && step % 2 === 1 ? a.swing * st * 0.33 : 0;
      if (!n.rest) {
        const t = next + sw + n.dt * st, key = 'arp' + (keyN = (keyN + 1) % 48), patch = arpPatch(a);
        synth.on(noteAt(lad, n.i, n.pass ? scale : null), key, { bus: 'drone', out: out(c, a), patch, vel: n.vel * 0.7, at: t });
        arpStat.notes++;
        synth.off(key, false, t + Math.max(0.05, st * (0.25 + a.gate * 1.5)));
      }
      next += st; step++;
    }
    if (a.glide.on) glideTick(c, a, d); else glideOff();
  }

  let patchCache = null;
  function arpPatch(a) {
    if (!patchCache || patchCache.id !== a.sound) patchCache = { id: a.sound, p: { ...(presetOf(a.sound) || PRESETS.piano), preset: a.sound, hold: false } };
    return patchCache.p;
  }

  // Спутник: тянущийся голос с плавным переходом высоты, долгим нарастанием, эхом и залом
  function glideOn(c, a) {
    const out = mixer.bus('drone'), g = c.createGain(), lp = c.createBiquadFilter(), o1 = c.createOscillator(), o2 = c.createOscillator(), vib = c.createOscillator(), vg = c.createGain();
    const dl = c.createDelay(2), fb = c.createGain(), wet = c.createGain();
    o1.type = 'sine'; o2.type = 'triangle'; o2.detune.value = 6;
    lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.3;
    vib.frequency.value = 4.8; vg.gain.value = 9; vib.connect(vg); vg.connect(o1.detune); vg.connect(o2.detune);
    const m2 = c.createGain(); m2.gain.value = 0.35;
    o1.connect(lp); o2.connect(m2).connect(lp);
    lp.connect(g); g.gain.value = 0;
    g.connect(out);
    dl.delayTime.value = Math.min(1.9, beatLen() * 0.75); fb.gain.value = 0.45 + a.glide.echo * 0.3; wet.gain.value = 0.35 + a.glide.echo * 0.45;
    g.connect(dl); dl.connect(fb).connect(dl); dl.connect(wet).connect(out);
    const hall = mixer.wet ? mixer.wet('drone', 'cathedral') : null; if (hall) { const s = c.createGain(); s.gain.value = 0.5; g.connect(s).connect(hall); }
    const t = c.currentTime;
    [o1, o2, vib].forEach((o) => o.start(t));
    glide = { g, o1, o2, vib, dl, fb, wet, lp };
    gNext = t + 0.3; gNote = 0;
  }
  function glideTick(c, a, d) {
    if (!glide) glideOn(c, a);
    glide.fb.gain.setTargetAtTime(0.45 + a.glide.echo * 0.3, c.currentTime, 0.2);
    glide.wet.gain.setTargetAtTime(0.35 + a.glide.echo * 0.45, c.currentTime, 0.2);
    while (gNext < c.currentTime + lookahead) {
      const bl = beatLen(), len = bl * (a.glide.busy > 0.66 ? 1 : a.glide.busy > 0.33 ? 2 : 4) * (Math.random() < 0.3 ? 2 : 1);
      if (Math.random() < 0.18 * (1 - a.glide.busy)) { glide.g.gain.setTargetAtTime(0, gNext, bl * 0.6); gNext += len; continue; } // дыхание
      gNote = glideNext(gNote, d.pc, drone.chord, Math.random, 64, 79, scale);
      arpStat.glide++;
      const f = midiFreq(gNote, getA4());
      [glide.o1, glide.o2].forEach((o) => o.frequency.setTargetAtTime(f, gNext, 0.09)); // скольжение
      glide.lp.frequency.setTargetAtTime(Math.min(6000, f * 5), gNext, 0.3);
      const gv = 0.5 * lvlGain(a.glide.lvl); // громкость спутника: по умолчанию — прежний фон (0,5), до +12 дБ
      glide.g.gain.setTargetAtTime(0.09 * gv, gNext, bl * 0.35); // долгое нарастание
      glide.g.gain.setTargetAtTime(0.05 * gv, gNext + len * 0.6, len * 0.3);
      gNext += len;
    }
  }
  function glideOff() {
    if (!glide) return;
    const x = glide, c = x.g.context, t = c.currentTime;
    holdAt(x.g.gain, t); x.g.gain.setTargetAtTime(0, t, 0.5); x.wet.gain.setTargetAtTime(0, t + 2, 0.8);
    [x.o1, x.o2, x.vib].forEach((o) => { try { o.stop(t + 6); } catch { /* уже */ } });
    glide = null;
  }

  function start() {
    if (timer) return;
    const c = getContext(mixer.state.mode);
    if (!c) return;
    next = c.currentTime + 0.1; step = 0; bar = null; sig = ''; lad = null;
    timer = every(25, tick);
    tick();
  }
  function stop() {
    if (timer) { cancel(timer); timer = 0; }
    glideOff();
  }
  // пэд зазвучал или смолк, настройку включили — арпеджиатор сам идёт или стоит
  const sync = () => { const a = normalizeArp(getArp()); if (a.on && drone.on) start(); else stop(); };
  drone.subscribe(sync);
  return { sync, start, stop, get running() { return !!timer; } };
}
