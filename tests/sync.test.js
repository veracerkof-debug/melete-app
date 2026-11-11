import { describe, it, expect, beforeEach } from 'vitest';
import { planFiles, baseOf, manifestOf, handleRequest, pair, syncNow, pcOf, newCode, b64, mergeMeta, metaHash, createSyncClient, PORT, PORT_DEV } from '../src/core/sync.js';
import { createStore } from '../src/core/store.js';

// localStorage для node: и у телефона, и у компьютера своё — переключаем подменой
const mkLS = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

function mkFiles() {
  const all = new Map();
  return {
    list: (kind) => [...all.values()].filter((r) => (kind === 'audio' ? !r.kind || r.kind === 'audio' : r.kind === kind)),
    get: (id) => all.get(id),
    add: async (rec) => { const id = rec.id || 'f' + all.size; all.set(id, { ...rec, id, size: rec.blob ? rec.blob.size : rec.size }); return id; },
    remove: async (id) => { all.delete(id); },
    save: async () => {},
    all,
  };
}
function mkApp() {
  const storage = mkLS();
  return { store: createStore({ storage }), files: mkFiles() };
}
const song = (id, title, at) => ({ id, title, createdAt: at, updatedAt: at, difficulty: 1 });
const bytes = (n, v) => new Blob([new Uint8Array(n).fill(v)]);

// транспорт: запросы телефона идут прямо в обработчик компьютера
function link(pcCtx, incoming = new Map()) {
  return async (method, url, { key = '', json = null, bin = false, withFp = false } = {}) => {
    const u = new URL(url);
    if (withFp) return { data: await link(pcCtx, incoming)(method, url, { key, json, bin }), fp: 'ab'.repeat(32) };
    if (u.pathname === '/melete/v1/hello') return { app: 'melete', v: 1, name: 'PC' };
    const r = await handleRequest(pcCtx, { method, path: u.pathname, query: Object.fromEntries(u.searchParams), key, json: json ? JSON.parse(JSON.stringify(json)) : null }, incoming);
    if (r.status >= 400) throw Object.assign(new Error('http ' + r.status), { status: r.status });
    return bin ? r.bytes : r.json;
  };
}

describe('связь телефона и компьютера: план файлов', () => {
  it('новые — в обе стороны, удалённые — переносятся', () => {
    const p = planFiles([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ id: 'b' }, { id: 'd' }, { id: 'e' }], ['c', 'e']);
    expect(p.upload).toEqual(['a']);       // только у меня, раньше не было — отправить
    expect(p.delMine).toEqual(['c']);      // было у обоих, там удалили — удалить у меня
    expect(p.download).toEqual(['d']);     // только у них, новое — скачать
    expect(p.delTheirs).toEqual(['e']);    // было у обоих, я удалил — удалить у них
  });
  it('адрес с компьютера в любом виде', () => {
    expect(baseOf('192.168.1.5')).toBe('https://192.168.1.5:' + PORT);
    expect(baseOf(' 192,168,1,5 ')).toBe('https://192.168.1.5:' + PORT);
    expect(baseOf('http://10.0.0.2:8000/')).toBe('https://10.0.0.2:8000'); // компьютер говорит только по TLS
    expect(baseOf('')).toBeNull();
  });
  it('дорожки синхронизируются, модули Библии — нет', () => {
    const m = manifestOf([{ id: 'a', blob: bytes(3, 1) }, { id: 's', stem: { src: 'a', part: 'vocals', mode: '4' }, blob: bytes(3, 1) }, { id: 'b', kind: 'bible', size: 9 }]);
    expect(m.map((x) => x.id)).toEqual(['a', 's']);
    expect(m[1].k).toBe('s:a:vocals:4:0');
  });
  it('одна и та же дорожка с двух устройств не задваивается; пересчитанная заменяет старую', () => {
    const v = (id) => ({ id, k: 's:a:vocals:4:0' });
    expect(planFiles([v('s1')], [v('s2')], [])).toMatchObject({ upload: [], download: [] });
    // на компьютере пересчитали: старая s1 исчезла (была на обоих), пришла s2 с тем же ключом
    expect(planFiles([v('s1')], [v('s2')], ['s1'])).toMatchObject({ delMine: ['s1'], download: ['s2'], upload: [] });
  });
  it('сведения записи сливаются одинаково с обеих сторон', () => {
    const ph = { id: 'r', songs: ['x'], ana: { v: 1, at: 5, bpm: 100 }, want: { stems: '6' } };
    const pc = { id: 'r', songs: ['y'], ana: { v: 2, at: 3, bpm: 98 }, lyr: { at: 9, lines: [] }, stemsAbsent: { 4: ['other'] } };
    const a = { ...ph, ...mergeMeta(ph, pc) }, b = { ...pc, ...mergeMeta(pc, ph) };
    expect(a.ana.v).toBe(2); expect(a.lyr.at).toBe(9); expect(a.songs.sort()).toEqual(['x', 'y']); expect(b.want).toEqual({ stems: '6' });
    expect(metaHash(a)).toBe(metaHash(b));
    expect(mergeMeta(a, b)).toBeNull();
    expect(planFiles([{ id: 'r', h: metaHash(ph) }], [{ id: 'r', h: metaHash(pc) }]).meta).toEqual(['r']);
  });
  it('код — 6 цифр, base64 туда и обратно', () => {
    expect(newCode()).toMatch(/^\d{6}$/);
    const u = new Uint8Array([0, 1, 254, 255, 128]);
    expect([...b64.to(b64.from(u))]).toEqual([...u]);
  });
});

