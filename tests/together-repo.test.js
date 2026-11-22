import { describe, it, expect } from 'vitest';
import { GitHub, GhError } from '../src/core/together/gh.js';
import { Repo } from '../src/core/together/repo.js';
import { memKV } from '../src/core/together/kv.js';
import { FakeGitHub } from './helpers/fakegh.js';
import { P } from '../src/core/together/model.js';

const setup = () => {
  const fake = new FakeGitHub();
  fake.addUser('ta', 'alice'); fake.addUser('tb', 'bob'); fake.addRepo('alice/data', { collaborators: ['bob'] });
  const mk = (token, owner = 'alice') => new Repo({ gh: new GitHub({ token, owner, repo: 'data', fetchFn: fake.fetch }), kv: memKV() });
  return { fake, a: mk('ta'), b: mk('tb') };
};

describe('репозиторий данных', () => {
  it('пустой репозиторий синхронизируется без ошибки', async () => {
    const { a } = setup(); await a.sync(); expect(a.docs.size).toBe(0);
  });
  it('запись одного видна другому; повторный sync — по ETag без скачивания', async () => {
    const { fake, a, b } = setup();
    await a.writeJSON(P.profile('alice'), { name: 'Alice' }, 'profile');
    expect(fake.readJSON('alice/data', 'u/alice/profile.json').name).toBe('Alice');
    await b.sync(); expect(b.get('u/alice/profile.json').name).toBe('Alice');
    const before = fake.log.length; await b.sync();
    expect(fake.log.slice(before)).toEqual(['GET /repos/alice/data/git/trees/HEAD']); // только дерево, 304
  });
  it('обновление файла использует sha; чужая запись между двумя синхронизациями не ломает', async () => {
    const { a, b } = setup();
    await a.writeJSON('u/alice/c/2026-11-19.json', { v: 1 }); await a.writeJSON('u/alice/c/2026-11-19.json', { v: 2 });
    await b.writeJSON('u/bob/profile.json', { name: 'Bob' });
    await a.sync(); await b.sync();
    expect(b.get('u/alice/c/2026-11-19.json').v).toBe(2); expect(a.get('u/bob/profile.json').name).toBe('Bob');
  });
  it('нет сети — запись остаётся в очереди и уходит позже (и после перезапуска)', async () => {
    const { fake, a } = setup();
    fake.down = true;
    const ok = await a.writeJSON('u/alice/e/1.json', { type: 'msg', text: 'hi' });
    expect(ok).toBe(false); expect(a.queue.length).toBe(1); expect(a.status.offline).toBe(true);
    expect(a.get('u/alice/e/1.json').text).toBe('hi'); // интерфейс уже видит
    const a2 = new Repo({ gh: a.gh, kv: a.kv }); await a2.load(); expect(a2.queue.length).toBe(1);
    fake.down = false; expect(await a2.flush()).toBe(true);
    expect(fake.readJSON('alice/data', 'u/alice/e/1.json').text).toBe('hi'); expect(a2.queue.length).toBe(0);
  });
  it('временный сбой сервера: запись не теряется, следующая попытка проходит', async () => {
    const { fake, a } = setup(); fake.failPut = 1;
    expect(await a.writeJSON('u/alice/x.json', { n: 1 })).toBe(false); expect(a.queue.length).toBe(1);
    expect(await a.flush()).toBe(true); expect(fake.readJSON('alice/data', 'u/alice/x.json').n).toBe(1);
  });
  it('неверный токен — ошибка доступа, очередь цела', async () => {
    const { a } = setup(); a.gh.token = 'bad';
    expect(await a.writeJSON('u/alice/x.json', {})).toBe(false); expect(a.status.authError).toBe(true); expect(a.queue.length).toBe(1);
    await expect(a.sync()).rejects.toBeInstanceOf(GhError);
  });
  it('фото: пишется как файл, читается по sha, кэшируется', async () => {
    const { a, b } = setup();
    globalThis.URL.createObjectURL ??= () => 'blob:x';
    await a.writeFile('u/alice/p/2026-11-19.jpg', new Blob([new Uint8Array([1, 2, 3, 255])], { type: 'image/jpeg' }));
    await b.sync(); expect(b.shas.has('u/alice/p/2026-11-19.jpg')).toBe(true);
    expect(await b.photoURL('u/alice/p/2026-11-19.jpg')).toMatch(/^blob:/);
    expect((await b.kv.keys()).some((k) => String(k).startsWith('img:'))).toBe(true);
  });
  it('если файл уже есть в репозитории, а локально sha неизвестен, запись разрешается через свежее дерево', async () => {
    const { fake, a } = setup();
    await a.writeJSON('u/alice/q.json', { v: 1 });
    const a2 = new Repo({ gh: a.gh, kv: memKV() }); // «новое устройство»: sha не знает
    expect(await a2.writeJSON('u/alice/q.json', { v: 2 })).toBe(true);
    expect(fake.readJSON('alice/data', 'u/alice/q.json').v).toBe(2);
  });
});

describe('как пишет приложение', () => {
  it('фото и отчёт подряд, без ожидания: уходят оба, в этом порядке', async () => {
    const { fake, a } = setup();
    globalThis.URL.createObjectURL ??= () => 'blob:x';
    a.writeFile('u/alice/p/d.jpg', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }));
    a.writeJSON('u/alice/c/d.json', { ref: { b: 'JOH', c: 3 } });
    await new Promise((r) => setTimeout(r, 200));
    expect([...fake.files('alice/data').keys()]).toEqual(['u/alice/p/d.jpg', 'u/alice/c/d.json']);
  });
  it('запись, начатая в момент завершения прежней отправки, не застревает в очереди', async () => {
    const { fake, a } = setup();
    a.writeJSON('u/alice/1.json', {}); // запускает отправку
    await new Promise((r) => setTimeout(r, 0));
    a.writeJSON('u/alice/2.json', {});
    await new Promise((r) => setTimeout(r, 300));
    expect(fake.files('alice/data').has('u/alice/2.json')).toBe(true); expect(a.queue.length).toBe(0);
  });
});

describe('отправка очереди', () => {
  it('пустая отправка не блокирует следующие записи (регрессия: залипал флаг)', async () => {
    const { fake, a } = setup();
    expect(await a.flush()).toBe(true); // очередь пуста
    expect(await a.writeJSON('u/alice/late.json', { v: 1 })).toBe(true);
    expect(fake.readJSON('alice/data', 'u/alice/late.json').v).toBe(1);
  });
});
