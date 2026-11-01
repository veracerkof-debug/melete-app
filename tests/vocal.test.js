// Голосовая цепочка диктофона: срез, экспандер, де-эссер, компрессор, лимитер, громкость BS.1770, режимы
import { describe, it, expect } from 'vitest';
import { VocalDSP } from '../src/audio/wl/vocal.worklet.js';
import { vocalPre, vocalLim, loudness, toLevel, modeParams, normalizeVoiceSet, editVoiceSet, isRaw, MODE_IDS, MODES, normalizeVocal, VOCAL_FLAT } from '../src/audio/vocal.js';

const SR = 48000;
const tone = (f, sec, amp = 0.5) => Float32Array.from({ length: Math.round(SR * sec) }, (_, i) => amp * Math.sin((2 * Math.PI * f * i) / SR));
let seed = 11; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
const noise = (sec, amp) => Float32Array.from({ length: Math.round(SR * sec) }, () => rnd() * amp);
const rms = (x, a = 0, b = x.length) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / (b - a)); };
const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const cat = (...xs) => { const o = new Float32Array(xs.reduce((s, x) => s + x.length, 0)); let p = 0; xs.forEach((x) => { o.set(x, p); p += x.length; }); return o; };

describe('голосовая цепочка', () => {
  it('выключенная цепочка — исходник без изменений', () => {
    const x = cat(tone(220, 0.3), noise(0.3, 0.2));
    const y = vocalPre([Float32Array.from(x)], SR, VOCAL_FLAT)[0];
    for (let i = 0; i < x.length; i += 997) expect(y[i]).toBeCloseTo(x[i], 6);
  });
  it('срез низа: гул 40 Гц уходит, голос остаётся', () => {
    const p = { hp: 100, hpSlope: 24 };
    expect(rms(vocalPre([tone(40, 1)], SR, p)[0], SR / 2)).toBeLessThan(0.02);
    expect(rms(vocalPre([tone(1000, 1)], SR, p)[0], SR / 2)).toBeGreaterThan(0.34);
  });
  it('экспандер: тихий шум в паузе тише на глубину, голос не трогается', () => {
    const x = cat(noise(1, 0.002), tone(300, 1, 0.3));
    const y = vocalPre([x], SR, { expThr: -45, expRatio: 3, expRange: 20 })[0];
    const quiet = rms(y, SR * 0.4, SR * 0.9) / 0.002 / 0.577;
    expect(20 * Math.log10(quiet)).toBeLessThan(-17);
    expect(rms(y, SR * 1.3, SR * 1.9)).toBeGreaterThan(0.2);
  });
  it('де-эссер: шипящая 7 кГц приглушена, гласная 300 Гц — нет', () => {
    const p = { dsFreq: 6500, dsAmt: 0.8 };
    const s = vocalPre([tone(7000, 0.5, 0.3)], SR, p)[0], v = vocalPre([tone(300, 0.5, 0.3)], SR, p)[0];
    expect(rms(s, SR * 0.2) / rms(tone(7000, 0.5, 0.3), SR * 0.2)).toBeLessThan(0.6);
    expect(rms(v, SR * 0.2) / rms(tone(300, 0.5, 0.3), SR * 0.2)).toBeGreaterThan(0.97);
  });
  it('компрессор сближает тихое и громкое', () => {
    const x = cat(tone(440, 1, 0.03), tone(440, 1, 0.9));
    const before = rms(x, SR * 1.3, SR * 1.9) / rms(x, SR * 0.3, SR * 0.9);
    const y = vocalPre([Float32Array.from(x)], SR, { compThr: -30, compRatio: 4, compAtt: 5, compRel: 100 })[0];
    const after = rms(y, SR * 1.3, SR * 1.9) / rms(y, SR * 0.3, SR * 0.9);
    expect(after).toBeLessThan(before / 2.5);
  });
  it('лимитер: выше потолка не бывает, тихое не трогается', () => {
    const x = cat(tone(100, 0.3, 0.2), tone(3000, 0.05, 1.8), tone(100, 0.5, 0.2));
    const y = vocalLim([Float32Array.from(x)], SR, { limOn: 1, lim: -1 })[0];
    expect(peak(y)).toBeLessThanOrEqual(Math.pow(10, -1 / 20) + 1e-6);
    // через 300 мс после пика — снова как было (с учётом задержки 5 мс)
    expect(rms(y, Math.round(SR * 0.7), Math.round(SR * 0.8))).toBeCloseTo(0.2 / Math.SQRT2, 2);
  });
  it('по кускам — то же, что целиком (вживую = в файле)', () => {
    const x = cat(noise(0.2, 0.01), tone(5000, 0.2, 0.4), tone(200, 0.3, 0.8));
    const p = modeParams('radio');
    const a = vocalPre([Float32Array.from(x)], SR, p)[0];
    const d = new VocalDSP(SR, 1, 'pre'); d.set(p);
    const b = Float32Array.from(x);
    for (let i = 0; i < b.length; i += 128) d.process([b.subarray(i, i + 128)], Math.min(128, b.length - i));
    for (let i = 0; i < a.length; i += 331) expect(b[i]).toBeCloseTo(a[i], 5);
  });
});

