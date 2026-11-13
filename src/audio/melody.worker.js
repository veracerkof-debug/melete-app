// Рабочий поток снятия мелодии для режима «Петь» (src/audio/melody.js): линия высоты по отделённому вокалу — тяжёлый
// цикл YIN по всей песне не останавливает интерфейс. Внутрь: { x — моно Float32Array 8 кГц, sr } → { p — Int16Array } | { err }.
import { trackPitch } from '../music/melody.js';

self.onmessage = (e) => {
  try {
    const p = trackPitch(e.data.x, e.data.sr);
    self.postMessage({ p }, [p.buffer]);
  } catch (err) { self.postMessage({ err: String((err && err.message) || err) }); }
};
