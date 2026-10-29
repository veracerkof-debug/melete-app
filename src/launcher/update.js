// Обновление Elachiston из GitHub — как у Melete (core/update.js), но свои релизы: launcher-dev (каждая отправка в main,
// приложение «Elachiston DEV», app.elachiston.dev) и launcher-pre (ветка pre, по слову автора; app.elachiston).
// Метка сборки — файл «launcher-<номер>.ver», CI кладёт его последним, после APK. «Автоматически» — раз в сутки при
// запуске: проверить, скачать (только по Wi-Fi, если не разрешена мобильная сеть) и предложить установку — системный
// установщик, одно касание «Установить». Сеть — только api.github.com и сам файл релиза.
import { registerPlugin } from '@capacitor/core';
import { isNative, Launcher } from './native.js';
import { prefs, readJSON, writeJSON } from './data.js';

export const REPO = 'veracerkof-debug/melete-app';
export const CHANNEL = typeof __CHANNEL__ !== 'undefined' && __CHANNEL__ === 'pre' ? 'pre' : 'dev';
export const BUILD = typeof __BUILD__ !== 'undefined' ? +__BUILD__ || 0 : 0; // 0 — собрано у себя: не обновляется
export const TAG = 'launcher-' + CHANNEL;
export const FILES = { pre: 'Elachiston.apk', dev: 'Elachiston-Dev.apk' };
const KEY = 'elachiston.upd'; // { at — последняя проверка, skip — номер, от которого отказались }
const DAY = 864e5;

// Ответ GitHub (релиз канала) → { build, url, size } или null — пока метки или файла нет целиком
export function parseRelease(rel, channel = CHANNEL) {
  const assets = (rel && rel.assets) || [];
  let build = 0;
  for (const a of assets) { const m = /^launcher-(\d+)\.ver$/.exec(a.name || ''); if (m && a.state === 'uploaded') build = Math.max(build, +m[1]); }
  const file = assets.find((a) => a.name === FILES[channel] && a.state === 'uploaded');
  return build && file ? { build, url: file.browser_download_url, size: file.size || 0 } : null;
}
export const isNewer = (info, build = BUILD) => !!info && build > 0 && info.build > build;
export const due = (mem, now, mode) => mode === 'auto' && now - ((mem && mem.at) || 0) >= DAY;

const Native = isNative() ? registerPlugin('Update') : null;
let s = { st: 'idle', info: null, f: 0, wait: false };
let dlId = null, poll = null;
const subs = new Set();
export const updState = () => s;
export const onUpdate = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const set = (patch) => { s = { ...s, ...patch }; subs.forEach((fn) => fn(s)); };
export const updAvailable = () => !!Native && BUILD > 0;

export async function check() {
  if (!updAvailable()) return s;
  set({ st: 'checking' });
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/${TAG}`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('http ' + r.status);
    const info = parseRelease(await r.json());
    writeJSON(KEY, { ...(readJSON(KEY) || {}), at: Date.now() });
    set({ st: isNewer(info) ? 'avail' : 'none', info });
  } catch { set({ st: 'err' }); }
  return s;
}

export async function download() {
  if (!Native || !s.info) return;
  set({ st: 'down', f: 0, wait: false });
  try {
    const { id } = await Native.download({ url: s.info.url, wifi: !prefs.updMobile });
    dlId = id;
    clearInterval(poll);
    poll = setInterval(async () => {
      let r;
      try { r = await Native.status({ id }); } catch { clearInterval(poll); set({ st: 'avail' }); return; }
      if (r.status === 'done') { clearInterval(poll); set({ st: 'ready', f: 1 }); }
      else if (r.status === 'fail') { clearInterval(poll); set({ st: 'err' }); }
      else set({ f: r.total > 0 ? r.got / r.total : 0, wait: r.status === 'wait' });
    }, 1000);
  } catch (e) {
    // нет Wi-Fi, а мобильная сеть не разрешена — ждём Wi-Fi сами и начинаем, как только он появится
    set({ st: /nowifi/.test(String(e?.message || e)) ? 'nowifi' : 'err' });
  }
}
if (Native) {
  const retry = () => { if (s.st === 'nowifi') download(); };
  Launcher.addListener?.('status', (x) => { if (x?.net === 'wifi') retry(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) retry(); });
}

// 'allow' — сначала разрешение «Установка неизвестных приложений» (один раз), потом установка
export async function install() {
  if (!Native) return;
  const { ok } = await Native.canInstall();
  if (!ok) { await Native.allowInstall(); return 'allow'; }
  await Native.install();
  return 'ok';
}

export async function cancelDownload() {
  clearInterval(poll);
  if (dlId != null) { try { await Native.cancel({ id: dlId }); } catch { /* уже нет */ } }
  set({ st: 'avail' });
}

// При запуске: «автоматически» — раз в сутки проверить и скачать (через 30 с, чтобы не мешать старту)
export function autoUpdate() {
  if (!updAvailable() || !due(readJSON(KEY), Date.now(), prefs.updMode)) return;
  setTimeout(() => { check().then(() => { if (s.st === 'avail') download(); }).catch(() => {}); }, 30000);
}
