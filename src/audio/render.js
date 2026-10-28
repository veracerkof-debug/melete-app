// Сведение «на бумаге» (быстрее реального времени): проект студии считается в OfflineAudioContext тем же кодом,
// что звучит вживую, — секвенсор (sequencer.js), синтезатор (synth.js), звуки GM, эффекты дорожек (fx.js), шины
// theory/media с их эффектами и громкостью из микшера, посыл theory в общий зал, пространства для пэдов и общий
// выход с компрессором (context.js: masterChain). Планировщик идёт по своим часам: расчёт останавливается каждые
// 25 мс звука (suspend), часы будят планировщик и отложенные отпускания — как живые часы, только без ожидания.
// Метроном (клик) в сведение не идёт. Без DOM.
import { masterChain } from './context.js';
import { makeSpace, loadReverbWorklet, SPACE_DEF } from './spaces.js';
import { loadAirWorklet } from './airsound.js';
import { createFxChain } from './fx.js';
import { createSynth, presetOf } from './synth.js';
import { createSequencer } from './sequencer.js';
import { secPerBeat, songBeats } from '../music/project.js';

// Часы офлайн-расчёта: after / every / cancel по времени контекста; run() — разбудить всё, чему пора
export function offlineClock(c) {
  let id = 0;
  const q = new Map(), errs = [];
  const now = () => c.currentTime;
  return {
    after(ms, fn) { const i = ++id; q.set(i, { at: now() + Math.max(0, +ms || 0) / 1000, fn }); return i; },
    every(ms, fn) { const i = ++id; q.set(i, { at: now(), fn, every: Math.max(1, +ms || 25) / 1000 }); return i; },
    cancel(i) { if (i != null) q.delete(i); },
    run() {
      const t = now() + 1e-9;
      [...q].sort((a, b) => a[1].at - b[1].at).forEach(([i, x]) => {
        if (!q.has(i) || x.at > t) return;
        if (x.every) x.at = t + x.every; else q.delete(i);
        try { x.fn(); } catch (e) { errs.push(e); }
      });
    },
    get size() { return q.size; },
    errs,
  };
}

// Микшер сведения: те же шины, что у живого (громкость и эффекты — из живого микшера), но на своём контексте
function offlineMixer(c, live, out) {
  const buses = {}, sends = {}, wets = {}, spaces = {};
  let hall = null;
  const space = (type) => {
    if (type === 'hall' || !SPACE_DEF[type]) return (hall || (hall = makeSpace(c, 'hall', out.comp))).input;
    if (!spaces[type]) spaces[type] = makeSpace(c, type, out.comp);
    return spaces[type].input;
  };
  const value = (name) => (live && live.value ? live.value(name) : 1);
  const mixer = {
    state: live ? live.state : { mode: 'smooth' },
    value,
    bus(name) {
      if (buses[name]) return buses[name];
      const g = c.createGain();
      g.gain.value = name === 'metro' ? 0 : value(name); // клик в сведение не идёт
      const fx = createFxChain(c, live && live.fx ? live.fx(name) : null);
      g.connect(fx.input);
      fx.output.connect(out.master);
      if (name === 'theory' || name === 'piano' || name === 'glider') {
        const s = c.createGain();
        s.gain.value = name === 'theory' ? 0.3 : 0;
        g.connect(s).connect(space('hall'));
        sends[name] = s;
      }
      return (buses[name] = g);
    },
    wet(name, type = 'hall') {
      const k = name + ':' + type;
      if (wets[k]) return wets[k];
      const g = c.createGain();
      g.gain.value = value(name);
      g.connect(space(type));
      return (wets[k] = g);
    },
    setReverb(name, level) { mixer.bus(name); if (sends[name]) sends[name].gain.value = level; },
    fx: (name) => (live && live.fx ? live.fx(name) : null),
  };
  return mixer;
}

// p — проект (копия: сведение может менять соло); live — живой микшер; getFile — запись медиатеки по id;
// a4 — строй; onProgress(0…1). → AudioBuffer (стерео)
export async function renderProject(p, { live = null, getFile = () => null, a4 = 440, sampleRate = 44100, tail = 2.5, onProgress = null, signal = null } = {}) {
  const spb = secPerBeat(p), dur = songBeats(p) * spb + tail + 0.1;
  const c = new OfflineAudioContext(2, Math.max(1, Math.ceil(dur * sampleRate)), sampleRate);
  await Promise.all([loadAirWorklet(c), loadReverbWorklet(c)].map((x) => Promise.resolve(x).catch(() => false)));
  const out = masterChain(c), clock = offlineClock(c), mixer = offlineMixer(c, live, out);
  const synth = createSynth({ mixer, getPatch: () => presetOf('piano'), getA4: () => a4, context: c, clock });
  const seq = createSequencer({ mixer, synth, getProject: () => p, getFile, context: c, clock });
  await seq.prepare();
  if (!seq.start(0, { once: true, whole: true })) throw new Error('render: start');
  await new Promise((r) => setTimeout(r, 0)); // записи клипов раскладываются (startAudio — асинхронный)
  await new Promise((r) => setTimeout(r, 0));
  const total = c.length, stepF = Math.max(128, Math.round((0.025 * sampleRate) / 128) * 128); // шаг — целыми квантами расчёта
  let aborted = false;
  for (let f = stepF, k = 0; f < total - stepF; f += stepF, k++) {
    const t = f / sampleRate;
    c.suspend(t).then(() => {
      if (signal && signal.aborted) aborted = true;
      if (!aborted) clock.run();
      if (onProgress && k % 40 === 0) { try { onProgress(Math.min(1, t / dur)); } catch { /* */ } }
      c.resume();
    });
  }
  const buf = await c.startRendering();
  try { seq.dispose(); } catch { /* */ }
  if (aborted) throw Object.assign(new Error('aborted'), { aborted: true });
  if (clock.errs.length) throw clock.errs[0];
  if (onProgress) onProgress(1);
  return buf;
}
