// Пэды и дрон: тёплый, пэд, смычок, хор, стекло, тампура. Слои по октавам, созвучия, плавная смена нот.
// Настройки — объект device.drone (как в прототипе).
import { getContext, masterNode, sendToReverb, sendToHall, midiFreq } from './context.js';
import { wave, pinkNoise } from './waves.js';
import { airVoice, sideInto } from './airsound.js';
import { every, cancel } from './clock.js';

// Тембры: id → яркость по умолчанию. Названия — ключи i18n drone.sound.<id>
// Первыми — воздушные для поклонения (airsound.js): воздух, свет, тепло, хор
export const SOUNDS = { wair: 0.5, wlight: 0.5, wwarm: 0.5, wchoir: 0.5, soft: 0.7, pad: 0.45, bow: 0.85, choir: 0.5, glass: 0.9, tanpura: 0.7 };
const AIRS = { wair: 'air', wlight: 'light', wwarm: 'warm', wchoir: 'choir' };
// Созвучия: интервалы от нажатой ноты
export const CHORDS = { root: [0], fifth: [0, 7], maj: [0, 4, 7], min: [0, 3, 7], sus4: [0, 5, 7], dim: [0, 3, 6] }; // dim — из квинтового круга
export const CHORD_SET = ['root', 'fifth', 'maj', 'min', 'sus4']; // в настройках (уменьшённый — только кругом)
export const LAYERS = [2, 3, 4]; // октавы слоёв: низкий, средний, высокий

// Дополняет настройки значениями по умолчанию (прототип: DC())
export function normalizeDrone(d) {
  if (!d.chord) d.chord = d.fifth === false ? 'root' : 'fifth';
  if (d.bright == null) d.bright = SOUNDS[d.sound] ?? 0.7;
  if (d.move == null) d.move = 0.5;
  if (d.width == null) d.width = 0.5;
  if (d.fade == null) d.fade = 1.8;
  if (d.rev == null) d.rev = 0.45;
  if (d.xfade == null) d.xfade = true;
  if (d.hall == null) d.hall = 0;   // длинный зал (поклонение), 0…1
  if (d.air == null) d.air = 0;     // «Air» — тихая шумовая подложка по нотам созвучия, 0…1
  if (d.view !== 'keys' && d.view !== 'circle') d.view = 'grid'; // вид: сетка, квинтовый круг или «пиано»
  if (d.ckey == null) d.ckey = 0; // круг: какая тональность наверху (шаг круга от до мажора)
  if (d.latch == null) d.latch = false;   // «пиано»: false — звучит, пока держат; true — касание вкл/выкл
  return d;
}

// Ноты [midi, уровень] для текущих слоёв и созвучия
export function droneNotes(d) {
  const offs = CHORDS[d.chord] || CHORDS.fifth, notes = [];
  LAYERS.filter((o) => d.layers[o]).forEach((o) => {
    const b = 12 * (o + 1) + d.pc, lv = o === 2 ? 1 : o === 3 ? 0.8 : 0.6;
    offs.forEach((x, i) => notes.push([b + x, lv * (i ? 0.55 : 1)]));
  });
  return notes;
}

// Рисунок тампуры: квинта (или кварта для тоники и sus4), две октавы, тоника
export function tanpuraPattern(d) {
  const Ls = LAYERS.filter((o) => d.layers[o]);
  if (!Ls.length) return null;
  const base = 12 * (Ls[0] + 1) + d.pc;
  return { layers: Ls, pat: [d.chord === 'root' || d.chord === 'sus4' ? base + 5 : base + 7, base + 12, base + 12, base] };
}

