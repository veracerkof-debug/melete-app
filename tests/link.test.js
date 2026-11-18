import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { summarize, verdict } from '../src/core/linkstats.js';
import { runCheck } from '../src/core/linkcheck.js';
import { createClock, sample } from '../src/core/linkclock.js';
import { createJitter } from '../src/core/linkjitter.js';
import * as F from '../src/core/linkframe.js';
import { createLink, backoff } from '../src/core/link.js';

describe('проверка связи: математика замера', () => {
  it('медиана, p95, максимум, потери, дрожание', () => {
    const r = summarize([10, 12, 11, 40, 10], 6);
    expect(r).toMatchObject({ sent: 6, n: 5, lost: 1, median: 11, max: 40, min: 10 });
    expect(r.lossPct).toBeCloseTo(16.7, 1);
    expect(r.p95).toBe(40);
    expect(r.jitter).toBeCloseTo((2 + 1 + 29 + 30) / 4, 1);
  });
  it('пусто — вывод «нет ответа»', () => { expect(summarize([], 50)).toMatchObject({ n: 0, lost: 50, lossPct: 100, verdict: 'none' }); });
  it('выводы по порогам', () => {
    const mk = (v, loss = 0) => summarize(Array(50 - loss).fill(v), 50);
    expect(mk(8).verdict).toBe('great');
    expect(mk(8, 1).verdict).toBe('ok');   // даже одна потеря — уже не «отлично»
    expect(mk(50).verdict).toBe('ok');
    expect(mk(100).verdict).toBe('poor');
    expect(mk(400).verdict).toBe('bad');
    expect(verdict({ n: 3, p95: 10, lossPct: 10 })).toBe('bad');
  });
  it('серия: считает потери по отказам и по времени', async () => {
    let i = 0, t = 0;
    const r = await runCheck(async (k) => { i++; if (k === 3) throw new Error('x'); }, { n: 10, gap: 0, now: () => (t += 5) });
    expect(i).toBe(10);
    expect(r).toMatchObject({ sent: 10, n: 9, lost: 1 });
    expect(r.median).toBe(5);
  });
});

describe('часы как в NTP', () => {
  it('один обмен: сдвиг и круг', () => {
    // часы B на 1000 мс впереди, путь по 5 мс в каждую сторону
    expect(sample(0, 1005, 1005, 10)).toEqual({ rtt: 10, offset: 1000 });
  });
  it('медиана лучших 8 из 16: выбросы с долгим кругом не мешают', () => {
    const c = createClock();
    for (let i = 0; i < 16; i++) {
      const slow = i % 2 === 0, d1 = slow ? 40 : 4, d2 = slow ? 4 : 4; // у медленных обменов путь туда долгий: ошибка сдвига
      const t0 = i * 100;
      c.add(t0, t0 + d1 + 500, t0 + d1 + 500, t0 + d1 + d2);
    }
    const e = c.estimate();
    expect(e.offset).toBeCloseTo(500, 5);   // берутся только быстрые обмены
    expect(e.rtt).toBe(8);
    expect(c.toRemote(1000)).toBe(1500);
    expect(c.toLocal(1500)).toBe(1000);
  });
  it('окно — 16 обменов, готовность — от 4, мусор отбрасывается', () => {
    const c = createClock();
    expect(c.ready()).toBe(false);
    for (let i = 0; i < 20; i++) c.add(i, i + 3, i + 3, i + 6);
    expect(c.count).toBe(16);
    expect(c.ready()).toBe(true);
    expect(c.add(NaN, 1, 1, 2)).toBeNull();
    expect(c.add(100, 0, 50, 90)).toBeNull(); // круг отрицательный
    expect(c.spread()).toBe(0);
  });
});

