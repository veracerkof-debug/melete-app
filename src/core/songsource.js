// Источник песен — папка другой программы (Holyrics, ProPresenter, OnSong… — любая, где песни лежат файлами). Слово автора 28.11.2026:
// «читать папку с песнями в одну сторону, обновляя при изменениях текста и названия; лишь бы не было дублей и ничего не ломалось».
// ТОЛЬКО ЧТЕНИЕ: в чужую папку не пишем и ничего там не удаляем; песня, пропавшая из папки, остаётся у человека.
// Правила (проверены тестами tests/songsource.test.js):
//  • файл не менялся (размер и время) — не читается вовсе; читаются новые и изменённые;
//  • песня помнит источник: song.src = { s: id источника, k: ключ, h: хэш текста источника, b: хэш текста песни на момент чтения (отличие — человек правил), p?: ожидающий текст, sig };
//    ключ — путь файла (в файле одна песня; переименование названия — обновление, не новая песня) или путь#название|исполнитель (в файле их много);
//  • песня, уже занесённая раньше вручную (то же название и исполнитель, нет src), «усыновляется» — не дублируется и не затирается;
//  • название и исполнитель обновляются всегда; текст — только если человек не правил его в Melete (аккорды от человека и нейросети
//    не пропадают): иначе новый текст ждёт в song.src.p, и человек сам нажимает «Обновить» (перед этим — копия);
//  • один плохой файл не останавливает остальные: пропускается, имя уходит в итог и журнал.
// Логика без DOM; ввод-вывод — через драйвер папки (контракт folder.js) и разбор файлов songimport.js.
import { hash, readAll } from './folder.js';
import { importSongs } from './songimport.js';
import { uid } from './time.js';

