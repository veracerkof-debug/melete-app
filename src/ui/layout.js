// Раскладка экрана сцены и пульта звукаря (слова автора 22.11 и 25.11.2026). Один механизм для обоих экранов.
// Два режима, и граница между ними жёсткая — на сцене надёжность важнее удобства:
//  • обычный (выступление): раскладка ЗАМОРОЖЕНА — меню у блока нет, размер и порядок не меняются ни случайным касанием,
//    ни на ходу; вывод разметки такой же, как был до правки (никаких лишних обёрток);
//  • правка: включается удержанием блока и только в тишине (api.busy — что-то звучит → «остановите звук»). У блока:
//    блоки стоят вплотную, как окна свободной практики, без кнопок и подписей-меню: инструмент затемнён, поверх — его название;
//    размер — тянуть границу под блоком (плавно, 0,5–2,2), место — удержать блок и перетащить (к боку другого — рядом), скрыть — смахнуть
//    вбок; сверху — «Как было» и «Готово», внизу — скрытые блоки (касание возвращает). Содержимое блоков в правке не нажимается
//    и ничего не звучит (слово автора 26.11.2026). «Готово» — вид сохранён и заморожен.
// Рядом: блок можно поставить в один ряд с предыдущим (до двух в ряду, как окна свободной практики); ширина — планка между ними (25–75 %).
// Хранится в `lay` = { order: [id], hidden: [id], size: { id: 's'|'m'|'l' | число }, pair: { id: доля ширины первого блока } } там, где экран хранит свои данные.
// Блок обёрнут в display:contents — раскладка CSS не меняется, а размер приходит переменной --lz, которую блок использует сам.
import './layout.css';
import { onHold, buzz } from './hold.js';
import { toast } from './index.js';

export const SIZES = ['s', 'm', 'l']; // прежние три ступени (остаются в данных и читаются как числа)
const STEP = { s: 0.8, m: 1, l: 1.25 };
export const SCALE_MIN = 0.5, SCALE_MAX = 2.2;
export const clampScale = (v) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(v * 100) / 100));
export const clampRatio = (v) => Math.min(0.75, Math.max(0.25, Math.round(v * 100) / 100));
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? clampScale(v) : STEP[v]);
// Размер блока числом: ступень или своё значение; нет — 1
export const scaleOf = (lay, id) => (lay && lay.size && num(lay.size[id])) || 1;

// Ступень размера блока для CSS (`data-z`): что убирается при сжатии и что растёт при увеличении — src/ui/stagefit.css
export const tierOf = (z) => (z <= 0.65 ? 'xs' : z <= 0.9 ? 's' : z <= 1.25 ? 'm' : z <= 1.7 ? 'l' : 'xl');
// Число рядов у блока из плиток (драм-пэды): блок ниже — меньше рядов, плитки не сжимаются, а перестраиваются (слово автора 26.11.2026)
export const rowsFor = (z) => Math.max(1, Math.min(4, Math.round(z * 2)));
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
    if (!editing) return '<div class="lyb" data-lb="' + b.id + '" style="--lz:' + z + '" data-z="' + tierOf(z) + '">' + b.html + '</div>';
    return '<div class="lyb ed' + (grow.includes(b.id) ? ' lyg' : '') + '" data-lb="' + b.id + '" style="--lz:' + z + '" data-z="' + tierOf(z) + '"><div class="lyi">' + b.html + '</div>' +
      '<span class="lyn">' + esc(name(b.id)) + '</span>' +
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
  // Полоса «Готово» и скрытые блоки висят поверх экрана и места не занимают: вид правки — тот же, что обычный (слово автора 26.11.2026)
  return '<div class="lybar" role="toolbar" data-lybar><div class="lybi"><span>' + esc(t('lay.editHint')) + '</span><button data-ly="reset">' + esc(t('lay.reset')) + '</button><button class="done" data-ly="done">' + esc(t('lay.done')) + '</button></div></div>' + body +
    (hid.length ? '<div class="lytray" data-lybar><div class="lybi"><span>' + esc(t('lay.hiddenList')) + '</span>' + hid.map((i) => '<button data-ly="show" data-id="' + i + '">＋ ' + esc(name(i)) + '</button>').join('') + '</div></div>' : '');
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

