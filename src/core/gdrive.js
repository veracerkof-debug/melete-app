// Синхронизация своих устройств через Google Диск (слово автора 25.11.2026). Тот же замысел, что у `sync.js` (телефон ↔ компьютер),
// но посредник — видимая папка `Melete` на Диске (право drive.file): данные (песни, занятия, профиль, чтение, календарь) —
// файлом `_melete/data.json`, слияние тем же `applyParts` (ничего не теряется); файлы песен и медиатеки — рядом, под своими именами,
// их сведения (разбор, текст, привязки) — `_melete/m-<id>.json`. План файлов — `planFiles` (трёхстороннее сравнение: что было на
// обоих в прошлый раз), защита от «пустого списка = всё удалено» та же. Удаление на Диске — в корзину Диска (восстановимо).
// Всё работает и без сети: сбой сети откладывается молча и ничего не блокирует (принцип 3).
import { pickParts, applyParts } from './backupparts.js';
import { SYNC_PARTS, planFiles, manifestOf, metaOf, metaFields, metaHash, mergeMeta, allFiles, CHUNK } from './sync.js';
import { stripDemo, isDemoFile } from './demo.js';
import { CORE_DICTS, loadAllLangs } from '../i18n/index.js';
import { accessToken, signedIn } from './gauth.js';
import { log } from './log.js';

const API = 'https://www.googleapis.com/drive/v3', UP = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER = 'application/vnd.google-apps.folder', MEM = 'melete.gdrive';
const RETRY = [800, 2500, 7000];
const readMem = () => { try { return JSON.parse(localStorage.getItem(MEM)) || {}; } catch { return {}; } };
const writeMem = (m) => { try { localStorage.setItem(MEM, JSON.stringify(m)); } catch (e) { log('gdrive', 'память синхронизации не сохранена: ' + (e.message || e), 'w'); } };
export const gdriveMem = readMem;
export const forgetDrive = () => { try { localStorage.removeItem(MEM); } catch { /* уже */ } };
const hashStr = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + s.length.toString(36); };
const qq = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
// Канонический текст: ключи по порядку, списки записей с id — по id (одинаков на всех устройствах при равном содержимом)
export function canon(v) {
  // время последней правки у каждого устройства своё и меняется при каждом сохранении — в сравнение не входит
  if (v && typeof v === 'object' && !Array.isArray(v) && 'updatedAt' in v) { v = { ...v }; delete v.updatedAt; if (v.settings && typeof v.settings === 'object') { v.settings = { ...v.settings }; delete v.settings.updatedAt; } }
  const walk = (x) => {
    if (Array.isArray(x)) { const a = x.map(walk); return a.every((y) => y && typeof y === 'object' && 'id' in y) ? a.sort((p, q) => (String(p.id) < String(q.id) ? -1 : String(p.id) > String(q.id) ? 1 : 0)) : a; }
    if (x && typeof x === 'object') return Object.keys(x).sort().reduce((o, k) => { o[k] = walk(x[k]); return o; }, {});
    return x;
  };
  return JSON.stringify(walk(v));
}
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const fail = (reason, status, msg) => Object.assign(new Error(msg || reason), { reason, status });

