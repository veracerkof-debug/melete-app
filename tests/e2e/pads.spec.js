// Пэды (автор 29.10.2026): плитка звучит созвучием из настроек, жест по плитке — созвучие (↑ мажор, ↓ минор, ← квинта,
// → sus4), повторное касание звучащей — стоп; квинтовый круг; «пиано» — одна октава, «Играть» (пока держат, несколько пальцев) и «Держать»
import { test, expect } from './melete.js';

test('пэды: жесты созвучий и режим «пиано»', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['drone']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="drone"] ';
  // касание A — звучит с квинтой (умолчание), подпись A5
  await melete.swipe(T + '.dtile[data-v="9"]', 0, 0, { steps: 1 });
  expect(await melete.text(T + '.dtile.on')).toBe('A5');
  // вниз по C — до минор; вверх — мажор; вправо — sus4
  await melete.swipe(T + '.dtile[data-v="0"]', 0, 60);
  expect(await melete.text(T + '.dtile.on')).toBe('Cm');
  await melete.swipe(T + '.dtile[data-v="0"]', 0, -60);
  expect(await melete.text(T + '.dtile.on')).toBe('C');
  await melete.swipe(T + '.dtile[data-v="0"]', 60, 0);
  expect(await melete.text(T + '.dtile.on')).toBe('Csus4');
  // касание звучащей — стоп
  await melete.swipe(T + '.dtile[data-v="0"]', 0, 0, { steps: 1 });
  expect(await melete.count(T + '.dtile.on')).toBe(0);
  // «пиано»: две клавиши двумя пальцами — обе звучат, отпустили — тишина
  await page.click(T + '[data-x="dmode"]'); // сетка → круг
  await page.click(T + '[data-x="dmode"]'); // круг → пиано
  expect(await melete.count(T + '.dkey')).toBe(12);
  const at = async (pc) => melete.centre(T + '.dkey[data-dk="' + pc + '"]', 0.5, 0.9);
  const [c, e] = [await at(0), await at(4)];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c[0], y: c[1], id: 1 }, { x: e[0], y: e[1], id: 2 }] });
  await page.waitForTimeout(150);
  expect(await melete.count(T + '.dkey.on')).toBe(2);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(150);
  expect(await melete.count(T + '.dkey.on')).toBe(0);
  // «Держать»: касание — вкл, ещё касание — выкл
  await page.click(T + '[data-x="dlatch"]');
  await melete.swipe(T + '.dkey[data-dk="7"]', 0, 0, { fy: 0.9, steps: 1 });
  expect(await melete.count(T + '.dkey.on')).toBe(1);
  await melete.swipe(T + '.dkey[data-dk="7"]', 0, 0, { fy: 0.9, steps: 1 });
  expect(await melete.count(T + '.dkey.on')).toBe(0);
  // квинтовый круг: касание мажора — аккорд; поворот пальцем — тональность наверху, пэды тональности под кругом
  await page.click(T + '[data-x="dmode"]'); // пиано → сетка
  await page.click(T + '[data-x="dmode"]'); // сетка → круг
  expect(await melete.count(T + '.dseg')).toBe(36);
  await melete.swipe(T + '.dseg.maj[data-i="0"] path', 0, 0, { steps: 1 });
  expect(await melete.text(T + '.dctr text')).toBe('C');
  const ck0 = (await melete.toolsNow()).drone.ckey;
  const ctr = await melete.centre(T + '.dcirc svg'), box = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().width, T + '.dcirc svg');
  const R = box * 0.4, pts = Array.from({ length: 7 }, (_, k) => { const a = -k * 0.1; return { x: ctr[0] + R * Math.sin(a), y: ctr[1] - R * Math.cos(a) }; });
  const cdp2 = await page.context().newCDPSession(page);
  await cdp2.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] });
  for (const q of pts.slice(1)) { await cdp2.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [q] }); await page.waitForTimeout(20); }
  await cdp2.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp2.detach();
  await page.waitForTimeout(400);
  expect((await melete.toolsNow()).drone.ckey).toBe((ck0 + 1) % 12);
  expect(errors).toEqual([]);
});
