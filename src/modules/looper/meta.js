// Лёгкое описание модуля «looper»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 1 2.6 5.9"/><path d="M4 18.5V14h4.5"/><circle cx="12" cy="12" r="2" style="fill:currentColor"/></svg>';

export default {
  id: 'looper',
  order: 46,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#B5533C',
  sizes: ['full', 'half', 'quarter', 'strip'],
  record: false, // лупер сам пишет микрофон; сведение — кнопкой «В медиатеку»
};
