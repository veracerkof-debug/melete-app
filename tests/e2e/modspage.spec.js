// Настройки 26.11.2026: «Модули и функции» — короткая страница + отдельный экран переключателей; «Звук» без дорожек (они — в «Связи»)
import { test, expect } from './melete.js';

test('модули: кнопка ведёт на экран переключателей, назад — на «Модули и функции»; звук без «Дорожки автоматически»', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('#panelLayer [data-pp="feat"]'); await page.waitForTimeout(500);
  await expect(page.locator('#panelLayer [data-feat]')).toHaveCount(0); // переключателей на самой странице нет
  await page.click('#panelLayer [data-pp="mods"]'); await page.waitForTimeout(500);
  expect(await page.locator('#panelLayer [data-feat]').count()).toBeGreaterThan(8);
  const row = await page.locator('#panelLayer .modsp .cell').first().boundingBox();
  expect(row.height).toBeLessThan(62); // плотные строки
  await page.click('#panelLayer .navrow [data-pp]'); await page.waitForTimeout(400);
  await expect(page.locator('#panelLayer [data-pp="mods"]')).toBeVisible();
  await page.click('#panelLayer .navrow [data-pp="root"]'); await page.waitForTimeout(400);
  await page.click('#panelLayer [data-pp="sound"]'); await page.waitForTimeout(500);
  await expect(page.locator('#panelLayer [data-seg="autostems"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
