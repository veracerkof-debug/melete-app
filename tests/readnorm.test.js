import { describe, it, expect } from 'vitest';
import { normOf, normOn, setNorm, normStatus, suggest, normReading, saveNote, removeNote, notesOf, planNotes, NOTES_MAX, N_RANGE } from '../src/core/readnorm.js';
import { dayKeyOf } from '../src/core/reading.js';

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const NOW = at(2026, 11, 25); // среда
const key = (ts) => dayKeyOf(ts);

describe('норма чтения: состояние', () => {
  it('по умолчанию выключена; включение начинает счёт с сегодня; пределы', () => {
    const b = {};
    expect(normOn(b)).toBe(false);
    setNorm(b, { on: true, kind: 'ch', n: 2 }, key(NOW));
    expect(normOf(b)).toMatchObject({ on: true, n: 2, since: '2026-11-25', order: 'seq' });
    setNorm(b, { n: 999 }, key(NOW)); expect(normOf(b).n).toBe(N_RANGE.ch[1]);
    setNorm(b, { kind: 'min', n: 1 }, key(NOW)); expect(normOf(b).n).toBe(N_RANGE.min[0]);
    setNorm(b, { on: false }, key(NOW)); expect(normOn(b)).toBe(false); expect(b.norm.since).toBe('2026-11-25'); // ничего не стёрто
  });
  it('главы: сегодня, догоняем, долг не обнуляется молча', () => {
    const b = { read: {} }; setNorm(b, { on: true, kind: 'ch', n: 1, strict: true }, '2026-11-22'); // с воскресенья
    // 22, 23, 24 — ничего; сегодня 25 — день начат, но не прочитан
    let s = normStatus(b, [], NOW);
    expect(s).toMatchObject({ elapsed: 4, covered: 0, debt: 3, todayDone: false, streak: null }); // 3 пропущенных дня — «догнать», не обнуление
    // сегодня прочитано 4 главы: закрыто 4 дня подряд — догнали
    ['GEN.1', 'GEN.2', 'GEN.3', 'GEN.4'].forEach((k) => { b.read[k] = NOW; });
    s = normStatus(b, [], NOW);
    expect(s).toMatchObject({ covered: 4, debt: 0, todayDone: true, streak: 4 });
  });
  it('мягкий режим: серия не показывается', () => {
    const b = { read: { 'GEN.1': NOW } }; setNorm(b, { on: true, n: 1, strict: false }, key(NOW));
    expect(normStatus(b, [], NOW).streak).toBeNull(); expect(normStatus(b, [], NOW).todayDone).toBe(true);
  });
  it('минуты: считаются по занятиям в Библии', () => {
    const b = {}; setNorm(b, { on: true, kind: 'min', n: 10 }, key(NOW));
    const ses = [{ type: 'tool', tool: 'bible', start: NOW - 3600e3, dur: 7 * 60 }, { type: 'tool', tool: 'tuner', start: NOW - 3600e3, dur: 99 * 60 }];
    expect(normStatus(b, ses, NOW)).toMatchObject({ today: 7, todayDone: false });
    ses.push({ type: 'tool', tool: 'bible', start: NOW - 1800e3, dur: 4 * 60 });
    expect(normStatus(b, ses, NOW)).toMatchObject({ today: 11, todayDone: true, covered: 1, debt: 0 });
  });
  it('по порядку с выбранной главы; прочитанное пропускается; по кругу; «свободно» — без подсказки', () => {
    const b = { read: { 'EXO.1': 1 } }; setNorm(b, { on: true, n: 3, from: 'GEN.50' }, key(NOW));
    expect(suggest(b, 3)).toEqual(['GEN.50', 'EXO.2', 'EXO.3']);
    const r = normReading(b, [], NOW); expect(r.keys).toEqual(['GEN.50', 'EXO.2', 'EXO.3']); expect(r.done).toBe(0);
    b.read['GEN.50'] = NOW; expect(normReading(b, [], NOW).keys).toEqual(['GEN.50', 'EXO.2', 'EXO.3']); // прочитанное сегодня остаётся в чтении дня
    expect(normReading(b, [], NOW).done).toBe(1);
    setNorm(b, { order: 'free' }, key(NOW)); expect(normReading(b, [], NOW).keys).toEqual(['GEN.50']);
    expect(normReading({}, [], NOW)).toBeNull();
  });
});

describe('свои напоминания', () => {
  it('до 10, время и дни проверяются, удаление', () => {
    const b = {};
    expect(saveNote(b, { text: 'Утром', at: '25:00' })).toBeNull();
    for (let i = 0; i < 12; i++) saveNote(b, { id: 'n' + i, text: 'x' + i, at: '07:30' }, i);
    expect(notesOf(b)).toHaveLength(NOTES_MAX);
    removeNote(b, 'n3'); expect(notesOf(b)).toHaveLength(9);
    expect(saveNote({}, { text: 'a', at: '07:30', days: [9] }).days).toHaveLength(7); // чужие дни отброшены → каждый день
  });
  it('план: дни недели; настойчивое повторяется, пока норма не выполнена; сегодня после выполнения — нет', () => {
    const b = {}; saveNote(b, { id: 'a', text: 'Читать', at: '18:00', days: [2] }, 1); // среда
    saveNote(b, { id: 'p', text: 'Ещё', at: '19:00', days: [2, 3], persist: true }, 2);
    const before = at(2026, 11, 25, 10);
    let p = planNotes(b, { on: true, todayDone: false }, before);
    const today = p.filter((x) => new Date(x.ts).getDate() === 25), thu = p.filter((x) => new Date(x.ts).getDate() === 26);
    expect(today.map((x) => x.text)).toEqual(['Читать', 'Ещё', 'Ещё', 'Ещё', 'Ещё', 'Ещё']); // 18:00, 19:00 и четыре повтора
    expect(thu).toHaveLength(5); // четверг: только «Ещё» с повторами
    p = planNotes(b, { on: true, todayDone: true }, before);
    expect(p.filter((x) => new Date(x.ts).getDate() === 25).map((x) => x.text)).toEqual(['Читать', 'Ещё']); // норма выполнена — повторов нет
    p = planNotes(b, { on: true, todayDone: false }, at(2026, 11, 25, 19, 30)); // уже вечер: прошедшее не планируется
    expect(p.filter((x) => new Date(x.ts).getDate() === 25).every((x) => x.ts > at(2026, 11, 25, 19, 31))).toBe(true);
  });
  it('не больше 10 в день', () => {
    const b = {}; for (let i = 0; i < 10; i++) saveNote(b, { id: 'q' + i, text: 't', at: '0' + (i % 9 + 1) + ':00', persist: true }, i);
    const day = planNotes(b, { on: true, todayDone: false }, at(2026, 11, 20, 0)).filter((x) => new Date(x.ts).getDate() === 21);
    expect(day.length).toBeLessThanOrEqual(NOTES_MAX);
  });
});
