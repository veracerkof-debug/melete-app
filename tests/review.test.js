import { describe, it, expect } from 'vitest';
import { intervalOf, dueSongs } from '../src/core/review.js';

const D = 86400000, T0 = new Date(2026, 9, 1).getTime();
const days = (...n) => n.map((x) => T0 + x * D);
describe('повторение репертуара', () => {
  it('вовремя — интервал растёт, поздно — сначала', () => {
    expect(intervalOf(days(0)).iv).toBe(2);
    expect(intervalOf(days(0, 2, 6, 14)).iv).toBe(16);
    expect(intervalOf(days(0, 2, 6, 30)).iv).toBe(2);
    expect(intervalOf(days(0, 1)).iv).toBe(2); // раньше срока — не растёт
  });
  it('к повторению — только выученные и только когда пора', () => {
    const songs = [{ id: 'a', title: 'A', masteryPct: 100 }, { id: 'b', title: 'B', masteryPct: 40 }, { id: 'c', title: 'C', masteryPct: 90 }];
    const ses = [{ songId: 'a', start: T0 + 10 * D, dur: 60 }, { songId: 'b', start: T0, dur: 60 }, { songId: 'c', start: T0 + 19 * D, dur: 60 }];
    const due = dueSongs(songs, ses, T0 + 20 * D + 3600000);
    expect(due.map((x) => x.s.id)).toEqual(['a']);
  });
});
