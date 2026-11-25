// «Гитара с нуля» (слово автора 25.11.2026): девять уроков классической гитары в «Первых шагах» учебника,
// схемы — свои: посадка, устройство (касание части), схема аккорда (мажор первым)
import { test, expect } from './melete.js';

test('гитара с нуля: путь, устройство гитары, схема аккорда', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.tools({ book: { book: { lvl: 'beginner', sec: 'first' } } }); await melete.free('F', ['book']);
  await page.waitForSelector('.pane .book', { timeout: 15_000 });
  await expect(page.locator('.book .bcard[data-bch="g1"]')).toHaveCount(1);
  await expect(page.locator('.book .bcard[data-bch^="g"]')).toHaveCount(9);
  await expect(page.locator('.book .bpath.guitar')).toHaveCount(1);
  // устройство: касание части меняет подпись
  await page.locator('.book .bcard[data-bch="g2"]').click();
  await page.waitForSelector('.bkgparts');
  await page.locator('.bkgparts .pn[data-a="p:pegs"]').click();
  await expect(page.locator('.bkginfo b')).toContainText('Колки');
  await page.locator('.bkgparts .pn[data-a="p:bridge"]').click();
  await expect(page.locator('.bkginfo b')).toContainText('Подставка');
  // схема аккорда: C → G, шесть строк разбора
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g5"]').click();
  await page.waitForSelector('.bkgbox');
  await expect(page.locator('.bkgch')).toHaveCount(5);
  await page.locator('.bkgch', { hasText: /^G$/ }).click();
  await expect(page.locator('.bkgleg.flat li')).toHaveCount(6);
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/guitar-box.png' });
  // посадка и упражнения только для гитары, без выбора инструмента
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g1"]').click();
  await page.waitForSelector('.bkgpos');
  await expect(page.locator('.bklinst')).toHaveCount(0);
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/guitar-pos.png' });
  void errors;
});