// Перенос блока id (слово автора 26.11.2026): where — 'before' / 'after' ряда target, 'left' / 'right' — рядом с target (если он один в ряду,
// иначе — после ряда). Ширина пары сохраняется, если пара прежняя, иначе пополам. → изменилось ли
export function moveTo(lay, ids, id, target, where) {
  lay = normLay(lay);
  if (id === target) return false;
  const shown = rowsOf(lay, ids), flat0 = shown.flat();
  if (!flat0.includes(id) || !flat0.includes(target)) return false;
  const was = shown.map((r) => r.join());
  const rows = shown.map((r) => r.filter((x) => x !== id)).filter((r) => r.length);
  const i = rows.findIndex((r) => r.includes(target));
  if ((where === 'left' || where === 'right') && rows[i].length === 1) rows[i] = where === 'left' ? [id, target] : [target, id];
  else rows.splice(where === 'before' ? i : i + 1, 0, [id]);
  const keep = { ...lay.pair };
  for (const x of flat0) delete lay.pair[x];
  for (const r of rows) if (r.length === 2) lay.pair[r[1]] = keep[r[1]] != null ? keep[r[1]] : 0.5;
  lay.order = [...rows.flat(), ...lay.hidden];
  return rows.map((r) => r.join()).join('|') !== was.join('|') || JSON.stringify(keep) !== JSON.stringify(lay.pair);
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


// Жест на блоке в правке: смахнуть вбок — скрыть; удержать и перетащить — на другое место (у бока другого блока — рядом).
// Вертикальная прокрутка остаётся за браузером (touch-action: pan-y), перетаскивание начинается после удержания.
function blockGesture(e, blk, api, lay) {
  if (e.button > 0 || !e.isPrimary) return;
  const root = blk.closest('.lyedit') || blk.parentElement, id = blk.dataset.lb, pid = e.pointerId;
  const x0 = e.clientX, y0 = e.clientY, st0 = root.scrollTop;
  let mode = '', tm = 0, tgt = null, pos = '', lastX = x0, lastY = y0;
  const done = () => { api.save(); api.render(); };
  const others = () => [...root.querySelectorAll('.lyb.ed')].filter((b) => b !== blk);
  const mark = () => { root.querySelectorAll('.lyt').forEach((b) => b.classList.remove('lyt', 'lyt-before', 'lyt-after', 'lyt-left', 'lyt-right')); if (tgt && pos) tgt.classList.add('lyt', 'lyt-' + pos); };
  const pick = (x, y) => {
    tgt = null; pos = '';
    for (const b of others()) {
      const r = b.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      const alone = !b.parentElement.classList.contains('lyrow'), fx = (x - r.left) / r.width, fy = (y - r.top) / r.height;
      tgt = b; pos = alone && fx < 0.22 ? 'left' : alone && fx > 0.78 ? 'right' : fy < 0.5 ? 'before' : 'after';
      break;
    }
    mark();
  };
  const noScroll = (ev) => { if (mode === 'drag' && ev.cancelable) ev.preventDefault(); };
  const place = (dx, dy) => { blk.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; };
  let edge = 0;
  const cleanup = () => {
    clearTimeout(tm); clearInterval(edge);
    blk.removeEventListener('pointermove', move); blk.removeEventListener('pointerup', up); blk.removeEventListener('pointercancel', up);
    document.removeEventListener('touchmove', noScroll);
    try { blk.releasePointerCapture(pid); } catch { /* уже */ }
  };
  const move = (ev) => {
    if (ev.pointerId !== pid) return;
    const dx = ev.clientX - x0, dy = ev.clientY - y0; lastX = ev.clientX; lastY = ev.clientY;
    if (!mode) {
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.4) { mode = 'swipe'; clearTimeout(tm); blk.classList.add('lysw'); try { blk.setPointerCapture(pid); } catch { /* */ } }
      else if (Math.hypot(dx, dy) > 10) clearTimeout(tm); // это прокрутка
      else return;
    }
    if (mode === 'swipe') { place(dx, 0); blk.style.opacity = String(Math.max(0.25, 1 - Math.abs(dx) / (blk.offsetWidth || 1))); }
    else if (mode === 'drag') { place(dx, dy + (root.scrollTop - st0)); pick(ev.clientX, ev.clientY); }
  };
  const up = (ev) => {
    if (ev.pointerId !== pid) return;
    const dx = ev.clientX - x0, was = mode;
    cleanup(); blk.style.transform = ''; blk.style.opacity = ''; blk.classList.remove('lysw', 'lydrag');
    if (ev.type === 'pointercancel') { mark(); if (was === 'drag') api.render(); return; }
    if (was === 'swipe') {
      if (Math.abs(dx) > (blk.offsetWidth || 1) * 0.33) {
        const vis = orderOf(lay, api.ids).filter((i) => !lay.hidden.includes(i));
        if (vis.length > 1) { lay.hidden = [...lay.hidden, id]; done(); return; }
        toast(api.t('lay.lastOne'));
      }
    } else if (was === 'drag') {
      const t = tgt, w = pos; tgt = null; pos = ''; mark();
      if (t && w) {
        const on = [...root.querySelectorAll('.lyb[data-lb]')].map((b) => b.dataset.lb);
        if (moveTo(lay, orderOf(lay, api.ids).filter((i) => on.includes(i) || lay.hidden.includes(i)), id, t.dataset.lb, w)) { done(); return; }
      }
      api.render();
    }
  };
  blk.addEventListener('pointermove', move); blk.addEventListener('pointerup', up); blk.addEventListener('pointercancel', up);
  tm = setTimeout(() => {
    if (mode) return;
    mode = 'drag'; buzz(); blk.classList.add('lydrag'); try { blk.setPointerCapture(pid); } catch { /* */ }
    document.addEventListener('touchmove', noScroll, { passive: false });
    // у края окна список сам прокручивается
    edge = setInterval(() => { const r = root.getBoundingClientRect(), d = lastY < r.top + 70 ? -14 : lastY > r.bottom - 70 ? 14 : 0; if (d) { root.scrollTop += d; place(lastX - x0, lastY - y0 + (root.scrollTop - st0)); pick(lastX, lastY); } }, 30);
  }, 320);
}

