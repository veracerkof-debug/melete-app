import { describe, it, expect } from 'vitest';
import { RLEVEL_PLAN, RLEVEL_COUNT, applyRLevel, clampRLevel } from '../src/music/rhythmlevels.js';
import { DRILLS, LEVELS, METERS, BARS, STRICT, genRhythm } from '../src/music/rhythm.js';

describe('10 уровней тренажёра ритма', () => {
  it('значения допустимы', () => {
    expect(RLEVEL_PLAN.length).toBe(RLEVEL_COUNT);
    RLEVEL_PLAN.forEach((p) => { expect(DRILLS).toContain(p.drill); expect(LEVELS).toContain(p.level); expect(METERS).toContain(p.meter); expect(BARS).toContain(p.bars); expect(Object.keys(STRICT)).toContain(p.strict); });
  });
  it('сложность не убывает по уровню ритма', () => {
    const l = RLEVEL_PLAN.map((p) => p.level);
    expect(l).toEqual([...l].sort((a, b) => a - b));
  });
  it('applyRLevel и границы; ритм на каждом уровне генерируется', () => {
    const e = {};
    expect(applyRLevel(e, 3)).toBe('read');
    expect(e.meter).toBe('4/4');
    expect(applyRLevel(e, 99)).toBe('poly');
    expect(clampRLevel(-4)).toBe(1);
    for (let n = 1; n <= RLEVEL_COUNT; n++) { const x = {}; applyRLevel(x, n); expect(() => genRhythm({ meter: x.meter, bars: x.bars, level: x.level, rnd: () => 0.41 })).not.toThrow(); }
  });
});
