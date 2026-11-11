// Лёгкое описание модуля «ear»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M7 9.5a5 5 0 0 1 10 0c0 3-2.5 3.6-3.4 5.6-.6 1.4-.7 3.9-3.1 3.9A2.6 2.6 0 0 1 8 16.6"/><path d="M10 9.6a2 2 0 0 1 4 0c0 1.1-1.2 1.4-1.5 2.4"/></svg>';

export default {
  id: 'ear',
  order: 60,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#34C759',
  // окна занятия — целиком, половина и четверть (в малом окне — только вопрос и ответы); DECISIONS 2026-10-31
  sizes: ['full', 'half', 'quarter'],
};
