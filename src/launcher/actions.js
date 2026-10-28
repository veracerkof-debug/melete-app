// Elachiston: действия — открыть приложение, команда главного экрана, ссылка. Общие для значков и жестов.
import { prefs, save } from './data.js';
import { isNative, Launcher } from './native.js';
import { t } from './i18n.js';

// Команды: id, строка cmd.<id>; church — только в церковном режиме; native — только на Android
export const COMMANDS = [
  { id: 'drawer' }, { id: 'search' }, { id: 'settings' },
  { id: 'melete' }, { id: 'money' }, { id: 'notes' },
  { id: 'alarms', native: true }, { id: 'camera', native: true }, { id: 'dial', native: true }, { id: 'sysSettings', native: true },
  { id: 'none' },
];
export const commandsFor = (church) => COMMANDS.filter((c) => (church || !c.church) && (isNative() || !c.native));

// Шаблоны ссылок: действие внутри приложения (deep link); значение правится при выборе
export const LINK_PRESETS = [
  { id: 'tel', url: 'tel:+' }, { id: 'sms', url: 'sms:+' }, { id: 'mail', url: 'mailto:' },
  { id: 'tg', url: 'https://t.me/' }, { id: 'wa', url: 'https://wa.me/' },
  { id: 'route', url: 'https://www.google.com/maps/dir/?api=1&destination=' },
  { id: 'yt', url: 'https://www.youtube.com/results?search_query=' },
  { id: 'timer', url: 'intent:#Intent;action=android.intent.action.SET_TIMER;end' },
  { id: 'wifi', url: 'intent:#Intent;action=android.settings.WIFI_SETTINGS;end' },
];

const handlers = {};
export const registerCommand = (id, fn) => { handlers[id] = fn; };
let notify = () => {};
export const setNotify = (fn) => { notify = fn; };

// Подпись действия для настроек
export function describeAction(a, appName) {
  if (!a || a.t === 'none') return t('cmd.none');
  if (a.t === 'app') return appName(a) || t('act.gone');
  if (a.t === 'cmd') return t('cmd.' + a.id);
  if (a.t === 'url') return a.name || a.url;
  return t('cmd.none');
}

export async function runAction(a, apps) {
  if (!a) return;
  if (a.t === 'cmd') {
    if (handlers[a.id]) return handlers[a.id]();
    if (!COMMANDS.some((c) => c.id === a.id && c.native)) return; // убранная команда (тихий экран, стих…) — ничего
    if (isNative()) return Launcher.open({ what: a.id === 'sysSettings' ? 'settings' : a.id }).catch(() => notify(t('act.noApp')));
    return;
  }
  if (a.t === 'app') return openApp(apps.find(a));
  if (a.t === 'url') return openUrl(a.url, a.name);
}

// app — { pkg, label } (Android) или { id, name, url } (веб)
export async function openApp(app) {
  if (!app) return notify(t('act.gone'));
  const key = app.pkg || app.id;
  prefs.usage[key] = (prefs.usage[key] || 0) + 1;
  save();
  if (isNative() && app.pkg) {
    try { await Launcher.launch({ pkg: app.pkg }); } catch { notify(t('act.noApp')); }
    return;
  }
  if (app.url) return openUrl(app.url, app.name);
}

export async function openUrl(url, label) {
  if (!url) return;
  if (isNative()) {
    try { await Launcher.open({ what: 'url', url }); } catch { notify(t('act.noApp')); }
    return;
  }
  notify(label || url.replace(/^https?:\/\//, '').slice(0, 32));
  if (/^https?:/i.test(url)) window.open(url, '_blank', 'noopener');
  else window.location.href = url;
}
