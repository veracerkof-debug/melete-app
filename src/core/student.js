// Режим «Ученик» (слово автора 24.11.2026, docs/teacher-student.md): настоящая блокировка. Выйти из режима
// без кода учителя нельзя; видны только базовые инструменты и то, что учитель открыл. Без DOM, данные — settings.student.
import { sha256 } from './integrity.js';

// Базовый набор ученика: метроном, тюнер, пианино, ноты/табы/аккорды, диктофон, справочник новичка (учебник)
export const STUDENT_BASE = ['metro', 'tuner', 'piano', 'notes', 'voice', 'book'];
// Что учитель может открыть дополнительно (тренажёры, теория, вокал и т. д.); остальное закрыто всегда
export const STUDENT_OPENABLE = ['beat', 'ear', 'vocal', 'theory', 'drone', 'audio', 'timer', 'glider', 'theremin', 'looper', 'studio', 'spectrum', 'convert'];

const hashOf = (code, salt) => sha256('student|' + salt + '|' + String(code).trim());
const norm = (code) => String(code == null ? '' : code).trim();

export const studentOn = (settings) => !!(settings && settings.student && settings.student.on);

// Случайный код из n цифр (rnd — для тестов)
export function genCode(n = 6, rnd = Math.random) {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(rnd() * 10);
  return s;
}

// Код годится: 4–12 цифр
export const codeValid = (code) => /^\d{4,12}$/.test(norm(code));

// Включить режим с кодом учителя → true, если включён. Уже включённый режим повторно не включается (код не подменить)
export function lockStudent(settings, code, rnd = Math.random) {
  if (studentOn(settings) || !codeValid(code)) return false;
  const salt = genCode(12, rnd);
  settings.student = { on: true, salt, hash: hashOf(norm(code), salt), open: [] };
  return true;
}

// Снять блокировку по коду → true, если код верный (режим выключен, открытое забывается)
export function unlockStudent(settings, code) {
  const s = settings && settings.student;
  if (!s || !s.on) return false;
  if (hashOf(norm(code), s.salt) !== s.hash) return false;
  settings.student = null;
  return true;
}

// Учитель открывает/закрывает ученику инструмент (только из списка допустимых)
export function setOpen(settings, id, on) {
  const s = settings && settings.student;
  if (!s || !s.on || !STUDENT_OPENABLE.includes(id)) return false;
  const set = new Set(s.open || []);
  if (on) set.add(id); else set.delete(id);
  s.open = [...set];
  return true;
}

// Доступен ли модуль ученику: без режима — всё; в режиме — база и открытое учителем
export const studentAllows = (settings, id) => !studentOn(settings) || STUDENT_BASE.includes(id) || (settings.student.open || []).includes(id);
