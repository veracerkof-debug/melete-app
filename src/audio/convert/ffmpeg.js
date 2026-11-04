// FFmpeg для конвертера (DECISIONS 2026-11-02, переделка 04.11): FFmpeg в WebAssembly (@ffmpeg/core, GPL-2.0+;
// обёртка @ffmpeg/ffmpeg, MIT). Главный путь конвертера там, где он есть (телефон — пакет, компьютер — встроен):
// «файл → файл» без раскрытия звука в память. Исходник не копируется: файл подключается к FFmpeg как есть (WORKERFS —
// чтение кусками прямо из Blob/File), поэтому длина записи не ограничена (40 мин WAV → MP3 — минута на компьютере).
// Обработка — фильтры самого FFmpeg: разрез (-ss/-to), объединение (concat), каналы (pan), частота (aresample),
// скорость без смены высоты (atempo), высота (asetrate + atempo), громкость — пик (volumedetect) или LUFS в два
// прохода (замер BS.1770 — meterGraph, потом усиление и лимитер −1 дБ), плавные края (afade).
// Opus — встроенный кодировщик FFmpeg (libopus в этой сборке падает: memory access out of bounds).
// Адрес ядра — всегда свой (models/ffmpeg/): на телефоне — пакет, на компьютере — сборка; unpkg обёртки не используется.
import { decodeWav } from '../voicefx.js';
import { kFilters } from '../vocal.js';

const CORE = 'models/ffmpeg/ffmpeg-core.js', WASM = 'models/ffmpeg/ffmpeg-core.wasm';
// кодек и контейнер по формату; o — { kbps, bits }
const ARGS = {
  mp3: (o) => ['-c:a', 'libmp3lame', '-b:a', o.kbps + 'k'],
  m4a: (o) => ['-c:a', 'aac', '-b:a', o.kbps + 'k', '-movflags', '+faststart'],
  opus: (o) => ['-c:a', 'opus', '-strict', '-2', '-b:a', o.kbps + 'k'],
  vorbis: (o) => ['-c:a', 'libvorbis', '-b:a', o.kbps + 'k'],
  wma: (o) => ['-c:a', 'wmav2', '-b:a', o.kbps + 'k'],
  ac3: (o) => ['-c:a', 'ac3', '-b:a', o.kbps + 'k'],
  alac: (o) => ['-c:a', 'alac', '-sample_fmt', o.bits === 24 ? 's32p' : 's16p'],
  flac: (o) => ['-c:a', 'flac', '-sample_fmt', o.bits === 24 ? 's32' : 's16'].concat(o.bits === 24 ? ['-bits_per_raw_sample', '24'] : []),
  wav: (o) => ['-c:a', o.bits === 24 ? 'pcm_s24le' : o.bits === 32 ? 'pcm_f32le' : 'pcm_s16le'],
  aiff: (o) => ['-c:a', o.bits === 24 ? 'pcm_s24be' : 'pcm_s16be'],
};
const EXT = { mp3: 'mp3', m4a: 'm4a', opus: 'ogg', vorbis: 'ogg', wma: 'wma', ac3: 'ac3', alac: 'm4a', flac: 'flac', wav: 'wav', aiff: 'aiff' };
// частоты, которые принимает кодек (иначе — ближайшая)
const RATES = { mp3: [32000, 44100, 48000], opus: [48000], ac3: [32000, 44100, 48000], wma: [22050, 32000, 44100, 48000] };
export const FF_OUT = Object.keys(ARGS);

const nearest = (list, r) => list.reduce((b, x) => (Math.abs(x - r) < Math.abs(b - r) ? x : b), list[0]);
export function ffRate(fmt, src, want) { const r = want || src || 48000, ok = RATES[fmt]; return ok && !ok.includes(r) ? nearest(ok, r) : r; }
// atempo принимает 0,5…100 — дробим на множители, чтобы и 0,25 работало
function tempo(k) { const out = []; let x = k; while (x < 0.5) { out.push('atempo=0.5'); x /= 0.5; } while (x > 2) { out.push('atempo=2'); x /= 2; } if (Math.abs(x - 1) > 1e-6) out.push('atempo=' + num(x)); return out; }
const num = (x) => (Math.round(x * 1e6) / 1e6).toString();

