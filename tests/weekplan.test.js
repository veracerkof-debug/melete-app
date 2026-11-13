// Перерывы расписания в статистике (слово автора 13.11.2026): дни перерыва — не дни практики, цель недели меньше,
// неделя целиком в перерыве не рвёт серию.
import { describe, it, expect } from 'vitest';
import { weekPlan, streakInfo } from '../src/core/stats.js';
import { weekStart, DAY } from '../src/core/time.js';

const NOW = new Date(2026, 10, 18, 15).getTime(); // среда
const key = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const base = () => ({ goalMin: 300, days: [1, 1, 1, 1, 1, 0, 0], plan: { slots: [{ id: 'a', days: [0, 1, 2, 3, 4], from: '19:00', to: '20:00' }], off: [], once: {} } });

describe('weekPlan', () => {
  it('без перерывов — прежняя цель', () => {
    const w = weekPlan(base(), NOW);
    expect(w.goal).toBe(300 * 60);
    expect(w.days).toEqual([1, 1, 1, 1, 1, 0, 0]);
    expect(w.now).toBeNull();
  });
  it('перерыв на два дня практики — цель на 2/5 меньше, сегодня — перерыв', () => {
    const st = base(), ws = weekStart(NOW);
    st.plan.off = [{ id: 'o', from: key(ws + 2 * DAY), to: key(ws + 3 * DAY), title: 'Отпуск' }];
    const w = weekPlan(st, NOW);
    expect(w.goal).toBe(180 * 60);
    expect(w.days).toEqual([1, 1, 0, 0, 1, 0, 0]);
    expect(w.now.title).toBe('Отпуск');
  });
  it('вся неделя в перерыве — цель 0, серия не рвётся', () => {
    const st = base(), ws = weekStart(NOW), prev = ws - 7 * DAY;
    st.plan.off = [{ id: 'o', from: key(prev), to: key(prev + 6 * DAY), title: '' }];
    const ses = [];
    // эта неделя и позапрошлая — по 5 часов
    [ws + DAY, ws - 14 * DAY + DAY].forEach((t) => ses.push({ start: t + 19 * 3600000, dur: 300 * 60 }));
    expect(weekPlan(st, prev + 3 * DAY).goal).toBe(0);
    const s = streakInfo(ses, st, NOW);
    expect(s.weeks).toBe(2);
    const s0 = streakInfo(ses, { ...st, plan: { ...st.plan, off: [] } }, NOW);
    expect(s0.weeks).toBe(1);
  });
});

import { buildRecord, lastNext, createActive } from '../src/core/session.js';
describe('разбор после занятия', () => {
  it('пустые поля — без review, заметка как раньше', () => {
    const a = createActive({ type: 'free' }, 1000);
    const r = buildRecord(a, { dur: 120, best: null, review: { good: ' ', bad: '', next: '' } }, 200000);
    expect(r.review).toBeUndefined();
    expect(r.note).toBeNull();
  });
  it('«Дальше» — из последнего занятия того же рода', () => {
    const ses = [
      { type: 'free', songId: null, start: 1, review: { next: 'старое' } },
      { type: 'free', songId: null, start: 5, review: { next: 'новое' } },
      { type: 'song', songId: 's1', start: 9, review: { next: 'песня' } },
    ];
    expect(lastNext(ses, { type: 'free', songId: null }).next).toBe('новое');
    expect(lastNext(ses, { type: 'song', songId: 's1' }).next).toBe('песня');
    expect(lastNext(ses, { type: 'song', songId: 's2' })).toBeNull();
    expect(lastNext(ses, { type: 'tool', tool: 'metro' })).toBeNull();
  });
});
