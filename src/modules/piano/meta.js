// Лёгкое описание модуля «piano»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M13 5v14M10.5 5v8M15.5 5v8"/></svg>';

export default {
  id: 'piano',
  order: 30,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#646493',
  multitouch: true, // играют несколькими пальцами — защита от снимка экрана тремя пальцами
  sizes: ['full', 'half', 'quarter', 'strip'],
  pure: true, // в отдельном окне — полный экран: только клавиатура
};
