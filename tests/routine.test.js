// План занятия (слово автора 13.11.2026): пункты, переходы, разбивка в запись, план из расписания.
import { describe, it, expect } from 'vitest';
import { cleanRoutine, saveRoutine, routinesOf, startRun, itemLeft, goTo, runRecord, slotRoutine, example } from '../src/core/routine.js';

describe('routine', () => {
  it('пустые пункты отбрасываются, минуты в пределах', () => {
    const r = cleanRoutine({ title: 'A', items: [{ title: '', min: 5 }, { title: 'Гаммы', min: 999 }, { tool: 'metro', min: 0 }] });
    expect(r.items.map((x) => x.min)).toEqual([180, 1]);
    expect(cleanRoutine({ items: [] })).toBeNull();
  });
  it('сохранение и пример', () => {
    const st = {};
    const r = saveRoutine(st, example('guitar', (k) => k));
    expect(routinesOf(st)).toHaveLength(1);
    expect(r.items[0].tool).toBe('metro');
    saveRoutine(st, { ...r, title: 'B' });
    expect(routinesOf(st)).toHaveLength(1);
    expect(routinesOf(st)[0].title).toBe('B');
  });
  it('переходы и разбивка', () => {
    const run = startRun(cleanRoutine({ items: [{ title: 'a', min: 5 }, { title: 'b', min: 10 }] }), 0);
    expect(itemLeft(run, 60)).toBe(240);
    expect(goTo(run, 200)).toBe(true);
    expect(goTo(run, 300)).toBe(false); // последнего пункта дальше нет
    expect(itemLeft(run, 260)).toBe(540);
    goTo(run, 400, 0);
    expect(runRecord(run, 460).items.map((x) => x.sec)).toEqual([260, 200]);
  });
  it('план из расписания — за 30 минут до начала и до конца занятия', () => {
    const d = new Date(2026, 10, 18, 18, 40), wd = (d.getDay() + 6) % 7;
    const st = { routines: [{ id: 'r1', title: 'A', items: [{ title: 'x', min: 5 }] }], plan: { slots: [{ id: 's', days: [wd], from: '19:00', to: '20:00', routine: 'r1' }], off: [], once: {} } };
    expect(slotRoutine(st, d.getTime())).toBe('r1');
    expect(slotRoutine(st, new Date(2026, 10, 18, 18, 0).getTime())).toBeNull();
    expect(slotRoutine(st, new Date(2026, 10, 18, 20, 5).getTime())).toBeNull();
  });
});
