// Кодирование звука в файл — одна функция для всех форматов; работает и в рабочем потоке (encode.worker.js).
// Без пакета FFmpeg: WAV, AIFF, FLAC (свой кодировщик), MP3 (lamejs, LGPL), Opus в OGG (WebCodecs, если умеет
// система), AAC в M4A (WebCodecs + mp4-muxer, если система даёт кодировщик AAC: Android, Windows; Linux — нет).
// Остальное (ALAC, Vorbis, WMA, AC3, AMR…) — через пакет FFmpeg (ffmpeg.js).
import { encodeWav } from '../voicefx.js';
import { encodeFlac } from './flac.js';
import { encodeAiff, oggOpus } from './containers.js';

// Форматы: расширение, MIME, без потерь или с потерями, кто умеет
export const FORMATS = {
  wav: { ext: 'wav', mime: 'audio/wav', lossless: true, bits: [16, 24, 32] },
  flac: { ext: 'flac', mime: 'audio/flac', lossless: true, bits: [16, 24] },
  aiff: { ext: 'aiff', mime: 'audio/aiff', lossless: true, bits: [16, 24] },
  mp3: { ext: 'mp3', mime: 'audio/mpeg', kbps: [96, 128, 192, 256, 320], rates: [32000, 44100, 48000] },
  m4a: { ext: 'm4a', mime: 'audio/mp4', kbps: [96, 128, 192, 256, 320], rates: [44100, 48000], webcodecs: 'mp4a.40.2' },
  opus: { ext: 'ogg', mime: 'audio/ogg', kbps: [48, 64, 96, 128, 192, 256], rates: [48000], webcodecs: 'opus' },
  // только с FFmpeg
  alac: { ext: 'm4a', mime: 'audio/mp4', lossless: true, ffmpeg: true },
  vorbis: { ext: 'ogg', mime: 'audio/ogg', kbps: [96, 128, 192, 256, 320], ffmpeg: true },
  wma: { ext: 'wma', mime: 'audio/x-ms-wma', kbps: [96, 128, 192], ffmpeg: true },
  ac3: { ext: 'ac3', mime: 'audio/ac3', kbps: [192, 256, 384, 448], ffmpeg: true },
  amr: { ext: 'amr', mime: 'audio/amr', rates: [8000], ffmpeg: true, mono: true },
};

// Умеет ли система (без FFmpeg) кодировать формат: { ok, why }
export async function canEncode(fmt, { channels = 2, rate = 48000, kbps = 192 } = {}) {
  const f = FORMATS[fmt];
  if (!f) return { ok: false, why: 'unknown' };
  if (f.ffmpeg) return { ok: false, why: 'ffmpeg' };
  if (!f.webcodecs) return { ok: true };
  if (typeof AudioEncoder === 'undefined') return { ok: false, why: 'ffmpeg' };
  try { const r = await AudioEncoder.isConfigSupported({ codec: f.webcodecs, sampleRate: rate, numberOfChannels: Math.min(2, channels), bitrate: kbps * 1000 }); return r.supported ? { ok: true } : { ok: false, why: 'ffmpeg' }; }
  catch { return { ok: false, why: 'ffmpeg' }; }
}

// ch — каналы Float32Array, sr — частота; opts: bits (без потерь), kbps (с потерями), onProgress(0…1).
// → Uint8Array файла
export async function encodeAudio(fmt, ch, sr, { bits = 16, kbps = 192, onProgress = () => {} } = {}) {
  if (fmt === 'wav') return encodeWav(ch, sr, bits);
  if (fmt === 'aiff') return encodeAiff(ch, sr, bits);
  if (fmt === 'flac') return encodeFlac(ch, sr, bits === 24 ? 24 : 16);
  if (fmt === 'mp3') return encodeMp3(ch, sr, kbps, onProgress);
  if (fmt === 'opus') return encodeOpus(ch, sr, kbps, onProgress);
  if (fmt === 'm4a') return encodeAac(ch, sr, kbps, onProgress);
  throw Object.assign(new Error('format'), { reason: 'ffmpeg' });
}

