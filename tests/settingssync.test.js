import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  SYNC_SETTINGS, DEVICE_ONLY, PART_KEYS, FORBIDDEN, kindOf, isSyncKey, isForbidden, stampSettings, pickSettings, mergeSettings,
  mergeCounters, mergeLog, scrub, isOwn, hashVal,
} from '../src/core/settingssync.js';
import { pickParts, applyParts } from '../src/core/backupparts.js';
import { createStore } from '../src/core/store.js';
import { handleRequest, syncNow, pair, createSyncClient, findMoved, SYNC_PARTS, partsFor } from '../src/core/sync.js';

const mkLS = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const ROOT = join(__dirname, '..');

describe('списки: что ходит между устройствами, а что нет', () => {
  it('белый список не пересекается с чёрным, запрещёнными именами и собственными частями копии', () => {
    for (const k of SYNC_SETTINGS) {
      expect(DEVICE_ONLY, k).not.toContain(k);
      expect(PART_KEYS, k).not.toContain(k);
      expect(isForbidden(k), 'запрещённое имя в белом списке: ' + k).toBe(false);
      expect(kindOf(k)).toBe('sync');
    }
    expect(new Set(SYNC_SETTINGS).size).toBe(SYNC_SETTINGS.length);
  });

  it('секреты, сопряжения, адреса, железо звука и устройства — никогда (по именам и по шаблонам)', () => {
    const never = [
      'ai', 'aiKey', 'aiUrl', 'aiAgents', 'apiKey', 'api_key', 'token', 'accessToken', 'refreshToken', 'password', 'passwd', 'secret', 'clientSecret',
      'gdrive', 'gauth', 'gdriveToken', 'oauth', 'cookie', 'jwt', 'credentials', 'melete.sync', 'peers', 'devs', 'pc', 'pcWork', 'pcStems', 'syncAuto',
      'addr', 'address', 'host', 'ip', 'port', 'fp', 'fingerprint', 'mesh', 'nsd', 'url', 'permissions', 'perm',
      'audio', 'audioBuffer', 'output', 'outputDevice', 'outKind', 'eq', 'eqBands', 'buffer', 'bufferSize', 'latency', 'profiles', 'volume', 'vol', 'gain',
      'uiScale', 'deskBg', 'bluetooth', 'btDevice', 'micPresence', 'midiIn', 'screenOn', 'student', 'classroom', 'folder', 'localSend', 'upOk', 'updMode',
    ];
    for (const k of never) expect(isSyncKey(k), k).toBe(false);
    for (const k of ['aiKey', 'apiKey', 'token', 'gdrive', 'gauth', 'port', 'outputDevice', 'eqBands', 'bluetooth']) expect(isForbidden(k), k).toBe(true);
    // имена, привязанные к устройству и в чёрном списке, не могут попасть в белый
    for (const k of DEVICE_ONLY) expect(isSyncKey(k), k).toBe(false);
    expect(FORBIDDEN.length).toBeGreaterThan(3);
  });

  it('в обмен не попадают ни запрещённые ключи, ни вложенные секреты, ни собственные части', () => {
    const S = {
      theme: 'dark', aiKey: 'sk-1', gdrive: true, gauth: { token: 'x' }, uiScale: 1.2, pcWork: true, syncAuto: true, deskBg: true, rec: { dev: 'x' },
      metro: { bpm: 100, token: 'oops', nested: { password: 'p', ok: 1 } }, lib: { genres: [] }, profile: { name: 'А' }, updatedAt: 5, configured: true,
      unknownNew: 1, __sig: {}, __at: { theme: 3 },
    };
    const { values, at } = pickSettings(S);
    expect(Object.keys(values).sort()).toEqual(['metro', 'theme']);
    expect(values.metro).toEqual({ bpm: 100, nested: { ok: 1 } });
    expect(JSON.stringify(values)).not.toMatch(/sk-1|oops|password/);
    expect(at).toEqual({ theme: 3, metro: 0 });
  });

  it('обмен целиком (pickParts sync) не уносит секретного: ни в sset, ни в прежних полях', () => {
    const st = { version: 1, songs: [], sessions: [], settings: { theme: 'dark', goalMin: 200, aiKey: 'sk', gdrive: true, gauth: 'g', uiScale: 1.3, pcWork: true, stageMix: { a: 1 }, updatedAt: 1 } };
    stampSettings(st.settings, 10);
    const p = pickParts(st, SYNC_PARTS, { sync: true });
    expect(p.parts).not.toContain('settings'); // прежние версии настройки не трогают
    expect(p.settings.theme).toBeUndefined();
    expect(JSON.stringify(p)).not.toMatch(/"sk"|"g"|stageMix|uiScale|pcWork|gdrive|gauth|aiKey/);
    expect(Object.keys(p.sset.values).sort()).toEqual(['goalMin', 'theme']);
  });

  // новый ключ настроек не должен тихо остаться «неизвестным»: его нужно отнести к белому или чёрному списку
  it('модули с ctx.data() и ключи settings.<имя> в коде — учтены в одном из списков', () => {
    const known = new Set([...SYNC_SETTINGS, ...DEVICE_ONLY, ...PART_KEYS]);
    const dir = join(ROOT, 'src/modules');
    const mods = readdirSync(dir).filter((d) => existsSync(join(dir, d, 'index.js')));
    for (const m of mods) {
      const src = readFileSync(join(dir, m, 'index.js'), 'utf8');
      if (/\bctx\.data\(\)/.test(src)) expect(known.has(m), 'модуль ' + m + ' хранит данные в settings.' + m + ' — отнесите к SYNC_SETTINGS или DEVICE_ONLY').toBe(true);
    }
    // имена после «settings.» в ядре и интерфейсе (не объекты других библиотек)
    const IGNORE = new Set(['ACCENTS', 'WIFI_SETTINGS', 'applyTheme', 'setBpm', 'setMeter', 'scene', 'scenes', 'js', 'get', 'ex', 'ear', 'display', 'player', 'notation', 'pitch', 'home', 'off', 'list', 'listen', 'move', 'remove', 'create', 'add', 'filter', 'len', 'levelAsk', 'bgCtl', 'tama', 'sound', 'songs', 'layers', 'tempo', 'lv10', 'imSound', 'imScale', 'imPc', 'grow', 'bass', 'study', 'plan', 'routines', 'quick', 'dockOrder', 'accent', 'configured', 'folder', 'leagueSeen', 'helpOff', 'profile', 'bible', 'cal', 'lib']);
    const unknown = new Set();
    const walk = (d) => { for (const f of readdirSync(d, { withFileTypes: true })) { const p = join(d, f.name); if (f.isDirectory()) { if (!/modules$|showcase|student|launcher|legacy/.test(p) || /src[\\/]modules$/.test(p) === false) walk(p); } else if (/\.js$/.test(f.name)) { const s = readFileSync(p, 'utf8'); for (const mm of s.matchAll(/\bstate\.settings\.([a-zA-Z][a-zA-Z0-9]*)/g)) if (!known.has(mm[1]) && !IGNORE.has(mm[1])) unknown.add(mm[1] + ' (' + f.name + ')'); } } };
    walk(join(ROOT, 'src/core')); walk(join(ROOT, 'src/ui'));
    expect([...unknown], 'новые ключи settings без решения «ходит / не ходит»').toEqual([]);
  });
});

