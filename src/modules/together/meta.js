// Лёгкое описание модуля «together» (совместное чтение): грузится при запуске; сам модуль (index.js) — по требованию.
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';

export const ICON = '<svg viewBox="0 0 24 24"><circle cx="8.5" cy="8" r="3"/><circle cx="16.5" cy="8" r="3"/><path d="M3 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5M13 14.2c.9-.4 1.6-.5 2.5-.5 3 0 5.5 2 5.5 5.3"/></svg>';

export default {
  id: 'together',
  order: 6,
  church: true, // только в церковном режиме
  inner: true, // не отдельный инструмент: часть Библии, кнопка «Читать вместе» в её полосе (слово автора 22.11.2026)
  name: { ru: ru.name, uz: uz.name, en: en.name },
  i18n: { ru, uz, en },
  icon: ICON,
  color: '#A2845E',
  sizes: ['full', 'half'],
  minSize: 'half',
  session: false, // не инструмент занятия: общение с партнёром, время в практику не идёт
};
