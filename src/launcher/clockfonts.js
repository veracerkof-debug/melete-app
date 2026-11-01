// Шрифт часов (решение автора 2026-11-01): несколько спокойных вариантов только для цифр часов; остальной экран — Onest.
// Файлы — в приложении (латинский набор, ~30–40 КБ каждый, SIL OFL), без сети. Толщина и разрядка подобраны под каждый.
export const CLOCK_FONTS = [
  { id: 'onest', family: 'var(--l-display)', weight: 250, track: '-0.035em' },     // как было: ровный гротеск
  { id: 'jost', family: "'Clock Jost'", weight: 200, track: '-0.02em' },           // геометрия, тонкий
  { id: 'cormorant', family: "'Clock Cormorant'", weight: 350, track: '-0.01em', num: 'lining-nums tabular-nums' }, // антиква: ровные цифры
  { id: 'mono', family: "'Clock Mono'", weight: 100, track: '-0.06em' },           // моноширинный, техничный
  { id: 'tall', family: "'Clock Tall'", weight: 250, track: '0em' },               // узкий и высокий
];
export const clockFont = (id) => CLOCK_FONTS.find((f) => f.id === id) || CLOCK_FONTS[0];
