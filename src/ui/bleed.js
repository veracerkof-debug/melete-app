// «До краёв окна» (слово автора 18.11.2026, CLAUDE.md «Основной принцип»): рамка окна сессии оставляет вокруг
// инструмента поля (10 px, в четверти 6, на компьютере 14). Рабочая поверхность возвращает их отрицательным
// отступом по бокам и снизу; сверху остаются ручка окна и кнопка «во весь экран». Поле не трогает касания
// за пределами поверхности: оно и так принадлежит окну. В отдельном окне (.tview) и во весь экран полей нет — функция
// ничего не делает. Вызывать после отрисовки и при изменении размера (ResizeObserver модуля).
export function bleed(el, { top = false } = {}) {
  if (!el) return;
  const pane = el.closest('.pane');
  if (!pane) { el.style.margin = ''; el.classList.remove('bleed'); return; }
  const cs = getComputedStyle(pane), px = (v) => Math.max(0, Math.round(parseFloat(v) || 0));
  const t = top ? px(cs.paddingTop) : 0;
  el.style.margin = '-' + t + 'px -' + px(cs.paddingRight) + 'px -' + px(cs.paddingBottom) + 'px -' + px(cs.paddingLeft) + 'px';
  el.classList.add('bleed');
}