// Замер громкости за один проход (ITU-R BS.1770-4, как loudness() в vocal.js, но силами FFmpeg — loudnorm в этой
// сборке медленный, ebur128 сломан): K-фильтр двумя biquad, кадры по 100 мс, astats печатает средний квадрат каждого
// канала; стробирование (−70 LUFS и −10 LU) — здесь. Пик — volumedetect на той же ветке до K-фильтра.
export function meterGraph(sr) {
  const [a, b] = kFilters(sr), bq = (c) => 'biquad=b0=' + c[0] + ':b1=' + c[1] + ':b2=' + c[2] + ':a0=1:a1=' + c[3] + ':a2=' + c[4];
  return ['asplit[mp][mk];[mp]volumedetect,anullsink;[mk]aformat=sample_fmts=dblp', bq(a), bq(b), 'asetnsamples=n=' + Math.round(sr / 10) + ':p=0', 'astats=metadata=1:reset=1:measure_perchannel=RMS_level:measure_overall=none', 'ametadata=print'];
}
export function gateLufs(lines) {
  const subs = []; let cur = null;
  for (const l of lines) {
    if (/\] frame:\s*\d+|^frame:\s*\d+/.test(l)) { cur = []; subs.push(cur); continue; }
    const m = /lavfi\.astats\.(\d+)\.RMS_level=(-?[\d.]+|-inf)/.exec(l);
    if (m && cur) cur[+m[1] - 1] = m[2] === '-inf' ? 0 : Math.pow(10, +m[2] / 10);
  }
  const z100 = subs.map((c) => c.reduce((x, v) => x + (v || 0), 0)), zs = [];
  for (let i = 0; i + 4 <= z100.length; i++) zs.push((z100[i] + z100[i + 1] + z100[i + 2] + z100[i + 3]) / 4);
  const L = (z) => -0.691 + 10 * Math.log10(z), abs = zs.filter((z) => z > 0 && L(z) > -70);
  const peak = (/max_volume:\s*(-?[\d.]+) dB/.exec(lines.join('\n')) || [0, null])[1];
  if (!abs.length) return { lufs: -Infinity, peak: peak == null ? null : +peak };
  const rel = L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10, g = abs.filter((z) => L(z) > rel);
  return { lufs: g.length ? L(g.reduce((a, b) => a + b, 0) / g.length) : -Infinity, peak: peak == null ? null : +peak };
}

// Сведения о входе из строк журнала FFmpeg (-i): длительность, частота, каналов, есть ли видео
export function parseProbe(lines) {
  const s = lines.join('\n'), d = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(s), a = /Audio: ([^,\n]+), (\d+) Hz, ([^,\n]+)/.exec(s);
  const chs = a ? (/mono/.test(a[3]) ? 1 : /stereo|2 channels/.test(a[3]) ? 2 : +(/(\d+) channels/.exec(a[3]) || [0, 2])[1] || 2) : 0;
  return { dur: d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : 0, rate: a ? +a[2] : 0, codec: a ? a[1].trim().split(' ')[0] : '', channels: chs, audio: !!a, video: /Video: /.test(s) };
}

// Цепочка фильтров одной ветки после входа (без громкости и краёв). info — { rate, channels }, o — настройки.
export function chainFor(o, rate, chs = 2) {
  const f = [];
  if (chs > 1 && o.chan === 'mono') f.push('pan=mono|c0=0.5*c0+0.5*c1');
  else if (chs > 1 && o.chan === 'left') f.push('pan=mono|c0=c0');
  else if (chs > 1 && o.chan === 'right') f.push('pan=mono|c0=c1');
  else if (o.chan === 'stereo') f.push('aformat=channel_layouts=stereo');
  const sp = +o.speed || 1, semi = +o.semi || 0;
  if (semi) { const k = Math.pow(2, semi / 12); f.push('asetrate=' + Math.round(rate * k), 'aresample=' + rate, ...tempo(sp / k)); }
  else if (sp !== 1) f.push(...tempo(sp));
  return f;
}