export const SRC_EXT = ['txt', 'cho', 'chordpro', 'chopro', 'crd', 'onsong', 'pro6', 'pro', 'xml', 'json', 'muf', 'mufl', 'pptx', 'gz'];
export const LIMITS = { depth: 6, files: 20000, size: 30 * 1024 * 1024 };
const ext = (n) => ((/\.([^.\\/]+)$/.exec(n || '') || [])[1] || '').toLowerCase();
const norm = (s) => String(s || '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
export const idOf = (s) => norm(s.title) + '|' + norm(s.artist);

// Рекурсивный список файлов источника: [{ path, name, size, mtime }]
export async function walk(drv, dir = '', depth = 0, out = [], isStop = () => false) {
  if (depth > LIMITS.depth || out.length >= LIMITS.files || isStop()) return out;
  let items = [];
  try { items = await drv.list(dir); } catch { return out; }
  for (const it of items) {
    if (!it || !it.name || it.name.startsWith('.')) continue;
    const path = dir ? dir + '/' + it.name : it.name;
    if (it.dir) await walk(drv, path, depth + 1, out, isStop);
    else if (SRC_EXT.includes(ext(it.name)) && out.length < LIMITS.files) out.push({ path, name: it.name, size: it.size || 0, mtime: it.mtime || 0 });
  }
  return out;
}

const pause = () => new Promise((r) => setTimeout(r, 0));
const text = (s) => String((s && s.notes) || '');

// Прочитать источник и обновить песни. opts: { sourceId, drv, store, base (emptySong), onProgress(n, total), isStop() }
// → { scanned, changed, added, updated, stale, adopted, errors: [{ name, error }], stopped }
export async function scanSource({ sourceId, drv, store, base = {}, onProgress = () => {}, isStop = () => false }) {
  const res = { scanned: 0, changed: 0, added: 0, updated: 0, stale: 0, adopted: 0, errors: [], stopped: false };
  const files = await walk(drv, '', 0, [], isStop);
  res.scanned = files.length;
  const songs = store.state.songs, now = store.now ? store.now() : Date.now();
  const byKey = new Map(), byId = new Map(), sigOf = new Map();
  for (const s of songs) {
    if (s.deleted) continue;
    if (s.src && s.src.s === sourceId) { byKey.set(s.src.k, s); sigOf.set(s.src.k.split('#')[0], s.src.sig); }
    else if (!s.src) { const k = idOf(s); if (!byId.has(k)) byId.set(k, s); }
  }
  let i = 0;
  for (const f of files) {
    if (isStop()) { res.stopped = true; break; }
    if (++i % 10 === 0) { onProgress(i, files.length); await pause(); }
    const sig = f.size + ':' + f.mtime;
    if (sigOf.get(f.path) === sig) continue; // не менялся
    res.changed++;
    let parsed;
    try {
      if (f.size > LIMITS.size) throw new Error('too big');
      const u8 = await readAll(drv, f.path, f.size);
      parsed = await importSongs([{ name: f.name, u8 }]);
      if (!parsed.songs.length) { if (parsed.errors.length) throw new Error(parsed.errors[0].error); continue; }
    } catch (e) { res.errors.push({ name: f.path, error: String((e && e.message) || e).slice(0, 120) }); continue; }
    const multi = parsed.songs.length > 1;
    for (const x of parsed.songs) {
      if (!x.title && !x.notes) continue;
      const k = multi ? f.path + '#' + idOf(x) : f.path, h = hash(x.notes || '');
      let s = byKey.get(k);
      if (s) { // обновление
        const before = s.title + '\u0000' + s.artist + '\u0000' + text(s);
        if (x.title) s.title = x.title;
        s.artist = x.artist || s.artist || '';
        const edited = hash(text(s)) !== s.src.b; // человек правил текст в Melete
        if (h !== s.src.h) {
          if (!edited) { s.notes = x.notes || ''; s.src.h = h; s.src.b = h; delete s.src.p; }
          else { s.src.p = { notes: x.notes || '', h }; res.stale++; }
        }
        s.src.sig = sig;
        if (before !== s.title + '\u0000' + s.artist + '\u0000' + text(s)) { s.updatedAt = now; res.updated++; }
        continue;
      }
      s = byId.get(idOf(x)); // усыновление: уже есть такая песня без источника
      if (s && !s.src) {
        s.src = { s: sourceId, k, h, b: h, sig }; // b = текст источника: если текст песни другой — он считается правленным человеком
        if (!s.key && x.key) s.key = x.key;
        byKey.set(k, s); byId.delete(idOf(x)); res.adopted++;
        continue;
      }
      const n = { ...base, id: uid(), createdAt: now, updatedAt: now, title: x.title || f.name.replace(/\.[^.]+$/, ''), artist: x.artist || '', notes: x.notes || '', key: x.key || null,
        targetBpm: x.bpm || null, currentBpm: null, genre: '', cat: null, tags: [], src: { s: sourceId, k, h, b: h, sig } };
      n.mastery = Math.max(1, n.mastery || 1);
      songs.push(n); byKey.set(k, n); res.added++;
    }
    // подпись файла — всем его песням (чтобы неизменный файл не читался снова)
    for (const s of byKey.values()) if (s.src && s.src.k.split('#')[0] === f.path) s.src.sig = sig;
  }
  if (res.added || res.updated || res.stale || res.adopted) store.save();
  return res;
}

// Песни, у которых в источнике текст изменился, а в Melete правлен человеком: [{ song, notes }]
export const staleSongs = (songs) => songs.filter((s) => !s.deleted && s.src && s.src.p);
// Взять текст из источника (копию данных делает вызывающий; текст человека теряется) / оставить свой
export function takeSource(store, s) { if (!s.src || !s.src.p) return false; s.notes = s.src.p.notes; s.src.h = s.src.p.h; s.src.b = hash(s.notes); delete s.src.p; s.updatedAt = store.now ? store.now() : Date.now(); store.save(); return true; }
export function keepMine(store, s) { if (!s.src || !s.src.p) return false; s.src.h = s.src.p.h; delete s.src.p; store.save(); return true; } // версию источника «видели»: до его следующей правки не спрашиваем

/* ---------- подключённые папки: список на этом устройстве (путь к папке хранит система/плагин, а не синхронизация) ---------- */
const KEY = 'melete.songsrc', MAX_SOURCES = 3;
export const SOURCES_MAX = MAX_SOURCES;
export function loadSources(storage = globalThis.localStorage) {
  try { const j = JSON.parse(storage.getItem(KEY)); return Array.isArray(j && j.list) ? j.list.filter((x) => x && x.id).slice(0, MAX_SOURCES) : []; } catch { return []; }
}
export function saveSources(list, storage = globalThis.localStorage) { try { storage.setItem(KEY, JSON.stringify({ list: list.slice(0, MAX_SOURCES) })); return true; } catch { return false; } }
