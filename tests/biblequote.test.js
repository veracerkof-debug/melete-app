import { describe, it, expect } from 'vitest';
import { refOf, quoteText, normQ, hitHTML } from '../src/modules/bible/quote.js';

describe('Библия: цитата и поиск', () => {
  it('номера стихов — диапазонами', () => {
    expect(refOf([18, 16, 17, 20])).toBe('16–18, 20');
    expect(refOf([5])).toBe('5');
    expect(refOf([3, 3, 4])).toBe('3–4');
  });
  it('цитата: один стих без номера, несколько — с номерами, ссылка и перевод', () => {
    const T = { 16: 'Ибо так возлюбил Бог мир…', 17: 'Ибо не послал Бог…' };
    expect(quoteText([16], (v) => T[v], 'От Иоанна 3', 'Синодальный перевод')).toBe('Ибо так возлюбил Бог мир…\n— От Иоанна 3:16 (Синодальный перевод)');
    expect(quoteText([17, 16], (v) => T[v], 'От Иоанна 3', 'СП')).toBe('16 Ибо так возлюбил Бог мир… 17 Ибо не послал Бог…\n— От Иоанна 3:16–17 (СП)');
  });
  it('поиск без учёта регистра и ё', () => {
    const esc = (x) => x;
    expect(hitHTML('И пришёл Он', normQ('ПРИШЕЛ'), esc)).toBe('И <mark>пришёл</mark> Он');
    expect(hitHTML('нет', normQ('да'), esc)).toBeNull();
  });
});
