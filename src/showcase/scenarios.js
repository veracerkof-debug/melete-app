// Сценарии демонстрации (слово автора 25.11.2026): ученик и учитель — со своей выдуманной жизнью: настройки, история, задания, отчёты.
// Профессионал (Анна) — прежний, в main.js. Чистые данные, без DOM: проверяются tests/scenarios.test.js.
import { sha256 } from '../core/integrity.js';
import { weekStart } from '../core/time.js';
import { COURSE_PATH } from '../core/classroom.js';

const DAY = 86400000, MIN = 60;
export const STUDENT_CODE = '1234'; // код блокировки у демо-ученика (показан в приветствии)
const NAMES = {
  student: { ru: 'Тимур', en: 'Tim', uz: 'Timur' },
  teacher: { ru: 'Анна Сергеевна', en: 'Anna S.', uz: 'Anna S.' },
};
const KIDS = {
  ru: ['Тимур', 'Лиза', 'Даниил', 'Мария'], en: ['Tim', 'Liza', 'Daniel', 'Maria'], uz: ['Timur', 'Liza', 'Daniyor', 'Mariya'],
};
const TASKS = {
  ru: ['Выучить аккорды C, D и E', 'Сменить C → G десять раз без остановки', 'Сыграть «Oh! Susanna» от начала до конца', 'Гамма до мажор под метроном 60'],
  en: ['Learn the chords C, D and E', 'Change C → G ten times without stopping', 'Play “Oh! Susanna” from start to finish', 'C major scale with the metronome at 60'],
  uz: ['C, D va E akkordlarini o‘rganish', 'C → G ni to‘xtamay o‘n marta almashtirish', '«Oh! Susanna» ni boshidan oxirigacha chalish', 'Do major gammasi metronom 60 da'],
};
const NOTE = {
  ru: 'Хорошая неделя! Главное сейчас — ровный пульс и расслабленная рука. В пятницу сыграем песню вместе.',
  en: 'A good week! What matters now is an even pulse and a relaxed hand. On Friday we will play the song together.',
  uz: 'Yaxshi hafta! Hozir eng muhimi — tekis puls va bo‘shashgan qo‘l. Juma kuni qo‘shiqni birga chalamiz.',
};

// Настройки сценария «ученик»: блокировка кодом, учитель, задания, открытые уроки; профиль новичка
export function studentSettings(lang, now) {
  const salt = '482913075516', n = 13, left = (d) => now + d * DAY;
  const tasks = [
    { id: 'tdemo1', text: TASKS[lang][0], kind: 'lesson', ref: 'g5', due: 0, at: now - 9 * DAY, done: true, doneAt: now - 6 * DAY },
    { id: 'tdemo2', text: TASKS[lang][1], kind: 'free', ref: null, due: 0, at: now - 5 * DAY, done: true, doneAt: now - 2 * DAY },
    { id: 'tdemo3', text: TASKS[lang][2], kind: 'lesson', ref: 'g37', due: left(3), at: now - 2 * DAY, done: false, doneAt: 0 },
    { id: 'tdemo4', text: TASKS[lang][3], kind: 'lesson', ref: 'g28', due: left(6), at: now - 1 * DAY, done: false, doneAt: 0 },
  ];
  return {
    profile: { name: NAMES.student[lang], instruments: ['guitar'], level: 'beginner', priorHours: 0 },
    student: { on: true, salt, hash: sha256('student|' + salt + '|' + STUDENT_CODE), open: [], openLessons: COURSE_PATH.slice(0, n), tasks, teacher: { key: 'demo-teacher', name: NAMES.teacher[lang], at: now - 40 * DAY }, note: NOTE[lang], syncedAt: now - 3 * 3600000 },
    goalMin: 120, helpOff: true,
  };
}
// Что отмечено в учебнике у ученика
export const studentBook = () => ({ lvl: 'beginner', sec: 'first', ch: 'g10', mode: 'lessons', done: Object.fromEntries(COURSE_PATH.slice(0, 11).map((id) => [id, true])) });

// Настройки сценария «учитель»: четыре ученика, у каждого задания, открытые уроки, заметка и свежий отчёт недели
export function teacherSettings(lang, now) {
  const ws = weekStart(now), names = KIDS[lang];
  const mk = (i, lessons, per, songs, done) => {
    const total = per.reduce((a, b) => a + b, 0), at = now - (i + 1) * 3600000 * 5;
    return {
      addr: 'demo-student-' + (i + 1), name: names[i], open: i === 2 ? ['ear'] : [], lessons: COURSE_PATH.slice(0, lessons), note: i === 0 ? NOTE[lang] : '', reportAt: at, sentAt: at - 3600000,
      tasks: TASKS[lang].slice(0, 3).map((text, k) => ({ id: 'd' + i + k, text, kind: k === 2 ? 'lesson' : 'free', ref: k === 2 ? 'g' + (5 + k) : null, due: 0, at: now - 6 * DAY, done: k < done, doneAt: k < done ? now - (4 - k) * DAY : 0 })),
      report: { at, ws, per, total, goal: 150 * MIN, songs },
    };
  };
  const m = (x) => x * MIN;
  const students = [
    mk(0, 14, [m(25), 0, m(30), m(20), 0, m(40), m(15)], [{ title: 'Oh! Susanna', sec: m(48), from: 60, to: 76 }, { title: 'When the Saints', sec: m(35), from: 56, to: 64 }], 2),
    mk(1, 20, [m(35), m(30), m(25), 0, m(30), m(45), m(25)], [{ title: 'Scarborough Fair', sec: m(60), from: 62, to: 70 }, { title: 'House of the Rising Sun', sec: m(40), from: 54, to: 66 }], 3),
    mk(2, 6, [0, m(15), 0, m(20), 0, m(10), 0], [{ title: 'When the Saints', sec: m(25), from: 50, to: 56 }], 1),
    mk(3, 31, [m(40), m(35), m(30), m(45), m(25), m(50), m(30)], [{ title: 'House of the Rising Sun', sec: m(95), from: 66, to: 84 }, { title: 'Scarborough Fair', sec: m(50), from: 70, to: 80 }], 3),
  ];
  return {
    profile: { name: NAMES.teacher[lang], instruments: ['guitar'], level: 'advanced', priorHours: 4200 },
    classroom: { students: Object.fromEntries(students.map((s) => [s.addr, s])) },
    goalMin: 300, helpOff: true,
  };
}
