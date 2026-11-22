import { describe, it, expect } from 'vitest';
import { jpegsToPdf } from '../src/music/pdfwriter.js';

describe('PDF из страниц-картинок', () => {
  it('заголовок, число страниц, таблица смещений указывает на объекты', () => {
    const jpg = (n) => new Uint8Array([0xff, 0xd8, ...Array.from({ length: n }, (_, i) => i % 251), 0xff, 0xd9]);
    const pdf = jpegsToPdf([{ w: 1240, h: 1754, u8: jpg(300) }, { w: 1240, h: 900, u8: jpg(50) }]);
    const s = Array.from(pdf, (b) => String.fromCharCode(b)).join('');
    expect(s.startsWith('%PDF-1.4')).toBe(true);
    expect(s).toContain('/Count 2');
    expect(s.trim().endsWith('%%EOF')).toBe(true);
    const sx = +/startxref\n(\d+)/.exec(s)[1];
    expect(s.slice(sx, sx + 4)).toBe('xref');
    const offs = [...s.slice(sx).matchAll(/(\d{10}) 00000 n/g)].map((m) => +m[1]);
    expect(offs.length).toBe(8); // каталог, страницы, 2×(страница, содержимое, картинка)
    offs.forEach((o, i) => expect(s.slice(o, o + (String(i + 1)).length + 6)).toBe((i + 1) + ' 0 obj'));
  });
});
