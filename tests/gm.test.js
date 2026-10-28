// Банк SONiVOX (SoundFont 2): разбор, все 128 программ GM и наборы ударных, зоны по клавишам, высота и петля
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parseSf2, zonesFor, presetOf, pitchOf, addrOf, tcSec, cbGain, G } from '../src/audio/sf2.js';

const raw = readFileSync(new URL('../node_modules/@coderline/alphatab/dist/soundfont/sonivox.sf2', import.meta.url));
const bank = parseSf2(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));

describe('банк SONiVOX', () => {
  it('128 программ GM и наборы ударных', () => {
    for (let p = 0; p < 128; p++) expect(bank.presets.some((x) => x.bank === 0 && x.program === p), 'программа ' + p).toBe(true);
    expect(bank.presets.filter((x) => x.bank === 128).map((x) => x.program)).toEqual([0, 8, 32, 40]);
  });
  it('на любую ноту каждой программы есть сэмпл в пределах данных', () => {
    for (let p = 0; p < 128; p++) for (const k of [36, 60, 84]) {
      const zs = zonesFor(bank, presetOf(bank, 0, p), k, 100);
      expect(zs.length, p + ':' + k).toBeGreaterThan(0);
      zs.forEach(({ sample, g }) => { const a = addrOf(sample, g); expect(a.s).toBeGreaterThanOrEqual(0); expect(a.e).toBeLessThanOrEqual(bank.pcm.length); if (a.loop) expect(a.le).toBeGreaterThan(a.ls); });
    }
  });
  it('высота: сэмпл звучит нотой, на которую нажали', () => {
    const [z] = zonesFor(bank, presetOf(bank, 0, 0), 60, 100);
    const root = z.g[G.rootKey] >= 0 ? z.g[G.rootKey] : z.sample.root;
    expect(pitchOf(z.sample, z.g, root + 12) - pitchOf(z.sample, z.g, root)).toBeCloseTo(12, 5);
  });
  it('единицы: тайм-центы и сантибелы', () => {
    expect(tcSec(0)).toBe(1); expect(tcSec(1200)).toBe(2); expect(cbGain(0)).toBe(1); expect(cbGain(500)).toBeCloseTo(0.1, 5);
  });
  it('не банк — ошибка', () => { expect(() => parseSf2(new ArrayBuffer(16))).toThrow(); });
});
