import { describe, it, expect } from 'vitest';
import { begMin, pathOrder, nextLessonOf, BEG_DEFAULT } from '../src/core/beginner.js';

const PATHS = { first: ['f1', 'f2', 'f3'], guitar: ['g1', 'g2'] };
describe('главная новичка', () => {
  it('время занятия: допустимое или 20 по умолчанию', () => {
    expect(begMin({})).toBe(BEG_DEFAULT);
    expect(begMin({ begMin: 45 })).toBe(45);
    expect(begMin({ begMin: 7 })).toBe(BEG_DEFAULT);
  });
  it('порядок путей: гитаристу — ещё курс гитары', () => {
    expect(pathOrder({ instruments: ['piano'] })).toEqual(['first']);
    expect(pathOrder({ instruments: ['guitar'] })).toEqual(['first', 'guitar']);
  });
  it('следующий урок — первый непройденный; счёт внутри своего пути', () => {
    expect(nextLessonOf(PATHS, ['first', 'guitar'], { f1: 1 })).toEqual({ id: 'f2', path: 'first', n: 2, total: 3, done: 1 });
    expect(nextLessonOf(PATHS, ['first', 'guitar'], { f1: 1, f2: 1, f3: 1 })).toMatchObject({ id: 'g1', path: 'guitar', n: 1, total: 2 });
    expect(nextLessonOf(PATHS, ['first'], { f1: 1, f2: 1, f3: 1 })).toBe(null);
  });
});