// Правка экрана. root — корень экрана (на нём слушаются события); apiOrFn → { lay, ids, name(id), save(), render(), t, busy?(), live?(id, z, blk) — размер тянется, defaults?(lay) — вид «как было» }.
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
    if (!b || !root.contains(b)) { if (e.target.closest && e.target.closest('.lyb.ed')) { e.preventDefault(); e.stopPropagation(); } return; } // инструмент в правке не нажимается
    if (b.dataset.ly === 'grip' || b.dataset.ly === 'width') { e.preventDefault(); e.stopPropagation(); return; }
    e.preventDefault(); e.stopPropagation();
    const k = b.dataset.ly, id = b.dataset.id;
    const done = () => { api.save(); api.render(); };
    if (k === 'done') { leave(api, lay); return; }
    if (k === 'reset') { lay.order = []; lay.hidden = []; lay.size = {}; lay.pair = {}; if (api.defaults) api.defaults(lay); done(); return; }
    if (k === 'show') { lay.hidden = lay.hidden.filter((i) => i !== id); done(); }
  }, true);
  // размер — тянуть планку внизу блока; блок следует за пальцем (высота подгоняется несколькими шагами), значение сохраняется на отпускании
  root.addEventListener('pointerdown', (e) => {
    const api = A(), lay = normLay(api.lay);
    if (!EDIT.has(lay) || e.button > 0) return;
    const w = e.target.closest && e.target.closest('.lyv');
    if (w && root.contains(w)) { dragWidth(e, w, api, lay); return; }
    const g = e.target.closest && e.target.closest('.lyh');
    if (!g || !root.contains(g)) { const blk = e.target.closest && e.target.closest('.lyb.ed'); if (blk && root.contains(blk)) { e.stopPropagation(); blockGesture(e, blk, api, lay); } return; } // ничего из экрана не звучит и не нажимается
    e.preventDefault(); e.stopPropagation();
    const blk = g.closest('.lyb'), inner = blk.querySelector(':scope > .lyi'), id = blk.dataset.lb;
    // граница между блоками, как разделитель окон (слово автора 26.11.2026): тянем вниз — этот блок растёт, следующий под ним сужается на столько же,
    // тянем вверх — наоборот; у последнего блока граница двигает только его
    const all = [...root.querySelectorAll('.lyb.ed')], bi = all.indexOf(blk);
    let nb = all[bi + 1]; if (nb && nb.parentElement === blk.parentElement && blk.parentElement.classList.contains('lyrow')) nb = all[bi + 2];
    const ninner = nb && nb.querySelector(':scope > .lyi'), nid = nb && nb.dataset.lb;
    const h0 = inner.getBoundingClientRect().height, hn0 = ninner ? ninner.getBoundingClientRect().height : 0, y0 = e.clientY;
    let s = scaleOf(lay, id), sn = nid ? scaleOf(lay, nid) : 1;
    try { g.setPointerCapture(e.pointerId); } catch { /* без захвата — события идут по окну */ }
    const move = (ev) => {
      let dy = ev.clientY - y0;
      if (ninner) dy = Math.max(-(h0 - 40), Math.min(hn0 - 40, dy)); // ни один блок не уже 40 px
      const want = Math.max(40, h0 + dy), cur = inner.getBoundingClientRect().height || h0;
      s = clampScale(s * Math.pow(want / cur, 1.4)); // высота растёт не пропорционально размеру — подгоняем по факту
      blk.style.setProperty('--lz', s); blk.dataset.z = tierOf(s); if (api.live) api.live(id, s, blk);
      if (ninner) {
        const wantN = Math.max(40, hn0 - dy), curN = ninner.getBoundingClientRect().height || hn0;
        sn = clampScale(sn * Math.pow(wantN / curN, 1.4));
        nb.style.setProperty('--lz', sn); nb.dataset.z = tierOf(sn); if (api.live) api.live(nid, sn, nb);
      }
    };
    const end = () => {
      g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', end); g.removeEventListener('pointercancel', end);
      if (Math.abs(s - 1) < 0.03) delete lay.size[id]; else lay.size[id] = s;
      if (nid) { if (Math.abs(sn - 1) < 0.03) delete lay.size[nid]; else lay.size[nid] = sn; }
      api.save(); api.render();
    };
    g.addEventListener('pointermove', move); g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
  }, true);
}
