// Пульт другого устройства (Melete DEV, шаг 2): команды идут в настоящий плеер медиатеки. В браузере сети нет — запросы
// пульта замыкаются на этот же экземпляр (rcHandle), как пришли бы с другого устройства
import { test, expect } from './melete.js';

test('пульт: открыть запись, пауза, перемотка, дорожки, «управляет»', async ({ page, melete, errors }) => {
  await melete.open();
  await page.waitForFunction(() => window.__melete && window.__melete.files);
  // запись и две её дорожки в медиатеке
  await page.evaluate(async () => {
    const app = window.__melete, sr = 44100, n = sr * 4;
    const wav = (f) => { const b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin(2 * Math.PI * f * i / sr) * 8000, true); return new Blob([b], { type: 'audio/wav' }); };
    await app.files.ready;
    await app.files.add({ id: 'rcsong', name: 'Песня для пульта.wav', type: 'audio/wav', kind: 'audio', blob: wav(220), dur: 4, created: Date.now() });
    await app.files.add({ id: 'rcv', name: 'v.wav', type: 'audio/wav', kind: 'audio', blob: wav(440), dur: 4, stem: { src: 'rcsong', part: 'vocals', mode: '2' } });
    await app.files.add({ id: 'rci', name: 'i.wav', type: 'audio/wav', kind: 'audio', blob: wav(110), dur: 4, stem: { src: 'rcsong', part: 'inst', mode: '2' } });
  });
  await page.mouse.click(5, 5); // жест — звуку можно
  const rc = (path, json) => page.evaluate(async ([p, j]) => { const m = await import('/src/core/netctl.js'); return m.rcHandle(window.__melete, p, j, { key: 'k1', name: 'Pixel' }, () => {}); }, [path, json]);
  // плеер закрыт — состояние без плеера, но список есть
  let r = await rc('/melete/v1/rc/state');
  expect(r.json.list.map((x) => x.id)).toContain('rcsong');
  expect(r.json.list.map((x) => x.id)).not.toContain('rcv');
  // команда «открыть» — медиатека открывается сама, запись играет; «управляет» — сообщение
  r = await rc('/melete/v1/rc/cmd', { a: 'open', id: 'rcsong' });
  expect(r.status).toBe(200);
  expect(r.json.media.id).toBe('rcsong');
  await expect(page.locator('.toast')).toContainText('Pixel');
  await page.waitForTimeout(600);
  r = await rc('/melete/v1/rc/state');
  expect(r.json.media.playing).toBe(true);
  expect(r.json.media.stems.map((x) => x.part).sort()).toEqual(['inst', 'vocals']);
  // дорожка тише, перемотка, пауза
  await rc('/melete/v1/rc/cmd', { a: 'stem', part: 'vocals', v: 0.3 });
  r = await rc('/melete/v1/rc/cmd', { a: 'seek', t: 2 });
  expect(r.json.media.stems.find((x) => x.part === 'vocals').v).toBe(0.3);
  expect(r.json.media.pos).toBeGreaterThan(1.5);
  r = await rc('/melete/v1/rc/cmd', { a: 'play' });
  expect(r.json.media.playing).toBe(false);
  expect(errors).toEqual([]);
});

