// Календарь — не вкладка (слово автора 21.11.2026): с 25.11.2026 вход — заголовок панели «Сегодня» в карточке недели, касание открывает календарь
import { test, expect } from './melete.js';

test('календарь: нет вкладки; заголовок «Сегодня» на главной открывает экран', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({});
  await expect(page.locator('.tabbar .tab[data-tab="calendar"]')).toHaveCount(0);
  await expect(page.locator('.htdh')).toBeVisible(); await expect(page.locator('.hcal')).toHaveCount(0); // отдельной строки календаря нет
  await melete.tab('tools'); await page.waitForTimeout(500);
  await expect(page.locator('.tgrid [data-open-tool="calendar"]')).toHaveCount(0); // и не плиткой
  await melete.tab('home'); await page.waitForTimeout(400);
  await page.click('.htdh'); await page.waitForTimeout(600);
  await expect(page.locator('.calhd')).toBeVisible();
  expect(errors).toEqual([]);
});
