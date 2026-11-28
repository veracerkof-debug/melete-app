import { describe, it, expect, beforeEach } from 'vitest';
import { statusOf, sameNet, waysOf, devicesOf, devicesHTML, SOON, ERR_KEEP, __setNet } from '../src/core/screens/devices.js';

// Экран «Устройства»: статус по последнему обмену и ошибке (без опроса сети), «та же ли сеть», что можно подключить,
// карточки из melete.sync и страница целиком (пустая и с устройствами)
const mkLS = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const NOW = 1_800_000_000_000;

describe('statusOf', () => {
  it('нет обмена — «new»; недавний — «ok»; давний — «old»', () => {
    expect(statusOf({ now: NOW }).id).toBe('new');
    expect(statusOf({ last: NOW - 60_000, now: NOW }).id).toBe('ok');
    expect(statusOf({ last: NOW - SOON - 1, now: NOW }).id).toBe('old');
  });
  it('ошибка новее обмена — «down»; старая или не про связь — нет', () => {
    expect(statusOf({ last: NOW - 3000, errAt: NOW - 1000, errReason: 'unreachable', now: NOW })).toEqual({ id: 'down', reason: 'unreachable' });
    expect(statusOf({ last: NOW - 1000, errAt: NOW - 3000, errReason: 'unreachable', now: NOW }).id).toBe('ok'); // после ошибки обмен удался
    expect(statusOf({ last: NOW - 3000, errAt: NOW - ERR_KEEP - 1, errReason: 'unreachable', now: NOW }).id).toBe('ok'); // ошибка давняя
    expect(statusOf({ last: NOW - 3000, errAt: NOW - 1000, errReason: 'busy', now: NOW }).id).toBe('ok'); // «занято» — не поломка
  });
});

describe('sameNet', () => {
  it('домашняя Wi-Fi против мобильного интернета — разные', () => {
    expect(sameNet('192.168.1.126', '192.168.1.114')).toBe(true);
    expect(sameNet('10.27.4.9', '192.168.1.126')).toBe(false); // случай автора 28.11.2026
    expect(sameNet('192.168.0.5', '192.168.1.5')).toBe(false);
    expect(sameNet('10.1.2.3', '10.9.9.9')).toBe(true);
  });
  it('не понять — null', () => {
    expect(sameNet(null, '192.168.1.5')).toBeNull();
    expect(sameNet('185.2.3.4', '91.2.3.4')).toBeNull();
    expect(sameNet('192.168.1.5', 'https://192.168.1.7:53329')).toBe(true);
  });
});

describe('waysOf', () => {
  it('телефон обычной версии — только к компьютеру', () => {
    expect(waysOf({ native: true })).toEqual([{ id: 'pc', roles: ['join'] }]);
  });
  it('телефон DEV — компьютер и телефон (показать и подключиться)', () => {
    expect(waysOf({ native: true, mesh: true, meshCli: true })).toEqual([{ id: 'pc', roles: ['join'] }, { id: 'phone', roles: ['show', 'join'] }]);
  });
  it('компьютер — телефон: показать код; у DEV ещё и подключиться', () => {
    expect(waysOf({ srv: true })).toEqual([{ id: 'phone', roles: ['show'] }]);
    expect(waysOf({ srv: true, meshCli: true })).toEqual([{ id: 'phone', roles: ['show', 'join'] }]);
  });
  it('браузер — подключать нечего', () => {
    expect(waysOf({})).toEqual([]);
  });
});

describe('карточки и страница', () => {
  beforeEach(() => { globalThis.localStorage = mkLS(); __setNet(null); });
  const app = (extra = {}) => ({ store: { state: { settings: {} } }, ...extra });

  it('пустой список: подсказка, без устройств', () => {
    expect(devicesOf(app())).toEqual([]);
    const h = devicesHTML(app({ syncSrv: { avail: true, state: { on: false, ips: [], code: '' }, peers: [], subscribe: () => () => {} } }));
    expect(h).toContain('dvempty');
    expect(h).toContain('data-dv="add"');
  });

  it('компьютер и устройство из melete.sync — карточки с режимами и временем', () => {
    localStorage.setItem('melete.sync', JSON.stringify({
      pc: { addr: 'https://192.168.1.114:53329', key: 'k1', name: 'Студия', v: 3, fp: 'ab'.repeat(32), last: Date.now() - 60_000, mode: { rc: false, sync: true } },
      devs: { 'https://192.168.1.126:53329': { addr: 'https://192.168.1.126:53329', key: 'k2', name: 'Pixel', phone: true, last: 0, ids: [] } },
    }));
    const list = devicesOf(app());
    expect(list.map((d) => d.id)).toEqual(['pc', 'dev:https://192.168.1.126:53329']);
    expect(list[0].status.id).toBe('ok');
    expect(list[0].canSync).toBe(true);
    expect(list[0].canRc).toBe(false); // пульт у этого компьютера выключен
    expect(list[1].status.id).toBe('new');
    expect(list[1].phone).toBe(true);
    const h = devicesHTML(app({ mesh: { avail: true, state: { on: false, ips: [], code: '' }, peers: [], subscribe: () => () => {} } }));
    expect(h).toContain('Студия');
    expect(h).toContain('Pixel');
    expect(h).toContain('data-dv="sync"');
    expect(h).toContain('data-dv="rc"'); // у Pixel пульт включён
    expect(h).toContain('data-dv="open"');
  });

  it('плашка «Нет Wi-Fi» — только при wifi === false', () => {
    const a = app({ syncSrv: { avail: true, state: { on: false, ips: [], code: '' }, peers: [], subscribe: () => () => {} } });
    expect(devicesHTML(a)).not.toContain('dvnet');
    __setNet({ wifi: true, cellular: false, ip: '192.168.1.5' });
    expect(devicesHTML(a)).not.toContain('dvnet');
    __setNet({ wifi: false, cellular: true, ip: null });
    expect(devicesHTML(a)).toContain('dvnet');
  });

  it('подключившиеся к этому устройству — карточки без кнопок синхронизации', () => {
    const S = { avail: true, state: { on: true, ips: ['192.168.1.5'], code: '123456' }, peers: [{ key: 'abc', name: 'Телефон', at: Date.now(), mode: { rc: true, sync: true } }], subscribe: () => () => {}, setMode() {}, forget() {} };
    const list = devicesOf(app({ syncSrv: S }));
    expect(list).toHaveLength(1);
    expect(list[0].kind).toBe('in');
    expect(list[0].canSync).toBe(false);
    expect(list[0].status.id).toBe('ok');
  });
});
