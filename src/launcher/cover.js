// Переходы между экранами (DECISIONS 2026-10-28): вариант — prefs.motion (look.js → html[data-motion]);
// «накрытие» главного экрана панелью или шторкой — переменная --l-cover (0…1), в варианте «Глубина» главный уходит
// вглубь и темнеет, во время перетаскивания — ровно настолько, насколько вытянута панель.
const open = new Set();
const de = () => document.documentElement;
export const motion = () => de().dataset.motion || 'slide';

export function setCover(id, on) {
  if (on) open.add(id); else open.delete(id);
  de().style.setProperty('--l-cover', open.size ? '1' : '0');
}
// во время перетаскивания: доля 0…1, без переходов
export function dragCover(frac) {
  de().classList.add('l-dragging');
  de().style.setProperty('--l-cover', String(Math.max(0, Math.min(1, frac))));
}
export function endDragCover() {
  de().classList.remove('l-dragging');
  de().style.setProperty('--l-cover', open.size ? '1' : '0');
}
