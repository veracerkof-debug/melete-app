import { describe, it, expect } from 'vitest';
import { lockStudent, studentOn } from '../src/core/student.js';
import { newTask, studentOf, addTask, removeTask, toggleOpen, packOf, bindTeacher, applyPack, markDone, lessonOpen, homework, reportOf, mergeReport, tsHandle, pullReport, pushPack, tasksLeft, teacherKey } from '../src/core/classroom.js';
import { handleRequest } from '../src/core/sync.js';

const NOW = Date.UTC(2026, 10, 25, 12); // среда
const app = (settings, extra = {}) => ({ store: { state: { settings, sessions: [], songs: [], ...extra }, settingsChanged() { this.n = (this.n || 0) + 1; }, replaceState() {} }, render() {} });
const student = () => { const s = {}; lockStudent(s, '4821'); return s; };

describe('учитель и ученик: данные', () => {
  it('задания: добавление, удаление, предел', () => {
    const rec = studentOf({}, 'a');
    const t = addTask(rec, 'Выучить C и G', { kind: 'lesson', ref: 'g6' }, NOW);
    expect(t.text).toBe('Выучить C и G'); expect(rec.tasks).toHaveLength(1);
    expect(removeTask(rec, t.id)).toBe(true); expect(rec.tasks).toHaveLength(0);
    for (let i = 0; i < 70; i++) addTask(rec, 'x' + i, {}, NOW + i);
    expect(rec.tasks.length).toBeLessThanOrEqual(60);
  });
  it('открытие: допустимые инструменты и уроки', () => {
    const rec = studentOf({}, 'a');
    expect(toggleOpen(rec, 'tool', 'ear', true)).toBe(true);
    expect(toggleOpen(rec, 'tool', 'bible', true)).toBe(false);
    expect(toggleOpen(rec, 'lesson', 'g3', true)).toBe(true);
    expect(toggleOpen(rec, 'lesson', 'evil<script>', true)).toBe(false);
    expect(packOf(rec).open).toEqual({ tools: ['ear'], lessons: ['g3'] });
  });
  it('пакет: ученик принимает, свои отметки сохраняет, учитель главный', () => {
    const rec = studentOf({}, 'a'); const t1 = addTask(rec, 'A', {}, NOW), t2 = addTask(rec, 'B', {}, NOW + 1);
    toggleOpen(rec, 'lesson', 'g1', true);
    const s = student(), st = { student: s.student };
    expect(applyPack(st, packOf(rec), NOW).added).toBe(2);
    markDone(st, t1.id, true, NOW + 5);
    removeTask(rec, t2.id); addTask(rec, 'C', {}, NOW + 9);
    const r = applyPack(st, packOf(rec), NOW + 10);
    expect(r.ok).toBe(true);
    expect(st.student.tasks.map((t) => t.text)).toEqual(['A', 'C']);
    expect(st.student.tasks[0].done).toBe(true); // отметка ученика не потеряна
    expect(homework(st).map((t) => t.text)).toEqual(['C']);
    expect(applyPack({}, packOf(rec)).why).toBe('off');
    expect(applyPack(st, { v: 9 }).why).toBe('format');
  });
  it('пакет: чужие данные отсекаются', () => {
    const st = student();
    applyPack(st, { v: 1, tasks: [{ id: 't1', text: 'x'.repeat(5000), kind: 'evil', ref: 'r' }, { id: 't1', text: 'дубль' }, { text: 'без id' }], open: { tools: ['ear', 'bible', 'studio'], lessons: ['g1', '../x'] } }, NOW);
    expect(st.student.tasks).toHaveLength(1);
    expect(st.student.tasks[0].text.length).toBe(400); expect(st.student.tasks[0].kind).toBe('free');
    expect(st.student.open).toEqual(['ear', 'studio']); expect(st.student.openLessons).toEqual(['g1']);
  });
  it('уроки: без учителя видны все, с учителем — открытые им', () => {
    const st = student();
    expect(lessonOpen(st, 'g5')).toBe(true);
    expect(bindTeacher(st, 'KEY', 'Учитель', NOW)).toBe(true);
    expect(bindTeacher(st, 'KEY2', 'Другой', NOW)).toBe(false); // второго учителя нет
    expect(teacherKey(st)).toBe('KEY');
    expect(lessonOpen(st, 'g5')).toBe(false);
    applyPack(st, { v: 1, tasks: [], open: { tools: [], lessons: ['g5'] } }, NOW);
    expect(lessonOpen(st, 'g5')).toBe(true);
    expect(lessonOpen({}, 'g9')).toBe(true); // не ученик
  });
  it('отчёт: неделя, песни, отметки; учитель обновляет свои задания', () => {
    const rec = studentOf({}, 'a'); const t = addTask(rec, 'A', {}, NOW);
    const st = student(); applyPack(st, packOf(rec), NOW); markDone(st, t.id, true, NOW + 1);
    const sessions = [{ start: NOW - 3600e3, dur: 1200, songId: 's1', bpm: 80, instrument: 'guitar' }];
    const rep = reportOf(st, sessions, [{ id: 's1', title: 'Песня' }], NOW);
    expect(rep.total).toBe(1200); expect(rep.songs[0].title).toBe('Песня'); expect(rep.tasks[0].done).toBe(true);
    expect(JSON.stringify(rep)).not.toMatch(/4821|hash|salt/); // ничего лишнего: ни кода, ни хэша
    expect(mergeReport(rec, rep, NOW)).toBe(true);
    expect(rec.tasks[0].done).toBe(true); expect(tasksLeft(rec)).toBe(0); expect(rec.report.total).toBe(1200);
    expect(mergeReport(rec, { v: 99 })).toBe(false);
  });
});