describe('слияние настроек по ключам и времени правки', () => {
  const mk = (over = {}, at = {}) => { const S = { theme: 'light', goalMin: 300, updatedAt: 100, ...over }; stampSettings(S, 100); Object.assign(S.__at, at); return S; };

  it('первое время — время последней правки настроек; правка получает «сейчас»; удаление — тоже правка', () => {
    const S = { theme: 'light', goalMin: 300, updatedAt: 100, aiKey: 'k' };
    stampSettings(S, 5000);
    expect(S.__at).toEqual({ theme: 100, goalMin: 100 }); // aiKey не учитывается
    S.theme = 'dark'; delete S.goalMin; S.plan = { x: 1 };
    expect(stampSettings(S, 6000)).toBe(3);
    expect(S.__at).toEqual({ theme: 6000, goalMin: 6000, plan: 6000 });
    expect(stampSettings(S, 7000)).toBe(0); // без правок время не меняется
    expect(pickSettings(S).values.goalMin).toBeUndefined();
    expect(pickSettings(S).at.goalMin).toBe(6000);
  });

  it('позднее побеждает по каждому ключу; значение не затирается старым', () => {
    const a = mk({ theme: 'dark' }, { theme: 500 }), b = mk({ theme: 'light', goalMin: 600 }, { theme: 400, goalMin: 700 });
    mergeSettings(a, pickSettings(b), 1000);
    expect([a.theme, a.goalMin]).toEqual(['dark', 600]);
    mergeSettings(b, pickSettings(a), 1000);
    expect([b.theme, b.goalMin]).toEqual(['dark', 600]);
    expect(hashVal(a.theme)).toBe(hashVal(b.theme));
  });

  it('равное время и разные значения — одинаковый победитель на обеих сторонах', () => {
    const a = mk({ theme: 'dark' }, { theme: 500 }), b = mk({ theme: 'paper' }, { theme: 500 });
    const pa = pickSettings(a), pb = pickSettings(b);
    mergeSettings(a, pb, 1000); mergeSettings(b, pa, 1000);
    expect(a.theme).toBe(b.theme);
  });

  it('идемпотентно: повтор ничего не меняет', () => {
    const a = mk({ theme: 'dark' }, { theme: 500 }), b = mk({ goalMin: 900 }, { goalMin: 800 });
    mergeSettings(a, pickSettings(b), 1000);
    const snap = JSON.stringify(a);
    expect(mergeSettings(a, pickSettings(b), 2000)).toEqual([]);
    expect(JSON.stringify(a)).toBe(snap);
  });

  it('удаление ключа переносится, только если оно новее; без времени — не удаление', () => {
    const a = mk({ plan: { id: 1 } }, { plan: 300 });
    mergeSettings(a, { values: {}, at: { plan: 200 } }, 1000);
    expect(a.plan).toEqual({ id: 1 }); // удаление старее правки
    mergeSettings(a, { values: {}, at: { plan: 400 } }, 1000);
    expect(a.plan).toBeUndefined();
    const b = mk({ plan: { id: 2 } }, { plan: 300 });
    mergeSettings(b, { values: {}, at: {} }, 1000);
    expect(b.plan).toEqual({ id: 2 }); // пустой ответ — не «всё удалено»
  });

  it('чужие запрещённые ключи и секреты в пришедшем не принимаются', () => {
    const a = mk();
    const ch = mergeSettings(a, { values: { aiKey: 'x', gdrive: true, uiScale: 2, pcWork: false, theme: 'oled', metro: { token: 't', bpm: 80 } }, at: { aiKey: 9e9, gdrive: 9e9, uiScale: 9e9, pcWork: 9e9, theme: 9e9, metro: 9e9 } }, 1000);
    expect(ch.sort()).toEqual(['metro', 'theme']);
    expect(a.aiKey).toBeUndefined(); expect(a.gdrive).toBeUndefined(); expect(a.uiScale).toBeUndefined();
    expect(a.metro).toEqual({ bpm: 80 });
  });

  it('статистика не теряется: счётчики объединяются, журнал вокала — по дням', () => {
    const ea = { stats: { iv: { m3: { c: 3, t: 5 } } }, days: { '2026-11-01': { c: 2, t: 4 } }, ntc: 1 }, eb = { stats: { iv: { m3: { c: 5, t: 9 }, p5: { c: 1, t: 1 } } }, days: { '2026-11-02': { c: 1, t: 1 } } };
    expect(mergeCounters(ea.stats, eb.stats)).toEqual({ iv: { m3: { c: 5, t: 9 }, p5: { c: 1, t: 1 } } });
    expect(mergeCounters(eb.stats, ea.stats)).toEqual(mergeCounters(ea.stats, eb.stats)); // симметрично
    expect(mergeLog([{ d: '2026-11-01', sec: 10, n: 0 }, { d: '2026-11-03', sec: 5, n: 0 }], [{ d: '2026-11-01', sec: 30, n: 0 }, { d: '2026-11-02', sec: 1, n: 0 }]).map((r) => [r.d, r.sec]))
      .toEqual([['2026-11-01', 30], ['2026-11-02', 1], ['2026-11-03', 5]]);
    // два устройства занимались разными днями — после обмена у обоих всё
    const a = mk({ ear: ea, vocal: { log: [{ d: '2026-11-01', sec: 10, n: 0 }] } }, { ear: 600, vocal: 600 });
    const b = mk({ ear: eb, vocal: { log: [{ d: '2026-11-05', sec: 7, n: 0 }] } }, { ear: 700, vocal: 700 });
    mergeSettings(a, pickSettings(b), 1000);
    mergeSettings(b, pickSettings(a), 1000);
    expect(Object.keys(a.ear.days).sort()).toEqual(['2026-11-01', '2026-11-02']);
    expect(a.ear.stats.iv.m3.t).toBe(9);
    expect(a.vocal.log.map((r) => r.d)).toEqual(['2026-11-01', '2026-11-05']);
    expect(hashVal(a.ear)).toBe(hashVal(b.ear)); expect(hashVal(a.vocal)).toBe(hashVal(b.vocal));
    // и дальше не дёргается
    expect(mergeSettings(a, pickSettings(b), 2000)).toEqual([]);
  });

  it('роль: настройки — только своему устройству (own или без роли)', () => {
    expect(isOwn({})).toBe(true); expect(isOwn({ role: 'own' })).toBe(true);
    for (const r of ['receive', 'control', 'view']) expect(isOwn({ role: r })).toBe(false);
    expect(partsFor({ role: 'view' })).not.toContain('settings');
    expect(partsFor({})).toContain('settings');
  });

  it('applyParts: настройки сливаются только при синхронизации; копия из файла — как раньше', () => {
    const st = { version: 1, songs: [], sessions: [], settings: { theme: 'light', goalMin: 300, updatedAt: 100 } };
    stampSettings(st.settings, 100);
    const other = { version: 1, songs: [], sessions: [], settings: { theme: 'dark', goalMin: 450, updatedAt: 300 } };
    stampSettings(other.settings, 300);
    const p = pickParts(other, SYNC_PARTS, { sync: true });
    const out = applyParts(st, p, SYNC_PARTS, { fresh: true, now: 400 });
    expect([out.settings.theme, out.settings.goalMin]).toEqual(['dark', 450]);
    // без fresh поле sset игнорируется (загрузка копии выбирает человек)
    expect(applyParts(st, p, SYNC_PARTS).settings.theme).toBe('light');
    // метки времени в обычную копию не попадают
    expect(Object.keys(pickParts(st, ['settings']).settings)).not.toContain('__at');
  });
});

