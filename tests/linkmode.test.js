// Режимы связи («Пульт» / «Синхронизация базы», слово автора 18.11.2026) и компьютер в фоне (deskbg.js, bg.rs)
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { modeOf, applyMode, kindOf, allows, modeName, activeCount } from '../src/core/linkmode.js';
import { handleRequest, syncNow, pair, pcOf, setLinkMode, createSyncClient } from '../src/core/sync.js';
import { createStore } from '../src/core/store.js';
import { tipText } from '../src/core/deskbg.js';

const mkLS = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const mkFiles = () => {
  const all = new Map();
  return { list: (k) => [...all.values()].filter((r) => (k === 'audio' ? !r.kind || r.kind === 'audio' : r.kind === k)), get: (id) => all.get(id), add: async (rec) => { all.set(rec.id, { ...rec, size: rec.blob ? rec.blob.size : rec.size }); return rec.id; }, remove: async (id) => { all.delete(id); }, save: async () => {}, all };
};
const mkApp = () => ({ store: createStore({ storage: mkLS() }), files: mkFiles() });
const song = (id, title, at) => ({ id, title, createdAt: at, updatedAt: at, difficulty: 1 });
const link = (ctx) => async (method, url, { key = '', json = null, bin = false, withFp = false } = {}) => {
  const u = new URL(url);
  if (u.pathname === '/melete/v1/hello') return { app: 'melete', v: 1, name: 'PC' };
  if (withFp) return { data: await link(ctx)(method, url, { key, json, bin }), fp: 'ab'.repeat(32) };
  const r = await handleRequest(ctx, { method, path: u.pathname, query: Object.fromEntries(u.searchParams), key, json: json ? JSON.parse(JSON.stringify(json)) : null });
  if (r.status >= 400) throw Object.assign(new Error('http ' + r.status), { status: r.status });
  return bin ? r.bytes : r.json;
};

describe('режимы связи: чистая логика', () => {
  it('старое сопряжение без режима — включено всё', () => {
    expect(modeOf({})).toEqual({ rc: true, sync: true });
    expect(modeOf(null)).toEqual({ rc: true, sync: true });
    expect(modeOf({ mode: { rc: false } })).toEqual({ rc: false, sync: true });
    expect(modeName({})).toBe('both'); expect(modeName({ mode: { sync: false } })).toBe('rc'); expect(modeName({ mode: { rc: false } })).toBe('sync');
  });
  it('оба выключить нельзя: второй включается', () => {
    expect(applyMode({ mode: { rc: true, sync: false } }, { rc: false })).toEqual({ rc: false, sync: true });
    expect(applyMode({ mode: { rc: false, sync: true } }, { sync: false })).toEqual({ rc: true, sync: false });
    expect(applyMode({}, { sync: false })).toEqual({ rc: true, sync: false });
  });
  it('пути: пульт, данные и файлы, остальное без режима', () => {
    expect(kindOf('/melete/v1/rc/cmd')).toBe('rc');
    for (const p of ['sync', 'put', 'get', 'meta', 'setmeta', 'delete']) expect(kindOf('/melete/v1/' + p)).toBe('sync');
    for (const p of ['pair', 'hello', 'ens']) expect(kindOf('/melete/v1/' + p)).toBe('other');
  });
  it('«только Пульт»: команды идут, данные нет; кнопка «Отправить» и ансамбль — в любом режиме', () => {
    const rc = { mode: { rc: true, sync: false } }, sy = { mode: { rc: false, sync: true } };
    expect(allows(rc, '/melete/v1/rc/cmd')).toBe(true);
    expect(allows(rc, '/melete/v1/sync', {})).toBe(false);
    expect(allows(rc, '/melete/v1/get')).toBe(false);
    expect(allows(rc, '/melete/v1/put', { meta: { id: 'a' } })).toBe(false);
    expect(allows(rc, '/melete/v1/put', { meta: { id: 'a', sent: true } })).toBe(true);
    expect(allows(rc, '/melete/v1/put', { meta: { id: 'a', ens: 1 } })).toBe(true);
    expect(allows(sy, '/melete/v1/rc/state')).toBe(false);
    expect(allows(sy, '/melete/v1/sync', {})).toBe(true);
    expect(allows(rc, '/melete/v1/ens')).toBe(true);
  });
  it('«N устройств»: считаются запросы не старше окна', () => {
    const now = 100000;
    expect(activeCount({ a: now - 1000, b: now - 19000, c: now - 60000 }, now)).toBe(2);
    expect(activeCount({}, now)).toBe(0);
  });
  it('текст значка', () => {
    const tr = (k, p) => k + (p ? ':' + p.n : '');
    expect(tipText(tr, false, 3)).toBe('bg.tipOff');
    expect(tipText(tr, true, 0)).toBe('bg.tip0');
    expect(tipText(tr, true, 2)).toBe('bg.tip:2');
  });
});

