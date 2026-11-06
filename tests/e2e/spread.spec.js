// Два пальца (автор 06.11.2026): развести — окно во весь экран, свести — обратно; в сессии свести — окна звучащих
// инструментов. В пианино и глайдере жест не действует.
import { test, expect } from './melete.js';

test('два пальца: развести — во весь экран, свести — обратно', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('HH', ['drone', 'metro']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.spread('.ws .pane[data-pane="1"]', 3);
  await expect(page.locator('.ws .pane.pfull[data-pane="1"]')).toHaveCount(1);
  await melete.spread('.ws .pane.pfull', 0.3);
  await expect(page.locator('.ws .pane.pfull')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('два пальца: свести — окна звучащих инструментов', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('HH', ['metro', 'drone']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.swipe('.session .pane[data-tool="drone"] .dtile[data-v="9"]', 0, 0, { steps: 1 });
  await page.click('.session .pane[data-tool="metro"] .bigplay');
  await page.waitForTimeout(400);
  // одно окно — метроном, пэды звучат за кадром
  await page.locator('.ws .grip').first().click(); await page.waitForTimeout(500);
  await page.click('.sheet [data-pm="full"]'); await page.waitForTimeout(600);
  await expect(page.locator('.ws .pane')).toHaveCount(1);
  await melete.spread('.ws .pane', 0.3);
  await expect(page.locator('.ws .pane')).toHaveCount(2);
  await expect(page.locator('.ws .pane[data-group="drone"]')).toHaveCount(1);
  await page.click('.session .pane[data-tool="metro"] .bigplay');
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
