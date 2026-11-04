// Линии голосов в пиано (src/ui/voicelines.js): режим по кнопке вместо панели ручек; аккорды рисуются линиями
// от клавиш, без ошибок; выключение возвращает панель звука.
import { test, expect } from './melete.js';

test('пиано: режим «Линии голосов» — линии от клавиш, ручки — шторкой', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await melete.open();
  await melete.free('F', ['piano']);
  await page.waitForSelector('.pbar');
  await expect(page.locator('.psyn')).toHaveCount(1);
  await melete.click('[data-x="plines"]');
  await expect(page.locator('.pvl')).toHaveCount(1);
  await expect(page.locator('.psyn')).toHaveCount(0);
  await expect(page.locator('[data-x="psound"]')).toHaveCount(1); // ручки звука — шторкой
  for (const ch of [[60, 64, 67], [60, 65, 69]]) {
    await page.evaluate((ch) => ch.forEach((m, i) => { const k = document.querySelector('.kb [data-m="' + m + '"]'); const r = k.getBoundingClientRect(); k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 10 + i, clientX: r.left + r.width / 2, clientY: r.bottom - 20 })); }), ch);
    await page.waitForTimeout(300);
    await page.evaluate((ch) => ch.forEach((m, i) => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 10 + i }))), ch);
  }
  // на холсте нарисовано (не пусто)
  const ink = await page.evaluate(() => { const c = document.querySelector('.pvl'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; });
  expect(ink).toBeGreaterThan(200);
  const h = await page.evaluate(() => document.querySelector('.pvl').getBoundingClientRect().height);
  expect(h).toBeGreaterThan(150);
  await melete.click('[data-x="plines"]');
  await expect(page.locator('.psyn')).toHaveCount(1);
  expect(errors).toEqual([]);
});
