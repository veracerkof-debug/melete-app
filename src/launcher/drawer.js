// Главный экран: все приложения (смахнуть вверх) — по алфавиту, с поиском. Удержание — меню приложения.
import { prefs, save, HOME_MAX } from './data.js';
import { allApps, homeItems, loadApps, setHidden, renameApp } from './apps.js';
import { openApp, openUrl } from './actions.js';
import { isNative, Launcher } from './native.js';
import { t } from './i18n.js';
import { h, openSheet, field, toast } from './ui.js';
import { folders, folderById, folderName, folderApps, folderIcon, folderKey, addFolder, renameFolder, setFolderIcon, deleteFolder, toggleInFolder, inAnyFolder, setInFolder, moveInFolder, moveFolder } from './folders.js';
import { holdDrag, reordering } from './reorder.js';
import { allApps as everyApp } from './apps.js';
import { iconSVG, appIconHTML } from './icons.js';
import { pickIcon } from './pickers.js';
import { pickHome } from './homepick.js';
import { layout } from './layout.js';
import { panel } from './panels.js';
import { setCover } from './cover.js';

let drawer, list, search, tabs, titleName;
let tab = 'all'; // вкладка внизу: 'all' или id папки
let open = false;
let changed = () => {};
export const drawerOpen = () => open;

