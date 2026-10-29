// Ноты с микрофона вживую (одноголосно): высота каждого кадра (YIN) → начала и концы нот. Нота начинается, когда
// высота держится minMs; кончается тишиной (offMs) или новой устойчивой высотой; повтор той же ноты — по новому удару
// (громкость резко выросла). Разбор кадров — чистая функция (tests/notein.test.js), микрофон — createMicNotes.
import { yin } from './pitch.js';
import { openMic } from './mic.js';
import { every, cancel } from './clock.js';

// push(t, f, rms) — секунды, частота (или 0/null — нет высоты), громкость кадра → события [{ k: 'on', t, m, v } | { k: 'off', t }]
export function createNoteTracker({ a4 = 440, minMs = 60, offMs = 70, gate = 0.01 } = {}) {
  let cur = null, cand = null, quietAt = null, lastRms = 0;
  const midi = (f) => 69 + 12 * Math.log2(f / a4);
  return {
    get note() { return cur ? cur.m : null; },
    push(t, f, rms) {
      const ev = [], m = f && rms >= gate ? midi(f) : null;
      const attack = rms > Math.max(gate * 2, lastRms * 2.2);
      lastRms = rms * 0.6 + lastRms * 0.4;
      if (m == null) {
        cand = null;
        if (cur) { if (quietAt == null) quietAt = t; if ((t - quietAt) * 1000 >= offMs) { ev.push({ k: 'off', t: quietAt }); cur = null; quietAt = null; } }
        return ev;
      }
      quietAt = null;
      const r = Math.round(m);
      if (cur && Math.abs(m - cur.m) < 0.6) { // та же нота
        cand = null;
        if (attack && t - cur.t > 0.12) { ev.push({ k: 'off', t }, { k: 'on', t, m: cur.m, v: Math.min(1, rms * 6) }); cur = { m: cur.m, t }; }
        return ev;
      }
      if (!cand || cand.m !== r) { cand = { m: r, t, rms }; return ev; }
      if ((t - cand.t) * 1000 >= minMs) {
        if (cur) ev.push({ k: 'off', t: cand.t });
        ev.push({ k: 'on', t: cand.t, m: cand.m, v: Math.min(1, Math.max(cand.rms, rms) * 6) });
        cur = { m: cand.m, t: cand.t };
        cand = null;
      }
      return ev;
    },
    end(t) { const ev = cur ? [{ k: 'off', t }] : []; cur = null; cand = null; return ev; },
  };
}

// Микрофон → события нот во времени звука (c.currentTime). onEv(e) — каждое событие; onPitch(m|null) — показать
// текущую высоту. → { stop() } или ошибка с .reason ('denied' | 'unavailable')
export async function createMicNotes({ mode, open = () => openMic(mode), a4 = 440, onEv, onPitch = () => {} }) {
  const mic = await open(), c = mic.analyser.context, N = 3840; // YIN: окно 2048 + сдвиги до 27 Гц
  const tr = createNoteTracker({ a4 });
  const win = (N - 1024) / mic.sampleRate; // середина окна YIN (первые 2048 отсчётов) — столько назад от «сейчас»
  const timer = every(16, () => {
    const all = mic.read(), buf = all.subarray(all.length - N);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    const rms = Math.sqrt(s / buf.length), f = rms > 0.008 ? yin(buf, mic.sampleRate, 0.008) : 0;
    const t = c.currentTime - win - (c.baseLatency || 0);
    tr.push(t, f > 30 && f < 2000 ? f : 0, rms).forEach(onEv);
    onPitch(tr.note);
  });
  return { stop() { cancel(timer); tr.end(c.currentTime).forEach(onEv); mic.stop(); } };
}