describe('буфер дрожания', () => {
  it('ровный поток — минимальный буфер 15 мс, ничего не опаздывает', () => {
    const j = createJitter();
    for (let i = 0; i < 100; i++) j.observe(i * 10 + 5, i * 10);
    expect(j.buffer()).toBe(15);
    expect(j.stats().late).toBe(0);
    expect(j.ahead()).toBeCloseTo(5 + 15, 5);
  });
  it('дрожание растёт — буфер растёт, но не выше 40; потом медленно убывает', () => {
    const j = createJitter();
    let r;
    for (let i = 0; i < 64; i++) j.observe(i * 10 + 5 + (i % 4 === 0 ? 30 : 0), i * 10);
    expect(j.buffer()).toBeGreaterThan(30);
    for (let i = 0; i < 64; i++) j.observe(1000 + i * 10 + 5 + (i % 2 ? 200 : 0), 1000 + i * 10);
    expect(j.buffer()).toBe(40);
    r = j.observe(5000 + 400, 5000); // заметно опоздавший кадр: играется сразу
    expect(r.at).toBe(5400);
    expect(r.late).toBeGreaterThan(0);
    const hi = j.buffer();
    for (let i = 0; i < 300; i++) j.observe(10000 + i * 10 + 5, 10000 + i * 10);
    expect(j.buffer()).toBeLessThan(hi);
    expect(j.buffer()).toBeGreaterThanOrEqual(15);
  });
  it('границы настраиваются', () => {
    const j = createJitter({ min: 20, max: 25 });
    for (let i = 0; i < 100; i++) j.observe(i * 10 + (i % 2 ? 90 : 0), i * 10);
    expect(j.buffer()).toBe(25);
  });
});

