// Лёгкое описание модуля «studio»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M4.3 15.8v-3.4a7.7 7.7 0 0 1 15.4 0v3.4"/><rect x="3.4" y="13.7" width="4.5" height="7.3" rx="2.2"/><rect x="16.1" y="13.7" width="4.5" height="7.3" rx="2.2"/></svg>'; // наушники — как вкладка студии

export default {
  id: 'studio',
  order: 47,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#3E8C8C',
  tab: true, // своя вкладка внизу, не инструмент: в «Инструментах», быстром доступе и окнах сессии её нет
  sizes: ['full'],
};
