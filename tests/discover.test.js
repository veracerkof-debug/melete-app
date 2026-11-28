// Автопоиск устройств в сети (src/core/discover.js): разбор объявлений, исключение себя и сопряжённых, таймаут, недоступность
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseFound, listFound, discoverDevices, discoverAvail, lastFound, clearFound, searching } from '../src/core/discover.js';

const F = (o = {}) => ({ name: 'Студия', type: 'desktop', addr: '192.168.1.50', port: 53329, id: 'ab12cd34', ...o });

describe('discover: разбор объявлений', () => {
  it('нормальная запись', () => {
    expect(parseFound(F())).toEqual({ name: 'Студия', type: 'desktop', addr: '192.168.1.50', port: 53329, id: 'ab12cd34' });
    expect(parseFound(F({ type: 'phone' })).type).toBe('phone');
    expect(parseFound(F({ type: 'что-то' })).type).toBe('desktop');
  });
  it('чужой, нечисловой и внешний адрес, плохой порт — отбрасываются', () => {
    for (const x of [null, 5, {}, F({ addr: '8.8.8.8' }), F({ addr: 'example.com' }), F({ port: 0 }), F({ port: 70000 }), F({ port: 'x' })]) expect(parseFound(x)).toBeNull();
  });
  it('имя очищается, пустое получает подпись, id без мусора', () => {
    expect(parseFound(F({ name: '<b>Х</b>\n' })).name).toBe('bХ/b');
    expect(parseFound(F({ name: '' })).name).toBe('PC');
    expect(parseFound(F({ name: '', type: 'phone' })).name).toBe('Melete');
    expect(parseFound(F({ name: 'я'.repeat(200) })).name.length).toBe(60);
    expect(parseFound(F({ id: '' })).id).toBe('192.168.1.50:53329');
    expect(parseFound(F({ id: 'a b<c>' })).id).toBe('abc');
  });
});

describe('discover: список', () => {
  it('исключает само устройство (по адресу и по отпечатку) и повторы', () => {
    const raw = [F(), F({ addr: '192.168.1.60', id: 'ffff0000', name: 'Я' }), F({ addr: '192.168.1.70', id: 'eeee1111', name: 'Я2' }), F()];
    const r = listFound(raw, { mine: { ips: ['192.168.1.60'], fp8: 'EEEE1111' } });
    expect(r.map((x) => x.addr)).toEqual(['192.168.1.50']);
  });
  it('сопряжённые помечаются (по адресу и по отпечатку) и идут последними', () => {
    const raw = [F({ name: 'А', addr: '192.168.1.50', id: 'aaaaaaaa' }), F({ name: 'Б', addr: '192.168.1.51', id: 'bbbbbbbb' }), F({ name: 'В', addr: '192.168.1.52', id: 'cccccccc' })];
    const r = listFound(raw, { paired: [{ addr: 'https://192.168.1.50:53329', fp: '' }, { addr: 'https://10.0.0.9:53329', fp: 'cccccccc' + '0'.repeat(56) }] });
    expect(r.map((x) => [x.name, x.paired])).toEqual([['Б', false], ['А', true], ['В', true]]);
  });
  it('тот же адрес, другой порт — другое устройство; другой порт у сопряжённого — не сопряжено', () => {
    const r = listFound([F(), F({ port: 53319, id: '' })], { paired: [{ addr: 'https://192.168.1.50:53329' }] });
    expect(r).toHaveLength(2);
    expect(r.find((x) => x.port === 53319).paired).toBe(false);
  });
  it('мусор вместо списка — пусто', () => {
    expect(listFound(null)).toEqual([]);
    expect(listFound('x')).toEqual([]);
  });
});

describe('discover: поиск', () => {
  beforeEach(() => { vi.useFakeTimers(); globalThis.window = globalThis.window || {}; clearFound(); });
  afterEach(() => { vi.useRealTimers(); delete globalThis.window.__MELETE_DISCOVER__; });

  it('без платформы и подстановки недоступен — пусто, без ошибок', async () => {
    expect(discoverAvail()).toBe(false);
    expect(await discoverDevices()).toEqual([]);
  });
  it('подстановка: список разобран, кэш сохранён, поиск одиночный', async () => {
    const fn = vi.fn(async () => [F(), F({ addr: '1.2.3.4' })]);
    window.__MELETE_DISCOVER__ = fn;
    expect(discoverAvail()).toBe(true);
    const a = discoverDevices({ timeoutMs: 3000 }), b = discoverDevices({ timeoutMs: 3000 });
    expect(searching()).toBe(true);
    const r = await a;
    expect(await b).toBe(r);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0].timeoutMs).toBe(3000);
    expect(r).toHaveLength(1);
    expect(lastFound()).toBe(r);
    expect(searching()).toBe(false);
  });
  it('срок ограничен: слишком маленький и большой поднимаются/опускаются', async () => {
    const fn = vi.fn(async () => []);
    window.__MELETE_DISCOVER__ = fn;
    await discoverDevices({ timeoutMs: 10 }); expect(fn.mock.calls[0][0].timeoutMs).toBe(500);
    await discoverDevices({ timeoutMs: 999999 }); expect(fn.mock.calls[1][0].timeoutMs).toBe(15000);
  });
  it('платформа молчит — через срок с запасом пусто, не висим', async () => {
    window.__MELETE_DISCOVER__ = () => new Promise(() => {});
    const p = discoverDevices({ timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(4100);
    expect(await p).toEqual([]);
    expect(searching()).toBe(false);
  });
  it('платформа бросает — пусто', async () => {
    window.__MELETE_DISCOVER__ = () => { throw new Error('nsd'); };
    expect(await discoverDevices()).toEqual([]);
  });
  it('исключение себя и сопряжённых передаётся в список', async () => {
    window.__MELETE_DISCOVER__ = [F(), F({ addr: '192.168.1.60', id: 'zz' })];
    const r = await discoverDevices({ mine: { ips: ['192.168.1.60'] }, paired: [{ addr: '192.168.1.50:53329' }] });
    expect(r.map((x) => [x.addr, x.paired])).toEqual([['192.168.1.50', true]]);
  });
});
