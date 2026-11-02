// Битые настройки на устройстве (ручная правка, сбой записи, старая версия): модули не падают и не показывают NaN
import { describe, it, expect } from 'vitest';
import { loadDevice, LS_T } from '../src/core/device.js';
import { normalizeTuner } from '../src/music/tuning.js';
import { spell } from '../src/music/notes.js';
import { normalizeEar } from '../src/music/ear.js';
import { pianoPatch, pianoLayer, PRESETS } from '../src/audio/synth.js';

const mem = (o) => { const m = new Map([[LS_T, JSON.stringify(o)]]); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

describe('битые настройки', () => {
  it('пианино, пэды, микшер — числа в пределах', () => {
    for (const bad of [null, 'x', -1e9, 1e9]) {
      const d = loadDevice(mem({ piano: { oct: bad, size: bad }, drone: { pc: bad, oct: bad, vol: bad, layers: bad }, mix: { piano: bad } }));
      expect(d.piano.oct).toBe(4); expect(d.piano.size).toBe(8);
      expect(d.drone.pc).toBe(9); expect(d.drone.vol).toBe(0.7); expect(typeof d.drone.layers).toBe('object');
      expect(d.mix.piano).toBe(0.9);
    }
    expect(loadDevice(mem({ piano: { oct: 2, size: 12 } })).piano).toMatchObject({ oct: 2, size: 12 });
  });
  it('тюнер: A4 null или мусор — 440', () => {
    [null, 'x', -5, 1e9].forEach((a4) => expect(normalizeTuner({ a4 }).a4).toBe(440));
    expect(normalizeTuner({ a4: 432 }).a4).toBe(432);
  });
  it('правописание нот: битая тональность — от C', () => {
    expect(spell(undefined, [0, 4, 7], [0, 2, 4])).toEqual(['C', 'E', 'G']);
    expect(spell('x', [0], [0])).toEqual(['C']);
  });
  it('тренажёр слуха: уровень и наборы', () => {
    const e = normalizeEar({ level: 'x', ivSet: {} });
    expect(e.level).toBe('easy'); expect(Array.isArray(e.ivSet)).toBe(true);
  });
  it('звук пианино: битые ручки — из пресета', () => {
    const p = pianoPatch({ syn: { preset: 'piano', kind: 'grand', name: 'мой', rel: 'x', sus: -1e9 } });
    expect(p.rel).toBe(PRESETS.piano.rel); expect(Number.isFinite(p.sus)).toBe(true);
    expect(pianoLayer({ layer: 'x' })).toBe(null);
  });
});