describe('связь телефона и компьютера: целиком', () => {
  let phone, pc, pcCtx, H;
  beforeEach(() => {
    globalThis.localStorage = mkLS(); // хранилище телефона (ключ сопряжения, что было на обоих)
    phone = mkApp(); pc = mkApp();
    pcCtx = { app: pc, mem: {}, code: '482913', name: 'PC' };
    H = link(pcCtx);
  });

  it('неверный код — отказ, верный — ключ', async () => {
    await expect(pair('192.168.1.5', '000000', 'Телефон', H)).rejects.toMatchObject({ reason: 'code' });
    const p = await pair('192.168.1.5', '482 913', 'Телефон', H);
    expect(p.key).toMatch(/^[0-9a-f]{32}$/);
    expect(pcOf().name).toBe('PC');
    expect(pcOf().fp).toBe('ab'.repeat(32)); // отпечаток сертификата, через который выдан ключ
    expect(pcOf().v).toBe(3);
    expect(Object.keys(pcCtx.mem.peers)).toEqual([p.key]);
  });

  it('песни и файлы сходятся, правка новее побеждает, удаление переносится', async () => {
    phone.store.replaceState({ ...phone.store.state, songs: [song('s1', 'Калинка', 100), song('s2', 'Только на телефоне', 100)] });
    pc.store.replaceState({ ...pc.store.state, songs: [song('s1', 'Калинка (правка на ПК)', 200), song('s3', 'Только на ПК', 100)] });
    await phone.files.add({ id: 'fp', name: 'phone.wav', type: 'audio/wav', kind: 'audio', blob: bytes(5 << 20, 7) }); // 5 МБ — три куска
    await pc.files.add({ id: 'fc', name: 'pc.pdf', type: 'application/pdf', kind: 'tab', blob: bytes(1000, 3) });
    await pair('192.168.1.5', '482913', 'Телефон', H);

    const r = await syncNow(phone, () => {}, H);
    expect(r).toMatchObject({ up: 1, down: 1, removed: 0 });
    const titles = (a) => a.store.songs().map((s) => s.title).sort();
    expect(titles(phone)).toEqual(['Калинка (правка на ПК)', 'Только на ПК', 'Только на телефоне']);
    expect(titles(pc)).toEqual(titles(phone));
    expect(pc.files.get('fp').blob.size).toBe(5 << 20);
    const got = new Uint8Array(await pc.files.get('fp').blob.arrayBuffer());
    expect(got[0]).toBe(7); expect(got[(5 << 20) - 1]).toBe(7);
    expect(phone.files.get('fc').blob.size).toBe(1000);

    // повтор — ничего лишнего
    expect(await syncNow(phone, () => {}, H)).toMatchObject({ up: 0, down: 0, removed: 0 });

    // на телефоне удалили pdf — с компьютера тоже уходит; на ПК удалили запись — уходит с телефона
    await phone.files.remove('fc');
    await pc.files.remove('fp');
    const r3 = await syncNow(phone, () => {}, H);
    expect(r3.removed).toBe(2);
    expect(phone.files.get('fp')).toBeUndefined();
    expect(pc.files.get('fc')).toBeUndefined();
  });

  it('чужой ключ — отказ', async () => {
    await pair('192.168.1.5', '482913', 'Телефон', H);
    pcCtx.mem.peers = {}; // компьютер забыл телефон
    await expect(syncNow(phone, () => {}, H)).rejects.toMatchObject({ reason: 'key' });
  });

  it('компьютер посчитал дорожки, разбор и текст — всё приходит на телефон', async () => {
    await phone.files.add({ id: 'rec', name: 'song.wav', type: 'audio/wav', kind: 'audio', created: 1, blob: bytes(3000, 1) });
    await pair('192.168.1.5', '482913', 'Телефон', H);
    await syncNow(phone, () => {}, H, { want: { stems: '6', hq: false } });
    expect(pc.files.get('rec').want).toEqual({ stems: '6', hq: false }); // режим, который просил телефон
    // на компьютере фоновая очередь посчитала
    const r = pc.files.get('rec');
    r.ana = { v: 2, at: 10, bpm: 92, pc: 9, minor: true }; r.lyr = { v: 1, at: 11, lines: [{ t: 0, s: 'Ой' }] }; r.stemsAbsent = { 6: ['piano'] };
    for (const part of ['vocals', 'drums']) await pc.files.add({ id: 'sm' + part, name: part + '.wav', kind: 'audio', type: 'audio/wav', blob: bytes(500, 2), stem: { src: 'rec', part, mode: '6', hq: false } });
    const out = await syncNow(phone, () => {}, H);
    expect(out).toMatchObject({ down: 2, up: 0, meta: 1 });
    const p = phone.files.get('rec');
    expect(p.ana.bpm).toBe(92); expect(p.lyr.lines[0].s).toBe('Ой'); expect(p.stemsAbsent).toEqual({ 6: ['piano'] });
    expect(phone.files.get('smvocals').stem).toMatchObject({ src: 'rec', part: 'vocals' });
    // повтор — тихо
    expect(await syncNow(phone, () => {}, H)).toMatchObject({ down: 0, up: 0, meta: 0 });
  });

  it('у компьютера звучит музыка — фоновая синхронизация ждёт, ручная идёт', async () => {
    await pair('192.168.1.5', '482913', 'Телефон', H);
    pcCtx.busy = () => true;
    await expect(syncNow(phone, () => {}, H, { auto: true })).rejects.toMatchObject({ reason: 'busy' });
    await expect(syncNow(phone, () => {}, H)).resolves.toMatchObject({ up: 0 });
  });

  it('прерванная передача продолжается с того же места', async () => {
    await phone.files.add({ id: 'big', name: 'big.wav', kind: 'audio', type: 'audio/wav', blob: bytes(5 << 20, 4) });
    await pair('192.168.1.5', '482913', 'Телефон', H);
    let n = 0, puts = 0;
    const H2 = async (m, url, o) => { if (url.includes('/put')) puts++; return H(m, url, o); };
    await expect(syncNow(phone, () => {}, H2, { stop: () => puts >= 1 && ++n > 1 })).rejects.toMatchObject({ reason: 'stopped' });
    expect(pc.files.get('big')).toBeUndefined();
    puts = 0;
    await syncNow(phone, () => {}, H2);
    expect(pc.files.get('big').blob.size).toBe(5 << 20);
    expect(puts).toBe(2); // первый кусок уже был у компьютера: отказ «с какого» + два оставшихся без повтора первого
  });

  it('телефон ждёт компьютер только для свежих записей и того, что компьютер умеет', async () => {
    await pair('192.168.1.5', '482913', 'Телефон', H);
    pcCtx.work = () => ({ stems: '4', ana: true, lyr: true });
    await syncNow(phone, () => {}, H);
    let t = Date.now();
    const C = createSyncClient(phone, { H, now: () => t });
    phone.store.state.settings.pcWork = true;
    expect(C.waits({ id: 'n', created: t - 3600000 }, 'stems')).toBe(true);
    expect(C.waits({ id: 'o', created: t - 2 * 86400000 }, 'stems')).toBe(false); // старая и не на компьютере — считать самому
    phone.store.state.settings.pcWork = false;
    expect(C.waits({ id: 'n', created: t - 3600000 }, 'stems')).toBe(false);
    phone.store.state.settings.pcWork = true;
    t += 4 * 86400000; // компьютера не было четыре дня
    expect(C.waits({ id: 'n', created: t - 3600000 }, 'stems')).toBe(false);
  });
});

