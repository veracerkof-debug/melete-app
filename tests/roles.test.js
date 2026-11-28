// Роли доступа устройств (слово автора 28.11.2026): таблица прав, умолчания, обратная совместимость, отказ 403 { error: 'role' }
import { describe, it, expect, beforeEach } from 'vitest';
import { ROLES, ACCESS, roleOf, normRole, roleAllows, roleToMode, canSend, canView } from '../src/core/roles.js';
import { modeOf, modeName, applyMode } from '../src/core/linkmode.js';
import { handleRequest, pair, pcOf, sendFile, refreshMyRole } from '../src/core/sync.js';
import { createStore } from '../src/core/store.js';

const mkLS = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const mkFiles = () => {
  const all = new Map();
  return { ready: Promise.resolve(), list: (k) => [...all.values()].filter((r) => (k === 'audio' ? !r.kind || r.kind === 'audio' : r.kind === k)), get: (id) => all.get(id), add: async (rec) => { all.set(rec.id, { ...rec, size: rec.blob ? rec.blob.size : rec.size }); return rec.id; }, remove: async (id) => { all.delete(id); }, save: async () => {}, all };
};
const mkApp = () => ({ store: createStore({ storage: mkLS() }), files: mkFiles() });
const P = '/melete/v1/';
const BODY = { meta: { id: 'f1', name: 'a.mp3', kind: 'audio', size: 3, type: 'audio/mpeg' }, off: 0, b64: 'AQID' };
const REQS = {
  sync: { method: 'POST', path: P + 'sync', json: {} },
  get: { method: 'GET', path: P + 'get', query: { id: 'x' } },
  meta: { method: 'GET', path: P + 'meta', query: { id: 'x' } },
  setmeta: { method: 'POST', path: P + 'setmeta', json: { meta: { id: 'x' } } },
  delete: { method: 'POST', path: P + 'delete', json: { ids: ['x'] } },
  put: { method: 'POST', path: P + 'put', json: BODY },
  putSent: { method: 'POST', path: P + 'put', json: { ...BODY, meta: { ...BODY.meta, sent: true } } },
  ens: { method: 'POST', path: P + 'ens', json: {} },
  rc: { method: 'POST', path: P + 'rc/cmd', json: { a: 'bpm' } },
  ts: { method: 'POST', path: P + 'ts/tasks', json: {} },
  view: { method: 'GET', path: P + 'view', query: {} },
  me: { method: 'GET', path: P + 'me', query: {} },
};
// Кто что может (true — пропустить на уровне роли)
const TABLE = {
  own: { sync: 1, get: 1, meta: 1, setmeta: 1, delete: 1, put: 1, putSent: 1, ens: 1, rc: 1, ts: 1, view: 1, me: 1 },
  receive: { putSent: 1, me: 1 },
  control: { rc: 1, me: 1 },
  view: { view: 1, me: 1 },
};

describe('роли: чистая логика', () => {
  it('роли и умолчание: нет поля — own; неизвестное — самое узкое (view)', () => {
    expect(ROLES).toEqual(['own', 'receive', 'control', 'view']);
    expect(roleOf({})).toBe('own'); expect(roleOf(null)).toBe('own'); expect(roleOf({ role: '' })).toBe('own');
    expect(roleOf({ role: 'receive' })).toBe('receive');
    expect(roleOf({ myRole: 'control' })).toBe('control'); // запись начинающей стороны
    expect(roleOf({ role: 'admin' })).toBe('view');
    expect(normRole('receive')).toBe('receive'); expect(normRole('root')).toBe('own'); expect(normRole(undefined)).toBe('own');
  });
  for (const role of ROLES) for (const [name, req] of Object.entries(REQS)) {
    it('таблица прав: ' + role + ' × ' + name + ' → ' + (TABLE[role][name] ? 'можно' : 'нельзя'), () => {
      expect(roleAllows(role, req.path, req.json)).toBe(!!TABLE[role][name]);
    });
  }
  it('receive: /put только с meta.sent === true', () => {
    expect(roleAllows('receive', P + 'put', { meta: { id: 'a', sent: true } })).toBe(true);
    for (const j of [{ meta: { id: 'a' } }, { meta: { id: 'a', sent: 1 } }, { meta: { id: 'a', ens: 1 } }, {}, null]) expect(roleAllows('receive', P + 'put', j)).toBe(false);
  });
  it('неизвестный путь — только own; неизвестная роль — как view', () => {
    expect(roleAllows('own', P + 'zzz', {})).toBe(true);
    for (const r of ['receive', 'control', 'view', 'x']) expect(roleAllows(r, P + 'zzz', {})).toBe(false);
    expect(roleAllows('x', P + 'rc/cmd', {})).toBe(false);
    expect(roleAllows('x', P + 'view', {})).toBe(true);
  });
  it('таблица ACCESS замкнута: каждый путь REQS описан', () => {
    for (const r of Object.values(REQS)) expect(ACCESS[r.path] || ACCESS[r.path.replace(/[^/]+$/, '*')]).toBeTruthy();
  });
  it('roleToMode и производные режимы (linkmode)', () => {
    expect(roleToMode('own')).toEqual({ rc: true, sync: true });
    expect(roleToMode('control')).toEqual({ rc: true, sync: false });
    expect(roleToMode('receive')).toEqual({ rc: false, sync: false });
    expect(roleToMode('view')).toEqual({ rc: false, sync: false });
    expect(modeOf({ role: 'control' })).toEqual({ rc: true, sync: false });
    expect(modeOf({ role: 'receive' })).toEqual({ rc: false, sync: false });
    expect(modeOf({ role: 'own', mode: { rc: false } })).toEqual({ rc: false, sync: true }); // переключатели — в пределах роли
    expect(modeOf({ role: 'control', mode: { sync: true } })).toEqual({ rc: true, sync: false }); // выше роли не поднимаются
    expect(modeName({ role: 'view' })).toBe('none'); expect(modeName({ role: 'control' })).toBe('rc'); expect(modeName({})).toBe('both');
  });
  it('переключатели помнятся независимо от роли (смена роли обратима)', () => {
    const e = { role: 'receive', mode: { rc: true, sync: false } };
    expect(applyMode(e, { rc: false })).toEqual({ rc: false, sync: true }); // «оба выкл.» — по сохранённым, а не по действующим
    expect(modeOf({ ...e, role: 'own' })).toEqual({ rc: true, sync: false });
  });
  it('что роль делает со своей стороны', () => {
    expect([canSend('own'), canSend('receive'), canSend('control'), canSend('view')]).toEqual([true, true, false, false]);
    expect([canView('own'), canView('view'), canView('receive')]).toEqual([true, true, false]);
  });
});

