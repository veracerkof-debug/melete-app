// Лёгкое описание модуля «notes»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/></svg>';

export default {
  id: 'notes',
  order: 90,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#A2845E',
  sizes: ['full', 'half', 'quarter', 'strip'],
  pure: true, // полный экран: только табы, ноты или текст (src/core/pure.js)
  // Перетаскивание файлов в окно (веб-версия на компьютере): какие файлы модуль берёт; что с ними делать — drop в index.js
  accepts: (f) => f.type === 'application/pdf' || /\.(gp[3-8x]?|xml|musicxml|mxl|capx?|txt|tab|pdf|midi?|als|rpp|flp)$/i.test(f.name),
};
