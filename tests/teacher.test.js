import { describe, it, expect } from 'vitest';
import { weekReport } from '../src/core/teacher.js';

describe('отчёт для педагога', () => {
  it('неделя: дни, песни с темпом было → стало, заметки', () => {
    const now = new Date(2026, 10, 18, 20).getTime(), mon = new Date(2026, 10, 16, 19).getTime(), D = 86400000;
    const songs = [{ id: 's', title: 'Этюд' }];
    const ses = [
      { start: mon, dur: 1800, songId: 's', bpm: 80, note: 'медленно' },
      { start: mon + 2 * D, dur: 1200, songId: 's', bpm: 92 },
      { start: mon - 3 * D, dur: 999, songId: 's', bpm: 60 }, // прошлая неделя
      { start: mon + D, dur: 600, plan: { title: 'Гитара' } },
    ];
    const R = weekReport(ses, songs, { goalMin: 300, days: [1, 1, 1, 1, 1, 0, 0] }, now);
    expect(R.total).toBe(3600);
    expect(R.per.slice(0, 3)).toEqual([1800, 600, 1200]);
    expect(R.songs).toEqual([{ title: 'Этюд', sec: 3000, from: 80, to: 92 }]);
    expect(R.notes[0].text).toBe('медленно');
    expect(R.plans).toEqual([{ title: 'Гитара', n: 1 }]);
    expect(R.goal).toBe(18000);
  });
});

// Вокал недели — строкой в отчёте (DECISIONS «Вокал: прогресс и «Петь»»)
describe('отчёт педагогу: вокал', () => {
  it('минуты пения, чистота, выше всего — из прогресса «Вокала»; нет пения — нет строки', () => {
    const now = new Date(2026, 10, 12, 20).getTime();
    const vocal = { log: [{ d: '2026-11-11', sec: 600, n: 20, ok: 16, near: 2, cs: 0, cn: 0, hi: 66, lo: 48, up: 0, dn: 0, takes: [] }] };
    const R = weekReport([], [], { goalMin: 0, days: [1, 1, 1, 1, 1, 1, 1], vocal }, now);
    expect([R.vocal.min, Math.round(R.vocal.purity * 100), R.vocal.hi]).toEqual([10, 85, 66]);
    expect(weekReport([], [], { goalMin: 0, days: [1, 1, 1, 1, 1, 1, 1] }, now).vocal).toBe(null);
  });
});
