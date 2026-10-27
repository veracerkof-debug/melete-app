// Главный экран: жесты — смахивание в четыре стороны, двойное касание, удержание (docs/gestures.md).
// Удержание на приложении или значке открывает его правку. Время удержания — как во всём Melete.
// Не спорят с системой: смахивание от края экрана — «Назад» Android, поэтому начатое у края не считается.
import { isNative } from './native.js';

const LONG_MS = 450; // = HOLD_MS в ui/hold.js (не импортируется: тянет словари ядра в лёгкую страницу)
const EDGE = 32;   // px от левого и правого края — «Назад» жестом и боковая панель мультиокна (Honor, MagicOS)
const TOP = 28;    // сверху — шторка уведомлений
const BOTTOM = 44; // снизу — полоса жеста «Домой» и недавних: смахивание отсюда не наше (касание и удержание — можно)
const SWIPE_PX = 48;
const DOUBLE_MS = 300;

export function attachGestures(el, { onGesture, isBlocked }) {
  let start = null;
  let longTimer = null;
  let lastTap = null;
  let halo = null;

  const target = (e) => e.target.closest('.l-app, .l-dock-btn, .clock-wrap, .l-date, .l-tr-row, .l-tr-live, .l-tr-week');

  const clearHalo = () => {
    if (!halo) return;
    const hEl = halo;
    hEl.classList.add('out');
    setTimeout(() => hEl.remove(), 300);
    halo = null;
  };

  el.addEventListener('pointerdown', (e) => {
    if (isBlocked() || e.button > 0) return;
    if (e.pointerType !== 'mouse' && (e.clientX < EDGE || e.clientX > innerWidth - EDGE)) return; // край — «Назад» системы
    const sys = e.pointerType !== 'mouse' && (e.clientY < TOP || e.clientY > innerHeight - BOTTOM);
    start = { x: e.clientX, y: e.clientY, t: performance.now(), el: target(e), moved: false, long: false, sys };
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

  el.addEventListener('pointermove', (e) => {
    if (!start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
      start.moved = true;
      clearTimeout(longTimer);
      clearHalo();
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

    // подавляем click после свайпа/долгого нажатия
    if (s.el && (s.long || s.moved)) {
      s.el.dataset.suppress = '1';
      setTimeout(() => delete s.el.dataset.suppress, 50);
    }
    if (s.long) return;

    if (s.moved && s.sys) return; // начато в зоне жестов системы — уступаем ей
    if (s.moved && dt < 800) {
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
  el.addEventListener('pointercancel', () => { clearTimeout(longTimer); clearHalo(); start = null; });
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