/* ---------- два устройства целиком ---------- */

function mkFiles() {
  const all = new Map();
  return {
    list: (kind) => [...all.values()].filter((r) => (kind === 'audio' ? !r.kind || r.kind === 'audio' : r.kind === kind)),
    get: (id) => all.get(id), add: async (rec) => { all.set(rec.id, { ...rec }); return rec.id; }, remove: async (id) => { all.delete(id); }, save: async () => {}, all,
  };
}
let clock = 1000;
const mkApp = () => { const store = createStore({ storage: mkLS(), now: () => clock }); return { store, files: mkFiles(), snaps: [], snapshots: null }; };
const song = (id, title, at, extra = {}) => ({ id, title, createdAt: at, updatedAt: at, difficulty: 1, ...extra });
const sess = (id, at, sec = 600) => ({ id, songId: null, start: at, end: at + sec * 1000, sec, tool: 'metro', updatedAt: at });

// транспорт к нескольким устройствам: адрес → контекст сервера
function net(ctxs) {
  return async (method, url, { key = '', json = null, bin = false, withFp = false, pin } = {}) => {
    const u = new URL(url), ctx = ctxs[u.origin];
    if (!ctx) throw new Error('connect timed out');
    if (pin && pin !== (ctx.fp || 'cd'.repeat(32))) throw Object.assign(new Error('pin'), { reason: 'pin' }); // у каждого устройства свой сертификат
    if (u.pathname === '/melete/v1/hello') return { app: 'melete', v: 1, name: ctx.name, kind: 'phone' };
    const r = await handleRequest(ctx, { method, path: u.pathname, query: Object.fromEntries(u.searchParams), key, json: json ? JSON.parse(JSON.stringify(json)) : null }, ctx.incoming || (ctx.incoming = new Map()));
    if (r.status >= 400) throw Object.assign(new Error('http ' + r.status), { status: r.status });
    const out = bin ? r.bytes : r.json;
    return withFp ? { data: out, fp: ctx.fp || 'cd'.repeat(32) } : out;
  };
}

