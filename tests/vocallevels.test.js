import { describe, it, expect } from 'vitest';
import { VLEVEL_PLAN, VLEVEL_COUNT, clampVLevel, vlevelList } from '../src/music/vocallevels.js';
import { exById, PROGRAMS, PROGRAM_IDS } from '../src/modules/vocal/exercises.js';

describe('вокал: 10 уровней «Начать занятие»', () => {
  it('десять уровней, все упражнения существуют, заминка в конце', () => {
    expect(VLEVEL_PLAN).toHaveLength(VLEVEL_COUNT);
    VLEVEL_PLAN.forEach((l) => { l.forEach((id) => expect(exById(id), id).toBeTruthy()); expect(exById(l[l.length - 1]).cool).toBe(true); });
  });
  it('растут: упражнений не меньше, чем на прошлом уровне минус одно', () => {
    for (let i = 1; i < VLEVEL_PLAN.length; i++) expect(VLEVEL_PLAN[i].length).toBeGreaterThanOrEqual(VLEVEL_PLAN[i - 1].length - 1);
  });
  it('зажим и копия', () => {
    expect(clampVLevel(0)).toBe(1); expect(clampVLevel(99)).toBe(10); expect(clampVLevel('x')).toBe(1);
    const a = vlevelList(3); a.push('x'); expect(vlevelList(3)).not.toContain('x');
  });
  it('уровни — программы vl1…vl10, но не в списке программ', () => {
    expect(PROGRAMS.vl10).toEqual(VLEVEL_PLAN[9]);
    expect(PROGRAM_IDS.some((x) => x.startsWith('vl'))).toBe(false);
  });
});
