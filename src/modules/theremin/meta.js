// Лёгкое описание модуля «theremin»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M7 21V11.5a1.5 1.5 0 0 1 3 0V9a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0v1.5a1.5 1.5 0 0 1 3 0V16a5 5 0 0 1-5 5z"/><path d="M3 7c1.5-2 3-2 4.5 0S10.5 9 12 7s3-2 4.5 0"/></svg>';

export default {
  id: 'theremin',
  order: 36,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#866B9D',
  sizes: ['full', 'half', 'quarter', 'strip'],
  immersive: true, // в отдельном окне — на весь экран, без шапки
  pure: true, // и полный экран: только поверхность, без кнопок (src/core/pure.js)
};
