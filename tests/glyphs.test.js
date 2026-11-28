import { describe, it, expect } from 'vitest';
import { lyricsHTML, chordsIn, fixGlyphs, badIn } from '../src/music/lyrics.js';

const cyr = (s) => s.replace(/E/g, 'Е').replace(/A/g, 'А').replace(/H/g, 'Н').replace(/C/g, 'С').replace(/x/g, 'х');
describe('аккорды с русскими буквами и смешанные строки (текст из Holyrics, 28.11.2026)', () => {
  it('в скобках: русские Е А Н С читаются как аккорды', () => {
    expect(chordsIn(cyr('[E][A][H][C#m]'))).toEqual(['E', 'A', 'H', 'C#m']);
    expect(lyricsHTML(cyr('[E][A][H]'), 0, null)).toBe('<b class="chd">E</b><b class="chd">A</b><b class="chd">H</b>');
  });
  it('строка из одних аккордов, часть в скобках, часть без', () => {
    expect(lyricsHTML('[E] [A] C#m [H] [x2]', 0, null)).toBe('<b class="chd">E</b> <b class="chd">A</b> <b class="chd">C♯m</b> <b class="chd">H</b> [x2]');
    expect(lyricsHTML(cyr('[E][A]C#m[H][x2]'), 0, null)).toContain('<b class="chd">C♯m</b>');
    expect(lyricsHTML('E/G#[A]C#m[H]', 0, null)).toBe('<b class="chd">E/G♯</b><b class="chd">A</b><b class="chd">C♯m</b><b class="chd">H</b>');
  });
  it('слова песни не превращаются в аккорды: «А», «Е», «В», строка со словами и скобочным аккордом', () => {
    expect(fixGlyphs('А ты Е В\nНа тебя быть')).toBe('А ты Е В\nНа тебя быть');
    expect(lyricsHTML('[Am]Слава Тебе', 0, null)).toBe('<b class="chd">Am</b>Слава Тебе');
    expect(lyricsHTML('Е А', 0, null)).toBe('Е А'); // одиночные русские буквы без скобок — слова
  });
  it('длина текста при замене не меняется; ошибочные аккорды по-прежнему считаются', () => {
    const t = cyr('[E] [A] C#m [H] [x2]'); expect(fixGlyphs(t).length).toBe(t.length);
    expect(badIn('[Amj7]')).toBe(1);
  });
});
