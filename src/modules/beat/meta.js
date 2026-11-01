// Лёгкое описание модуля «beat»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M6 17V6M12 17V6M18 17V9M6 6h6"/><ellipse cx="4.6" cy="17.4" rx="1.9" ry="1.4"/><ellipse cx="10.6" cy="17.4" rx="1.9" ry="1.4"/><ellipse cx="16.6" cy="17.4" rx="1.9" ry="1.4"/></svg>';

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
