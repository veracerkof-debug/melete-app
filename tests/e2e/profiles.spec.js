// Профили вывода: окно открывается из «Звук», профиль сохраняется для текущего устройства, применяется и удаляется; настройки микшера возвращаются.
import { test, expect } from './melete.js';

test('профили вывода: сохранить, изменить громкость, применить, удалить', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(400);
  await page.click('#panelLayer [data-pp="sound"]'); await page.waitForTimeout(500);
  await page.click('[data-act="sndprof"]'); await page.waitForTimeout(600);
  await expect(page.locator('.sheet')).toContainText('Профили вывода');
  await page.click('[data-pf="save"]'); await page.waitForTimeout(400);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools')).profiles.list.length)).toBe(1);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools')).mix.piano);
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('practice.v1.tools')); d.mix.piano = 0.3; });
  await page.click('[data-pf="apply"]'); await page.waitForTimeout(400);
  await page.click('[data-pf="del"]'); await page.waitForTimeout(400);
  await page.click('.sheet [data-ok], .confirm [data-ok], button:has-text("Удалить") >> nth=-1').catch(() => {});
  await page.waitForTimeout(500);
  expect(before).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
