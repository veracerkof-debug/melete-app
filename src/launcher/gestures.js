// Главный экран: жесты — смахивание в четыре стороны, двойное касание, удержание (docs/gestures.md).
// Удержание на приложении или значке открывает его правку. Время удержания — как во всём Melete.
// Не спорят с системой: смахивание от края экрана — «Назад» Android, поэтому начатое у края не считается.
import { isNative } from './native.js';

const LONG_MS = 450; // = HOLD_MS в ui/hold.js (не импортируется: тянет словари ядра в лёгкую страницу)
// Зон «для системы» нет: жесты «Назад», «Домой», шторку система забирает сама и до страницы они не доходят;
// то, что дошло, — наше (раньше касания у краёв и у низа экрана отбрасывались, и смахивание от значков внизу терялось)
const SWIPE_PX = 32;
const DOUBLE_MS = 300;

// onDragStart(dir) → true, если панель в эту сторону пойдёт за пальцем; onDrag(dir, px), onDragEnd(dir, px, v) → true, если
// жест исчерпан перетаскиванием (обычное смахивание тогда не срабатывает)
export function attachGestures(el, { onGesture, isBlocked, onDragStart, onDrag, onDragEnd }) {
  let start = null;
  let longTimer = null;
  let lastTap = null;
  let halo = null;

  const target = (e) => e.target.closest('.l-app, .l-dock-btn, .clock-wrap, .l-date, .l-tr-row, .l-tr-live, .l-tr-week, .l-trl-main, .l-trl-side');

  const clearHalo = () => {
    if (!halo) return;
    const hEl = halo;
    hEl.classList.add('out');
    setTimeout(() => hEl.remove(), 300);
    halo = null;
  };

  el.addEventListener('pointerdown', (e) => {
    if (isBlocked() || e.button > 0) return;
    start = { x: e.clientX, y: e.clientY, t: performance.now(), el: target(e), moved: false, long: false };
    halo = document.createElement('div');
    halo.className = 'l-halo';
    halo.style.left = e.clientX + 'px';
    halo.style.top = e.clientY + 'px';
    document.body.append(halo);
    requestAnimationFrame(() => halo?.classList.add('grow'));
    longTimer = setTimeout(() => {
      if (!start || start.moved) return;
      start.long = true;
      navigator.vibrate?.(12);
      clearHalo();
      if (start.el?.longPress) start.el.longPress();
      else onGesture('longPress');
    }, LONG_MS);
  });

  const DIR = (dx, dy) => (Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? 'swipeUp' : 'swipeDown') : (dx < 0 ? 'swipeLeft' : 'swipeRight'));
  const along = (dir, dx, dy) => (dir === 'swipeUp' ? -dy : dir === 'swipeDown' ? dy : dir === 'swipeLeft' ? -dx : dx);

  el.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) > 6) {
      start.moved = true;
      clearTimeout(longTimer);
      clearHalo();
      // панель идёт за пальцем — направление запоминается по первому движению
      if (!start.long && onDragStart) {
        start.dir = DIR(dx, dy);
        if (onDragStart(start.dir)) { start.drag = true; start.vel = []; try { el.setPointerCapture(e.pointerId); } catch { /* */ } }
      }
    }
    if (start.drag) {
      const px = Math.max(0, along(start.dir, dx, dy));
      start.vel.push({ px, t: performance.now() }); if (start.vel.length > 6) start.vel.shift();
      onDrag(start.dir, px);
    }
  });

  const end = (e) => {
    clearTimeout(longTimer);
    clearHalo();
    if (!start) return;
    const s = start;
    start = null;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    const dt = performance.now() - s.t;

    if (s.drag) {
      const px = Math.max(0, along(s.dir, dx, dy));
      const a = s.vel[0], b = s.vel[s.vel.length - 1];
      const v = a && b && b.t > a.t ? (b.px - a.px) / (b.t - a.t) : 0;
      if (s.el) { s.el.dataset.suppress = '1'; setTimeout(() => delete s.el.dataset.suppress, 50); }
      if (onDragEnd(s.dir, px, v)) return;
      // панель вернулась — считаем как обычное смахивание, если жест был взмахом
    }

    // подавляем click после свайпа/долгого нажатия
    if (s.el && (s.long || s.moved)) {
      s.el.dataset.suppress = '1';
      setTimeout(() => delete s.el.dataset.suppress, 50);
    }
    if (s.long) return;

    if (s.moved && dt < 1000) {
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < SWIPE_PX) return;
      if (ay > ax) onGesture(dy < 0 ? 'swipeUp' : 'swipeDown');
      else onGesture(dx < 0 ? 'swipeLeft' : 'swipeRight');
      return;
    }
    if (s.moved || s.el || e.target.closest('button')) { lastTap = null; return; }

    // двойной тап — только по пустому месту
    const now = performance.now();
    if (lastTap && now - lastTap.t < DOUBLE_MS && Math.hypot(s.x - lastTap.x, s.y - lastTap.y) < 40) {
      lastTap = null;
      onGesture('doubleTap');
    } else {
      lastTap = { t: now, x: s.x, y: s.y };
    }
  };

  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => { clearTimeout(longTimer); clearHalo(); if (start?.drag) onDragEnd(start.dir, 0, 0); start = null; });
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  // колесо мыши / тачпад: прокрутка вниз = свайп вверх (открыть все приложения)
  let wheelLock = 0;
  el.addEventListener('wheel', (e) => {
    if (isBlocked() || Date.now() < wheelLock || Math.abs(e.deltaY) < 30) return;
    wheelLock = Date.now() + 700;
    onGesture(e.deltaY > 0 ? 'swipeUp' : 'swipeDown');
  }, { passive: true });
}

// Жесты главного экрана: строка gest.<id>
export const GESTURES = ['swipeUp', 'swipeDown', 'swipeLeft', 'swipeRight', 'doubleTap', 'longPress', 'clockTap', 'dateTap'];
export const GLYPHS = { swipeUp: '↑', swipeDown: '↓', swipeLeft: '←', swipeRight: '→', doubleTap: '··', longPress: '◯', clockTap: '◷', dateTap: '▦' };

// Что делает жест, если человек его не менял
export function defaultGesture(id, { church, roles = {} }) {
  const cmd = (x) => ({ t: 'cmd', id: x });
  switch (id) {
    case 'swipeUp': return cmd('drawer');
    case 'swipeDown': return cmd('search');
    case 'swipeLeft': return cmd('money');
    case 'swipeRight': return cmd('notes');
    case 'doubleTap': return cmd('rest');
    case 'longPress': return cmd('settings');
    case 'clockTap': return isNative() ? cmd('alarms') : cmd('none');
    case 'dateTap': return roles.calendar ? { t: 'app', key: roles.calendar } : cmd('none');
    default: return cmd('none');
  }
}
