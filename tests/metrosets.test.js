// Сет-лист метронома (core/metrosets.js): порядок сет-листов, темп и размер песни — свои в сет-листе или по песне
import { describe, it, expect } from 'vitest';
import { setlistsOf, entriesOf } from '../src/core/metrosets.js';

const D = 86400000, now = 1790000000000;
describe('сет-лист метронома', () => {
  it('впереди — по порядку, потом прошедшие от свежих; без песен — не сет-лист', () => {
    const state = { events: [
      { id: 'old', start: now - 5 * D, songs: ['a'] }, { id: 'soon', start: now + D, songs: ['a'] }, { id: 'later', start: now + 3 * D, songs: ['a'] },
      { id: 'recent', start: now - 2 * D, songs: ['a'] }, { id: 'empty', start: now, songs: [] }, { id: 'mine', start: now, songs: [], metroSet: true }, { id: 'gone', start: now, songs: ['a'], deleted: true },
    ] };
    expect(setlistsOf(state, now).map((x) => x.id)).toEqual(['mine', 'soon', 'later', 'recent', 'old']);
  });
  it('темп: свой в сет-листе, иначе целевой; размер: свой, иначе метроном песни', () => {
    const songs = { a: { id: 'a', title: 'A', targetBpm: 100, currentBpm: 90 }, b: { id: 'b', title: 'B', currentBpm: 70, metro: { num: 3, den: 4 } } };
    const ev = { songs: ['a', 'b', 'x'], stage: { a: { bpm: 120, num: 6, den: 8 } } };
    const L = entriesOf(ev, (id) => songs[id]);
    expect(L.map((x) => [x.songId, x.bpm, x.own, x.num, x.den])).toEqual([['a', 120, true, 6, 8], ['b', 70, false, 3, 4]]);
    expect([L[0].target, L[0].current]).toEqual([100, 90]);
  });
});
