// Стили главного экрана (решение автора 2026-11-01): «Классика» — по умолчанию, остальные — вариант на выбор.
// Стиль — палитра и форма (launcher.css: html[data-style=…]), один акцент (в «Чёрно-белом» — цветом текста),
// свой шрифт часов, если человек не выбрал другой, сторона, и где нужно — свой вид блоков (styled.js).
import { prefs } from './data.js';

export const STYLES = [
  { id: 'classic' },
  // тёмный экран, справа цветная полоса со значками; блоки с тонкой меткой акцента
  { id: 'strip', accent: '#B5474F', align: 'left', clock: 'onest', clockW: 500 },
  // мягкие выпуклые формы и тени, крупные тонкие цифры
  { id: 'soft', accent: '#7476E8', align: 'center', clock: 'jost' },
  // тёмные карточки, моноширинный шрифт, цифры и клетки
  { id: 'term', accent: '#3DDC84', align: 'left', clock: 'mono', mono: true },
  // светлые панели, узкая полоса значков слева, папки раскрываются деревом
  { id: 'menu', accent: '#C94F92', align: 'left', clock: 'onest', clockW: 300 },
  // командная строка: только текст и символы, курсор мигает, часы и графика — знаками
  { id: 'cli', accent: '#3CF27A', align: 'left', mono: true, text: true },
];

export const styleOf = (id = prefs.style) => STYLES.find((s) => s.id === id) || STYLES[0];
export const styleId = () => styleOf().id;
// сторона: у стилей — своя, у «Классики» — из настроек
export const alignOf = () => styleOf().align || prefs.align;
