// Лёгкое описание модуля «audio»: грузится при запуске — название, значок, цвет, размеры, переводы.
// Сам модуль (index.js) — по требованию, при первом открытии (src/modules/index.js, MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/></svg>';

export default {
  id: 'audio',
  order: 80,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#A95E72',
  sizes: ['full', 'half', 'quarter', 'strip'],
  pure: true, // полный экран: плеер и видео без шапки приложения (src/core/pure.js)
  // Перетаскивание файлов в окно (веб-версия на компьютере): какие файлы модуль берёт; что с ними делать — drop в index.js
  accepts: (f) => /^(audio|video)\//.test(f.type) || /\.(mp4|m4v|mov|webm|mkv|3gp|ogv)$/i.test(f.name) || /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)$/i.test(f.name),
};
