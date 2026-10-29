// Папки: в «Всех приложениях» — вкладки внизу, на главном экране — строка-название (ключ «f:<id>»), касание — шторка
// с приложениями папки. Пока папки не меняли — примеры по ролям системы (Android) или по ссылкам (браузер).
import { prefs, save } from './data.js';
import { allApps, appOf, rolesOf, isHidden } from './apps.js';
import { isNative } from './native.js';
import { t } from './i18n.js';

const keyOf = (id) => 'f:' + id;
export const isFolderKey = (key) => typeof key === 'string' && key.startsWith('f:');
export const folderOfKey = (key) => (isFolderKey(key) ? folderById(key.slice(2)) : null);

function examples() {
  if (!isNative()) {
    return [
      { id: 'comm', icon: 'message', apps: ['web.mail', 'web.tg', 'web.wa', 'web.calendar'] },
      { id: 'media', icon: 'music', apps: ['web.music', 'web.video', 'web.photos', 'web.melete'] },
      { id: 'tools', icon: 'globe', apps: ['web.maps', 'web.weather', 'web.translate', 'web.wiki', 'web.search'] },
    ];
  }
  const r = rolesOf();
  const pick = (...roles) => roles.map((x) => r[x]).filter(Boolean);
  return [
    { id: 'comm', icon: 'message', apps: pick('phone', 'sms', 'mail', 'calendar') },
    { id: 'media', icon: 'music', apps: pick('music', 'gallery', 'camera') },
    { id: 'tools', icon: 'globe', apps: pick('browser', 'maps', 'clock') },
  ].filter((f) => f.apps.length);
}

export const folders = () => prefs.folders || examples();
export const folderById = (id) => folders().find((f) => f.id === id) || null;
export const folderName = (f) => f.name || t('fold.' + f.id);
export const folderIcon = (f) => f.icon || 'star';
// приложения папки — в своём порядке (переставляются удержанием и перетаскиванием, DECISIONS 2026-10-29)
export const folderApps = (f) => f.apps.filter((k) => !isHidden(k)).map(appOf).filter(Boolean);
// в какой-нибудь папке — такого приложения во «Всех» нет (только в его папках и в поиске)
export const inAnyFolder = (key) => folders().some((f) => f.apps.includes(key));
export const foldersOfApp = (key) => folders().filter((f) => f.apps.includes(key));

// изменили — папки хранятся свои (с названиями примеров, чтобы язык не менял имя, данное человеком)
function own() {
  if (!prefs.folders) prefs.folders = examples().map((f) => ({ ...f, name: folderName(f), apps: [...f.apps] }));
  return prefs.folders;
}

export function addFolder(name, apps = []) {
  const f = { id: Date.now().toString(36), name: name.trim(), icon: 'star', apps };
  own().push(f); save();
  return f;
}
export function setFolderIcon(id, icon) { const f = own().find((x) => x.id === id); if (f) { f.icon = icon; save(); } }
export function renameFolder(id, name) { const f = own().find((x) => x.id === id); if (f && name.trim()) { f.name = name.trim(); save(); } }
export function deleteFolder(id) {
  prefs.folders = own().filter((x) => x.id !== id);
  if (prefs.home) prefs.home = prefs.home.filter((x) => x.key !== keyOf(id));
  save();
}
export function toggleInFolder(id, key) {
  const f = own().find((x) => x.id === id);
  if (!f) return false;
  const i = f.apps.indexOf(key);
  if (i >= 0) f.apps.splice(i, 1); else f.apps.push(key);
  save();
  return i < 0;
}
export function setInFolder(id, key, on) {
  const f = own().find((x) => x.id === id);
  if (!f) return;
  const i = f.apps.indexOf(key);
  if (on && i < 0) f.apps.push(key);
  if (!on && i >= 0) f.apps.splice(i, 1);
  save();
}
// переставить приложение в папке: from/to — места среди видимых (скрытые и удалённые остаются в конце)
export function moveInFolder(id, from, to) {
  const f = own().find((x) => x.id === id);
  if (!f) return;
  const vis = folderApps(f).map((a) => a.key);
  const [k] = vis.splice(from, 1);
  vis.splice(to, 0, k);
  f.apps = [...vis, ...f.apps.filter((x) => !vis.includes(x))];
  save();
}
// переставить папку
export function moveFolder(from, to) {
  const list = own();
  const [f] = list.splice(from, 1);
  list.splice(to, 0, f);
  save();
}
export const folderKey = keyOf;
// приложения, которых нет в системе, в папке не показываются (удалили приложение — папка не ломается)
export const knownApps = () => allApps();
