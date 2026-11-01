// Режимы обработки диктофона и громкость файла. Цепочка — src/audio/wl/vocal.worklet.js (тот же код вживую и в файле).
// Режим — набор параметров для задачи (музыка, речь, пение, эфир, репетиция); любая правка — режим «Свой»,
// «Вернуть режим» — снова умолчания режима. Громкость файла — по EBU R128 / ITU-R BS.1770 (интегральная громкость,
// LUFS): подъём до цели, затем лимитер; если до цели пришлось бы сжимать лимитером больше 6 дБ — цель ниже
// (тихую классику не душим ради цифры). Чистые функции — tests/vocal.test.js.
import { VocalDSP, normalizeVocal, VOCAL_FLAT, VOCAL_RANGE } from './wl/vocal.worklet.js';

export { normalizeVocal, VOCAL_FLAT, VOCAL_RANGE };

// Цели громкости файла: off — как есть, peak — пик к −1 дБ, числа — LUFS
export const LEVELS = ['off', 'peak', -14, -16, -19, -23];
export const LIM_MAX = 6; // дБ — больше лимитер не сжимает ради цели

// Режимы (порядок — как в ряду). level — цель громкости файла
export const MODES = {
  raw: { level: 'off', p: {} },
  // музыка: без окраски — только гул ниже 30 Гц, лимитер от перегруза, ровная громкость
  music: { level: -16, p: { hp: 30, limOn: 1, lim: -1 } },
  // речь, заметки, уроки: разборчиво, тише паузы, без шипящих
  speech: { level: -16, p: { hp: 90, hpSlope: 24, expThr: -50, expRatio: 2, expRange: 12, dsFreq: 6500, dsAmt: 0.4, eqMud: -2, eqPres: 2, eqAir: 1.5, compThr: -22, compRatio: 3, compAtt: 8, compRel: 120, limOn: 1, lim: -1, denoise: 0.3 } },
  // пение: мягче сжатие, больше воздуха, лёгкий экспандер
  vocal: { level: -14, p: { hp: 80, hpSlope: 24, expThr: -55, expRatio: 1.5, expRange: 8, dsFreq: 7000, dsAmt: 0.5, eqMud: -1.5, eqPres: 1.5, eqAir: 2.5, compThr: -20, compRatio: 2.5, compAtt: 15, compRel: 180, limOn: 1, lim: -1 } },
  // эфир: срез → экспандер → де-эссер → тембр → компрессор → лимитер, плотно и близко
  radio: { level: -16, p: { hp: 100, hpSlope: 24, expThr: -45, expRatio: 3, expRange: 20, dsFreq: 6000, dsAmt: 0.7, eqLow: 3, eqMud: -3, eqPres: 3, eqAir: 2, compThr: -26, compRatio: 5, compAtt: 4, compRel: 90, limOn: 1, lim: -1, denoise: 0.3 } },
  // репетиция: громкий зал на телефон — медленное мягкое сжатие склеивает, лимитер ловит пики
  band: { level: -14, p: { hp: 40, eqMud: -1, compThr: -24, compRatio: 2, compAtt: 30, compRel: 300, limOn: 1, lim: -1 } },
};
export const MODE_IDS = Object.keys(MODES);
export const DEFAULT_MODE = 'music';
export const modeParams = (id) => normalizeVocal((MODES[id] || MODES[DEFAULT_MODE]).p);
export const modeLevel = (id) => (MODES[id] || MODES[DEFAULT_MODE]).level;
// Настройки диктофона: { mode, p, level }; mode 'own' — свои
export function normalizeVoiceSet(v) {
  const mode = v && (MODES[v.mode] || v.mode === 'own') ? v.mode : DEFAULT_MODE;
  const p = mode === 'own' ? normalizeVocal(v.p) : modeParams(mode);
  const level = v && LEVELS.includes(v.level) ? v.level : mode === 'own' ? 'off' : modeLevel(mode);
  const out = { mode, p, level: mode === 'own' ? level : modeLevel(mode) };
  if (mode === 'own') out.base = v && MODES[v.base] ? v.base : DEFAULT_MODE; // от какого режима — «Вернуть режим»
  return out;
}
// Правка одного параметра: режим становится «Свой» (если значение отличается от режима)
export function editVoiceSet(v, k, val) {
  const cur = normalizeVoiceSet(v), p = k === 'level' ? cur.p : normalizeVocal({ ...cur.p, [k]: val });
  const next = { mode: 'own', base: cur.mode === 'own' ? cur.base : cur.mode, p, level: k === 'level' ? val : cur.level };
  const same = MODE_IDS.find((id) => sameParams(modeParams(id), p) && modeLevel(id) === next.level);
  return same ? normalizeVoiceSet({ mode: same }) : next;
}
export const sameParams = (a, b) => Object.keys(VOCAL_RANGE).every((k) => Math.abs((a[k] || 0) - (b[k] || 0)) < 1e-6);
export const isRaw = (v) => { const s = normalizeVoiceSet(v); return sameParams(s.p, VOCAL_FLAT) && s.level === 'off'; };

/* ---------- файл ---------- */

