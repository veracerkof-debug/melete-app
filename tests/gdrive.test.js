import { describe, it, expect, beforeEach } from 'vitest';
import { driveApi, driveSyncNow, canon } from '../src/core/gdrive.js';
import { createStore } from '../src/core/store.js';

// Поддельный Google Диск: ровно те запросы, что делает gdrive.js
function fakeDrive() {
  const files = new Map(); let n = 0;
  const J = (o, status = 200, h = {}) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...h } });
  const view = (x) => ({ id: x.id, name: x.name, mimeType: x.mimeType, size: String(x.bytes ? x.bytes.length : 0), md5Checksum: x.md5, appProperties: x.appProperties, parents: x.parents });
  const put = (x) => { x.md5 = 'm' + ++n; files.set(x.id, x); return x; };
  const q = (s) => {
    const m = (re) => (s.match(re) || [])[1];
    const parent = m(/'([^']+)' in parents/), name = m(/name='([^']*)'/), notFolder = /mimeType!=/.test(s), folder = /mimeType='application\/vnd.google-apps.folder'/.test(s);
    return [...files.values()].filter((x) => !x.trashed && (!parent || (x.parents || ['root']).includes(parent)) && (!name || x.name === name) && (!folder || x.mimeType === 'application/vnd.google-apps.folder') && (!notFolder || x.mimeType !== 'application/vnd.google-apps.folder'));
  };
  const f = async (url, o = {}) => {
    const u = new URL(url), id = (u.pathname.match(/\/files\/([^/]+)$/) || [])[1], method = o.method || 'GET', up = u.pathname.includes('/upload/');
    if (u.pathname.endsWith('/files') && method === 'GET') return J({ files: q(u.searchParams.get('q')).map(view) });
    if (u.pathname.endsWith('/files') && method === 'POST' && !up) { const b = JSON.parse(o.body); return J(view(put({ id: 'd' + ++n, ...b }))); }
    if (id && method === 'PATCH' && !up) { const x = files.get(id), b = JSON.parse(o.body); if (b.trashed) x.trashed = true; if (b.appProperties) x.appProperties = b.appProperties; return J(view(x)); }
    if (id && method === 'GET') {
      const x = files.get(id); if (!x || x.trashed) return J({}, 404);
      let bytes = x.bytes; const r = (o.headers || {}).Range;
      if (r) { const [a, b] = r.replace('bytes=', '').split('-').map(Number); bytes = bytes.slice(a, b + 1); }
      return new Response(bytes, { status: r ? 206 : 200 });
    }
    if (up && u.searchParams.get('uploadType') === 'multipart') {
      const body = String(o.body), parts = body.split(/--meleteB\w+/), meta = JSON.parse(parts[1].split('\r\n\r\n')[1].trim()), data = parts[2].split('\r\n\r\n')[1].replace(/\r\n$/, '');
      const x = id ? files.get(id) : put({ id: 'd' + ++n, parents: meta.parents, mimeType: meta.mimeType });
      Object.assign(x, { name: meta.name || x.name, bytes: new TextEncoder().encode(data) }); x.md5 = 'm' + ++n;
      return J(view(x));
    }
    if (up && u.searchParams.get('uploadType') === 'resumable') {
      if (method === 'PUT') { // кусок
        const x = [...files.values()].find((y) => y.pending === u.searchParams.get('sid')), cr = o.headers['Content-Range'], [, a, b, tot] = cr.match(/bytes (\d+)-(\d+)\/(\d+)/) || [];
        const buf = new Uint8Array(await new Response(o.body).arrayBuffer()), all = new Uint8Array(+tot); all.set(x.bytes || [], 0); all.set(buf, +a); x.bytes = all.slice(0, +b + 1);
        if (+b + 1 < +tot) return new Response(null, { status: 308 });
        delete x.pending; x.md5 = 'm' + ++n; return J(view(x));
      }
      const b = JSON.parse(o.body), x = id ? files.get(id) : put({ id: 'd' + ++n, parents: b.parents, mimeType: 'application/octet-stream' });
      Object.assign(x, { name: b.name || x.name, appProperties: b.appProperties, bytes: new Uint8Array(0), pending: 's' + ++n });
      return new Response('{}', { status: 200, headers: { Location: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&sid=' + x.pending } });
    }
    return J({}, 404);
  };
  return { f, files };
}

const mkLS = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
function mkFiles() {
  const all = new Map();
  return {
    list: (kind) => [...all.values()].filter((r) => (kind === 'audio' ? !r.kind || r.kind === 'audio' : r.kind === kind)),
    get: (id) => all.get(id), add: async (rec) => { all.set(rec.id, { ...rec, size: rec.blob ? rec.blob.size : rec.size }); return rec.id; },
    remove: async (id) => { all.delete(id); }, save: async () => {}, all,
  };
}
// у каждого устройства — своя память синхронизации (localStorage подменяется перед его обменом)
function device(drive) {
  const ls = mkLS(), app = { store: createStore({ storage: mkLS() }), files: mkFiles() };
  const api = driveApi({ tok: async () => 't', f: drive.f, retry: [] });
  return { app, run: async (opts = {}) => { globalThis.localStorage = ls; return driveSyncNow(app, api, () => {}, opts); } };
}
const song = (id, title, at) => ({ id, title, createdAt: at, updatedAt: at, difficulty: 1 });
const bytes = (n, v) => new Blob([new Uint8Array(n).fill(v)]);
const audio = (id, n, v = 1) => ({ id, name: id + '.mp3', type: 'audio/mpeg', blob: bytes(n, v), created: 1 });

describe('Google Диск: слияние данных', () => {
  let drive, A, B;
  beforeEach(() => { drive = fakeDrive(); A = device(drive); B = device(drive); });

  it('песни с одного устройства приходят на другое, папка Melete видима', async () => {
    A.app.store.state.songs.push(song('s1', 'Blackbird', 5));
    await A.run();
    await B.run();
    expect(B.app.store.songs().map((s) => s.title)).toEqual(['Blackbird']);
    const root = [...drive.files.values()].find((x) => x.name === 'Melete' && x.mimeType.includes('folder'));
    expect(root).toBeTruthy();
  });
  it('обе стороны добавили своё — на обеих оказывается всё; дальше без переписывания', async () => {
    A.app.store.state.songs.push(song('a', 'A', 1)); B.app.store.state.songs.push(song('b', 'B', 2));
    await A.run(); await B.run(); await A.run();
    expect(A.app.store.songs().map((s) => s.id).sort()).toEqual(['a', 'b']);
    expect(B.app.store.songs().map((s) => s.id).sort()).toEqual(['a', 'b']);
    const md5 = [...drive.files.values()].find((x) => x.name === 'data.json').md5;
    await B.run(); await A.run(); await B.run();
    expect([...drive.files.values()].find((x) => x.name === 'data.json').md5).toBe(md5); // сошлось: файл не переписывается по кругу
  });
  it('каноническая запись не зависит от порядка', () => {
    expect(canon({ songs: [{ id: 'b', x: 1 }, { id: 'a', y: 2, z: 3 }] })).toBe(canon({ songs: [{ z: 3, y: 2, id: 'a' }, { x: 1, id: 'b' }] }));
  });
});

describe('Google Диск: файлы', () => {
  let drive, A, B;
  beforeEach(() => { drive = fakeDrive(); A = device(drive); B = device(drive); });

  it('файл больше куска идёт частями туда и обратно, байты те же', async () => {
    const big = audio('f1', (2 << 20) * 2 + 1234, 7);
    await A.app.files.add(big);
    await A.run(); await B.run();
    const got = B.app.files.get('f1');
    expect(got.name).toBe('f1.mp3');
    const buf = new Uint8Array(await got.blob.arrayBuffer());
    expect(buf.length).toBe(big.blob.size);
    expect(buf.every((x) => x === 7)).toBe(true);
    const onDrive = [...drive.files.values()].find((x) => x.name === 'f1.mp3');
    expect(onDrive.parents).toEqual([[...drive.files.values()].find((x) => x.name === 'Melete').id]); // под своим именем, видим
  });
  it('удалил на одном — исчезает на другом, на Диске — в корзине', async () => {
    await A.app.files.add(audio('f2', 100)); await A.app.files.add(audio('keep', 10));
    await A.run(); await B.run(); await A.run();
    await B.app.files.remove('f2');
    await B.run(); await A.run();
    expect(A.app.files.get('f2')).toBeUndefined();
    expect([...drive.files.values()].find((x) => x.name === 'f2.mp3').trashed).toBe(true);
  });
  it('Диск вернул пустой список при непустом прошлом — ничего не удаляется', async () => {
    await A.app.files.add(audio('f3', 50));
    await A.run();
    [...drive.files.values()].forEach((x) => { if (x.appProperties && x.appProperties.i) x.trashed = true; }); // как «список не открылся»
    await A.run();
    expect(A.app.files.get('f3')).toBeTruthy();
  });
  it('база файлов здесь не открылась — удалений нет', async () => {
    await A.app.files.add(audio('f4', 20)); await A.run(); await B.run();
    B.app.files.noDb = true; B.app.files.all.clear();
    await B.run();
    expect([...drive.files.values()].find((x) => x.name === 'f4.mp3').trashed).not.toBe(true);
  });
});

describe('Google Диск: сбои', () => {
  it('нет сети — причина unreachable, данные целы', async () => {
    const A = device({ f: async () => { throw new TypeError('offline'); } });
    A.app.store.state.songs.push(song('s', 'S', 1));
    await expect(A.run()).rejects.toMatchObject({ reason: 'unreachable' });
    expect(A.app.store.songs().length).toBe(1);
  });
  it('токен отозван — причина auth', async () => {
    const d = fakeDrive(), app = { store: createStore({ storage: mkLS() }), files: mkFiles() };
    globalThis.localStorage = mkLS();
    const api = driveApi({ tok: async () => 't', f: async () => new Response('{}', { status: 401 }), retry: [] });
    await expect(driveSyncNow(app, api)).rejects.toMatchObject({ reason: 'auth' });
  });
  it('нет места на Диске — причина quota', async () => {
    const api = driveApi({ tok: async () => 't', f: async () => new Response(JSON.stringify({ error: { errors: [{ reason: 'storageQuotaExceeded' }] } }), { status: 403 }), retry: [] });
    await expect(api.req('GET', 'https://x/y')).rejects.toMatchObject({ reason: 'quota' });
  });
});
