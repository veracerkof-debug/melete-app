// Раскладка экрана сцены и пульта звукаря (слова автора 22.11 и 25.11.2026). Один механизм для обоих экранов.
// Два режима, и граница между ними жёсткая — на сцене надёжность важнее удобства:
//  • обычный (выступление): раскладка ЗАМОРОЖЕНА — меню у блока нет, размер и порядок не меняются ни случайным касанием,
//    ни на ходу; вывод разметки такой же, как был до правки (никаких лишних обёрток);
//  • правка: включается удержанием блока и только в тишине (api.busy — что-то звучит → «остановите звук»). У блока:
//    размер — тянуть планку внизу (плавно, 0,5–2,2), «выше» / «ниже», «скрыть»; сверху — «Как было» и «Готово»,
//    внизу — скрытые блоки (касание возвращает). Содержимое блоков в правке не нажимается. «Готово» — вид сохранён и заморожен.
// Рядом: блок можно поставить в один ряд с предыдущим (до двух в ряду, как окна свободной практики); ширина — планка между ними (25–75 %).
// Хранится в `lay` = { order: [id], hidden: [id], size: { id: 's'|'m'|'l' | число }, pair: { id: доля ширины первого блока } } там, где экран хранит свои данные.
// Блок обёрнут в display:contents — раскладка CSS не меняется, а размер приходит переменной --lz, которую блок использует сам.
import './layout.css';
import { onHold } from './hold.js';
import { toast } from './index.js';

export const SIZES = ['s', 'm', 'l']; // прежние три ступени (остаются в данных и читаются как числа)
const STEP = { s: 0.8, m: 1, l: 1.25 };
export const SCALE_MIN = 0.5, SCALE_MAX = 2.2;
export const clampScale = (v) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(v * 100) / 100));
export const clampRatio = (v) => Math.min(0.75, Math.max(0.25, Math.round(v * 100) / 100));
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? clampScale(v) : STEP[v]);
// Размер блока числом: ступень или своё значение; нет — 1
export const scaleOf = (lay, id) => (lay && lay.size && num(lay.size[id])) || 1;

export const normLay = (lay) => {
  const o = lay && typeof lay === 'object' ? lay : {};
  o.order = Array.isArray(o.order) ? o.order : [];
  o.hidden = Array.isArray(o.hidden) ? o.hidden : [];
  o.size = o.size && typeof o.size === 'object' ? o.size : {};
  for (const k of Object.keys(o.size)) if (num(o.size[k]) === undefined) delete o.size[k]; // мусор в данных не ломает экран
  o.pair = o.pair && typeof o.pair === 'object' ? o.pair : {};
  for (const k of Object.keys(o.pair)) { if (Number.isFinite(o.pair[k])) o.pair[k] = clampRatio(o.pair[k]); else delete o.pair[k]; }
  return o;
};

// Какие экраны сейчас в правке (не хранится: после перезапуска вид всегда заморожен)
const EDIT = new WeakSet();
export const isEditing = (lay) => EDIT.has(normLay(lay));
export const setEditing = (lay, on) => { const o = normLay(lay); if (on) EDIT.add(o); else EDIT.delete(o); };

// Порядок: сохранённый, затем новые блоки по умолчанию
const orderOf = (lay, ids) => [...lay.order.filter((i) => ids.includes(i)), ...ids.filter((i) => !lay.order.includes(i))];

