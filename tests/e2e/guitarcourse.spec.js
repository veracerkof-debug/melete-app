// «Гитара с нуля» (слово автора 25.11.2026): девять уроков классической гитары в «Первых шагах» учебника,
// схемы — свои: посадка, устройство (касание части), схема аккорда (мажор первым)
import { test, expect } from './melete.js';

test('гитара с нуля: путь, устройство гитары, схема аккорда', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.tools({ book: { book: { lvl: 'beginner', sec: 'first' } } }); await melete.free('F', ['book']);
  await page.waitForSelector('.pane .book', { timeout: 15_000 });
  await expect(page.locator('.book .bcard[data-bch="g1"]')).toHaveCount(1);
  await expect(page.locator('.book .bcard[data-bch^="g"]')).toHaveCount(42);
  await expect(page.locator('.book .bpath.guitar')).toHaveCount(1);
  // устройство: касание части меняет подпись
  await page.locator('.book .bcard[data-bch="g2"]').click();
  await page.waitForSelector('.gm3');
  await page.locator('.gm-chip[data-gm-sel="pegs"]').click();
  await expect(page.locator('[data-gm-info] b')).toContainText('Колки');
  await page.locator('.gm-chip[data-gm-sel="bridge"]').click();
  await expect(page.locator('[data-gm-info] b')).toContainText('Бридж');
  await page.locator('[data-gm="ex"]').click();
  await expect(page.locator('.gm3.ex')).toHaveCount(1);
  // электро: звукосниматели
  await page.locator('[data-gm-type="electric"]').click();
  await page.locator('.gm-chip[data-gm-sel="body"]').click();
  await expect(page.locator('[data-gm-info] span')).toContainText('звукосниматели');
  // схема аккорда: C → G, шесть строк разбора
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g5"]').click();
  await page.waitForSelector('.bkgbox');
  await expect(page.locator('.bkgch')).toHaveCount(5);
  await page.locator('.bkgch', { hasText: /^G$/ }).click();
  await expect(page.locator('.bkgleg.flat li')).toHaveCount(6);
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/guitar-box.png' });
  // бой: рисунок на восемь долей, выбор рисунка меняет стрелки
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g14"]').click();
  await page.waitForSelector('.bkgstrum');
  await expect(page.locator('.bkgstrum .bkgbt')).toHaveCount(8);
  await expect(page.locator('.bkgstrum .bkgbt b').first()).toHaveText('↓');
  await page.locator('.bkgch[data-a="s:q"]').click();
  await expect(page.locator('.bkgstrum .bkgbt b').nth(1)).toHaveText('·');
  // новые схемы: имена струн, такт и деления, карта аккордов, формула гаммы
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g32"]').click();
  await page.waitForSelector('.bkgbar');
  await page.locator('.bkgch[data-a="d:16"]').click();
  await expect(page.locator('.bkgbar .bkgbc')).toHaveCount(16);
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g33"]').click();
  await page.waitForSelector('.bkgall');
  await expect(page.locator('.bkgall .bkgcard')).toHaveCount(6);
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g28"]').click();
  await page.waitForSelector('.bkgform');
  await expect(page.locator('.bkgform .bkgnote')).toHaveCount(8);
  // минор: Am, Em, Dm
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g10"]').click();
  await page.waitForSelector('.bkgbox');
  await expect(page.locator('.bkgch.on')).toHaveText('Am');
  // связки и септаккорды
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g19"]').click();
  await page.waitForSelector('.bkgprog');
  await expect(page.locator('.bkgprog .bkgpc')).toHaveCount(4);
  await page.locator('.bkgch[data-a="p:gevd"]').click();
  await expect(page.locator('.bkgprog .bkgpc b').nth(2)).toHaveText('C');
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/guitar-prog.png' });
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g18"]').click();
  await page.waitForSelector('.bkgbox');
  await expect(page.locator('.bkgch')).toHaveCount(6);
  // барре: полоса на схеме; арпеджио: пальцы p i m a по струнам
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g24"]').click();
  await page.waitForSelector('.bkgbox');
  await expect(page.locator('.bkgbox .barre')).toHaveCount(2);
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/guitar-barre.png' });
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g21"]').click();
  await page.waitForSelector('.bkgarp');
  await expect(page.locator('.bkgarp .dot')).toHaveCount(4);
  await page.locator('.bkgch[data-a="s:p6"]').click();
  await expect(page.locator('.bkgarp .dot')).toHaveCount(6);
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/guitar-arp.png' });
  // гаммы: схема грифа, выбор гаммы, хроматическая
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g28"]').click();
  await page.waitForSelector('.bkgscale');
  await expect(page.locator('.bkgscale .dot, .bkgscale .op')).toHaveCount(8);
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g40"]').click();
  await page.waitForSelector('.bkgscale');
  await expect(page.locator('.bkginfo').first()).toContainText('F♯');
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/guitar-scale.png' });
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g31"]').click();
  await page.waitForSelector('.bkgscale');
  await expect(page.locator('.bkgscale .dot, .bkgscale .op')).toHaveCount(13);
  // посадка и упражнения только для гитары, без выбора инструмента
  await page.locator('.book [data-btoc]').first().click();
  await page.locator('.book .bcard[data-bch="g1"]').click();
  await page.waitForSelector('.bkgpos');
  await expect(page.locator('.bklinst')).toHaveCount(0);
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/guitar-pos.png' });
  void errors;
});
