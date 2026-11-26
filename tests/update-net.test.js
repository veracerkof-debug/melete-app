// Обновление: проверка не зависит от того, как переключилась сеть — сбой сети повторяется, лимит GitHub не долбится
import { describe, it, expect, vi } from 'vitest';
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false }, registerPlugin: () => ({}) }));
vi.mock('../src/core/desktop.js', () => ({ isDesktop: () => true }));
vi.mock('../src/core/log.js', () => ({ log: () => {}, logErr: () => {} }));
const { createUpdater, CHANNEL } = await import('../src/core/update.js'); // канал — как у сборки (MELETE_CHANNEL: main → dev, pre → pre)
const app = { store: { state: { settings: {} } } };
const rel = { assets: [{ name: 'Melete-Dev-Setup.exe', state: 'uploaded', size: 1, browser_download_url: 'x' }, { name: 'Melete-Setup.exe', state: 'uploaded', size: 1, browser_download_url: 'x' }, { name: 'windows-1.ver', state: 'uploaded' }] }; // номер 1 — не новее сборки CI (BUILD_NUMBER ≥ 1)

describe('update: сеть', () => {
  it('сбой сети (Wi-Fi ↔ мобильная) — повтор, проверка проходит', async () => {
    let n = 0;
    globalThis.fetch = vi.fn(async (u) => { if (/github\.io/.test(String(u))) return { ok: false, status: 404, headers: { get: () => null } }; if (n++ === 0) throw new TypeError('Failed to fetch'); return { ok: true, status: 200, json: async () => rel, headers: { get: () => null } }; });
    const U = createUpdater(app);
    const s = await U.check();
    // фоновая проверка: сбой и повтор релиза — и всё; ход сборки (ещё запрос) спрашивается только при открытых «Обновлениях» (25.11.2026)
    expect(fetch).toHaveBeenCalledTimes(3); // файл на сайте (нет), сбой API и повтор
    expect(s.st).toBe('none'); // собрано у себя (номер 0) — не обновляется, но ответ получен
    expect(String(fetch.mock.calls[0][0])).toMatch(new RegExp('github\\.io/.+/rel/' + CHANNEL + '\\.json'));
    expect(String(fetch.mock.calls[1][0])).toMatch(new RegExp('releases/tags/' + CHANNEL + '$'));
    await U.check({ building: true }); // «Обновления» открыты: релиз и ход сборки
    expect(String(fetch.mock.calls[fetch.mock.calls.length - 1][0])).toMatch(/actions\/workflows\/.+\/runs\?branch=/);
  }, 10000);
  it('условный запрос: ETag из прошлого ответа, «не менялось» берёт сохранённое', async () => {
    const store = new Map(); globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    const down = { ok: false, status: 404, headers: { get: () => null } }; // файла на сайте нет — идём в API
    globalThis.fetch = vi.fn(async (u) => (/github\.io/.test(String(u)) ? down : { ok: true, status: 200, json: async () => rel, headers: { get: (k) => (k === 'etag' ? 'W/"abc"' : null) } }));
    const U = createUpdater(app);
    await U.check();
    expect((fetch.mock.calls[1][1].headers || {})['If-None-Match']).toBeUndefined();
    store.delete('melete.upd.api'); // запасной путь не чаще раза в 2 часа — для проверки условного запроса сбрасываем
    globalThis.fetch = vi.fn(async (u) => (/github\.io/.test(String(u)) ? down : { ok: false, status: 304, headers: { get: () => null } }));
    const s = await U.check();
    expect(fetch.mock.calls[1][1].headers['If-None-Match']).toBe('W/"abc"');
    expect(s.st).toBe('none'); // ответ 304 — релиз из сохранённого, без ошибки и без лимита
  });
  it('лимит GitHub — без повторов, с временем', async () => {
    const reset = Math.floor(Date.now() / 1000) + 600;
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 403, headers: { get: (k) => ({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) })[k] ?? null } }));
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const U = createUpdater(app);
    const s = await U.check();
    expect(fetch).toHaveBeenCalledTimes(2); // файл на сайте (нет) и один запрос в API, без повторов
    expect(s.st).toBe('err');
    expect(s.limit).toBe(reset * 1000);
  });
  it('файл релиза на сайте проекта читается первым — в API GitHub не ходим', async () => {
    const store = new Map(); globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => rel, headers: { get: () => null } }));
    const U = createUpdater(app);
    const s = await U.check();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toContain('.github.io/');
    expect(String(fetch.mock.calls[0][0])).not.toContain('api.github.com');
    expect(s.st).toBe('none');
  });
  it('API GitHub как запасной путь — не чаще раза в 2 часа, между ними сохранённый ответ', async () => {
    const store = new Map(); globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    const down = { ok: false, status: 404, headers: { get: () => null } };
    globalThis.fetch = vi.fn(async (u) => (/github\.io/.test(String(u)) ? down : { ok: true, status: 200, json: async () => rel, headers: { get: (k) => (k === 'etag' ? 'W/"z"' : null) } }));
    const U = createUpdater(app);
    await U.check();
    expect(fetch.mock.calls.filter((c) => /api\.github\.com/.test(String(c[0])))).toHaveLength(1);
    await U.check(); // сразу же ещё раз: в API уже не идём
    expect(fetch.mock.calls.filter((c) => /api\.github\.com/.test(String(c[0])))).toHaveLength(1);
  });
});
