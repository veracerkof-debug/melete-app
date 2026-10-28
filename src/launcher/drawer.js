// Главный экран: все приложения (смахнуть вверх) — по алфавиту, с поиском. Удержание — меню приложения.
import { prefs, save, isChurch } from './data.js';
import { allApps, homeItems, loadApps } from './apps.js';
import { openApp, openUrl } from './actions.js';
import { isNative, Launcher } from './native.js';
import { t } from './i18n.js';
import { h, openSheet, field, toast } from './ui.js';
import { folders, folderById, folderName, folderApps, folderIcon, folderKey, addFolder, renameFolder, setFolderIcon, deleteFolder, toggleInFolder } from './folders.js';
import { iconSVG } from './icons.js';
import { pickIcon } from './pickers.js';
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
      h('div', { class: 'l-d-title' }, titleName = h('span', { class: 'l-d-name' }, t('drawer.title')), isChurch() ? h('span', { class: 'l-d-el', lang: 'el' }, 'πάντα') : null,
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
  // смахнуть влево-вправо по списку — соседняя вкладка
  let sx = null, sy = 0;
  list.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  list.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && !search.value) {
      const ids = ['all', ...folders().map((f) => f.id)];
      const i = Math.max(0, ids.indexOf(tab)) + (dx < 0 ? 1 : -1);
      if (i >= 0 && i < ids.length) { tab = ids[i]; list.dataset.swiped = '1'; fill(); setTimeout(() => delete list.dataset.swiped, 50); }
    }
  });
  drawer.addEventListener('wheel', (e) => { if (e.deltaY < -40 && list.scrollTop <= 0) closeDrawer(); }, { passive: true });
}

const onHome = (key) => homeItems().some((x) => x.key === key);

function fill() {
  const q = search.value.trim().toLowerCase();
  if (tab !== 'all' && !folderById(tab)) tab = 'all';
  const f = !q && tab !== 'all' ? folderById(tab) : null;
  const apps = f ? folderApps(f) : allApps().filter((a) => !q || a.label.toLowerCase().includes(q) || (a.pkg || '').includes(q));
  renderTabs(!!q);
  list.replaceChildren();
  let letter = '';
  apps.forEach((a, i) => {
    const L = (a.label[0] || '#').toUpperCase();
    if (L !== letter && !q && !f) { letter = L; list.append(h('div', { class: 'l-d-letter' }, L)); }
    const btn = h('button', { class: 'l-d-app', style: { '--d': `${Math.min(i, 14) * 18}ms` } }, h('span', {}, a.label), onHome(a.key) ? h('i', { class: 'l-d-dot', 'aria-label': t('drawer.onHome') }) : null);
    let timer;
    btn.addEventListener('pointerdown', () => { timer = setTimeout(() => { btn.dataset.held = '1'; navigator.vibrate?.(12); appMenu(a); }, 450); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, () => clearTimeout(timer)));
    btn.addEventListener('contextmenu', (e) => { e.preventDefault(); appMenu(a); });
    btn.addEventListener('click', () => {
      if (btn.dataset.held) { delete btn.dataset.held; return; }
      if (list.dataset.swiped) return;
      openApp(a);
      closeDrawer();
    });
    list.append(btn);
  });
  if (!apps.length) list.append(h('p', { class: 'l-empty' }, f ? t('fold.empty') : t('drawer.none')));
}

// вкладки внизу: «Все», папки, «+»; удержание папки — её меню
function renderTabs(searching) {
  const tb = (id, label, icon, cls = '') => {
    const b = h('button', { class: `l-d-tab ${cls} ${!searching && tab === id ? 'on' : ''}`, role: 'tab', 'aria-selected': String(tab === id), 'aria-label': label, title: label,
      html: icon ? iconSVG(icon) : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg>' });
    let timer;
    if (id !== 'all' && id !== '+') {
      b.addEventListener('pointerdown', () => { timer = setTimeout(() => { b.dataset.held = '1'; navigator.vibrate?.(12); folderMenu(folderById(id)); }, 450); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => clearTimeout(timer)));
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); folderMenu(folderById(id)); });
    }
    b.addEventListener('click', () => {
      if (b.dataset.held) { delete b.dataset.held; return; }
      if (id === '+') return newFolder();
      tab = id; search.value = ''; fill(); list.scrollTop = 0;
    });
    return b;
  };
  tabs.replaceChildren(tb('all', t('fold.all'), 'grid'), ...folders().map((f) => tb(f.id, folderName(f), folderIcon(f))), tb('+', t('fold.new'), null, 'add'));
  tabs.querySelector('.on')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  const f = !searching && tab !== 'all' ? folderById(tab) : null;
  titleName.textContent = f ? folderName(f) : t('drawer.title');
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
        toast(withApp ? t('fold.added') : folderName(f));
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
        h('button', { class: 'l-pick', onclick: () => { close(); pickIcon(folderIcon(f), (icon) => { setFolderIcon(f.id, icon); fill(); }); } },
          h('span', { class: 'l-fold-ico', html: iconSVG(folderIcon(f)) }), h('span', {}, t('fold.icon'))),
        h('button', { class: 'l-pick', onclick: () => {
          const home = ownHome(), there = home.findIndex((x) => x.key === key);
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
    render(body, close) {
      const apps = folderApps(f);
      apps.forEach((a) => body.append(h('button', { class: 'l-pick l-fold-app', onclick: () => { close(); openApp(a); } }, h('span', {}, a.label))));
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
  drawer.classList.add('rail-' + L.rail, 'search-' + L.search);
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

// главный экран хранит свой список, только когда его изменили
const ownHome = () => (prefs.home = prefs.home || homeItems().map((x) => ({ ...x })));

function appMenu(a) {
  const there = onHome(a.key);
  openSheet({
    title: a.label, kicker: '',
    render(body, close) {
      body.append(h('button', { class: 'l-pick', onclick: () => {
        const home = ownHome();
        if (there) home.splice(home.findIndex((x) => x.key === a.key), 1);
        else home.push({ key: a.key, label: '' });
        save(); fill(); changed(); close();
        toast(there ? t('drawer.removed') : t('drawer.added'));
      } }, h('span', {}, there ? t('drawer.fromHome') : t('drawer.toHome'))));
      body.append(h('div', { class: 'l-fold-k' }, t('fold.toFolder')), h('div', { class: 'l-chips' },
        ...folders().map((f) => h('button', { class: `l-chip ${f.apps.includes(a.key) ? 'on' : ''}`, onclick: (e) => {
          const added = toggleInFolder(f.id, a.key);
          e.currentTarget.classList.toggle('on', added);
          fill(); changed(); toast(added ? t('fold.added') : t('fold.removed'));
        } }, folderName(f))),
        h('button', { class: 'l-chip', onclick: () => { close(); newFolder(a.key); } }, '+ ' + t('fold.new'))));
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
