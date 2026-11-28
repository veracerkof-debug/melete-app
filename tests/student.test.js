import { describe, it, expect } from 'vitest';
import { lockStudent, unlockStudent, setOpen, studentAllows, studentOn, genCode, codeValid, STUDENT_BASE } from '../src/core/student.js';
import { isOn } from '../src/core/settings.js';

describe('режим «Ученик»', () => {
  it('без режима доступно всё', () => {
    expect(studentAllows({}, 'studio')).toBe(true);
    expect(isOn({}, 'studio')).toBe(true);
  });
  it('код: 4–12 цифр; случайный код подходит', () => {
    expect(codeValid('123')).toBe(false);
    expect(codeValid('12ab')).toBe(false);
    expect(codeValid('1234')).toBe(true);
    expect(codeValid(genCode())).toBe(true);
  });
  it('блокировка: база видна, остальное закрыто, код хранится хэшем', () => {
    const st = {};
    expect(lockStudent(st, '12')).toBe(false);
    expect(lockStudent(st, '4821')).toBe(true);
    expect(studentOn(st)).toBe(true);
    expect(JSON.stringify({ ...st.student, salt: '', hash: '' })).not.toContain('4821'); // соль и хэш — случайные символы, код мог встретиться в них случайно
    STUDENT_BASE.forEach((id) => expect(isOn(st, id)).toBe(true));
    expect(isOn(st, 'studio')).toBe(false);
    expect(isOn(st, 'ear')).toBe(false);
  });
  it('повторно включить с другим кодом нельзя', () => {
    const st = {};
    lockStudent(st, '4821');
    expect(lockStudent(st, '9999')).toBe(false);
    expect(unlockStudent(st, '9999')).toBe(false);
    expect(unlockStudent(st, '4821')).toBe(true);
    expect(studentOn(st)).toBe(false);
  });
  it('неверный код не снимает блокировку', () => {
    const st = {};
    lockStudent(st, '4821');
    expect(unlockStudent(st, '0000')).toBe(false);
    expect(studentOn(st)).toBe(true);
  });
  it('учитель открывает и закрывает инструменты; чужое не открывается', () => {
    const st = {};
    lockStudent(st, '4821');
    expect(setOpen(st, 'ear', true)).toBe(true);
    expect(isOn(st, 'ear')).toBe(true);
    expect(setOpen(st, 'bible', true)).toBe(false);
    expect(setOpen(st, 'ear', false)).toBe(true);
    expect(isOn(st, 'ear')).toBe(false);
  });
});
