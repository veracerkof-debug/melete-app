// Расписание занятий на странице «Неделя» — по образцу Google Календаря (слово автора 11.11.2026): сверху полоса дней
// недели (касание — день, ‹ › — неделя), ниже — выбранный день по часам. Касание пустого места — новое занятие на час;
// удержание и ведение — занятие нужной длины; удержание блока и ведение — сдвинуть; нижний край — длина; касание
// блока — подробности (название, от–до, повтор по дням, «только этот день», удалить). Смахивание по дню — соседний
// день. Повторяющееся занятие, сдвинутое в одном дне, — вопрос «только этот день или все». Ниже — сумма недели и
// перерывы по датам. Логика — src/core/schedule.js.
import { t, getLang } from '../../i18n/index.js';
import { routinesOf } from '../routine.js';
import { routineOptions } from './routine.js';
import { esc, sheet, snav, toast } from '../../ui/index.js';
import { weekday } from '../time.js';
import { weekdays } from './common.js';
import { fmtDur } from '../format.js';
import { planOf, savePlan, slotsOn, offOn, addSlot, editSlot, removeSlot, resetDay, addOff, removeOff, prune, weekMin, minOf, hmOf, snap, dateKey, durOf, STEP } from '../schedule.js';

const DAY = 86400000, PX = 52; // пикселей на час
const mid = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const addDays = (d, n) => mid(d + n * DAY + 3 * 3600000); // через переход на летнее время
let sel = mid(Date.now()), scrollY = null;
const loc = () => (getLang() === 'uz' ? 'uz-Latn' : getLang());
const dayTitle = (d) => { const s = new Date(d).toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); };
const dShort = (d) => new Date(d).toLocaleDateString(loc(), { day: 'numeric', month: 'short' });

export function planHTML(app) {
  const st = app.store.state.settings, p = planOf(st), WD = weekdays(), today = mid(Date.now());
  const w0 = addDays(sel, -weekday(sel)), off = offOn(p, sel), once = !!p.once[dateKey(sel)];
  const strip = '<div class="pstrip" role="tablist" aria-label="' + esc(t('plan.days')) + '"><button class="ic sm plain pwk" data-pl="prev" aria-label="' + esc(t('plan.prevWeek')) + '">‹</button>' +
    WD.map((n, i) => { const d = addDays(w0, i), has = slotsOn(p, d).length; return '<button class="pday' + (d === sel ? ' on' : '') + (d === today ? ' today' : '') + (offOn(p, d) ? ' off' : '') + '" role="tab" aria-selected="' + (d === sel) + '" data-pd="' + d + '"><small>' + esc(n) + '</small><b class="num">' + new Date(d).getDate() + '</b><i class="' + (has ? 'dot' : '') + '"></i></button>'; }).join('') +
    '<button class="ic sm plain pwk" data-pl="next" aria-label="' + esc(t('plan.nextWeek')) + '">›</button></div>';
  const head = '<div class="phead"><b>' + esc(dayTitle(sel)) + '</b>' + (sel !== today ? '<button class="link" data-pl="today">' + t('plan.today') + '</button>' : '') + '</div>' +
    (off ? '<div class="pnote off">' + esc(t('plan.offOn', { title: off.title || t('plan.break') })) + '</div>' : '') +
    (once ? '<div class="pnote">' + t('plan.onceOn') + ' <button class="link" data-pl="reset">' + t('plan.reset') + '</button></div>' : '');
  const hours = Array.from({ length: 24 }, (_, h) => '<i class="phr" style="top:' + h * PX + 'px"><span class="num">' + String(h).padStart(2, '0') + ':00</span></i>').join('');
  const blocks = slotsOn(p, sel).map((s) => '<div class="pblk' + (s.once ? ' once' : '') + '" data-ps="' + esc(s.id) + '" style="top:' + (minOf(s.from) / 60) * PX + 'px;height:' + Math.max(18, (durOf(s) / 60) * PX) + 'px" role="button" tabindex="0" aria-label="' + esc((s.title || t('plan.practice')) + ', ' + s.from + '–' + s.to) + '">' +
    '<b>' + esc(s.title || t('plan.practice')) + '</b><span class="num">' + s.from + '–' + s.to + '</span><i class="pgrip" data-pgrip="' + esc(s.id) + '" aria-hidden="true"></i></div>').join('');
  const now = sel === today ? '<i class="pnow" style="top:' + ((Date.now() - today) / 3600000) * PX + 'px"></i>' : '';
  const mins = weekMin(p), days = new Set(p.slots.flatMap((s) => s.days)).size;
  return '<div class="hdr">' + t('plan.title') + '</div><div class="plan">' + strip + head +
    '<div class="pscroll" data-noswipe><div class="pgrid' + (off ? ' isoff' : '') + '" style="height:' + 24 * PX + 'px">' + hours + now + blocks + '</div></div>' +
    '<p class="ftr">' + t('plan.hint') + '</p></div>' +
    '<div class="group"><div class="cell"><span class="grow">' + t('plan.week') + '</span><span class="val num">' + (mins ? fmtDur(mins * 60) + ' · ' + t('plan.nDays', { n: days }) : t('plan.empty')) + '</span></div></div>' +
    '<p class="ftr">' + t('plan.weekHint') + '</p>' +
    '<div class="hdr">' + t('plan.breaks') + '</div><div class="group">' + p.off.map((o) => '<div class="cell"><span class="grow"><span>' + esc(o.title || t('plan.break')) + '</span><span class="st l2" style="display:block;font-size:13px">' +
      esc(o.from === o.to ? dShort(new Date(o.from + 'T12:00').getTime()) : dShort(new Date(o.from + 'T12:00').getTime()) + ' — ' + dShort(new Date(o.to + 'T12:00').getTime())) + '</span></span><button class="ic sm plain" data-poff="' + esc(o.id) + '" aria-label="' + esc(t('plan.delBreak')) + '">×</button></div>').join('') +
    '<button class="cell act" data-pl="addoff">' + t('plan.addBreak') + '</button></div><p class="ftr">' + t('plan.breaksHint') + '</p>';
}

