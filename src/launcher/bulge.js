// Изгиб у края (решение автора 2026-11-01): от края экрана плавной волной выходит тёмная полоса с кольцами —
// заряд, практика Melete за неделю, чтение дня (церковный режим). Касание кольца практики или чтения — в Melete.
// Не мешает касаниям мимо него; сторона — противоположная тексту главного.
import { t } from './i18n.js';
import { h } from './ui.js';

const RING = (f) => {
  const r = 14, c = 2 * Math.PI * r, k = Math.max(0, Math.min(1, f || 0));
  return `<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="${r}" fill="none" stroke="currentColor" stroke-opacity=".22" stroke-width="3"/>`
    + `<circle class="l-ring-v" cx="18" cy="18" r="${r}" fill="none" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(c * k).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 18 18)"/></svg>`;
};

export function renderBulge({ side, rings }) {
  const el = h('div', { class: `l-bulge ${side}`, role: 'group', 'aria-label': t('ring.title') });
  if (!rings.length) { el.hidden = true; return el; }
  // форма: прямая у края, волной уходит внутрь, ровно стоит, волной возвращается (рисуется под размер)
  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  shape.setAttribute('class', 'l-bulge-bg');
  shape.setAttribute('aria-hidden', 'true');
  shape.setAttribute('preserveAspectRatio', 'none');
  const W = 64, C = 34, H = 40 + rings.length * 72;
  const x0 = side === 'right' ? W : 0, x1 = side === 'right' ? 0 : W; // край экрана → внутренняя сторона
  shape.setAttribute('viewBox', `0 0 ${W} ${H + 2 * C}`);
  shape.innerHTML = `<path d="M${x0} 0 C${x0} ${C * 0.55} ${x1} ${C * 0.45} ${x1} ${C} V${H + C} C${x1} ${H + C * 1.55} ${x0} ${H + C * 1.45} ${x0} ${H + 2 * C} Z" fill="currentColor"/>`;
  el.append(shape);
  const col = h('div', { class: 'l-bulge-col' });
  rings.forEach((r) => {
    const b = h(r.go ? 'button' : 'div', { class: 'l-ring', 'aria-label': `${r.name}: ${r.label}`, onclick: r.go ? (e) => { e.stopPropagation(); r.go(); } : null },
      h('span', { class: 'l-ring-g', html: RING(r.f) }), h('small', {}, r.label));
    col.append(b);
  });
  el.append(col);
  return el;
}
