// Колесо приложений на главном (решение автора 2026-11-01, по образу WOVE): приложения и папки стоят на дуге,
// текущее — дальше всех от края, крупно и с номером; остальные мельче и бледнее. Повёл пальцем вверх-вниз —
// колесо крутится за ним и докатывается до ближайшего; касание текущего — открыть, другого — подкатить к нему.
// Удержание — правка главного (там обычный список). Любой стиль; сторона — как у главного.
import { appOf } from './apps.js';
import { openApp } from './actions.js';
import { folderOfKey, folderName } from './folders.js';
import { alignOf } from './styles.js';
import { t } from './i18n.js';
import { h } from './ui.js';

const STEP = (13 * Math.PI) / 180; // угол между соседями
const SPAN = 3.4;                  // видно по стольку с каждой стороны
let lastPos = 0;                   // колесо помнит, где стояло

export function renderWheel(items, { onFolder, hold }) {
  const right = alignOf() !== 'left';
  const wrap = h('nav', { class: 'l-wheel' + (right ? ' r' : ' l'), 'aria-label': t('home.apps') });
  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  arc.setAttribute('class', 'l-wh-arc');
  arc.setAttribute('aria-hidden', 'true');
  wrap.append(arc);
  const n = items.length;
  let pos = Math.max(0, Math.min(n - 1, lastPos));
  let geo = null;

  const rows = items.map((item, i) => {
    const app = appOf(item.key), fold = folderOfKey(item.key);
    const label = item.label || (fold ? folderName(fold) : app?.label) || t('act.gone');
    const b = h('button', { class: 'l-app l-wh-i' + (fold ? ' folder' : ''), 'data-i': i, 'aria-label': label },
      h('span', { class: 'l-wh-n', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
      h('span', { class: 'label' }, label));
    b.activate = () => (fold ? onFolder(fold.id) : app && openApp(app));
    wrap.append(b);
    return b;
  });
  if (!n) { wrap.append(h('p', { class: 'l-empty' }, t('home.empty'))); return wrap; }

  function measure() {
    const H = wrap.clientHeight || 340, W = wrap.clientWidth || 300;
    const R = (H / 2 - 30) / Math.sin(3 * STEP);
    const far = R * Math.cos(SPAN * STEP);
    geo = { H, W, R, far, inset: (a) => 22 + R * Math.cos(a) - far };
    // дуга: точки на расстоянии inset от края
    const pts = [];
    for (let a = -SPAN * STEP; a <= SPAN * STEP + 1e-6; a += STEP / 6) {
      const x = right ? W - geo.inset(a) + 14 : geo.inset(a) - 14, y = H / 2 + R * Math.sin(a);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    arc.setAttribute('viewBox', `0 0 ${W} ${H}`);
    arc.innerHTML = `<polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="1"/>`;
  }

  function layout() {
    if (!geo) measure();
    rows.forEach((b, i) => {
      const d = i - pos, a = d * STEP, ad = Math.abs(d);
      if (ad > SPAN + 0.6) { b.style.opacity = '0'; b.style.pointerEvents = 'none'; return; }
      const y = geo.H / 2 + geo.R * Math.sin(a), x = geo.inset(a);
      const k = Math.max(0, 1 - ad); // 1 — в центре
      b.style.transform = `translate(${right ? -x : x}px, ${(y).toFixed(1)}px) translateY(-50%) scale(${(0.78 + 0.42 * k).toFixed(3)})`;
      b.style.opacity = String(Math.max(0, 1 - ad * 0.27).toFixed(3));
      b.style.pointerEvents = '';
      b.classList.toggle('cur', ad < 0.5);
      b.firstChild.style.opacity = k.toFixed(2);
    });
  }

  let anim = 0;
  function rollTo(target) {
    cancelAnimationFrame(anim);
    const from = pos, to = Math.max(0, Math.min(n - 1, target)), t0 = performance.now(), dur = 160 + 60 * Math.min(3, Math.abs(to - from));
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      pos = from + (to - from) * e;
      layout();
      if (k < 1) anim = requestAnimationFrame(step); else { pos = to; lastPos = to; layout(); }
    };
    anim = requestAnimationFrame(step);
  }

  // палец: крутить; не сдвинул — касание; держит — правка
  let g = null, holdTimer = 0;
  wrap.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.stopPropagation(); // жесты главного (смахнуть вверх — все приложения) здесь не нужны
    cancelAnimationFrame(anim);
    g = { y: e.clientY, p: pos, moved: false, ly: e.clientY, lt: performance.now(), v: 0, id: e.pointerId, target: e.target.closest('.l-wh-i') };
    try { wrap.setPointerCapture(e.pointerId); } catch { /* */ }
    holdTimer = setTimeout(() => { if (g && !g.moved) { g = null; navigator.vibrate?.(12); hold(); } }, 450);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!g || e.pointerId !== g.id) return;
    e.stopPropagation();
    const dy = e.clientY - g.y;
    if (!g.moved && Math.abs(dy) < 6) return;
    g.moved = true; clearTimeout(holdTimer);
    const now = performance.now();
    if (now > g.lt) { g.v = (e.clientY - g.ly) / (now - g.lt); g.ly = e.clientY; g.lt = now; }
    pos = Math.max(-0.45, Math.min(n - 0.55, g.p - dy / (geo.R * STEP)));
    layout();
  });
  const end = (e) => {
    if (!g || e.pointerId !== g.id) return;
    e.stopPropagation();
    clearTimeout(holdTimer);
    const s = g; g = null;
    if (s.moved) { rollTo(Math.round(pos - (s.v * 140) / (geo.R * STEP))); return; }
    const i = s.target ? +s.target.dataset.i : null;
    if (i == null) return;
    if (Math.round(pos) === i) { s.target.classList.add('pressed'); setTimeout(() => s.target.classList.remove('pressed'), 400); s.target.activate(); }
    else rollTo(i);
  };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', (e) => { if (g) { g.moved = true; end(e); } });
  wrap.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); }, true); // касание — сами (pointerup)
  wrap.addEventListener('wheel', (e) => { e.preventDefault(); rollTo(Math.round(pos) + Math.sign(e.deltaY)); }, { passive: false });
  // размер известен, когда блок на экране
  requestAnimationFrame(() => { geo = null; layout(); });
  new ResizeObserver(() => { geo = null; layout(); }).observe(wrap);
  return wrap;
}
