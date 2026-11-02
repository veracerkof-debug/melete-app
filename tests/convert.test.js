// Конвертер: свой кодировщик FLAC (без потерь — бит в бит, сверка декодером ffmpeg, если он есть), AIFF, Ogg Opus
// (страницы и CRC), определение формата и частоты по первым байтам, обработка (разрез, каналы, склейка, края, громкость)
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encodeFlac } from '../src/audio/convert/flac.js';
import { encodeAiff, oggOpus, sniff } from '../src/audio/convert/containers.js';
import { trim, channels, concat, fades } from '../src/audio/convert/convert.js';
import { encodeWav } from '../src/audio/voicefx.js';

const hasFF = (() => { try { execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch { return false; } })();
const tone = (n, sr, f = 440, a = 0.5) => Float32Array.from({ length: n }, (_, i) => a * Math.sin((2 * Math.PI * f * i) / sr));
let seed = 7;
const noise = (n, a) => Float32Array.from({ length: n }, () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5) * a);

describe('конвертер: FLAC', () => {
  it('заголовок и STREAMINFO: частота, каналы, разрядность, длина', () => {
    const f = encodeFlac([tone(1000, 48000)], 48000, 16);
    expect(String.fromCharCode(...f.subarray(0, 4))).toBe('fLaC');
    expect(sniff(f)).toMatchObject({ type: 'flac', rate: 48000 });
    expect(f[8] * 256 + f[9]).toBe(1000); // размер блока = вся запись (короче 4096)
  });
  it.skipIf(!hasFF)('без потерь: 16 и 24 бит, стерео с тишиной, шумом и полным размахом; > 128 кадров', () => {
    const dir = mkdtempSync(join(tmpdir(), 'flac-')), sr = 44100, n = 4096 * 140 + 77;
    const L = tone(n, sr), R = noise(n, 1.9); // R уходит за ±1 — обрезается на кодировании
    for (let i = 0; i < 5000; i++) R[i] = 0; // тишина — подрамка CONSTANT
    for (const bits of [16, 24]) {
      const p = join(dir, 'a' + bits + '.flac');
      writeFileSync(p, encodeFlac([L, R], sr, bits));
      const raw = execSync(`ffmpeg -v error -i ${p} -f s32le -acodec pcm_s32le -`, { maxBuffer: 1 << 29 });
      const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength), sc = bits === 24 ? 8388607 : 32767, sh = bits === 24 ? 256 : 65536;
      expect(raw.length / 8).toBe(n);
      let bad = 0;
      for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) { const x = (c ? R : L)[i], v = x > 1 ? 1 : x < -1 ? -1 : x; if (Math.round(v * sc) !== dv.getInt32((i * 2 + c) * 4, true) / sh) bad++; }
      expect(bad).toBe(0);
    }
  });
});

describe('конвертер: AIFF и Ogg Opus', () => {
  it('AIFF: частота в 80-битном виде читается обратно, размер данных верный', () => {
    for (const sr of [44100, 48000, 96000, 22050]) {
      const a = encodeAiff([tone(100, sr), tone(100, sr)], sr, 24);
      expect(sniff(a)).toEqual({ type: 'aiff', rate: sr });
      expect(a.length).toBe(54 + 100 * 2 * 3);
    }
  });
  it('Ogg Opus: страницы OggS с верной CRC, OpusHead, конец — granule = задержка + длина', () => {
    const pk = Array.from({ length: 120 }, () => ({ data: new Uint8Array(200).fill(3), samples: 960 }));
    const o = oggOpus(pk, { channels: 2, preSkip: 312, total: 115000 });
    expect(sniff(o)).toMatchObject({ type: 'ogg', codec: 'opus', rate: 48000 });
    // все страницы: CRC совпадает, последняя — с флагом конца и granule 312 + 115000
    let p = 0, last = null, pages = 0;
    const crcT = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i << 24; for (let k = 0; k < 8; k++) c = c & 0x80000000 ? (c << 1) ^ 0x04c11db7 : c << 1; crcT[i] = c >>> 0; }
    while (p < o.length) {
      expect(String.fromCharCode(...o.subarray(p, p + 4))).toBe('OggS');
      const segs = o[p + 26], lace = o.subarray(p + 27, p + 27 + segs), len = 27 + segs + lace.reduce((a, b) => a + b, 0);
      const pg = o.slice(p, p + len), dv = new DataView(pg.buffer), want = dv.getUint32(22, true); dv.setUint32(22, 0, true);
      let c = 0; for (let i = 0; i < pg.length; i++) c = ((c << 8) ^ crcT[((c >>> 24) ^ pg[i]) & 0xff]) >>> 0;
      expect(c).toBe(want);
      last = { flags: pg[5], granule: dv.getUint32(6, true) };
      p += len; pages++;
    }
    expect(pages).toBeGreaterThan(3);
    expect(last.flags & 4).toBe(4);
    expect(last.granule).toBe(312 + 115000);
  });
});

describe('конвертер: что за файл', () => {
  it('WAV, FLAC, AIFF — частота из заголовка', () => {
    expect(sniff(encodeWav([tone(10, 32000)], 32000, 16))).toEqual({ type: 'wav', rate: 32000 });
  });
  it.skipIf(!hasFF)('MP3, OGG Vorbis, M4A, WMA, AC3 — по первым байтам', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sniff-')), src = 'sine=frequency=440:duration=1:sample_rate=';
    const read = (args, ext) => { const p = join(dir, 'x.' + ext); execSync(`ffmpeg -v error -y -f lavfi -i ${args} ${p}`); return sniff(new Uint8Array(execSync(`cat ${p}`, { maxBuffer: 1 << 24 }))); };
    expect(read(src + '44100 -c:a libmp3lame', 'mp3')).toEqual({ type: 'mp3', rate: 44100 });
    expect(read(src + '22050 -c:a libmp3lame', 'mp3')).toEqual({ type: 'mp3', rate: 22050 });
    expect(read(src + '48000 -c:a libvorbis', 'ogg')).toMatchObject({ type: 'ogg', codec: 'vorbis', rate: 48000 });
    expect(read(src + '44100 -c:a aac', 'm4a')).toMatchObject({ type: 'mp4', codec: 'aac', rate: 44100 });
    expect(read(src + '44100 -c:a wmav2', 'wma').type).toBe('wma');
    expect(read(src + '48000 -c:a ac3', 'ac3').type).toBe('ac3');
  });
});

describe('конвертер: обработка', () => {
  it('разрез, каналы, склейка с паузой, плавные края', () => {
    const sr = 1000, a = [Float32Array.from({ length: 1000 }, () => 1)], b = [new Float32Array(500).fill(0.5), new Float32Array(500).fill(-0.5)];
    expect(trim(a, sr, 0.2, 0.7)[0].length).toBe(500);
    expect(trim(a, sr, 0.9)[0].length).toBe(100);
    expect(channels(b, 'mono')[0][0]).toBe(0);
    expect(channels(b, 'right')[0][0]).toBe(-0.5);
    expect(channels(a, 'stereo')).toHaveLength(2);
    const j = concat([a, b], sr, 0.25);
    expect(j).toHaveLength(2);
    expect(j[0].length).toBe(1000 + 250 + 500);
    expect(j[1][999]).toBe(1); // моно дублируется в оба канала
    expect(j[1][1100]).toBe(0); // пауза
    expect(j[1][1300]).toBe(-0.5);
    const f = fades([Float32Array.from({ length: 1000 }, () => 1)], sr, 100, 100)[0];
    expect(f[0]).toBe(0); expect(f[999]).toBe(0); expect(f[500]).toBe(1);
  });
});
