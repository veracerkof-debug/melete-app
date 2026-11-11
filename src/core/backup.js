// Резервная копия данных с подписью: кто сохранил (имя из профиля) и когда. Куда — по возможности:
// в папку Melete (Data/Backups, src/core/folder.js), иначе на Android — системное «Поделиться» (выбрать, куда
// положить файл: Документы, Telegram, почта), в браузере — скачивание файла.
// Что сохранить — по частям (backupparts.js): настройки, песни (по желанию — с файлами), профиль и статистика,
// план чтения, календарь. Без выбора (ежедневная копия в папку) — всё, кроме файлов.
import { PARTS, pickParts, applyParts, partsOf, mergeTools } from './backupparts.js';
import { log } from './log.js';
import { fileSongs } from './files.js';
import { LS_T, lockDevice } from './device.js';
import { stripDemo, isDemoFile } from './demo.js';
import { CORE_DICTS, loadAllLangs } from '../i18n/index.js';

export const backupBy = (app) => ((app.store.state.settings.profile || {}).name || '').trim();
export const backupInfo = (app, at = Date.now()) => ({ by: backupBy(app), at, app: 'Melete' });
export const backupText = (app) => app.store.exportBackup(backupInfo(app));

// Подпись из файла копии → { by, at } | null
export const infoOf = (p) => (p && p.backupInfo && typeof p.backupInfo === 'object' ? { by: String(p.backupInfo.by || ''), at: +p.backupInfo.at || 0 } : null);

const readTools = () => { try { return JSON.parse(localStorage.getItem(LS_T)) || null; } catch { return null; } };

// Файлы песен (записи, табы и ноты, MIDI) — то, что привязано к живым песням; модули Библии — нет
export function songFiles(app) {
  const live = new Set(app.store.songs().map((s) => s.id)), F = app.files;
  if (!F) return [];
  return ['audio', 'tab', 'midi'].flatMap((k) => F.list(k)).filter((r) => r.blob && fileSongs(r).some((id) => live.has(id)));
}
export const filesSize = (list) => list.reduce((a, r) => a + (r.blob ? r.blob.size : r.size || 0), 0);

// Потолок файлов в копии. Копия собирается в памяти целиком: файл → base64 (+⅓) → строка JSON (ещё копия) — примерно
// вчетверо больше файлов; 100 МБ записей на телефоне — ~400 МБ строк, и система выгружает приложение посреди сохранения.
// Телефон — 24 МБ, компьютер — 160 МБ. Сверх потолка файлы не берутся (свежие — первыми); полностью файлы
// сохраняет папка Melete (зеркало медиатеки, folder.js).
export const FILES_LIMIT = { phone: 24 * 1048576, desktop: 160 * 1048576 };
const isPhone = () => {
  try { if (globalThis.Capacitor && globalThis.Capacitor.getPlatform && globalThis.Capacitor.getPlatform() !== 'web') return true; } catch { /* */ }
  try { return !!(globalThis.matchMedia && globalThis.matchMedia('(pointer: coarse)').matches); } catch { return false; }
};
export const filesLimit = () => (isPhone() ? FILES_LIMIT.phone : FILES_LIMIT.desktop);
// Какие файлы войдут в копию → { take, skip, size }
export function pickFiles(list, limit = filesLimit()) {
  const take = [], skip = [];
  let size = 0;
  [...list].sort((a, b) => (b.created || 0) - (a.created || 0)).forEach((r) => {
    const n = r.blob ? r.blob.size : r.size || 0;
    if (size + n <= limit) { take.push(r); size += n; } else skip.push(r);
  });
  return { take, skip, size };
}

async function toB64(blob) {
  const u = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
const fromB64 = (b) => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };

// Текст копии из выбранных частей; files — с файлами песен
// report — сюда пишется, сколько файлов не вошло по потолку (skipped)
export async function backupData(app, parts = PARTS, { files = false, limit = filesLimit(), report = {} } = {}) {
  await loadAllLangs(); // демо-файлы на любом языке — мимо копии
  const p = pickParts(stripDemo(app.store.state), parts, { tools: parts.includes('settings') ? readTools() : null }); // без демо
  report.skipped = 0;
  if (files && parts.includes('songs')) {
    p.files = [];
    const { take, skip } = pickFiles(songFiles(app).filter((x) => !isDemoFile(x, CORE_DICTS)), limit);
    report.skipped = skip.length;
    if (skip.length) log('backup', 'в копию не вошло файлов: ' + skip.length + ' (потолок ' + Math.round(limit / 1048576) + ' МБ)', 'w');
    for (const r of take) {
      const meta = { ...r };
      delete meta.blob; delete meta._busy;
      p.files.push({ ...meta, data: await toB64(r.blob) });
    }
  }
  return JSON.stringify({ backupInfo: backupInfo(app), ...p }, null, 1);
}

// Загрузить выбранные части копии p. → { sessions: новых занятий, files: добавлено файлов, tools: настройки инструментов изменились }
export async function restoreParts(app, p, parts) {
  await loadAllLangs();
  p = stripDemo(p); // демо из копий не возвращается
  const before = app.store.allSessions().length, use = parts.filter((k) => partsOf(p).includes(k));
  app.store.replaceState(applyParts(app.store.state, p, use));
  let files = 0, tools = false;
  if (use.includes('songs') && Array.isArray(p.files) && app.files) {
    for (const f of p.files) {
      if (!f || !f.id || !f.data || app.files.get(f.id) || isDemoFile(f, CORE_DICTS)) continue;
      const { data, ...meta } = f;
      await app.files.add({ ...meta, blob: new Blob([fromB64(data)], { type: f.type || '' }) });
      files++;
    }
  }
  if (use.includes('settings') && p.tools) {
    try { lockDevice(); localStorage.setItem(LS_T, JSON.stringify(mergeTools(readTools(), p.tools))); tools = true; } catch (e) { log('backup', 'настройки инструментов из копии не восстановлены (нет места?): ' + (e && e.name), 'w'); }
  }
  return { sessions: app.store.allSessions().length - before, files, tools };
}

// Сохранить копию. opts: { parts, files } — по частям; без них — всё (как раньше).
// → { where: 'folder' | 'shared' | 'saved' | 'cancel', name }
export async function saveBackup(app, opts = null) {
  const report = { skipped: 0 };
  const text = opts ? await backupData(app, opts.parts, { ...opts, report }) : backupText(app);
  const F = app.folder;
  if (F && F.state && F.state.ok && F.saveBackup) {
    const name = await F.saveBackup(text);
    if (name) return { where: 'folder', name, skipped: report.skipped };
  }
  const { backupName } = await import('./folder.js'), { sendFile } = await import('./screens/share.js');
  const name = backupName(backupBy(app)), where = await sendFile(new TextEncoder().encode(text), name, name, 'application/json');
  return { where, name, skipped: report.skipped };
}
