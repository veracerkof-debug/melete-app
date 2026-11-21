// Скруглённые углы экрана (21.11.2026): радиус от системы → отступ у верхней и нижней полос; «Полный экран» кнопкой — только пианино и глайдер
import { test, expect } from './melete.js';

test.use({ viewport: { width: 390, height: 844 } });

test('углы: радиус от системы отодвигает полосы; без радиуса — как было', async ({ page, melete }) => {
  await page.addInitScript(() => { window.MeleteCorner = { radius: () => 40 }; });
  await melete.open(); await page.waitForTimeout(600);
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--cp'))).toBe('12px');
  const pad = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.topbar')).paddingLeft));
  expect(pad).toBeGreaterThanOrEqual(12);
});

test('полный экран: кнопка видна у пианино и глайдера, у остальных — только жест', async ({ page, melete }) => {
  await melete.open();
  await melete.free('F', ['metro']); await page.waitForTimeout(500);
  await expect(page.locator('.ws .pane .pfbtn')).toBeHidden();
  await melete.free('F', ['piano']); await page.waitForTimeout(500);
  await expect(page.locator('.ws .pane .pfbtn')).toBeVisible();
  await melete.free('F', ['glider']); await page.waitForTimeout(500);
  await expect(page.locator('.ws .pane .pfbtn')).toBeVisible();
});
