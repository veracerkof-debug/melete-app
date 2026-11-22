import { describe, it, expect } from 'vitest';
import { streakEnding, longestStreak, weekStats, both } from '../src/core/together/streak.js';
import { addDays, weekStart, nextAnnivIn, monthGrid, diffDays } from '../src/core/together/dates.js';
import { buildModel, P, ckey } from '../src/core/together/model.js';
import { refChapters } from '../src/core/together/model.js';

const T = '2026-11-19'; // четверг
const days = (...n) => new Set(n.map((k) => addDays(T, -k)));

describe('даты', () => {
  it('неделя и сдвиги', () => {
    expect(weekStart(T, 1)).toBe('2026-11-16'); expect(weekStart(T, 0)).toBe('2026-11-15');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01'); expect(diffDays('2026-11-01', T)).toBe(18);
  });
  it('годовщина', () => { expect(nextAnnivIn('2020-11-19', T)).toBe(0); expect(nextAnnivIn('2020-11-20', T)).toBe(1); expect(nextAnnivIn('2020-11-18', T)).toBe(364); });
  it('сетка месяца', () => { const g = monthGrid('2026-11', 1); expect(g.length).toBe(36); expect(g[5]).toBeNull(); expect(g[6]).toBe('2026-11-01'); expect(g.filter(Boolean)[0]).toBe('2026-11-01'); });
});
describe('серии', () => {
  it('сегодня не рвёт серию', () => { expect(streakEnding(days(1, 2, 3), T)).toBe(3); expect(streakEnding(days(0, 1, 2), T)).toBe(3); });
  it('пропуск рвёт', () => { expect(streakEnding(days(2, 3), T)).toBe(0); expect(streakEnding(days(0, 1, 3, 4), T)).toBe(2); });
  it('рекорд', () => expect(longestStreak(days(0, 1, 5, 6, 7, 8))).toBe(4));
  it('совместная — пересечение', () => expect([...both(days(0, 1, 2), days(1, 2, 3))].length).toBe(2));
  it('недели', () => {
    const t = new Set(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-16']);
    expect(weekStats(t, T, 1, 5)).toEqual({ kept: 2, streak: 2 }); // текущая неделя пока не рвёт
    expect(weekStats(new Set(), T)).toEqual({ kept: 0, streak: 0 });
  });
});
describe('ссылки', () => {
  it('главы прохода', () => { expect(refChapters({ b: 'JOH', c: 3, c2: 5 })).toEqual(['JOH.3', 'JOH.4', 'JOH.5']); expect(refChapters({ b: 'JOH', c: 3 })).toEqual(['JOH.3']); expect(refChapters(null)).toEqual([]); });
});
describe('модель', () => {
  const docs = new Map([
    [P.profile('a'), { name: 'A', joined: '1' }], [P.profile('b'), { name: 'B', joined: '2' }],
    [P.checkin('a', addDays(T, -1)), { date: addDays(T, -1), ref: { b: 'JOH', c: 3 } }],
    [P.checkin('b', addDays(T, -1)), { date: addDays(T, -1), ref: { b: 'JOH', c: 4 } }],
    [P.checkin('a', T), { date: T, ref: { b: 'PSA', c: 23 } }],
    [P.ack('b', ckey(addDays(T, -1))), { of: 'a' }], [P.ack('a', ckey(addDays(T, -1))), { of: 'b' }],
  ]);
  const m = buildModel(docs, 'a', T);
  it('партнёр и состояния дней', () => {
    expect(m.partner).toBe('b');
    expect(m.dayState('a', addDays(T, -1))).toBe('done'); expect(m.dayState('a', T)).toBe('posted'); expect(m.dayState('b', T)).toBe('none');
  });
  it('серии и статистика', () => { expect(m.streak.together).toBe(1); expect(m.streak.me).toBe(1); expect(m.stats).toEqual({ books: 2, chapters: 3 }); });
  it('подтверждение чужого отчёта не засчитывает день его автору дважды', () => {
    const d2 = new Map(docs); d2.delete(P.ack('b', ckey(addDays(T, -1))));
    expect(buildModel(d2, 'a', T).dayState('a', addDays(T, -1))).toBe('posted');
  });
});