export function mountDrawer(container, { onChange }) {
  changed = onChange;
  search = h('input', {
    class: 'l-search', type: 'search', placeholder: t('drawer.search'), 'aria-label': t('drawer.search'), autocomplete: 'off', enterkeyhint: 'go',
    oninput: fill,
    onkeydown: (e) => { if (e.key === 'Enter') list.querySelector('.l-d-app')?.click(); },
  });
  list = h('div', { class: 'l-d-list' });
  drawer = h('div', { class: 'l-drawer', 'aria-hidden': 'true' },
    h('div', { class: 'l-d-head' },
      h('button', { class: 'l-d-grip', 'aria-label': t('ui.close'), onclick: closeDrawer }),
      h('div', { class: 'l-d-title' }, titleName = h('span', { class: 'l-d-name' }, t('drawer.title')), 
        isNative() ? null : h('button', { class: 'l-d-link', onclick: () => addWebLink() }, t('drawer.addLink'))),
      search),
    // папки — значками справа, низ свободен: список идёт до самого низа
    h('div', { class: 'l-d-body' }, list, tabs = h('div', { class: 'l-d-rail', role: 'tablist', 'aria-orientation': 'vertical' })));
  container.append(drawer);
  // закрыть: потянуть вниз, когда список в начале (или за заголовок) — панель идёт за пальцем; колесо вверх
  let st = null;
  drawer.addEventListener('pointerdown', (e) => {
    if (e.target.closest('input, .l-d-tab')) { st = null; return; }
    st = { y: e.clientY, x: e.clientX, can: list.scrollTop <= 0 || !list.contains(e.target), drag: false, vel: [] };
  });
  drawer.addEventListener('pointermove', (e) => {
    if (reordering()) { if (st?.drag) drawerPanel.cancel(); st = null; return; } // перетаскивают приложение или папку
    if (!st) return;
    const dy = e.clientY - st.y, dx = e.clientX - st.x;
    if (!st.drag) {
      if (!st.can || dy < 6 || Math.abs(dx) > dy) { if (Math.hypot(dx, dy) > 6 && !(st.can && dy > 0)) st = null; return; }
      st.drag = true; drawerPanel.start(false);
      try { drawer.setPointerCapture(e.pointerId); } catch { /* */ }
    }
    st.vel.push({ dy, t: performance.now() }); if (st.vel.length > 6) st.vel.shift();
    drawerPanel.move(innerHeight - Math.max(0, dy));
  });
  const endDrag = (e) => {
    if (!st) return;
    if (st.drag) {
      const dy = Math.max(0, e.clientY - st.y);
      const a = st.vel[0], b = st.vel[st.vel.length - 1];
      const v = a && b && b.t > a.t ? (b.dy - a.dy) / (b.t - a.t) : 0;
      drawerPanel.end(innerHeight - dy, -v, false);
    }
    st = null;
  };
  drawer.addEventListener('touchmove', (e) => { if (st?.drag || (st?.can && e.touches[0] && e.touches[0].clientY - st.y > 0)) e.preventDefault(); }, { passive: false });
  drawer.addEventListener('pointerup', endDrag);
  drawer.addEventListener('pointercancel', () => { if (st?.drag) drawerPanel.cancel(); st = null; });
  // смахнуть влево-вправо по списку — соседняя папка. Список идёт за пальцем; отпустил дальше 36 px или быстрым
  // взмахом — уезжает, приходит соседняя папка с другой стороны; иначе — пружинит назад. На краях — тянется туго.
  // Пальцем — касания (touchend приходит, даже если браузер успел начать прокрутку), мышью — указатель.
  let sw = null;
  const neighbour = (dir) => { const ids = tabIds(), i = Math.max(0, ids.indexOf(tab)) + dir; return i >= 0 && i < ids.length ? ids[i] : null; };
  const swStart = (x, y) => { sw = !search.value && !paging ? { x, y, t: performance.now(), lock: null } : null; };
  const swMove = (x, y) => {
    if (!sw || reordering()) return;
    const dx = x - sw.x, dy = y - sw.y;
    if (!sw.lock) {
      if (Math.hypot(dx, dy) < 10) return;
      sw.lock = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
      if (sw.lock === 'x') list.style.transition = 'none';
    }
    if (sw.lock !== 'x') return;
    const free = neighbour(dx < 0 ? 1 : -1);
    const off = free ? dx : dx / 4; // края нет — туго
    list.style.transform = `translateX(${off}px)`;
    list.style.opacity = String(1 - Math.min(0.5, Math.abs(off) / list.clientWidth));
    sw.off = off;
  };
  const swEnd = (x, y) => {
    if (!sw) return;
    const s0 = sw; sw = null;
    const dx = x - s0.x, dy = y - s0.y, ms = Math.max(1, performance.now() - s0.t);
    const ax = Math.abs(dx);
    const go = !reordering() && s0.lock !== 'y' && ((ax >= 36 && ax > Math.abs(dy) * 1.2) || (ax >= 20 && ax / ms > 0.35 && ax > Math.abs(dy) * 1.5));
    const id = go ? neighbour(dx < 0 ? 1 : -1) : null;
    if (s0.lock === 'x') { list.dataset.swiped = '1'; setTimeout(() => delete list.dataset.swiped, 50); }
    if (id) { switchTab(id, dx < 0 ? 1 : -1, s0.off || 0); }
    else if (s0.off) settle();
  };
  list.addEventListener('touchstart', (e) => { if (e.touches.length === 1) swStart(e.touches[0].clientX, e.touches[0].clientY); else { sw = null; settle(); } }, { passive: true });
  list.addEventListener('touchmove', (e) => { const c = e.touches[0]; if (c) swMove(c.clientX, c.clientY); }, { passive: true });
  list.addEventListener('touchend', (e) => { const c = e.changedTouches[0]; if (c) swEnd(c.clientX, c.clientY); }, { passive: true });
  list.addEventListener('touchcancel', () => { sw = null; settle(); }, { passive: true });
  list.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') swStart(e.clientX, e.clientY); });
  list.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch' && e.buttons) swMove(e.clientX, e.clientY); });
  list.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') swEnd(e.clientX, e.clientY); });
  drawer.addEventListener('wheel', (e) => { if (e.deltaY < -40 && list.scrollTop <= 0) closeDrawer(); }, { passive: true });
  // удержать и перетащить: приложение в папке — на новое место; удержать и отпустить — меню приложения
  holdDrag(list, '.l-d-app', {
    canMove: () => !search.value.trim() && tab !== 'all',
    onHold: (el) => { const a = everyApp().find((x) => x.key === el.dataset.key); if (a) appMenu(a); },
    onMove: (from, to) => {
      const f = !search.value.trim() && tab !== 'all' ? folderById(tab) : null;
      if (!f) { fill(); return; } // во «Всех» — по алфавиту, переставлять нечего
      moveInFolder(f.id, from, to); fill(); changed();
    },
  });
  // папки справа: удержать и перетащить — порядок; удержать и отпустить — меню папки
  holdDrag(tabs, '.l-d-tab.fold', {
    axis: () => (prefs.foldTabs === 'top' ? 'x' : 'y'),
    onHold: (el) => folderMenu(folderById(el.dataset.id)),
    onMove: (from, to) => { moveFolder(from, to); fill(); changed(); },
  });
}

