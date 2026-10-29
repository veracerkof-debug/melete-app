// Ἐλάχιστον (Elachiston) — отдельное приложение главного экрана телефона (docs/launcher.md), своё имя, пакет и ключ;
// живёт в репозитории Melete и берёт из него общий код (темы, чтение, статистику), с самим Melete связан мостом.
// Минимальный главный экран: часы, дата, Melete, баланс, приложения и значки; жесты, панели, обновление из GitHub.
import './launcher.css';
import { prefs, isChurch, HOME_MAX, save } from './data.js';
import { initI18n, t } from './i18n.js';
import { applyLook } from './look.js';
import { mountHome, renderHome, refreshTracker, refreshBalance, fitApps } from './home.js';
import { attachGestures, defaultGesture } from './gestures.js';
import { mountDrawer, openDrawer, closeDrawer, drawerOpen, typeIntoSearch, openFolder, drawerPanel, setDrawerFocus } from './drawer.js';
import { openSettings, editHomeItem, editDockSlot } from './settings.js';
import { mountArrange, enterArrange, exitArrange, isEditing } from './arrange.js';
import { pickAction } from './pickers.js';
import { homeItems, dockSlots } from './apps.js';
import { registerCommand, runAction, setNotify, describeAction, COMMANDS } from './actions.js';
import { loadApps, rolesOf, apps, appName } from './apps.js';
import { refreshMelete, openMelete as openMeleteApp, watchMelete, onMeleteLive, meleteControl } from './melete.js';
import { autoUpdate, onUpdate, install } from './update.js';
import { openMoney, moneyOpen, moneyBack, moneyPanel } from './money.js';
import { openNotes, notesOpen, notesBack, closeNotes, notesPanel } from './notes.js';
import { dailyCopy } from './backup.js';
import { setAppIconLoader } from './icons.js';
import { isNative, Launcher } from './native.js';
import { h, toast, sheetOpen, closeTopSheet } from './ui.js';

const root = document.getElementById('l');
root.tabIndex = -1; // сюда возвращается фокус из кошелька и блокнота (клавиатура компьютера снова у главного экрана)
root.style.outline = 'none';
// отступы системы с Android (MainActivity): в CSS главного экрана и во все страницы-панели (кошелёк, блокнот)
const INSETS = { t: 0, r: 0, b: 0, l: 0 };
function applyInsets(doc) {
  const st = doc?.documentElement?.style; if (!st) return;
  st.setProperty('--l-sat', INSETS.t + 'px'); st.setProperty('--l-sar', INSETS.r + 'px'); st.setProperty('--l-sab', INSETS.b + 'px'); st.setProperty('--l-sal', INSETS.l + 'px');
  st.setProperty('--l-auto', getComputedStyle(document.documentElement).getPropertyValue('--l-auto') || '1');
}
window.__insets = (t, r, b, l) => {
  Object.assign(INSETS, { t: +t || 0, r: +r || 0, b: +b || 0, l: +l || 0 });
  applyInsets(document);
  applyLook(); // авто-размер зависит от места без отступов
  applyInsets(document);
  document.querySelectorAll('iframe.l-money').forEach((f) => { try { applyInsets(f.contentDocument); } catch { /* */ } });
  requestAnimationFrame(fitApps); // отступы изменили место — список приложений пересчитать
};
window.__applyInsets = applyInsets;
window.__homeFocus = () => { try { root.focus({ preventScroll: true }); } catch { /* */ } };
const home = h('main', { class: 'l-home' });
root.append(home);
// фокус в поле ввода может прокрутить контейнер с overflow: hidden — возвращаем
root.addEventListener('scroll', () => { root.scrollTop = 0; root.scrollLeft = 0; });

// родные значки приложений — у системы (Android); в браузере их нет
if (isNative()) setAppIconLoader((pkg) => Launcher.appIcon({ pkg, size: 96 }).then((r) => r?.src || null));
initI18n(prefs.lang);
applyLook();
setNotify(toast);

// своё назначение жеста; убранная команда (тихий экран, стих, смена часов) — как по умолчанию
const known = (a) => a && (a.t !== 'cmd' || COMMANDS.some((c) => c.id === a.id));
const gestureOf = (id) => (known(prefs.gestures[id]) ? prefs.gestures[id] : defaultGesture(id, { church: isChurch(), roles: rolesOf() }));
const refresh = () => { initI18n(prefs.lang); applyLook(); renderHome(); };
const openMelete = (route) => openMeleteApp(() => toast(t('melete.none')), route);

