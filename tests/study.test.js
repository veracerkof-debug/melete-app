// Учёба на главной (06.11.2026): часы в неделю по инструментам, время — из занятий в инструменте
import { describe, it, expect } from 'vitest';
import { studyRows, setGoal, setShow, shouldOffer, markAsked } from '../src/core/study.js';

const brief = (rows) => rows.map(({ id, goal, sec }) => ({ id, goal, sec }));

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
    expect(brief(studyRows(st, ses, now))).toEqual([{ id: 'book', goal: 30, sec: 0 }, { id: 'ear', goal: 60, sec: 1800 }]);
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
    expect(brief(studyRows(st, [...ses, ...more], now))).toEqual([{ id: 'book', goal: 60, sec: 1000 }, { id: 'ear', goal: 60, sec: 2100 }, { id: 'beat', goal: 60, sec: 400 }]);
  });
  // 14.11.2026: вокал — четвёртая строка; расписание (slot.tool) — сегодня, ближайший день, дни; строка без цели
  it('вокал и строка без цели: цифры недели есть, цели нет', () => {
    const st = {};
    setShow(st, 'vocal', true);
    const r = studyRows(st, [{ type: 'tool', tool: 'vocal', start: now - 3600000, dur: 900 }], now);
    expect(brief(r)).toEqual([{ id: 'vocal', goal: 0, sec: 900 }]);
    expect(r[0].today).toBe(900);
    setGoal(st, 'vocal', 0); // убрать — совсем
    expect(studyRows(st, [], now)).toEqual([]);
  });
  it('расписание: сегодня в 19:00 — ждёт; прошло — ближайший день; сделано — отмечено; каждый день — все дни', () => {
    const slot = (days, from = '19:00', to = '19:30') => ({ id: 'p1', days, from, to, title: '', tool: 'vocal' });
    const st = { plan: { slots: [slot([0, 2, 4])] } }; // Пн Ср Пт; now — пятница 12:00
    setShow(st, 'vocal', true);
    let r = studyRows(st, [], now)[0].sched;
    expect(r.days).toEqual([0, 2, 4]);
    expect(r.today).toMatchObject({ from: '19:00', past: false });
    expect(r.next).toMatchObject({ today: true, from: '19:00' });
    const late = new Date(2026, 10, 6, 21).getTime(); // вечером — сегодняшнее прошло, дальше — понедельник
    r = studyRows(st, [], late)[0].sched;
    expect(r.today.past).toBe(true);
    expect(r.next).toMatchObject({ wd: 0, from: '19:00', today: false });
    const daily = { plan: { slots: [slot([0, 1, 2, 3, 4, 5, 6])] } };
    setShow(daily, 'vocal', true);
    expect(studyRows(daily, [], late)[0].sched.days).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(studyRows(daily, [], late)[0].sched.next).toMatchObject({ wd: 5, today: false }); // завтра — суббота
    const other = { plan: { slots: [{ ...slot([4]), tool: 'ear' }] } }; // слот другого инструмента не считается
    setShow(other, 'vocal', true);
    expect(studyRows(other, [], now)[0].sched).toEqual({ days: [], today: null, next: null });
  });
});
