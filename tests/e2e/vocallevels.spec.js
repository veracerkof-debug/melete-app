// Вокал: «Начать занятие» — 10 уровней, кнопка внизу рабочей поверхности, экран без прокрутки (слово автора 21.11.2026)
import { test, expect } from './melete.js';

test('вокал: уровни 1–10, «Начать занятие» запускает программу уровня', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: { vocal: { range: { lo: 48, hi: 64, plo: 45, phi: 67 } } } });
  await melete.free('F', ['vocal']);
  const card = page.locator('.vclvl');
  await expect(card).toBeVisible();
  await expect(card.locator('.vclt b')).toContainText('1 из 10');
  await card.locator('[data-x="vlv"][data-d="1"]').click();
  await card.locator('[data-x="vlv"][data-d="1"]').click();
  await expect(page.locator('.vclvl .vclt b')).toContainText('3 из 10');
  const sc = await page.locator('.vc').evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(sc).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/vocal-levels.png' });
  await page.locator('[data-x="vstart"]').click();
  await expect(page.locator('.vclvl')).toHaveCount(0);
  await expect(page.locator('#vcsub')).toContainText('Уровень 3', { timeout: 5000 });
  expect(errors).toEqual([]);
});
