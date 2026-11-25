// Два пальца (автор 06.11.2026): развести — окно во весь экран, свести — обратно; в сессии свести — окна звучащих
// инструментов. В пианино и глайдере жест не действует.
import { test, expect } from './melete.js';

test('два пальца: свести — окно во весь экран, ещё раз свести — обратно', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('HH', ['drone', 'metro']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.spread('.ws .pane[data-pane="1"]', 0.3);
  await expect(page.locator('.ws .pane.pfull[data-pane="1"]')).toHaveCount(1);
  await melete.spread('.ws .pane.pfull', 0.3);
  await expect(page.locator('.ws .pane.pfull')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// слово автора 22.11.2026: развести — окно настроек звука инструмента (эффекты его шины); окно во весь экран не открывается
test('два пальца: развести — настройки звука инструмента', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('HH', ['drone', 'metro']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.spread('.ws .pane[data-pane="1"]', 3);
  await expect(page.locator('.ws .pane.pfull')).toHaveCount(0);
  await expect(page.locator('#sheetLayer .sheet')).toHaveCount(1);
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
