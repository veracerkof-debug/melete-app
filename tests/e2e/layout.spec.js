// Раскладка по долгому нажатию (22.11.2026): сцена и пульт — выше/ниже, мельче/крупнее, скрыть, вернуть
import { test, expect } from './melete.js';

const hold = async (page, loc) => { const b = await loc.boundingBox(); await page.mouse.move(b.x + 4, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); };

test('сцена: удержать блок — меню; скрыть плеер, потом вернуть', async ({ page, melete, errors }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  await expect(page.locator('.sgplayer')).toBeVisible();
  await hold(page, page.locator('.sgplayer'));
  await expect(page.locator('.hmenu')).toBeVisible();
  await page.locator('.hmenu button', { hasText: 'Скрыть' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.sgplayer')).toHaveCount(0);
  // вернуть: меню любого блока → «Показать скрытое»
  await hold(page, page.locator('.sgtempo'));
  await page.locator('.hmenu button', { hasText: 'Показать скрытое' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.sgplayer')).toBeVisible();
  // крупнее: размер блока в данных
  await hold(page, page.locator('.sgplayer'));
  await page.locator('.hmenu button', { hasText: 'Крупнее' }).click(); await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__melete.store.state.settings.layout.stage.size.player)).toBe('l');
  expect(errors).toEqual([]);
});
