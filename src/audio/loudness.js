// Громкость записи для нормализации в пульте выступления: интегральная LUFS по ITU-R BS.1770-4 (K-фильтр, блоки 400 мс
// с шагом 100 мс, два порога) — тот же результат, что у `vocal.js: loudness`, но потоком: память не растёт с длиной
// записи (там весь сигнал копируется в Float64Array — на телефоне с четырёхминутным треком это сотни мегабайт).
// Считается по частям с передышками для интерфейса. Поправка — просто усиление, не сжатие: форма звука не меняется.
import { kFilters } from './vocal.js';

const yieldUI = () => new Promise((r) => setTimeout(r, 0));

// Суммы квадратов K-взвешенного сигнала по отрезкам в 100 мс: по каналам складываются
async function hopSums(ch, sr, hop, onTick) {
  const n = ch[0].length, nh = Math.floor(n / hop), out = new Float64Array(nh), fs = kFilters(sr);
  for (const x of ch) {
    const st = fs.map(() => [0, 0]);
    let step = 0;
    for (let h = 0; h < nh; h++) {
      let acc = 0;
      for (let i = h * hop, e = i + hop; i < e; i++) {
        let v = x[i];
        for (let j = 0; j < 2; j++) { const c = fs[j], s = st[j], o = c[0] * v + s[0]; s[0] = c[1] * v - c[3] * o + s[1]; s[1] = c[2] * v - c[4] * o; v = o; }
        acc += v * v;
      }
      out[h] += acc;
      if (++step >= 10) { step = 0; await yieldUI(); if (onTick) onTick(); } // раз в секунду звука — передышка
    }
  }
  return out;
}

// → { lufs, peak } : lufs — интегральная громкость (−Infinity — тишина), peak — пик отсчёта в дБ от полной шкалы
export async function measureLoudness(ch, sr) {
  const hop = Math.round(0.1 * sr), blk = 4 * hop;
  let pk = 0;
  for (const x of ch) for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > pk) pk = a; }
  const peak = pk > 1e-9 ? 20 * Math.log10(pk) : -180;
  if (ch[0].length < blk) return { lufs: -Infinity, peak };
  const hs = await hopSums(ch, sr, hop);
  const L = (z) => -0.691 + 10 * Math.log10(z), zs = [];
  for (let k = 0; k + 4 <= hs.length; k++) zs.push((hs[k] + hs[k + 1] + hs[k + 2] + hs[k + 3]) / blk);
  const abs = zs.filter((z) => z > 0 && L(z) > -70);
  if (!abs.length) return { lufs: -Infinity, peak };
  const rel = L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10, g = abs.filter((z) => L(z) > rel);
  return { lufs: g.length ? L(g.reduce((a, b) => a + b, 0) / g.length) : -Infinity, peak };
}

// Поправка в дБ до цели: вниз — до −24, вверх — до +12, и не выше потолка по пику (−1 дБ): без лимитера не рисковать
// щелчками. Нет измерения (null) — без поправки
export function normGainDb(lufs, peak, target = -16, { maxUp = 12, maxDown = 24, ceil = -1 } = {}) {
  if (lufs == null || !Number.isFinite(lufs)) return 0;
  let g = Math.max(-maxDown, Math.min(maxUp, target - lufs));
  if (Number.isFinite(peak) && peak > -150) g = Math.min(g, ceil - peak);
  return Math.round(g * 10) / 10;
}
export const dbGain = (db) => Math.pow(10, db / 20);

// Файл (Blob) → измерение. Раскодируется в 22,05 кГц: хватает для громкости (K-фильтр до ~10 кГц), памяти — вдвое меньше
export async function measureBlob(blob, OfflineCtx = globalThis.OfflineAudioContext) {
  const c = new OfflineCtx(2, 1, 22050);
  const buf = await c.decodeAudioData(await blob.arrayBuffer());
  const ch = [buf.getChannelData(0)];
  if (buf.numberOfChannels > 1) ch.push(buf.getChannelData(1));
  return measureLoudness(ch, buf.sampleRate);
}
