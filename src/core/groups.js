// Объединённые инструменты (слово автора 21.11.2026, docs/tool-merge.md, путь «А»): модули остаются отдельными (свои данные, ключи, тесты),
// а для человека — один инструмент: одна плитка в «Инструментах» и «Быстром доступе», один значок в занятии, внутри окна — переключатель отделов.
// Группа задаётся полем `group` в meta модуля (id группы = id главного модуля: ear, studio, theory, glider).
import { t } from '../i18n/index.js';
import { modules, moduleById } from '../modules/index.js';
import { isOn } from './settings.js';
import { moduleName } from './modules.js';

export const groupIdOf = (m) => (m && (m.group || m.id)) || null;
// Включённые члены группы, главный — первым (остальные — в порядке модулей)
export function groupMembers(st, id) {
  const g = groupIdOf(typeof id === 'string' ? moduleById(id) : id);
  if (!g) return [];
  const list = modules.filter((m) => groupIdOf(m) === g && !m.tab && !m.inner && isOn(st, m.id));
  return list.sort((a, b) => (b.id === g) - (a.id === g));
}
// Представитель группы — тот, чья плитка показывается; остальные «растворены» в нём (если он выключен — первый из включённых)
export const repOf = (st, m) => groupMembers(st, m)[0] || m;
export const isAbsorbed = (st, m) => !!(m && m.group && m.group !== m.id) && groupMembers(st, m).length > 0 && repOf(st, m).id !== m.id;
// Название плитки: у группы из нескольких — общее («Тренажёр»), иначе имя модуля
export function toolLabel(st, m) {
  if (!m) return '';
  const g = groupIdOf(m);
  if (g && groupMembers(st, m).length > 1) { const k = 'group.' + g, v = t(k); if (v !== k) return v; }
  return moduleName(m);
}