// Загрузить ядро один раз; дальше — тот же экземпляр (рабочий поток обёртки). url(rel) — адрес файла ядра.
export function createFFmpeg(url) {
  let ff = null, loading = null, onLog = null, onTime = null;
  const load = () => loading || (loading = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const x = new FFmpeg();
    x.on('log', ({ message }) => { if (onLog) onLog(message); });
    x.on('progress', ({ time }) => { if (onTime && time > 0) onTime(time / 1e6); });
    await x.load({ coreURL: url(CORE), wasmURL: url(WASM) });
    ff = x;
    return x;
  })().catch((e) => { loading = null; throw e; }));
  const kill = () => { if (ff) { try { ff.terminate(); } catch { /* уже */ } } ff = null; loading = null; };
  let mounted = 0;
  // подключить файлы (без копирования) → пути внутри FFmpeg
  async function mount(x, files) {
    const dir = '/in' + (++mounted);
    await x.createDir(dir);
    const named = files.map((b, i) => new File([b.blob], i + '.' + ((/\.([a-z0-9]{1,5})$/i.exec(b.name || '') || [0, 'bin'])[1]).toLowerCase(), { type: b.blob.type || '' }));
    await x.mount('WORKERFS', { files: named }, dir);
    return { dir, paths: named.map((f) => dir + '/' + f.name) };
  }
  async function unmount(x, dir) { try { await x.unmount(dir); } catch { /* нет */ } try { await x.deleteDir(dir); } catch { /* нет */ } }
  // выполнить и собрать журнал
  async function exec(x, args, { timeTo = 0, onProgress = null, signal = null, keep = false } = {}) {
    const lines = [];
    onLog = (m) => { lines.push(m); if (!keep && lines.length > 4000) lines.splice(0, 1000); };
    onTime = onProgress && timeTo ? (t) => onProgress(Math.max(0, Math.min(1, t / timeTo))) : null;
    const stop = () => kill();
    if (signal) signal.addEventListener('abort', stop, { once: true });
    try {
      const code = await x.exec(['-hide_banner', '-nostdin', ...args]);
      if (signal && signal.aborted) throw Object.assign(new Error('cancel'), { reason: 'cancel' });
      return { code, lines };
    } catch (e) {
      if (signal && signal.aborted) throw Object.assign(new Error('cancel'), { reason: 'cancel' });
      throw Object.assign(new Error('ffmpeg: ' + (e && e.message)), { reason: 'ffmpeg-run', log: lines.slice(-12).join('\n') });
    } finally { onLog = null; onTime = null; if (signal) signal.removeEventListener('abort', stop); }
  }

  return {
    // Сведения о файле (длительность, частота, каналы, видео)
    async probe(blob, name) {
      const x = await load(), m = await mount(x, [{ blob, name }]);
      try { const r = await exec(x, ['-i', m.paths[0]]); return parseProbe(r.lines); } finally { await unmount(x, m.dir); }
    },
    // Конвертировать: files — [{ blob, name }] (несколько и join — в один файл), o — настройки конвертера.
    // → { data: Uint8Array, dur, ext }. onProgress(0…1), onStage('scan' | 'encode').
    async convert(files, o, { join = false, onProgress = () => {}, onStage = () => {}, signal = null } = {}) {
      if (!ARGS[o.fmt]) throw Object.assign(new Error('format'), { reason: 'format' });
      const x = await load(), m = await mount(x, files);
      const out = '/out.' + EXT[o.fmt];
      try {
        // 1) что на входе
        const infos = [];
        for (const p of m.paths) { const r = await exec(x, ['-i', p], { signal }); infos.push(parseProbe(r.lines)); }
        infos.forEach((inf) => { if (!inf.audio) throw Object.assign(new Error('no audio'), { reason: 'noaudio' }); });
        const srcRate = Math.max(...infos.map((i) => i.rate || 48000));
        const rate = ffRate(o.fmt, srcRate, +o.rate || 0);
        const tr = o.trim && (o.trim[0] > 0 || (o.trim[1] != null && isFinite(o.trim[1]))) ? [Math.max(0, +o.trim[0] || 0), o.trim[1] != null && isFinite(o.trim[1]) ? +o.trim[1] : null] : null;
        const sp = +o.speed || 1, gap = Math.max(0, +o.gap || 0);
        // длительность результата (для краёв и хода)
        let total = join ? infos.reduce((a, i) => a + i.dur, 0) + gap * (infos.length - 1) : infos[0].dur;
        if (tr) total = Math.max(0, (tr[1] != null ? Math.min(tr[1], total) : total) - tr[0]);
        const outDur = total / sp;
        // 2) граф: входы → (объединение) → разрез → каналы, скорость, высота → громкость → края → частота
        const input = [], pre = [];
        if (join && m.paths.length > 1) {
          m.paths.forEach((p, i) => { input.push('-i', p); pre.push('[' + i + ':a:0]aresample=' + srcRate + ',aformat=sample_fmts=fltp:channel_layouts=stereo' + (gap && i < m.paths.length - 1 ? ',apad=pad_dur=' + num(gap) : '') + '[a' + i + ']'); });
          pre.push(m.paths.map((_, i) => '[a' + i + ']').join('') + 'concat=n=' + m.paths.length + ':v=0:a=1' + (tr ? ',atrim=start=' + num(tr[0]) + (tr[1] != null ? ':end=' + num(tr[1]) : '') + ',asetpts=PTS-STARTPTS' : '') + '[j]');
        } else {
          // разрез — у входа: FFmpeg сразу перескакивает к началу, не раскодируя лишнее
          if (tr) { input.push('-ss', num(tr[0])); if (tr[1] != null) input.push('-to', num(tr[1])); }
          input.push('-i', m.paths[0]);
        }
        const head = join && m.paths.length > 1 ? pre.join(';') + ';[j]' : '[0:a:0]';
        const body = chainFor(o, srcRate, join && m.paths.length > 1 ? 2 : infos[0].channels || 2);
        const tail = [];
        if (o.fadeMs) { const d = o.fadeMs / 1000; tail.push('afade=t=in:d=' + num(d)); if (outDur > 2 * d) tail.push('afade=t=out:st=' + num(outDur - d) + ':d=' + num(d)); }
        const graph = (vol) => head + [...body, ...vol, ...tail, 'aresample=' + rate].join(',') + '[o]';
        // 3) громкость: пик или LUFS — сначала замер (быстрый проход без записи)
        let vol = [];
        const v = o.vol || {}, mode = v.mode == null ? 'keep' : v.mode;
        if (mode === 'gain' && +v.db) vol = ['volume=' + num(+v.db) + 'dB'].concat(+v.db > 0 ? ['alimiter=limit=0.891:level=false'] : []);
        else if (mode === 'peak' || typeof mode === 'number' || /^-\d+$/.test(String(mode))) {
          onStage('scan');
          const lufs = mode === 'peak' ? null : +mode;
          // замер — по тому же звуку, что пойдёт в файл (после разреза, каналов, темпа), на частоте источника
          const g = lufs == null ? head + [...body, 'volumedetect'].join(',') + '[o]' : head + [...body, 'aresample=' + srcRate].join(',') + ',' + meterGraph(srcRate).join(',') + '[o]';
          const r = await exec(x, [...input, '-filter_complex', g, '-map', '[o]', '-f', 'null', '-'], { timeTo: outDur, onProgress: (p) => onProgress(p * 0.3), signal, keep: lufs != null });
          const s = r.lines.join('\n'), mx = /max_volume:\s*(-?[\d.]+) dB/.exec(s);
          if (lufs == null) { if (mx) vol = ['volume=' + num(-1 - +mx[1]) + 'dB']; }
          else {
            const m = gateLufs(r.lines);
            if (isFinite(m.lufs)) {
              const gain = lufs - m.lufs, pk = m.peak == null ? 0 : m.peak;
              vol = ['volume=' + num(gain) + 'dB'];
              // после подъёма пик выше −1 дБ — лимитер (как toLevel в диктофоне), без подъёма громкости
              if (pk + gain > -1) vol.push('alimiter=limit=0.891:level=false:attack=5:release=50');
            }
          }
        }
        onStage('encode');
        const base = vol.length && (mode === 'peak' || typeof mode === 'number' || /^-\d+$/.test(String(mode))) ? 0.3 : 0;
        const r = await exec(x, [...input, '-filter_complex', graph(vol), '-map', '[o]', '-vn', '-sn', '-map_metadata', '-1', ...ARGS[o.fmt]({ kbps: +o.kbps || 192, bits: +o.bits || 16 }), '-ar', String(rate), '-y', out],
          { timeTo: outDur, onProgress: (p) => onProgress(base + p * (1 - base)), signal });
        let data = null;
        try { data = await x.readFile(out); } catch { /* нет файла */ }
        if (r.code !== 0 || !data || !data.length) throw Object.assign(new Error('ffmpeg ' + r.code), { reason: 'ffmpeg-run', log: r.lines.slice(-12).join('\n') });
        onProgress(1);
        return { data, dur: outDur, ext: EXT[o.fmt], rate };
      } finally {
        if (ff) { try { await x.deleteFile(out); } catch { /* нет */ } await unmount(x, m.dir); }
      }
    },
    // любой файл → { ch, sr } (запасной путь для мест, где нужен сам звук, а не файл)
    async decode(u8, info = {}) {
      const x = await load(), m = await mount(x, [{ blob: new Blob([u8]), name: 'in.' + (info.type || 'bin') }]);
      try {
        const r = await exec(x, ['-i', m.paths[0], '-vn', '-c:a', 'pcm_f32le', '-f', 'wav', '-y', '/dec.wav']);
        const wav = await x.readFile('/dec.wav').catch(() => null);
        await x.deleteFile('/dec.wav').catch(() => {});
        const w = wav && decodeWav(wav);
        if (r.code !== 0 || !w || !w.ch[0].length) throw Object.assign(new Error('empty'), { reason: 'decode', type: info.type });
        return { ch: w.ch, sr: w.sr, info };
      } finally { await unmount(x, m.dir); }
    },
    terminate: kill,
  };
}

// Есть ли ядро (файл на месте): url(rel) — адрес файла (пакет на телефоне или сборка); → true/false
export async function ffAvailable(url) {
  try { const r = await fetch(url(CORE), { method: 'HEAD' }); return r.ok; } catch { return false; }
}
