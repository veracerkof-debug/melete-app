// Фон пульта выступления (расширение медиатеки): пэд на квинте от тональности номера и свои шумы с плавным переходом
// одного в другой. Пэд — тоника и квинта в двух октавах (ни мажор, ни минор: подходит почти к любой песне); при смене
// тональности высоты плывут к новым за доли секунды, звук не обрывается. Шум — файл медиатеки петлёй; переключение —
// наплывом: новый нарастает, прежний уходит за одно и то же время. Всё идёт через общий фейдер фона в шину медиатеки.
// Узлы голосов создаются при включении и убираются после затухания; живые правки — только параметрами и плавно.
import { holdAt } from './param.js';
import { faderGain, chordNotes } from '../music/show.js';
import { midiFreq } from './context.js';

const CLICK = 0.012, TIMBRE = { warm: { type: 'triangle', cut: 1400, det: 4 }, soft: { type: 'sine', cut: 900, det: 3 }, air: { type: 'sawtooth', cut: 700, det: 7 } };
const MAX_CACHE = 4;

export function createShowBed({ dest, getBlob, getA4 = () => 440, now = () => dest.context.currentTime }) {
  const c = dest.context;
  const out = c.createGain(); out.gain.value = 1; out.connect(dest);
  const padG = c.createGain(); padG.gain.value = 0; padG.connect(out); // пэд: уровень пэда
  const subs = new Set(), cache = new Map();
  let pad = null, tonic = 0, chord = 'fifth', noise = null, noiseLvl = 1; // pad — звучащий голос, noise — звучащий шум { id, src, g }
  const emit = () => subs.forEach((fn) => { try { fn(); } catch (e) { (globalThis.reportError || console.error)(e); } });

  /* ---- пэд ---- */
  function padOn({ pc = tonic, level = 60, sound = 'warm', fade = 3, chord: ch = chord } = {}) {
    tonic = pc; chord = ch;
    if (pad) { api.padSound(sound); api.padLevel(level); api.padTonic(pc, 0.7, ch); return; }
    const tm = TIMBRE[sound] || TIMBRE.warm, lp = c.createBiquadFilter(), oscs = [];
    lp.type = 'lowpass'; lp.frequency.value = tm.cut; lp.Q.value = 0.4; lp.connect(padG);
    const notes = chordNotes(pc, chord), t = now();
    notes.forEach((m, i) => [-1, 1].forEach((sgn) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = tm.type; o.frequency.value = midiFreq(m, getA4()); o.detune.value = sgn * tm.det;
      g.gain.value = (i < 2 ? 0.5 : 0.28) / 2; o.connect(g); g.connect(lp); o.start(t);
      oscs.push({ o, g, i });
    }));
    pad = { lp, oscs };
    holdAt(padG.gain, t); padG.gain.setValueAtTime(Math.max(padG.gain.value, 0.0001), t);
    padG.gain.linearRampToValueAtTime(faderGain(level) * 0.5, t + Math.max(CLICK, fade));
    emit();
  }
  function padOff(fade = 3) {
    if (!pad) return;
    const p = pad, t = now(), f = Math.max(CLICK, fade);
    pad = null;
    holdAt(padG.gain, t); padG.gain.linearRampToValueAtTime(0, t + f);
    setTimeout(() => { p.oscs.forEach(({ o }) => { try { o.stop(); o.disconnect(); } catch { /* */ } }); try { p.lp.disconnect(); } catch { /* */ } }, f * 1000 + 80);
    emit();
  }

  /* ---- шум ---- */
  function load(fileId) {
    if (cache.has(fileId)) return Promise.resolve(cache.get(fileId));
    return (async () => {
      const blob = getBlob(fileId); if (!blob) throw new Error('нет файла');
      const buf = await c.decodeAudioData(await blob.arrayBuffer());
      cache.set(fileId, buf);
      while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
      return buf;
    })();
  }
  function endNoise(n, fade) {
    const t = now(), f = Math.max(CLICK, fade);
    holdAt(n.g.gain, t); n.g.gain.linearRampToValueAtTime(0, t + f);
    try { n.src.stop(t + f + 0.05); } catch { /* */ }
    setTimeout(() => { try { n.src.disconnect(); n.g.disconnect(); } catch { /* */ } }, f * 1000 + 150);
  }
  const api = {
    out,
    padOn, padOff,
    get padOn_() { return !!pad; },
    // плавный переход к новой тональности: высоты плывут за glide с
    padTonic(pc, glide = 0.7, ch = chord) {
      tonic = ((Math.round(pc) % 12) + 12) % 12; chord = ch;
      if (!pad) return;
      const notes = chordNotes(tonic, chord), t = now();
      pad.oscs.forEach(({ o, i }) => o.frequency.setTargetAtTime(midiFreq(notes[i], getA4()), t, glide / 3));
      emit();
    },
    padLevel(v) { if (pad) padG.gain.setTargetAtTime(faderGain(v) * 0.5, now(), 0.05); },
    padSound(sound) {
      const tm = TIMBRE[sound] || TIMBRE.warm; if (!pad) return;
      pad.oscs.forEach(({ o }, k) => { o.type = tm.type; o.detune.setTargetAtTime((k % 2 ? 1 : -1) * tm.det, now(), 0.1); });
      pad.lp.frequency.setTargetAtTime(tm.cut, now(), 0.15);
    },
    // шум: наплыв нового (xfade с); fileId пустой — убрать шум
    async setNoise(fileId, level = 100, xfade = 6) {
      if (noise && noise.fileId === fileId) { api.noiseTrim(level); return; }
      if (!fileId) { api.stopNoise(xfade); return; }
      const buf = await load(fileId);
      const prev = noise, t = now(), src = c.createBufferSource(), g = c.createGain(), f = Math.max(CLICK, xfade);
      src.buffer = buf; src.loop = true; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(faderGain(level), t + f);
      src.connect(g); g.connect(out); src.start(t);
      noise = { fileId, src, g, lvl: faderGain(level) };
      if (prev) endNoise(prev, f);
      emit();
    },
    stopNoise(fade = 3) { if (!noise) return; const n = noise; noise = null; endNoise(n, fade); emit(); },
    noiseTrim(v) { if (noise) { noise.lvl = faderGain(v); noise.g.gain.setTargetAtTime(noise.lvl, now(), 0.05); } },
    setLevel(v) { out.gain.setTargetAtTime(faderGain(v), now(), 0.04); },
    get state() { return { pad: !!pad, tonic, chord, noise: noise ? noise.fileId : null }; },
    forget(id) { cache.delete(id); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    dispose() { padOff(0.3); api.stopNoise(0.3); setTimeout(() => { try { out.disconnect(); padG.disconnect(); } catch { /* */ } cache.clear(); subs.clear(); }, 600); },
  };
  return api;
}
