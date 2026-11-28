// Сеть для связи между своими устройствами: привязка к Wi-Fi по адресу (зеркало NetBind.java), умолчания, причина «нет Wi-Fi»
import { describe, it, expect, beforeEach } from 'vitest';
import { netInfo, isPrivateHost, bindFor, noWifiFor, netLabel } from '../src/core/netinfo.js';
import { syncNow, pair } from '../src/core/sync.js';
import { createStore } from '../src/core/store.js';

const mkLS = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const mkApp = () => ({ store: createStore({ storage: mkLS() }), files: { list: () => [], get: () => null, ready: Promise.resolve() } });

describe('netinfo: адреса и привязка', () => {
  it('частные диапазоны', () => {
    for (const a of ['10.0.0.5', '172.16.0.1', '172.31.255.1', '192.168.1.114', '169.254.3.4', 'https://192.168.1.114:53329', '192.168.1.5:53329/melete/v1/hello']) expect(isPrivateHost(a), a).toBe(true);
    for (const a of ['172.15.0.1', '172.32.0.1', '8.8.8.8', '192.169.1.1', '11.0.0.1', '300.1.1.1', '192.168.1', 'example.com', '', null, undefined]) expect(isPrivateHost(a), String(a)).toBe(false);
  });
  it('привязка: частный адрес и Wi-Fi есть — wifi; иначе прежнее поведение', () => {
    const wifi = { wifi: true, cellular: true, ip: '192.168.1.20' }, none = { wifi: false, cellular: true, ip: null };
    expect(bindFor('https://192.168.1.114:53329', wifi)).toBe('wifi');
    expect(bindFor('https://8.8.8.8:53329', wifi)).toBe('default');
    expect(bindFor('https://192.168.1.114:53329', none)).toBe('default');
    expect(bindFor('https://192.168.1.114:53329')).toBe('wifi'); // умолчание: Wi-Fi считается есть
  });
  it('нет Wi-Fi и адрес локальный — причина «нет Wi-Fi»; неизвестное состояние — нет', () => {
    expect(noWifiFor('https://192.168.1.114:53329', { wifi: false, cellular: true })).toBe(true);
    expect(noWifiFor('https://8.8.8.8', { wifi: false, cellular: true })).toBe(false);
    expect(noWifiFor('https://192.168.1.114:53329', { wifi: true })).toBe(false);
    expect(noWifiFor('https://192.168.1.114:53329')).toBe(false);
  });
  it('подпись для журнала', () => {
    expect(netLabel({ wifi: true, cellular: false })).toBe('wifi');
    expect(netLabel({ wifi: true, cellular: true })).toBe('wifi+мобильная');
    expect(netLabel({ wifi: false, cellular: true })).toBe('только мобильная');
    expect(netLabel({ wifi: false, cellular: false })).toBe('сети нет');
  });
  it('в браузере и на компьютере — безопасное умолчание, плашки не показываются зря', async () => {
    expect(await netInfo()).toEqual({ wifi: true, cellular: false, ip: null });
  });
});

describe('sync: причина «нет Wi-Fi»', () => {
  let phone;
  beforeEach(() => { globalThis.localStorage = mkLS(); phone = mkApp(); });
  const pairFine = async () => {
    const H = async (m, url) => (url.endsWith('/hello') ? { app: 'melete', v: 1, name: 'PC' } : { key: 'k'.repeat(32), name: 'PC' });
    await pair('192.168.1.114', '482913', 'Телефон', H);
  };
  const dead = async () => { throw new Error('Failed to connect to /192.168.1.114:53329 from /10.27.196.9 [via default]'); };

  it('адрес локальный, Wi-Fi нет → nowifi', async () => {
    await pairFine();
    await expect(syncNow(phone, () => {}, dead, { netInfo: async () => ({ wifi: false, cellular: true, ip: null }) })).rejects.toMatchObject({ reason: 'nowifi' });
  });
  it('Wi-Fi есть, но не отвечает → unreachable (как раньше)', async () => {
    await pairFine();
    await expect(syncNow(phone, () => {}, dead, { netInfo: async () => ({ wifi: true, cellular: false, ip: '192.168.1.20' }) })).rejects.toMatchObject({ reason: 'unreachable' });
  });
  it('netInfo сломан → unreachable, синхронизация не падает иначе', async () => {
    await pairFine();
    await expect(syncNow(phone, () => {}, dead, { netInfo: async () => { throw new Error('x'); } })).rejects.toMatchObject({ reason: 'unreachable' });
  });
  it('сопряжение: при неизвестной сети остаётся unreachable', async () => {
    const H = async () => { throw new Error('timeout'); };
    const ni = await import('../src/core/netinfo.js');
    expect(ni.noWifiFor('https://192.168.1.114:53329', { wifi: false })).toBe(true);
    await expect(pair('192.168.1.114', '1', 'Т', H)).rejects.toMatchObject({ reason: 'unreachable' }); // в тесте netInfo — умолчание (Wi-Fi есть)
  });
});