// ---- REST Диска. tok() → действующий токен; f — fetch (в тестах — поддельный Диск) ----
export function driveApi({ tok = () => accessToken(), f = (...a) => fetch(...a), retry = RETRY } = {}) {
  async function req(method, url, { json, body, headers = {}, raw = false, ok = [200, 201, 204, 206] } = {}) {
    for (let k = 0; ; k++) {
      let r;
      try {
        r = await f(url, { method, headers: { Authorization: 'Bearer ' + (await tok()), ...(json ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: json ? JSON.stringify(json) : body });
      } catch (e) {
        if (e && e.reason) throw e; // токен: нет входа / отозван
        if (k < retry.length) { await sleep(retry[k]); continue; }
        throw fail('unreachable', 0, e && e.message);
      }
      if (ok.includes(r.status)) return raw ? r : (r.status === 204 ? null : r.json().catch(() => null));
      if (r.status === 401) throw fail('auth', 401);
      const err = await r.json().catch(() => ({})), why = ((err.error || {}).errors || [{}])[0].reason || '';
      if (r.status === 403 && /storageQuota/i.test(why)) throw fail('quota', 403);
      if ((r.status === 429 || r.status >= 500 || (r.status === 403 && /rateLimit/i.test(why))) && k < retry.length) { await sleep(retry[k]); continue; }
      if (r.status === 404) throw fail('missing', 404);
      throw fail(r.status === 403 ? 'denied' : 'off', r.status, why);
    }
  }
  const F = 'id,name,mimeType,size,modifiedTime,md5Checksum,appProperties,parents';
  const api = {
    req,
    async list(q) {
      const out = []; let page = '';
      do {
        const j = await req('GET', API + '/files?' + new URLSearchParams({ q, fields: 'nextPageToken,files(' + F + ')', pageSize: '1000', orderBy: 'createdTime', spaces: 'drive', ...(page ? { pageToken: page } : {}) }));
        out.push(...(j.files || [])); page = j.nextPageToken || '';
      } while (page);
      return out;
    },
    async mkdir(name, parent) { return req('POST', API + '/files?fields=' + F, { json: { name, mimeType: FOLDER, ...(parent ? { parents: [parent] } : {}) } }); },
    // Найти папку по имени (самую раннюю: два устройства могли создать её одновременно) или создать
    async folder(name, parent) {
      const found = await api.list("name='" + qq(name) + "' and mimeType='" + FOLDER + "' and trashed=false" + (parent ? " and '" + parent + "' in parents" : " and 'root' in parents"));
      return found[0] || api.mkdir(name, parent);
    },
    async text(id) { const r = await req('GET', API + '/files/' + id + '?alt=media', { raw: true }); return r.text(); },
    // Небольшой JSON одним запросом (multipart): id есть — перезапись, нет — создание
    async putText(name, parent, text, id = null, props = null) {
      const meta = { name, ...(id ? {} : { parents: [parent] }), ...(props ? { appProperties: props } : {}), mimeType: 'application/json' }, B = 'meleteB' + Math.random().toString(36).slice(2);
      const body = '--' + B + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + B + '\r\nContent-Type: application/json\r\n\r\n' + text + '\r\n--' + B + '--';
      return req(id ? 'PATCH' : 'POST', UP + '/files' + (id ? '/' + id : '') + '?uploadType=multipart&fields=' + F, { body, headers: { 'Content-Type': 'multipart/related; boundary=' + B } });
    },
    // Большой файл — возобновляемая загрузка кусками (кратно 256 КБ); onPart(отправлено)
    async putBlob(name, parent, blob, props, id = null, { onPart = () => {}, stop = () => false } = {}) {
      const meta = { name, ...(id ? {} : { parents: [parent] }), appProperties: props };
      const start = await req(id ? 'PATCH' : 'POST', UP + '/files' + (id ? '/' + id : '') + '?uploadType=resumable&fields=' + F, { json: meta, raw: true, headers: { 'X-Upload-Content-Length': String(blob.size) } });
      const loc = start.headers.get('Location');
      if (!loc) throw fail('off', 0, 'нет адреса загрузки');
      if (!blob.size) return (await req('PUT', loc, { body: new Blob([]), headers: { 'Content-Range': 'bytes */0' } }));
      for (let off = 0; off < blob.size; off += CHUNK) {
        if (stop()) throw fail('stopped');
        const end = Math.min(blob.size, off + CHUNK), part = blob.slice(off, end);
        const r = await req('PUT', loc, { body: part, raw: true, ok: [200, 201, 308], headers: { 'Content-Range': 'bytes ' + off + '-' + (end - 1) + '/' + blob.size } });
        onPart(end);
        if (r.status !== 308) return r.json();
      }
      throw fail('off', 0, 'загрузка не завершена');
    },
    async slice(id, off, len) { const r = await req('GET', API + '/files/' + id + '?alt=media', { raw: true, headers: { Range: 'bytes=' + off + '-' + (off + len - 1) } }); return new Uint8Array(await r.arrayBuffer()); },
    async trash(id) { return req('PATCH', API + '/files/' + id, { json: { trashed: true } }); },
    async setProps(id, props) { return req('PATCH', API + '/files/' + id + '?fields=' + F, { json: { appProperties: props } }); },
    about: () => req('GET', API + '/about?fields=storageQuota,user'),
  };
  return api;
}

const propsOf = (rec) => ({ i: String(rec.id), s: String((rec.blob && rec.blob.size) || rec.size || 0), h: metaHash(rec), ...(rec.k ? { k: rec.k } : {}) });
const theirManifest = (files) => files.filter((x) => x.appProperties && x.appProperties.i && x.mimeType !== FOLDER).map((x) => ({ id: x.appProperties.i, size: +x.appProperties.s || +x.size || 0, name: x.name, h: x.appProperties.h || '', ...(x.appProperties.k ? { k: x.appProperties.k } : {}), _d: x.id }));

// ---- Один обмен с Диском ----
// opts: auto, stop() → true, onStep, snapshot() — копия данных перед первым слиянием за несколько часов
export async function driveSyncNow(app, api, onStep = () => {}, opts = {}) {
  await loadAllLangs(); // демо-файлы на любом языке не синхронизируются
  const halt = () => { if (opts.stop && opts.stop()) throw fail('stopped'); };
  const mem = readMem(), F = app.files, S = app.store;
  const before = { songs: S.songs().length, sessions: S.allSessions().length };
  onStep({ stage: 'data' });
  if (!mem.root) { const r = await api.folder('Melete'); mem.root = r.id; }
  if (!mem.svc) { const r = await api.folder('_melete', mem.root); mem.svc = r.id; }
  halt();
  const svc = await api.list("'" + mem.svc + "' in parents and trashed=false");
  const byName = new Map(svc.map((x) => [x.name, x]));
  const dataF = byName.get('data.json');
  // данные: чужие слить к себе, потом положить объединённое. Сравнение — по каноническому тексту (ключи и записи по порядку),
  // иначе два устройства переписывали бы файл друг за другом из-за разного порядка записей
  let changed = false, remoteHash = null;
  if (dataF) {
    if (dataF.md5Checksum && dataF.md5Checksum === mem.dataMd5) remoteHash = mem.dataHash;
    else {
      const remote = JSON.parse(await api.text(dataF.id));
      remoteHash = hashStr(canon(remote));
      if (opts.snapshot) await opts.snapshot();
      S.replaceState(applyParts(S.state, stripDemo(remote), SYNC_PARTS, { fresh: true }));
    }
  }
  const merged = pickParts(stripDemo(S.state), SYNC_PARTS), h = hashStr(canon(merged));
  if (!dataF || h !== remoteHash) {
    const up = await api.putText('data.json', mem.svc, JSON.stringify(merged), dataF ? dataF.id : null);
    mem.dataMd5 = up.md5Checksum || ''; changed = true;
  } else mem.dataMd5 = dataF.md5Checksum || '';
  mem.dataHash = h;
  writeMem(mem);
  // файлы
  if (F && F.ready) await F.ready.catch(() => {});
  halt();
  const rootFiles = await api.list("'" + mem.root + "' in parents and trashed=false and mimeType!='" + FOLDER + "'");
  const theirs = theirManifest(rootFiles).filter((x) => !isDemoFile(x, CORE_DICTS)), byId = new Map(theirs.map((x) => [x.id, x]));
  const mine = manifestOf(allFiles(F));
  const plan = planFiles(mine, theirs, mem.ids || [], { mineOk: !!F && !F.noDb, theirsOk: true });
  if (F && F.noDb) log('gdrive', 'база файлов здесь недоступна — удалений нет', 'w');
  const out = { songs: S.songs().length - before.songs, sessions: S.allSessions().length - before.sessions, up: 0, down: 0, removed: 0, meta: 0, data: changed };
  const metaOfDrive = (id) => byName.get('m-' + id + '.json') || null;
  const metaGet = async (id) => { const m = metaOfDrive(id) || (await api.list("'" + mem.svc + "' in parents and name='m-" + qq(id) + ".json' and trashed=false"))[0]; return m ? { m, v: JSON.parse(await api.text(m.id)) } : null; };
  const metaPut = async (rec) => { const m = metaOfDrive(rec.id), r = await api.putText('m-' + rec.id + '.json', mem.svc, JSON.stringify({ ...metaOf(rec), size: (rec.blob && rec.blob.size) || rec.size || 0 }), m ? m.id : null); byName.set('m-' + rec.id + '.json', r); };
  // удаления: у себя — насовсем, на Диске — в корзину (там их можно вернуть)
  for (const id of plan.delMine) { if (F.get(id)) { await F.remove(id); out.removed++; } }
  for (const id of plan.delTheirs) { const d = byId.get(id); if (d) { await api.trash(d._d); const m = metaOfDrive(id); if (m) await api.trash(m.id); out.removed++; } }
  // сведения файлов, что уже на обоих
  for (const id of plan.meta) {
    halt();
    const rec = F.get(id), g = await metaGet(id);
    if (!rec || !g) continue;
    const p = mergeMeta(rec, g.v);
    if (p) { Object.assign(rec, p); await F.save(rec); }
    if (metaHash(rec) !== metaHash(g.v)) { await metaPut(rec); await api.setProps(byId.get(id)._d, propsOf(rec)); }
    out.meta++;
  }
  const total = plan.upload.length + plan.download.length;
  let done = 0;
  for (const id of plan.upload) {
    halt();
    const rec = F.get(id);
    onStep({ stage: 'up', name: rec && rec.name, done, total });
    if (!rec || !rec.blob) { done++; continue; }
    await api.putBlob(rec.name || id, mem.root, rec.blob, propsOf(rec), null, { stop: opts.stop });
    await metaPut(rec);
    out.up++; done++;
  }
  for (const id of plan.download) {
    halt();
    const g = await metaGet(id), d = byId.get(id);
    if (!g || !d) { done++; continue; }
    onStep({ stage: 'down', name: g.v.name, done, total });
    const parts = [], size = g.v.size || d.size || 0;
    for (let off = 0; off < size; off += CHUNK) { halt(); parts.push(await api.slice(d._d, off, Math.min(CHUNK, size - off))); }
    const meta = { ...g.v }; delete meta.size;
    await F.add({ ...meta, blob: new Blob(parts, { type: g.v.type || '' }) });
    out.down++; done++;
  }
  // что теперь на обоих — для следующего раза (удаление переносится)
  const now = new Set(manifestOf(allFiles(F)).map((x) => x.id)), they = new Set(theirs.map((x) => x.id));
  plan.upload.forEach((id) => they.add(id)); plan.download.forEach((id) => they.add(id)); plan.delTheirs.forEach((id) => they.delete(id));
  mem.ids = [...now].filter((id) => they.has(id)); mem.last = Date.now(); mem.upd = S.state.updatedAt || 0;
  writeMem(mem);
  if (out.songs || out.sessions || out.up || out.down || out.removed || out.meta || !opts.auto) log('gdrive', (opts.auto ? 'фоновая ' : '') + 'синхронизация с Диском: песен +' + out.songs + ', занятий +' + out.sessions + ', на Диск ' + out.up + ', с Диска ' + out.down + ', удалено ' + out.removed);
  if (app.render && (out.songs || out.sessions || out.down || out.removed || out.meta)) app.render();
  return out;
}

// ---- Клиент: автоматический запуск, состояние для экрана ----
const MIN = 60000, DAY = 86400000, SNAP_GAP = 6 * 3600000;
export function createDriveClient(app, { api = null, now = () => Date.now(), online = () => navigator.onLine !== false } = {}) {
  const S = () => app.store.state.settings, subs = new Set();
  const emit = () => subs.forEach((fn) => { try { fn(); } catch (e) { (globalThis.reportError || console.error)(e); } });
  let busy = false, lastTry = 0, fails = 0, last = null, timer = 0, step = null, stopFlag = false;
  const quiet = () => !app.auto || !app.auto.quiet || app.auto.quiet();
  const on = () => S().gdrive !== false && signedIn();
  const dirty = () => (app.store.state.updatedAt || 0) !== (readMem().upd || 0);
  const interval = () => (fails ? Math.min(60 * MIN, 2 * MIN * 2 ** (fails - 1)) : dirty() ? 2 * MIN : 15 * MIN);
  const snapshot = async () => { const m = readMem(); if (!app.snapshots || now() - (m.snapAt || 0) < SNAP_GAP) return; m.snapAt = now(); writeMem({ ...readMem(), snapAt: m.snapAt }); await app.snapshots.take('sync'); };
  async function run(onStep = () => {}, opts = {}) {
    if (busy) throw fail('running');
    if (!signedIn()) throw fail('auth');
    busy = true; lastTry = now(); stopFlag = false; emit();
    try {
      const r = await driveSyncNow(app, api || driveApi(), (s) => { step = s; onStep(s); emit(); }, { snapshot, stop: () => stopFlag || (opts.auto && !quiet()), ...opts });
      fails = 0; last = { at: now(), ok: true, r };
      return r;
    } catch (e) {
      if (e.reason !== 'stopped') fails++;
      last = { at: now(), ok: false, reason: e.reason || 'off' };
      if (e.reason !== 'stopped' && e.reason !== 'unreachable' && fails === 1) log('gdrive', 'синхронизация с Диском не удалась: ' + (e.reason || e.message || e), 'w');
      throw e;
    } finally { busy = false; step = null; emit(); }
  }
  async function tick() {
    if (busy || !on() || !online() || !quiet()) return;
    if (last && !last.ok && last.reason === 'auth') return; // вход слетел — ждём, пока человек войдёт снова
    if (now() - lastTry < interval()) return;
    try { await run(() => {}, { auto: true }); } catch { /* причина в last и в журнале */ }
  }
  return {
    run, tick, on, quiet,
    get busy() { return busy; }, get last() { return last; }, get step() { return step; },
    // после занятия или правки: не ждать полного интервала
    kick(ms = 5000) { if (on()) setTimeout(() => { lastTry = 0; tick(); }, ms); },
    stop() { stopFlag = true; },
    start() {
      if (timer) return;
      timer = setInterval(tick, MIN); setTimeout(tick, 15000);
      // вернулись в приложение — обмен без ожидания полного интервала
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden) this.kick(3000); });
    },
    halt() { clearInterval(timer); timer = 0; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}
