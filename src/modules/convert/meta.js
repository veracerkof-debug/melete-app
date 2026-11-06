// Лёгкое описание модуля «convert» (конвертер): грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — при первом открытии. Движок — src/audio/convert/ (DECISIONS 2026-11-02).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>';

export default {
  id: 'convert',
  order: 98,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: en.name },
  i18n: { ru, uz, en },
  icon: ICON,
  color: '#6F7F8F',
  sizes: ['full', 'half', 'quarter', 'strip'],
  // с 06.11.2026 — часть медиатеки (слово автора): своей вкладки и карточки нет, открывается шторкой из медиатеки
  inner: true,
  partOf: 'audio',
  record: false, // звука у конвертера нет
  stats: false, // не практика
};