async function encodeMp3(ch, sr, kbps, onProgress) {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const nc = Math.min(2, ch.length), enc = new Mp3Encoder(nc, sr, kbps), n = ch[0].length, step = 1152 * 64, parts = [];
  const toI16 = (x, a, b) => { const y = new Int16Array(b - a); for (let i = a; i < b; i++) { const v = x[i] > 1 ? 1 : x[i] < -1 ? -1 : x[i]; y[i - a] = v < 0 ? v * 32768 : v * 32767; } return y; };
  for (let a = 0; a < n; a += step) {
    const b = Math.min(n, a + step), L = toI16(ch[0], a, b), R = nc > 1 ? toI16(ch[1], a, b) : undefined;
    const out = enc.encodeBuffer(L, R); if (out.length) parts.push(new Uint8Array(out));
    onProgress(b / n);
    if ((a / step) % 8 === 7) await new Promise((r) => setTimeout(r, 0)); // отпустить поток — сообщения о ходе доходят
  }
  const end = enc.flush(); if (end.length) parts.push(new Uint8Array(end));
  return join(parts);
}

// WebCodecs: подать звук кусками, собрать пакеты
async function runEncoder(codec, ch, sr, kbps, onChunk, onProgress) {
  const nc = Math.min(2, ch.length), n = ch[0].length;
  let fail = null, meta0 = null;
  const enc = new AudioEncoder({ output: (chunk, meta) => { if (meta && meta.decoderConfig && !meta0) meta0 = meta.decoderConfig; onChunk(chunk, meta); }, error: (e) => { fail = e; } });
  enc.configure({ codec, sampleRate: sr, numberOfChannels: nc, bitrate: kbps * 1000 });
  const step = sr; // по секунде
  for (let a = 0; a < n && !fail; a += step) {
    const m = Math.min(step, n - a), planar = new Float32Array(m * nc);
    for (let c = 0; c < nc; c++) planar.set(ch[c].subarray(a, a + m), c * m);
    const data = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: m, numberOfChannels: nc, timestamp: Math.round((a / sr) * 1e6), data: planar });
    enc.encode(data); data.close();
    if (enc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0));
    onProgress((a + m) / n);
  }
  await enc.flush(); enc.close();
  if (fail) throw fail;
  return meta0;
}
async function encodeOpus(ch, sr, kbps, onProgress) {
  if (sr !== 48000) throw Object.assign(new Error('opus 48k'), { reason: 'rate' }); // пересчёт частоты — до кодирования
  const packets = [];
  const cfg = await runEncoder('opus', ch, sr, kbps, (chunk) => { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); packets.push({ data: d, samples: Math.round(((chunk.duration || 20000) * 48000) / 1e6) }); }, onProgress);
  // задержка кодировщика — из OpusHead, который отдаёт сам кодировщик (если отдаёт)
  let preSkip = 312;
  if (cfg && cfg.description) { const d = new Uint8Array(cfg.description instanceof ArrayBuffer ? cfg.description : cfg.description.buffer); if (d.length >= 12 && String.fromCharCode(...d.subarray(0, 8)) === 'OpusHead') preSkip = d[10] | (d[11] << 8); }
  return oggOpus(packets, { channels: Math.min(2, ch.length), inputRate: sr, preSkip, total: ch[0].length });
}
async function encodeAac(ch, sr, kbps, onProgress) {
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
  const nc = Math.min(2, ch.length), target = new ArrayBufferTarget();
  const mux = new Muxer({ target, audio: { codec: 'aac', sampleRate: sr, numberOfChannels: nc }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  await runEncoder('mp4a.40.2', ch, sr, kbps, (chunk, meta) => mux.addAudioChunk(chunk, meta), onProgress);
  mux.finalize();
  return new Uint8Array(target.buffer);
}

function join(parts) { const n = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(n); let o = 0; parts.forEach((p) => { out.set(p, o); o += p.length; }); return out; }
