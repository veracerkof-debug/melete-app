// Мелкие элементы главного экрана: узлы, шторки (снизу, закрываются смахиванием вниз), сообщение, переключатели.
import { t } from './i18n.js';
import { setCover } from './cover.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// — Сообщение —
let toastTimer;
export function toast(text) {
  let el = document.querySelector('.l-toast');
  if (!el) { el = h('div', { class: 'l-toast', role: 'status' }); document.body.append(el); }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// — Шторки —
const stack = [];
export const sheetOpen = () => stack.length > 0;

export function openSheet({ title, kicker, render, full = false, onClose, onSwipe }) {
  const body = h('div', { class: 'l-sheet-body' });
  const x = h('button', { class: 'l-sheet-x', 'aria-label': t('ui.close'), html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' });
  const panel = h('div', { class: `l-sheet ${full ? 'full' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'l-grip' }),
    h('header', { class: 'l-sheet-head' }, h('div', {}, kicker ? h('div', { class: 'l-kicker' }, kicker) : null, h('h2', {}, title)), x),
    body);
  const scrim = h('div', { class: 'l-scrim' });
  const wrap = h('div', { class: 'l-sheet-wrap' }, scrim, panel);
  document.querySelector('#l').append(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  let closed = false;
  const entry = {};
  const close = () => {
    if (closed) return;
    closed = true;
    stack.splice(stack.indexOf(entry), 1);
    panel.style.transition = ''; panel.style.transform = '';
    wrap.classList.remove('open');
    if (!stack.length) setCover('sheet', false);
    setTimeout(() => wrap.remove(), 320);
    onClose?.();
  };
  entry.close = close;
  stack.push(entry);
  setCover('sheet', true);
  scrim.addEventListener('click', close);
  x.addEventListener('click', close);
  // потянуть вниз — закрыть: с любого места, когда содержимое в начале (шторка идёт за пальцем); вбок — onSwipe (вкладки)
  let st = null;
  panel.addEventListener('pointerdown', (e) => {
    if (e.target.closest('input, textarea, select')) { st = null; return; }
    st = { x: e.clientX, y: e.clientY, can: body.scrollTop <= 0 || !body.contains(e.target), lock: null, vel: [] };
  });
  panel.addEventListener('pointermove', (e) => {
    if (!st) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.lock) {
      if (Math.hypot(dx, dy) < 6) return;
      if (Math.abs(dx) > Math.abs(dy)) st.lock = onSwipe ? 'x' : 'no';
      else if (dy > 0 && st.can) { st.lock = 'y'; panel.style.transition = 'none'; try { panel.setPointerCapture(e.pointerId); } catch { /* */ } }
      else st.lock = 'no';
      if (st.lock === 'no') { st = null; return; }
    }
    if (st.lock === 'y') {
      panel.style.transform = `translateY(${Math.max(0, dy)}px)`;
      st.vel.push({ dy, t: performance.now() }); if (st.vel.length > 6) st.vel.shift();
    }
  });
  panel.addEventListener('touchmove', (e) => { if (st?.lock) e.preventDefault(); }, { passive: false });
  const endP = (e) => {
    if (!st) return;
    const s = st; st = null;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (s.lock === 'y') {
      panel.style.transition = '';
      const a = s.vel[0], b = s.vel[s.vel.length - 1];
      const v = a && b && b.t > a.t ? (b.dy - a.dy) / (b.t - a.t) : 0;
      if (dy > 90 || v > 0.3) close(); else panel.style.transform = '';
    } else if (s.lock === 'x' && Math.abs(dx) > 50 && onSwipe) onSwipe(dx < 0 ? 'left' : 'right');
  };
  panel.addEventListener('pointerup', endP);
  panel.addEventListener('pointercancel', () => { if (st?.lock === 'y') { panel.style.transition = ''; panel.style.transform = ''; } st = null; });
  const rerender = () => { body.replaceChildren(); render(body, close, rerender); };
  rerender();
  return { close, rerender };
}

export function closeTopSheet() {
  const top = stack.at(-1);
  if (top) { top.close(); return true; }
  return false;
}

// — Элементы настроек —
export function segmented(options, value, onChange, label = '') {
  const wrap = h('div', { class: 'l-seg', role: 'radiogroup', 'aria-label': label || null });
  for (const o of options) {
    wrap.append(h('button', { class: o.value === value ? 'on' : '', role: 'radio', 'aria-checked': o.value === value ? 'true' : 'false', onclick: () => onChange(o.value) }, o.label));
  }
  return wrap;
}

export function toggle(label, value, onChange, hint) {
  return h('button', { class: 'l-row', role: 'switch', 'aria-checked': value ? 'true' : 'false', onclick: () => onChange(!value) },
    h('span', { class: 'l-row-main' }, h('span', {}, label), hint ? h('small', {}, hint) : null),
    h('span', { class: `l-sw ${value ? 'on' : ''}` }, h('i')));
}

export function field(label, value, onInput, attrs = {}) {
  const input = h('input', { value: value ?? '', ...attrs });
  input.addEventListener('input', () => onInput(input.value));
  return h('label', { class: 'l-field' }, h('span', {}, label), input);
}

export const section = (title, el, ...children) =>
  h('section', { class: 'l-sec' }, h('h3', {}, title, el ? h('span', { class: 'el', lang: 'el' }, el) : null), ...children);
