import { describe, it, expect } from 'vitest';
import { shortName } from '../src/modules/bible/trname.js';
import { renderVerse, leadBreak } from '../src/core/mybible-study.js';

describe('Библия: названия переводов', () => {
  it('известные — сокращением, год — двумя цифрами; длинное имя не показывается целиком', () => {
    expect(shortName({ name: 'Святая Библия: Современный перевод', meta: { abbr: 'Святая Библия Современный перевод' } })).toBe('NRT');
    expect(shortName({ name: 'Святая Библия: Современный перевод', meta: { file: 'NRT2023.SQLite3', abbr: 'NRT2023' } })).toBe('NRT 23');
    expect(shortName({ name: 'Синодальный перевод', meta: {} })).toBe('RST');
    expect(shortName({ name: 'Что-то своё', meta: { abbr: 'MYB' } })).toBe('MYB'); // короткое слитное сокращение модуля — как есть
    expect(shortName({ name: 'Библия Кулакова Новый Завет', meta: { abbr: 'Библия Кулакова Новый Завет' } }).length).toBeLessThanOrEqual(6);
  });
});
describe('Библия: абзац в начале стиха', () => {
  it('<pb/> до текста уходит перед номер стиха, а не после него', () => {
    expect(leadBreak('<pb/><J>«Не судите')).toBe(true); expect(leadBreak('<J><pb/>«Не судите')).toBe(true); expect(leadBreak('Текст<pb/>дальше')).toBe(false);
    expect(renderVerse('<pb/><J>«Не судите</J>')).not.toContain('bpbrk');
    expect(renderVerse('Текст<pb/>дальше')).toContain('bpbrk'); // в середине стиха абзац остаётся
    expect(renderVerse('а<br/>б')).toContain('<br>');
  });
});