export function createDrone({ mixer, getSettings, getA4 = () => 440 }) {
  // nodes — пэд сетки (одна нота с созвучием); keys — голоса режима «пиано» (нота → голос, все слои, без созвучия)
  let nodes = null, over = {};
  const keys = new Map();
  const mf = (m) => midiFreq(m, getA4());
  const level = () => getSettings().vol * mixer.value('drone');
  const KEY_K = 0.7; // несколько клавиш сразу — каждая тише, сумма не перегружает

  function pluck(c, dest, m, t, lvl) {
    const f = mf(m), o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.setPeriodicWave(wave(c, 'tan'));
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 4;
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(9000, f * 16), t);
    lp.frequency.setTargetAtTime(f * 5, t, 1.6);
    lp.Q.value = 2.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14 * lvl, t + 0.012);
    g.gain.setTargetAtTime(0.0001, t + 0.02, 1.7);
    let out = g;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = (Math.random() - 0.5) * 0.6; g.connect(p); out = p; }
    o.connect(lp).connect(g);
    out.connect(dest);
    o.start(t); o.stop(t + 7);
  }

  // Тампура: свой рисунок щипков у каждого голоса (свои часы)
  function tanpura(c, d, v) {
    let next = c.currentTime + 0.1, step = 0;
    const gap = 1.15;
    const run = () => {
      const tp = tanpuraPattern(d);
      if (!tp) return;
      while (next < c.currentTime + 0.4) {
        const i = step % 4;
        pluck(c, v.g, tp.pat[i], next, i === 3 ? 1.1 : 0.9);
        tp.layers.slice(1).forEach((o) => pluck(c, v.g, tp.pat[i] + 12 * (o - tp.layers[0]), next + 0.015, 0.45));
        next += i === 3 ? gap * 1.6 : gap;
        step++;
      }
    };
    run();
    v.timer = every(120, run);
  }

  // Воздушный пэд: каждая нота созвучия — голос airsound.js; «Движение» — дыхание громкости, «Ширина» — расстройка,
  // «Яркость» — фильтр. В высоких слоях и на неосновных нотах голосов в унисоне меньше (легче для телефона)
  function startAir(c, d, master, t, os, att) {
    const amp = c.createGain(), breath = c.createOscillator(), bgn = c.createGain();
    amp.gain.value = 1;
    amp.connect(master);
    breath.frequency.value = 0.09;
    bgn.gain.value = 0.12 * d.move;
    breath.connect(bgn).connect(amp.gain);
    breath.start(t);
    os.push(breath);
    droneNotes(d).forEach(([m, lvl], i) => {
      const g = c.createGain();
      g.gain.value = lvl * 0.16;
      g.connect(amp);
      const a = airVoice(c, g, AIRS[d.sound], mf(m), t, { width: 0.3 + d.width * 1.4, bright: 0.45 + d.bright * 1.1, fade: att ?? Math.max(2, d.fade * 1.6), uni: i === 0 ? 3 : 2 });
      os.push(...a.srcs);
    });
    if (d.air > 0.01) addAir(c, master, droneNotes(d).map(([m, lvl]) => [mf(m), lvl]), d.air, t, os);
  }

  // Голос: d — настройки с нотой и созвучием; att — нарастание (клавиши — быстрее), k — доля громкости
  function voice(c, d, att, k = 1) {
    const t = c.currentTime, master = c.createGain();
    master.connect(masterNode());
    // воздушным пэдам зал нужен всегда, хотя бы немного
    const hall = AIRS[d.sound] ? Math.max(0.45, d.hall) : d.hall;
    const send = sendToReverb(master, d.rev), hallS = hall > 0 ? sendToHall(master, hall) : null;
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(level() * k, t + Math.max(0.05, att));
    const os = [], v = { g: master, os, send, hallS, k, timer: null };
    if (d.sound === 'tanpura') { tanpura(c, d, v); return v; }
    if (AIRS[d.sound]) { startAir(c, d, master, t, os, att < 1 ? Math.max(0.12, att) : undefined); return v; }
    const base = 250 * Math.pow(20, d.bright), lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = base;
    lp.Q.value = d.sound === 'pad' ? 1.3 : 0.5;
    lp.connect(master);
    const amp = c.createGain();
    amp.gain.value = 1;
    if (d.sound === 'choir') { // форманты гласной «а»
      const mix = c.createGain();
      mix.gain.value = 1.4;
      [[800, 6, 1], [1150, 7, 0.7], [2900, 9, 0.25]].forEach(([fq, q, g0]) => {
        const bp = c.createBiquadFilter(), bg = c.createGain();
        bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q; bg.gain.value = g0;
        amp.connect(bp).connect(bg).connect(mix);
      });
      mix.connect(lp);
    } else amp.connect(lp);
    // «дыхание» — медленная модуляция громкости
    const breath = c.createOscillator(), bgn = c.createGain();
    breath.frequency.value = d.sound === 'glass' ? 0.35 : 0.11;
    bgn.gain.value = (d.sound === 'glass' ? 0.22 : 0.1) * d.move;
    breath.connect(bgn).connect(amp.gain);
    breath.start(t);
    os.push(breath);
    let vibG = null;
    if (d.sound === 'bow' || d.sound === 'choir') {
      const vib = c.createOscillator();
      vibG = c.createGain();
      vib.frequency.value = d.sound === 'bow' ? 4.8 : 5.3;
      vibG.gain.value = d.sound === 'bow' ? 5 : 7;
      vib.connect(vibG);
      vib.start(t);
      os.push(vib);
    }
    // Каждая нота — середина без расстройки и пара ±расстройка только в разности каналов (sideInto): в стерео — ширина,
    // в моно (маленькая Bluetooth-колонка, телефон, зал) пара исчезает и громкость не «качает» — раньше две
    // расстроенные копии, сложенные в один канал, раз в секунду гасили друг друга
    const det = 2 + d.width * 16, sideK = Math.min(0.6, d.width * 1.1);
    const lvlK = { pad: 0.05, bow: 0.07, choir: 0.045, glass: 0.12 }[d.sound] || 0.11;
    const side = sideK > 0.01 ? sideInto(c, amp) : null;
    droneNotes(d).forEach(([m, lvl]) => {
      const f = mf(m);
      [[0, 1.4], ...(side ? [[det, sideK], [-det, -sideK]] : [])].forEach(([dt, k], i) => {
        const o = c.createOscillator();
        if (d.sound === 'pad' || d.sound === 'choir') o.type = 'sawtooth';
        else if (d.sound === 'glass') o.type = 'sine';
        else o.setPeriodicWave(wave(c, d.sound === 'bow' ? 'bow' : 'warm'));
        o.frequency.value = f;
        o.detune.value = dt;
        if (vibG) vibG.connect(o.detune);
        const g = c.createGain();
        g.gain.value = lvl * lvlK * k;
        o.connect(g).connect(i ? side : amp);
        o.start(t);
        os.push(o);
      });
      if (d.sound === 'glass') { // октава сверху
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f * 2; g.gain.value = lvl * 0.04;
        o.connect(g).connect(amp);
        o.start(t);
        os.push(o);
      }
    });
    // «Air»: розовый шум через узкие полосы на нотах созвучия (и октавой выше) — дыхание пространства, очень тихо
    if (d.air > 0.01) addAir(c, master, droneNotes(d).map(([m, lvl]) => [mf(m), lvl]), d.air, t, os);
    if (d.move > 0.02 && d.sound !== 'glass') { // движение фильтра
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = 0.05 + d.move * 0.1;
      lg.gain.value = base * 0.55 * d.move;
      l.connect(lg).connect(lp.frequency);
      l.start(t);
      os.push(l);
    }
    return v;
  }

  function release(v, fade) {
    cancel(v.timer);
    const { g, os } = v, t = g.context.currentTime, cur = g.gain.value;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(cur, t);
    g.gain.linearRampToValueAtTime(0, t + fade);
    os.forEach((o) => { try { o.stop(t + fade + 0.1); } catch { /* ignore */ } });
  }
  // Клавиши: нарастание и затухание короче, чем у пэда, — клавиша отвечает пальцу
  const keyAtt = (d) => Math.min(d.fade, 0.3), keyRel = (d) => Math.max(0.5, Math.min(d.fade, 2));
  const keySet = (pc) => ({ ...normalizeDrone(getSettings()), pc, chord: 'root' });

  const dr = {
    get on() { return !!nodes; },
    // звучит ли хоть что-то: пэд или клавиши
    get sounding() { return !!nodes || keys.size > 0; },
    // созвучие, которое звучит сейчас (жест на плитке может отличаться от настройки)
    get chord() { return over.chord || normalizeDrone(getSettings()).chord; },

    // o: { chord } — созвучие на этот раз (жест на плитке); без o — из настроек
    start(o) {
      const c = getContext(mixer.state.mode);
      if (!c) return;
      over = o ? { ...o } : {};
      const d = { ...normalizeDrone(getSettings()), ...over };
      nodes = voice(c, d, d.fade);
    },

    // Затухание за fade секунд (по умолчанию 1,2 с)
    stop(fade = 1.2) {
      if (!nodes) return;
      release(nodes, fade);
      nodes = null;
    },

    retune() {
      if (nodes) { const o = over; dr.stop(); dr.start(o); }
      if (keys.size) { const d = normalizeDrone(getSettings()), on = [...keys.keys()]; dr.keysOff(0.4); on.forEach((pc) => dr.keyOn(pc, d.fade)); }
    },

    // Сменить ноту или созвучие: плавный переход (если включён) или перезапуск
    swap(o) {
      over = o ? { ...o } : {};
      if (!nodes) { dr.start(over); return; }
      const d = normalizeDrone(getSettings());
      if (!d.xfade) { dr.retune(); return; }
      const x = Math.max(0.4, Math.min(2.5, d.fade));
      dr.stop(x);
      const f0 = d.fade;
      d.fade = x;
      dr.start(over);
      d.fade = f0;
    },

    // Режим «пиано»: клавиша pc звучит всеми включёнными слоями
    keyOn(pc, att) {
      const c = getContext(mixer.state.mode);
      if (!c) return;
      const d = keySet(pc);
      if (keys.has(pc)) release(keys.get(pc), 0.15);
      keys.set(pc, voice(c, d, att ?? keyAtt(d), KEY_K));
    },
    keyOff(pc, fade) {
      const v = keys.get(pc);
      if (!v) return;
      release(v, fade ?? keyRel(normalizeDrone(getSettings())));
      keys.delete(pc);
    },
    keysOff(fade) { [...keys.keys()].forEach((pc) => dr.keyOff(pc, fade)); },
    get held() { return new Set(keys.keys()); },

    // Громкость (настройка пэдов × микшер)
    vol() { [nodes, ...keys.values()].forEach((v) => { if (v) v.g.gain.setTargetAtTime(level() * v.k, v.g.context.currentTime, 0.05); }); },
    setReverb(x) { [nodes, ...keys.values()].forEach((v) => { if (v && v.send) v.send.gain.setTargetAtTime(x, v.send.context.currentTime, 0.05); }); },
    // длинный зал: если посыла ещё нет — пэд перезапускается плавно (swap)
    setHall(x) {
      if (keys.size) dr.retune();
      if (!nodes) return;
      if (nodes.hallS) nodes.hallS.gain.setTargetAtTime(x, nodes.hallS.context.currentTime, 0.1); else if (x > 0) dr.swap();
    },
  };
  mixer.subscribe(() => dr.vol());
  return dr;
}

// Розовый шум → полосы на частотах нот (Q ~ 18) → тихий уровень. Узлы-источники — в os (остановка)
export function addAir(c, dest, notes, amount, t, os) {
  const src = c.createBufferSource(), g = c.createGain(), sway = c.createOscillator(), sg = c.createGain();
  src.buffer = pinkNoise(c); src.loop = true;
  g.gain.value = 0;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(amount * 0.9, t + 3); // вступает медленно
  // медленное «дыхание» громкости
  sway.frequency.value = 0.07; sg.gain.value = amount * 0.25;
  sway.connect(sg).connect(g.gain);
  g.connect(dest);
  notes.forEach(([f, lvl]) => [[f, 1], [f * 2, 0.55]].forEach(([fq, k]) => {
    if (fq > 9000) return;
    const bp = c.createBiquadFilter(), bg = c.createGain();
    bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 18;
    bg.gain.value = lvl * k * 1.6;
    src.connect(bp).connect(bg).connect(g);
  }));
  src.start(t); sway.start(t);
  os.push(src, sway);
}
