// Шкала у края во «Всех приложениях» (решение автора 2026-11-01, по образу шкалы со свечением): тонкая линия
// с делениями и буквами; ведёшь пальцем — линия выгибается под пальцем, светится бегунок, рядом крупно буква,
// список сразу встаёт на первое приложение на эту букву. Отпустил — линия выпрямляется.
import { prefs } from './data.js';

const NS = 'http://www.w3.org/2000/svg';
let el, svg, knob, glow, big, list, letters = [], H = 0, W = 44;

// буквы текущего списка: первая строка на каждую букву
function collect() {
  const seen = new Map();
  list.querySelectorAll('.l-d-app').forEach((b) => {
    const L = (b.textContent.trim()[0] || '#').toUpperCase();
    if (!seen.has(L)) seen.set(L, b);
  });
  letters = [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru')).map(([L, node]) => ({ L, node }));
}

const yOf = (i) => (letters.length < 2 ? H / 2 : 18 + (i * (H - 36)) / (letters.length - 1));

function draw(y = null) {
  const X = W - 10, D = 18, B = 46;
  const line = y == null ? `M${X} 0 V${H}` : `M${X} 0 V${Math.max(0, y - B)} C${X} ${y - B * 0.45} ${X - D} ${y - B * 0.4} ${X - D} ${y} C${X - D} ${y + B * 0.4} ${X} ${y + B * 0.45} ${X} ${Math.min(H, y + B)} V${H}`;
  const ticks = letters.map((l, i) => {
    const ty = yOf(i), near = y != null && Math.abs(ty - y) < B;
    return `<path d="M${X + 2} ${ty.toFixed(1)}h6" stroke-opacity="${near ? 0 : 0.6}"/>`
      + `<text x="${X - 6}" y="${(ty + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="currentColor" stroke="none" opacity="${y == null ? 0.45 : near ? 0 : 0.25}">${l.L}</text>`;
  }).join('');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `<path d="${line}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-opacity=".7"/><g stroke="currentColor" stroke-width="1">${ticks}</g>`;
  const on = y != null;
  el.classList.toggle('on', on);
  if (on) {
    knob.style.transform = glow.style.transform = `translate(${X - D}px, ${y}px)`;
    big.style.transform = `translate(${X - D - 34}px, ${y}px)`;
  }
}

export function mountScrub(body, listEl) {
  list = listEl;
  el = document.createElement('div');
  el.className = 'l-scrub';
  el.setAttribute('aria-hidden', 'true');
  svg = document.createElementNS(NS, 'svg');
  glow = document.createElement('i'); glow.className = 'l-scrub-glow';
  knob = document.createElement('i'); knob.className = 'l-scrub-knob';
  big = document.createElement('b'); big.className = 'l-scrub-big';
  el.append(glow, svg, knob, big);
  body.append(el);
  let cur = null, active = false;
  const pick = (e) => {
    const r = el.getBoundingClientRect();
    const y = Math.max(0, Math.min(H, e.clientY - r.top));
    if (letters.length) {
      let i = 0, best = Infinity;
      letters.forEach((l, k) => { const dd = Math.abs(yOf(k) - y); if (dd < best) { best = dd; i = k; } });
      const l = letters[i];
      if (cur !== l.L) {
        cur = l.L; big.textContent = l.L;
        navigator.vibrate?.(4);
        list.scrollTop = Math.max(0, l.node.offsetTop - list.offsetTop - 8 - (l.node.previousElementSibling?.classList.contains('l-d-letter') ? l.node.previousElementSibling.offsetHeight : 0));
      }
    }
    draw(y);
  };
  el.addEventListener('pointerdown', (e) => {
    if (!prefs.scrub) return;
    e.stopPropagation(); e.preventDefault();
    refreshScrub(); collect(); cur = null; active = true;
    try { el.setPointerCapture(e.pointerId); } catch { /* */ }
    pick(e);
  });
  el.addEventListener('pointermove', (e) => { if (active) { e.stopPropagation(); pick(e); } });
  const end = (e) => { if (!active) return; e.stopPropagation(); active = false; draw(null); };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('touchmove', (e) => { if (active) e.preventDefault(); }, { passive: false });
}

// после смены списка или размера: место шкалы — вдоль списка, буквы — нового списка
export function refreshScrub() {
  if (!el) return;
  el.hidden = !prefs.scrub;
  if (!prefs.scrub) return;
  el.style.top = list.offsetTop + 'px';
  el.style.height = list.offsetHeight + 'px';
  H = list.offsetHeight || 400;
  collect();
  draw(null);
}
