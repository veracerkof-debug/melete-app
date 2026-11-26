import { describe, it, expect } from 'vitest';
import { chordText } from '../src/music/chordtext.js';

const ch = [{ t: 0, d: 2, c: 'A:min' }, { t: 2, d: 2, c: 'F' }, { t: 4, d: 2, c: 'C' }, { t: 6, d: 2, c: 'G' }, { t: 8, d: 2, c: null }, { t: 10, d: 2, c: 'A:min' }];
describe('аккорды в текст', () => {
  it('по тактам с метками', () => {
    const t = chordText({ chords: ch, downbeats: [0, 2, 4, 6, 10] }, { marks: [{ t: 0, name: 'Куплет' }], perLine: 4 });
    expect(t).toBe('Куплет\n| Am | F | C | G |\n| Am |');
  });
  it('поверх строк текста — «[Am]слово»', () => {
    const t = chordText({ chords: ch }, { lines: [{ t: 0, text: 'раз два три четыре' }, { t: 4, text: 'пять шесть' }] });
    expect(t).toBe('[Am]раз два [F]три четыре\n[C][G]пять [Am]шесть');
  });
  it('без долей и текста — лентой, без «нет аккорда»', () => {
    expect(chordText({ chords: ch }, {})).toBe('Am F C G Am');
    expect(chordText({ chords: [] }, {})).toBe('');
  });
});
