// Экран сессии: заголовок (свернуть, время и пауза, помодоро, завершить), рабочее пространство из окон
// с модулями, нижняя панель инструментов, жесты (перетащить инструмент на окно, поменять окна, двигать границы),
// завершение сессии, вопрос «Ты ещё играешь?», экран не гаснет.
// Перенесено из legacy/practice.html (startSession, openSession, sessionClick, renderWS, classify, paneMenu, layoutSheet,
// жесты DRG, finish, checkIdle, pchipHTML, pomoPanel, rotCheck).
import '../../ui/session.css';
import { STUDY_IDS } from '../study.js';
import { t } from '../../i18n/index.js';
import { esc, icb, sheet, snav, toast, leave, icons } from '../../ui/index.js';
import { isDesk } from '../../ui/desk.js';
import { fmtDur, fmtClock } from '../format.js';
import { getPct, ensureLib } from '../library.js';
import { isOn } from '../settings.js';
import {
  createActive, isSameActive, elapsed, togglePause, touch, summarize, buildRecord, lastNext, breakDue, breakMin, BREAK_LATER, BREAK_LEN,
  metroForSession, commitSession, saveActive, FREE_TAGS, trackMode,
} from '../session.js';
import {
  getWS, fixWS, settle, tooSmall, fits, lsizes, lpos, halves, setLayout, closePane, swapHalves, assign, swapPanes, dropTool, addPane, sizeOf, clampFrac, visible,
  fitOf,
} from '../workspace.js';
import { modules, moduleById } from '../../modules/index.js';
import { mountModule, moduleName } from '../modules.js';
import { mInput, bindM, STAGE_IC } from './common.js';
import { freeTagName } from './panel.js';
import { clockNotice } from './clock.js';
import { coreHelp } from '../help.js';
import { bareScope } from '../../i18n/index.js';
import { pureEnter, pureLeave } from '../pure.js';
import { dragSort, holdMenu, onHold } from '../../ui/hold.js';
import { spread, swipe, NOSPREAD } from '../../ui/gestures.js';
import { routinesOf, routineById, startRun, itemLeft, goTo, runRecord, slotRoutine } from '../routine.js';
import { pickRoutine } from './routine.js';

const IC = {
  down: '<svg viewBox="0 0 24 24"><path d="M6 9.5l6 6 6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  // во весь экран и обратно — видимая кнопка окна (автор 29.10.2026: «нет этой кнопки»; двойное касание полоски осталось)
  full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  unfull: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
  pomo: '<svg viewBox="0 0 24 24" class="pcico"><circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M10 3h4"/></svg>',
};

/* ---------- группы окон ---------- */

const inSession = (st, m) => m.session !== false && !m.tab && isOn(st, m.id); // Библия — только своя вкладка
const groupOf = (m) => m.group || m.id;
// Порядок значков нижней панели: свой у песни (song.dock), иначе — из настроек (settings.dockOrder), иначе DOCK_DEF;
// кого нет в списке — правее, по порядку модулей. Меняется удержанием значка на панели (перетащить)
// шина микшера → инструмент, который через неё звучит
const SOUND_BUS = [['metro', 'metro'], ['drone', 'drone'], ['media', 'audio'], ['looper', 'looper'], ['notes', 'notes'], ['theory', 'theory'], ['piano', 'piano'], ['glider', 'glider']];
export const DOCK_DEF = ['metro', 'notes', 'drone', 'voice', 'tuner', 'audio', 'theory'];
export const dockBase = (st, song) => (song && Array.isArray(song.dock) && song.dock.length ? song.dock : Array.isArray(st.dockOrder) && st.dockOrder.length ? st.dockOrder : DOCK_DEF);

// Окна сессии в порядке панели
export function sessionGroups(st, song = null) {
  const out = [], base = dockBase(st, song), rank = (g) => { const i = base.indexOf(g); return i < 0 ? base.length : i; };
  modules.forEach((m) => { if (inSession(st, m) && !out.includes(groupOf(m))) out.push(groupOf(m)); });
  out.sort((a, b) => rank(a) - rank(b));
  return out.length ? out : ['metro'];
}
// Значки нижней панели: без «внутренних» модулей (спектр открывается из диктофона)
export const dockGroups = (st, song = null) => sessionGroups(st, song).filter((g) => !(moduleById(g) || {}).inner);

// Модули группы (окно старой «сессии с инструментом» — сам модуль)
function members(st, g) {
  const list = modules.filter((m) => !m.tab && groupOf(m) === g && inSession(st, m));
  if (list.length) return list;
  const m = moduleById(g);
  return m ? [m] : [];
}

const groupName = (st, g) => {
  const all = modules.filter((m) => !m.tab && groupOf(m) === g);
  return all.length > 1 ? t('group.' + g) : all.length ? moduleName(all[0]) : moduleById(g) ? moduleName(moduleById(g)) : g;
};
// Подпись на переключателе группы: «Пэды», а не «Дрон» (как в прототипе)
const subName = (m) => { const k = 'sub.' + m.id, v = t(k); return v === k ? moduleName(m) : v; };
const groupIcon = (g) => (modules.find((m) => groupOf(m) === g) || moduleById(g) || {}).icon || '';

// Какой модуль группы показать в окне размера size (пианино в четверти и полосе уступает пэдам — как в прототипе)
function pickModule(st, w, g, size) {
  const list = members(st, g);
  let m = list.find((x) => x.id === w.sub?.[g]) || list[0];
  if (m && m.groupSizes && !m.groupSizes.includes(size)) m = list.find((x) => !x.groupSizes || x.groupSizes.includes(size)) || m;
  return m;
}

/* ---------- сессия ---------- */

