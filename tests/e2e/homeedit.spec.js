// Правка главной (слово автора 14.11.2026): камень остаётся там, где живёт, — кольцом в плитке недели, а не отдельным
// блоком внизу; убрать — крестик на кольце, убранный лежит в «Убрано» и возвращается касанием.
import { test, expect } from './melete.js';

test('правка главной: камень — в плитке недели, крестик убирает, «Убрано» возвращает', async ({ page, melete, errors }) => {
  await melete.open();
  await page.waitForSelector('.hblk[data-hb="week"]');
  await expect(page.locator('.hblk[data-hb="week"] .hgstone')).toHaveCount(1);
  await melete.hold('.hblk[data-hb="week"]', 800); // удержание — режим правки
  await expect(page.locator('.hbedit')).toHaveCount(1);
  await expect(page.locator('.hblk[data-hb="league"]')).toHaveCount(0); // отдельного блока нет
  await expect(page.locator('.hblk[data-hb="week"] .hgstone')).toHaveCount(1); // камень на месте
  await page.locator('.hblk[data-hb="week"] .hbgx').click({ force: true }); // блоки в правке покачиваются
  await page.waitForTimeout(300);
  await expect(page.locator('.hblk[data-hb="week"] .hgstone')).toHaveCount(0);
  await expect(page.locator('.hbtray [data-hbe="show:league"]')).toHaveCount(1); // лежит в «Убрано»
  await page.locator('.hbtray [data-hbe="show:league"]').click({ force: true });
  await page.waitForTimeout(300);
  await expect(page.locator('.hblk[data-hb="week"] .hgstone')).toHaveCount(1); // вернулся в плитку
  void errors;
});