// После отрисовки: прокрутка дня — к прежнему месту или к первому занятию (иначе к 7:00)
export function mountPlan(root, app) {
  const sc = root.querySelector('.pscroll');
  if (!sc) return;
  if (scrollY == null) { const s = slotsOn(planOf(app.store.state.settings), sel)[0]; scrollY = Math.max(0, ((s ? minOf(s.from) - 60 : 7 * 60) / 60) * PX); }
  sc.scrollTop = scrollY;
  sc.addEventListener('scroll', () => { scrollY = sc.scrollTop; }, { passive: true });
}

function commit(app, p, done) { prune(p); savePlan(app.store.state.settings, p); done(); }

// Только этот день или все повторы — для повторяющегося блока
function askScope(d, cb) {
  const api = sheet(() => snav(t('plan.scope')) + '<div class="group"><button class="cell act" data-sc="day">' + esc(t('plan.onlyDay', { d: dShort(d) })) + '</button><button class="cell act" data-sc="all">' + t('plan.allDays') + '</button></div>',
    (el) => el.addEventListener('click', (e) => { const b = e.target.closest('[data-sc]'); if (b) { api.close(); cb(b.dataset.sc); } }), { onClose: () => cb(null) });
}

// Подробности занятия: новое (slot без id) или существующее
function slotSheet(app, slot, done) {
  const p = planOf(app.store.state.settings), isNew = !slot.id, WD = weekdays(), d = sel;
  const regular = isNew ? true : !slot.once;
  const days = new Set(isNew ? [weekday(d)] : regular ? (p.slots.find((s) => s.id === slot.id) || { days: [weekday(d)] }).days : []);
  let onlyDay = !isNew && slot.once;
  const api = sheet(() => snav(t(isNew ? 'plan.new' : 'plan.edit'), { left: '<button class="link l" data-close>' + t('ui.cancel') + '</button>', right: '<button class="link b r" data-psave>' + t('ui.save') + '</button>' }) +
    '<div class="group"><label class="cell"><input class="inp grow" data-pt placeholder="' + esc(t('plan.titlePh')) + '" value="' + esc(slot.title || '') + '" maxlength="60" style="border:0;background:none;font-size:17px"></label>' +
    '<div class="cell ptimes"><input type="time" class="inp num" data-pfrom value="' + esc(slot.from) + '" step="900" aria-label="' + esc(t('plan.from')) + '"><span class="l2">—</span><input type="time" class="inp num" data-pto value="' + esc(slot.to) + '" step="900" aria-label="' + esc(t('plan.to')) + '"></div>' +
    '<div class="cellcol"><span class="l2" style="font-size:13px">' + t('plan.repeat') + '</span><div class="gfdays" style="margin-top:8px">' + WD.map((n, i) => '<button type="button" class="gfday' + (days.has(i) && !onlyDay ? ' on' : '') + '" data-pdw="' + i + '" aria-pressed="' + (days.has(i) && !onlyDay) + '">' + esc(String(n).slice(0, 2)) + '</button>').join('') + '</div>' +
    '<label class="pchk"><input type="checkbox" data-ponly' + (onlyDay ? ' checked' : '') + '> ' + esc(t('plan.onlyThis', { d: dShort(d) })) + '</label></div>' +
    (routinesOf(app.store.state.settings).length ? '<label class="cell"><span class="grow">' + t('rt.title1') + '</span><select class="sortsel" data-proutine aria-label="' + esc(t('rt.title1')) + '">' + routineOptions(app.store.state.settings, slot.routine) + '</select></label>' : '') + '</div>' +
    (isNew ? '' : '<div class="group" style="margin-top:16px"><button class="cell danger center" data-pdel>' + t('plan.delete') + '</button></div>'),
  (el) => {
    el.addEventListener('click', (e) => {
      const w = e.target.closest('[data-pdw]');
      if (w) { const i = +w.dataset.pdw; if (days.has(i)) days.delete(i); else days.add(i); w.classList.toggle('on', days.has(i)); w.setAttribute('aria-pressed', days.has(i)); el.querySelector('[data-ponly]').checked = false; onlyDay = false; return; }
      if (e.target.closest('[data-psave]')) {
        const from = el.querySelector('[data-pfrom]').value, to = el.querySelector('[data-pto]').value, title = el.querySelector('[data-pt]').value.trim();
        const routine = (el.querySelector('[data-proutine]') || {}).value || undefined;
        if (!from || !to || minOf(to) <= minOf(from)) { toast(t('plan.badTime')); return; }
        const q = planOf(app.store.state.settings);
        if (isNew) { if (onlyDay || !days.size) addSlot(q, { from, to, title, routine }, { d, once: true }); else addSlot(q, { from, to, title, routine, days: [...days] }); api.close(); commit(app, q, done); return; }
        const apply = (mode) => { if (!mode) return; editSlot(q, slot.id, { from, to, title, routine, ...(mode === 'all' ? { days: [...days] } : {}) }, { d, mode }); api.close(); commit(app, q, done); };
        if (onlyDay && !slot.once) apply('day'); else if (slot.once) apply('day'); else apply('all');
        return;
      }
      if (e.target.closest('[data-pdel]')) {
        const q = planOf(app.store.state.settings);
        const go = (mode) => { if (!mode) return; removeSlot(q, slot.id, { d, mode }); api.close(); commit(app, q, done); };
        if (slot.once) go('day'); else askScope(d, go);
      }
    });
    el.addEventListener('change', (e) => { if (e.target.matches('[data-ponly]')) onlyDay = e.target.checked; });
  });
}

