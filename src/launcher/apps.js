// Главный экран: приложения. Android — список приложений со значком запуска и приложения по ролям (LauncherPlugin);
// браузер (знакомство с главным экраном) — несколько ссылок вместо приложений. У каждого — ключ key (pkg или id).
import { isNative, Launcher } from './native.js';
import { prefs, save, HOME_MAX } from './data.js';
import { t } from './i18n.js';

const WEB = [
  { id: 'web.mail', url: 'mailto:' }, { id: 'web.maps', url: 'https://www.openstreetmap.org' },
  { id: 'web.music', url: 'https://music.youtube.com' }, { id: 'web.video', url: 'https://www.youtube.com' },
  { id: 'web.search', url: 'https://duckduckgo.com' }, { id: 'web.melete', url: 'https://veracerkof-debug.github.io/melete-app/' },
  { id: 'web.tg', url: 'https://web.telegram.org' }, { id: 'web.wa', url: 'https://web.whatsapp.com' },
  { id: 'web.calendar', url: 'https://calendar.google.com' }, { id: 'web.photos', url: 'https://photos.google.com' },
  { id: 'web.weather', url: 'https://www.windy.com' }, { id: 'web.translate', url: 'https://translate.google.com' },
  { id: 'web.wiki', url: 'https://ru.wikipedia.org' },
];

let list = [];
let roles = {};
const subs = new Set();
export const onApps = (fn) => subs.add(fn);

let sig = '';
// загрузить список; вернёт true, если он изменился (иначе главный не перерисовывается — без рывков при возвращении)
export async function loadApps() {
  if (isNative()) {
    try {
      const [{ apps }, r] = await Promise.all([Launcher.apps(), Launcher.roles()]);
      list = apps.filter((a) => !a.self).map((a) => ({ key: a.pkg, pkg: a.pkg, label: a.label }));
      roles = r || {};
    } catch { list = []; }
  } else {
    list = [...WEB.map((w) => ({ key: w.id, url: w.url, label: t(w.id) })), ...((prefs.web || []).map((w) => ({ key: w.id, url: w.url, label: w.name })))];
  }
  applyNames();
  const now = JSON.stringify([list.map((a) => a.key + a.label), roles]);
  if (now === sig) return false;
  sig = now;
  subs.forEach((fn) => fn());
  return true;
}

// Скрытые приложения (решение автора 2026-10-28 — самая важная функция): их нет во «Всех приложениях», в поиске,
// на главном, в значках, в папках и в выборе приложения; вернуть или открыть — Настройки → «Главный» → «Скрытые»
export const isHidden = (key) => (prefs.hidden || []).includes(key);
export function setHidden(key, on = true) {
  const s = new Set(prefs.hidden || []);
  if (on) s.add(key); else s.delete(key);
  prefs.hidden = [...s];
  // скрыли — уходит и с главного, и из значков (списки становятся своими; вернуть на место — как обычно)
  if (on) {
    prefs.home = (prefs.home || defaultHome()).filter((x) => x.key !== key);
    prefs.dock = (prefs.dock || defaultDock()).filter((d) => !(d.action?.t === 'app' && d.action.key === key));
  }
  save();
}
export const hiddenApps = () => list.filter((a) => isHidden(a.key));
export const allApps = () => list.filter((a) => !isHidden(a.key));

// Свои названия (решение автора 2026-10-29): одно название приложения — везде; системное остаётся в a.sys (поиск
// находит по обоим). Пустое — снова системное
function applyNames() {
  const names = prefs.names || {};
  list.forEach((a) => { a.sys = a.sys || a.label; a.label = names[a.key] || a.sys; });
  list.sort((a, b) => a.label.localeCompare(b.label));
}
export function renameApp(key, name) {
  const names = { ...(prefs.names || {}) };
  const v = String(name || '').trim().slice(0, 40);
  if (v) names[key] = v; else delete names[key];
  prefs.names = names;
  // своя подпись на главном (прежняя) уступает общему названию
  (prefs.home || []).forEach((x) => { if (x.key === key) x.label = ''; });
  applyNames();
  save();
  subs.forEach((fn) => fn());
}
export const systemName = (key) => appOf(key)?.sys || appOf(key)?.label || '';
export const appOf = (key) => list.find((a) => a.key === key) || null;
export const rolesOf = () => roles;

// Действие { t: 'app', key } → приложение
export const apps = { find: (a) => appOf(a.key) };
export const appName = (a) => appOf(a.key)?.label || null;

// По умолчанию: главный экран — приложения по ролям, значки внизу — телефон, сообщения, поиск, камера, настройки
export function defaultHome() {
  if (!isNative()) return [{ key: 'f:comm', label: '' }, ...['web.music', 'web.maps', 'web.melete'].map((key) => ({ key, label: '' }))];
  return ['phone', 'sms', 'browser', 'music', 'maps', 'camera'].map((r) => roles[r]).filter((k) => k && appOf(k))
    .map((key) => ({ key, label: '' }));
}
export function defaultDock() {
  const app = (role, icon) => (roles[role] ? { icon, action: { t: 'app', key: roles[role] } } : null);
  // только приложения и ссылки (автор): поиск — смахнуть вниз, настройки — удержание, кошелёк — смахнуть влево
  if (!isNative()) return [['web.mail', 'mail'], ['web.music', 'music'], ['web.maps', 'pin'], ['web.photos', 'image']].map(([key, icon]) => ({ icon, action: { t: 'app', key } }));
  return [
    app('phone', 'phone') || { icon: 'phone', action: { t: 'cmd', id: 'dial' } },
    app('sms', 'message'),
    app('browser', 'globe'),
    app('gallery', 'image'),
    app('camera', 'camera') || { icon: 'camera', action: { t: 'cmd', id: 'camera' } },
  ].filter(Boolean);
}
export const homeItems = () => (prefs.home || defaultHome()).slice(0, HOME_MAX);
export const dockSlots = () => prefs.dock || defaultDock();