test('пульт: шторка на управляющем устройстве показывает и управляет', async ({ page, melete, errors }) => {
  await melete.open();
  await page.waitForFunction(() => window.__melete && window.__melete.files);
  await page.evaluate(async () => {
    const app = window.__melete;
    await app.files.ready;
    await app.files.add({ id: 'rc2', name: 'Вторая.wav', type: 'audio/wav', kind: 'audio', blob: new Blob([new Uint8Array(100)]), dur: 125, created: Date.now() });
    // транспорт пульта — в тот же экземпляр (вместо сети)
    const N = await import('/src/core/netctl.js'), R = await import('/src/core/screens/remote.js');
    window.__rcLog = [];
    const H = async (m, url, o) => { const p = new URL(url).pathname; window.__rcLog.push([p, o.json]); const r = await N.rcHandle(app, p, o.json, { key: 'k', name: 'Pixel' }, () => {}); return r.json; };
    R.remoteSheet(app, { addr: 'https://192.168.1.7:53329', key: 'k', name: 'Pixel' }, H);
  });
  await page.locator('.sheet [data-rcview="media"]').click();
  await expect(page.locator('.sheet [data-rcopen="rc2"]')).toBeVisible();
  await page.locator('.sheet [data-rcopen="rc2"]').click();
  await page.waitForFunction(() => window.__rcLog.some(([p, j]) => p === '/melete/v1/rc/cmd' && j && j.a === 'open'));
  await expect(page.locator('.sheet .rcnow b')).toContainText('Вторая', { timeout: 5000 });
  expect(errors.filter((e) => !/play|decode|NotSupported/i.test(e))).toEqual([]);
});

test('пульт: звук — метроном, пэды, арпеджиатор, громкость, пауза всего, инструмент', async ({ page, melete, errors }) => {
  await melete.open();
  await page.waitForFunction(() => window.__melete && window.__melete.audio);
  await page.mouse.click(5, 5);
  const rc = (json) => page.evaluate(async (j) => { const m = await import('/src/core/netctl.js'); return (await m.rcHandle(window.__melete, j ? '/melete/v1/rc/cmd' : '/melete/v1/rc/state', j, { key: 'k1', name: 'Pixel' }, () => {})).json; }, json);
  let r = await rc(null);
  expect(r.snd.metro.running).toBe(false);
  expect(r.snd.tools.map((x) => x.id)).toContain('metro');
  r = await rc({ a: 'metro', on: true });
  expect(r.snd.metro.running).toBe(true);
  r = await rc({ a: 'bpm', v: 133 });
  expect(r.snd.metro.bpm).toBe(133);
  r = await rc({ a: 'pads', on: true });
  expect(r.snd.pads.on).toBe(true);
  r = await rc({ a: 'padpc', pc: 7 });
  expect(r.snd.pads.pc).toBe(7);
  r = await rc({ a: 'padchord', c: 'min' });
  expect(r.snd.pads.chord).toBe('min');
  r = await rc({ a: 'arp', on: true });
  expect(r.snd.pads.arp).toBe(true);
  r = await rc({ a: 'vol', bus: 'drone', v: 0.4 });
  expect(r.snd.buses.find((b) => b.id === 'drone').vol).toBeCloseTo(0.4, 2);
  r = await rc({ a: 'mute', bus: 'metro', on: false });
  expect(r.snd.buses.find((b) => b.id === 'metro').on).toBe(false);
  r = await rc({ a: 'hold', on: true });
  expect(r.snd.held).toBe(true);
  r = await rc({ a: 'hold', on: false });
  expect(r.snd.held).toBe(false);
  await rc({ a: 'tool', id: 'tuner' });
  await expect(page.locator('.tview')).toHaveCount(1, { timeout: 5000 });
  await rc({ a: 'metro', on: false }); await rc({ a: 'pads', on: false });
  // шторка: страница «Звук и инструменты» по умолчанию
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const N = await import('/src/core/netctl.js'), R = await import('/src/core/screens/remote.js'), app = window.__melete;
    R.remoteSheet(app, { addr: 'https://192.168.1.7:53329', key: 'k', name: 'Pixel' }, async (m, url, o) => (await N.rcHandle(app, new URL(url).pathname, o.json, { key: 'k', name: 'Pixel' }, () => {})).json);
  });
  await expect(page.locator('.sheet [data-rc="metro"]')).toBeVisible();
  await page.locator('.sheet [data-rc="metro"]').click();
  await expect(page.locator('.sheet [data-rc="metro"][aria-pressed="true"]')).toHaveCount(1, { timeout: 4000 });
  await page.locator('.sheet [data-rc="metro"]').click();
  expect(errors).toEqual([]);
});
