import { describe, it, expect } from 'vitest';
import { dayTone } from '../src/core/screens/home.js';

describe('оттенок кружка дня', () => {
  it('нет занятий — 0', () => { expect(dayTone(0, 3600)).toBe(0); expect(dayTone(-5, 3600)).toBe(0); });
  it('нет цели — как раньше: просто «занимались» (3)', () => { expect(dayTone(60, 0)).toBe(3); expect(dayTone(60, NaN)).toBe(3); });
  it('доля дневной нормы: <40 % — 1, до 80 % — 2, норма — 3', () => {
    const d = 3600;
    expect(dayTone(d * 0.1, d)).toBe(1); expect(dayTone(d * 0.39, d)).toBe(1);
    expect(dayTone(d * 0.4, d)).toBe(2); expect(dayTone(d * 0.79, d)).toBe(2);
    expect(dayTone(d * 0.8, d)).toBe(3); expect(dayTone(d * 3, d)).toBe(3);
  });
});
