// Копия данных главного экрана (DECISIONS 2026-10-26): кошелёк, блокнот, настройки и раскладка, замок кошелька.
// Файл — сохранить куда угодно (Android: окно «Сохранить»; браузер — загрузка) и загрузить обратно.
// Плюс копии на телефоне: раз в сутки при запуске, хранятся последние 7 (IndexedDB) — на случай ошибки или неудачного
// обновления; от удаления приложения спасает только файл.
import { isNative, Launcher } from './native.js';

const KEYS = ['elachiston.prefs', 'elachiston.notes', 'elachiston.money.draft', 'elachiston.lock'];
const APP = 'elachiston';
const KEEP = 7;

export function snapshot() {
  const data = {};
  for (const k of KEYS) { try { const v = localStorage.getItem(k); if (v != null) data[k] = JSON.parse(v); } catch { /* битое — пропускаем */ } }
  return { app: APP, v: 1, at: Date.now(), data };
}

const counts = (s) => ({
  notes: Array.isArray(s.data['elachiston.notes']) ? s.data['elachiston.notes'].length : 0,
  recs: s.data['elachiston.money.draft']?.recs?.length || 0,
});
export const summary = (s) => counts(s);

export function parse(text) {
  const s = JSON.parse(text);
  if (!s || s.app !== APP || !s.data || typeof s.data !== 'object') throw new Error('not elachiston');
  return s;
}

// Записать копию поверх текущих данных (перед этим — копия текущего на телефоне, чтобы можно было вернуться)
export async function restore(s) {
  await keepLocal(snapshot(), 'before-restore');
  for (const k of KEYS) {
    try { if (k in s.data) localStorage.setItem(k, JSON.stringify(s.data[k])); else localStorage.removeItem(k); } catch { /* */ }
  }
}

const day = (t) => new Date(t).toISOString().slice(0, 10);
export const fileName = (t = Date.now()) => `elachiston-${day(t)}.json`;

export async function saveFile() {
  const s = snapshot();
  const text = JSON.stringify(s);
  if (isNative()) { await Launcher.saveDocument({ name: fileName(s.at), mime: 'application/json', text }); return s; }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: fileName(s.at) });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return s;
}

export async function pickFile() {
  if (isNative()) return parse((await Launcher.openDocument()).text);
  const file = await new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json' });
    input.addEventListener('change', () => resolve(input.files[0] || null));
    input.click();
  });
  if (!file) throw new Error('cancelled');
  return parse(await file.text());
}

/* ---------- копии на телефоне (IndexedDB) ---------- */
function db() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('elachiston-snaps', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('snaps', { keyPath: 'id' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('snaps', mode);
    const out = fn(t.objectStore('snaps'));
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  });
}

export async function localCopies() {
  try { return ((await tx('readonly', (st) => st.getAll())) || []).sort((a, b) => b.at - a.at); } catch { return []; }
}

async function keepLocal(s, why = 'daily') {
  try {
    await tx('readwrite', (st) => st.put({ ...s, id: s.at, why }));
    const all = await localCopies();
    const old = all.filter((x) => x.why === 'daily').slice(KEEP).concat(all.filter((x) => x.why !== 'daily').slice(3));
    if (old.length) await tx('readwrite', (st) => old.forEach((x) => st.delete(x.id)));
  } catch { /* нет IndexedDB — без копий на телефоне */ }
}

// раз в сутки при запуске
export async function dailyCopy() {
  const all = await localCopies();
  const last = all.find((x) => x.why === 'daily');
  if (last && day(last.at) === day(Date.now())) return;
  const s = snapshot();
  if (Object.keys(s.data).length) await keepLocal(s, 'daily');
}
