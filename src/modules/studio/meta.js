// Лёгкое описание модуля «studio»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M5 14v-2a7 7 0 0 1 14 0v2"/><rect x="3" y="14" width="4" height="7" rx="2"/><rect x="17" y="14" width="4" height="7" rx="2"/></svg>'; // наушники — как вкладка студии; дуга садится ровно на середину чашек (11.11.2026: без «усиков»)

export default {
  id: 'studio',
  order: 47,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#3E8C8C',
  // с 06.11.2026 — снова отдельный инструмент (слово автора: «новая студия, лупер остаётся»): стол дорожек, монтаж,
  // партии; редакторы партий по-прежнему открываются и в шторке лупера (embedPart)
  sizes: ['full'],
};
