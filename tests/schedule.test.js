import { describe, it, expect } from 'vitest';
import { planOf, slotsOn, legacyOf, savePlan, addSlot, editSlot, removeSlot, resetDay, addOff, prune, weekMin, dateKey } from '../src/core/schedule.js';
import { remindOf, remindTimes, plan } from '../src/core/reminders.js';

const mon = new Date(2026, 10, 9).getTime(); // понедельник 9 ноября 2026
const day = (i) => mon + i * 86400000;
const hm = (ts) => new Date(ts).toTimeString().slice(0, 5);

describe('расписание занятий', () => {
  it('из прежних полей: дни, общее и своё время, длительность — цель поровну', () => {
    const p = planOf({ days: [1, 0, 1, 0, 1, 0, 0], goalMin: 270, remind: { time: '19:00', dayTimes: { 2: '07:30' } } });
    expect(p.slots.map((s) => [s.days, s.from, s.to])).toEqual([[[0, 4], '19:00', '20:30'], [[2], '07:30', '09:00']]);
  });
  it('несколько занятий в день, правка «только этот день», перерыв', () => {
    const p = { slots: [], off: [], once: {} };
    addSlot(p, { days: [0, 2], from: '18:00', to: '19:00' });
    addSlot(p, { days: [0], from: '07:00', to: '07:30', title: 'Техника' });
    expect(slotsOn(p, day(0)).map((s) => s.from)).toEqual(['07:00', '18:00']);
    expect(slotsOn(p, day(1))).toEqual([]);
    // только эта среда — позже
    const id = p.slots[0].id;
    editSlot(p, id, { from: '20:00', to: '21:00' }, { d: day(2), mode: 'day' });
    expect(slotsOn(p, day(2)).map((s) => s.from)).toEqual(['20:00']);
    expect(slotsOn(p, day(9)).map((s) => s.from)).toEqual(['18:00']); // следующая среда — как обычно
    resetDay(p, day(2));
    expect(slotsOn(p, day(2)).map((s) => s.from)).toEqual(['18:00']);
    // только этот понедельник — без утреннего
    removeSlot(p, p.slots[1].id, { d: day(0), mode: 'day' });
    expect(slotsOn(p, day(0)).map((s) => s.from)).toEqual(['18:00']);
    expect(slotsOn(p, day(7)).map((s) => s.from)).toEqual(['07:00', '18:00']);
    // перерыв: среда и следующий понедельник — без занятий
    addOff(p, dateKey(day(2)), dateKey(day(7)), 'Гастроли');
    expect(slotsOn(p, day(2))).toEqual([]);
    expect(slotsOn(p, day(7))).toEqual([]);
    expect(slotsOn(p, day(9)).length).toBe(1);
    expect(weekMin(p)).toBe(60 * 2 + 30);
    prune(p, day(20));
    expect(p.off).toEqual([]);
    expect(p.once).toEqual({});
  });
  it('прежние поля из расписания — напоминания, главная и статистика читают их', () => {
    const st = { remind: { mode: 'classic', time: '19:00', leads: [60] } };
    const p = { slots: [], off: [], once: {} };
    addSlot(p, { days: [0, 2, 4], from: '18:00', to: '19:30' });
    addSlot(p, { days: [5], from: '10:00', to: '11:00' });
    savePlan(st, p);
    expect(st.days).toEqual([1, 0, 1, 0, 1, 1, 0]);
    expect(st.remind.time).toBe('18:00');
    expect(st.remind.dayTimes).toEqual({ 5: '10:00' });
    expect(st.goalMin).toBe(90 * 3 + 60);
    expect(legacyOf(planOf(st)).goalMin).toBe(330);
  });
  it('напоминания — перед каждым занятием дня; в перерыв — нет', () => {
    const st = { remind: { mode: 'classic', time: '19:00', leads: [60, 5], quietFrom: 23, quietTo: 6 } };
    const p = { slots: [], off: [], once: {} };
    addSlot(p, { days: [0], from: '08:00', to: '08:30' });
    addSlot(p, { days: [0], from: '19:00', to: '20:00' });
    addOff(p, dateKey(day(7)), dateKey(day(7)));
    savePlan(st, p);
    expect(remindTimes(remindOf(st), day(0)).map((x) => hm(x.ts))).toEqual(['07:00', '07:55', '18:00', '18:55']);
    expect(remindTimes(remindOf(st), day(7))).toEqual([]);
    expect(remindTimes(remindOf(st), day(1))).toEqual([]);
    const pl = plan(st, false, day(0) - 3600000);
    expect(pl.some((x) => x.ts >= day(7) && x.ts < day(8))).toBe(false);
  });
});

describe('инструмент у занятия', () => {
  it('сохраняется и чистится', () => {
    const p = planOf({ plan: { slots: [{ id: 'a', days: [1], from: '19:00', to: '19:30', tool: 'vocal' }, { id: 'b', days: [1], from: '20:00', to: '20:30', tool: 'Bad Id!' }] } });
    expect(p.slots.map((s) => s.tool || null)).toEqual(['vocal', null]);
  });
});
