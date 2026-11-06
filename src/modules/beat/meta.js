// Лёгкое описание модуля «beat»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

// три восьмые под одним ребром — тот же знак, ровнее (слово автора 06.11.2026)
export const ICON = '<svg viewBox="0 0 24 24"><path d="M7.4 17V6.2l12-1.6V15.6M13.4 16.3V5.4"/><ellipse cx="5.4" cy="17.3" rx="2.1" ry="1.6" transform="rotate(-20 5.4 17.3)"/><ellipse cx="11.4" cy="16.6" rx="2.1" ry="1.6" transform="rotate(-20 11.4 16.6)"/><ellipse cx="17.4" cy="15.9" rx="2.1" ry="1.6" transform="rotate(-20 17.4 15.9)"/></svg>';

export default {
  id: 'beat',
  order: 61,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#D2693C',
  sizes: ['full', 'half', 'quarter'],
  multitouch: true, // удары двумя пальцами по площадке
  record: false,
};
