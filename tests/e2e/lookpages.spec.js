// «Оформление» — три вкладки по смыслу (вид · цвета · ещё), «Вкладки» — список «добавить» в две колонки (слово автора 22.11.2026).
import { test, expect } from './melete.js';

test('оформление: вкладки вид / цвета / ещё', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('[data-pp="look"]'); await page.waitForTimeout(700);
  await expect(page.locator('.lktabs button')).toHaveCount(3);
  await expect(page.locator('.thcard[data-v]')).toHaveCount(3); // тема — мини-экранами
  await page.click('.thcard[data-v="dark"]'); expect((await melete.settings()).theme).toBe('dark');
  await page.click('.thcard[data-skin="paper"]'); expect((await melete.settings()).theme).toBe('paper');
  await expect(page.locator('.pals')).toHaveCount(0);
  const h0 = await page.evaluate(() => document.querySelector('.wrap[style*="padding-bottom:40px"]').scrollHeight);
  await page.click('[data-lktab="color"]'); await page.waitForTimeout(300);
  await expect(page.locator('.pals')).toHaveCount(1);
  await expect(page.locator('[data-acc]').first()).toBeVisible();
  await page.click('[data-lktab="more"]'); await page.waitForTimeout(300);
  await expect(page.locator('[data-appicon]').first()).toBeVisible();
  await expect(page.locator('[data-seg="scale"]')).toHaveCount(1);
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/look-more.png' });
  // каждая вкладка короче прежней страницы (≈1945 px)
  const h1 = await page.evaluate(() => document.querySelector('.wrap[style*="padding-bottom:40px"]').scrollHeight);
  expect(Math.max(h0, h1)).toBeLessThan(1500);
  void errors;
});

test('вкладки: список «добавить инструментом» в две колонки', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('[data-pp="tabs"]'); await page.waitForTimeout(700);
  const g = page.locator('.group.dense2').first();
  await expect(g).toHaveCount(1);
  const cols = await g.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(cols).toBe(2);
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/tabs.png', fullPage: false });
  void errors;
});
