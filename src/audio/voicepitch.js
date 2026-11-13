// Высота голоса с микрофона для режима «Петь» медиатеки (тот же разбор, что в «Вокале»: YIN + уточнение по фазе +
// медиана): request — ctx.mic.request, now — часы звука (секунды), onPitch(t, m) — проба каждые 50 мс (m — MIDI дробью,
// 0 — тишина). Анализ — не звук, обычный интервал хватает. Только на устройстве, ничего не пишется.
import { yin, refinePitch, createPitchSmoother } from './pitch.js';

export async function listenPitch(request, now, onPitch) {
  const mic = await request(), smooth = createPitchSmoother();
  const timer = setInterval(() => {
    let buf;
    try { buf = mic.read(); } catch { return; }
    let f = yin(buf, mic.sampleRate, 0.01);
    if (f) f = refinePitch(buf, f, mic.sampleRate);
    if (f && (f < 55 || f > 1600)) f = 0;
    onPitch(now(), f ? 69 + 12 * Math.log2(smooth(f) / 440) : 0);
  }, 50);
  return { stop() { clearInterval(timer); try { mic.stop(); } catch { /* уже закрыт */ } } };
}
