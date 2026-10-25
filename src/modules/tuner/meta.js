// Лёгкое описание модуля «tuner»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M9 3v8a3 3 0 0 0 6 0V3M12 14v7"/></svg>';

export default {
  id: 'tuner',
  order: 20,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#866B9D',
  sizes: ['full', 'half', 'quarter', 'strip'],
};
