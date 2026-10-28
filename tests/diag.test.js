// Диагностика: счёт по дням, свёртка недели, процентиль, самоанализ (находки) и сводка для разработчика
import { describe, it, expect, beforeEach } from 'vitest';
import { addCount, addTime, addGauge, mergeDays, p95, avg, prune, dayKey, emptyState, count, time, gauge, event, provide, state, setLast, _reset } from '../src/core/diag.js';
import { diagnose, weekly, machine } from '../src/core/diagnose.js';

const day = () => ({ c: {}, t: {}, g: {} });
const NOW = new Date(2026, 9, 28, 12).getTime();

describe('счёт', () => {
  it('счётчики, времена, показатели складываются', () => {
    const d = day();
    addCount(d, 'a'); addCount(d, 'a', 2);
    [10, 20, 30, 600].forEach((ms) => addTime(d, 'x', ms));
    [0.5, 0.9].forEach((v) => addGauge(d, 'g', v));
    expect(d.c.a).toBe(3);
    expect(d.t.x.n).toBe(4); expect(d.t.x.max).toBe(600); expect(avg(d.t.x)).toBe(165);
    expect(p95(d.t.x)).toBe(600);
    expect(d.g.g.min).toBe(0.5); expect(d.g.g.max).toBe(0.9);
  });
  it('неделя — сумма дней; старое (больше 14 дней) убирается; бесконечность из JSON не портит минимум', () => {
    const s = emptyState();
    s.days[dayKey(NOW)] = day(); s.days[dayKey(NOW - 3 * 864e5)] = day(); s.days[dayKey(NOW - 20 * 864e5)] = day();
    addCount(s.days[dayKey(NOW)], 'k', 2); addCount(s.days[dayKey(NOW - 3 * 864e5)], 'k', 3); addCount(s.days[dayKey(NOW - 20 * 864e5)], 'k', 100);
    addGauge(s.days[dayKey(NOW)], 'm', 5);
    const j = JSON.parse(JSON.stringify(s)); j.days[dayKey(NOW - 3 * 864e5)].g.m = { n: 0, sum: 0, min: null, max: null };
    const w = mergeDays(j.days, 7, NOW);
    expect(w.c.k).toBe(5); expect(w.days).toBe(2); expect(w.g.m.min).toBe(5);
    prune(s, NOW);
    expect(Object.keys(s.days).length).toBe(2);
  });
  it('события несут обстановку; одинаковые подряд — только счётчиком', () => {
    _reset();
    provide('audio', () => ({ voices: 7 }));
    event('overload', { load: 97 }); event('overload', { load: 99 });
    const S = state();
    expect(S.events.length).toBe(1);
    expect(S.events[0][2].ctx.audio.voices).toBe(7);
    expect(Object.values(S.days)[0].c['ev.overload']).toBe(2);
    count('x'); time('y', 5); gauge('z', 1); setLast('check', [{ id: 'sound', st: 'ok' }]);
    expect(state().last.check.v[0].id).toBe('sound');
  });
});

describe('самоанализ', () => {
  const st = (fill) => { const s = emptyState(), d = (s.days[dayKey(NOW)] = day()); fill(d, s); return s; };
  it('всё спокойно — находок нет (кроме напоминания о самопроверке)', () => {
    const s = st((d, S) => { addGauge(d, 'audio.load', 0.3); S.last.check = { t: NOW, v: [{ id: 'sound', st: 'ok' }] }; });
    expect(diagnose(s, {}, NOW)).toEqual([]);
  });
  it('перегрузка с обстановкой: чаще при чём', () => {
    const s = st((d, S) => {
      addCount(d, 'audio.s90', 120);
      S.events = [[NOW - 1000, 'overload', { ctx: { open: 'drone,piano', audio: { pads: true, verb: 'conv', voices: 14 } } }], [NOW - 500, 'overload', { ctx: { open: 'drone', audio: { pads: true, verb: 'conv' } } }]];
      S.last.check = { t: NOW, v: [] };
    });
    const f = diagnose(s, {}, NOW);
    expect(f[0].id).toBe('overload'); expect(f[0].sev).toBe('bad'); expect(f[0].vars.min90).toBe(2);
    expect(f[0].vars.when).toContain('drone');
  });
  it('вылеты, ошибки по разделам, медленные дорожки, плохая самопроверка, мало запаса звука', () => {
    const s = st((d, S) => {
      addCount(d, 'app.crash'); addCount(d, 'log.e.jobs', 3); addCount(d, 'log.e.pdf', 1);
      addGauge(d, 'job.stems.x', 3.2);
      S.last.check = { t: NOW, v: [{ id: 'mic', st: 'fail' }, { id: 'sound', st: 'ok' }] };
      S.last.bench = { t: NOW, v: { x: 1.5 } };
    });
    const ids = diagnose(s, { audio: { base: 100, out: 90 } }, NOW).map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(['crash', 'errors', 'stems', 'check', 'bench', 'latency']));
    const w = weekly(s, NOW);
    expect(w.errors).toBe(4); expect(w.crashes).toBe(1); expect(w.stems).toBe(3.2);
    const m = machine(s, {}, NOW);
    expect(m.c['log.e.jobs']).toBe(3); expect(m.g['job.stems.x'][3]).toBe(3.2);
    expect(JSON.parse(JSON.stringify(m)).v).toBe(1);
  });
});
