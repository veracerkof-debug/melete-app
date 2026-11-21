// Скруглённые углы экрана (слово автора 21.11.2026: «у многих телефонов закруглённые углы; кнопка в углу выглядит плохо»).
// Радиус сообщает система (Android 12+, android/.../MainActivity.java: MeleteCorner.radius(), CSS-пиксели); без него — 0.
// Результат — переменные --cr (радиус) и --cp (отступ от краёв для того, что стоит в углу: r·(1−1/√2) ≈ 0,3·r), читает ui/screens.css.
export const cornerPad = (r) => Math.round(Math.max(0, Math.min(60, +r || 0)) * 0.3);

export function readCorner(win = typeof window !== 'undefined' ? window : null) {
  try { const r = win && win.MeleteCorner && typeof win.MeleteCorner.radius === 'function' ? +win.MeleteCorner.radius() : 0; return Number.isFinite(r) && r > 0 ? Math.min(r, 60) : 0; } catch { return 0; }
}

export function applyCorner(doc = document, win = window) {
  const r = readCorner(win);
  doc.documentElement.style.setProperty('--cr', r + 'px');
  doc.documentElement.style.setProperty('--cp', cornerPad(r) + 'px');
  return r;
}

// Радиус приходит после появления окна в фокусе — перечитываем при запуске, повороте и возвращении в приложение
export function watchCorner(doc = document, win = window) {
  applyCorner(doc, win);
  ['resize', 'orientationchange', 'focus'].forEach((ev) => win.addEventListener(ev, () => applyCorner(doc, win)));
  setTimeout(() => applyCorner(doc, win), 1500);
}