describe('два телефона: правки на обоих, обмен в обе стороны, ничего не теряется', () => {
  let A, B, H, ctxB;
  beforeEach(async () => {
    globalThis.localStorage = mkLS();
    clock = 1000;
    A = mkApp(); B = mkApp();
    ctxB = { app: B, mem: { peers: {} }, code: '111111', name: 'B' };
    H = net({ 'https://192.168.1.20:53329': ctxB });
    await pair('192.168.1.20:53329', '111111', 'A', H);
  });

  it('песни, занятия, правки: «правка на А + правка на Б»', async () => {
    A.store.replaceState({ ...A.store.state, songs: [song('s1', 'Калинка', 100, { tags: ['a'] }), song('s2', 'Только А', 100)], sessions: [sess('x1', 100)] });
    B.store.replaceState({ ...B.store.state, songs: [song('s1', 'Калинка', 100, { tags: ['a'] }), song('s3', 'Только Б', 100)], sessions: [sess('y1', 200)] });
    await syncNow(A, () => {}, H, { dev: 'https://192.168.1.20:53329', now: () => clock });
    // правим разное и одно и то же в разное время
    const upd = (app, id, patch, at) => app.store.replaceState({ ...app.store.state, songs: app.store.state.songs.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: at } : s)) });
    upd(A, 's2', { title: 'А: правка 2' }, 300);
    upd(B, 's3', { title: 'Б: правка 3' }, 310);
    upd(A, 's1', { title: 'Калинка (А)', difficulty: 3 }, 400);
    upd(B, 's1', { title: 'Калинка (Б, позже)', difficulty: 4 }, 500);
    B.store.state.sessions.push(sess('y2', 600)); A.store.state.sessions.push(sess('x2', 700));
    await syncNow(A, () => {}, H, { dev: 'https://192.168.1.20:53329', now: () => clock });
    const titles = (app) => Object.fromEntries(app.store.songs().map((s) => [s.id, s.title]));
    expect(titles(A)).toEqual({ s1: 'Калинка (Б, позже)', s2: 'А: правка 2', s3: 'Б: правка 3' });
    expect(titles(B)).toEqual(titles(A));
    expect(A.store.allSessions().map((s) => s.id).sort()).toEqual(['x1', 'x2', 'y1', 'y2']);
    expect(B.store.allSessions().map((s) => s.id).sort()).toEqual(['x1', 'x2', 'y1', 'y2']);
  });

  it('удаление песни с одного телефона не возвращается и не ломает правку другого', async () => {
    A.store.replaceState({ ...A.store.state, songs: [song('s1', 'Одна', 100), song('s2', 'Две', 100)] });
    await syncNow(A, () => {}, H, { dev: 'https://192.168.1.20:53329', now: () => clock });
    A.store.replaceState({ ...A.store.state, songs: A.store.state.songs.map((s) => (s.id === 's1' ? { ...s, deleted: true, updatedAt: 400 } : s)) });
    B.store.replaceState({ ...B.store.state, songs: B.store.state.songs.map((s) => (s.id === 's2' ? { ...s, title: 'Две (Б)', updatedAt: 450 } : s)) });
    await syncNow(A, () => {}, H, { dev: 'https://192.168.1.20:53329', now: () => clock });
    expect(A.store.songs().map((s) => s.title)).toEqual(['Две (Б)']);
    expect(B.store.songs().map((s) => s.title)).toEqual(['Две (Б)']);
    await syncNow(A, () => {}, H, { dev: 'https://192.168.1.20:53329', now: () => clock });
    expect(B.store.songs().length).toBe(1); // повтор не воскрешает удалённое
  });

  it('настройки: разные ключи — оба сохраняются; один ключ — позднее; секретное и привязанное к устройству остаётся своим', async () => {
    clock = 2000;
    A.store.state.settings.aiKeyLocal = 'не уходит'; // неизвестный и «ключевой» — не ходит
    A.store.state.settings.uiScale = 1.3; A.store.state.settings.pcWork = false; A.store.state.settings.gdrive = true; A.store.state.settings.deskBg = true;
    A.store.state.settings.theme = 'dark'; A.store.settingsChanged();
    clock = 3000;
    B.store.state.settings.goalMin = 450; B.store.state.settings.uiScale = 0.8; B.store.settingsChanged();
    clock = 3500;
    A.store.state.settings.goalMin = 200; A.store.settingsChanged(); // А правил позже, чем Б, пока они не виделись
    clock = 4000;
    await syncNow(A, () => {}, H, { dev: 'https://192.168.1.20:53329', now: () => clock });
    const sa = A.store.state.settings, sb = B.store.state.settings;
    expect([sa.theme, sb.theme]).toEqual(['dark', 'dark']);
    expect([sa.goalMin, sb.goalMin]).toEqual([200, 200]);
    expect([sa.uiScale, sb.uiScale]).toEqual([1.3, 0.8]); // размер интерфейса — у каждого свой
    expect(sb.gdrive).toBeUndefined(); expect(sb.deskBg).toBeUndefined(); expect(sb.pcWork).toBeUndefined(); expect(sb.aiKeyLocal).toBeUndefined();
    // идемпотентно: повтор ничего не меняет
    const j = JSON.stringify([sa, sb]);
    clock = 5000;
    await syncNow(A, () => {}, H, { dev: 'https://192.168.1.20:53329', now: () => clock });
    expect(JSON.stringify([A.store.state.settings, B.store.state.settings])).toBe(j);
  });

  it('позднейшая правка на Б после обмена доходит до А; старое значение не возвращается', async () => {
    clock = 2000; A.store.state.settings.theme = 'dark'; A.store.settingsChanged();
    await syncNow(A, () => {}, H, { dev: 'https://192.168.1.20:53329', now: () => clock });
    clock = 3000; B.store.state.settings.theme = 'oled'; B.store.settingsChanged();
    clock = 3100;
    await syncNow(A, () => {}, H, { dev: 'https://192.168.1.20:53329', now: () => clock });
    expect([A.store.state.settings.theme, B.store.state.settings.theme]).toEqual(['oled', 'oled']);
  });

  it('роль не «своё»: синхронизации нет совсем (роли), ни настройки, ни песни не ходят', async () => {
    const dev = 'https://192.168.1.20:53329';
    const m = JSON.parse(localStorage.getItem('melete.sync')); m.devs[dev].role = 'receive'; localStorage.setItem('melete.sync', JSON.stringify(m));
    clock = 2000; A.store.state.settings.theme = 'dark'; A.store.settingsChanged();
    B.store.state.settings.goalMin = 777; B.store.settingsChanged();
    A.store.replaceState({ ...A.store.state, songs: [song('s1', 'Песня', 100)] });
    await expect(syncNow(A, () => {}, H, { dev, now: () => clock })).rejects.toThrow('mode'); // роль receive: синхронизация базы запрещена
    expect(B.store.songs().length).toBe(0);
    expect(B.store.state.settings.theme).not.toBe('dark');
    expect(A.store.state.settings.goalMin).not.toBe(777);
  });

  it('старая версия без sset: её ответ не трогает настройки', async () => {
    const dev = 'https://192.168.1.20:53329';
    clock = 2000; A.store.state.settings.theme = 'dark'; A.store.settingsChanged();
    const old = async (m, url, o) => { const r = await H(m, url, o); if (r && r.data) { delete r.data.sset; r.data.settings = { theme: 'oled', aiKey: 'x' }; } return r; };
    await syncNow(A, () => {}, old, { dev, now: () => clock });
    expect(A.store.state.settings.theme).toBe('dark');
    expect(A.store.state.settings.aiKey).toBeUndefined();
  });

  it('перед первым слиянием настроек — копия; не вышла — настройки не вливаются, остальное идёт', async () => {
    const H0 = H, dev = 'https://192.168.1.20:53329';
    B.store.state.settings.goalMin = 888; B.store.settingsChanged();
    A.store.replaceState({ ...A.store.state, songs: [song('s1', 'Песня', 100)] });
    const taken = [];
    // хранилище общее у обоих «телефонов» в тесте: флаг первого слияния, поставленный стороной Б, снимаем перед ответом
    const del = { on: true };
    const Hw = async (m, url, o) => { const r = await H0(m, url, o); if (del.on) { const mm = JSON.parse(localStorage.getItem('melete.sync')); delete mm.ssync; localStorage.setItem('melete.sync', JSON.stringify(mm)); } return r; };
    A.snapshots = { take: async (k) => { taken.push(k); return null; } }; // копия не получилась
    await syncNow(A, () => {}, Hw, { dev, now: () => clock });
    expect(taken).toEqual(['sync']);
    expect(A.store.state.settings.goalMin).not.toBe(888);
    expect(B.store.songs().length).toBe(1);
    A.snapshots = { take: async (k) => { taken.push(k); return 'id1'; } };
    await syncNow(A, () => {}, Hw, { dev, now: () => clock });
    expect(taken).toEqual(['sync', 'sync']);
    expect(A.store.state.settings.goalMin).toBe(888);
    del.on = false;
    await syncNow(A, () => {}, Hw, { dev, now: () => clock });
    expect(taken.length).toBe(2); // копия — один раз
  });
});

