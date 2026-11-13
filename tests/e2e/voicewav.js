// «Голос» для сквозных проверок вокала: WAV с напетой гаммой (тоны с гармониками и лёгким вибрато) — браузер читает его
// вместо микрофона (--use-file-for-fake-audio-capture). Ноты — MIDI, длительность каждой — dur с паузой gap.
import { writeFileSync } from 'node:fs';

export function writeVoiceWav(path, notes, { dur = 0.7, gap = 0.08, sr = 48000 } = {}) {
  const n = Math.round(notes.length * (dur + gap) * sr), buf = Buffer.alloc(44 + n * 2);
  let i = 0;
  notes.forEach((m) => {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    for (let k = 0; k < dur * sr; k++, i++) {
      const t = k / sr, env = Math.min(1, t / 0.03, (dur - t) / 0.05), ph = 2 * Math.PI * f * (1 + 0.003 * Math.sin(2 * Math.PI * 5 * t)) * t;
      buf.writeInt16LE(Math.round((env * 0.5 * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.25 * Math.sin(3 * ph))) / 1.75 * 32000), 44 + i * 2);
    }
    i += Math.round(gap * sr);
  });
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  writeFileSync(path, buf);
  return path;
}
