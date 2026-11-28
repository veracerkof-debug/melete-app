import { describe, it, expect } from 'vitest';
import { readJava, simplify, isJavaStream } from '../src/core/javaser.js';
import { importSongs, fromHolyricsJava } from '../src/core/songimport.js';

// Образцы — настоящая сериализация Java (ObjectOutputStream): список из трёх ссылок на две песни и одна песня (28.11.2026)
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const LIST = b64('rO0ABXNyABNqYXZhLnV0aWwuQXJyYXlMaXN0eIHSHZnHYZ0DAAFJAARzaXpleHAAAAADdwQAAAADc3IAImNvbS5saW1hZ2lyYW4uaG9seXJpY3MubW9kZWwuTXVzaWMAAAAAAAAAAQIADVoACGFyY2hpdmVkRAADYnBtSgACaWRKAANzZXRMAAZhcnRpc3R0ABJMamF2YS9sYW5nL1N0cmluZztMAAZhdXRob3JxAH4AA0wACGxhbmd1YWdlcQB+AANMAAZseXJpY3NxAH4AA0wABG5vdGVxAH4AA1sABG51bXN0AAJbSUwABW9yZGVydAAQTGphdmEvdXRpbC9MaXN0O0wABXRpdGxlcQB+AANMAAx0cmFuc2xhdGlvbnN0AA9MamF2YS91dGlsL01hcDt4cABAVqAAAAAAAAAAAAAAAAABAAAAAAAAAAB0AAzQmNCy0LDQvdC+0LJwcHQAfTENCtCT0L7RgdC/0L7QtNGMINCi0Ysg0J/QsNGB0YLRi9GA0Ywg0LzQvtC5DQrQryDQvdC1INCx0YPQtNGDINC90YPQttC00LDRgtGM0YHRjw0KDQrQn9GA0LjQv9C10LINCtCh0LvQsNCy0LAg7aC97biAINCi0LXQsdC1cHVyAAJbSU26YCZ26rKlAgAAeHAAAAACAAAAAQAAAAJzcQB+AAAAAAACdwQAAAACc3IAEWphdmEubGFuZy5JbnRlZ2VyEuKgpPeBhzgCAAFJAAV2YWx1ZXhyABBqYXZhLmxhbmcuTnVtYmVyhqyVHQuU4IsCAAB4cAAAAAFzcQB+AA0AAAACeHQAKdCT0L7RgdC/0L7QtNGMINCi0Ysg0J/QsNGB0YLRi9GA0Ywg0LzQvtC5c3IAEWphdmEudXRpbC5IYXNoTWFwBQfawcMWYNEDAAJGAApsb2FkRmFjdG9ySQAJdGhyZXNob2xkeHA/QAAAAAAADHcIAAAAEAAAAAF0AAJlbnQABUhlbGxveHNxAH4AAgBAVqAAAAAAAAAAAAAAAAACAAAAAAAAAAB0AAB0AArQkNCy0YLQvtGAdAACcnV0ABVWZXJzZSAxCkdyZWF0IGFyZSBZb3V0AA7Qt9Cw0LzQtdGC0LrQsHVxAH4ACgAAAAIAAAABAAAAAnNxAH4AAAAAAAJ3BAAAAAJxAH4AD3EAfgAQeHQADUdyZWF0IEFyZSBZb3VzcQB+ABI/QAAAAAAADHcIAAAAEAAAAAFxAH4AFHEAfgAVeHEAfgAHeA==');
const ONE = b64('rO0ABXNyACJjb20ubGltYWdpcmFuLmhvbHlyaWNzLm1vZGVsLk11c2ljAAAAAAAAAAECAA1aAAhhcmNoaXZlZEQAA2JwbUoAAmlkSgADc2V0TAAGYXJ0aXN0dAASTGphdmEvbGFuZy9TdHJpbmc7TAAGYXV0aG9ycQB+AAFMAAhsYW5ndWFnZXEAfgABTAAGbHlyaWNzcQB+AAFMAARub3RlcQB+AAFbAARudW1zdAACW0lMAAVvcmRlcnQAEExqYXZhL3V0aWwvTGlzdDtMAAV0aXRsZXEAfgABTAAMdHJhbnNsYXRpb25zdAAPTGphdmEvdXRpbC9NYXA7eHAAQFagAAAAAAAAAAAAAAAAAgAAAAAAAAAAdAAAdAAK0JDQstGC0L7RgHQAAnJ1dAAVVmVyc2UgMQpHcmVhdCBhcmUgWW91dAAO0LfQsNC80LXRgtC60LB1cgACW0lNumAmduqypQIAAHhwAAAAAgAAAAEAAAACc3IAE2phdmEudXRpbC5BcnJheUxpc3R4gdIdmcdhnQMAAUkABHNpemV4cAAAAAJ3BAAAAAJzcgARamF2YS5sYW5nLkludGVnZXIS4qCk94GHOAIAAUkABXZhbHVleHIAEGphdmEubGFuZy5OdW1iZXKGrJUdC5TgiwIAAHhwAAAAAXNxAH4ADwAAAAJ4dAANR3JlYXQgQXJlIFlvdXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAABdAACZW50AAVIZWxsb3g=');

describe('Java-сериализация (Holyrics .muf/.mufl после «Экспорта»)', () => {
  it('сигнатура и разбор списка: поля, кириллица, суррогаты, ссылки', () => {
    expect(isJavaStream(LIST)).toBe(true); expect(isJavaStream(new Uint8Array([1, 2, 3, 4, 5]))).toBe(false);
    const l = simplify(readJava(LIST));
    expect(l.length).toBe(3); expect(l[0].title).toBe('Господь Ты Пастырь мой'); expect(l[0].lyrics).toContain('😀'); expect(l[2].title).toBe(l[0].title);
    expect(l[1].author).toBe('Автор'); expect(l[0].order).toEqual([1, 2]); expect(l[0].translations).toEqual({ en: 'Hello' });
  });
  it('песни: строфы через пустую строку, номер строфы отброшен, автор вместо пустого исполнителя', () => {
    const s = fromHolyricsJava(LIST);
    expect(s.length).toBe(3); expect(s[0].artist).toBe('Иванов'); expect(s[1].artist).toBe('Автор');
    expect(s[0].notes.startsWith('Господь Ты Пастырь мой')).toBe(true); expect(s[0].notes).toContain('Припев');
    expect(fromHolyricsJava(ONE).length).toBe(1);
  });
  it('importSongs берёт .mufl; обрыв и мусор — ошибка файла, а не падение', async () => {
    const r = await importSongs([{ name: 'a.mufl', u8: LIST }, { name: 'b.mufl', u8: ONE }]);
    expect(r.songs.length).toBe(4); expect(r.errors).toEqual([]);
    const bad = await importSongs([{ name: 'c.mufl', u8: LIST.slice(0, 200) }, { name: 'd.mufl', u8: new Uint8Array(300).map((_, i) => (i * 37) & 255) }]);
    expect(bad.songs.length).toBe(0); expect(bad.errors.map((e) => e.name)).toEqual(['c.mufl', 'd.mufl']);
  });
  it('защита: заведомо огромный массив отвергается', () => {
    const x = new Uint8Array([0xac, 0xed, 0, 5, 0x75, 0x72, 0, 2, 0x5b, 0x49, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0x78, 0x70, 0x7f, 0xff, 0xff, 0xff]);
    expect(() => readJava(x)).toThrow();
  });
});
