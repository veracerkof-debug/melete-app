// Лёгкое описание модуля «spectrum»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M4 20v-4M8 20V9M12 20v-7M16 20V5M20 20v-9"/></svg>';

export default {
  id: 'spectrum',
  order: 100,
  inner: true, // не отдельный инструмент: открывается нажатием на окно уровня в диктофоне
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#5988A7',
  sizes: ['full', 'half', 'quarter', 'strip'],
  stats: false, // рабочий инструмент: время в нём не идёт в статистику
};
