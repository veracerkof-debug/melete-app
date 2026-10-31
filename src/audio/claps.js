// Хлопки и удары с микрофона: резкий всплеск громкости → момент удара во времени контекста. Разбор отсчётов —
// чистая функция (tests/rhythm.test.js), микрофон — createClaps. Порог сам подстраивается под шум комнаты;
// floor(x) поднимает его выше эха щелчков из динамика (тренажёр ритма меряет эхо на отсчёте).
import { openMic } from './mic.js';
import { every, cancel } from './clock.js';

// push(buf, tEnd, sr) — новые отсчёты (последний — в момент tEnd) → [{ t, peak }]
export function createOnsetDetector({ block = 64, refractory = 0.09, minThr = 0.04 } = {}) {
  let noise = 0.004, last = -1, prev = 0, lastT = -Infinity, lift = 0;
  return {
    get noise() { return noise; },
    floor(x) { lift = Math.max(0, x || 0); },
    push(buf, tEnd, sr) {
      const out = [], t0 = tEnd - buf.length / sr;
      let i0 = Math.max(0, Math.ceil((lastT - t0) * sr));
      if (!isFinite(lastT)) i0 = Math.max(0, buf.length - 2048); // первый вызов — только свежее
      for (let i = i0; i + block <= buf.length; i += block) {
        let p = 0, at = -1;
        const thr = Math.max(minThr, noise * 8, lift);
        for (let j = i; j < i + block; j++) { const a = Math.abs(buf[j]); if (a > p) p = a; if (at < 0 && a > thr) at = j; }
        const t = t0 + (at < 0 ? i : at) / sr;
        if (at >= 0 && p > prev * 2.5 && t - last > refractory) { out.push({ t, peak: p }); last = t; }
        else if (at < 0) noise = noise * 0.995 + p * 0.005;
        prev = p * 0.7 + prev * 0.3;
        lastT = t0 + (i + block) / sr;
      }
      return out;
    },
  };
}

// Микрофон → удары. onHit({ t, peak }) — каждый удар во времени контекста (как c.currentTime).
// c — контекст, если open() даёт микрофон без анализатора (ctx.mic.request модуля).
// → { stop(), floor(x), detector } или ошибка с .reason ('denied' | 'unavailable')
export async function createClaps({ mode, open = () => openMic(mode), c: ctx0 = null, onHit }) {
  const mic = await open(), c = (mic.analyser && mic.analyser.context) || ctx0, det = createOnsetDetector();
  const timer = every(10, () => { det.push(mic.read(), c.currentTime, mic.sampleRate).forEach(onHit); });
  return { stop() { cancel(timer); mic.stop(); }, floor: (x) => det.floor(x), detector: det };
}
