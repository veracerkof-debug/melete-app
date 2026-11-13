// Лёгкое описание модуля «vocal» (Вокал: распевки, диапазон и тип голоса, импровизация над дроном — DECISIONS
// 2026-11-13 «Вокал»): грузится при запуске. Сам модуль (index.js) — по требованию (MODULE_SPEC.md).
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';

// Голова в профиль и звук изо рта
export const ICON = '<svg viewBox="0 0 24 24"><path d="M12.5 20.5v-3h1.8a1.5 1.5 0 0 0 1.5-1.5v-2.4l1.7-.7-1.7-3.5A6.2 6.2 0 1 0 5.6 13.6v6.9"/><path d="M19.2 8.6a3.6 3.6 0 0 1 0 4.4M21.4 6.6a6.7 6.7 0 0 1 0 8.4"/></svg>';

export default {
  id: 'vocal',
  order: 97,
  name: { ru: ru.name, uz: uz.name, en: en.name, el: el.name },
  i18n: { ru, uz, en, el },
  icon: ICON,
  color: '#C27A52',
  sizes: ['full', 'half', 'quarter', 'strip'],
};
