import { describe, it, expect } from 'vitest';
import { normalizeMix, createMixer } from '../src/audio/mixer.js';

describe('общая громкость (жест двумя пальцами)', () => {
  it('по умолчанию 1; мусор и выход за границы возвращаются в 1', () => {
    expect(normalizeMix({}).master).toBe(1);
    expect(normalizeMix({ master: 5 }).master).toBe(1);
    expect(normalizeMix({ master: -1 }).master).toBe(1);
    expect(normalizeMix({ master: 0.4 }).master).toBe(0.4);
  });
  it('множитель на шины: value = громкость × общая; нуль глушит всё, mute по-прежнему сильнее', () => {
    const mx = { piano: 0.8 }, m = createMixer(mx);
    expect(m.value('piano')).toBeCloseTo(0.8);
    m.setMaster(0.5);
    expect(m.value('piano')).toBeCloseTo(0.4);
    expect(m.value('metro')).toBeCloseTo(0.5);
    m.setMaster(0);
    expect(m.value('metro')).toBe(0);
    m.setMaster(1.7); expect(m.master()).toBe(1);
  });
});
