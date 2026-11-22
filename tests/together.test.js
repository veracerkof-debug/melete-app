import { describe, it, expect } from 'vitest';
import { createTogether, parseInvite } from '../src/core/together/index.js';
import { memKV } from '../src/core/together/kv.js';
import { FakeGitHub } from './helpers/fakegh.js';
import { dstr } from '../src/core/together/dates.js';

const setup = () => {
  const fake = new FakeGitHub();
  fake.addUser('tok', 'alice'); fake.addRepo('alice/data', { collaborators: [] });
  const mk = () => { const device = {}; const notes = []; const tg = createTogether({ device, saveDevice() {} }, { fetchFn: fake.fetch, kvFor: () => memKV(), notify: (n) => notes.push(n) }); return { tg, device, notes }; };
  return { fake, a: mk(), b: mk() };
};

describe('совместное чтение', () => {
  it('разбор ссылки-приглашения Tandem и «владелец/репозиторий»', () => {
    expect(parseInvite('https://x.github.io/app/#/join/alice/data/github_pat_ABC')).toEqual({ owner: 'alice', repo: 'data', token: 'github_pat_ABC' });
    expect(parseInvite('alice/data')).toEqual({ owner: 'alice', repo: 'data' });
    expect(parseInvite('мусор')).toBeNull();
  });
  it('пара: создатель, присоединение, отчёт, подтверждение, серия', async () => {
    const { fake, a, b } = setup();
    await a.tg.connect({ token: 'tok', owner: 'alice', repo: 'data', name: 'Алиса', create: true });
    expect(a.tg.connected).toBe(true);
    expect(fake.readJSON('alice/data', 'couple.json').v).toBe(1);
    await b.tg.connect({ token: 'tok', owner: 'alice', repo: 'data', name: 'Боб' });
    await a.tg.sync(true);
    expect(a.tg.partner).toBe(b.tg.me);
    const ref = { b: 'JOH', c: 3 };
    await a.tg.postCheckin({ ref, text: 'Хорошо' });
    await b.tg.sync(true);
    const today = dstr();
    expect(b.tg.model.dayState(a.tg.me, today)).toBe('posted');
    await b.tg.ack(a.tg.me, 'c-' + today);
    await a.tg.sync(true);
    expect(a.tg.model.dayState(a.tg.me, today)).toBe('done');
    expect(a.tg.model.streak.together).toBe(0); // вдвоём — когда у обоих
    await b.tg.postCheckin({ ref, text: '' }); await a.tg.sync(true); await a.tg.ack(b.tg.me, 'c-' + today); await b.tg.sync(true);
    expect(b.tg.model.streak.together).toBe(1);
  });
  it('без отчёта-пары: третий не входит; нет couple.json без create', async () => {
    const { a, b } = setup();
    await expect(b.tg.connect({ token: 'tok', owner: 'alice', repo: 'data' })).rejects.toMatchObject({ kind: 'nocouple' });
    expect(b.tg.connected).toBe(false);
    await a.tg.connect({ token: 'tok', owner: 'alice', repo: 'data', name: 'A', create: true });
    await b.tg.connect({ token: 'tok', owner: 'alice', repo: 'data', name: 'B' });
    const c = createTogether({ device: {}, saveDevice() {} }, { fetchFn: a.tg && undefined });
    expect(c.connected).toBe(false);
  });
  it('новое от партнёра → уведомление; первая сверка молчит; повтор молчит', async () => {
    const { a, b } = setup();
    await a.tg.connect({ token: 'tok', owner: 'alice', repo: 'data', name: 'Алиса', create: true });
    await b.tg.connect({ token: 'tok', owner: 'alice', repo: 'data', name: 'Боб' });
    await a.tg.sync(true); await b.tg.sync(true);
    await a.tg.postCheckin({ ref: { b: 'PSA', c: 23 }, text: '' });
    await b.tg.sync(true); // первая сверка с отчётом — запомнить, не шуметь
    expect(b.notes).toHaveLength(0);
    await a.tg.postCheckin({ ref: { b: 'PSA', c: 24 }, text: 'ещё', date: '2999-01-02' });
    await b.tg.sync(true);
    expect(b.notes).toHaveLength(1);
    expect(b.notes[0].name).toBe('Алиса');
    await b.tg.sync(true);
    expect(b.notes).toHaveLength(1);
  });
  it('«напомнить» — не чаще раза в 15 минут', async () => {
    let t = 1e12;
    const fake = new FakeGitHub(); fake.addUser('tok', 'alice'); fake.addRepo('alice/data');
    const tg = createTogether({ device: {}, saveDevice() {} }, { fetchFn: fake.fetch, kvFor: () => memKV(), now: () => t });
    await tg.connect({ token: 'tok', owner: 'alice', repo: 'data', name: 'A', create: true });
    expect(tg.nudge()).toBe(true); expect(tg.nudge()).toBe(false); t += 16 * 60e3; expect(tg.nudge()).toBe(true);
  });
  it('нет сети — отчёт в очереди, уходит позже', async () => {
    const { fake, a } = setup();
    await a.tg.connect({ token: 'tok', owner: 'alice', repo: 'data', name: 'A', create: true });
    fake.down = true;
    await a.tg.postCheckin({ ref: { b: 'JOH', c: 1 }, text: 'x' });
    expect(a.tg.status.queue).toBe(1); expect(a.tg.status.offline).toBe(true);
    fake.down = false; await a.tg.sync(true);
    expect(a.tg.status.queue).toBe(0);
  });
});
