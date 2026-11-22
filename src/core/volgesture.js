// Общая громкость двумя пальцами (слово автора 22.11.2026): два пальца вверх по экрану — громче, вниз — тише, ровно настолько,
// насколько пальцы прошли (не «от ста до нуля сразу»): весь ход громкости — две трети высоты экрана. Запоминается.
// Не мешает щипку: срабатывает, только когда пальцы идут вместе (расстояние между ними почти не меняется) и больше вверх-вниз.
import { t } from '../i18n/index.js';

const SKIP = '[data-group="piano"], [data-group="glider"], input, textarea, select, [contenteditable], [data-nospread], .sheet, .scrim, .hmenu, .ask';

export function initVolumeGesture(app, root = document) {
  const mixer = app.audio && app.audio.mixer;
  if (!mixer || !mixer.setMaster) return () => {};
  let g = null, hud = null, hideT = 0;
  const dist = (t2) => Math.hypot(t2[0].clientX - t2[1].clientX, t2[0].clientY - t2[1].clientY);
  const midY = (t2) => (t2[0].clientY + t2[1].clientY) / 2;
  const midX = (t2) => (t2[0].clientX + t2[1].clientX) / 2;
  const show = (v) => {
    if (!hud) { hud = document.createElement('div'); hud.className = 'volhud'; hud.setAttribute('role', 'status'); hud.setAttribute('aria-live', 'polite'); document.body.appendChild(hud); }
    hud.textContent = t('vol.hud', { n: Math.round(v * 100) });
    hud.classList.add('on');
    clearTimeout(hideT); hideT = setTimeout(() => hud && hud.classList.remove('on'), 900);
  };
  const start = (e) => {
    g = null;
    if (e.touches.length !== 2 || e.target.closest(SKIP)) return;
    const a = e.touches;
    g = { y0: midY(a), x0: midX(a), d0: Math.max(1, dist(a)), v0: mixer.master(), mode: '' };
  };
  const move = (e) => {
    if (!g || e.touches.length !== 2) return;
    const a = e.touches, dy = midY(a) - g.y0, dx = midX(a) - g.x0, r = dist(a) / g.d0;
    if (!g.mode) {
      if (Math.hypot(dx, dy) < 14) return;
      // вместе и вверх-вниз → громкость; иначе (расходятся / сходятся / вбок) — жест не наш
      g.mode = Math.abs(dy) > Math.abs(dx) * 1.6 && r > 0.85 && r < 1.18 ? 'vol' : 'no';
    }
    if (g.mode !== 'vol') return;
    if (e.cancelable) e.preventDefault(); // прокрутка и «спред» молчат
    const v = Math.max(0, Math.min(1, g.v0 - dy / (innerHeight * 0.66)));
    mixer.setMaster(v);
    show(v);
  };
  const end = (e) => { if (e.touches.length < 2) g = null; };
  root.addEventListener('touchstart', start, { passive: true });
  root.addEventListener('touchmove', move, { passive: false });
  root.addEventListener('touchend', end);
  root.addEventListener('touchcancel', end);
  return () => { root.removeEventListener('touchstart', start); root.removeEventListener('touchmove', move); root.removeEventListener('touchend', end); root.removeEventListener('touchcancel', end); if (hud) hud.remove(); };
}
