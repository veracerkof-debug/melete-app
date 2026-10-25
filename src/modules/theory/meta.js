// Лёгкое описание модуля «theory»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5v4.5"/></svg>';

export default {
  id: 'theory',
  order: 50,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#567198',
  sizes: ['full', 'half', 'quarter', 'strip'],
};
