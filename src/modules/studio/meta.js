// Лёгкое описание модуля «studio»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><circle cx="7" cy="9" r="4.6"/><circle cx="17" cy="9" r="4.6"/><circle cx="7" cy="9" r="1.2" style="fill:currentColor;stroke:none"/><circle cx="17" cy="9" r="1.2" style="fill:currentColor;stroke:none"/><path d="M3.6 15.5 7 13.6M20.4 15.5 17 13.6M4.5 19.5h15"/></svg>'; // катушки: студия звукозаписи

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
