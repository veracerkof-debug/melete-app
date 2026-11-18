// Витрина не бывает пустой: у каждого инструмента есть демонстрационные данные (посев) или причина, почему их быть не может.
// Новый инструмент без записи в src/showcase/seeds/index.js — красные тесты (правило 13 в CLAUDE.md).
import { describe, it, expect } from 'vitest';
import { modules } from '../src/modules/index.js';
import { SEEDS, NO_DEMO, runSeeds, seedFlag } from '../src/showcase/seeds/index.js';
import { earDemo, beatDemo, vocalDemo } from '../src/showcase/seeds/builders.js';
import { normalizeEarData, DRILL_IDS } from '../src/music/ear.js';
import { lessonsOf, progressOf } from '../src/music/course.js';
import { EAR_COURSE } from '../src/modules/ear/course.js';
import { BEAT_COURSE } from '../src/modules/beat/course.js';

const NOW = new Date(2026, 10, 15, 12).getTime();

describe('витрина: покрытие инструментов', () => {
  const ids = modules.map((m) => m.id);
  it('каждый инструмент — в SEEDS или в NO_DEMO (с причиной): добавили инструмент — добавьте демо-данные', () => {
    const miss = ids.filter((id) => !SEEDS[id] && !NO_DEMO[id]);
    expect(miss, 'нет демо-данных и причины их отсутствия: ' + miss.join(', ')).toEqual([]);
  });
  it('нигде не дублируется и нет лишних записей про несуществующие инструменты', () => {
    expect(Object.keys(SEEDS).filter((id) => NO_DEMO[id])).toEqual([]);
    expect([...Object.keys(SEEDS), ...Object.keys(NO_DEMO)].filter((id) => !ids.includes(id))).toEqual([]);
  });
  it('причина отсутствия данных — осмысленная, посевы — функции', () => {
    Object.entries(NO_DEMO).forEach(([id, why]) => expect(String(why).length, id).toBeGreaterThan(15));
    Object.entries(SEEDS).forEach(([id, fn]) => expect(typeof fn, id).toBe('function'));
  });
});

describe('витрина: данные инструментов', () => {
  it('слух: статистика по всем упражнениям, дни и пройденная часть курса', () => {
    const E = earDemo(NOW);
    DRILL_IDS.forEach((k) => expect(Object.keys(E.stats[k]).length, k).toBeGreaterThan(0));
    expect(Object.keys(E.days).length).toBeGreaterThan(20);
    const p = progressOf(EAR_COURSE, E.course); expect(p.done).toBeGreaterThan(0); expect(p.done).toBeLessThan(p.total);
    expect(normalizeEarData(JSON.parse(JSON.stringify(E))).stats.iv['6'].t).toBeGreaterThan(0);
    expect(earDemo(NOW)).toEqual(earDemo(NOW)); // повторяемо
  });
  it('ритм: дни, ячейки, упражнения, доли и курс', () => {
    const d = beatDemo(NOW);
    expect(Object.keys(d.days).length).toBeGreaterThan(20); expect(Object.keys(d.cells).length).toBeGreaterThan(5); expect(Object.keys(d.drills).length).toBeGreaterThan(2); expect(Object.keys(d.beat).length).toBe(4);
    const p = progressOf(BEAT_COURSE, d.course); expect(p.done).toBeGreaterThan(0);
    expect(lessonsOf(BEAT_COURSE).length).toBeGreaterThan(p.done);
  });
  it('вокал: диапазон, тип, история и дневник по дням', () => {
    const d = vocalDemo(NOW);
    expect(d.range.hi).toBeGreaterThan(d.range.lo); expect(d.range.phi).toBeGreaterThan(d.range.hi - 1); expect(d.hist.length).toBeGreaterThan(1);
    expect(d.log.length).toBeGreaterThan(20); expect(d.log.every((x) => x.sec > 0 && x.n > 0)).toBe(true);
    expect(d.log.map((x) => x.d)).toEqual([...d.log.map((x) => x.d)].sort());
  });
});

describe('витрина: запуск посевов', () => {
  const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
  it('каждый посев — один раз; упавший не мешает остальным и повторится', async () => {
    const calls = []; const ids = Object.keys(SEEDS);
    const orig = {}; ids.forEach((id) => { orig[id] = SEEDS[id]; SEEDS[id] = async () => { calls.push(id); if (id === 'looper' && !SEEDS.__ok) throw new Error('сбой'); }; });
    try {
      const st = store(), n1 = await runSeeds({}, st);
      expect(n1).toBe(ids.length - 1); expect(st.getItem(seedFlag('looper'))).toBeNull();
      SEEDS.__ok = true; const n2 = await runSeeds({}, st);
      expect(n2).toBe(1); expect(calls.filter((c) => c === 'ear').length).toBe(1);
      expect(await runSeeds({}, st)).toBe(0);
    } finally { ids.forEach((id) => { SEEDS[id] = orig[id]; }); delete SEEDS.__ok; }
  });
});
