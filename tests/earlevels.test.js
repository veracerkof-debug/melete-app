import { describe, it, expect } from 'vitest';
import { LEVEL_PLAN, LEVEL_COUNT, applyLevel, clampLevel } from '../src/music/earlevels.js';
import { DRILL_IDS, normalizeEar, generate } from '../src/music/ear.js';

describe('10 уровней тренажёра слуха', () => {
  it('десять уровней, упражнения существуют, наборы — не меньше двух вариантов', () => {
    expect(LEVEL_PLAN.length).toBe(LEVEL_COUNT);
    LEVEL_PLAN.forEach((p) => { expect(DRILL_IDS).toContain(p.drill); Object.values(p.sets).forEach((s) => expect(s.length).toBeGreaterThanOrEqual(2)); });
  });
  it('уровень растёт — набор не сужается внутри одного упражнения', () => {
    const iv = LEVEL_PLAN.filter((p) => p.drill === 'iv').map((p) => p.sets.iv.length);
    expect(iv).toEqual([...iv].sort((a, b) => a - b));
  });
  it('applyLevel: ставит наборы и возвращает упражнение; границы', () => {
    const e = normalizeEar({});
    expect(applyLevel(e, 3)).toBe('ch');
    expect(e.chSet).toEqual(['maj', 'min']);
    expect(e.lv10).toBe(3);
    expect(applyLevel(e, 99)).toBe('dg');
    expect(e.lv10).toBe(10);
    expect(clampLevel(0)).toBe(1);
    expect(clampLevel('x')).toBe(1);
  });
  it('на каждом уровне вопрос генерируется', () => {
    for (let n = 1; n <= LEVEL_COUNT; n++) {
      const e = normalizeEar({}); const drill = applyLevel(e, n);
      expect(() => generate(drill, e, () => 0.37)).not.toThrow();
    }
  });
});
