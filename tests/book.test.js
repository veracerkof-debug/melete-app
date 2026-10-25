import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { CHORDS, SCALES, INTERVALS, harmonize, rootN, scaleById, parseChord } from '../src/modules/theory/book/engine.js';
import { createLabs } from '../src/modules/theory/book/labs.js';
import { chapterHTML, fill, PARTS, ordered } from '../src/modules/theory/book/index.js';
import ru from '../src/modules/theory/book/lang/ru/index.js';
import uz from '../src/modules/theory/book/lang/uz/index.js';
import en from '../src/modules/theory/book/lang/en/index.js';

vi.mock('../src/modules/theory/book/book.css', () => ({}));
const LANGS = { ru, uz, en };
// Ключи, которые схемы и оболочка спрашивают у языкового файла
const src = ['labs.js', 'labs1.js', 'labs2.js', 'labs3.js', 'labs4.js', 'labs5.js', 'index.js'].map((f) => readFileSync('src/modules/theory/book/' + f, 'utf8')).join('\n');
const used = new Set();
const T = (k) => { used.add(k); return 'x'; };
const snd = new Proxy({}, { get: () => () => {} });

describe('учебник: движок', () => {
  it('гармонизация E♭ мажора', () => { expect(harmonize(rootN('E♭'), scaleById('ionian')).map((h) => h.sym).join(' ')).toBe('E♭maj7 Fm7 Gm7 A♭maj7 B♭7 Cm7 Dm7♭5'); });
  it('разбор символов', () => { expect(['Dm7', 'G7alt', 'F#ø', 'Eb°7', 'Bbmaj7'].map((s) => parseChord(s).fam)).toEqual(['min', 'dom', 'hdim', 'dim', 'maj']); });
});

describe('учебник: все схемы рисуются и отвечают на действия, все строки на месте', () => {
  for (const [code, L] of Object.entries(LANGS)) {
    it(code + ': схемы', () => {
      const LABS = createLabs({ T: (k, v) => { used.add(k); if (!(k in L.S)) throw new Error(code + ': нет строки ' + k); return fill(L.S[k], v); }, L, snd });
      for (const [id, lab] of Object.entries(LABS)) {
        const st = JSON.parse(JSON.stringify(lab.st));
        const html = lab.render(st);
        expect(html, id).not.toMatch(/undefined|NaN/);
        // нажать все кнопки схемы
        for (const a of [...html.matchAll(/data-a="([^"]+)"/g)].map((m) => m[1]).slice(0, 40)) { lab.on(st, a, { querySelectorAll: () => [] }); expect(lab.render(st), id + ' ' + a).not.toMatch(/undefined|NaN/); }
      }
    });
    it(code + ': названия и термины полные', () => {
      CHORDS.forEach((c) => expect(L.CHN[c.id], code + ' аккорд ' + c.id).toBeTruthy());
      SCALES.forEach((s) => { expect(L.SCN[s.id], code + ' гамма ' + s.id).toBeTruthy(); expect(L.SG[s.g]).toBeTruthy(); });
      INTERVALS.forEach((x) => expect(L.IV[x.k], code + ' интервал ' + x.k).toBeTruthy());
      ['perf', 'imperf', 'ctx', 'diss'].forEach((k) => expect(L.CONS[k]).toBeTruthy());
      expect(Object.keys(L.TERMS).sort()).toEqual(Object.keys(ru.TERMS).sort());
      expect(Object.keys(L.S).sort()).toEqual(Object.keys(ru.S).sort());
    });
    it(code + ': главы — те же, ссылки на термины и схемы существуют', () => {
      expect(L.CH.map((c) => c.id)).toEqual(ru.CH.map((c) => c.id));
      // каждая глава — в одной из частей; источники глав — из SRC
      L.CH.forEach((c) => expect(PARTS.flat(), c.id).toContain(c.id));
      expect(ordered(L).length).toBe(L.CH.length);
      L.CH.forEach((c) => (c.src || '').split(',').filter(Boolean).forEach((k) => expect(L.SRC[k.trim()], code + ' ' + c.id + ' источник ' + k).toBeTruthy()));
      const LABS = createLabs({ T, L, snd });
      for (const c of L.CH) {
        for (const m of c.h.matchAll(/\[\[([a-zA-Z0-9]+)\|/g)) expect(L.TERMS[m[1]], code + ' ' + c.id + ' термин ' + m[1]).toBeTruthy();
        for (const m of c.h.matchAll(/\{\{lab:([a-z0-9]+)\}\}/g)) expect(LABS[m[1]], code + ' ' + c.id + ' схема ' + m[1]).toBeTruthy();
        expect(chapterHTML(c, L.TERMS)).not.toMatch(/\[\[|\{\{/);
        // те же схемы в том же порядке, что в русском
        expect([...c.h.matchAll(/\{\{lab:([a-z0-9]+)\}\}/g)].map((m) => m[1])).toEqual([...ru.CH.find((x) => x.id === c.id).h.matchAll(/\{\{lab:([a-z0-9]+)\}\}/g)].map((m) => m[1]));
      }
      for (const [, , ch] of Object.values(L.TERMS)) expect(L.CH.some((c) => c.id === ch)).toBe(true);
    });
  }
  it('в русском файле есть все строки, которые спрашивает код', () => {
    const keys = [...src.matchAll(/T\('([a-zA-Z0-9.]+)'(?!\s*\+)/g)].map((m) => m[1]);
    keys.forEach((k) => expect(ru.S[k], k).toBeDefined());
  });
});