describe('порт DEV', () => {
  it('сопряжение DEV до 30.10 (общий порт 53319) переезжает на свой порт один раз', () => {
    let store = JSON.stringify({ pc: { addr: 'http://192.168.1.5:53319', key: 'k', name: 'PC' } });
    globalThis.localStorage = { getItem: () => store, setItem: (_, v) => { store = v; } };
    const pc = pcOf();
    if (PORT === PORT_DEV) expect(pc.addr).toBe('http://192.168.1.5:' + PORT_DEV);
    expect(JSON.parse(store).pc.v).toBe(2);
    delete globalThis.localStorage;
  });
});

import { oldPc, fpCheck } from '../src/core/sync.js';
import { Capacitor } from '@capacitor/core';
import { vi } from 'vitest';
describe('связь по TLS с отпечатком', () => {
  it('телефон: сопряжение без отпечатка (до 02.11) снимается один раз, адрес остаётся для формы', () => {
    let store = JSON.stringify({ pc: { addr: 'http://192.168.1.5:' + PORT, key: 'k', name: 'PC', v: 2 } });
    globalThis.localStorage = { getItem: () => store, setItem: (_, v) => { store = v; } };
    const nat = vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    try {
      expect(pcOf()).toBeNull();
      expect(JSON.parse(store).pc).toBeUndefined();
      expect(oldPc()).toBe('192.168.1.5');
      // новое сопряжение (v: 3, отпечаток) — остаётся
      store = JSON.stringify({ pc: { addr: 'https://192.168.1.5:' + PORT, key: 'k', name: 'PC', v: 3, fp: 'ab'.repeat(32) } });
      expect(pcOf().fp).toBe('ab'.repeat(32));
    } finally { nat.mockRestore(); delete globalThis.localStorage; }
  });
  it('проверочный код — первые 8 знаков отпечатка', () => {
    expect(fpCheck('1a2b3c4d' + '0'.repeat(56))).toBe('1A2B 3C4D');
    expect(fpCheck('')).toBe('');
  });
});

