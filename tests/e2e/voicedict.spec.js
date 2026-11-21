// Диктофон (отчёт автора 21.11.2026): остановка записи сразу кладёт её в папку диктофона, экран остаётся тем же
// (готов к новой записи), в общем списке медиатеки такой записи нет; прослушивание — из списка, правка — отдельной кнопкой.
import { test, expect } from './melete.js';

test('остановка записи → папка диктофона, экран прежний', async ({ page, melete }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await melete.open();
  await melete.free('F', ['voice']);
  await page.waitForSelector('.voice [data-x="rec"]');
  await page.click('.voice [data-x="rec"]');
  await page.waitForSelector('.voice [data-x="stop"]');
  await page.waitForTimeout(1500);
  await page.click('.voice [data-x="stop"]');
  // экран записи остался: кнопка записи и поверхность (спектр), окна обрезки нет
  await page.waitForSelector('.voice [data-x="rec"]');
  expect(await page.locator('.voice .vc-take').count()).toBe(0);
  expect(await page.locator('.voice .vc-stage').count()).toBe(1);
  // файл в папке диктофона
  await page.waitForFunction(() => window.__melete.files.list('audio').some((x) => x.dict), null, { timeout: 15_000 });
  const f = await page.evaluate(() => { const x = window.__melete.files.list('audio').find((y) => y.dict); return { dur: x.dur, size: x.size, noAuto: x.noAuto, name: x.name }; });
  expect(f.size).toBeGreaterThan(1000);
  expect(f.dur).toBeGreaterThan(0.5);
  expect(f.noAuto).toBe(true);
  // шторка со списком: строка есть, играть можно, меню есть, кнопка правки — отдельная
  await page.click('.voice [data-x="recs"]');
  await page.waitForSelector('[data-rplay]');
  await page.click('[data-rplay]');
  await page.waitForSelector('.vcr.on');
  await page.click('[data-rplay]');
  await page.click('[data-rmore]');
  await page.waitForSelector('[data-rm="edit"]');
  await page.click('[data-rm="edit"]');
  await page.waitForSelector('.voice .vc-take');
  await page.click('.voice [data-x="back"]');
  await page.waitForSelector('[data-rplay]');
});
