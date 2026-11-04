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
  // командная строка — PowerShell: синяя консоль, PS C:\>, таблицы, Write-Progress, без рамок (pwsh.css)
  { id: 'cli', accent: '#F9F1A5', align: 'left', mono: true, text: true },
  // светло-серый корпус, оранжевые кнопки, часы ЖК-индикатором, чёрные ручки со стрелкой (Braun, приборные плитки)
  { id: 'inst', accent: '#F26A1B', align: 'left' },
  // светлые панели на чёрном: крупная цифра слева, график справа
  { id: 'panel', accent: '#C0602E', align: 'left', clock: 'onest', clockW: 500 },
  // чёрный и красный: кольцо с делениями, полосы из сегментов, линия по дням
  { id: 'tele', accent: '#E10600', align: 'left', clock: 'onest', clockW: 600 },
  // мятно-серый, толстые контуры, дата в рамке, приложения таблицей
  { id: 'cont', accent: '#2F7D5B', align: 'left', clock: 'mono', clockW: 300 },
  // бумага и пишущая машинка: неделя записями
  { id: 'diary', accent: '#C9826B', align: 'center' },
];
// стили, где крест рисуется точками (тёмные, «цифровые»)
export const DOTTED = ['cli', 'term', 'tele'];

export const styleOf = (id = prefs.style) => STYLES.find((s) => s.id === id) || STYLES[0];
export const styleId = () => styleOf().id;
// сторона: у стилей — своя, у «Классики» — из настроек
export const alignOf = () => styleOf().align || prefs.align;
