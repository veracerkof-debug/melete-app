// Правка главного экрана на месте (решение автора 2026-10-28: раскладки в настройках нет — всё жестами).
// Удержание любого элемента (часы, дата, Melete, баланс, приложения, значки) — режим правки:
//   перетащить блок — переставить; перетащить приложение или значок — переставить внутри;
//   щипок — размер (и − / + для точной донастройки); «Убрать» — блок прячется, вернуть — кнопкой внизу;
//   касание приложения или значка — его правка (подпись, что открывает, убрать).
// Выход — «Готово», «Назад», Esc или уход с экрана. Своя строка состояния и крест — не блоки (настройки «Вид»).
import { prefs, save } from './data.js';
import { layout, setLayout, BLOCKS } from './layout.js';
import { homeItems, dockSlots } from './apps.js';
import { t } from './i18n.js';
import { h } from './ui.js';

const MIN = 60, MAX = 160, STEP = 5, MOVE_PX = 8;
let home = null, deps = {}, bar = null;
let editing = false, selected = null;

export const isEditing = () => editing;

// deps: renderHome, editHomeItem(i), editDockSlot(i), addApp(), addDock(), refresh()
export function mountArrange(el, d) {
  home = el;
  deps = d;
  home.addEventListener('pointerdown', down, true);
  home.addEventListener('pointermove', move, true);
  home.addEventListener('pointerup', up, true);
  home.addEventListener('pointercancel', cancel, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) exitArrange(); });
}

export function enterArrange(id) {
  editing = true;
  selected = BLOCKS.includes(id) && id !== 'space' ? id : null;
  navigator.vibrate?.(12);
  redraw();
}

export function exitArrange() {
  if (!editing) return false;
  editing = false; selected = null;
  home.style.removeProperty('--l-arr-h');
  bar?.remove(); bar = null;
  deps.renderHome();
  return true;
}

const ownHome = () => (prefs.home = prefs.home || homeItems().map((x) => ({ ...x })));
const ownDock = () => (prefs.dock = prefs.dock || dockSlots().map((x) => ({ ...x, action: { ...x.action } })));
const blocksInDom = () => [...home.querySelectorAll('[data-blk]')].filter((e) => !e.hidden);
// блоки в общем столбце (стоящие отдельно — полоса значков сбоку в «Полосе» и «Меню» — порядок не делят)
const flowBlocks = () => blocksInDom().filter((e) => getComputedStyle(e).position !== 'absolute');
// увеличение элемента (zoom складывается по предкам): палец сдвинул на dy — элементу нужно dy / zoom
function zoomOf(el) { let z = 1; for (let e = el; e && e !== document.body; e = e.parentElement) z *= parseFloat(getComputedStyle(e).zoom) || 1; return z; }
const name = (id) => t('blk.' + id);

// перерисовать главный и отметить блоки
function redraw() {
  if (!editing) return;
  deps.renderHome();
  blocksInDom().forEach((e) => { e.classList.add('l-arr-blk'); e.classList.toggle('sel', e.dataset.blk === selected); e.dataset.name = name(e.dataset.blk); });
  drawBar();
}