const runDsp = (ch, sr, p, stage) => {
  const d = new VocalDSP(sr, ch.length, stage);
  d.set(p);
  const B = 4096;
  for (let i = 0; i < ch[0].length; i += B) { const n = Math.min(B, ch[0].length - i); d.process(ch.map((x) => x.subarray(i, i + n)), n); }
  return ch;
};
export const vocalPre = (ch, sr, p) => runDsp(ch, sr, p, 'pre');
export const vocalLim = (ch, sr, p) => runDsp(ch, sr, p, 'lim');

/* ---------- громкость: ITU-R BS.1770-4 ---------- */

// K-фильтр (полка +4 дБ над ~1,7 кГц и срез ~38 Гц) для любой частоты дискретизации — формулы pyloudnorm
function kFilters(sr) {
  const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
  let K = Math.tan((Math.PI * f0) / sr), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416), a0 = 1 + K / Q + K * K;
  const s1 = [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0];
  const f1 = 38.13547087602444, Q1 = 0.5003270373238773;
  K = Math.tan((Math.PI * f1) / sr); a0 = 1 + K / Q1 + K * K;
  const s2 = [1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q1 + K * K) / a0];
  return [s1, s2];
}
// Интегральная громкость (LUFS) каналов; -Infinity — тишина
export function loudness(ch, sr) {
  const fs = kFilters(sr), n = ch[0].length, blk = Math.round(0.4 * sr), hop = Math.round(0.1 * sr);
  if (n < blk) return -Infinity;
  const sq = ch.map((x) => {
    const y = new Float64Array(n);
    let st = fs.map(() => [0, 0]);
    for (let i = 0; i < n; i++) {
      let v = x[i];
      fs.forEach((c, j) => { const s = st[j], o = c[0] * v + s[0]; s[0] = c[1] * v - c[3] * o + s[1]; s[1] = c[2] * v - c[4] * o; v = o; });
      y[i] = v * v;
    }
    return y;
  });
  // нарастающая сумма — блоки 400 мс с шагом 100 мс
  const cum = sq.map((y) => { const c = new Float64Array(n + 1); for (let i = 0; i < n; i++) c[i + 1] = c[i] + y[i]; return c; });
  const zs = [];
  for (let s = 0; s + blk <= n; s += hop) { let z = 0; cum.forEach((c) => { z += (c[s + blk] - c[s]) / blk; }); zs.push(z); }
  const L = (z) => -0.691 + 10 * Math.log10(z);
  const abs = zs.filter((z) => z > 0 && L(z) > -70);
  if (!abs.length) return -Infinity;
  const rel = L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const g = abs.filter((z) => L(z) > rel);
  return g.length ? L(g.reduce((a, b) => a + b, 0) / g.length) : -Infinity;
}
const peakDb = (ch) => { let m = 0; ch.forEach((x) => { for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } }); return m > 1e-9 ? 20 * Math.log10(m) : -180; };

// Довести до цели: level — 'off' | 'peak' | LUFS; ceil — потолок лимитера (дБ). Возвращает { gain, lufs } — что сделано
export function toLevel(ch, sr, level, p) {
  const o = normalizeVocal(p), ceil = o.limOn ? o.lim : -1;
  if (level === 'off' || level == null) { if (o.limOn) vocalLim(ch, sr, o); return { gain: 0 }; }
  const pk = peakDb(ch);
  if (pk < -150) return { gain: 0 };
  let g;
  if (level === 'peak') g = ceil - pk;
  else {
    const lu = loudness(ch, sr);
    if (!isFinite(lu)) return { gain: 0 };
    g = Math.min(+level - lu, ceil + LIM_MAX - pk); // не сжимать лимитером больше LIM_MAX
    g = Math.min(g, 30); // и не поднимать тишину до шума
  }
  if (Math.abs(g) > 0.01) { const k = Math.pow(10, g / 20); ch.forEach((x) => { for (let i = 0; i < x.length; i++) x[i] *= k; }); }
  vocalLim(ch, sr, { ...o, limOn: 1, lim: ceil });
  return { gain: g };
}

/* ---------- вживую ---------- */

const WL = new WeakMap();
async function ready(c) {
  if (!c.audioWorklet) return false;
  if (!WL.has(c)) WL.set(c, c.audioWorklet.addModule(new URL('./wl/vocal.worklet.js', import.meta.url)).then(() => true).catch(() => false));
  return WL.get(c);
}
// Узел цепочки на контексте c: { node, set(p), gr(), dispose() }; без AudioWorklet — пустышка (звук идёт как есть)
export async function createVocalNode(c, stage, p) {
  let node = null, last = { exp: 0, ds: 0, comp: 0, lim: 0 };
  if (await ready(c)) {
    try {
      node = new AudioWorkletNode(c, 'melete-vocal', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers', processorOptions: { stage, p: normalizeVocal(p) } });
      node.port.onmessage = (e) => { if (e.data && e.data.gr) last = e.data.gr; };
    } catch { node = null; }
  }
  const live = !!node;
  if (!node) node = c.createGain();
  return {
    node, live,
    set(np) { if (live) node.port.postMessage({ p: normalizeVocal(np) }); },
    gr: () => last,
    dispose() { try { node.disconnect(); } catch { /* уже */ } if (live) node.port.onmessage = null; },
  };
}
