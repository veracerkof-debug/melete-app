import { describe, it, expect } from 'vitest';
import { begMin, pathOrder, nextLessonOf, BEG_DEFAULT, bookDone, makeBeg, begLeft, lessonInst, lessonSteps, lessonChords, lessonBpm, drillPair, chordSVG, lessonsSince, begUiOn } from '../src/core/beginner.js';

const PATHS = { first: ['f1', 'f2', 'f3'], guitar: ['g1', 'g2'] };
describe('главная новичка', () => {
  it('время занятия: допустимое или 20 по умолчанию', () => {
    expect(begMin({})).toBe(BEG_DEFAULT);
    expect(begMin({ begMin: 45 })).toBe(45);
    expect(begMin({ begMin: 7 })).toBe(BEG_DEFAULT);
  });
  it('порядок путей: гитаристу — ещё курс гитары', () => {
    expect(pathOrder({ instruments: ['piano'] })).toEqual(['first']);
    expect(pathOrder({ instruments: ['guitar'] })).toEqual(['first', 'guitar']);
  });
  it('следующий урок — первый непройденный; счёт внутри своего пути', () => {
    expect(nextLessonOf(PATHS, ['first', 'guitar'], { f1: 1 })).toEqual({ id: 'f2', path: 'first', n: 2, total: 3, done: 1 });
    expect(nextLessonOf(PATHS, ['first', 'guitar'], { f1: 1, f2: 1, f3: 1 })).toMatchObject({ id: 'g1', path: 'guitar', n: 1, total: 2 });
    expect(nextLessonOf(PATHS, ['first'], { f1: 1, f2: 1, f3: 1 })).toBe(null);
  });
});

describe('занятие новичка', () => {
  it('прогресс учебника читается из device.book.book.done', () => {
    expect(bookDone({ device: { book: { book: { done: { f1: 1 } } } } })).toEqual({ f1: 1 });
    expect(bookDone({ device: {} })).toEqual({});
  });
  it('план занятия: этап по наличию урока, остаток времени от плана', () => {
    expect(makeBeg(20, 'g7')).toMatchObject({ min: 20, lesson: 'g7', stage: 'lesson', step: 0 });
    expect(makeBeg(10).stage).toBe('play');
    expect(begLeft({ beg: { min: 10 } }, 100)).toBe(500);
    expect(begLeft({ beg: { min: 10 } }, 900)).toBe(0);
  });
  it('вид новичка: только уровень «Новичок» на телефоне, не «Только инструменты» и не «Минимал»', () => {
    const st = { profile: { level: 'beginner' } };
    expect(begUiOn(st)).toBe(true);
    expect(begUiOn(st, true)).toBe(false);
    expect(begUiOn({ ...st, toolsOnly: true })).toBe(false);
    expect(begUiOn({ ...st, uiStyle: 'mono' })).toBe(false);
    expect(begUiOn({ profile: { level: 'amateur' } })).toBe(false);
  });
  it('шаги урока — пункты списка по инструменту; без списка — одна строка', () => {
    const S = { 'lx.g5.g': '<ul><li>Один <b>два</b></li><li>Три</li></ul>', 'lx.f1.t': 'Только текст' };
    expect(lessonSteps(S, 'g5', 'g')).toEqual(['Один два', 'Три']);
    expect(lessonSteps(S, 'f1', 'p')).toEqual(['Только текст']);
    expect(lessonSteps(S, 'zz', 'p')).toEqual([]);
    expect(lessonInst('g7', { instruments: ['piano'] })).toBe('g');
    expect(lessonInst('f3', { instruments: ['piano'] })).toBe('p');
    expect(lessonInst('f3', { instruments: ['bass'] })).toBe('b');
  });
  it('аккорды и темп урока', () => {
    const def = { ex: [{ lab: 'xtool', cfg: { tool: 'metro', bpm: 60 } }, { lab: 'xchord', cfg: { ch: { g: 'Am Em', p: 'C' } }, only: 'g' }, { lab: 'xchord', cfg: { ch: { g: 'Am Dm' } } }] };
    expect(lessonChords(def, 'g')).toEqual(['Am', 'Em', 'Dm']);
    expect(lessonChords(def, 'p')).toEqual(['Am', 'Dm'].slice(0, 0));
    expect(lessonBpm(def)).toBe(60);
    expect(lessonBpm({ ex: [] })).toBe(0);
  });
  it('пара для смены идёт по кругу; меньше двух аккордов — нет пары', () => {
    expect(drillPair(['Em'])).toBe(null);
    expect(drillPair(['Em', 'Am', 'Dm'], 0)).toEqual(['Em', 'Am']);
    expect(drillPair(['Em', 'Am', 'Dm'], 1)).toEqual(['Am', 'Dm']);
    expect(drillPair(['Em', 'Am', 'Dm'], 2)).toEqual(['Em', 'Am']);
  });
  it('схема аккорда: SVG с точками и значками струн', () => {
    const s = chordSVG([null, 3, 2, 0, 1, 0]);
    expect(s.startsWith('<svg')).toBe(true);
    expect((s.match(/bgcd-d/g) || []).length).toBe(3);
    expect((s.match(/bgcd-o/g) || []).length).toBe(2);
    expect((s.match(/bgcd-m/g) || []).length).toBe(1);
  });
  it('уроки за неделю — по журналу «Получилось»', () => {
    expect(lessonsSince({ a: 100, b: 50, c: 200 }, 100).sort()).toEqual(['a', 'c']);
    expect(lessonsSince(null, 0)).toEqual([]);
  });
});
