// 3D-модель гитары (book/labs10.js): детали модели и тексты частей на всех языках
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { TYPES, PARTS, OFFS, partKey } from '../src/modules/book/book/labs10.js';
import { S as ru } from '../src/modules/book/book/lang/ru/pg.js';
import { S as en } from '../src/modules/book/book/lang/en/pg.js';
import { S as uz } from '../src/modules/book/book/lang/uz/pg.js';

const glbNodes = (f) => { const d = fs.readFileSync('src/modules/book/book/assets/' + f + '.glb'); const l = d.readUInt32LE(12); return JSON.parse(d.slice(20, 20 + l).toString()).nodes.map((n) => n.name.split('_')[0]); };

describe('гитара в 3D', () => {
  it('в каждой модели есть все детали из списка и нет лишних', () => {
    for (const k of TYPES) { const nodes = new Set(glbNodes('guitar-' + k)); for (const id of PARTS[k]) expect(nodes.has(id), k + ' ' + id).toBe(true); for (const n of nodes) expect(PARTS[k].includes(n), k + ' лишняя ' + n).toBe(true); }
  });
  it('у каждой детали есть разнос при разборе', () => { for (const k of TYPES) for (const id of PARTS[k]) expect(OFFS[k][id], k + ' ' + id).toBeTruthy(); });
  it('у каждой части каждого типа есть название и пояснение на ru, en, uz', () => {
    for (const [name, L] of [['ru', ru], ['en', en], ['uz', uz]]) for (const k of TYPES) for (const id of PARTS[k]) for (const suf of ['.n', '.d']) expect(L[partKey(k, id) + suf], name + ' ' + partKey(k, id) + suf).toBeTruthy();
  });
  it('номера частей без повторов', () => { for (const k of TYPES) expect(new Set(PARTS[k]).size).toBe(PARTS[k].length); });
});
