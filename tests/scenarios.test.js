// Сценарии демонстрации (src/showcase/scenarios.js): ученик и учитель — настройки в нужной форме
import { describe, it, expect } from 'vitest';
import { studentSettings, teacherSettings, studentBook, STUDENT_CODE } from '../src/showcase/scenarios.js';
import { studentOn, unlockStudent } from '../src/core/student.js';
import { lessonOpen, homework, studentsOf, summaryOf, COURSE_PATH } from '../src/core/classroom.js';

const NOW = new Date(2026, 10, 25, 12).getTime();
describe('демонстрация: сценарии', () => {
  it('ученик: блокировка кодом, учитель, задания, открытые уроки', () => {
    for (const lang of ['ru', 'en', 'uz']) {
      const s = studentSettings(lang, NOW), settings = { ...s };
      expect(studentOn(settings)).toBe(true);
      expect(s.student.teacher.name).toBeTruthy();
      expect(homework(settings).length).toBe(2); // два задания ещё не сделаны
      expect(lessonOpen(settings, COURSE_PATH[0])).toBe(true);
      expect(lessonOpen(settings, COURSE_PATH[30])).toBe(false);
      expect(s.profile.level).toBe('beginner');
    }
    const s = studentSettings('ru', NOW), copy = JSON.parse(JSON.stringify(s));
    expect(unlockStudent({ student: copy.student }, '0000')).toBe(false);
    expect(unlockStudent({ student: copy.student }, STUDENT_CODE)).toBe(true);
    const b = studentBook(); expect(Object.keys(b.done).length).toBe(11); expect(b.done[COURSE_PATH[0]]).toBe(true);
  });
  it('учитель: четыре ученика с отчётами и заданиями', () => {
    for (const lang of ['ru', 'en', 'uz']) {
      const t = teacherSettings(lang, NOW), list = studentsOf(t);
      expect(list.length).toBe(4);
      for (const r of list) { expect(r.report.per.length).toBe(7); expect(r.report.total).toBe(r.report.per.reduce((a, b) => a + b, 0)); expect(r.tasks.length).toBe(3); expect(r.lessons.length).toBeGreaterThan(0); }
      expect(summaryOf(t).length).toBe(4);
    }
  });
});
