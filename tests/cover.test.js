// Обложка из тегов файла (src/music/cover.js): синтетические MP3 / FLAC / M4A с картинкой, битые данные — null
import { describe, it, expect } from 'vitest';
import { coverOf, coverOfBlob } from '../src/music/cover.js';

const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, ...Array.from({ length: 120 }, (_, i) => i % 251)]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, ...Array.from({ length: 120 }, (_, i) => i % 250)]);
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; a.forEach((x) => { o.set(x, p); p += x.length; }); return o; };
const str = (s) => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));
const be32 = (n) => Uint8Array.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const sync = (n) => Uint8Array.from([(n >>> 21) & 127, (n >>> 14) & 127, (n >>> 7) & 127, n & 127]);

const apic = (img, mime = 'image/jpeg') => cat(Uint8Array.of(0), str(mime), Uint8Array.of(0), Uint8Array.of(3), str('обл'.replace(/./g, 'x')), Uint8Array.of(0), img);
const id3v = (ver, frames) => cat(str('ID3'), Uint8Array.of(ver, 0, 0), sync(frames.length), frames);
const frame = (ver, id, body) => cat(str(id), ver === 4 ? sync(body.length) : be32(body.length), Uint8Array.of(0, 0), body);

describe('обложка из тегов', () => {
  it('MP3 ID3v2.3: APIC после других кадров', () => {
    const f = cat(frame(3, 'TIT2', cat(Uint8Array.of(0), str('Song'))), frame(3, 'APIC', apic(JPG)));
    const r = coverOf(cat(id3v(3, f), new Uint8Array(50)));
    expect(r.mime).toBe('image/jpeg');
    expect(Array.from(r.bytes)).toEqual(Array.from(JPG));
  });
  it('MP3 ID3v2.4: размеры кадров — syncsafe, PNG', () => {
    const r = coverOf(id3v(4, frame(4, 'APIC', apic(PNG, 'image/png'))));
    expect(r.mime).toBe('image/png');
    expect(r.bytes.length).toBe(PNG.length);
  });
  it('MP3 ID3v2.2: кадр PIC', () => {
    const body = cat(Uint8Array.of(0), str('JPG'), Uint8Array.of(3), Uint8Array.of(0), JPG);
    const f = cat(str('PIC'), Uint8Array.of(0, (body.length >> 8) & 255, body.length & 255), body);
    const r = coverOf(id3v(2, f));
    expect(r.mime).toBe('image/jpeg');
  });
  it('FLAC: блок PICTURE', () => {
    const mime = str('image/png');
    const pic = cat(be32(3), be32(mime.length), mime, be32(0), be32(500), be32(500), be32(24), be32(0), be32(PNG.length), PNG);
    const si = new Uint8Array(34);
    const f = cat(str('fLaC'), Uint8Array.of(0, 0, 0, 34), si, Uint8Array.of(0x86, 0, (pic.length >> 8) & 255, pic.length & 255), pic);
    const r = coverOf(f);
    expect(r.mime).toBe('image/png');
    expect(r.bytes.length).toBe(PNG.length);
  });
  it('M4A: moov → udta → meta → ilst → covr → data', () => {
    const box = (name, body) => cat(be32(8 + body.length), str(name), body);
    const data = box('data', cat(be32(13), be32(0), JPG));
    const tree = box('moov', box('udta', box('meta', cat(be32(0), box('ilst', box('covr', data))))));
    const f = cat(box('ftyp', str('M4A \0\0\0\0')), box('mdat', new Uint8Array(200)), tree);
    const r = coverOf(f);
    expect(r.mime).toBe('image/jpeg');
    expect(r.bytes.length).toBe(JPG.length);
  });
  it('нет обложки, мусор, пустое — null, без исключений', () => {
    expect(coverOf(new Uint8Array(0))).toBeNull();
    expect(coverOf(new Uint8Array(500).fill(7))).toBeNull();
    expect(coverOf(id3v(3, frame(3, 'TIT2', cat(Uint8Array.of(0), str('x')))))).toBeNull();
    expect(coverOf(cat(id3v(3, frame(3, 'APIC', apic(JPG))).subarray(0, 40)))).toBeNull(); // обрезано
  });
  it('coverOfBlob: читает M4A с «moov» в конце, пропуская «mdat»', async () => {
    const box = (name, body) => cat(be32(8 + body.length), str(name), body);
    const tree = box('moov', box('udta', box('meta', cat(be32(0), box('ilst', box('covr', box('data', cat(be32(14), be32(0), PNG))))))));
    const f = cat(box('ftyp', str('M4A \0\0\0\0')), box('mdat', new Uint8Array(5000)), tree);
    const r = await coverOfBlob(new Blob([f]));
    expect(r.mime).toBe('image/png');
  });
});
