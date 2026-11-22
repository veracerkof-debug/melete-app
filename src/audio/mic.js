// Микрофон — только по явному разрешению пользователя; поток используется лишь для анализа на устройстве.
import { getContext } from './context.js';
import { log } from '../core/log.js';
import { micOpen } from './micowner.js';

export const FFT = 4096;

// Возвращает { analyser, read(), sampleRate, stop() } или бросает ошибку с .reason: 'denied' | 'unavailable' | 'busy' (идёт запись).
// opts: { who, soft, yieldFn } — для хозяина микрофона (micowner.js): слух маскота — soft
export async function openMic(mode, deviceId = '', opts = {}) {
  const c = getContext(mode);
  if (!c || !navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('mic'), { reason: 'unavailable' });
  let stream;
  try {
    stream = await micOpen({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) },
    }, opts.who || 'tool', opts);
  } catch (e) {
    if (e && e.reason === 'busy') throw e;
    if (deviceId && e && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')) return openMic(mode, '', opts); // выбранный вход пропал — вход по умолчанию
    throw Object.assign(new Error('mic'), { reason: e && e.name === 'NotAllowedError' ? 'denied' : 'unavailable' });
  }
  log('audio', 'микрофон открыт (анализ)');
  const src = c.createMediaStreamSource(stream), analyser = c.createAnalyser();
  analyser.fftSize = FFT;
  src.connect(analyser); // не на выход — только анализ
  const buf = new Float32Array(FFT);
  return {
    analyser,
    sampleRate: c.sampleRate,
    read() { analyser.getFloatTimeDomainData(buf); return buf; },
    stop() { log('audio', 'микрофон закрыт'); stream.getTracks().forEach((t) => t.stop()); try { src.disconnect(); } catch { /* ignore */ } },
  };
}
