// Строка плеера — что играет и пауза: медиасессии приложений Android (нужен доступ к уведомлениям — человек включает
// его сам). В браузере строки нет.
import { isNative, Launcher } from './native.js';

let media = { access: null, active: false };
const subs = new Set();
let timer = null;

export const nowPlaying = () => media;
export const onNowPlaying = (fn) => subs.add(fn);
const emit = () => subs.forEach((fn) => fn(media));

async function poll() {
  try {
    const next = await Launcher.mediaState();
    const changed = JSON.stringify(next) !== JSON.stringify(media);
    media = next;
    if (changed) emit();
  } catch { /* мост недоступен */ }
}

// Опрос раз в 2 с, пока главный экран на виду
export function startNowPlaying() {
  if (!isNative() || timer) return;
  poll();
  timer = setInterval(() => { if (!document.hidden) poll(); }, 2000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
}

// Что показывать: играющее приложение или то, что на паузе
export function current() {
  const m = media;
  if (!m.active || !(m.title || m.app)) return null;
  return { playing: !!m.playing, title: [m.title, m.artist].filter(Boolean).join(' — ') || m.app, app: m.app, pkg: m.pkg };
}

export async function togglePlayback() {
  try { await Launcher.mediaCommand({ cmd: 'toggle' }); } catch { /* сессии нет */ }
  // значок меняется сразу, уточнение — следующим опросом
  media = { ...media, playing: !media.playing };
  emit();
  setTimeout(poll, 400);
}

export const openMediaAccess = () => Launcher.openMediaAccess().catch(() => {});
