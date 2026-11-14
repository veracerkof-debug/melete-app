// Минимальный размер окна инструмента (слово автора 14.11.2026): settle переставляет, fixWS не оставляет мелких окон
import { describe, it, expect } from 'vitest';
import { settle, tooSmall, fixWS, fits } from '../src/core/workspace.js';

const MIN = { piano: 'half', theory: 'quarter', studio: 'full' };
const minOf = (id) => MIN[id];
const ws = (layout, panes) => ({ layout, panes, focus: 0, sub: {}, ratio: 0.5 });

describe('minSize', () => {
  it('fits: полоса < четверть < половина < весь экран', () => {
    expect(fits('half', 'quarter')).toBe(false);
    expect(fits('quarter', 'half')).toBe(true);
    expect(fits(undefined, 'strip')).toBe(true);
  });
  it('пианино в четверти — меняется местами с тем, кому четверть подходит', () => {
    expect(tooSmall(ws('HH', ['metro', 'piano']), minOf)).toEqual([]);
    const q = ws('QQ', ['piano', 'metro', 'tuner', 'drone']);
    expect(tooSmall(q, minOf)).toEqual([0]);
    expect(settle(q, minOf)).toBe(false); // половин в QQ нет — не вышло, раскладка прежняя
    expect(q.panes).toEqual(['piano', 'metro', 'tuner', 'drone']);
  });
  it('спрятанный подходящий инструмент занимает место', () => {
    const w = ws('HH', ['studio', 'metro', 'tuner']);
    expect(settle(w, minOf)).toBe(true);
    expect(w.panes).toEqual(['tuner', 'metro', 'studio']); // студия ушла в скрытые, на её месте — тот, кому половина подходит
  });
  it('fixWS: студия в половине — весь экран', () => {
    const w = fixWS(ws('HH', ['studio', 'metro']), ['studio', 'metro'], null, minOf);
    expect(w.layout).toBe('F');
    expect(w.panes[0]).toBe('studio');
  });
  it('fixWS: без minOf работает как раньше', () => {
    const w = fixWS(ws('HH', ['studio', 'metro']), ['studio', 'metro'], null);
    expect(w.layout).toBe('HH');
  });
});