/* ---------- фон: все сопряжённые устройства ---------- */

describe('фоновая синхронизация: компьютер и все свои устройства', () => {
  let A, B, C, H, t;
  const ADDR_B = 'https://192.168.1.20:53329', ADDR_C = 'https://192.168.1.21:53329';
  beforeEach(async () => {
    globalThis.localStorage = mkLS();
    clock = 1000; t = 60 * 60000;
    A = mkApp(); B = mkApp(); C = mkApp();
    const ctxB = { app: B, mem: { peers: {} }, code: '111111', name: 'B' }, ctxC = { app: C, mem: { peers: {} }, code: '222222', name: 'C', fp: 'ef'.repeat(32) };
    H = net({ [ADDR_B]: ctxB, [ADDR_C]: ctxC });
    await pair('192.168.1.20:53329', '111111', 'A', H);
    await pair('192.168.1.21:53329', '222222', 'A', H);
    A.store.replaceState({ ...A.store.state, songs: [song('s1', 'Песня А', 100)] });
  });
  const edit = (fn) => { const m = JSON.parse(localStorage.getItem('melete.sync')); fn(m); localStorage.setItem('melete.sync', JSON.stringify(m)); };

  it('по очереди, по одному за проход; оба устройства получают данные', async () => {
    const cli = createSyncClient(A, { H, now: () => t });
    await cli.tick();
    expect([B.store.songs().length, C.store.songs().length].sort()).toEqual([0, 1]); // за проход — одно устройство
    await cli.tick();
    expect([B.store.songs().length, C.store.songs().length]).toEqual([1, 1]);
  });

  it('не в тишине — не синхронизирует; «только пульт» и роль не own — пропускает', async () => {
    A.auto = { quiet: () => false };
    const cli = createSyncClient(A, { H, now: () => t });
    await cli.tick();
    expect([B.store.songs().length, C.store.songs().length]).toEqual([0, 0]);
    A.auto = { quiet: () => true };
    edit((m) => { m.devs[ADDR_B].mode = { rc: true, sync: false }; m.devs[ADDR_C].role = 'view'; });
    await cli.tick(); await cli.tick();
    expect([B.store.songs().length, C.store.songs().length]).toEqual([0, 0]);
    edit((m) => { m.devs[ADDR_C].role = 'own'; });
    await cli.tick();
    expect(C.store.songs().length).toBe(1);
  });

  it('syncAuto выключен — фона нет; устройство не отвечает — реже, остальные не страдают', async () => {
    const cli = createSyncClient(A, { H, now: () => t });
    A.store.state.settings.syncAuto = false;
    await cli.tick();
    expect([B.store.songs().length, C.store.songs().length]).toEqual([0, 0]);
    A.store.state.settings.syncAuto = true;
    const Hdown = async (m, url, o) => { if (url.startsWith(ADDR_B)) throw new Error('connect timed out'); return H(m, url, o); };
    const cli2 = createSyncClient(A, { H: Hdown, now: () => t });
    for (let i = 0; i < 4; i++) { t += 60000; await cli2.tick(); }
    expect(B.store.songs().length).toBe(0);
    expect(C.store.songs().length).toBe(1);
    expect(cli2.lastOf(ADDR_B).ok).toBe(false);
    expect(cli2.lastOf(ADDR_C).ok).toBe(true);
    expect(cli2.last).toBe(null); // итог компьютера не затёрт чужими
  });

  it('устройство сменило адрес: находится по отпечатку, запись переезжает под новый адрес', async () => {
    const NEW = 'https://192.168.1.23:53329';
    // B помнит ключ A (сопряжение было по старому адресу), но теперь живёт на новом; на .22 — чужой Melete с другим сертификатом
    const peers = {};
    const m0 = JSON.parse(localStorage.getItem('melete.sync')); peers[m0.devs[ADDR_B].key] = { name: 'A', at: 1 };
    const Hmoved = net({ [NEW]: { app: B, mem: { peers }, name: 'B' }, [ADDR_C]: { app: C, mem: { peers: {} }, name: 'C', fp: 'ef'.repeat(32) } });
    const seen = [];
    const Hs = async (m, url, o = {}) => { if (new URL(url).hostname === '192.168.1.22') { if (o.pin && o.pin !== 'ee'.repeat(32)) throw Object.assign(new Error('pin'), { reason: 'pin' }); seen.push(o.key); return { app: 'melete', name: 'Чужой' }; } return Hmoved(m, url, o); };
    A.store.replaceState({ ...A.store.state, songs: [song('s1', 'Песня А', 100)] });
    await syncNow(A, () => {}, Hs, { dev: ADDR_B, now: () => t });
    const m = JSON.parse(localStorage.getItem('melete.sync'));
    expect(Object.keys(m.devs)).toContain(NEW);
    expect(Object.keys(m.devs)).not.toContain(ADDR_B);
    expect(m.devs[NEW].addr).toBe(NEW);
    expect(m.devs[NEW].key).toBe(m0.devs[ADDR_B].key);
    expect(B.store.songs().length).toBe(1);
    expect(seen.filter(Boolean)).toEqual([]); // ключ посторонним не уходил
  });

  it('findMoved для устройств: телефон подходит, если отпечаток тот же; для компьютера телефоны отсеиваются', async () => {
    const FP = 'ab'.repeat(32);
    const Hn = async (m, url) => { if (new URL(url).hostname === '192.168.1.9') return { app: 'melete', kind: 'phone' }; throw new Error('x'); };
    expect(await findMoved('https://192.168.1.5:53329', FP, Hn)).toBe(null);
    expect(await findMoved('https://192.168.1.5:53329', FP, Hn, { anyKind: true })).toBe('https://192.168.1.9:53329');
  });
});

describe('мелочи', () => {
  it('scrub убирает вложенные секреты и не трогает остальное', () => {
    expect(scrub({ a: 1, token: 'x', b: [{ password: 'p', c: 2 }] })).toEqual({ a: 1, b: [{ c: 2 }] });
  });
});
