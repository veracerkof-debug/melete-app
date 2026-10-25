// Лёгкое описание модуля «metro»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M8 21h8l-3-17h-2zM12 14l5-7"/></svg>';

export default {
  id: 'metro',
  order: 10,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#9C7242',
  sizes: ['full', 'half', 'quarter', 'strip'],
};