const onHome = (key) => homeItems().some((x) => x.key === key);
// вкладки по порядку: «Все» (если не убрана) и папки
// переход между папками: текущий список уезжает в сторону листания, новый приходит с другой стороны (dir: 1 — следующая,
// −1 — предыдущая); from — где список сейчас (палец уже утащил). «Меньше движения» — сразу, без сдвига.
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(.2,.8,.2,1)';
let paging = false;
function settle() {
  if (!list.style.transform) return;
  list.style.transition = `transform .22s ${EASE}, opacity .22s ${EASE}`;
  list.style.transform = ''; list.style.opacity = '';
}
function switchTab(id, dir, from = 0) {
  if (id === tab) { settle(); return; }
  if (!dir || calm() || !list.animate) {
    tab = id; fill(); list.scrollTop = 0; list.style.transform = ''; list.style.opacity = ''; return;
  }
  paging = true;
  const w = Math.min(list.clientWidth || 360, 420);
  const o0 = list.style.opacity || '1';
  list.style.transition = 'none';
  const out = list.animate([{ transform: `translateX(${from}px)`, opacity: o0 }, { transform: `translateX(${-dir * w * 0.45}px)`, opacity: 0 }],
    { duration: Math.max(70, 140 * (1 - Math.abs(from) / w)), easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
  const done = () => {
    tab = id; fill(); list.scrollTop = 0;
    list.style.transform = ''; list.style.opacity = '';
    out.oncancel = null; out.cancel();
    list.animate([{ transform: `translateX(${dir * w * 0.45}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: EASE });
    tabs.querySelector('.on')?.animate([{ transform: 'scale(.9)' }, { transform: 'none' }], { duration: 200, easing: EASE });
    paging = false;
  };
  out.onfinish = done;
  out.oncancel = () => { if (paging) done(); };
}
const tabIds = () => [...(prefs.drawerAll !== false || !folders().length ? ['all'] : []), ...folders().map((f) => f.id)];

function fill() {
  const q = search.value.trim().toLowerCase();
  if (!tabIds().includes(tab)) tab = tabIds()[0]; // «Все» убрана — первая папка
  const f = !q && tab !== 'all' ? folderById(tab) : null;
  // «Все» — без приложений из папок (они — в своих папках); поиск находит все
  const apps = f ? folderApps(f) : allApps().filter((a) => (q ? a.label.toLowerCase().includes(q) || (a.sys || '').toLowerCase().includes(q) || (a.pkg || '').includes(q) : !inAnyFolder(a.key)));
  renderTabs(!!q);
  list.replaceChildren();
  let letter = '';
  apps.forEach((a, i) => {
    const L = (a.label[0] || '#').toUpperCase();
    if (L !== letter && !q && !f) { letter = L; list.append(h('div', { class: 'l-d-letter' }, L)); }
    const btn = h('button', { class: 'l-d-app', 'data-key': a.key, style: { '--d': `${Math.min(i, 14) * 18}ms` } },
      prefs.appIcons && a.pkg ? h('span', { class: 'l-app-ico', html: appIconHTML(a.pkg) }) : null, h('span', {}, a.label), onHome(a.key) ? h('i', { class: 'l-d-dot', 'aria-label': t('drawer.onHome') }) : null);
    btn.addEventListener('click', () => {
      if (btn.dataset.held) return;
      if (list.dataset.swiped) return;
      openApp(a);
      closeDrawer();
    });
    list.append(btn);
  });
  if (!apps.length) list.append(h('p', { class: 'l-empty' }, f ? t('fold.empty') : q ? t('drawer.none') : t('fold.allIn')));
}

// вкладки внизу: «Все», папки, «+»; удержание папки — её меню
function renderTabs(searching) {
  const top = prefs.foldTabs === 'top';
  const tb = (id, label, icon, cls = '') => {
    const ico = icon ? iconSVG(icon) : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg>';
    // сверху — вкладки с названием (или только значки, prefs.foldLabels); справа — значки
    const b = h('button', { class: `l-d-tab ${cls} ${id !== 'all' && id !== '+' ? 'fold' : ''} ${!searching && tab === id ? 'on' : ''}`, 'data-id': id, role: 'tab', 'aria-selected': String(tab === id), 'aria-label': label, title: label,
      html: top && prefs.foldLabels !== false && id !== '+' ? `${ico}<span>${label.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</span>` : ico });
    // «Все»: удержание — убрать вкладку (вернуть — Настройки → Главный)
    if (id === 'all') {
      let timer;
      b.addEventListener('pointerdown', () => { timer = setTimeout(() => { b.dataset.held = '1'; navigator.vibrate?.(12); allMenu(); }, 450); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => clearTimeout(timer)));
    }
    b.addEventListener('click', () => {
      if (b.dataset.held) { delete b.dataset.held; return; }
      if (id === '+') return newFolder();
      const ids = tabIds(), dir = Math.sign(ids.indexOf(id) - ids.indexOf(tab)) || 1;
      if (search.value) { search.value = ''; tab = id; fill(); list.scrollTop = 0; return; }
      switchTab(id, dir);
    });
    return b;
  };
  tabs.replaceChildren(...[tabIds().includes('all') ? tb('all', t('fold.all'), 'grid') : null, ...folders().map((f) => tb(f.id, folderName(f), folderIcon(f))), tb('+', t('fold.new'), null, 'add')].filter(Boolean));
  tabs.querySelector('.on')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  const f = !searching && tab !== 'all' ? folderById(tab) : null;
  titleName.textContent = f ? folderName(f) : t('drawer.title');
}

// «Все» — убрать вкладку (приложения вне папок находит поиск; вернуть — Настройки → Главный → «Вкладка «Все»»)
function allMenu() {
  openSheet({
    title: t('fold.all'), kicker: '',
    render(body, close) {
      body.append(h('p', { class: 'l-hint' }, t('fold.allHideHint')),
        h('button', { class: 'l-pick', onclick: () => { prefs.drawerAll = false; save(); tab = tabIds()[0]; close(); fill(); changed(); } }, h('span', {}, t('fold.allHide'))));
    },
  });
}

function newFolder(withApp) {
  let name = '';
  openSheet({
    title: t('fold.new'), kicker: '',
    render(body, close) {
      const done = () => {
        if (!name.trim()) return;
        const f = addFolder(name, withApp ? [withApp] : []);
        tab = f.id; close(); fill(); changed();
        if (withApp) toast(t('fold.added')); else setTimeout(() => pickFolderApps(f), 300); // новая папка — сразу выбрать приложения
      };
      const fl = field(t('fold.name'), '', (v) => { name = v; }, { maxlength: 24 });
      fl.querySelector('input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); });
      body.append(fl, h('button', { class: 'l-btn primary', onclick: done }, t('ui.done')));
      setTimeout(() => fl.querySelector('input')?.focus(), 250);
    },
  });
}

function folderMenu(f) {
  if (!f) return;
  const key = folderKey(f.id);
  openSheet({
    title: folderName(f), kicker: '',
    render(body, close) {
      let name = folderName(f);
      body.append(
        field(t('fold.rename'), name, (v) => { name = v; renameFolder(f.id, v); fill(); changed(); }, { maxlength: 24 }),
        h('button', { class: 'l-pick l-pick-add', onclick: () => { close(); pickFolderApps(folderById(f.id)); } },
          h('span', { class: 'l-pick-ico', html: PLUS }), h('span', {}, t('fold.choose')), h('small', {}, String(folderApps(f).length))),
        h('button', { class: 'l-pick', onclick: () => { close(); pickIcon(folderIcon(f), (icon) => { setFolderIcon(f.id, icon); fill(); }); } },
          h('span', { class: 'l-fold-ico', html: iconSVG(folderIcon(f)) }), h('span', {}, t('fold.icon'))),
        h('button', { class: 'l-pick', onclick: () => {
          const home = ownHome(), there = home.findIndex((x) => x.key === key);
          if (there < 0 && home.length >= HOME_MAX) { close(); toast(t('home.full', { n: HOME_MAX })); return; }
          if (there >= 0) home.splice(there, 1); else home.push({ key, label: '' });
          save(); changed(); close(); toast(there >= 0 ? t('drawer.removed') : t('drawer.added'));
        } }, h('span', {}, onHome(key) ? t('drawer.fromHome') : t('drawer.toHome'))),
        h('button', { class: 'l-pick danger', onclick: () => { deleteFolder(f.id); tab = 'all'; close(); fill(); changed(); toast(t('fold.deleted')); } }, h('span', {}, t('fold.delete'))));
    },
  });
}

// папка с главного экрана — шторка с её приложениями
export function openFolder(id) {
  const f = folderById(id);
  if (!f) return;
  openSheet({
    title: folderName(f), kicker: '',
    render(body, close, rerender) {
      const apps = folderApps(folderById(id) || f);
      // удержать и перетащить — порядок в папке
      const box = h('div', { class: 'l-fold-list' }, apps.map((a) => {
        const b = h('button', { class: 'l-pick l-fold-app' }, h('span', {}, a.label));
        b.addEventListener('click', () => { if (b.dataset.held) return; close(); openApp(a); });
        return b;
      }));
      holdDrag(box, '.l-fold-app', { onMove: (from, to) => { moveInFolder(f.id, from, to); changed(); rerender(); } });
      body.append(box);
      if (!apps.length) body.append(h('p', { class: 'l-empty' }, t('fold.empty')));
      body.append(h('button', { class: 'l-btn', onclick: () => { close(); tab = f.id; openDrawer(); } }, t('drawer.title') + ' · ' + folderName(f)));
    },
  });
}

export function openDrawer(focus = false) {
  if (open) return;
  open = true;
  const L = layout();
  drawer.classList.remove('rail-right', 'rail-left', 'rail-top', 'rail-bottom', 'search-top', 'search-bottom');
  drawer.classList.add('rail-' + (prefs.foldTabs === 'top' ? 'top' : 'right'), 'search-' + L.search);
  // поиск сверху (под заголовком) или внизу — под рукой
  if (L.search === 'bottom') drawer.append(search); else drawer.querySelector('.l-d-head').append(search);
  search.value = '';
  fill();
  list.scrollTop = 0;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  setCover('bottom', true);
  if (focus) setTimeout(() => search.focus(), 280);
  loadApps().then(() => { if (open) fill(); }); // поставили или удалили приложение — список свежий
}

// панель для смахивания с главного экрана (panels.js): снизу, идёт за пальцем
export const drawerPanel = panel({ el: () => drawer, from: 'bottom', open: () => openDrawer(pendingFocus), close: closeDrawer, isOpen: () => open });
let pendingFocus = false;
export const setDrawerFocus = (f) => { pendingFocus = f; };

export function closeDrawer() {
  if (!open) return;
  open = false;
  search.blur();
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  setCover('bottom', false);
}

export function typeIntoSearch(ch) {
  openDrawer(true);
  search.value += ch;
  search.focus();
  fill();
}

// Приложения папки — галочками (меню папки → «Добавить приложения»; новая папка — сразу). Сверху — уже в этой папке
// (в её порядке), ниже — свободные по алфавиту; приложения из других папок не показываются (одно приложение — одна
// папка). Своё название — крупно, системное — бледно рядом; поиск — по обоим
const PLUS = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
function pickFolderApps(f) {
  if (!f) return;
  let q = '';
  openSheet({
    title: folderName(f), kicker: '', full: true,
    render(body, close) {
      const listEl = h('div', { class: 'l-check-list' });
      const row = (a, on) => h('button', { class: 'l-check' + (on ? ' on' : ''), role: 'checkbox', 'aria-checked': String(on),
        onclick: () => { setInFolder(f.id, a.key, !on); draw(); fill(); changed(); } },
        h('span', { class: 'l-check-box', 'aria-hidden': 'true' }),
        h('span', { class: 'l-check-t' }, a.label, a.sys && a.sys !== a.label ? h('small', { class: 'l-check-sys' }, a.sys) : null));
      const draw = () => {
        const cur = folderById(f.id) || f;
        const ql = q.trim().toLowerCase();
        const match = (a) => !ql || a.label.toLowerCase().includes(ql) || (a.sys || '').toLowerCase().includes(ql);
        const mine = cur.apps.map((k) => everyApp().find((a) => a.key === k)).filter((a) => a && match(a));
        const free = everyApp().filter((a) => !inAnyFolder(a.key) && match(a));
        listEl.replaceChildren(...[
          mine.length ? h('div', { class: 'l-check-k' }, t('fold.inThis')) : null,
          ...mine.map((a) => row(a, true)),
          free.length ? h('div', { class: 'l-check-k' }, t('fold.free')) : null,
          ...free.map((a) => row(a, false)),
          !mine.length && !free.length ? h('p', { class: 'l-empty' }, t('drawer.none')) : null].filter(Boolean));
      };
      body.append(
        h('input', { class: 'l-search', type: 'search', placeholder: t('drawer.search'), 'aria-label': t('drawer.search'), oninput: (e) => { q = e.target.value; draw(); } }),
        listEl, h('button', { class: 'l-btn primary', onclick: close }, t('ui.done')));
      draw();
    },
  });
}

// главный экран хранит свой список, только когда его изменили
const ownHome = () => (prefs.home = prefs.home || homeItems().map((x) => ({ ...x })));

function appMenu(a) {
  const there = onHome(a.key);
  openSheet({
    title: a.label, kicker: '',
    render(body, close) {
      // название — своё, для всех мест сразу; пустое — системное
      body.append(field(t('ren.name'), a.label === a.sys ? '' : a.label, (v) => { renameApp(a.key, v); fill(); changed(); }, { placeholder: a.sys || a.label, maxlength: 40 }));
      body.append(h('button', { class: 'l-pick', onclick: () => {
        const home = ownHome();
        if (!there && home.length >= HOME_MAX) { close(); toast(t('home.full', { n: HOME_MAX })); pickHome(() => { fill(); changed(); }); return; }
        if (there) home.splice(home.findIndex((x) => x.key === a.key), 1);
        else home.push({ key: a.key, label: '' });
        save(); fill(); changed(); close();
        toast(there ? t('drawer.removed') : t('drawer.added'));
      } }, h('span', {}, there ? t('drawer.fromHome') : t('drawer.toHome'))));
      body.append(h('div', { class: 'l-fold-k' }, t('fold.toFolder')), h('div', { class: 'l-chips' },
        // одна папка: выбрать другую — приложение переезжает; касание текущей — убрать из папки
        ...folders().map((f) => h('button', { class: `l-chip ${f.apps.includes(a.key) ? 'on' : ''}`, onclick: (e) => {
          const added = toggleInFolder(f.id, a.key);
          e.currentTarget.parentElement.querySelectorAll('.l-chip').forEach((c) => c.classList.remove('on'));
          e.currentTarget.classList.toggle('on', added);
          fill(); changed(); toast(added ? t('fold.added') : t('fold.removed'));
        } }, folderName(f))),
        h('button', { class: 'l-chip', onclick: () => { close(); newFolder(a.key); } }, '+ ' + t('fold.new'))));
      // скрыть — приложения нет нигде, кроме Настройки → «Главный» → «Скрытые»
      body.append(h('button', { class: 'l-pick danger', onclick: () => { setHidden(a.key, true); fill(); changed(); close(); toast(t('hide.done')); } }, h('span', {}, t('hide.app'))));
      if (isNative()) body.append(h('button', { class: 'l-pick', onclick: () => { Launcher.appInfo({ pkg: a.pkg }); close(); } }, h('span', {}, t('drawer.info'))));
      if (!isNative() && a.url) body.append(h('button', { class: 'l-pick', onclick: () => openUrl(a.url, a.label) }, h('span', {}, a.url)));
      if (!isNative() && (prefs.web || []).some((w) => w.id === a.key)) {
        body.append(h('button', { class: 'l-pick danger', onclick: () => {
          prefs.web = prefs.web.filter((w) => w.id !== a.key);
          if (prefs.home) prefs.home = prefs.home.filter((x) => x.key !== a.key);
          save(); loadApps().then(fill); changed(); close();
        } }, h('span', {}, t('drawer.removeLink'))));
      }
    },
  });
}

// веб-версия: своя ссылка вместо приложения
function addWebLink() {
  const draft = { id: 'w' + Date.now().toString(36), name: '', url: '' };
  openSheet({
    title: t('drawer.addLink'), kicker: '',
    render(body, close) {
      body.append(
        field(t('pick.name'), '', (v) => { draft.name = v; }),
        field(t('pick.url'), '', (v) => { draft.url = v; }, { placeholder: 'https://', autocapitalize: 'off' }),
        h('button', { class: 'l-btn primary', onclick: () => {
          if (!draft.name.trim() || !draft.url.trim()) return toast(t('drawer.needBoth'));
          prefs.web = [...(prefs.web || []), { id: draft.id, name: draft.name.trim(), url: draft.url.trim() }];
          save(); loadApps().then(fill); close();
        } }, t('ui.done')));
    },
  });
}
