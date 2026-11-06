// Лёгкое описание модуля «train» — «Слух и ритм» (слово автора 06.11.2026, пункт 11): тренажёры слуха (ear) и ритма
// (beat) — один инструмент с двумя главами; главу можно выключить. В занятии — группа окон с переключателем глав.
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

export const ICON = '<svg viewBox="0 0 24 24"><path d="M5 10a4.5 4.5 0 0 1 9 0c0 2.6-2.2 3.2-3 4.9-.5 1.3-.6 3.6-2.8 3.6"/><path d="M15.5 18V8.5l5-1V16"/><circle cx="14" cy="18" r="1.6"/><circle cx="19" cy="16.3" r="1.6"/></svg>';
export const CHAPTERS = ['ear', 'beat'];

export default {
  id: 'train',
  order: 59,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#34C759',
  sizes: ['full', 'half', 'quarter'],
  session: false, // в занятии — главы сами (ear, beat с group: 'train') и переключатель окна
  record: false,
};
