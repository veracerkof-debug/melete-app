// Учёба на главной (06.11.2026): часы в неделю по инструментам, время — из занятий в инструменте
import { describe, it, expect } from 'vitest';
import { studyRows, setGoal, shouldOffer, markAsked } from '../src/core/study.js';

describe('учёба', () => {
  const now = new Date(2026, 10, 6, 12).getTime(); // пятница
  const ses = [
    { type: 'tool', tool: 'ear', start: now - 3600000, dur: 1200 },
    { type: 'tool', tool: 'ear', start: now - 86400000, dur: 600 },
    { type: 'tool', tool: 'book', start: now - 10 * 86400000, dur: 900 }, // прошлая неделя
    { type: 'session', start: now - 3600000, dur: 3000 },
  ];
  it('строки — только с целью; время — за эту неделю, в этом инструменте', () => {
    const st = {};
    setGoal(st, 'ear', 60); setGoal(st, 'book', 30);
    expect(studyRows(st, ses, now)).toEqual([{ id: 'book', goal: 30, sec: 0 }, { id: 'ear', goal: 60, sec: 1800 }]);
  });
  it('предложение — один раз', () => {
    const st = {};
    expect(shouldOffer(st, 'beat')).toBe(true);
    markAsked(st, 'beat');
    expect(shouldOffer(st, 'beat')).toBe(false);
    setGoal(st, 'ear', 0);
    expect(shouldOffer(st, 'ear')).toBe(false);
    expect(studyRows(st, ses, now)).toEqual([]);
  });
  it('прежний «Слух и ритм» (train) — «Слух»; окна внутри занятия — по своему времени, не больше занятия', () => {
    const st = {};
    setGoal(st, 'ear', 60); setGoal(st, 'beat', 60); setGoal(st, 'book', 60);
    const more = [
      { type: 'tool', tool: 'train', start: now - 7200000, dur: 300 },
      { type: 'free', start: now - 5000000, dur: 1000, study: { beat: 400, book: 5000 } },
    ];
    expect(studyRows(st, [...ses, ...more], now)).toEqual([{ id: 'book', goal: 60, sec: 1000 }, { id: 'ear', goal: 60, sec: 2100 }, { id: 'beat', goal: 60, sec: 400 }]);
  });
});
