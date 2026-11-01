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
