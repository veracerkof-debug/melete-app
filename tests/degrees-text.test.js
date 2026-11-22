// Ступени в тексте песни (слово автора 22.11.2026): подсветка непонятого, вид «аккорд и ступень», разметка редактора
import { it, expect } from 'vitest';
import { lyricsHTML, markupHTML, badIn } from '../src/music/lyrics.js';

const C = { pc: 0, minor: false }, Am = { pc: 9, minor: true };
it('ступени в скобках и строкой — аккордами в тональности, в миноре — от натурального минора', () => {
  expect(lyricsHTML('Дом [vi] где [IV]ты', 0, C)).toContain('>Am<');
  expect(lyricsHTML('i  III  VII', 0, Am)).toMatch(/>Am<.*>C<.*>G</s); // ля минор: i — Am, III — C, VII — G
});
it('вид «аккорд и ступень вместе»: аккорд и под ним ступень', () => {
  const h = lyricsHTML('I V vi', 0, C, { view: 'both' });
  expect(h).toContain('<b class="chd both">C<i>I</i></b>');
  expect(h).toContain('Am<i>vi</i>');
  expect(lyricsHTML('Am F', 0, C, { view: 'both' })).toContain('Am<i>vi</i>'); // и для буквенных аккордов
});
it('не распознано: опечатки подсвечиваются, слова и повторы — нет', () => {
  const t = 'I V IIII\nСвя[IV]той [x2] [Припев] [Vv] [Amj7] [Chorus] [Bridge] [Intro]\nI love you';
  expect(badIn(t)).toBe(3); // IIII, [Vv], [Amj7]
  const h = lyricsHTML(t, 0, C);
  expect(h).toContain('<b class="chd bad" title="?">IIII</b>');
  expect(h).not.toContain('>x2<'); expect(h).toContain('[x2]'); expect(h).toContain('[Chorus]');
  expect(h).toContain('I love you'); // обычная строка не тронута
});
it('разметка редактора: текст дословно, распознанное — mark.c, непонятое — mark.x, всё экранировано', () => {
  const m = markupHTML('I V\n<b> а [IV] и [Vv] &');
  expect(m).toContain('<mark class="c">I</mark>');
  expect(m).toContain('<mark class="c">[IV]</mark>'); expect(m).toContain('<mark class="x">[Vv]</mark>');
  expect(m.replace(/<\/?mark[^>]*>/g, '')).toBe('I V\n&lt;b&gt; а [IV] и [Vv] &amp;');
});

import { chordsIn } from '../src/music/lyrics.js';
import { detectKey } from '../src/music/transpose.js';
it('обычные аккорды в скобках → тональность по гармонии → ступени (обратная конвертация)', () => {
  const view = (t) => { const k = detectKey(chordsIn(t)); return lyricsHTML(t, 0, k, { view: 'degrees' }).replace(/<[^>]+>/g, ''); };
  expect(view('[C]а [G]б [Am]в [F]г')).toBe('Iа Vб viв IVг');
  expect(view('[Am]а [F]б [C]в [G]г')).toBe('iа VIб IIIв VIIг'); // от минора: натуральный минор
  expect(view('[Am]а [Dm]б [E7]в [Am]г')).toBe('iа ivб V7в iг');
  expect(view('[D]а [A]б [Bm]в [G]г')).toBe('Iа Vб viв IVг');
});