// — Команды —
registerCommand('drawer', () => openDrawer(false));
registerCommand('search', () => openDrawer(true));
registerCommand('settings', () => openSettings(refresh, gestureOf));
registerCommand('melete', () => openMelete());
registerCommand('money', openMoney);
registerCommand('notes', openNotes);
registerCommand('none', () => {});

// — Сборка —
mountHome(home, {
  onBlockHold: (id) => enterArrange(id),
  editing: () => isEditing(),
  onFolder: (id) => openFolder(id),
  onSettings: (what) => openSettings(refresh, gestureOf, what === 'tracker' ? 'home' : what),
  onMelete: openMelete,
  onMeleteControl: (a) => meleteControl(a),
  onWallet: () => openMoney(),
  onGesture: (id) => runAction(gestureOf(id), apps),
  describe: (a) => describeAction(a, appName),
});
mountDrawer(root, { onChange: renderHome });

// правка главного на месте: удержание элемента (arrange.js)
mountArrange(home, {
  renderHome,
  editHomeItem: (i, after) => editHomeItem(i, after, after),
  editDockSlot: (i, after) => editDockSlot(i, after),
  addApp: (after) => pickAction(null, (a) => {
    prefs.home = prefs.home || homeItems().map((x) => ({ ...x }));
    if (prefs.home.length < HOME_MAX) prefs.home.push({ key: a.key, label: '' });
    save(); after();
  }, { appsOnly: true }),
  addDock: (after) => {
    prefs.dock = prefs.dock || dockSlots().map((x) => ({ ...x, action: { ...x.action } }));
    prefs.dock.push({ icon: 'grid', action: { t: 'cmd', id: 'drawer' } });
    save(); after();
    editDockSlot(prefs.dock.length - 1, after);
  },
});

const blocked = () => sheetOpen() || drawerOpen() || isEditing();
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
  onBlockHold: (id) => enterArrange(id),
  onGesture: (id) => runAction(gestureOf(id), apps),
  onDragStart: (dir) => { dragPanel = panelFor(dir); if (dragPanel && !dragPanel.start(true)) dragPanel = null; return !!dragPanel; },
  onDrag: (dir, px) => dragPanel?.move(px),
  onDragEnd: (dir, px, v) => { const p = dragPanel; dragPanel = null; return p ? p.end(px, v, true) : false; },
});

loadApps().then(renderHome);

// Возвращение на главный экран: свежие приложения и данные Melete (папка — только если файл поменялся)
const syncMelete = () => refreshMelete().then((ch) => { if (ch) renderHome(); });
syncMelete();
// живое состояние Melete: пришло — перерисовать блок; при возвращении на экран — попросить свежее
watchMelete();
onMeleteLive(() => refreshTracker());
addEventListener('wallet:changed', refreshBalance);
document.addEventListener('visibilitychange', () => {
  // вернулись: перерисовать, только если что-то поменялось (новое приложение, данные Melete) — без рывков
  if (!document.hidden) { syncMelete(); watchMelete(); loadApps().then((ch) => { if (ch) renderHome(); }); return; }
  // ушли в другое приложение или в недавние — по возвращении главный чистый: шторки, все приложения, блокнот и правка
  // закрыты мгновенно, без анимаций (в недавних главный не шевелится); «Домой» на главном ничего не меняет (onNewIntent)
  const de = document.documentElement;
  de.classList.add('l-instant');
  while (closeTopSheet()) { /* все шторки */ }
  if (drawerOpen()) closeDrawer();
  if (notesOpen()) closeNotes();
  exitArrange();
  setTimeout(() => de.classList.remove('l-instant'), 400);
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
  if (closeTopSheet()) return;
  if (exitArrange()) return;
  if (notesOpen()) notesBack();
  else if (moneyOpen()) moneyBack();
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

addEventListener('resize', (() => { let r; return () => { clearTimeout(r); r = setTimeout(() => { applyLook(); document.querySelectorAll('iframe.l-money').forEach((f) => { try { applyInsets(f.contentDocument); } catch { /* */ } }); renderHome(); }, 150); }; })());
