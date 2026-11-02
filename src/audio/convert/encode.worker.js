// Рабочий поток конвертера: кодирование не держит экран. Вход: { id, fmt, ch: [Float32Array], sr, bits, kbps };
// выход: { id, progress } по ходу и { id, ok: Uint8Array } или { id, err, reason } в конце
import { encodeAudio } from './encode.js';

self.onmessage = async (e) => {
  const { id, fmt, ch, sr, bits, kbps } = e.data;
  let last = 0;
  try {
    const out = await encodeAudio(fmt, ch, sr, { bits, kbps, onProgress: (p) => { if (p - last >= 0.02 || p >= 1) { last = p; self.postMessage({ id, progress: p }); } } });
    self.postMessage({ id, ok: out }, [out.buffer]);
  } catch (err) {
    self.postMessage({ id, err: String((err && err.message) || err), reason: err && err.reason });
  }
};