export function createSessionScreen(app) {
  const { store, device, audio } = app;
  const st = () => store.state.settings;
  let layer = null, wsEl = null, panes = [], w = null, tickT = 0, ro = null, wake = null, prevOpenTool = null;
  let DRG = null, dragSup = false, pureI = -1, gripTap = null;

  const song = () => (app.active && app.active.songId ? store.songById(app.active.songId) : null);
  const titleOf = (a) => (a.songId && song() ? song().title : a.type === 'tool' ? (moduleById(a.tool) ? moduleName(moduleById(a.tool)) : a.tool) : t('ses.free'));

  /* ---------- экран не гаснет ---------- */
  async function lockWake() { try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch { /* нет поддержки */ } }
  function releaseWake() { try { if (wake) wake.release(); } catch { /* ignore */ } wake = null; }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && app.active && !wake) lockWake(); });
  addEventListener('melete:modloaded', () => rotCheck()); // модуль окна догрузился (src/modules/index.js) — поворот мог появиться

  /* ---------- старт ---------- */
  function start(type, songId = null, tool = null, opts = {}) {
    const a = app.active;
    if (a) {
      if (!isSameActive(a, type, songId, tool)) toast(t('ses.finishFirst'));
      open();
      return;
    }
    // свободное занятие при планах — «Свободно» или план (план из расписания на это время — первым)
    if (type === 'free' && opts.routine === undefined && !st().toolsOnly && routinesOf(st()).length) {
      pickRoutine(app, (id) => start(type, songId, tool, { routine: id || null }));
      return;
    }
    const s = songId ? store.songById(songId) : null;
    if (app.clock && app.clock.bad) clockNotice(app); // занятие при сбитых часах не подтвердится — предупредить
    app.active = createActive({ type, songId, tool, mode: trackMode(st()) });
    const rt = opts.routine && type === 'free' ? routineById(st(), opts.routine) : null;
    if (rt) app.active.routine = startRun(rt, 0);
    audio.metro.cfg = metroForSession(s, st().metro);
    lockWake();
    open();
    if (rt) applyItem();
    lastBanner();
  }

  /* ---------- план занятия (routine.js): полоса пунктов ---------- */
  let planSwiped = 0;
  // Пункт начался: его темп — метроному, его инструмент — в окно
  function applyItem() {
    const run = app.active && app.active.routine;
    if (!run) return;
    const it = run.items[run.i], sg = it.songId ? store.songById(it.songId) : null, bpm = it.bpm || (sg && (sg.currentBpm || sg.targetBpm)) || 0;
    if (bpm) audio.metro.setBpm(bpm);
    if (it.tool && moduleById(it.tool)) openTool(it.tool);
    planTick(true);
  }
  function planStep(j) {
    const a = app.active, run = a && a.routine;
    if (!run || !goTo(run, elapsed(a), j)) return;
    run.due = false;
    saveActive(a);
    applyItem();
  }
  function planTick(force = false) {
    const a = app.active, run = a && a.routine, bar = layer && layer.querySelector('#splan');
    if (!run || !bar) return;
    const it = run.items[run.i], left = itemLeft(run, elapsed(a)), due = left <= 0, last = run.i === run.items.length - 1;
    if (due && !run.due) { run.due = true; try { navigator.vibrate && navigator.vibrate(60); } catch { /* нет вибрации */ } }
    const sg = it.songId ? store.songById(it.songId) : null;
    const h = '<span class="spn num">' + (run.i + 1) + '/' + run.items.length + '</span><span class="spt">' + esc(it.title || (sg ? sg.title : '')) + '</span>' +
      '<span class="spl num">' + (due ? t(last ? 'rt.doneAll' : 'rt.timeUp') : fmtClock(Math.ceil(left))) + '</span>' +
      (last ? '' : '<button class="spnext" data-s="pnext" aria-label="' + esc(t('rt.next')) + '">›</button>') +
      '<i class="spbar" style="width:' + Math.min(100, Math.max(0, 100 * (1 - left / (it.min * 60)))) + '%"></i>';
    bar.classList.toggle('due', due);
    if (force || bar.dataset.h !== h) { bar.dataset.h = h; bar.innerHTML = h; }
  }
  function planSheet() {
    const a = app.active, run = a && a.routine;
    if (!run) return;
    const api = sheet(() => snav(run.title || t('rt.untitled')) + '<div class="group">' + run.items.map((x, i) => '<button class="cell' + (i === run.i ? ' on' : '') + '" data-pj="' + i + '"><span class="rtn num">' + (i + 1) + '</span><span class="grow">' + esc(x.title) + '</span><span class="l2 num">' + x.min + ' ' + t('rt.minShort') + '</span></button>').join('') + '</div>' +
      '<div class="group" style="margin-top:12px"><button class="cell danger center" data-pstop>' + t('rt.stop') + '</button></div>',
    (el) => el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pj]');
      if (b) { api.close(); planStep(+b.dataset.pj); return; }
      if (e.target.closest('[data-pstop]')) { api.close(); a.planDone = runRecord(run, elapsed(a)); delete a.routine; saveActive(a); const bar = layer && layer.querySelector('#splan'); if (bar) bar.remove(); }
    }));
  }
  // «В прошлый раз: …» — что человек сам себе оставил на это занятие; поверх края окна, касание или 15 с — прячется
  function lastBanner() {
    const L = lastNext(store.sessions(), app.active), sin = layer && layer.querySelector('.sin');
    if (!L || !sin) return;
    const b = document.createElement('button');
    b.className = 'slast';
    b.innerHTML = '<b>' + esc(t('ses.lastTime')) + '</b> ' + esc(L.next);
    b.setAttribute('aria-label', t('ses.lastTime') + ' ' + L.next);
    const off = () => { b.classList.add('out'); setTimeout(() => b.remove(), 250); };
    b.addEventListener('click', (e) => { e.stopPropagation(); off(); });
    sin.appendChild(b);
    setTimeout(off, 15000);
  }

  // После перезагрузки страницы: метроном песни и открытый экран сессии
  function resume() {
    if (!app.active) return;
    audio.metro.cfg = metroForSession(song(), st().metro);
    lockWake();
    open();
  }

  /* ---------- экран ---------- */
  function open() { return bareScope(() => openNow()); }
  function openNow() {
    if (!app.active) return;
    if (layer) return;
    const a = app.active, tm = a.type === 'tool', hide = st().showClock === false || !!st().toolsOnly;
    w = fixWS(getWS(device, a, { desk: isDesk() }), sessionGroups(st(), song()), a, minOf);
    layer = document.createElement('div');
    layer.innerHTML = '<div class="session' + (tm ? ' toolmode' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(t('ses.aria')) + '"><div class="sin">' +
      '<div class="shd">' + icb('data-s="hide"', IC.down, t('ses.hide'), 'sm') +
      '<button class="stime' + (a.mode === 'strict' ? ' gold' : '') + '" data-s="pause" id="stime" aria-label="' + esc(t('ses.pause')) + '"' + (a.mode === 'strict' ? ' title="' + esc(t('track.strictTitle')) + '"' : '') + '><i class="sdot"></i>' + (hide ? '' : '<span id="clk" class="num">00:00</span>') + '</button>' +
      // помодоро (слово автора 06.11.2026): касание времени — пауза, удержание — помодоро; идущий помодоро виден кольцом рядом
      (tm || !isOn(st(), 'timer') ? '<span></span>' : '<button class="pchip" data-s="pomo" id="pchip" aria-label="' + esc(t('ses.pomo')) + '"' + (app.pomodoro.active() ? '' : ' hidden') + '>' + pchipHTML() + '</button>') +
      '<div class="stitle2">' + esc(titleOf(a)) + '</div>' + (tm ? '' : '<button class="sstage" data-s="stage" aria-label="' + esc(t('stage.btn')) + '">' + STAGE_IC + '<span>' + esc(t('stage.btn')) + '</span></button>') + icb('data-s="finish"', IC.check, t(st().toolsOnly ? 'ses.close' : 'ses.finish'), 'sm done') + '</div>' +
      (a.routine ? '<div class="splan" id="splan" role="button" tabindex="0" aria-label="' + esc(t('rt.bar')) + '"></div>' : '') +
      '<div class="ws"></div></div>' +
      (tm ? '' : '<div class="sdock"><div class="tbar" id="tpills" role="tablist" aria-label="' + esc(t('ses.tools')) + '">' +
        dockGroups(st(), song()).map((g) => '<button class="tb" data-pill="' + g + '" role="tab" aria-label="' + esc(groupName(st(), g)) + '" title="' + esc(groupName(st(), g)) + '">' + groupIcon(g) + '<span class="tl" aria-hidden="true">' + esc(groupName(st(), g)) + '</span></button>').join('') +
        '</div></div>') + '</div>';
    document.body.appendChild(layer);
    layer.pureExit = () => (pureI >= 0 ? (setPanePure(-1), true) : false);
    wsEl = layer.querySelector('.ws');
    const pb = layer.querySelector('#splan');
    if (pb) { // план: смахнуть влево — следующий пункт, вправо — прошлый; касание — список пунктов
      swipe(pb, { left: () => { planSwiped = Date.now(); planStep(); }, right: () => { planSwiped = Date.now(); const r = app.active && app.active.routine; if (r) planStep(r.i - 1); } });
      pb.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); planSheet(); } });
      planTick(true);
    }
    if (!tm) coreHelp(app, 'session'); // сессия с окнами (у инструмента вне сессии — своя инструкция)
    const ses = layer.querySelector('.session');
    ses.addEventListener('pointerdown', (e) => {
      calmWake();
      if (app.active) { touch(app.active); saveActive(app.active); }
      const p = e.target.closest('.ws .pane');
      if (p) setFocus(+p.dataset.pane);
    });
    ses.addEventListener('click', onClick);
    ses.addEventListener('keydown', calmWake);
    calmAt = Date.now();
    if (!tm && isOn(st(), 'timer')) onHold(ses, '#stime', () => pomoSheet());
    // два пальца (слово автора 06.11.2026): развести — окно во весь экран, свести — окна звучащих инструментов
    // (во весь экран — обратно); в пианино и глайдере не действует — там играют несколькими пальцами
    spread(wsEl, {
      ok: (e) => !e.target.closest(NOSPREAD),
      out: (e) => { const p = e.target.closest('.ws .pane'); if (p && pureI < 0) setPanePure(+p.dataset.pane); },
      inn: () => { if (pureI >= 0) setPanePure(-1); else soundingPanes(); },
    });
    // удержание значка на панели — перестановка: у песни — свой порядок, у свободного занятия — порядок по умолчанию
    dragSort(ses, '.sdock .tb[data-pill]', 'data-pill', {
      onStill: (b) => dockMenu(b),
      onDrop: (ids) => saveDock(ids),
    });
    prevOpenTool = app.openTool;
    app.openTool = openTool;
    renderWS();
    ro = new ResizeObserver(() => classify());
    ro.observe(wsEl);
    updClock();
    clearInterval(tickT);
    tickT = setInterval(tick, 500);
  }

  function saveDock(ids) {
    const s = song(), full = dockGroups(st(), s), order = [...ids, ...full.filter((x) => !ids.includes(x))];
    if (s) { s.dock = order; s.updatedAt = store.now(); store.save(); toast(t('dock.savedSong', { name: s.title })); }
    else { st().dockOrder = order; store.settingsChanged(); toast(t('dock.savedDef')); }
  }
  // Удержание без движения: сбросить порядок песни или вернуть исходный
  function dockMenu(b) {
    const s = song(), items = [];
    if (s && s.dock) items.push({ icon: icons.back, label: t('dock.resetSong'), run: () => { delete s.dock; store.save(); redock(); toast(t('dock.resetDone')); } });
    if (!s && st().dockOrder) items.push({ icon: icons.back, label: t('dock.resetDef'), run: () => { delete st().dockOrder; store.settingsChanged(); redock(); toast(t('dock.resetDone')); } });
    items.unshift({ icon: groupIcon(b.dataset.pill), label: t('dock.open'), run: () => openTool(b.dataset.pill) });
    holdMenu(b, items, t('dock.drag'));
  }
  // Панель — заново (после сброса порядка)
  function redock() {
    const bar = layer && layer.querySelector('#tpills');
    if (!bar) return;
    bar.innerHTML = dockGroups(st(), song()).map((g) => '<button class="tb" data-pill="' + g + '" role="tab" aria-label="' + esc(groupName(st(), g)) + '" title="' + esc(groupName(st(), g)) + '">' + groupIcon(g) + '</button>').join('');
    dockSel();
  }

  function unmountAll() {
    panes.forEach((p) => p.inst && p.inst.unmount());
    panes = [];
  }

  function hide() {
    if (!layer) return;
    setPanePure(-1);
    unmountAll();
    if (ro) ro.disconnect();
    clearInterval(tickT);
    leave(layer.firstElementChild, 260);
    { const l = layer; setTimeout(() => l.remove(), 280); }
    layer = wsEl = null;
    app.openTool = prevOpenTool;
    app.render();
  }

  /* ---------- рабочее пространство ---------- */
  const saveWS = () => app.saveDevice();
  const GRIP = (i) => '<button class="grip" data-s="pmenu" data-p="' + i + '" aria-label="' + esc(t('ses.grip')) + '"></button>';

  const PFBTN = (i) => '<button class="pfbtn" data-s="ppure" data-p="' + i + '" aria-label="' + esc(t('pm.pure')) + '" title="' + esc(t('pm.pure')) + '">' + IC.full + '</button>';
  function paneHTML(i, flex) {
    const sz = lsizes(w.layout)[i], multi = lsizes(w.layout).length > 1;
    return '<div class="pane toolhost ' + sz + (multi && w.focus === i ? ' focus' : '') + '" data-pane="' + i + '" data-group="' + w.panes[i] + '" style="flex:' + (flex == null ? 1 : flex) + ' 1 0px">' + GRIP(i) + PFBTN(i) + '</div>';
  }

  // Содержимое окна: переключатель модулей группы (если их два) и место для модуля
  function fillPane(frame, i, size) { return bareScope(() => fillPaneNow(frame, i, size)); }
  function fillPaneNow(frame, i, size) {
    const g = w.panes[i], m = pickModule(st(), w, g, size), list = members(st(), g), big = size === 'full' || size === 'half';
    frame.querySelectorAll(':scope > :not(.grip):not(.pfbtn)').forEach((x) => x.remove());
    let host;
    if (list.length > 1) {
      const comp = document.createElement('div');
      comp.className = 'comp ' + size;
      if (!['piano', 'glider', 'drone'].includes(g)) comp.dataset.swtabs = ''; // смахивание — соседняя глава (не там, где играют пальцами)
      comp.innerHTML = '<div class="csw" role="tablist">' + list.map((x) => '<button class="cswb' + (x === m ? ' on' : '') + '" data-csub="' + x.id + '" role="tab" aria-selected="' + (x === m) + '" aria-label="' + esc(subName(x)) + '">' +
        x.icon + (big ? '<span>' + esc(subName(x)) + '</span>' : '') + '</button>').join('') + '</div><div class="cbody"></div>';
      frame.appendChild(comp);
      host = comp.querySelector('.cbody');
    } else {
      host = document.createElement('div');
      host.className = 'pbody';
      frame.appendChild(host);
    }
    const prev = panes[i];
    if (prev && prev.inst) prev.inst.unmount();
    panes[i] = { frame, mod: m, size, inst: m ? mountModule(app, m, host, size, frame) : null };
  }

  function renderWS(animIdx) { return bareScope(() => renderWSNow(animIdx)); }
  function renderWSNow(animIdx) {
    if (!wsEl) return;
    setPanePure(-1);
    fixWS(w, sessionGroups(st(), song()), app.active, minOf);
    unmountAll();
    if (w.layout === 'F') wsEl.innerHTML = paneHTML(0);
    else {
      const tc = w.layout[0] === 'H' ? 1 : 2, bc = w.layout[1] === 'H' ? 1 : 2;
      const dv = (o, d) => '<div class="wsdiv ' + o + '" data-d="' + d + '" role="separator" aria-label="' + esc(t('ses.divider')) + '"><span></span></div>';
      const half = (ch, idx, r, d, f) => '<div class="half ' + (ch === 'Q' ? 'row' : 'col') + '" data-h="' + d + '" style="flex:' + f + ' 1 0px">' +
        (idx.length === 1 ? paneHTML(idx[0]) : paneHTML(idx[0], r) + dv(ch === 'Q' ? 'v' : 'h', d) + paneHTML(idx[1], 1 - r)) + '</div>';
      wsEl.innerHTML = half(w.layout[0], tc === 1 ? [0] : [0, 1], w.rt || 0.5, 't', w.ratio) + dv('h main', 'main') + half(w.layout[1], bc === 1 ? [tc] : [tc, tc + 1], w.rb || 0.5, 'b', 1 - w.ratio);
    }
    const sizes = lsizes(w.layout);
    wsEl.querySelectorAll('.pane').forEach((p) => {
      const i = +p.dataset.pane;
      fillPane(p, i, measure(p) || sizes[i]);
      if (i === animIdx) p.classList.add('enter');
    });
    dockSel();
    rotCheck();
  }

  const measure = (p) => sizeOf(w.layout, p.offsetWidth, p.offsetHeight, wsEl.offsetWidth, wsEl.offsetHeight);

  // Размер окна — по его пикселям: при смене — модуль перерисовывается в новом размере
  function classify() {
    if (!wsEl || pureI >= 0) return; // окно во весь экран — размеры остальных не пересчитываются
    panes.forEach((p, i) => {
      if (!p) return;
      const fit = String(w.layout === 'F' ? 9 : fitOf(p.frame.offsetWidth, p.frame.offsetHeight));
      const fitChanged = p.frame.dataset.fit !== undefined && p.frame.dataset.fit !== fit;
      if (p.frame.dataset.fit !== fit) p.frame.dataset.fit = fit;
      const s = measure(p.frame);
      if (!s || s === p.size) { if (fitChanged && p.inst) p.inst.resize(p.size); return; } // тот же размер, другое число кнопок — инструмент выбирает вид заново
      const want = pickModule(st(), w, w.panes[i], s);
      if (want !== p.mod || (members(st(), w.panes[i]).length > 1)) fillPane(p.frame, i, s);
      else { p.size = s; p.inst && p.inst.resize(s); }
    });
  }

  function setFocus(i) {
    if (w.focus === i) return;
    w.focus = i;
    saveWS();
    wsEl.querySelectorAll('.pane').forEach((p) => p.classList.toggle('focus', lsizes(w.layout).length > 1 && +p.dataset.pane === i));
    dockSel();
  }

  function dockSel() {
    if (!layer) return;
    const vis = visible(w), slot = lsizes(w.layout)[w.focus];
    layer.querySelectorAll('#tpills .tb').forEach((b) => {
      const id = b.dataset.pill;
      // инструменту мало места в окне в фокусе (meta.minSize): значок притушен, касание объяснит
      b.classList.toggle('small', !vis.includes(id) && !fits(minOf(id), slot));
      b.setAttribute('aria-selected', w.panes[w.focus] === id);
      b.classList.toggle('used', vis.includes(id) && w.panes[w.focus] !== id);
    });
  }

  // Повернуть весь экран сессии (пианино: «Поворот — весь экран»)
  function rotCheck() {
    const s = layer && layer.querySelector('.session');
    if (!s) return;
    const dir = panes.map((p) => p && p.inst && p.mod.rotate && p.mod.rotate(p.inst.ctx)).find(Boolean) || null;
    s.classList.toggle('rot', !!dir);
    s.classList.toggle('rotl', dir === 'l');
    s.style.width = dir ? innerHeight + 'px' : '';
    s.style.height = dir ? innerWidth + 'px' : '';
  }

  // Минимальный размер окна инструмента (meta.minSize): в слишком малое окно инструмент не пускаем
  const minOf = (id) => (moduleById(id) || {}).minSize;
  // Применить правку раскладки; если после неё какому-то инструменту мало места — переставить, не вышло — отменить
  function guarded(apply) {
    const snap = JSON.stringify(w);
    const idx = apply();
    if (settle(w, minOf)) return idx;
    const bad = w.panes[tooSmall(w, minOf)[0]];
    Object.keys(w).forEach((k) => delete w[k]);
    Object.assign(w, JSON.parse(snap));
    toast(t('ses.tooSmall', { name: bad && moduleById(bad) ? moduleName(moduleById(bad)) : '' }));
    return null;
  }
  function relayout(fn, ...args) {
    const idx = guarded(() => fn(w, ...args));
    if (idx === null) return;
    saveWS();
    renderWS(typeof idx === 'number' ? idx : undefined);
  }

  // Открыть инструмент из модуля или нижней панели: окно с ним получает фокус, иначе он встаёт в окно в фокусе
  function openTool(id) {
    const a = app.active;
    if (a && a.type === 'tool') { if (id !== a.tool) toast(t('ses.toolOutside', { name: moduleById(id) ? moduleName(moduleById(id)) : id })); return; }
    if (id === 'timer') { pomoSheet(); return; }
    const m = moduleById(id);
    if (m && m.session === false) { toast(t('ses.toolOutside', { name: moduleName(m) })); return; }
    const g = m ? groupOf(m) : id;
    if (m && m.group) w.sub[m.group] = m.id;
    const vi = visible(w).indexOf(g);
    if (vi >= 0) { w.focus = vi; saveWS(); renderWS(vi); }
    else relayout(assign, g);
  }

  // Окна звучащих инструментов: окно в фокусе остаётся, к нему — до трёх звучащих (шины микшера → инструменты)
  function soundingPanes() {
    const on = SOUND_BUS.filter(([b]) => audio.mixer.isActive(b) && audio.mixer.value(b) > 0).map(([, id]) => moduleById(id)).filter(Boolean)
      .map(groupOf).filter((g, i, a) => a.indexOf(g) === i && dockGroups(st(), song()).includes(g));
    const cur = w.panes[w.focus], add = on.filter((g) => g !== cur);
    if (!add.length) { toast(t('ses.noSound')); return; }
    const vis = [cur].concat(add).slice(0, lowScreen() ? 2 : 4);
    if (vis.length === visible(w).length && vis.every((g) => visible(w).includes(g))) return;
    relayout(setLayout, ['F', 'HH', 'HQ', 'QQ'][vis.length - 1], vis);
  }

  /* ---------- нажатия ---------- */
  function onClick(e) {
    if (dragSup) { dragSup = false; return; }
    if (Date.now() - calmWoke < 450 && e.target.closest('[data-s]')) return; // касание лишь вернуло тихий вид — время не ставит паузу
    const pill = e.target.closest('[data-pill]');
    if (pill) { openTool(pill.dataset.pill); return; }
    const cs = e.target.closest('.csw [data-csub]');
    if (cs) {
      const i = +cs.closest('.pane').dataset.pane;
      w.sub[w.panes[i]] = cs.dataset.csub;
      saveWS();
      fillPane(panes[i].frame, i, panes[i].size);
      rotCheck();
      return;
    }
    if (e.target.closest('#splan') && !e.target.closest('[data-s]')) { if (Date.now() - planSwiped > 400) planSheet(); return; }
    const b = e.target.closest('[data-s]');
    if (!b) return;
    const a = b.dataset.s;
    // полоска окна: касание — меню окна, двойное касание — инструмент во весь экран (как развернуть окно в телефоне)
    // кнопка окна: во весь экран; в полном экране — обратно
    if (a === 'ppure') { const i = +b.dataset.p; setPanePure(pureI === i ? -1 : i); return; }
    if (a === 'pmenu') {
      const i = +b.dataset.p, now = Date.now();
      if (gripTap && gripTap.i === i && now - gripTap.t < 320) { clearTimeout(gripTap.tm); gripTap = null; setPanePure(i); return; }
      if (gripTap) clearTimeout(gripTap.tm);
      gripTap = { i, t: now, tm: setTimeout(() => { gripTap = null; paneMenu(i); }, 320) };
      return;
    }
    if (a === 'pnext') { planStep(); return; }
    if (a === 'pause') {
      audio.metro.flush(); // темп до паузы засчитан, пауза — нет
      togglePause(app.active);
      saveActive(app.active);
      updClock();
    } else if (a === 'pomo') pomoSheet();
    else if (a === 'hide') hide();
    else if (a === 'finish') finish();
    else if (a === 'stage') import('./stage.js').then((m) => m.stagePick(app));
  }

  /* ---------- шторки окон ---------- */
  // Окно во весь экран (любой инструмент; глайдер, терменвокс, пианино, медиатека, табы и текст ещё и прячут свои кнопки —
  // manifest.pure, onPure): только рабочая поверхность,
  // без заголовка сессии, панели и других окон; выход — «Назад», Esc, выход браузера из полного экрана
  function setPanePure(i) {
    if (i === pureI || !layer) return;
    const ses = layer.querySelector('.session'), was = pureI >= 0 ? panes[pureI] : null;
    if (was) {
      was.frame.classList.remove('pfull');
      pfIcon(was.frame, false);
      ses.classList.remove('pure');
      pureI = -1;
      document.removeEventListener('keydown', pureKey);
      pureLeave();
      if (was.mod && was.mod.onPure) { try { was.mod.onPure(false, was.inst.ctx); } catch { /* перерисуется по размеру */ } }
      requestAnimationFrame(() => { classify(); rotCheck(); });
    }
    const p = i >= 0 ? panes[i] : null;
    if (!p || !p.inst) return;
    pureI = i;
    ses.classList.add('pure');
    p.frame.classList.add('pfull');
    pfIcon(p.frame, true);
    document.addEventListener('keydown', pureKey);
    pureEnter(() => setPanePure(-1));
    toast(t('tools.pureHint'));
    requestAnimationFrame(() => {
      if (p.size !== 'full') { p.size = 'full'; p.inst.resize('full'); }
      if (p.mod.onPure) { try { p.mod.onPure(true, p.inst.ctx); } catch { /* перерисуется по размеру */ } }
    });
  }
  function pfIcon(frame, on) {
    const b = frame.querySelector(':scope > .pfbtn');
    if (!b) return;
    b.innerHTML = on ? IC.unfull : IC.full;
    b.setAttribute('aria-label', t(on ? 'pm.unpure' : 'pm.pure'));
    b.title = t(on ? 'pm.unpure' : 'pm.pure');
  }
  function pureKey(e) { if (e.key === 'Escape' && !document.querySelector('#sheetLayer .scrim')) setPanePure(-1); }

  function paneMenu(i) {
    const sz = lsizes(w.layout)[i], id = w.panes[i], multi = w.layout !== 'F';
    const it = (k, n, cls) => '<button class="cell' + (cls ? ' ' + cls : '') + '" data-pm="' + k + '"><span class="grow">' + n + '</span></button>';
    const canPure = !!(panes[i] && panes[i].inst); // любой инструмент — во весь экран (решение автора 28.10.2026)
    sheet(() => snav(groupName(st(), id)) + '<div class="group">' +
      (canPure ? it('pure', t('pm.pure')) : '') +
      (multi ? it('full', t('pm.full')) : '') +
      // низкий экран (альбомный телефон): не больше двух окон — иначе по 49 px на окно
      (lowScreen() ? (sz === 'full' ? it('addb', t('pm.addBottom')) : '') : sz === 'full' || sz === 'half' ? it('addb', t('pm.addBottom')) + (sz === 'half' ? it('addr', t('pm.addRight')) : '') : '') +
      (multi ? it('swap', t('pm.swap')) : '') + it('schemes', t('pm.schemes')) + (multi ? it('close', t('pm.close'), 'danger') : '') + '</div>' +
      '<p class="ftr">' + t('pm.hint') + '</p>',
    (el, sh) => el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pm]');
      if (!b) return;
      const k = b.dataset.pm;
      sh.close();
      if (k === 'pure') setPanePure(i);
      else if (k === 'full') relayout(setLayout, 'F', [id]);
      else if (k === 'addb' || k === 'addr') {
        let all = false;
        const r = guarded(() => { const q = addPane(w, i, k === 'addb' ? 'bottom' : 'right'); if (q === null) all = true; return q; });
        if (all) toast(t('pm.allShown'));
        else if (r !== null) { saveWS(); renderWS(r); }
      } else if (k === 'close') relayout(closePane, i);
      else if (k === 'swap') relayout(swapHalves);
      else if (k === 'schemes') layoutSheet();
    }));
  }

  function lowScreen() { return typeof innerHeight === 'number' && innerHeight < 420 && innerWidth > innerHeight; }
  function layoutSheet() {
    const prev = (l) => '<div class="lprev2">' + lpos(l).map((g) => '<i style="grid-area:' + g + '"></i>').join('') + '</div>';
    const OPT = [['H', t('lay.half')], ['Q', t('lay.quarters')], ['S', t('lay.strips')]];
    const body = () => {
      const l = w.layout, top = l === 'F' ? null : l[0], bot = l === 'F' ? null : l[1];
      return snav(t('lay.title')) + '<div class="lhead">' + prev(l) + '<button class="lopt' + (l === 'F' ? ' on' : '') + '" data-lf aria-pressed="' + (l === 'F') + '">' + t('lay.full') + '</button></div>' +
        '<div class="hdr">' + t('lay.top') + '</div><div class="group"><div class="cellcol"><div class="seg" role="group" aria-label="' + t('lay.top') + '">' + OPT.map(([k, n]) => '<button data-lt="' + k + '" aria-pressed="' + (top === k) + '">' + n + '</button>').join('') + '</div></div></div>' +
        '<div class="hdr">' + t('lay.bottom') + '</div><div class="group"><div class="cellcol"><div class="seg" role="group" aria-label="' + t('lay.bottom') + '">' + OPT.map(([k, n]) => '<button data-lb="' + k + '" aria-pressed="' + (bot === k) + '">' + n + '</button>').join('') + '</div></div></div>' +
        '<p class="ftr">' + t('lay.hint') + '</p>';
    };
    sheet(body, (el, sh) => el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lt],[data-lb],[data-lf]');
      if (!b) return;
      let l = w.layout === 'F' ? 'HH' : w.layout;
      if (b.hasAttribute('data-lf')) l = 'F';
      else if (b.dataset.lt) l = b.dataset.lt + l[1];
      else l = l[0] + b.dataset.lb;
      w.layout = l;
      w.focus = 0;
      saveWS();
      sh.update();
      renderWS();
    }));
  }

  /* ---------- помодоро ---------- */
  function pchipHTML() {
    const po = app.pomodoro;
    if (!po.active()) return IC.pomo;
    const tot = po.total(), rem = po.rem(), C = 2 * Math.PI * 8;
    return '<svg viewBox="0 0 20 20" class="pcring"><circle cx="10" cy="10" r="8" fill="none" stroke="var(--fill2)" stroke-width="3"/><circle cx="10" cy="10" r="8" fill="none" stroke="' +
      (po.phase === 'work' ? 'var(--tint)' : '#5F8568') + '" stroke-width="3" stroke-dasharray="' + C * (1 - rem / tot) + ' ' + C + '" transform="rotate(-90 10 10)"/></svg><span class="num">' + fmtClock(rem) + '</span>';
  }

  function pomoSheet() {
    const timer = moduleById('timer');
    if (!timer) return;
    let inst = null;
    sheet(() => snav(moduleName(timer)) + '<div class="toolhost pomohost"></div>', (el) => {
      inst = mountModule(app, timer, el.querySelector('.pomohost'), 'full');
    }, { onClose: () => inst && inst.unmount() });
  }

  /* ---------- время, бездействие ---------- */
  function updClock() { return bareScope(() => updClockNow()); }
  function updClockNow() {
    const a = app.active;
    if (!a || !layer) return;
    const c = layer.querySelector('#clk');
    if (c) c.textContent = fmtClock(elapsed(a));
    const s = layer.querySelector('#stime');
    if (s) { s.classList.toggle('paused', !!a.pausedAt); s.setAttribute('aria-label', t(a.pausedAt ? 'ses.resume' : 'ses.pause')); }
  }

  function tick() { return bareScope(() => tickNow()); }
  // Учёба в окнах занятия (блок «Учёба» на главной): пока окно учебника, слуха или ритма на экране и занятие идёт —
  // его время копится в a.study (мс); в запись — секундами (session.js: buildRecord)
  let studyAt = 0;
  function studyTick() {
    const a = app.active, now = Date.now(), dt = studyAt ? Math.min(2000, now - studyAt) : 0;
    studyAt = now;
    if (!a || a.pausedAt || !w || document.visibilityState !== 'visible' || !dt) return;
    visible(w).forEach((id) => { if (STUDY_IDS.includes(id)) { a.study = a.study || {}; a.study[id] = (a.study[id] || 0) + dt; } });
  }
  // «Перерыв?» — тихая полоска сверху: без звука, метроном не останавливает; помодоро ведёт свои перерывы
  let brkEnd = 0;
  function breakTick() {
    const a = app.active, sin = layer && layer.querySelector('.sin');
    if (!a || !sin) return;
    let b = sin.querySelector('.sbrk');
    if (brkEnd) { // идёт перерыв: обратный отсчёт
      const left = Math.max(0, Math.ceil((brkEnd - Date.now()) / 1000));
      if (b) b.querySelector('.sbt').textContent = left ? t('brk.on', { t: fmtClock(left) }) : t('brk.over');
      if (!a.pausedAt) { brkEnd = 0; if (b) b.remove(); } // продолжили касанием времени
      return;
    }
    if (b || app.pomodoro.active() || !breakDue(a, st(), elapsed(a))) return;
    b = document.createElement('div');
    b.className = 'sbrk';
    b.setAttribute('role', 'status');
    b.innerHTML = '<span class="sbt">' + esc(t('brk.ask', { m: breakMin(st()) })) + '</span><button data-brk="go">' + esc(t('brk.go', { m: BREAK_LEN })) + '</button><button data-brk="later">' + esc(t('brk.later')) + '</button>';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const k = e.target.closest('[data-brk]'), a2 = app.active;
      if (!k || !a2) return;
      if (k.dataset.brk === 'go') {
        audio.metro.flush();
        if (!a2.pausedAt) togglePause(a2);
        brkEnd = Date.now() + BREAK_LEN * 60000;
        a2.brk = elapsed(a2);
        b.querySelector('.sbt').textContent = t('brk.on', { t: fmtClock(BREAK_LEN * 60) });
        b.querySelectorAll('button').forEach((x) => x.remove());
        const r = document.createElement('button'); r.dataset.brk = 'back'; r.textContent = t('brk.back'); b.appendChild(r);
      } else if (k.dataset.brk === 'back') {
        if (a2.pausedAt) togglePause(a2);
        brkEnd = 0; a2.brk = elapsed(a2); b.remove();
      } else { // «Позже» — ещё 15 минут
        a2.brk = elapsed(a2) - (breakMin(st()) - BREAK_LATER) * 60; b.remove();
      }
      saveActive(a2); updClock();
    });
    sin.appendChild(b);
  }
  // Тихий вид (слово автора 13.11.2026, «как Forest»): 30 с без касаний — шапка, панель инструментов и ручки окон
  // уходят, остаются крупное время и сам инструмент (ноты, метроном). Касание возвращает всё и проходит дальше —
  // по инструменту играть можно сразу. Раскладка не двигается (только прозрачность). Выключить — «Неделя» (calmView)
  const CALM_MS = 30000;
  let calmAt = 0, calmWoke = 0;
  function calmWake() { calmAt = Date.now(); const ses = layer && layer.querySelector('.session'); if (ses && ses.classList.contains('calm')) { ses.classList.remove('calm'); calmWoke = calmAt; } }
  function calmTick() {
    const ses = layer && layer.querySelector('.session');
    if (!ses || ses.classList.contains('calm') || st().calmView === false || !app.active || app.active.pausedAt) return;
    if (Date.now() - calmAt < CALM_MS || document.querySelector('#sheetLayer .scrim:not(.leaving), .ask, .tour') || layer.querySelector('.sbrk')) return;
    ses.classList.add('calm');
  }
  function tickNow() {
    calmTick();
    updClock();
    studyTick();
    breakTick();
    planTick();
    const pc = layer && layer.querySelector('#pchip');
    if (pc) { const h = pchipHTML(); pc.hidden = !app.pomodoro.active(); if (pc.dataset.h !== h) { pc.dataset.h = h; pc.innerHTML = h; } }
    rotCheck();
  }

  // Завершение по бездействию без ответа: сессия сохраняется сама, время — до последнего действия
  function autoEnd(endAt) {
    const a = app.active;
    if (!a) return;
    if (audio.metro.running) audio.metro.stop();
    audio.metro.flush();
    const sum = summarize(a, { endAt, mic: app.activity.listening });
    if (!sum.short) { const rec = buildRecord(a, { dur: sum.dur, best: sum.best, quiet: sum.quiet, endAt }); planInto(rec, a); commitSession(store, rec); }
    app.pomodoro.reset();
    end();
    toast(sum.short ? t('idle.ended0') : t('idle.ended', { d: fmtDur(sum.dur) }));
  }

  // разбивка по пунктам плана — в запись занятия (одно занятие, пункты внутри)
  function planInto(rec, a) {
    const p = a.routine ? runRecord(a.routine, Math.min(elapsed(a), rec.dur)) : a.planDone || null;
    if (p) rec.plan = p;
  }

  /* ---------- завершение ---------- */
  function end() {
    hide();
    app.active = null;
    audio.metro.cfg = st().metro;
    releaseWake();
    app.render();
  }

  function finish(endAt = null) {
    const a = app.active;
    if (!a) return;
    if (audio.metro.running) audio.metro.stop();
    audio.metro.flush();
    // «Только инструменты»: рабочее место просто закрывается, в статистику ничего не пишется
    if (st().toolsOnly) { end(); return; }
    const sum = summarize(a, { endAt, mic: app.activity.listening }), s = song();
    if (sum.short) {
      sheet(() => snav(t('fin.shortTitle'), { right: '<span></span>' }) + '<p style="text-align:center;margin:8px 8px 20px" class="l2">' + t('fin.shortText') + '</p>' +
        '<button class="btn fill block" data-k="back">' + t('fin.continue') + '</button><button class="btn block" data-k="drop" style="margin-top:10px;color:var(--red)">' + t('fin.drop') + '</button>',
      (el, sh) => el.addEventListener('click', (e) => {
        const k = e.target.closest('[data-k]');
        if (!k) return;
        sh.close();
        if (k.dataset.k === 'drop') end();
      }));
      return;
    }
    let tag = '', readM = null;
    const planNow = a.routine ? runRecord(a.routine, elapsed(a)) : a.planDone || null;
    // «Назад» — значком (как везде), «Сохранить» — внизу, под большим пальцем
    sheet(() => snav(t('fin.title'), { left: '<button class="ic sm plain" data-k="back" aria-label="' + esc(t('ui.back')) + '">' + icons.back + '</button>', right: '<span></span>' }) +
      '<div style="text-align:center;margin:4px 0 18px"><div class="num' + (a.mode === 'strict' ? ' gold' : '') + '" style="font-size:44px;font-weight:300;letter-spacing:-.03em">' + fmtDur(sum.dur) + '</div><div class="l2" style="font-size:15px">' +
      esc(titleOf(a)) + (sum.best ? t('fin.upTo', { bpm: sum.best }) : '') + '</div></div>' +
      (s ? '<div class="hdr">' + t('fin.songNow') + '</div><div class="group"><div class="cellcol">' + mInput(getPct(s), st()) + '</div><label class="cell"><span class="grow">' + t('fin.confident') +
        '</span><input class="inp num" id="cb" type="number" inputmode="numeric" min="20" max="300" placeholder="bpm" aria-label="' + t('fin.confident') + '" value="' + (sum.best || s.currentBpm || '') + '"></label></div>'
        : a.type === 'tool' ? '' : '<div class="hdr">' + t('fin.what') + '</div><div class="group"><div class="cellcol"><div class="hscroll" style="padding:0;flex-wrap:wrap" id="tg">' +
          FREE_TAGS.map((x) => '<button type="button" class="pill" aria-pressed="false" data-t="' + x + '">' + esc(freeTagName(x)) + '</button>').join('') + '</div></div></div>') +
      (planNow ? '<div class="hdr">' + esc(planNow.title || t('rt.untitled')) + '</div><div class="group">' + planNow.items.map((x) => '<div class="cell"><span class="grow">' + esc(x.title) + '</span><span class="l2 num">' + fmtDur(x.sec) + ' / ' + x.min + ' ' + t('rt.minShort') + '</span></div>').join('') + '</div>' : '') +
      // разбор (слово автора 13.11.2026): три коротких поля, все необязательные; «Дальше» — в начале следующего занятия
      '<div class="hdr">' + t('fin.review') + '</div><div class="group frev">' + ['good', 'bad', 'next'].map((k) => '<label class="cellcol"><span class="frl">' + t('fin.' + k) + '</span><textarea class="ta" data-rv="' + k + '" rows="1" maxlength="500" aria-label="' + esc(t('fin.' + k)) + '" placeholder="' + esc(t('fin.' + k + 'Ph')) + '"></textarea></label>').join('') + '</div>' +
      '<div class="sheetfoot"><button class="btn fill block" data-k="save">' + t('fin.save') + '</button></div>',
    (el, sh) => {
      if (s) readM = bindM(el, st());
      el.addEventListener('click', (e) => {
        const tg = e.target.closest('[data-t]');
        if (tg) { tag = tag === tg.dataset.t ? '' : tg.dataset.t; el.querySelectorAll('[data-t]').forEach((c) => c.setAttribute('aria-pressed', c.dataset.t === tag)); return; }
        const k = e.target.closest('[data-k]');
        if (!k) return;
        if (k.dataset.k === 'back') { sh.close(); return; }
        // сессию уже завершило бездействие, пока окно было открыто
        if (app.active !== a) { sh.close(); return; }
        const rec = buildRecord(a, { dur: sum.dur, best: sum.best, quiet: sum.quiet, endAt, tag, review: Object.fromEntries([...el.querySelectorAll('[data-rv]')].map((x) => [x.dataset.rv, x.value])) });
        planInto(rec, a);
        commitSession(store, rec, s ? { masteryPct: readM(), confidentBpm: parseInt((el.querySelector('#cb') || {}).value, 10), metro: audio.metro.cfg } : null);
        app.pomodoro.reset();
        sh.close();
        end();
        toast(t('fin.saved', { d: fmtDur(rec.dur) }));
      });
    });
  }

  /* ---------- жесты: инструмент из панели на окно, окно на окно, границы ---------- */
  const zoneOf = (p, x, y, kind) => {
    const r = p.getBoundingClientRect(), rx = (x - r.left) / r.width, ry = (y - r.top) / r.height, sz = p.dataset.size;
    if (kind === 'pane' || sz === 'quarter' || sz === 'strip') return 'center';
    if (ry < 0.32) return 'top';
    if (ry > 0.68) return 'bottom';
    if (sz === 'half') { if (rx < 0.3) return 'left'; if (rx > 0.7) return 'right'; }
    return 'center';
  };
  const clearDrop = () => wsEl && wsEl.querySelectorAll('.pane[data-drop]').forEach((p) => p.removeAttribute('data-drop'));
  const divFrac = (d, x, y) => {
    if (d.d === 'main') { const r = wsEl.getBoundingClientRect(); return (y - r.top) / r.height; }
    const hf = d.el.parentNode, r = hf.getBoundingClientRect();
    return hf.classList.contains('row') ? (x - r.left) / r.width : (y - r.top) / r.height;
  };
  // Граница не уменьшает окно инструмента до бесполезного: от «четверти» нужно не меньше 180 px по высоте и 140 по ширине
  // (ниже окно становится полосой, а инструмент туда не пускаем)
  const limitFrac = (d, f) => {
    const H = halves(w);
    if (!H) return clampFrac(f);
    const main = d.d === 'main', hf = main ? wsEl : d.el.parentNode, r = hf.getBoundingClientRect(), row = !main && hf.classList.contains('row');
    const first = main ? H.top : d.d === 't' ? H.top : H.bot, ids = main ? [H.top, H.bot] : [first.slice(0, 1), first.slice(1)];
    const need = (g) => g.some((id) => fits('quarter', minOf(id) || 'strip'));
    const total = row ? r.width : r.height, px = row ? 140 : 180;
    let lo = need(ids[0]) ? px / total : 0, hi = need(ids[1]) ? 1 - px / total : 1;
    lo = Math.max(0.14, lo); hi = Math.min(0.86, hi);
    return lo > hi ? 0.5 : Math.max(lo, Math.min(hi, f));
  };
  const applyFrac = (d, f) => {
    const c = limitFrac(d, f), set = (els) => { if (els[0]) els[0].style.flex = c + ' 1 0px'; if (els[1]) els[1].style.flex = 1 - c + ' 1 0px'; };
    if (d.d === 'main') set(wsEl.querySelectorAll(':scope>.half'));
    else set(d.el.parentNode.querySelectorAll(':scope>.pane'));
  };

  document.addEventListener('pointerdown', (e) => {
    if (!layer || !e.target.closest) return;
    const dv = e.target.closest('.wsdiv');
    if (dv) { e.preventDefault(); DRG = { kind: 'div', d: dv.dataset.d, pid: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, el: dv }; return; }
    const tb = e.target.closest('.sdock .tb[data-pill]'), gp = e.target.closest('.ws .grip');
    if (!tb && !gp) return;
    DRG = { kind: tb ? 'tool' : 'pane', id: tb ? tb.dataset.pill : null, src: gp ? +gp.dataset.p : null, x0: e.clientX, y0: e.clientY, pid: e.pointerId, on: false };
  }, true);

  document.addEventListener('pointermove', (e) => {
    if (!DRG || e.pointerId !== DRG.pid) return;
    if (DRG.kind === 'tool' && document.documentElement.classList.contains('sorting')) { DRG = null; return; } // идёт перестановка значков
    const dx = e.clientX - DRG.x0, dy = e.clientY - DRG.y0;
    if (DRG.kind === 'div') {
      if (!DRG.on && Math.hypot(dx, dy) < 6) return;
      DRG.on = true;
      DRG.el.classList.add('active');
      DRG.f = divFrac(DRG, e.clientX, e.clientY);
      applyFrac(DRG, DRG.f);
      return;
    }
    if (!DRG.on) {
      if (Math.hypot(dx, dy) < 12) return;
      if (DRG.kind === 'tool' && !(dy < -10 && Math.abs(dy) > Math.abs(dx))) return; // инструмент тянется вверх, вбок — прокрутка панели
      DRG.on = true;
      const g = document.createElement('div');
      g.className = 'dghost';
      const id = DRG.kind === 'tool' ? DRG.id : w.panes[DRG.src];
      g.innerHTML = (DRG.kind === 'tool' ? groupIcon(id) : '') + '<span>' + esc(groupName(st(), id)) + '</span>';
      document.body.appendChild(g);
      DRG.g = g;
    }
    DRG.g.style.left = e.clientX + 'px';
    DRG.g.style.top = e.clientY + 'px';
    clearDrop();
    const el = document.elementFromPoint(e.clientX, e.clientY), p = el && el.closest ? el.closest('.ws .pane') : null;
    DRG.target = null;
    if (p && !(DRG.kind === 'pane' && +p.dataset.pane === DRG.src)) {
      const z = zoneOf(p, e.clientX, e.clientY, DRG.kind);
      p.setAttribute('data-drop', z);
      DRG.target = { i: +p.dataset.pane, z };
    }
  }, { passive: true });

  function endDrag(e) {
    if (!DRG || e.pointerId !== DRG.pid) return;
    const d = DRG;
    DRG = null;
    if (d.kind === 'div') {
      d.el.classList.remove('active');
      const H = halves(w);
      if (!H) return;
      // Нажатие без движения — поменять местами половины или окна в половине
      if (!d.on) {
        if (d.d === 'main') relayout(swapHalves);
        else {
          const isT = d.d === 't', arr = (isT ? H.top : H.bot).slice().reverse();
          relayout(setLayout, H.t + H.b, isT ? arr.concat(H.bot) : H.top.concat(arr));
        }
        return;
      }
      const f = d.f;
      if (d.d === 'main') {
        if (f < 0.1) relayout(setLayout, H.bot.length === 1 ? 'F' : 'HH', H.bot);
        else if (f > 0.9) relayout(setLayout, H.top.length === 1 ? 'F' : 'HH', H.top);
        else { w.ratio = limitFrac(d, f); saveWS(); classify(); }
        return;
      }
      const isT = d.d === 't', arr = isT ? H.top : H.bot;
      if (f < 0.1 || f > 0.9) {
        const keep = [arr[f < 0.1 ? 1 : 0]];
        relayout(setLayout, isT ? 'H' + H.b : H.t + 'H', isT ? keep.concat(H.bot) : H.top.concat(keep));
        return;
      }
      w[isT ? 'rt' : 'rb'] = limitFrac(d, f);
      saveWS();
      classify();
      return;
    }
    if (!d.on) return;
    dragSup = true;
    setTimeout(() => { dragSup = false; }, 60);
    if (d.g) d.g.remove();
    clearDrop();
    if (!d.target) return;
    if (d.kind === 'tool') relayout(dropTool, d.id, d.target.i, d.target.z);
    else if (guarded(() => { swapPanes(w, d.src, d.target.i); w.focus = d.target.i; return 0; }) !== null) { saveWS(); renderWS(d.target.i); }
  }
  document.addEventListener('pointerup', endDrag, true);
  document.addEventListener('pointercancel', endDrag, true);

  ensureLib(store.state, t);
  return { start, resume, open, hide, finish, autoEnd, get isOpen() { return !!layer; } };
}
