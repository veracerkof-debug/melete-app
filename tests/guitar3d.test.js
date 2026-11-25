// 3D-модель гитары (book/labs10.js): размеры по спецификациям, тексты частей есть во всех языках
import { describe, it, expect } from 'vitest';
import { TYPES, PARTS, SPEC, partKey, fretPos, widthAt, outlinePts, CLASSIC_R, DREAD_R, ELEC_R, ELEC_L } from '../src/modules/book/book/labs10.js';
import * as THREE from 'three';
import { S as ru } from '../src/modules/book/book/lang/ru/pg.js';
import { S as en } from '../src/modules/book/book/lang/en/pg.js';
import { S as uz } from '../src/modules/book/book/lang/uz/pg.js';

describe('гитара в 3D', () => {
  it('12-й лад — ровно посередине мензуры', () => { for (const k of TYPES) expect(Math.abs(fretPos(12, SPEC[k].S) - SPEC[k].S / 2)).toBeLessThan(1e-9); });
  it('ширина грифа растёт от порожка', () => { for (const k of TYPES) { const s = SPEC[k]; expect(widthAt(s, 0)).toBe(s.nutW); expect(widthAt(s, s.endAt)).toBe(s.endW); } });
  it('контуры корпуса: длина и ширины по спецификациям', () => {
    const ext = (R, L) => { const p = outlinePts(THREE, 0, R, L, 200); const xs = p.map((v) => v.x), ys = p.map((v) => v.y); return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };
    const c = ext(CLASSIC_R), a = ext(DREAD_R), e = ext(ELEC_R, ELEC_L);
    expect(c.h).toBeGreaterThan(470); expect(c.h).toBeLessThan(490); expect(c.w).toBeGreaterThan(360); expect(c.w).toBeLessThan(375);
    expect(a.h).toBeGreaterThan(500); expect(a.h).toBeLessThan(515); expect(a.w).toBeGreaterThan(395); expect(a.w).toBeLessThan(410);
    expect(e.w).toBeGreaterThan(310); expect(e.w).toBeLessThan(330); expect(e.h).toBeGreaterThan(410); expect(e.h).toBeLessThan(440);
  });
  it('у каждой части каждого типа есть название и пояснение на ru, en, uz', () => {
    for (const [name, L] of [['ru', ru], ['en', en], ['uz', uz]]) {
      for (const k of TYPES) for (const id of PARTS[k]) for (const suf of ['.n', '.d']) expect(L[partKey(k, id) + suf], name + ' ' + partKey(k, id) + suf).toBeTruthy();
    }
  });
  it('номера частей по порядку без повторов', () => { for (const k of TYPES) expect(new Set(PARTS[k]).size).toBe(PARTS[k].length); });
});
