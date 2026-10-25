// Лёгкое описание модуля «drone»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M3 12h3l2-5 3 10 3-8 2 5 2-2h3"/></svg>';

export default {
  id: 'drone',
  order: 40,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#548591',
  multitouch: true, // играют несколькими пальцами — защита от снимка экрана тремя пальцами
  sizes: ['full', 'half', 'quarter', 'strip'],
};
