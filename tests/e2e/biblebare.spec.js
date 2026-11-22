// Библия без карточки (автор 22.11.2026): текст на всё рабочее пространство, без белой подложки и рамки; своя панель — только у кнопок.
import { test, expect } from './melete.js';

test('Библия: сплошное рабочее пространство, без карточки вокруг текста', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: { church: true } });
  await melete.tab('bible');
  await page.waitForSelector('.bwrap .bv', { timeout: 15_000 });
  const host = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.btab')); return { bg: c.backgroundColor, br: c.borderRadius, pad: c.padding }; });
  expect(host.bg).toBe('rgba(0, 0, 0, 0)'); expect(host.br).toBe('0px'); expect(host.pad).toBe('0px');
  const w = (await page.locator('.bwrap').boundingBox()).width;
  expect(w).toBeGreaterThanOrEqual(385); // на всю ширину окна, без боковых полей оболочки
  await expect(page.locator('.bwrap .bbar')).toBeVisible(); // панель кнопок — на месте
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/bible.png' });
  void errors;
});