function offSheet(app, done) {
  const k = dateKey(sel);
  const api = sheet(() => snav(t('plan.addBreak'), { left: '<button class="link l" data-close>' + t('ui.cancel') + '</button>', right: '<button class="link b r" data-osave>' + t('ui.save') + '</button>' }) +
    '<div class="group"><label class="cell"><input class="inp grow" data-ot placeholder="' + esc(t('plan.breakPh')) + '" maxlength="60" style="border:0;background:none;font-size:17px"></label>' +
    '<label class="cell"><span class="grow">' + t('plan.from') + '</span><input type="date" class="inp" data-of value="' + k + '"></label><label class="cell"><span class="grow">' + t('plan.to') + '</span><input type="date" class="inp" data-oto value="' + k + '"></label></div>' +
    '<p class="ftr">' + t('plan.breaksHint') + '</p>', (el) => el.addEventListener('click', (e) => {
    if (!e.target.closest('[data-osave]')) return;
    const q = planOf(app.store.state.settings);
    addOff(q, el.querySelector('[data-of]').value, el.querySelector('[data-oto]').value, el.querySelector('[data-ot]').value.trim());
    api.close(); commit(app, q, done);
  }));
}

// Обработчики страницы; done() — сохранить настройки и перерисовать
export function bindPlan(el, app, done) {
  const go = (d) => { sel = mid(d); scrollY = null; done(false); };
  el.addEventListener('click', (e) => {
    if (drag.used) return;
    const g = (s) => e.target.closest(s);
    let b;
    if ((b = g('[data-pd]'))) { go(+b.dataset.pd); return; }
    if ((b = g('[data-pl]'))) {
      const k = b.dataset.pl, p = planOf(app.store.state.settings);
      if (k === 'prev') go(addDays(sel, -7)); else if (k === 'next') go(addDays(sel, 7)); else if (k === 'today') go(Date.now());
      else if (k === 'reset') commit(app, resetDay(p, sel), () => done(true));
      else if (k === 'addoff') offSheet(app, () => done(true));
      return;
    }
    if ((b = g('[data-poff]'))) { commit(app, removeOff(planOf(app.store.state.settings), b.dataset.poff), () => done(true)); return; }
    if ((b = g('[data-ps]'))) { const s = slotsOn(planOf(app.store.state.settings), sel).find((x) => x.id === b.dataset.ps); if (s) slotSheet(app, s, () => done(true)); return; }
  });

  // Жесты по сетке дня. Палец по пустому: короткое касание — занятие на час; удержание и ведение — своё от–до.
  // По блоку: удержание и ведение — сдвиг; нижний край — длина. Вбок — соседний день. Прокрутка дня — как обычно.
  const drag = { used: false };
  let g0 = null, holdT = 0;
  const yMin = (grid, y) => Math.max(0, Math.min(24 * 60 - STEP, ((y - grid.getBoundingClientRect().top) / PX) * 60));
  el.addEventListener('pointerdown', (e) => {
    const grid = e.target.closest('.pgrid');
    if (!grid || e.button > 0) return;
    const blk = e.target.closest('[data-ps]'), grip = e.target.closest('[data-pgrip]');
    g0 = { x: e.clientX, y: e.clientY, grid, blk, grip, mode: grip ? 'resize' : null, t: performance.now(), id: e.pointerId };
    drag.used = false;
    clearTimeout(holdT);
    if (!grip) holdT = setTimeout(() => { if (g0 && !g0.moved) { g0.mode = g0.blk ? 'move' : 'make'; if (navigator.vibrate) navigator.vibrate(12); start(); } }, 380);
    else start();
  });
  let ghost = null, s0 = null;
  function start() {
    const p = planOf(app.store.state.settings);
    if (g0.mode === 'make') {
      const a = Math.floor(yMin(g0.grid, g0.y) / STEP) * STEP;
      s0 = { from: a, to: a + 60 };
      ghost = document.createElement('div'); ghost.className = 'pblk ghost'; g0.grid.appendChild(ghost);
    } else {
      const s = slotsOn(p, sel).find((x) => x.id === g0.blk.dataset.ps);
      if (!s) { g0 = null; return; }
      s0 = { from: minOf(s.from), to: minOf(s.to), slot: s, y: g0.y };
      ghost = g0.blk; ghost.classList.add('drag');
    }
    paint();
  }
  function paint() {
    if (!ghost) return;
    ghost.style.top = (s0.from / 60) * PX + 'px';
    ghost.style.height = Math.max(18, ((s0.to - s0.from) / 60) * PX) + 'px';
    const tm = hmOf(s0.from) + '–' + hmOf(s0.to), sp = ghost.querySelector('.num');
    if (sp) sp.textContent = tm; else ghost.textContent = tm;
  }
  // во время ведения страница не прокручивается
  el.addEventListener('touchmove', (e) => { if (g0 && g0.mode) e.preventDefault(); }, { passive: false });
  el.addEventListener('pointermove', (e) => {
    if (!g0 || e.pointerId !== g0.id) return;
    const dx = e.clientX - g0.x, dy = e.clientY - g0.y;
    if (!g0.mode) { if (Math.abs(dx) > 8 || Math.abs(dy) > 8) { g0.moved = true; clearTimeout(holdT); } return; }
    drag.used = true;
    const m = yMin(g0.grid, e.clientY);
    if (g0.mode === 'make') { const a = Math.floor(yMin(g0.grid, g0.y) / STEP) * STEP; s0.from = Math.min(a, snap(m)); s0.to = Math.max(a + STEP, snap(m)); }
    else if (g0.mode === 'move') { const len = s0.slot ? durOf(s0.slot) : 60, nf = Math.max(0, Math.min(24 * 60 - len, snap(minOf(s0.slot.from) + ((e.clientY - s0.y) / PX) * 60))); s0.from = nf; s0.to = nf + len; }
    else if (g0.mode === 'resize') s0.to = Math.max(s0.from + STEP, Math.min(24 * 60, snap(m)));
    paint();
  });
  const finish = (e) => {
    clearTimeout(holdT);
    const g = g0; g0 = null;
    if (!g) return;
    const dt = performance.now() - g.t, dx = e ? e.clientX - g.x : 0, dy = e ? e.clientY - g.y : 0;
    if (!g.mode) {
      // вбок — соседний день; короткое касание пустого — новое занятие на час
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) { drag.used = true; go(addDays(sel, dx < 0 ? 1 : -1)); setTimeout(() => { drag.used = false; }, 50); return; }
      if (!g.blk && !g.moved && dt < 380 && e && e.type === 'pointerup') { const a = Math.floor(yMin(g.grid, g.y) / 30) * 30; /* как в календаре: начало получаса под пальцем */ drag.used = true; slotSheet(app, { from: hmOf(a), to: hmOf(Math.min(a + 60, 24 * 60 - STEP)), title: '' }, () => done(true)); setTimeout(() => { drag.used = false; }, 50); }
      return;
    }
    const sl = s0, gh = ghost; ghost = null; s0 = null;
    setTimeout(() => { drag.used = false; }, 50);
    if (!e || e.type === 'pointercancel') { done(false); return; }
    if (g.mode === 'make') { if (gh) gh.remove(); slotSheet(app, { from: hmOf(sl.from), to: hmOf(sl.to), title: '' }, () => done(true)); return; }
    const p = planOf(app.store.state.settings), patch = { from: hmOf(sl.from), to: hmOf(sl.to) };
    if (patch.from === sl.slot.from && patch.to === sl.slot.to) { done(false); return; }
    const apply = (mode) => { if (!mode) { done(false); return; } commit(app, editSlot(p, sl.slot.id, patch, { d: sel, mode }), () => done(true)); };
    if (sl.slot.once) apply('day'); else askScope(sel, apply);
  };
  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', finish);
}

// Строка для «Уведомлений»: «Пн, Ср, Пт 19:00–20:00 · Сб 10:00–11:00»
export function planSummary(st) {
  const p = planOf(st), WD = weekdays();
  if (!p.slots.length) return '';
  return p.slots.slice().sort((a, b) => a.days[0] - b.days[0] || minOf(a.from) - minOf(b.from)).map((s) => (s.days.length === 7 ? t('rem.everyDay') : s.days.map((i) => WD[i]).join(', ')) + ' ' + s.from + '–' + s.to).join(' · ');
}
