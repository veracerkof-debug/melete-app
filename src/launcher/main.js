// Ἐλάχιστον (Elachiston) — отдельное приложение главного экрана телефона (docs/launcher.md), своё имя, пакет и ключ;
// живёт в репозитории Melete и берёт из него общий код (темы, чтение, статистику), с самим Melete связан мостом.
// Часы, живые обои, приложения, значки, жесты, трекер чтения и практики, строка плеера, обновление из GitHub.
import './launcher.css';
import { prefs, setPrefs, isChurch } from './data.js';
import { initI18n, t, getLang } from './i18n.js';
import { applyLook } from './look.js';
import { mountHome, renderHome, renderSubline, renderPlayer, currentVerse, clockOpts, refreshTracker, refreshBalance } from './home.js';
import { attachGestures, defaultGesture } from './gestures.js';
import { mountDrawer, openDrawer, closeDrawer, drawerOpen, typeIntoSearch, openFolder, drawerPanel, setDrawerFocus } from './drawer.js';
import { openSettings, editHomeItem, editDockSlot } from './settings.js';
import { registerCommand, runAction, setNotify, describeAction, openUrl } from './actions.js';
import { loadApps, rolesOf, apps, appName } from './apps.js';
import { clocksFor } from './clocks.js';
import { mountWallpaper } from './wallpapers.js';
import { startNowPlaying, onNowPlaying } from './nowplaying.js';
import { verseText } from './scripture.js';
import { verseLinks } from './explain.js';
import { refreshMelete, openMelete as openMeleteApp, watchMelete, onMeleteLive, meleteControl } from './melete.js';
import { autoUpdate, onUpdate, install } from './update.js';
import { verseByKey } from '../core/verses.js';
import { openMoney, moneyOpen, moneyBack, moneyPanel } from './money.js';
import { openNotes, notesOpen, notesBack, closeNotes, notesPanel } from './notes.js';
import { dailyCopy } from './backup.js';
import { h, toast, openSheet, sheetOpen, closeTopSheet } from './ui.js';

const root = document.getElementById('l');
root.tabIndex = -1; // сюда возвращается фокус из кошелька и блокнота (клавиатура компьютера снова у главного экрана)
root.style.outline = 'none';
window.__homeFocus = () => { try { root.focus({ preventScroll: true }); } catch { /* */ } };
const home = h('main', { class: 'l-home' });
root.append(home);
// фокус в поле ввода может прокрутить контейнер с overflow: hidden — возвращаем
root.addEventListener('scroll', () => { root.scrollTop = 0; root.scrollLeft = 0; });

initI18n(prefs.lang);
applyLook();
setNotify(toast);

const gestureOf = (id) => prefs.gestures[id] || defaultGesture(id, { church: isChurch(), roles: rolesOf() });
const refresh = () => { initI18n(prefs.lang); applyLook(); renderHome(); };
const openMelete = (route) => openMeleteApp(() => toast(t('melete.none')), route);