import { resetPairGuard, PAIR_TRIES } from '../src/core/sync.js';
describe('подбор кода сопряжения', () => {
  it('после 5 неверных кодов — пауза, даже верный код ждёт', async () => {
    resetPairGuard();
    let t = 1000;
    const ctx = { app: {}, mem: {}, code: '123456', name: 'PC', now: () => t };
    const ask = (code) => handleRequest(ctx, { path: '/melete/v1/pair', json: { code, name: 'x' } });
    for (let i = 0; i < PAIR_TRIES; i++) expect((await ask('000000')).status).toBe(403);
    expect((await ask('123456')).status).toBe(429);
    t += 61000;
    expect((await ask('123456')).status).toBe(200);
    resetPairGuard();
  });
});

// Сопряжение по QR (06.11.2026)
import { pairPayload, parsePair } from '../src/core/screens/qrscan.js';
describe('QR сопряжения', () => {
  it('код компьютера читается телефоном; чужие коды — нет', () => {
    const fp = 'ab'.repeat(32);
    expect(parsePair(pairPayload('192.168.1.5', '123456', fp))).toEqual({ addr: '192.168.1.5', code: '123456', fp: fp.slice(0, 16) });
    expect(parsePair('https://example.com')).toBeNull();
    expect(parsePair('MELETE-PAIR;a=1.2.3.4;c=12')).toBeNull();
  });
});

// Связь всех со всеми (Melete DEV, 07.11.2026): телефон принимает подключения другого телефона — тот же протокол;
// сопряжённый телефон — в списке устройств, компьютер остаётся отдельным; синхронизация идёт с выбранным устройством
describe('связь между телефонами', () => {
  it('телефон ↔ телефон: сопряжение в список устройств, синхронизация в обе стороны, компьютер не тронут', async () => {
    const { devsOf } = await import('../src/core/sync.js');
    globalThis.localStorage = mkLS();
    const a = mkApp(), b = mkApp(), pcApp = mkApp();
    const bCtx = { app: b, mem: {}, code: '111222', name: 'Pixel' }, pcCtx = { app: pcApp, mem: {}, code: '333444', name: 'PC' };
    const phoneLink = (ctx) => { const L = link(ctx); return async (m, url, o = {}) => (new URL(url).pathname === '/melete/v1/hello' ? { app: 'melete', v: 1, name: ctx.name, kind: 'phone' } : L(m, url, o)); };
    await pair('192.168.1.5', '333444', 'Телефон', link(pcCtx)); // компьютер — как раньше
    const d = await pair('192.168.1.7', '111222', 'Телефон', phoneLink(bCtx));
    expect(d.phone).toBe(true);
    expect(devsOf().map((x) => x.name)).toEqual(['Pixel']);
    expect(pcOf().name).toBe('PC');
    a.store.replaceState({ ...a.store.state, songs: [song('s1', 'Песня A', 100)] });
    b.store.replaceState({ ...b.store.state, songs: [song('s2', 'Песня B', 100)] });
    await a.files.add({ id: 'fa', name: 'a.wav', type: 'audio/wav', kind: 'audio', blob: bytes(3000, 1) });
    await b.files.add({ id: 'fb', name: 'b.wav', type: 'audio/wav', kind: 'audio', blob: bytes(2000, 2) });
    const r = await syncNow(a, () => {}, phoneLink(bCtx), { dev: d.addr });
    expect(r).toMatchObject({ up: 1, down: 1 });
    expect(b.store.songs().map((s) => s.title).sort()).toEqual(['Песня A', 'Песня B']);
    expect(a.files.get('fb').blob.size).toBe(2000);
    expect(b.files.get('fa').blob.size).toBe(3000);
    expect(devsOf()[0].last).toBeGreaterThan(0);
    expect(pcOf().last).toBe(0); // синхронизация с телефоном не трогает запись компьютера
    expect(pcApp.files.get('fa')).toBeUndefined();
  });
});

