// Обработка в реальном времени (диктофон до записи и мониторинг): голосовая цепочка (vocal.js — срез, экспандер,
// де-эссер, тембр, компрессор), общая цепочка эффектов приложения (fx.js), усиление и лимитер — тот же код, что при
// обработке записи (voicefx.processVoice), поэтому вживую и в файле звучит одинаково. Шумоподавление и подъём до
// цели громкости — только в файле. Контекст у диктофона свой (малая задержка), пространства реверберации строятся в
// нём (localSpaces). Без AudioWorklet голосовая цепочка вживую пропускается (звук идёт как есть, в файле — полностью).
// Вход и выход — свои: открыть вход (deviceId, где браузер умеет выбирать), выход — setSinkId, где он есть.
import { createFxChain, localSpaces } from './fx.js';
import { createVocalNode, normalizeVoiceSet } from './vocal.js';

// Цепочка: in → голос (pre) → эффекты (fx.js) → усиление → лимитер → out; update({ chain, gain, voice })
export async function createLiveFx(c, fx = {}) {
  const input = c.createGain(), gain = c.createGain(), output = c.createGain();
  const v = normalizeVoiceSet(fx.voice), pre = await createVocalNode(c, 'pre', v.p), lim = await createVocalNode(c, 'lim', v.p);
  const chain = createFxChain(c, fx.chain, { space: localSpaces(c, gain) });
  input.connect(pre.node).connect(chain.input); chain.output.connect(gain).connect(lim.node).connect(output);
  function update(o = {}) {
    chain.set(o.chain);
    gain.gain.setTargetAtTime(Math.pow(10, (+o.gain || 0) / 20), c.currentTime, 0.02);
    if (o.voice) { const p = normalizeVoiceSet(o.voice).p; pre.set(p); lim.set(p); }
  }
  update(fx);
  return {
    input, output, update,
    live: pre.live,
    // сокращение усиления по ступеням, дБ: { exp, ds, comp, lim }
    gr: () => ({ ...pre.gr(), lim: lim.gr().lim }),
    disconnect() { chain.dispose(); pre.dispose(); lim.dispose(); [input, gain, output].forEach((n) => { try { n.disconnect(); } catch { /* уже */ } }); },
  };
}
// Открыть вход: deviceId — для браузера (на Android вход выбирает система — см. engine.route)
export async function openInput(c, deviceId) {
  const audio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
  if (deviceId && deviceId !== -1 && typeof deviceId === 'string') audio.deviceId = { exact: deviceId };
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio }); } catch (e) {
    const why = e && e.name === 'NotAllowedError' ? 'denied' : e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError' || e.name === 'TypeError') ? 'nomic' : 'unavailable';
    throw Object.assign(new Error(why), { reason: why });
  }
  const src = c.createMediaStreamSource(stream);
  return { stream, src, stop() { stream.getTracks().forEach((t) => t.stop()); try { src.disconnect(); } catch { /* уже */ } } };
}

// Выход контекста на выбранное устройство (где браузер умеет: AudioContext.setSinkId)
export const canPickOutput = () => typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype;
export async function setOutput(c, id) {
  if (!c || !('setSinkId' in c)) return false;
  try { await c.setSinkId(id || ''); return true; } catch { return false; }
}

// Уровень и кусочек сигнала с анализатора: { peak, rms, samples, rate } — для окна уровня и спектра
export function levelOf(an, buf) {
  an.getFloatTimeDomainData(buf);
  let peak = 0, s = 0;
  for (let i = 0; i < buf.length; i++) { const v = Math.abs(buf[i]); if (v > peak) peak = v; s += buf[i] * buf[i]; }
  return { peak, rms: Math.sqrt(s / buf.length), samples: buf, rate: an.context.sampleRate };
}