// петля: учитель (клиент) ↔ ученик (сервер) через настоящий handleRequest
describe('учитель и ученик: по сети (петля)', () => {
  const setup = () => {
    const ss = student(); const sApp = app(ss);
    const mem = { peers: {} }, ctx = { app: sApp, mem, code: '123456', name: 'Ученик', now: () => NOW, paired: (key, name) => { if (bindTeacher(ss, key, name)) ctx.code = ''; }, pairBlocked: () => !!ss.student.teacher, ts: (p, j, peer) => tsHandle(sApp, p, j, peer, NOW) };
    const H = async (method, url, { key = '', json = null } = {}) => {
      const path = new URL(url).pathname, r = await handleRequest(ctx, { method, path, query: {}, key, json });
      if (r.status >= 400) throw Object.assign(new Error('http'), { status: r.status });
      return r.json;
    };
    return { ss, sApp, mem, ctx, H };
  };
  it('сопряжение → пакет → отчёт; чужой и второй учитель отсечены', async () => {
    const { ss, mem, ctx, H } = setup();
    const tSet = {}, tApp = app(tSet);
    const pr = await H('POST', 'https://x/melete/v1/pair', { json: { code: '123456', name: 'Учитель' } });
    expect(ss.student.teacher.key).toBe(pr.key); expect(ctx.code).toBe('');
    const dev = { addr: 'https://x', key: pr.key, name: 'Брат' };
    const rec = studentOf(tSet, dev.addr, dev.name); addTask(rec, 'Играть C–G', {}, NOW); toggleOpen(rec, 'lesson', 'g6', true); toggleOpen(rec, 'tool', 'ear', true);
    await pushPack(tApp, dev, H, NOW);
    expect(ss.student.tasks).toHaveLength(1); expect(lessonOpen(ss, 'g6')).toBe(true); expect(ss.student.open).toEqual(['ear']);
    markDone(ss, ss.student.tasks[0].id, true, NOW);
    await pullReport(tApp, dev, H, NOW);
    expect(rec.tasks[0].done).toBe(true); expect(rec.reportAt).toBe(NOW);
    // второй учитель: сопряжение закрыто
    const x = await H('POST', 'https://x/melete/v1/pair', { json: { code: '123456', name: 'Чужой' } }).catch((e) => e);
    expect(x.status).toBe(403);
    // чужой ключ, оказавшийся среди пиров, отчёт не получает
    mem.peers.OTHER = { name: 'Кто-то' };
    const y = await H('POST', 'https://x/melete/v1/ts/report', { key: 'OTHER', json: {} }).catch((e) => e);
    expect(y.status).toBe(403);
    const z = await H('POST', 'https://x/melete/v1/ts/pack', { key: 'OTHER', json: { v: 1, tasks: [] } }).catch((e) => e);
    expect(z.status).toBe(403);
    expect(ss.student.tasks).toHaveLength(1); // пакет чужого не принят
  });
  it('ученик без режима — маршруты закрыты', async () => {
    const sApp = app({}); const mem = { peers: { K: { name: 'u' } } };
    const r = await handleRequest({ app: sApp, mem, ts: (p, j, peer) => tsHandle(sApp, p, j, peer, NOW) }, { method: 'POST', path: '/melete/v1/ts/report', query: {}, key: 'K', json: {} });
    expect(r.status).toBe(409);
    expect(studentOn({})).toBe(false);
  });
});

import { setLessons, lessonsCount, COURSE_LESSONS } from '../src/core/classroom.js';
import { PATHS } from '../src/modules/book/book/lessons.js';
describe('уроки курса для ученика', () => {
  it('ползунок «+/−» открывает уроки подряд; число совпадает с курсом', () => {
    expect(COURSE_LESSONS).toBe(PATHS.guitar.length);
    const rec = studentOf({}, 'a');
    expect(setLessons(rec, 3)).toBe(3); expect(rec.lessons).toEqual(['g1', 'g2', 'g3']);
    expect(setLessons(rec, 99)).toBe(COURSE_LESSONS); expect(setLessons(rec, -4)).toBe(0); expect(lessonsCount(rec)).toBe(0);
  });
});

describe('уроки: «Первые шаги» не запираются', () => {
  it('f-уроки открыты, g — по пакету', () => {
    const st = student(); bindTeacher(st, 'K', 'У', NOW);
    expect(lessonOpen(st, 'f5')).toBe(true); expect(lessonOpen(st, 'g1')).toBe(false);
  });
});
