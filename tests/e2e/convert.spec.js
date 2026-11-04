// Конвертер: движок в браузере (MP3, FLAC, AIFF, WAV, Opus — разрез, громкость, края), экран — файлы из памяти
// устройства → формат → «Конвертировать» → результат в медиатеке (поле conv), строка «готово» с «Поделиться».
import { test, expect } from './melete.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

// WAV 16 бит, стерео, синус — без внешних программ
function wavFile(sec = 2, sr = 44100) {
  const n = sec * sr, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { const v = Math.round(Math.sin((2 * Math.PI * 440 * i) / sr) * 12000); b.writeInt16LE(v, 44 + i * 4); b.writeInt16LE(v, 46 + i * 4); }
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cv-')), 'tone.wav');
  fs.writeFileSync(p, b);
  return p;
}

test('движок: MP3, FLAC, AIFF, WAV, Opus — файлы верного вида и длины', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await melete.open();
  const res = await page.evaluate(async () => {
    const { convert } = await import('/src/audio/convert/convert.js');
    const { sniff } = await import('/src/audio/convert/containers.js');
    const { encodeWav } = await import('/src/audio/voicefx.js');
    const sr = 44100, n = sr * 3, L = Float32Array.from({ length: n }, (_, i) => 0.4 * Math.sin(2 * Math.PI * 440 * i / sr));
    const wav = new Blob([encodeWav([L, L], sr, 16)], { type: 'audio/wav' }), out = {};
    for (const fmt of ['mp3', 'flac', 'aiff', 'wav', 'opus']) {
      const r = await convert([{ blob: wav, name: 'tone.wav' }], { fmt, kbps: 128, bits: 16, rate: 0, chan: 'keep', speed: 1, semi: 0, vol: { mode: 'peak' }, trim: [0.5, 2.5], fadeMs: 20 });
      out[fmt] = { name: r[0].name, dur: r[0].dur, type: sniff(new Uint8Array(await r[0].blob.arrayBuffer())).type };
    }
    return out;
  });
  expect(res.mp3).toMatchObject({ name: 'tone.mp3', type: 'mp3' });
  expect(res.flac).toMatchObject({ name: 'tone.flac', type: 'flac', dur: 2 });
  expect(res.aiff).toMatchObject({ name: 'tone.aiff', type: 'aiff', dur: 2 });
  expect(res.wav).toMatchObject({ type: 'wav', dur: 2 });
  expect(res.opus).toMatchObject({ name: 'tone.ogg', type: 'ogg' });
  expect(errors).toEqual([]);
});

test('экран: из файлов → FLAC → в медиатеке; «Поделиться как…» в меню медиатеки', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await melete.open();
  await melete.free('F', ['convert']);
  await page.waitForSelector('.cvm .cvempty');
  const fc = page.waitForEvent('filechooser');
  await melete.click('.cvm [data-x="files"]');
  await (await fc).setFiles([wavFile()]);
  await expect(page.locator('.cvm .cvc')).toHaveCount(1);
  await melete.click('.cvm [data-fmt="flac"]');
  await melete.click('.cvm [data-x="go"]');
  await expect(page.locator('.cvm .cvc.done')).toHaveCount(1, { timeout: 60_000 });
  await expect(page.locator('.cvm .cvc.done [data-share]')).toHaveCount(1);
  const lib = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('practice-audio'); r.onsuccess = () => { const q = r.result.transaction('tracks').objectStore('tracks').getAll(); q.onsuccess = () => res(q.result.filter((x) => x.conv).map((x) => [x.name, x.conv.fmt])); }; r.onerror = () => res([]); }));
  expect(lib).toEqual([['tone.flac', 'flac']]);
  expect(errors).toEqual([]);
});

// FFmpeg «файл → файл» (пакет на телефоне, встроен на компьютере): 3 минуты WAV → MP3 с разрезом и −16 LUFS,
// длина результата — по самому файлу. Нет ядра FFmpeg в этой сборке (CI без моделей) — пропуск.
test('FFmpeg: длинная запись без пределов, разрез и громкость по LUFS', async ({ page, melete, errors }) => {
  test.setTimeout(300_000);
  await melete.open();
  const has = await page.evaluate(() => fetch('models/ffmpeg/ffmpeg-core.js', { method: 'HEAD' }).then((r) => r.ok).catch(() => false));
  test.skip(!has, 'нет ядра FFmpeg (npm run models)');
  const r = await page.evaluate(async () => {
    const { createFFmpeg } = await import('/src/audio/convert/ffmpeg.js');
    const { convert } = await import('/src/audio/convert/convert.js');
    const { encodeWav, decodeWav } = await import('/src/audio/voicefx.js');
    const { loudness } = await import('/src/audio/vocal.js');
    const sr = 48000, n = sr * 180, L = new Float32Array(n);
    for (let i = 0; i < n; i++) L[i] = 0.3 * Math.sin(2 * Math.PI * 330 * i / sr) * (0.6 + 0.4 * Math.sin(i / sr));
    const blob = new Blob([encodeWav([L, L], sr, 16)], { type: 'audio/wav' });
    const ff = createFFmpeg((rel) => new URL(rel, document.baseURI).href);
    const base = { kbps: 192, bits: 16, rate: 0, chan: 'keep', speed: 1, semi: 0, gap: 0, fadeMs: 20 };
    const mp3 = (await convert([{ blob, name: 'take.wav' }], { ...base, fmt: 'mp3', trim: [30, null], vol: { mode: -16 } }, { ffmpeg: ff }))[0];
    const wav = (await convert([{ blob, name: 'take.wav' }], { ...base, fmt: 'wav', trim: [0, 60], vol: { mode: -16 } }, { ffmpeg: ff }))[0];
    const p = await ff.probe(mp3.blob, mp3.name);
    const w = decodeWav(new Uint8Array(await wav.blob.arrayBuffer()));
    ff.terminate();
    return { mp3: [mp3.name, Math.round(p.dur)], wavDur: Math.round(w.ch[0].length / w.sr), lufs: +loudness(w.ch, w.sr).toFixed(1) };
  });
  expect(r.mp3).toEqual(['take.mp3', 150]);
  expect(r.wavDur).toBe(60);
  expect(Math.abs(r.lufs + 16)).toBeLessThan(0.3);
  expect(errors).toEqual([]);
});
