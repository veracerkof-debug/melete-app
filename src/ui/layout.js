// Раскладка экрана по долгому нажатию (слово автора 22.11.2026): у блока — выше / ниже, мельче / крупнее, скрыть; вернуть скрытое и сбросить вид.
// Один механизм для сцены и пульта. Хранится в `lay` = { order: [id], hidden: [id], size: { id: 's'|'m'|'l' } } там, где экран хранит свои данные.
// Блок обёрнут в display:contents — раскладка CSS не меняется, а размер приходит переменной --lz (s .8 · m 1 · l 1.25), которую блок использует сам.
import './layout.css';
import { holdMenu, onHold } from './hold.js';

export const SIZES = ['s', 'm', 'l'];
export const normLay = (lay) => { const o = lay && typeof lay === 'object' ? lay : {}; o.order = Array.isArray(o.order) ? o.order : []; o.hidden = Array.isArray(o.hidden) ? o.hidden : []; o.size = o.size && typeof o.size === 'object' ? o.size : {}; return o; };

// blocks — [{ id, html }] в порядке по умолчанию → HTML: в порядке пользователя, без скрытых
export function arrange(blocks, lay) {
  lay = normLay(lay);
  const ids = blocks.map((b) => b.id), order = [...lay.order.filter((i) => ids.includes(i)), ...ids.filter((i) => !lay.order.includes(i))];
  return order.map((id) => blocks.find((b) => b.id === id)).filter((b) => b && b.html && !lay.hidden.includes(b.id))
    .map((b) => '<div class="lyb" data-lb="' + b.id + '" data-lz="' + (lay.size[b.id] || 'm') + '">' + b.html + '</div>').join('');
}

// Меню блока. api: { lay (объект раскладки), ids (все блоки экрана по умолчанию), name(id) → подпись, save(), render(), t }
export function layoutMenu(anchor, id, api) {
  const lay = normLay(api.lay), t = api.t, ids = api.ids;
  const order = [...lay.order.filter((i) => ids.includes(i)), ...ids.filter((i) => !lay.order.includes(i))].filter((i) => !lay.hidden.includes(i));
  const pos = order.indexOf(id), sz = SIZES.indexOf(lay.size[id] || 'm');
  const done = () => { api.save(); api.render(); };
  const move = (d) => { const o = order.slice(), j = pos + d; if (j < 0 || j >= o.length) return; [o[pos], o[j]] = [o[j], o[pos]]; lay.order = [...o, ...lay.hidden]; done(); };
  const items = [];
  if (pos > 0) items.push({ icon: '↑', label: t('lay.up'), run: () => move(-1) });
  if (pos < order.length - 1) items.push({ icon: '↓', label: t('lay.down'), run: () => move(1) });
  if (sz < 2) items.push({ icon: '＋', label: t('lay.bigger'), run: () => { lay.size[id] = SIZES[sz + 1]; done(); } });
  if (sz > 0) items.push({ icon: '－', label: t('lay.smaller'), run: () => { lay.size[id] = SIZES[sz - 1]; done(); } });
  items.push({ icon: '✕', label: t('lay.hide'), run: () => { lay.hidden = [...lay.hidden, id]; done(); } });
  const hid = lay.hidden.filter((i) => ids.includes(i));
  if (hid.length) items.push({ icon: '◌', label: t('lay.showHidden', { n: hid.length }), run: () => { lay.hidden = lay.hidden.filter((i) => !ids.includes(i)); done(); } });
  if (lay.order.length || lay.hidden.length || Object.keys(lay.size).length) items.push({ icon: '↺', label: t('lay.reset'), run: () => { lay.order = []; lay.hidden = []; lay.size = {}; done(); }, danger: true });
  return holdMenu(anchor, items, api.name(id));
}

// Удержание блока → меню. skip — элементы со своим удержанием или перетаскиванием (пэды, крутилки, строки списка): на них меню не открывается
export function bindLayout(root, apiOrFn, skip = '') {
  onHold(root, '[data-lb]', (el, e) => {
    if (skip && e && e.target && e.target.closest && e.target.closest(skip)) return;
    const api = typeof apiOrFn === 'function' ? apiOrFn() : apiOrFn;
    layoutMenu(el.firstElementChild || el, el.dataset.lb, api); // у display:contents нет своей рамки — меню у первого элемента блока
  });
}