describe('кадры', () => {
  it('кодирование и потоковый разбор по кускам', () => {
    const a = F.encode(0x20, new Uint8Array([1, 2, 3])), b = F.encode(T_PING, new Uint8Array(0)), c = F.encode(0x90, new Uint8Array(300).fill(7));
    const all = new Uint8Array([...a, ...b, ...c]);
    const p = F.createParser(), got = [];
    for (let i = 0; i < all.length; i += 5) got.push(...p.feed(all.slice(i, i + 5)));
    expect(got.map((x) => [x.type, x.payload.length])).toEqual([[0x20, 3], [T_PING, 0], [0x90, 300]]);
    expect(Array.from(got[0].payload)).toEqual([1, 2, 3]);
    expect(p.pending).toBe(0);
  });
  it('фиксированные байты формата (то же повторяют Rust и Java)', () => {
    expect(Array.from(F.encode(0x20, new Uint8Array([9, 8])))).toEqual([0x20, 0, 2, 9, 8]);
    expect(Array.from(F.encode(0x90, new Uint8Array(258)).slice(0, 3))).toEqual([0x90, 1, 2]);
    expect(Array.from(F.preamble())).toEqual([0x4d, 0x4c, 0x4e, 0x4b, 1]);
    expect(Array.from(F.packPing(1, 0))).toEqual([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
  it('границы и ошибки', () => {
    expect(() => F.encode(0x20, new Uint8Array(65536))).toThrow();
    expect(F.encode(0x20, new Uint8Array(65535)).length).toBe(65538);
    expect(() => F.encode(0)).toThrow();
    expect(() => F.createParser().feed(new Uint8Array([0, 0, 0]))).toThrow();
    expect(F.readPreamble(new Uint8Array([0x4d, 0x4c, 0x4e, 0x4b, 1, 4, 0, 0]))).toMatchObject({ ok: true, version: 1 });
    expect(F.readPreamble(new Uint8Array([71, 69, 84, 32, 1])).ok).toBe(false);
  });
  it('события, пинг, понг', () => {
    expect(F.unpackEvent(F.packEvent(12.5, new Uint8Array([4, 5])))).toMatchObject({ ts: 12.5, data: new Uint8Array([4, 5]) });
    expect(F.unpackPong(F.packPong(7, 1, 2, 3))).toEqual({ seq: 7, t0: 1, t1: 2, t2: 3 });
    expect(F.unpackPing(F.packPing(9, 5.5))).toEqual({ seq: 9, t0: 5.5 });
    expect(F.unpackPing(new Uint8Array(3))).toBeNull();
  });
});
const T_PING = F.T.PING;

// «Петля»: два конца link.js через транспорт в памяти. Кадры идут настоящими байтами (encode → разборщик), с задержкой
// в 3 мс (таймеры — vitest); у сервера часы убегают на 5000 мс вперёд.
function pair({ delay = 3, serverSkew = 5000, check, key = 'k1', cfgC = {}, cfgS = {} } = {}) {
  const t0 = Date.now();
  const nowC = () => t0 + (Date.now() - t0), nowS = () => Date.now() + serverSkew;
  const srv = [];
  const wire = (to) => { const p = F.createParser(); return (bytes) => globalThis.setTimeout(() => { for (const f of p.feed(bytes)) to().frame(f.type, f.payload); }, delay); };
  let hdC = null, hdS = null, cut = false, connects = 0;
  const server = createLink({ role: 'server', name: 'PC', now: nowS, check: check || ((j) => (j.key === 'k1' ? { name: 'Phone' } : null)), ...cfgS });
  const client = createLink({
    role: 'client', name: 'Phone', key, now: nowC, ...cfgC,
    connect: async (h) => {
      connects++;
      if (cut) throw Object.assign(new Error('net'), { reason: 'net' });
      hdC = h;
      const toS = wire(() => hdS);
      hdS = server.accept({
        send: (type, payload) => { const b = F.encode(type, payload); globalThis.setTimeout(() => { for (const f of fromS.feed(b)) hdC && hdC.frame(f.type, f.payload); }, delay); },
        close: () => globalThis.setTimeout(() => hdC && hdC.close('net'), delay), auth: (ok) => srv.push(ok),
      });
      return { send: (type, payload) => toS(F.encode(type, payload)), close: () => { hdS && globalThis.setTimeout(() => hdS && hdS.close('net'), delay); } };
    },
  });
  const fromS = F.createParser();
  return { client, server, srv, cutOn: () => { cut = true; }, cutOff: () => { cut = false; }, drop: () => hdC && hdC.close('net'), connects: () => connects };
}

describe('канал: петля двух концов', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('рукопожатие, пинг, часы, события в обе стороны', async () => {
    const p = pair();
    const evC = [], evS = [], rawS = [];
    p.client.onEvent((t, d, m) => evC.push([t, Array.from(d), m]));
    p.server.onEvent((t, d, m) => evS.push([t, Array.from(d), m]));
    p.server.onFrame((t, d) => rawS.push([t, Array.from(d)]));
    p.client.open();
    expect(p.client.state).toBe('connecting');
    await vi.advanceTimersByTimeAsync(100);
    expect(p.client.state).toBe('open');
    expect(p.server.state).toBe('open');
    expect(p.srv).toEqual([true]);
    expect(p.server.peer.name).toBe('Phone');
    expect(p.client.peer.name).toBe('PC');
    await vi.advanceTimersByTimeAsync(1500); // 16 быстрых обменов
    const i = p.client.info();
    expect(i.clockReady).toBe(true);
    expect(i.offset).toBeGreaterThan(4990); expect(i.offset).toBeLessThan(5010); // часы сервера впереди на 5000
    expect(i.rtt).toBeGreaterThan(5); expect(i.rtt).toBeLessThan(8);
    expect(i.lost).toBe(0);
    const si = p.server.info();
    expect(si.offset).toBeGreaterThan(-5010); expect(si.offset).toBeLessThan(-4990);

    expect(p.client.sendEvent(0x21, new Uint8Array([60, 100]))).toBe(true);
    expect(p.client.send(0x90, new Uint8Array([1]))).toBe(true);
    await vi.advanceTimersByTimeAsync(20);
    expect(evS.length).toBe(1);
    expect(evS[0][0]).toBe(0x21); expect(evS[0][1]).toEqual([60, 100]);
    expect(Math.abs(evS[0][2].delay - 3)).toBeLessThan(4); // задержка пути ~3 мс (часы сверены)
    expect(rawS).toEqual([[0x21, expect.any(Array)], [0x90, [1]]]);
    p.server.sendEvent(0x22, new Uint8Array([1]));
    await vi.advanceTimersByTimeAsync(20);
    expect(evC.length).toBe(1);
    expect(evC[0][2].at).toBeGreaterThanOrEqual(Date.now() - 30);
    // пинг по каналу — для проверки связи
    const pr = p.client.ping(); await vi.advanceTimersByTimeAsync(20);
    expect(await pr).toBeGreaterThan(5);
    // событие-кадр не того типа
    expect(() => p.client.sendEvent(0x90)).toThrow();
    expect(() => p.client.send(0x05)).toThrow();
    p.client.close();
    await vi.advanceTimersByTimeAsync(50);
    expect(p.client.state).toBe('idle');
    expect(p.server.state).toBe('idle');
    expect(p.client.send(0x90)).toBe(false);
  });

  it('чужой ключ: отказ, без повторов', async () => {
    const p = pair({ key: 'bad' });
    p.client.open();
    await vi.advanceTimersByTimeAsync(200);
    expect(p.client.state).toBe('failed');
    expect(p.client.error).toBe('key');
    expect(p.server.state).toBe('failed');
    expect(p.srv).toEqual([false]);
    await vi.advanceTimersByTimeAsync(20000);
    expect(p.connects()).toBe(1);
  });

  it('обрыв: переподключение с растущей паузой, после возврата сети — снова открыто', async () => {
    const p = pair();
    p.client.open();
    await vi.advanceTimersByTimeAsync(100);
    expect(p.client.state).toBe('open');
    p.cutOn(); p.drop();
    await vi.advanceTimersByTimeAsync(10);
    expect(p.client.state).toBe('retry');
    await vi.advanceTimersByTimeAsync(30000);
    expect(p.client.state).toBe('retry');
    expect(p.connects()).toBeGreaterThanOrEqual(6); // 0,25 0,5 1 2 4 8 с…
    expect(p.connects()).toBeLessThanOrEqual(9);
    p.cutOff();
    await vi.advanceTimersByTimeAsync(10000);
    expect(p.client.state).toBe('open');
    expect(p.client.info().attempts).toBe(0);
  });

  it('сервер не ответил на рукопожатие за 5 с — отказ по времени и повтор', async () => {
    const dead = createLink({ role: 'client', key: 'k1', connect: async () => ({ send() {}, close() {} }) });
    dead.open();
    await vi.advanceTimersByTimeAsync(5100);
    expect(dead.state).toBe('retry');
    expect(dead.error).toBe('timeout');
    dead.close();
    expect(dead.state).toBe('idle');
  });

  it('открытый канал, где замолчали, — мёртв через 7 с', async () => {
    // сервер ответил на рукопожатие и дальше молчит (ни понгов, ни своих пингов)
    const silent = createLink({ role: 'client', key: 'k1', pingEvery: 2000, connect: async (hd) => ({ send(type) { if (type === 1) setTimeout(() => hd.frame(2, new TextEncoder().encode('{"name":"x"}')), 1); }, close() {} }) });
    silent.open();
    await vi.advanceTimersByTimeAsync(100);
    expect(silent.state).toBe('open');
    await vi.advanceTimersByTimeAsync(8000);
    expect(silent.state).toBe('retry');
    expect(silent.error).toBe('timeout');
    silent.close();
  });

  it('пауза переподключения', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 10].map((n) => backoff(n))).toEqual([250, 500, 1000, 2000, 4000, 8000, 8000, 8000]);
    expect(backoff(2, 1)).toBe(1200);
  });
});
