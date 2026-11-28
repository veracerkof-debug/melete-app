// Сцены и сценарии: окно из «Звук», сохранить сцену, поменять настройки, вернуть сценой; сценарий листается.
import { test, expect } from './melete.js';

test('сцены: сохранить, изменить, применить; сценарий листается', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(400);
  await page.click('#panelLayer [data-pp="sound"]'); await page.waitForTimeout(500);
  await page.click('[data-act="sndscn"]'); await page.waitForTimeout(600);
  await expect(page.locator('.sheet')).toContainText('Сцены и сценарии');
  const get = () => page.evaluate(() => window.__melete.device.piano.oct);
  const o0 = await get();
  await page.click('[data-sc="new"]'); await page.waitForTimeout(300); await page.fill('#pnv', 'Первая'); await page.click('#pnok'); await page.waitForTimeout(500);
  await page.evaluate((o) => { window.__melete.device.piano.oct = o === 2 ? 3 : 2; }, o0);
  await page.click('[data-sc="new"]'); await page.waitForTimeout(300); await page.fill('#pnv', 'Вторая'); await page.click('#pnok'); await page.waitForTimeout(500);
  await page.click('[data-sc="use"] >> nth=0'); await page.waitForTimeout(500);
  expect(await get()).toBe(o0);
  await page.click('[data-sc="newscn"]'); await page.waitForTimeout(300); await page.fill('#pnv', 'Выход'); await page.click('#pnok'); await page.waitForTimeout(600);
  await page.click('[data-q="add"] >> nth=0'); await page.click('[data-q="add"] >> nth=1'); await page.waitForTimeout(300);
  await page.click('[data-q="run"]'); await page.waitForTimeout(600);
  expect(await get()).toBe(o0);
  await page.click('[data-sc="next"]'); await page.waitForTimeout(500);
  expect(await get()).not.toBe(o0);
  expect(errors).toEqual([]);
});