// полоса внизу: выбранный блок — размер, «Убрать»; приложения и значки — «Добавить»; ничего не выбрано — что вернуть
function drawBar() {
  const L = layout();
  if (!bar) { bar = h('div', { class: 'l-arr-bar', role: 'toolbar', 'aria-label': t('arr.title') }); document.getElementById('l').append(bar); }
  const done = h('button', { class: 'l-arr-done', onclick: () => exitArrange() }, t('arr.done'));
  // полоса правки внизу не закрывает значки и приложения: главный поднимается над ней
  requestAnimationFrame(() => { if (bar) home.style.setProperty('--l-arr-h', bar.offsetHeight + 'px'); });
  if (selected) {
    const pct = L.scale[selected] || 100;
    const setPct = (v) => { setLayout({ scale: { ...L.scale, [selected]: Math.max(MIN, Math.min(MAX, v)) } }); redraw(); };
    // «＋ Приложение» — всегда под рукой (что на главном — галочками); у значков внизу — «＋ Значок»
    const add = selected === 'dock' ? (dockSlots().length < 6 ? h('button', { class: 'l-arr-chip', onclick: () => deps.addDock(redraw) }, '＋ ' + t('arr.addIcon')) : null)
      : h('button', { class: 'l-arr-chip', onclick: () => deps.addApp(redraw) }, '＋ ' + t('arr.addApp'));
    bar.replaceChildren(
      h('div', { class: 'l-arr-row' },
        h('span', { class: 'l-arr-name' }, name(selected)),
        h('button', { class: 'l-arr-k', 'aria-label': t('arr.smaller'), disabled: pct <= MIN, onclick: () => setPct(pct - STEP) }, '−'),
        h('button', { class: 'l-arr-v', 'aria-label': t('arr.reset'), onclick: () => setPct(100) }, pct + ' %'),
        h('button', { class: 'l-arr-k', 'aria-label': t('arr.bigger'), disabled: pct >= MAX, onclick: () => setPct(pct + STEP) }, '+')),
      h('div', { class: 'l-arr-row' },
        add,
        h('button', { class: 'l-arr-chip danger', onclick: () => { setLayout({ hide: { ...L.hide, [selected]: true } }); selected = null; redraw(); } }, t('arr.hide')),
        done));
  } else {
    const hidden = L.order.filter((id) => L.hide[id]);
    bar.replaceChildren(
      h('p', { class: 'l-arr-hint' }, t('arr.hint')),
      h('div', { class: 'l-arr-row' },
        L.hide.apps ? null : h('button', { class: 'l-arr-chip', onclick: () => deps.addApp(redraw) }, '＋ ' + t('arr.addApp')),
        ...hidden.map((id) => h('button', { class: 'l-arr-chip', onclick: () => { setLayout({ hide: { ...L.hide, [id]: false } }); selected = id; redraw(); } }, '＋ ' + name(id))),
        done));
  }
}

// — касания в режиме правки: перетаскивание, щипок, выбор —
const pts = new Map();
let g = null; // текущий жест

function down(e) {
  if (!editing || e.button > 0) return;
  e.stopPropagation();
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pts.size === 2) { startPinch(); return; }
  const blk = e.target.closest('[data-blk]');
  const item = e.target.closest('.l-app, .l-dock-btn');
  g = { kind: 'tap', x: e.clientX, y: e.clientY, blk, item, id: e.pointerId };
  try { home.setPointerCapture(e.pointerId); } catch { /* */ }
}

function move(e) {
  if (!editing || !pts.has(e.pointerId)) return;
  e.stopPropagation();
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (g?.kind === 'pinch') return pinchMove();
  if (!g || g.id !== e.pointerId) return;
  const dx = e.clientX - g.x, dy = e.clientY - g.y;
  if (g.kind === 'tap') {
    if (Math.hypot(dx, dy) < MOVE_PX) return;
    if (g.item) startItemDrag();
    else if (g.blk) startBlockDrag();
    else { g = null; return; }
  }
  g.px = e.clientX; g.py = e.clientY; // место — по пальцу
  if (g.kind === 'block') blockMove(dy);
  else if (g.kind === 'item') itemMove(dx, dy);
}

function up(e) {
  if (!editing || !pts.has(e.pointerId)) return;
  e.stopPropagation();
  pts.delete(e.pointerId);
  const cur = g;
  if (cur?.kind === 'pinch') { if (!pts.size) { endPinch(); g = null; } return; }
  g = null;
  if (!cur) return;
  if (cur.kind === 'block') return blockEnd(cur);
  if (cur.kind === 'item') return itemEnd(cur);
  // касание: приложение или значок — его правка; блок — выбрать; пустое место — снять выбор
  if (cur.item) {
    const i = +cur.item.dataset.i;
    if (cur.item.classList.contains('l-app')) deps.editHomeItem(i, redraw); else deps.editDockSlot(i, redraw);
    return;
  }
  const id = cur.blk?.dataset.blk;
  selected = id && id !== 'space' ? id : null;
  redraw();
}

function cancel(e) {
  pts.delete(e.pointerId);
  if (g?.kind === 'block' || g?.kind === 'item') { g = null; redraw(); }
  if (g?.kind === 'pinch' && !pts.size) { endPinch(); g = null; }
}
// клик после касания в режиме правки не доходит до приложений и часов (они бы открылись)
addEventListener('click', (e) => { if (editing && home?.contains(e.target)) { e.stopPropagation(); e.preventDefault(); } }, true);