describe('пульт через связь', () => {
  it('без ключа — отказ, с ключом — к обработчику пульта с именем устройства', async () => {
    const app = mkApp(), calls = [];
    const ctx = { app, mem: { peers: { k1: { name: 'Pixel', at: 0 } } }, rc: async (p, j, peer) => { calls.push([p, j, peer]); return { status: 200, json: { ok: 1 } }; } };
    expect((await handleRequest(ctx, { method: 'GET', path: '/melete/v1/rc/state', query: {}, key: 'чужой', json: null })).status).toBe(401);
    const r = await handleRequest(ctx, { method: 'POST', path: '/melete/v1/rc/cmd', query: {}, key: 'k1', json: { a: 'play' } });
    expect(r.json.ok).toBe(1);
    expect(calls[0]).toEqual(['/melete/v1/rc/cmd', { a: 'play' }, { key: 'k1', name: 'Pixel' }]);
  });
});

describe('отправка файла на устройство', () => {
  it('файл кусками доходит до медиатеки устройства, там сообщают, повтор — «уже есть»', async () => {
    const { sendFile } = await import('../src/core/sync.js');
    globalThis.localStorage = mkLS();
    const a = mkApp(), b = mkApp(), got = [];
    const bCtx = { app: b, mem: {}, code: '555666', name: 'Pixel', got: (meta, peer) => got.push([meta.name, peer.name]) };
    const L = link(bCtx), H = async (m, url, o = {}) => (new URL(url).pathname === '/melete/v1/hello' ? { app: 'melete', v: 1, name: 'Pixel', kind: 'phone' } : L(m, url, o));
    const d = await pair('192.168.1.9', '555666', 'Телефон', H);
    await a.files.add({ id: 'big', name: 'Репетиция.wav', type: 'audio/wav', kind: 'audio', blob: bytes(5 << 20, 9) });
    const steps = [];
    const r = await sendFile(a, a.files.get('big'), (f) => steps.push(f), H, { dev: d.addr });
    expect(r.have).toBe(false);
    expect(b.files.get('big').blob.size).toBe(5 << 20);
    expect(steps.at(-1)).toBe(1);
    expect(got).toEqual([['Репетиция.wav', 'Телефон']]);
    expect((await sendFile(a, a.files.get('big'), () => {}, H, { dev: d.addr })).have).toBe(true);
  });
});

import { desktopOS } from '../src/core/desktop.js';
describe('платформа компьютера в отчёте', () => {
  it('Linux (WebKitGTK), Windows (WebView2), macOS', () => {
    expect(desktopOS('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko)')).toBe('Linux');
    expect(desktopOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/120')).toBe('Windows');
    expect(desktopOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15')).toBe('macOS');
  });
});

describe('сопряжение без ключа (Linux 11.11.2026: ответ окна приходил кашей байтов)', () => {
  it('ответ 200 без ключа — ошибка, компьютер не сохраняется', async () => {
    localStorage.removeItem('melete.sync');
    const H = async (m, url) => (url.endsWith('/hello') ? { app: 'melete', name: 'PC' } : { 0: 123, 1: 34 });
    await expect(pair('192.168.1.5', '123456', 'Телефон', H)).rejects.toMatchObject({ reason: 'off' });
    expect(pcOf()).toBe(null);
  });
});