// blocks — [{ id, html }] в порядке по умолчанию → HTML: в порядке пользователя, без скрытых.
// opts: { t, name(id) } — подписи нужны только в правке
export function arrange(blocks, lay, opts = {}) {
  lay = normLay(lay);
  const ids = blocks.map((b) => b.id), editing = EDIT.has(lay), t = opts.t || ((k) => k), name = opts.name || ((id) => id), grow = opts.grow || [];
  const byId = new Map(blocks.filter((b) => b.html).map((b) => [b.id, b]));
  const shownIds = orderOf(lay, ids).filter((id) => byId.has(id) && !lay.hidden.includes(id));
  const rows = rowsOf(lay, shownIds);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const one = (b) => {
    const z = scaleOf(lay, b.id);
    if (!editing) return '<div class="lyb" data-lb="' + b.id + '" style="--lz:' + z + '">' + b.html + '</div>';
    const paired = rows.find((r) => r.includes(b.id)).length === 2;
    return '<div class="lyb ed" data-lb="' + b.id + '" style="--lz:' + z + '"><div class="lyi">' + b.html + '</div>' +
      '<div class="lyc"><span class="lyn">' + esc(name(b.id)) + '</span><span class="lyx"><button data-ly="pair" aria-label="' + esc(t(paired ? 'lay.unpair' : 'lay.pair')) + '">' + (paired ? '↕' : '⇆') + '</button>' +
      '<button data-ly="up" aria-label="' + esc(t('lay.up')) + '">↑</button><button data-ly="down" aria-label="' + esc(t('lay.down')) + '">↓</button><button data-ly="hide" aria-label="' + esc(t('lay.hide')) + '">✕</button></span></div>' +
      '<div class="lyh" data-ly="grip" role="slider" aria-label="' + esc(t('lay.grip')) + '" aria-valuemin="' + SCALE_MIN + '" aria-valuemax="' + SCALE_MAX + '" aria-valuenow="' + z + '"><i></i></div></div>';
  };
  const body = rows.map((r) => {
    if (r.length === 1) return one(byId.get(r[0]));
    const w = clampRatio(lay.pair[r[1]]), g = r.some((id) => grow.includes(id));
    return '<div class="lyrow' + (g ? ' lyg' : '') + (editing ? ' ed' : '') + '" style="--lw:' + w + '">' + r.map((id) => one(byId.get(id))).join('') +
      (editing ? '<div class="lyv" data-ly="width" role="slider" aria-label="' + esc(t('lay.width')) + '" aria-valuemin="25" aria-valuemax="75" aria-valuenow="' + Math.round(w * 100) + '"><i></i></div>' : '') + '</div>';
  }).join('');
  if (!editing) return body;
  const hid = lay.hidden.filter((i) => ids.includes(i) && blocks.find((b) => b.id === i && b.html));
  return '<div class="lybar" role="toolbar" data-lybar><span>' + esc(t('lay.editHint')) + '</span><button data-ly="reset">' + esc(t('lay.reset')) + '</button><button class="done" data-ly="done">' + esc(t('lay.done')) + '</button></div>' + body +
    (hid.length ? '<div class="lytray" data-lybar><span>' + esc(t('lay.hiddenList')) + '</span>' + hid.map((i) => '<button data-ly="show" data-id="' + i + '">＋ ' + esc(name(i)) + '</button>').join('') + '</div>' : '');
}

// Ряды видимых блоков: [[id], [id, id2], …]; блок с записью в pair встаёт в ряд с предыдущим, если тот один в ряду
export function rowsOf(lay, ids) {
  lay = normLay(lay);
  const rows = [];
  for (const id of orderOf(lay, ids).filter((i) => !lay.hidden.includes(i))) {
    const last = rows[rows.length - 1];
    if (lay.pair[id] != null && last && last.length === 1) last.push(id); else rows.push([id]);
  }
  return rows;
}
// «Рядом» у блока id: в паре — разделить; один — встать в ряд с предыдущим (если тот тоже один). → изменилось ли
export function togglePair(lay, ids, id) {
  lay = normLay(lay);
  const rows = rowsOf(lay, ids), i = rows.findIndex((r) => r.includes(id));
  if (i < 0) return false;
  if (rows[i].length === 2) { delete lay.pair[rows[i][1]]; return true; }
  if (i > 0 && rows[i - 1].length === 1) { lay.pair[id] = 0.5; return true; }
  return false;
}
// Сдвиг ряда, в котором стоит блок id, на d (−1 вверх, +1 вниз); скрытые остаются в конце
export function moveBlock(lay, ids, id, d) {
  lay = normLay(lay);
  const rows = rowsOf(lay, ids), i = rows.findIndex((r) => r.includes(id)), j = i + d;
  if (i < 0 || j < 0 || j >= rows.length) return false;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  lay.order = [...rows.flat(), ...lay.hidden];
  return true;
}

// Ширина пары: тянуть планку между блоками; долю видно сразу, значение пишется на отпускании
function dragWidth(e, w, api, lay) {
  e.preventDefault(); e.stopPropagation();
  const row = w.closest('.lyrow'), second = row.querySelectorAll(':scope > .lyb')[1].dataset.lb, rc = row.getBoundingClientRect();
  let r = clampRatio(lay.pair[second]);
  try { w.setPointerCapture(e.pointerId); } catch { /* без захвата — события идут по окну */ }
  const move = (ev) => { r = clampRatio((ev.clientX - rc.left) / rc.width); row.style.setProperty('--lw', r); };
  const end = () => { w.removeEventListener('pointermove', move); w.removeEventListener('pointerup', end); w.removeEventListener('pointercancel', end); lay.pair[second] = r; api.save(); api.render(); };
  w.addEventListener('pointermove', move); w.addEventListener('pointerup', end); w.addEventListener('pointercancel', end);
}

