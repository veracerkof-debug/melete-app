// Мост с Melete: чтение Библии и практика — из файла данных Melete Data/melete-data.json в «папке Melete»
// (Melete сам пишет туда полную копию данных, src/core/folder.js). Android: человек один раз выбирает папку (SAF),
// дальше Elachiston читает файл сам и ничего в папке не меняет. Браузер: файл выбирается вручную.
// Из файла берётся только нужное: план чтения, цель недели, занятия за последние 70 дней.
import { readJSON, writeJSON } from './data.js';
import { isNative, Launcher } from './native.js';

const KEY = 'elachiston.melete';
export const DATA_PATH = 'Data/melete-data.json';
export const MELETE_WEB = 'https://veracerkof-debug.github.io/melete-app/';
const KEEP = 70 * 864e5;

let bridge = readJSON(KEY); // { source: 'folder' | 'file', tree?, fileName?, modified?, readAt, data }
export const meleteBridge = () => bridge;

export function digest(full, now = Date.now()) {
  if (!full || typeof full !== 'object' || !Array.isArray(full.sessions)) throw new Error('not melete');
  const s = full.settings || {};
  return {
    church: !!s.church,
    bible: s.bible ? { plan: s.bible.plan || null, start: s.bible.start || null, read: s.bible.read || {}, custom: s.bible.custom || [] } : null,
    goal: { goalMin: s.goalMin || 300, days: s.days || [1, 1, 1, 1, 1, 0, 0] },
    // занятия целиком (с подписью): статистика считает только подтверждённые, как в Melete
    sessions: full.sessions.filter((x) => x && !x.deleted && x.start >= now - KEEP),
    // идущее занятие — если Melete его отдаёт (docs/next-2026-10.md: «Идёт занятие» на главном)
    active: full.active && full.active.start ? { start: full.active.start, title: full.active.title || '' } : null,
  };
}

function keep(full, extra) {
  bridge = { ...(bridge || {}), ...extra, readAt: Date.now(), data: digest(full) };
  writeJSON(KEY, bridge);
}

// Подключить: Android — выбрать папку Melete; браузер — выбрать файл
export async function connectMelete() {
  if (isNative()) {
    const { tree } = await Launcher.pickFolder();
    bridge = { source: 'folder', tree };
    writeJSON(KEY, bridge);
    await refreshMelete(true);
    return;
  }
  const file = await new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json' });
    input.addEventListener('change', () => resolve(input.files[0] || null));
    input.click();
  });
  if (!file) throw new Error('cancelled');
  keep(JSON.parse(await file.text()), { source: 'file', fileName: file.name });
}

// Перечитать папку (при возвращении на экран): файл не менялся — ничего не делать
export async function refreshMelete(throwErrors = false) {
  if (!isNative() || bridge?.source !== 'folder' || !bridge.tree) return false;
  try {
    const { text, modified } = await Launcher.readText({ tree: bridge.tree, path: DATA_PATH });
    if (modified && modified === bridge.modified && bridge.data) return false;
    keep(JSON.parse(text), { modified });
    return true;
  } catch (e) {
    if (throwErrors) throw e;
    return false;
  }
}

export function disconnectMelete() {
  bridge = null;
  try { localStorage.removeItem(KEY); } catch { /* */ }
}

// Открыть Melete (если стоит; Android — сначала основной, потом DEV), в браузере — веб-версию.
// route — экран Melete (docs/launcher-bridge.md): 'free' — свободная практика, 'bible' — чтение дня, 'session' — занятие
export function openMelete(notify, route) {
  if (isNative()) return Launcher.openMelete(route ? { route } : {}).catch(() => notify && notify());
  window.open(MELETE_WEB, '_blank', 'noopener');
  return Promise.resolve();
}

/* ---------- живое состояние Melete (docs/launcher-bridge.md) ----------
   Melete рассылает его сам при каждом изменении: идёт ли занятие, звучит ли что-то, неделя, чтение дня.
   Нет Melete с мостом — null, и главный экран берёт неделю и чтение из папки, как раньше. */
const LIVE_TTL = 12 * 3600e3;
let live = null; // { at, session, playing, sounding, what, week, reading }
const liveSubs = new Set();
export const onMeleteLive = (fn) => { liveSubs.add(fn); return () => liveSubs.delete(fn); };
export const meleteLive = () => (live && Date.now() - live.at < LIVE_TTL ? live : null);

function takeLive(text) {
  try {
    const s = typeof text === 'string' ? JSON.parse(text) : text;
    if (!s || s.v !== 1) return;
    live = { ...s, at: s.at || Date.now() };
    liveSubs.forEach((fn) => fn(live));
  } catch { /* не наш формат — молчим */ }
}

let listening = false;
export async function watchMelete() {
  if (!isNative()) return;
  if (!listening) { listening = true; Launcher.addListener('meleteState', (e) => takeLive(e.state)); }
  try { const { state } = await Launcher.meleteState(); if (state) takeLive(state); } catch { /* старая сборка без моста */ }
}

// Звук Melete: toggle | play | pause | stop
export function meleteControl(action = 'toggle') {
  if (isNative()) return Launcher.meleteControl({ action }).catch(() => {});
  // браузер: пример — переключаем показ
  if (live?.demo) { live = { ...live, playing: !live.playing, at: Date.now() }; liveSubs.forEach((fn) => fn(live)); }
  return Promise.resolve();
}

// Пример для браузера: идёт свободная практика, метроном звучит
export function demoLive(now = Date.now()) {
  if (!live) live = { v: 1, demo: true, at: now, session: { start: now - 24 * 60e3, title: 'Свободная практика', mode: 'free' }, playing: true, sounding: true, what: 'Метроном · 96' };
  return live;
}
