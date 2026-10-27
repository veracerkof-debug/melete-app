// Главный экран: приложения. Android — список приложений со значком запуска и приложения по ролям (LauncherPlugin);
// браузер (знакомство с главным экраном) — несколько ссылок вместо приложений. У каждого — ключ key (pkg или id).
import { isNative, Launcher } from './native.js';
import { prefs } from './data.js';
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
  list.sort((a, b) => a.label.localeCompare(b.label));
  subs.forEach((fn) => fn());
  return list;
}

export const allApps = () => list;
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
export const homeItems = () => prefs.home || defaultHome();
export const dockSlots = () => prefs.dock || defaultDock();
