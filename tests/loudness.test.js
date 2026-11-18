// Громкость для нормализации пульта: потоковая LUFS совпадает с эталонной из vocal.js, поправка с пределами
import { describe, it, expect } from 'vitest';
import { measureLoudness, normGainDb, dbGain } from '../src/audio/loudness.js';
import { loudness } from '../src/audio/vocal.js';

const tone = (sr, sec, amp, f = 997) => Float32Array.from({ length: Math.round(sr * sec) }, (_, i) => amp * Math.sin((2 * Math.PI * f * i) / sr));

describe('громкость LUFS', () => {
  it('потоковая считает так же, как эталон (стерео, разная громкость кусков)', async () => {
    const sr = 22050, a = tone(sr, 3, 0.3), b = tone(sr, 3, 0.05), L = new Float32Array(a.length + b.length); L.set(a); L.set(b, a.length);
    const R = Float32Array.from(L, (v) => v * 0.8);
    const r = await measureLoudness([L, R], sr), ref = loudness([L, R], sr);
    expect(r.lufs).toBeCloseTo(ref, 2);
    expect(r.peak).toBeCloseTo(20 * Math.log10(0.3), 1);
  });
  it('синус 997 Гц с пиком −20 дБFS в обоих каналах ≈ −20 LUFS (стерео), вдвое тише — на 6 дБ ниже', async () => {
    const sr = 22050, x = tone(sr, 2, 0.1), y = tone(sr, 2, 0.05);
    const a = (await measureLoudness([x, x], sr)).lufs, b = (await measureLoudness([y, y], sr)).lufs;
    expect(a).toBeCloseTo(-20, 0); expect(a - b).toBeCloseTo(6.02, 1);
  });
  it('тишина и слишком короткая запись — без громкости, а не ошибка', async () => {
    expect((await measureLoudness([new Float32Array(44100 * 2)], 44100)).lufs).toBe(-Infinity);
    expect((await measureLoudness([tone(8000, 0.1, 0.5)], 8000)).lufs).toBe(-Infinity);
  });
  it('поправка: до цели, не больше +12 и −24, не выше потолка по пику', () => {
    expect(normGainDb(-22, -6, -16)).toBe(5);                 // тихий трек — подтянуть на 6, но потолок по пику: −1 − (−6) = 5
    expect(normGainDb(-10, -0.5, -16)).toBe(-6);              // громкий — убавить
    expect(normGainDb(-40, -30, -16)).toBe(12);               // совсем тихий — не больше +12
    expect(normGainDb(0, 0, -16)).toBe(-16);
    expect(normGainDb(-60, -80, -16, { maxUp: 12 })).toBe(12);
    expect(normGainDb(null, null)).toBe(0); expect(normGainDb(-Infinity, 0)).toBe(0);
    expect(dbGain(-6.02)).toBeCloseTo(0.5, 2);
  });
});
