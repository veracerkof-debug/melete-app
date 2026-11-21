import { describe, it, expect } from 'vitest';
import { readCorner, cornerPad } from '../src/core/corner.js';

describe('скруглённые углы', () => {
  it('нет моста или нет радиуса — 0', () => {
    expect(readCorner({})).toBe(0);
    expect(readCorner({ MeleteCorner: {} })).toBe(0);
    expect(readCorner({ MeleteCorner: { radius: () => { throw new Error('x'); } } })).toBe(0);
    expect(readCorner({ MeleteCorner: { radius: () => NaN } })).toBe(0);
  });
  it('радиус из моста, не больше 60', () => {
    expect(readCorner({ MeleteCorner: { radius: () => 38.5 } })).toBe(38.5);
    expect(readCorner({ MeleteCorner: { radius: () => 400 } })).toBe(60);
  });
  it('отступ — около 0,3 радиуса', () => {
    expect(cornerPad(0)).toBe(0);
    expect(cornerPad(40)).toBe(12);
    expect(cornerPad(-5)).toBe(0);
  });
});