describe('роли: принимающая сторона (handleRequest)', () => {
  let pc, ctx, key;
  const ask = (r, k = key) => handleRequest(ctx, { query: {}, json: null, ...r, key: k }, new Map());
  const setRole = (role) => { if (role === undefined) delete ctx.mem.peers[key].role; else ctx.mem.peers[key].role = role; };
  beforeEach(async () => {
    globalThis.localStorage = mkLS();
    pc = mkApp();
    ctx = { app: pc, mem: {}, code: '482913', name: 'PC', rc: async () => ({ status: 200, json: { ok: 1 } }), ts: async () => ({ status: 200, json: {} }) };
    const r = await handleRequest(ctx, { method: 'POST', path: P + 'pair', query: {}, key: '', json: { code: '482913', name: 'Т' } });
    key = r.json.key;
  });

  for (const role of ROLES) for (const [name, req] of Object.entries(REQS)) {
    if (TABLE[role][name]) continue;
    it('403 role: ' + role + ' × ' + name, async () => {
      setRole(role);
      const r = await ask(req);
      expect(r).toMatchObject({ status: 403, json: { error: 'role' } });
    });
  }
  it('own пропускается на все пути (не 403)', async () => {
    for (const [n, req] of Object.entries(REQS)) { const r = await ask(req); expect(r.status, n).not.toBe(403); }
  });
  it('старое сопряжение без role работает как own', async () => {
    setRole(undefined);
    expect((await ask(REQS.rc)).status).toBe(200);
    expect((await ask(REQS.sync)).status).toBe(200);
  });
  it('receive: принимает отправленный файл, ничего не отдаёт', async () => {
    setRole('receive');
    const r = await ask(REQS.putSent);
    expect(r.status).toBe(200); expect(r.json.done).toBe(true);
    expect(pc.files.get('f1')).toBeTruthy();
    for (const n of ['sync', 'get', 'meta', 'setmeta', 'delete', 'put']) expect((await ask(REQS[n])).status, n).toBe(403);
  });
  it('control: только rc; view: /view отдаёт песни и сет-листы без личного', async () => {
    setRole('control');
    expect((await ask(REQS.rc)).status).toBe(200);
    setRole('view');
    pc.store.replaceState({ ...pc.store.state, songs: [{ id: 's1', title: 'Калинка', createdAt: 1, updatedAt: 1, notes: 'текст' }, { id: 's2', title: 'Удалена', deleted: true }] });
    const v = await ask(REQS.view);
    expect(v.status).toBe(200);
    expect(v.json.songs.map((s) => s.title)).toEqual(['Калинка']);
    expect(JSON.stringify(v.json)).not.toMatch(/sessions|profile|settings/);
    const one = await ask({ method: 'GET', path: P + 'view', query: { id: 's1' } });
    expect(one.json.notes).toBe('текст');
    expect((await ask({ method: 'GET', path: P + 'view', query: { id: 'nope' } })).status).toBe(404);
    expect((await ask(REQS.rc)).status).toBe(403);
  });
  it('смена роли действует сразу, на следующем же запросе', async () => {
    setRole('control');
    expect((await ask(REQS.sync)).status).toBe(403);
    setRole('own');
    expect((await ask(REQS.sync)).status).toBe(200);
    setRole('view');
    expect((await ask(REQS.rc)).status).toBe(403);
  });
  it('/me отдаёт роль; чужой ключ — 401', async () => {
    setRole('receive');
    expect((await ask(REQS.me)).json).toEqual({ role: 'receive' });
    expect((await ask(REQS.me, 'bad')).status).toBe(401);
  });
  it('отказ пишется в журнал не чаще раза в минуту (не засоряет)', async () => {
    setRole('view');
    const now = () => 5000000;
    const c2 = { ...ctx, now };
    for (let i = 0; i < 5; i++) await handleRequest(c2, { method: 'POST', path: P + 'sync', query: {}, key, json: {} });
    expect((await handleRequest(c2, { method: 'POST', path: P + 'sync', query: {}, key, json: {} })).status).toBe(403);
  });
});

