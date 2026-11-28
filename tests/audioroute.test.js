import { describe, it, expect } from 'vitest';
import { createRoute } from '../src/audio/route.js';

describe('устройство вывода (без Android)', () => {
  it('выбранный выход приложения — ключ web|имя; «по умолчанию» — web|default', async () => {
    const outs = { id: '', list: async () => [{ id: 'a', label: 'JBL Go' }, { id: 'b', label: '#2' }] };
    const r = createRoute(outs, null);
    expect((await r.current()).key).toBe('web|default');
    outs.id = 'a'; expect((await r.current()).key).toBe('web|jbl go');
    const l = await r.list(); expect(l.map((d) => d.key)).toEqual(['web|jbl go']); // безымянные (#2) не показываются
    expect(r.native()).toBe(false);
  });
  it('нет списка устройств — не падает', async () => {
    const r = createRoute({ id: '', list: async () => { throw new Error('x'); } }, null);
    expect((await r.current()).key).toBe('web|default');
  });
  it('смена выхода сообщается подписчикам один раз на смену', async () => {
    const outs = { id: '', list: async () => [{ id: 'a', label: 'BT Headset' }] };
    const handlers = []; const nav = { mediaDevices: { addEventListener: (_, f) => handlers.push(f), removeEventListener: () => {} } };
    const r = createRoute(outs, nav), seen = []; const off = r.onChange((c) => seen.push(c.key));
    await new Promise((x) => setTimeout(x, 5));
    outs.id = 'a'; await handlers[0](); await new Promise((x) => setTimeout(x, 5)); await handlers[0](); await new Promise((x) => setTimeout(x, 5));
    expect(seen).toEqual(['web|bt headset']); off();
  });
});
