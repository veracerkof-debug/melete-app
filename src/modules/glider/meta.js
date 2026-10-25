// Лёгкое описание модуля «glider»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M3 17c3 0 4-10 9-10s6 6 9 6"/><circle cx="12" cy="7" r="1.6" fill="currentColor"/></svg>';

export default {
  id: 'glider',
  order: 35,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#866B9D',
  multitouch: true, // играют несколькими пальцами — защита от снимка экрана тремя пальцами
  sizes: ['full', 'half', 'quarter', 'strip'],
  immersive: true, // в отдельном окне — на весь экран, без шапки
  pure: true, // и полный экран: только поверхность, без кнопок (src/core/pure.js)
};
