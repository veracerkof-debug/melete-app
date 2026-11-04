// Конвертер (DECISIONS 2026-11-02): файл или несколько → прочитать (что умеет система; остальное — пакет FFmpeg) →
// разрез, объединение, каналы, скорость без смены высоты, частота, громкость → формат. Исходники не меняются:
// результат — новый файл. Кодирование — в рабочем потоке (encode.worker.js), экран не замирает.
import { sniff } from './containers.js';
import { FORMATS, canEncode } from './encode.js';
import { toLevel } from '../vocal.js';

// Прочитать файл (Blob) → { ch: [Float32Array], sr, info }. Ошибка с reason: 'decode' (система не умеет — нужен FFmpeg).
// Предела по длине нет: не хватило памяти системе — та же ошибка, и конвертер предлагает FFmpeg (он работает «файл → файл»).
export async function readAudio(blob, { ffmpeg = null } = {}) {
  const u8 = new Uint8Array(await blob.arrayBuffer()), info = sniff(u8);
  const rate = info.rate >= 8000 && info.rate <= 384000 ? info.rate : 48000;
  try {
    const oc = new OfflineAudioContext(1, 1, rate), buf = await oc.decodeAudioData(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
    const ch = []; for (let c = 0; c < buf.numberOfChannels; c++) ch.push(buf.getChannelData(c));
    if (!ch.length || !ch[0].length) throw new Error('empty');
    return { ch, sr: buf.sampleRate, info };
  } catch (e) {
    if (ffmpeg) return ffmpeg.decode(u8, info);
    throw Object.assign(new Error('decode'), { reason: 'decode', type: info.type });
  }
}

/* ---------- обработка (каналы Float32Array) ---------- */

export function trim(ch, sr, a = 0, b = Infinity) {
  // конец не задан (null, ∞) — до конца записи
  const n = ch[0].length, i0 = Math.max(0, Math.min(n, Math.round((+a || 0) * sr))), i1 = Math.max(i0, Math.min(n, b == null || !isFinite(b) ? n : Math.round(b * sr)));
  return ch.map((x) => x.slice(i0, i1));
}
// mode: 'keep' | 'mono' | 'stereo' | 'left' | 'right'
export function channels(ch, mode) {
  if (mode === 'mono') { if (ch.length === 1) return ch; const n = ch[0].length, y = new Float32Array(n); ch.forEach((x) => { for (let i = 0; i < n; i++) y[i] += x[i] / ch.length; }); return [y]; }
  if (mode === 'stereo') return ch.length === 1 ? [ch[0], ch[0].slice()] : ch.slice(0, 2);
  if (mode === 'left') return [ch[0]];
  if (mode === 'right') return [ch[ch.length > 1 ? 1 : 0]];
  return ch;
}
// Склеить подряд (частоты уже одинаковые); каналов — сколько у самого «широкого», моно дублируется; gap — пауза, с
export function concat(list, sr, gap = 0) {
  const nc = Math.max(...list.map((x) => x.length)), g = Math.round(gap * sr), n = list.reduce((a, x) => a + x[0].length, 0) + g * (list.length - 1);
  const out = Array.from({ length: nc }, () => new Float32Array(n));
  let o = 0;
  list.forEach((x, k) => { out.forEach((y, c) => y.set(x[Math.min(c, x.length - 1)], o)); o += x[0].length + (k < list.length - 1 ? g : 0); });
  return out;
}
// Плавные края (мс): без щелчка на месте разреза
export function fades(ch, sr, inMs = 0, outMs = 0) {
  const fi = Math.round((inMs / 1000) * sr), fo = Math.round((outMs / 1000) * sr);
  ch.forEach((x) => { const n = x.length; for (let i = 0; i < Math.min(fi, n); i++) x[i] *= i / fi; for (let i = 0; i < Math.min(fo, n); i++) x[n - 1 - i] *= i / fo; });
  return ch;
}
// Пересчёт частоты — тем же движком браузера (качественная интерполяция), офлайн
export async function resample(ch, from, to) {
  if (from === to) return ch;
  const n = ch[0].length, m = Math.max(1, Math.ceil((n * to) / from)), src = new AudioBuffer({ numberOfChannels: ch.length, length: n, sampleRate: from });
  ch.forEach((x, c) => src.copyToChannel(x, c));
  const oc = new OfflineAudioContext(ch.length, m, to), s = oc.createBufferSource();
  s.buffer = src; s.connect(oc.destination); s.start();
  const out = await oc.startRendering();
  return Array.from({ length: ch.length }, (_, c) => out.getChannelData(c));
}
// Скорость без смены высоты (и/или высота без смены скорости) — Signalsmith Stretch, как в плеере медиатеки
export async function stretch(ch, sr, rate = 1, semi = 0) {
  if (rate === 1 && !semi) return ch;
  const { stretchRender } = await import('../stretchrender.js');
  const src = new AudioBuffer({ numberOfChannels: Math.max(1, ch.length), length: ch[0].length, sampleRate: sr });
  ch.forEach((x, c) => src.copyToChannel(x, c));
  const out = await stretchRender(src, { rate, semi });
  return ch.length === 1 ? [out.getChannelData(0)] : [out.getChannelData(0), out.getChannelData(1)];
}
// Громкость: { mode: 'keep' | 'gain' | 'peak' | LUFS (−14, −16, −23), db } — с лимитером на −1 дБ, когда поднимаем
export function volume(ch, sr, v = {}) {
  if (!v || v.mode === 'keep' || v.mode == null) return { gain: 0 };
  if (v.mode === 'gain') {
    const k = Math.pow(10, (+v.db || 0) / 20);
    if (k !== 1) ch.forEach((x) => { for (let i = 0; i < x.length; i++) { const y = x[i] * k; x[i] = y > 1 ? 1 : y < -1 ? -1 : y; } });
    return { gain: +v.db || 0 };
  }
  return toLevel(ch, sr, v.mode, { limOn: 1, lim: -1 });
}

/* ---------- целиком ---------- */

// Частота результата: «как есть», если формат её принимает; иначе ближайшая из разрешённых
export function outRate(fmt, src, want = 0) {
  const r = want || src, ok = FORMATS[fmt] && FORMATS[fmt].rates;
  if (!ok || ok.includes(r)) return r;
  return ok.reduce((best, x) => (Math.abs(x - r) < Math.abs(best - r) ? x : best), ok[0]);
}

let worker = null, seq = 0;
const waits = new Map();
function encodeInWorker(fmt, ch, sr, opts, onProgress) {
  if (!worker) {
    worker = new Worker(new URL('./encode.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => { const w = waits.get(e.data.id); if (!w) return; if (e.data.progress != null) { w.onProgress(e.data.progress); return; } waits.delete(e.data.id); if (e.data.ok) w.res(e.data.ok); else w.rej(Object.assign(new Error(e.data.err), { reason: e.data.reason })); };
    worker.onerror = (e) => { waits.forEach((w) => w.rej(new Error('worker: ' + (e.message || 'error')))); waits.clear(); worker = null; };
  }
  const id = ++seq;
  return new Promise((res, rej) => { waits.set(id, { res, rej, onProgress }); worker.postMessage({ id, fmt, ch, sr, bits: opts.bits, kbps: opts.kbps }); });
}

// Одно задание: sources — [{ blob, name }] (несколько и join — склеить в один файл), opts — { fmt, bits, kbps, rate,
// chan, trim: [a, b], speed, semi, vol, fadeMs, gap }. → [{ name, blob, dur, fmt }]; onStep({ stage, i, n, p })
export async function convert(sources, opts, { onStep = () => {}, ffmpeg = null, join = false, signal = null, viaJs = false } = {}) {
  const f = FORMATS[opts.fmt];
  if (!f) throw Object.assign(new Error('format'), { reason: 'format' });
  const base0 = (nm) => String(nm || 'audio').replace(/\.[^.]+$/, '');
  // Есть FFmpeg — всё через него, «файл → файл»: без раскрытия в память, длина не ограничена
  // viaJs — нарочно системными кодеками (M4A/Opus коротких записей быстрее так), FFmpeg — только прочитать непонятное
  if (ffmpeg && ffmpeg.convert && !viaJs) {
    const groups = join && sources.length > 1 ? [sources] : sources.map((s) => [s]), res = [];
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi], i = join ? 0 : gi;
      onStep({ stage: 'read', i, n: sources.length, name: g[0].name, p: 0 });
      const r = await ffmpeg.convert(g, opts, { join: g.length > 1, signal, onStage: (st) => onStep({ stage: st, i, n: sources.length, p: 0 }), onProgress: (p) => onStep({ stage: 'encode', i, n: sources.length, p }) });
      const name = base0(g[0].name) + (g.length > 1 ? ' +' + (g.length - 1) : '') + '.' + f.ext;
      res.push({ name, blob: new Blob([r.data], { type: f.mime }), dur: r.dur, fmt: opts.fmt, size: r.data.length });
    }
    return res;
  }
  const viaFF = f.ffmpeg || !(await canEncode(opts.fmt, { channels: opts.chan === 'mono' ? 1 : 2, rate: outRate(opts.fmt, 48000, opts.rate), kbps: opts.kbps })).ok;
  if (viaFF && !ffmpeg) throw Object.assign(new Error('ffmpeg'), { reason: 'ffmpeg' });
  const stop = () => { if (signal && signal.aborted) throw Object.assign(new Error('cancel'), { reason: 'cancel' }); };
  const base = (nm) => String(nm || 'audio').replace(/\.[^.]+$/, '');
  // один источник → готовые каналы с обработкой (без громкости и кодирования)
  const prep = async (src, i) => {
    onStep({ stage: 'read', i, n: sources.length, name: src.name });
    let { ch, sr } = await readAudio(src.blob, { ffmpeg });
    stop();
    if (opts.trim && !join) ch = trim(ch, sr, opts.trim[0], opts.trim[1]);
    ch = channels(ch, opts.chan || 'keep');
    return { ch, sr };
  };
  const finish = async (ch, sr, name, i) => {
    stop();
    if (opts.speed && opts.speed !== 1 || opts.semi) { onStep({ stage: 'speed', i, n: sources.length }); ch = await stretch(ch, sr, opts.speed || 1, opts.semi || 0); if ((opts.chan || 'keep') === 'mono') ch = channels(ch, 'mono'); }
    const to = outRate(opts.fmt, sr, opts.rate);
    if (to !== sr) { onStep({ stage: 'rate', i, n: sources.length }); ch = await resample(ch, sr, to); sr = to; }
    ch = ch.map((x) => (x.buffer.byteLength === x.byteLength ? x : x.slice())); // свои буферы — их можно передать в поток
    volume(ch, sr, opts.vol);
    if (opts.fadeMs) fades(ch, sr, opts.fadeMs, opts.fadeMs);
    stop();
    onStep({ stage: 'encode', i, n: sources.length, p: 0 });
    const dur = ch[0].length / sr;
    const data = viaFF ? await ffmpeg.encode(opts.fmt, ch, sr, opts, (p) => onStep({ stage: 'encode', i, n: sources.length, p }))
      : await encodeInWorker(opts.fmt, ch, sr, opts, (p) => onStep({ stage: 'encode', i, n: sources.length, p }));
    return { name: name + '.' + f.ext, blob: new Blob([data], { type: f.mime }), dur, fmt: opts.fmt, size: data.length };
  };
  const out = [];
  if (join && sources.length > 1) {
    const parts = [];
    for (let i = 0; i < sources.length; i++) { parts.push(await prep(sources[i], i)); stop(); }
    const sr = Math.max(...parts.map((p) => p.sr)), same = [];
    for (const p of parts) same.push(await resample(p.ch, p.sr, sr));
    let ch = concat(same, sr, opts.gap || 0);
    if (opts.trim) ch = trim(ch, sr, opts.trim[0], opts.trim[1]);
    out.push(await finish(ch, sr, base(sources[0].name) + ' +' + (sources.length - 1), 0));
  } else {
    for (let i = 0; i < sources.length; i++) { const p = await prep(sources[i], i); out.push(await finish(p.ch, p.sr, base(sources[i].name), i)); }
  }
  return out;
}
