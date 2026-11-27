// Лёгкое описание модуля «show» (пульт выступления): грузится при запуске. Сам модуль (index.js) — по требованию.
// Часть медиатеки (слово автора 15.11.2026): своей вкладки нет, открывается кнопкой из медиатеки (ctx.openTool('show')).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';

export const ICON = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>';

export default {
  id: 'show',
  order: 81,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: en.name },
  i18n: { ru, uz, en },
  icon: ICON,
  color: '#A95E72',
  sizes: ['full', 'half'],
  minSize: 'half',
  multitouch: true, // несколько падов сразу
  inner: true,
  record: false, // пульт только выдаёт звук: записи в нём нет (слово автора 27.11.2026); на сцене она остаётся
  immersive: true, // в отдельном окне — на весь экран, без шапки «Пульт»: «назад» — в верхней полосе (show.css)
  partOf: 'audio',
  stats: false, // выступление — не практика
};
