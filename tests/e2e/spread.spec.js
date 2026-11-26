// Два пальца (автор 06.11.2026): развести — окно во весь экран, свести — обратно; в сессии свести — окна звучащих
// инструментов. В пианино и глайдере жест не действует.
import { test, expect } from './melete.js';

// слово автора 26.11.2026: развести — окно во весь экран, свести — обратно; настройки звука жестом не открываются
test('два пальца: развести — окно во весь экран, свести — обратно, шторка звука не открывается', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('HH', ['drone', 'metro']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.spread('.ws .pane[data-pane="1"]', 3);
  await expect(page.locator('.ws .pane.pfull[data-pane="1"]')).toHaveCount(1);
  await expect(page.locator('#sheetLayer .sheet')).toHaveCount(0);
  await melete.spread('.ws .pane.pfull', 0.3);
  await expect(page.locator('.ws .pane.pfull')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('два пальца: в пианино не действуют', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('HH', ['piano', 'metro']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const i = await page.locator('.ws .pane[data-group="piano"]').getAttribute('data-pane');
  await melete.spread('.ws .pane[data-pane="' + i + '"]', 3);
  await expect(page.locator('.ws .pane.pfull')).toHaveCount(0);
  expect(errors).toEqual([]);
});