describe('режимы связи: телефон и компьютер', () => {
  let phone, pc, pcCtx, H;
  beforeEach(() => {
    globalThis.localStorage = mkLS();
    phone = mkApp(); pc = mkApp();
    pcCtx = { app: pc, mem: {}, code: '482913', name: 'PC' };
    H = link(pcCtx);
    phone.store.replaceState({ ...phone.store.state, songs: [song('s1', 'Калинка', 100)] });
    pc.store.replaceState({ ...pc.store.state, songs: [song('s2', 'Только на ПК', 100)] });
  });

  it('по умолчанию (старое сопряжение) — синхронизация как раньше', async () => {
    await pair('192.168.1.5', '482913', 'Телефон', H);
    await syncNow(phone, () => {}, H);
    expect(pc.store.songs().map((s) => s.title).sort()).toEqual(['Калинка', 'Только на ПК']);
  });

  it('компьютер: «только Пульт» — данные ни в одну сторону, пульт отвечает', async () => {
    const p = await pair('192.168.1.5', '482913', 'Телефон', H);
    pcCtx.mem.peers[p.key].mode = applyMode({}, { sync: false });
    pcCtx.rc = async () => ({ status: 200, json: { ok: 1 } });
    await expect(syncNow(phone, () => {}, H)).rejects.toMatchObject({ reason: 'mode' });
    expect(pc.store.songs().map((s) => s.title)).toEqual(['Только на ПК']); // ничего не пришло
    expect(phone.store.songs().map((s) => s.title)).toEqual(['Калинка']); // и не ушло
    const r = await handleRequest(pcCtx, { method: 'POST', path: '/melete/v1/rc/cmd', query: {}, key: p.key, json: { a: 'bpm' } });
    expect(r.status).toBe(200);
  });

  it('компьютер: «только синхронизация» — пульт закрыт (403), данные идут', async () => {
    const p = await pair('192.168.1.5', '482913', 'Телефон', H);
    pcCtx.mem.peers[p.key].mode = { rc: false, sync: true };
    pcCtx.rc = async () => ({ status: 200, json: {} });
    const r = await handleRequest(pcCtx, { method: 'GET', path: '/melete/v1/rc/state', query: {}, key: p.key });
    expect(r).toMatchObject({ status: 403, json: { error: 'mode' } });
    await syncNow(phone, () => {}, H);
    expect(pc.store.songs().length).toBe(2);
  });

  it('телефон: «только Пульт» — синхронизации нет совсем, ручной тоже; запросов на компьютер не идёт', async () => {
    await pair('192.168.1.5', '482913', 'Телефон', H);
    setLinkMode({ sync: false });
    expect(pcOf().mode).toEqual({ rc: true, sync: false });
    let calls = 0;
    const H2 = async (...a) => { calls++; return H(...a); };
    await expect(syncNow(phone, () => {}, H2)).rejects.toMatchObject({ reason: 'mode' });
    expect(calls).toBe(0);
    expect(pc.store.songs().length).toBe(1);
  });

  it('фоновая синхронизация (syncAuto) уважает режим: в «только Пульт» тик ничего не отправляет', async () => {
    await pair('192.168.1.5', '482913', 'Телефон', H);
    let calls = 0;
    const H2 = async (...a) => { calls++; return H(...a); };
    let t = Date.now();
    const C = createSyncClient(phone, { H: H2, now: () => t });
    phone.store.state.settings.syncAuto = true;
    setLinkMode({ sync: false });
    t += 3 * 3600000;
    await C.tick();
    expect(calls).toBe(0);
    expect(C.waits({ id: 'n', created: t - 3600000 }, 'stems')).toBe(false); // результатов от компьютера не ждём
    setLinkMode({ sync: true }); // вернули — фон снова идёт
    await C.tick();
    expect(calls).toBeGreaterThan(0);
  });

  it('смена режима не затирается итогом синхронизации и не теряет ключ', async () => {
    await pair('192.168.1.5', '482913', 'Телефон', H);
    const before = pcOf().key;
    await syncNow(phone, () => {}, H);
    setLinkMode({ rc: false });
    expect(pcOf().key).toBe(before);
    expect(pcOf().mode).toEqual({ rc: false, sync: true });
  });
});

describe('компьютер в фоне: окно не выходит вперёд', () => {
  const walk = (d, ext, out = []) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (n !== 'node_modules' && n !== 'target' && n !== 'gen') walk(p, ext, out); } else if (ext.some((e) => n.endsWith(e))) out.push(p); } return out; };
  it('Rust: show/set_focus/unminimize — только в bg.rs (по клику на значок или в меню)', () => {
    for (const f of walk('src-tauri/src', ['.rs'])) {
      if (f.endsWith('bg.rs')) continue;
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/set_focus|\.unminimize\(|\.show\(\)|request_user_attention/);
    }
  });
  it('веб-часть: ни window.focus, ни окно Tauri вперёд, ни системных уведомлений', () => {
    for (const f of walk('src', ['.js'])) {
      if (f.includes('/launcher/') || f.includes('/guest/')) continue;
      const s = readFileSync(f, 'utf8');
      expect(s, f).not.toMatch(/window\.focus\(|setFocus\(\)|requestUserAttention|new Notification\(/);
    }
  });
  it('ядро пульта (netctl.js) и сервер связи не трогают окно', () => {
    const s = readFileSync('src/core/netctl.js', 'utf8') + readFileSync('src/core/sync.js', 'utf8');
    expect(s).not.toMatch(/getCurrentWindow|@tauri-apps\/api\/window/);
  });
  it('флаги WebView2 не душат фон', () => {
    for (const f of ['src-tauri/tauri.conf.json', 'src-tauri/tauri.dev.conf.json']) {
      const a = JSON.parse(readFileSync(f, 'utf8')).app.windows[0].additionalBrowserArgs;
      expect(a, f).toMatch(/--disable-background-timer-throttling/);
      expect(a, f).toMatch(/--disable-renderer-backgrounding/);
      expect(a, f).toMatch(/--disable-backgrounding-occluded-windows/);
      expect(a, f).toMatch(/IntensiveWakeUpThrottling/);
    }
  });
});
