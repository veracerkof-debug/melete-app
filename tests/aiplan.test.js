import { describe, it, expect } from 'vitest';
import { cleanPlanOp, applyPlanOps, undoPlanOps, planContext, describePlan } from '../src/core/ai/planops.js';
import { planOf } from '../src/core/schedule.js';
import { extract } from '../src/core/ai/proposals.js';
import { clean as normalize } from '../src/core/ai/config.js';

const st0 = () => ({ songs: [], days: [1, 0, 0, 0, 0, 0, 0], remind: { time: '19:00' }, goalMin: 60 });
describe('нейросеть: расписание', () => {
  it('очистка правок: время, дни, дата', () => {
    expect(cleanPlanOp({ op: 'add', days: [4], from: '17:00', to: '18:00', title: 'Репетиция' })).toMatchObject({ days: [4], from: '17:00', to: '18:00' });
    expect(cleanPlanOp({ op: 'add', days: [4], from: '18:00', to: '17:00' })).toBe(null);
    expect(cleanPlanOp({ op: 'add', days: [9], from: '9:00', to: '10:00' })).toBe(null);
    expect(cleanPlanOp({ op: 'add', date: '2026-12-05', from: '9:00', to: '10:00' })).toMatchObject({ date: '2026-12-05', from: '09:00' });
    expect(cleanPlanOp({ op: 'drop' })).toBe(null);
  });
  it('запрос автора: пт 17:00 час, сб 12:00 три часа, вс 9:00 час — и «Отменить»', () => {
    const st = st0(), before = JSON.stringify(st);
    const ops = [{ op: 'add', days: [4], from: '17:00', to: '18:00' }, { op: 'add', days: [5], from: '12:00', to: '15:00' }, { op: 'add', days: [6], from: '09:00', to: '10:00' }].map(cleanPlanOp);
    const r = applyPlanOps(st, ops);
    expect(r.n).toBe(3);
    const p = planOf(st);
    expect(p.slots.some((s) => s.days.includes(5) && s.from === '12:00' && s.to === '15:00')).toBe(true);
    expect(planContext(st)).toContain('12:00–15:00');
    expect(describePlan(ops, st)[1]).toContain('сб 12:00–15:00');
    expect(undoPlanOps(st, r.prev)).toBe(true);
    expect(JSON.stringify(st)).toBe(before);
  });
  it('блок melete-plan разбирается; без права «Правка» — blocked', () => {
    const body = '```melete-plan\n[{"op":"add","days":[4],"from":"17:00","to":"18:00"}]\n```';
    const on = extract(body, normalize({ on: true, access: { plan: 'write' } })).proposals[0];
    expect(on).toMatchObject({ kind: 'plan', status: 'pending' });
    const ro = extract(body, normalize({ on: true, access: { plan: 'read' } })).proposals[0];
    expect(ro.status).toBe('blocked');
  });
});

import { scaleWeek, weekMin } from '../src/core/schedule.js';
describe('недельная норма', () => {
  it('scaleWeek приводит неделю к цели с шагом 15 минут', () => {
    const st = { days: [1, 0, 0, 0, 0, 0, 0], remind: { time: '19:00' }, goalMin: 420 };
    applyPlanOps(st, [{ op: 'add', days: [0, 2], from: '18:00', to: '19:00' }, { op: 'add', days: [4], from: '17:00', to: '18:00' }, { op: 'add', days: [5], from: '12:00', to: '15:00' }].map(cleanPlanOp));
    const p = planOf(st);
    scaleWeek(p, 720); expect(Math.abs(weekMin(p) - 720)).toBeLessThan(15);
    scaleWeek(p, 300); expect(Math.abs(weekMin(p) - 300)).toBeLessThan(15);
    p.slots.forEach((s) => expect(durOfTest(s)).toBeGreaterThanOrEqual(15));
  });
  it('op goal: очищается и применяется, goalMin пересчитан', () => {
    const st = { days: [0, 0, 0, 0, 0, 0, 0], remind: {}, goalMin: 60 };
    applyPlanOps(st, [{ op: 'add', days: [0, 1, 2], from: '09:00', to: '10:00' }].map(cleanPlanOp));
    expect(cleanPlanOp({ op: 'goal', hours: 12 }).minutes).toBe(720); expect(cleanPlanOp({ op: 'goal', hours: 200 })).toBe(null);
    const r = applyPlanOps(st, [cleanPlanOp({ op: 'goal', hours: 6 })]);
    expect(r.n).toBe(1); expect(Math.abs(st.goalMin - 360)).toBeLessThan(15);
    expect(undoPlanOps(st, r.prev)).toBe(true); expect(st.goalMin).toBe(180);
  });
});
const durOfTest = (s) => { const m = (v) => { const [h, k] = v.split(':').map(Number); return h * 60 + k; }; return m(s.to) - m(s.from); };
