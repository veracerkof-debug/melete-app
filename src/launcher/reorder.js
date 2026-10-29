// Удержать и перетащить — перестановка в списке (папки во «Всех приложениях», приложения в папке; DECISIONS 2026-10-29).
// Удержание (450 мс, как везде) поднимает элемент; повёл пальцем — он идёт за ним, отпустил — встаёт на новое место
// (onMove(from, to)); отпустил, не сдвинув, — onHold(el) (меню). Пока элемент поднят, список не прокручивается
// и другие жесты панели молчат (reordering()).
const HOLD_MS = 450, SLOP = 8;
let active = false;
export const reordering = () => active;

export function holdDrag(container, selector, { axis = 'y', onHold, onMove }) {
  let st = null;
  const items = () => [...container.querySelectorAll(selector)].filter((x) => !x.hidden);
  const pos = (e) => (axis === 'y' ? e.clientY : e.clientX);

  container.addEventListener('pointerdown', (e) => {
    const el = e.target.closest(selector);
    if (!el || !container.contains(el) || e.button > 0) return;
    st = { el, id: e.pointerId, x: e.clientX, y: e.clientY, p0: pos(e), held: false, moved: false };
    st.timer = setTimeout(() => {
      if (!st) return;
      st.held = true; active = true;
      el.classList.add('l-lifted');
      navigator.vibrate?.(12);
      try { container.setPointerCapture(st.id); } catch { /* */ }
    }, HOLD_MS);
  });
  container.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.held) {
      // повёл до удержания — это прокрутка или смахивание, не перестановка
      if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > SLOP) { clearTimeout(st.timer); st = null; }
      return;
    }
    const d = pos(e) - st.p0;
    if (!st.moved && Math.abs(d) < 6) return;
    st.moved = true;
    st.el.style.transform = axis === 'y' ? `translateY(${d}px)` : `translateX(${d}px)`;
  });
  const finish = (e, cancel) => {
    if (!st || (e && e.pointerId !== st.id)) return;
    const s = st; st = null;
    clearTimeout(s.timer);
    if (!s.held) return;
    setTimeout(() => { active = false; }, 0);
    s.el.classList.remove('l-lifted');
    // клик после удержания не открывает приложение
    s.el.dataset.held = '1'; setTimeout(() => delete s.el.dataset.held, 80);
    if (cancel) { s.el.style.transform = ''; return; }
    if (!s.moved) { s.el.style.transform = ''; onHold?.(s.el); return; }
    const all = items();
    const from = all.indexOf(s.el);
    const r = s.el.getBoundingClientRect();
    const mid = axis === 'y' ? r.top + r.height / 2 : r.left + r.width / 2;
    const others = all.filter((x) => x !== s.el);
    let to = others.findIndex((x) => { const q = x.getBoundingClientRect(); return mid < (axis === 'y' ? q.top + q.height / 2 : q.left + q.width / 2); });
    if (to < 0) to = others.length;
    s.el.style.transform = '';
    if (to !== from) onMove(from, to);
  };
  container.addEventListener('pointerup', (e) => finish(e, false));
  container.addEventListener('pointercancel', (e) => finish(e, true));
  // поднятый элемент: палец двигает его, а не прокручивает список
  container.addEventListener('touchmove', (e) => { if (st?.held) e.preventDefault(); }, { passive: false });
  container.addEventListener('contextmenu', (e) => { if (e.target.closest(selector)) e.preventDefault(); });
}
