import { describe, it, expect } from 'vitest';

import { songStats as _ss, songStatsMap as _ssm } from '../src/core/stats.js';
describe('статистика песен одним проходом', () => {
  it('совпадает с songStats для каждой песни', () => {
    const ses = []; for (let i = 0; i < 300; i++) ses.push({ id: 'x' + i, songId: 's' + (i % 7), start: 1000 + ((i * 37) % 300) * 1000, dur: 60 + i, bpm: i % 3 ? 90 + i : 0 });
    ses.push({ id: 'n', start: 5, dur: 10 });
    const m = _ssm(ses);
    for (let k = 0; k < 8; k++) expect(m.of('s' + k)).toEqual(_ss(ses, 's' + k));
  });
});

import { foldQ, listSongs } from '../src/core/library.js';
describe('поиск песен', () => {
  it('ё и вид апострофа не мешают', () => {
    expect(foldQ('Oʻzbek Ёлка')).toBe("o'zbek елка");
    const songs = [{ id: 'a', title: 'Qoʻshiq' }, { id: 'b', title: 'Ёлочка' }];
    expect(listSongs(songs, [], { genres: [], tags: [] }, { q: "qo'sh" }).list.map((x) => x.s.id)).toEqual(['a']);
    expect(listSongs(songs, [], { genres: [], tags: [] }, { q: 'елоч' }).list.map((x) => x.s.id)).toEqual(['b']);
  });
});
