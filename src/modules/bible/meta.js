// Лёгкое описание модуля «bible»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19M12 6.5v6M9.5 8.8h5"/></svg>';

export default {
  id: 'bible',
  order: 5,
  church: true, // только в церковном режиме
  tab: true, // своя вкладка внизу, а не инструмент: в «Инструментах», быстром доступе и окнах сессии её нет
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#A2845E',
  sizes: ['full', 'half', 'quarter', 'strip'],
};
