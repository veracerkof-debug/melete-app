import { describe, it, expect } from 'vitest';
import { score, TOOL_KEYS } from '../src/core/screens/palette.js';

describe('компьютер: поиск и клавиши', () => {
  it('совпадение: начало слова весомее вхождения; ё = е; пусто — всё', () => {
    expect(score('тюн', 'Тюнер')).toBe(4);
    expect(score('leaves', 'Autumn Leaves')).toBe(3);
    expect(score('еры', 'Тюнер')).toBe(0);
    expect(score('нер', 'Тюнер')).toBe(2);
    expect(score('', 'что угодно')).toBe(1);
    expect(score('елка', 'Ёлка')).toBe(4);
  });
  it('клавиши инструментов не повторяются и не заняты Ctrl-сочетаниями', () => {
    const v = Object.values(TOOL_KEYS); expect(new Set(v).size).toBe(v.length);
    v.forEach((k) => expect(k).toMatch(/^[a-z]$/));
  });
});
