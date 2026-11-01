// Уроки тренажёров: сдача, следующий урок, повторение по сроку, проверка уровня; курсы слуха и ритма — целостность.
import { describe, it, expect } from 'vitest';
import { PASS, DAY, REVIEW_DAYS, lessonsOf, normalizeProg, recordLesson, recordReview, nextLesson, dueReviews, progressOf, placementPlan, applyPlacement, passed } from '../src/music/course.js';
import { EAR_COURSE, lessonConf as earConf } from '../src/modules/ear/course.js';
import { BEAT_COURSE, lessonConf as beatConf } from '../src/modules/beat/course.js';
import { normalizeEar, generate } from '../src/music/ear.js';
import { normalizeConf, genRhythm, poolOf } from '../src/music/rhythm.js';
import ru from '../src/modules/ear/i18n/ru.json';
import en from '../src/modules/ear/i18n/en.json';
import bru from '../src/modules/beat/i18n/ru.json';
import buz from '../src/modules/beat/i18n/uz.json';

const C = [{ id: 'a', lessons: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }] }, { id: 'b', lessons: [{ id: 'b1' }, { id: 'b2' }] }];

describe('путь уроков', () => {
  it('сдача, следующий, прогресс', () => {
    const p = normalizeProg({});
    expect(nextLesson(C, p).id).toBe('a1');
    recordLesson(p, 'a1', 0.7, 1);
    expect(passed(p, 'a1')).toBe(false);
    expect(nextLesson(C, p).id).toBe('a1');
    recordLesson(p, 'a1', 0.9, 2);
    expect(passed(p, 'a1')).toBe(true);
    expect(p.done.a1).toMatchObject({ best: 0.9, n: 2, k: 0, at: 2 });
    recordLesson(p, 'a1', 0.5, 3); // плохая попытка не отнимает сданное
    expect(passed(p, 'a1')).toBe(true);
    expect(nextLesson(C, p).id).toBe('a2');
    expect(progressOf(C, p)).toEqual({ done: 1, total: 5 });
  });
  it('повторение по сроку: 1, 3, 7… дней; ошибка — снова скоро', () => {
    const p = normalizeProg({}), t0 = 10 * DAY;
    recordLesson(p, 'a1', 1, t0);
    expect(dueReviews(C, p, t0 + DAY / 2)).toEqual([]);
    expect(dueReviews(C, p, t0 + DAY).map((l) => l.id)).toEqual(['a1']);
    recordReview(p, 'a1', true, t0 + DAY);
    expect(p.done.a1.k).toBe(1);
    expect(dueReviews(C, p, t0 + DAY + 2 * DAY)).toEqual([]);
    expect(dueReviews(C, p, t0 + DAY + REVIEW_DAYS[1] * DAY).length).toBe(1);
    recordReview(p, 'a1', false, t0 + 5 * DAY);
    expect(dueReviews(C, p, t0 + 5 * DAY).length).toBe(1);
    expect(dueReviews(C, p, t0 + 5 * DAY, 'a1')).toEqual([]);
  });
  it('проверка уровня: подряд верные пробы главы — уроки до них сданы', () => {
    const plan = placementPlan(C, 2);
    expect(plan.map((x) => x.id)).toEqual(['a1', 'a1', 'a2', 'a2', 'a3', 'a3', 'b1', 'b1', 'b2', 'b2']);
    const p = normalizeProg({});
    const marked = applyPlacement(C, p, { a1: [true, true], a2: [true, false], a3: [true, true], b1: [false, true] }, 5);
    expect(marked).toEqual(['a1']);
    expect(p.done.a1).toMatchObject({ pl: true, best: PASS });
    expect(nextLesson(C, p).id).toBe('a2');
    expect(p.pl).toBe(5);
  });
});

describe('курсы', () => {
  const ids = (c) => lessonsOf(c).map((l) => l.id);
  it('слух: уроки уникальны, названия есть, вопросы генерируются', () => {
    const all = ids(EAR_COURSE);
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBeGreaterThanOrEqual(30);
    EAR_COURSE.forEach((ch) => { expect(ru['lch.' + ch.id], ch.id).toBeTruthy(); expect(en['lch.' + ch.id], ch.id).toBeTruthy(); });
    lessonsOf(EAR_COURSE).forEach((l) => {
      expect(ru['ls.' + l.id], l.id).toBeTruthy();
      expect(en['ls.' + l.id], l.id).toBeTruthy();
      const e = normalizeEar(earConf(normalizeEar({}), l));
      expect(e.sec).toBe(l.sec);
      for (let i = 0; i < 5; i++) { const q = generate(l.sec, e); expect(q).toBeTruthy(); if (l.set && l.sec !== 'dg') expect(l.set.map(String)).toContain(String(q.ans)); }
    });
  });
  it('ритм: уроки уникальны, названия есть, ритмы строятся', () => {
    const all = ids(BEAT_COURSE);
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBeGreaterThanOrEqual(30);
    lessonsOf(BEAT_COURSE).forEach((l) => {
      expect(bru['ls.' + l.id], l.id).toBeTruthy();
      expect(buz['ls.' + l.id], l.id).toBeTruthy();
      const e = normalizeConf(beatConf(normalizeConf({}), l));
      expect(e.drill).toBe(l.drill);
      if (l.drill !== 'pulse' && l.drill !== 'poly') {
        expect(poolOf(e.meter, e.level, e.custom).length).toBeGreaterThan(0);
        expect(genRhythm({ meter: e.meter, bars: e.bars, level: e.level, custom: e.custom }).bars.length).toBe(2);
      }
    });
  });
});
