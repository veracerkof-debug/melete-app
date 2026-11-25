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
  await page.locator('.hbtray [data-hbe="show:league"]').dispatchEvent('click'); // «Убрано» может лежать под нижней панелью — касание попало бы во вкладку
  await page.waitForTimeout(300);
  await expect(page.locator('.hblk[data-hb="week"] .hgstone')).toHaveCount(1); // вернулся в плитку
  void errors;
});

// Ручка размера блока (слово автора 25.11.2026): тянуть вниз — блок растёт под пальцем, значение — числом в данных
test('правка главной: ручка размера — блок растёт и уменьшается, число в данных', async ({ page, melete, errors }) => {
  await melete.open();
  await page.waitForSelector('.hblk[data-hb="week"]');
  await melete.hold('.hblk[data-hb="week"]', 800);
  await expect(page.locator('.hbedit')).toHaveCount(1);
  const h = () => page.locator('.hblk[data-hb="week"]').evaluate((e) => Math.round(e.getBoundingClientRect().height));
  const h0 = await h();
  const g = await page.locator('.hblk[data-hb="week"] .hbgrip').boundingBox();
  const x = g.x + g.width / 2, y = g.y + g.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(x, y + i * 12); // живой показ: блок растёт, пока палец идёт
  expect(await h()).toBeGreaterThan(h0 + 20);
  await page.mouse.up(); await page.waitForTimeout(300);
  const z = await page.evaluate(() => window.__melete.store.state.settings.home.size.week);
  expect(typeof z).toBe('number'); expect(z).toBeGreaterThan(1.05); expect(z).toBeLessThanOrEqual(1.4);
  expect(await h()).toBeGreaterThan(h0 + 15);
  // «Как было» возвращает
  await page.locator('.hbedit [data-hbe="reset"]').click(); await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window.__melete.store.state.settings.home || {}).size || null)).toBeNull();
  void errors;
});