// Правка экрана. root — корень экрана (на нём слушаются события); apiOrFn → { lay, ids, name(id), save(), render(), t, busy?() }.
// skip — элементы со своим удержанием или перетаскиванием (пэды, крутилки, строки списка): на них правка не включается.
export function bindLayout(root, apiOrFn, skip = '') {
  const A = () => (typeof apiOrFn === 'function' ? apiOrFn() : apiOrFn);
  const leave = (api, lay) => { setEditing(lay, false); root.classList.remove('lyedit'); api.save(); api.render(); };
  // вход — удержание блока, только в тишине
  onHold(root, '[data-lb]', (el, e) => {
    const api = A(), lay = normLay(api.lay);
    if (EDIT.has(lay)) return;
    if (skip && e && e.target && e.target.closest && e.target.closest(skip)) return;
    if (api.busy && api.busy()) { toast(api.t('lay.busy')); return; }
    if (typeof matchMedia === 'function' && matchMedia('(orientation: landscape) and (max-height: 520px)').matches) { toast(api.t('lay.rotate')); return; } // сетка сцены на боку другая — вид правят стоя
    setEditing(lay, true); root.classList.add('lyedit'); api.render();
  });
  // в правке события управления забираем себе (capture), чтобы они не доходили до жестов и кнопок экрана
  root.addEventListener('click', (e) => {
    const api = A(), lay = normLay(api.lay);
    if (!EDIT.has(lay)) return;
    const b = e.target.closest && e.target.closest('[data-ly]');
    if (!b || !root.contains(b)) return;
    e.preventDefault(); e.stopPropagation();
    const k = b.dataset.ly, blk = b.closest('.lyb'), id = blk ? blk.dataset.lb : b.dataset.id;
    const done = () => { api.save(); api.render(); };
    if (k === 'done') { leave(api, lay); return; }
    if (k === 'reset') { lay.order = []; lay.hidden = []; lay.size = {}; lay.pair = {}; done(); return; }
    // двигаем и ставим в пару только те блоки, что сейчас на экране (пустые, без содержимого, не считаются — ↓ всегда сдвигает видимо)
    const shownIds = () => { const on = [...root.querySelectorAll('.lyb[data-lb]')].map((e) => e.dataset.lb); return orderOf(lay, api.ids).filter((i) => on.includes(i) || lay.hidden.includes(i)); };
    if (k === 'pair') { if (togglePair(lay, shownIds(), id)) done(); return; }
    if (k === 'up' || k === 'down') { if (moveBlock(lay, shownIds(), id, k === 'up' ? -1 : 1)) done(); return; }
    if (k === 'hide') { const vis = orderOf(lay, api.ids).filter((i) => !lay.hidden.includes(i)); if (vis.length > 1) { lay.hidden = [...lay.hidden, id]; done(); } return; }
    if (k === 'show') { lay.hidden = lay.hidden.filter((i) => i !== id); done(); }
  }, true);
  // размер — тянуть планку внизу блока; блок следует за пальцем (высота подгоняется несколькими шагами), значение сохраняется на отпускании
  root.addEventListener('pointerdown', (e) => {
    const api = A(), lay = normLay(api.lay);
    if (!EDIT.has(lay) || e.button > 0) return;
    const w = e.target.closest && e.target.closest('.lyv');
    if (w && root.contains(w)) { dragWidth(e, w, api, lay); return; }
    const g = e.target.closest && e.target.closest('.lyh');
    if (!g || !root.contains(g)) return;
    e.preventDefault(); e.stopPropagation();
    const blk = g.closest('.lyb'), inner = blk.querySelector(':scope > .lyi'), id = blk.dataset.lb;
    const h0 = inner.getBoundingClientRect().height, y0 = e.clientY;
    let s = scaleOf(lay, id);
    try { g.setPointerCapture(e.pointerId); } catch { /* без захвата — события идут по окну */ }
    const move = (ev) => {
      const want = Math.max(40, h0 + (ev.clientY - y0)), cur = inner.getBoundingClientRect().height || h0;
      s = clampScale(s * Math.pow(want / cur, 1.4)); // высота растёт не пропорционально размеру — подгоняем по факту
      blk.style.setProperty('--lz', s);
    };
    const end = () => {
      g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', end); g.removeEventListener('pointercancel', end);
      if (Math.abs(s - 1) < 0.03) delete lay.size[id]; else lay.size[id] = s;
      api.save(); api.render();
    };
    g.addEventListener('pointermove', move); g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
  }, true);
}
