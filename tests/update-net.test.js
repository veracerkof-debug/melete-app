// Обновление: проверка не зависит от того, как переключилась сеть — сбой сети повторяется, лимит GitHub не долбится
import { describe, it, expect, vi } from 'vitest';
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false }, registerPlugin: () => ({}) }));
vi.mock('../src/core/desktop.js', () => ({ isDesktop: () => true }));
vi.mock('../src/core/log.js', () => ({ log: () => {}, logErr: () => {} }));
const { createUpdater } = await import('../src/core/update.js');
const app = { store: { state: { settings: {} } } };
const rel = { assets: [{ name: 'Melete-Dev-Setup.exe', state: 'uploaded', size: 1, browser_download_url: 'x' }, { name: 'windows-90.ver', state: 'uploaded' }] };

describe('update: сеть', () => {
  it('сбой сети (Wi-Fi ↔ мобильная) — повтор, проверка проходит', async () => {
    let n = 0;
    globalThis.fetch = vi.fn(async () => { if (n++ === 0) throw new TypeError('Failed to fetch'); return { ok: true, status: 200, json: async () => rel, headers: { get: () => null } }; });
    const U = createUpdater(app);
    const s = await U.check();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(s.st).toBe('none'); // собрано у себя (номер 0) — не обновляется, но ответ получен
    expect(String(fetch.mock.calls[0][0])).toMatch(/releases\/tags\/dev\?t=\d+/);
  }, 10000);
  it('лимит GitHub — без повторов, с временем', async () => {
    const reset = Math.floor(Date.now() / 1000) + 600;
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 403, headers: { get: (k) => ({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) })[k] ?? null } }));
    const U = createUpdater(app);
    const s = await U.check();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(s.st).toBe('err');
    expect(s.limit).toBe(reset * 1000);
  });
});