// перетащить блок: он идёт за пальцем, отпустили — встаёт между соседями
function startBlockDrag() {
  const el = g.blk;
  g.kind = 'block';
  g.el = el;
  selected = el.dataset.blk;
  blocksInDom().forEach((b) => b.classList.toggle('sel', b === el));
  el.classList.add('dragging');
  drawBar();
}
function blockMove(dy) {
  if (getComputedStyle(g.el).position === 'absolute') return; // стоит отдельно — двигать некуда, только размер
  g.el.style.transform = `translateY(${dy / (g.z || (g.z = zoomOf(g.el)))}px)`;
  g.dy = dy;
}
function blockEnd(cur) {
  const el = cur?.el || home.querySelector('.l-arr-blk.dragging');
  const L = layout();
  const r = el.getBoundingClientRect();
  const mid = cur?.py ?? r.top + r.height / 2; // блок встаёт туда, где палец
  if (getComputedStyle(el).position === 'absolute') { redraw(); return; }
  const others = flowBlocks().filter((b) => b !== el);
  let at = others.findIndex((b) => { const q = b.getBoundingClientRect(); return mid < q.top + q.height / 2; });
  if (at < 0) at = others.length;
  const vis = others.map((b) => b.dataset.blk);
  vis.splice(at, 0, el.dataset.blk);
  // видимые блоки — в новом порядке; спрятанные и пустые (нет Melete, нет записей) остаются на своих местах
  let k = 0;
  const order = L.order.map((id) => (vis.includes(id) ? vis[k++] : id));
  setLayout({ order });
  redraw();
}

// перетащить приложение (по вертикали) или значок (по горизонтали) внутри своего ряда
function startItemDrag() {
  g.kind = 'item';
  g.el = g.item;
  g.dock = g.item.classList.contains('l-dock-btn');
  g.el.classList.add('dragging');
}
function itemMove(dx, dy) {
  const z = g.z || (g.z = zoomOf(g.el));
  g.el.style.transform = g.dock && getComputedStyle(g.el.parentElement).flexDirection !== 'column' ? `translateX(${dx / z}px)` : `translateY(${dy / z}px)`;
}
function itemEnd(cur) {
  const el = cur.el;
  const sibs = [...el.parentElement.querySelectorAll(cur.dock ? '.l-dock-btn' : '.l-app')].filter((x) => !x.hidden);
  const r = el.getBoundingClientRect();
  const across = cur.dock && getComputedStyle(el.parentElement).flexDirection !== 'column';
  const mid = across ? cur.px ?? r.left + r.width / 2 : cur.py ?? r.top + r.height / 2;
  const others = sibs.filter((x) => x !== el);
  let at = others.findIndex((x) => { const q = x.getBoundingClientRect(); return mid < (across ? q.left + q.width / 2 : q.top + q.height / 2); });
  if (at < 0) at = others.length;
  const from = sibs.indexOf(el);
  const list = cur.dock ? ownDock() : ownHome();
  const [it] = list.splice(from, 1);
  list.splice(at, 0, it);
  save();
  redraw();
}

// щипок — размер выбранного блока (или блока под пальцами)
function startPinch() {
  const [a, b] = [...pts.values()];
  const under = document.elementFromPoint((a.x + b.x) / 2, (a.y + b.y) / 2)?.closest('[data-blk]');
  const id = under?.dataset.blk && under.dataset.blk !== 'space' ? under.dataset.blk : selected;
  if (g?.el) { g.el.classList.remove('dragging'); g.el.style.transform = ''; }
  if (!id) { g = null; return; }
  selected = id;
  const L = layout();
  g = { kind: 'pinch', id, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, p0: L.scale[id] || 100, p: L.scale[id] || 100 };
  blocksInDom().forEach((x) => x.classList.toggle('sel', x.dataset.blk === id));
  drawBar();
}
function pinchMove() {
  const [a, b] = [...pts.values()];
  if (!a || !b) return;
  const p = Math.round(Math.max(MIN, Math.min(MAX, g.p0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0)) / STEP) * STEP;
  if (p === g.p) return;
  g.p = p;
  const el = home.querySelector(`[data-blk="${g.id}"]`);
  if (el) {
    if (g.id === 'dock') el.style.setProperty('--l-blk', String(p / 100));
    else el.style.zoom = g.id === 'clock' ? `calc(var(--l-ck, 1) * ${p / 100})` : `calc(var(--l-ui, 1) * ${p / 100})`;
  }
  const v = bar?.querySelector('.l-arr-v');
  if (v) v.textContent = p + ' %';
  navigator.vibrate?.(3);
}
function endPinch() {
  if (g?.kind === 'pinch' && g.p !== g.p0) { const L = layout(); setLayout({ scale: { ...L.scale, [g.id]: g.p } }); }
  redraw();
}