// — Тихий экран: время и свеча (в церковном режиме — «найдёте покой душам вашим», Мф 11:29) —
let rest = null;
function openRest() {
  if (rest) return;
  const time = h('div', { class: 'l-rest-time' });
  const upd = () => { const d = new Date(); time.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  upd();
  const timer = setInterval(upd, 5000);
  const v = isChurch() ? verseByKey('mt11_29') : null;
  const vt = v ? verseText(v, getLang()) : null;
  rest = h('div', { class: 'l-rest', role: 'dialog', 'aria-label': t('cmd.rest') },
    h('div', { class: 'l-rest-flame', 'aria-hidden': 'true', html: '<svg viewBox="0 0 40 80"><defs><radialGradient id="lfg" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#fff6d8"/><stop offset=".5" stop-color="#f3c46b"/><stop offset="1" stop-color="#c47a2c" stop-opacity="0"/></radialGradient></defs><path class="fl" d="M20 6C14 22 9 30 9 42a11 11 0 0 0 22 0C31 30 26 22 20 6z" fill="url(#lfg)"/><rect x="17" y="54" width="6" height="26" rx="1" fill="#e8e2d4" opacity=".85"/></svg>' }),
    time,
    v ? h('p', { class: 'l-rest-el', lang: 'el' }, v.gr) : null,
    vt ? h('p', { class: 'l-rest-tr' }, `${vt.text} · ${vt.ref}`) : null,
    h('small', {}, t('rest.back')));
  rest.addEventListener('click', () => {
    clearInterval(timer);
    const el = rest;
    rest = null;
    el.classList.remove('show');
    setTimeout(() => el.remove(), 600);
  });
  root.append(rest);
  requestAnimationFrame(() => rest.classList.add('show'));
}

// — Стих дня (церковный режим) —
function openVerse() {
  openSheet({
    title: t('verse.title'), kicker: 'ἀνάγνωσις',
    render(body, _c, rerender) {
      const v = currentVerse();
      const vt = verseText(v, getLang());
      body.append(
        h('div', { class: 'l-verse' },
          h('p', { class: 'v-el', lang: 'el' }, v.gr),
          h('p', { class: 'v-tr' }, vt.text),
          h('div', { class: 'v-ref' }, vt.ref)),
        h('div', { class: 'l-btn-row' },
          h('button', { class: 'l-btn', 'aria-label': t('verse.prev'), onclick: () => { setPrefs({ verseOffset: prefs.verseOffset - 1 }); renderSubline(); rerender(); } }, '←'),
          h('button', { class: 'l-btn', onclick: () => { setPrefs({ verseOffset: 0 }); renderSubline(); rerender(); } }, t('verse.today')),
          h('button', { class: 'l-btn', 'aria-label': t('verse.next'), onclick: () => { setPrefs({ verseOffset: prefs.verseOffset + 1 }); renderSubline(); rerender(); } }, '→')),
        h('div', { class: 'l-ex-links' }, ...verseLinks(v, vt.ref).map((l) => h('button', { class: 'l-ex-link', onclick: () => openUrl(l.url, l.label) }, h('span', {}, l.label), h('small', {}, l.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])))));
    },
  });
}

// — Команды —
registerCommand('drawer', () => openDrawer(false));
registerCommand('search', () => openDrawer(true));
registerCommand('settings', () => openSettings(refresh, gestureOf));
registerCommand('melete', () => openMelete());
registerCommand('money', openMoney);
registerCommand('notes', openNotes);
registerCommand('verseNext', () => { if (!isChurch()) return; setPrefs({ verseOffset: prefs.verseOffset + 1 }); renderSubline(); });
registerCommand('verseOpen', () => { if (isChurch()) openVerse(); });
registerCommand('clock', () => {
  const list = clocksFor(clockOpts()).filter((c) => c.id !== 'none');
  const next = list[(list.findIndex((c) => c.id === prefs.clock) + 1) % list.length];
  setPrefs({ clock: next.id });
  renderHome();
  toast(t('clock.' + next.id));
});
registerCommand('rest', openRest);
registerCommand('none', () => {});

// — Сборка —
mountWallpaper(root, () => ({ id: prefs.wallpaper, full: prefs.clock === 'none', church: isChurch() }));
mountHome(home, {
  onAppHold: (i) => editHomeItem(i, null, refresh),
  onFolder: (id) => openFolder(id),
  onDockHold: (i) => editDockSlot(i, refresh),
  onVerse: openVerse,
  onSettings: (what) => openSettings(refresh, gestureOf, what === 'tracker' ? 'home' : what),
  onMelete: openMelete,
  onMeleteControl: (a) => meleteControl(a),
  onWallet: () => openMoney(),
  onGesture: (id) => runAction(gestureOf(id), apps),
  describe: (a) => describeAction(a, appName),
});
mountDrawer(root, { onChange: renderHome });

