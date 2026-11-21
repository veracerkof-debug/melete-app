// Отделы объединённых инструментов → id группы (слово автора 21.11.2026, docs/tool-merge.md). Старые раскладки окон и записи хранят id отдела
// («beat», «looper»…) — при чтении они превращаются в группу с выбранным отделом. Должно совпадать с `group` в meta модулей (tests/groups.test.js).
export const MERGE = { beat: 'ear', vocal: 'ear', looper: 'studio', book: 'theory', theremin: 'glider' };
export const GROUP_MEMBERS = { ear: ['ear', 'beat', 'vocal'], studio: ['studio', 'looper'], theory: ['theory', 'book'], glider: ['glider', 'theremin'] };
