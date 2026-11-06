// Лёгкое описание модуля «theremin»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

// рука и волна над ней — тот же знак, аккуратнее: ровные пальцы, большой палец, волна не задевает руку (06.11.2026)
export const ICON = '<svg viewBox="0 0 24 24"><path d="M8 20.5v-7.8a1.4 1.4 0 0 1 2.8 0V10a1.4 1.4 0 0 1 2.8 0v.9a1.4 1.4 0 0 1 2.8 0v1.3a1.4 1.4 0 0 1 2.8 0v3.8a4.5 4.5 0 0 1-4.5 4.5z"/><path d="M8 15.2l-1.7-1.6a1.4 1.4 0 0 0-2 2L8 19.6"/><path d="M4 5.6c1.33-1.6 2.67-1.6 4 0s2.67 1.6 4 0 2.67-1.6 4 0"/></svg>';

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
