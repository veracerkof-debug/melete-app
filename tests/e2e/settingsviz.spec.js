// Настройки картинкой (слово автора 22.11.2026): «Данные» — плитки и полоса места, «Неделя» — гистограмма плана по дням.
import { test, expect } from './melete.js';

test('данные и неделя: инфографика', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('[data-pp="data"]'); await page.waitForTimeout(800);
  await expect(page.locator('.dstiles .tile')).toHaveCount(2);
  await expect(page.locator('[data-dsdisk]')).toBeVisible({ timeout: 5000 });
  expect(await page.locator('[data-dsval]').textContent()).toMatch(/\d/);
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/data.png' });
  await page.keyboard.press('Escape');
  await page.reload(); await page.waitForTimeout(800);
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('[data-pp="week"]'); await page.waitForTimeout(900);
  await expect(page.locator('.wkbars .wkc')).toHaveCount(7);
  await page.locator('.wkinfo').scrollIntoViewIfNeeded();
  const hs = await page.locator('.wkc i:not(.z)').evaluateAll((a) => a.map((e) => e.getBoundingClientRect().height));
  expect(hs.length).toBeGreaterThan(0); hs.forEach((h) => expect(h).toBeGreaterThan(10)); // занятые дни — со столбиком
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/week.png' });
  void errors;
});