const blocked = () => sheetOpen() || drawerOpen() || !!rest;
// панель за пальцем: какое действие назначено на смахивание — такая панель и тянется (всё приложения / кошелёк / блокнот)
let dragPanel = null;
const panelFor = (dir) => {
  const a = gestureOf(dir);
  if (a?.t !== 'cmd') return null;
  if (a.id === 'drawer' || a.id === 'search') { setDrawerFocus(a.id === 'search'); return drawerPanel; }
  if (a.id === 'money') return moneyPanel;
  if (a.id === 'notes') return notesPanel;
  return null;
};
attachGestures(home, {
  isBlocked: blocked,
  onGesture: (id) => runAction(gestureOf(id), apps),
  onDragStart: (dir) => { dragPanel = panelFor(dir); if (dragPanel && !dragPanel.start(true)) dragPanel = null; return !!dragPanel; },
  onDrag: (dir, px) => dragPanel?.move(px),
  onDragEnd: (dir, px, v) => { const p = dragPanel; dragPanel = null; return p ? p.end(px, v, true) : false; },
});

loadApps().then(renderHome);
onNowPlaying(renderPlayer);
startNowPlaying();

// Возвращение на главный экран: свежие приложения и данные Melete (папка — только если файл поменялся)
const syncMelete = () => refreshMelete().then((ch) => { if (ch) renderHome(); });
syncMelete();
// живое состояние Melete: пришло — перерисовать блок; при возвращении на экран — попросить свежее
watchMelete();
onMeleteLive(() => refreshTracker());
addEventListener('wallet:changed', refreshBalance);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { syncMelete(); watchMelete(); loadApps().then(renderHome); return; }
  // ушли в другое приложение — по возвращении главный экран чистый: шторки, все приложения и блокнот закрыты
  // (кошелёк закрывается сам, money.js); жест «Домой» на главном экране ничего не меняет (MainActivity.onNewIntent)
  while (closeTopSheet()) { /* все шторки */ }
  if (drawerOpen()) closeDrawer();
  if (notesOpen()) closeNotes();
});

// Обновление из GitHub: «автоматически» — раз в сутки; скачано — тихая полоса «Установить»
autoUpdate();
// копия данных на телефоне — раз в сутки (backup.js)
setTimeout(() => dailyCopy(), 5000);
onUpdate((u) => {
  let bar = root.querySelector('.l-upd');
  if (u.st !== 'ready') { bar?.remove(); return; }
  if (bar) return;
  bar = h('button', { class: 'l-upd', onclick: () => install() }, t('upd.ready'));
  root.append(bar);
});

// «Назад» Android (HomeActivity) и Esc: закрыть то, что открыто; главный экран не закрывается
window.__launcherBack = () => {
  if (notesOpen()) notesBack();
  else if (moneyOpen()) moneyBack();
  else if (rest) rest.click();
  else if (!closeTopSheet() && drawerOpen()) closeDrawer();
};
// Клавиатура (веб, компьютер): стрелки — смахивания, буква — поиск
const KEYS = { ArrowUp: 'swipeUp', ArrowDown: 'swipeDown', ArrowLeft: 'swipeLeft', ArrowRight: 'swipeRight' };
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return window.__launcherBack();
  if (blocked() || e.metaKey || e.ctrlKey || e.altKey) return;
  if (KEYS[e.key]) { e.preventDefault(); runAction(gestureOf(KEYS[e.key]), apps); return; }
  if (e.key.length === 1 && /\S/.test(e.key)) { e.preventDefault(); typeIntoSearch(e.key); }
});

// — Вступление: свет раскрывает экран (в церковном режиме — «Γενηθήτω φῶς», Быт 1:3) —
if (prefs.intro && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const church = isChurch();
  const intro = h('div', { class: 'l-intro', 'aria-hidden': 'true' }, h('div', { class: 'l-intro-light' }),
    church ? h('p', { lang: 'el' }, 'Γενηθήτω φῶς') : null, church ? h('small', {}, t('intro.text')) : null);
  root.append(intro);
  home.classList.add('pre');
  setTimeout(() => intro.classList.add('go'), church ? 900 : 200);
  setTimeout(() => home.classList.remove('pre'), church ? 1150 : 450);
  setTimeout(() => intro.remove(), church ? 2100 : 1300);
}

addEventListener('resize', (() => { let r; return () => { clearTimeout(r); r = setTimeout(renderHome, 150); }; })());
