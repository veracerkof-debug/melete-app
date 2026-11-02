// Пакет FFmpeg для конвертера (DECISIONS 2026-11-02): FFmpeg, собранный в WebAssembly (@ffmpeg/core, GPL-2.0+;
// обёртка @ffmpeg/ffmpeg, MIT). Читает любые форматы (WMA, AC3, AMR, ALAC, APE, видео с любыми кодеками) и пишет то,
// чего не умеет система: ALAC, Vorbis, WMA, AC3, AAC там, где WebCodecs его не даёт (Linux).
// Файлы ядра — свои (models/ffmpeg/: на телефоне — пакет по кнопке, на компьютере — в сборке); адрес по умолчанию
// обёртки (unpkg.com) не используется никогда: ядро грузится только по нашему адресу.
// Обработка — та же, что без пакета (convert.js): FFmpeg только читает в WAV и пишет из WAV.
import { decodeWav, encodeWav } from '../voicefx.js';

const CORE = 'models/ffmpeg/ffmpeg-core.js', WASM = 'models/ffmpeg/ffmpeg-core.wasm';
// аргументы кодирования по формату
const ARGS = {
  alac: () => ['-c:a', 'alac', 'out.m4a'],
  vorbis: (o) => ['-c:a', 'libvorbis', '-b:a', o.kbps + 'k', 'out.ogg'],
  wma: (o) => ['-c:a', 'wmav2', '-b:a', o.kbps + 'k', 'out.wma'],
  ac3: (o) => ['-c:a', 'ac3', '-b:a', o.kbps + 'k', 'out.ac3'],
  m4a: (o) => ['-c:a', 'aac', '-b:a', o.kbps + 'k', '-movflags', '+faststart', 'out.m4a'],
  opus: (o) => ['-c:a', 'libopus', '-b:a', o.kbps + 'k', 'out.ogg'],
  mp3: (o) => ['-c:a', 'libmp3lame', '-b:a', o.kbps + 'k', 'out.mp3'],
  flac: (o) => ['-c:a', 'flac', '-sample_fmt', o.bits === 24 ? 's32' : 's16', 'out.flac'],
  wav: (o) => ['-c:a', o.bits === 24 ? 'pcm_s24le' : o.bits === 32 ? 'pcm_f32le' : 'pcm_s16le', 'out.wav'],
  aiff: (o) => ['-c:a', o.bits === 24 ? 'pcm_s24be' : 'pcm_s16be', 'out.aiff'],
};
export const FF_OUT = Object.keys(ARGS);

// Есть ли ядро (файл на месте): url(rel) — адрес файла (пакет на телефоне или сборка); → true/false
export async function ffAvailable(url) {
  try { const r = await fetch(url(CORE), { method: 'HEAD' }); return r.ok; } catch { return false; }
}

// Загрузить ядро один раз; дальше — тот же экземпляр (рабочий поток обёртки)
export function createFFmpeg(url) {
  let ff = null, loading = null, onProg = null;
  const load = () => loading || (loading = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const x = new FFmpeg();
    x.on('progress', ({ progress }) => { if (onProg && progress >= 0 && progress <= 1) onProg(progress); });
    await x.load({ coreURL: url(CORE), wasmURL: url(WASM) });
    ff = x;
    return x;
  })().catch((e) => { loading = null; throw e; }));
  const run = async (input, args, out) => {
    const x = await load();
    await x.writeFile('in', input);
    const code = await x.exec(['-hide_banner', '-y', '-i', 'in', ...args]);
    let data = null;
    try { data = await x.readFile(out); } catch { /* нет файла */ }
    await x.deleteFile('in').catch(() => {});
    await x.deleteFile(out).catch(() => {});
    if (code !== 0 || !data || !data.length) throw Object.assign(new Error('ffmpeg ' + code), { reason: 'ffmpeg-run' });
    return data;
  };
  return {
    // любой файл → { ch, sr, info } (через WAV 32 бит с плавающей точкой: без потери точности)
    async decode(u8, info = {}) {
      const wav = await run(u8, ['-vn', '-c:a', 'pcm_f32le', '-f', 'wav', 'out.wav'], 'out.wav');
      const w = decodeWav(wav);
      if (!w || !w.ch[0].length) throw Object.assign(new Error('empty'), { reason: 'decode', type: info.type });
      return { ch: w.ch, sr: w.sr, info };
    },
    // каналы → файл формата fmt
    async encode(fmt, ch, sr, opts = {}, onProgress = () => {}) {
      const a = ARGS[fmt];
      if (!a) throw Object.assign(new Error('format'), { reason: 'format' });
      const args = a({ kbps: opts.kbps || 192, bits: opts.bits || 16 }), out = args[args.length - 1];
      onProg = onProgress;
      try { return await run(encodeWav(ch, sr, 32), args, out); } finally { onProg = null; }
    },
    terminate() { if (ff) { try { ff.terminate(); } catch { /* уже */ } } ff = null; loading = null; },
  };
}