describe('роли: назначает принимающая сторона, а не клиент', () => {
  let ctx, H;
  const mkH = () => async (method, url, { key = '', json = null, withFp = false } = {}) => {
    const u = new URL(url);
    if (u.pathname === '/melete/v1/hello') return { app: 'melete', v: 1, name: 'PC' };
    if (withFp) return { data: await mkH()(method, url, { key, json }), fp: 'ab'.repeat(32) };
    const r = await handleRequest(ctx, { method, path: u.pathname, query: Object.fromEntries(u.searchParams), key, json: json ? JSON.parse(JSON.stringify(json)) : null });
    if (r.status >= 400) throw Object.assign(new Error('http ' + r.status), { status: r.status });
    return r.json;
  };
  beforeEach(() => { globalThis.localStorage = mkLS(); ctx = { app: mkApp(), mem: {}, code: '482913', name: 'PC', rc: async () => ({ status: 200, json: {} }) }; H = mkH(); });

  it('без выбора — own (как до ролей), клиент запоминает myRole = own', async () => {
    const d = await pair('192.168.1.5', '482913', 'Т', H);
    expect(ctx.mem.peers[d.key]).toMatchObject({ role: 'own' });
    expect(pcOf().myRole).toBe('own');
  });
  it('роль из pairRole принимающей стороны; поле role в теле запроса игнорируется', async () => {
    ctx.pairRole = () => 'receive';
    const r = await handleRequest(ctx, { method: 'POST', path: P + 'pair', query: {}, key: '', json: { code: '482913', name: 'Х', role: 'own' } });
    expect(r.json.role).toBe('receive');
    expect(ctx.mem.peers[r.json.key].role).toBe('receive');
  });
  it('rolePaired вызывается с выданной ролью (код с ограниченной ролью одноразовый)', async () => {
    let got = null;
    ctx.pairRole = () => 'view'; ctx.rolePaired = (r) => { got = r; };
    await handleRequest(ctx, { method: 'POST', path: P + 'pair', query: {}, key: '', json: { code: '482913', name: 'Х' } });
    expect(got).toBe('view');
  });
  it('мусор вместо роли у принимающей стороны — own только как умолчание, не повышение прав из запроса', async () => {
    ctx.pairRole = () => 'superuser';
    const r = await handleRequest(ctx, { method: 'POST', path: P + 'pair', query: {}, key: '', json: { code: '482913', name: 'Х' } });
    expect(r.json.role).toBe('own'); // выбор принимающей стороны испорчен — прежнее умолчание
  });
  it('клиент с ролью receive не шлёт запрещённое: sendFile работает, синхронизации нет', async () => {
    ctx.pairRole = () => 'receive';
    const d = await pair('192.168.1.5', '482913', 'Т', H);
    expect(d.myRole).toBe('receive');
    expect(modeOf(pcOf())).toEqual({ rc: false, sync: false });
    const rec = { id: 'f2', name: 'b.mp3', kind: 'audio', type: 'audio/mpeg', blob: new Blob([new Uint8Array([1, 2, 3])]) };
    const r = await sendFile(mkApp(), rec, () => {}, H);
    expect(r.have).toBe(false);
    expect(ctx.app.files.get('f2')).toBeTruthy();
  });
  it('клиент с ролью control/view не отправляет файлы (запрос не уходит)', async () => {
    ctx.pairRole = () => 'control';
    await pair('192.168.1.5', '482913', 'Т', H);
    let calls = 0;
    const H2 = async (...a) => { calls++; return H(...a); };
    const rec = { id: 'f3', name: 'c.mp3', kind: 'audio', type: 'audio/mpeg', blob: new Blob([new Uint8Array([1])]) };
    await expect(sendFile(mkApp(), rec, () => {}, H2)).rejects.toMatchObject({ reason: 'mode' });
    expect(calls).toBe(0);
  });
  it('refreshMyRole: узнаёт сменённую роль; старое устройство без /me — own', async () => {
    const d = await pair('192.168.1.5', '482913', 'Т', H);
    ctx.mem.peers[d.key].role = 'control';
    expect(await refreshMyRole(undefined, H)).toBe('control');
    expect(pcOf().myRole).toBe('control');
    const Hold = async () => { throw Object.assign(new Error('http 404'), { status: 404 }); };
    expect(await refreshMyRole(undefined, Hold)).toBe('own');
    const Hdown = async () => { throw new Error('net'); };
    expect(await refreshMyRole(undefined, Hdown)).toBe(null);
  });
});