describe('громкость BS.1770', () => {
  it('синус 1 кГц с пиком −20 дБFS в одном канале ≈ −23 LUFS', () => {
    expect(loudness([tone(1000, 3, 0.1)], SR)).toBeCloseTo(-23, 0.5);
  });
  it('тишина — −∞; стерео громче моно на 3 дБ', () => {
    expect(loudness([new Float32Array(SR)], SR)).toBe(-Infinity);
    const m = loudness([tone(1000, 2, 0.1)], SR), s = loudness([tone(1000, 2, 0.1), tone(1000, 2, 0.1)], SR);
    expect(s - m).toBeCloseTo(3.01, 1);
  });
  it('до цели −16 LUFS, пики не выше потолка', () => {
    const ch = [cat(tone(440, 2, 0.05), tone(440, 0.02, 0.15), tone(440, 2, 0.05))];
    toLevel(ch, SR, -16, { limOn: 1, lim: -1 });
    expect(loudness(ch, SR)).toBeGreaterThan(-17);
    expect(peak(ch[0])).toBeLessThanOrEqual(Math.pow(10, -1 / 20) + 1e-6);
  });
  it('тихую запись с редким громким пиком лимитер не душит больше 6 дБ', () => {
    const ch = [cat(tone(440, 3, 0.002), tone(440, 0.05, 0.9), tone(440, 3, 0.002))];
    const r = toLevel(ch, SR, -14, { limOn: 1, lim: -1 });
    expect(r.gain).toBeLessThanOrEqual(-1 - 20 * Math.log10(0.9) + 6 + 0.01);
  });
});

describe('режимы', () => {
  it('у каждого режима параметры в пределах; «Как есть» — ничего', () => {
    MODE_IDS.forEach((id) => expect(normalizeVocal(MODES[id].p)).toEqual(modeParams(id)));
    expect(isRaw({ mode: 'raw' })).toBe(true);
    expect(isRaw({ mode: 'music' })).toBe(false);
  });
  it('правка — «Свой»; вернул как было — снова режим', () => {
    let v = normalizeVoiceSet({ mode: 'speech' });
    v = editVoiceSet(v, 'compRatio', 6);
    expect(v.mode).toBe('own');
    expect(v.p.compRatio).toBe(6);
    v = editVoiceSet(v, 'compRatio', MODES.speech.p.compRatio);
    expect(v.mode).toBe('speech');
    expect(normalizeVoiceSet({ mode: 'нет такого' }).mode).toBe('music');
    expect(normalizeVoiceSet({ mode: 'own', p: { hp: 9999 }, level: -19 })).toMatchObject({ mode: 'own', level: -19, p: { hp: 300 } });
  });
});
