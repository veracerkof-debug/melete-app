// Сет-лист в метрономе (06.11.2026): кнопка открывает полосу песен (остаётся открытой), новая песня — название, темп,
// размер; касание песни — темп и размер сразу, метроном не останавливается; удержание — свой темп в сет-листе
import { test, expect } from './melete.js';

test('метроном: сет-лист — песни, темп и размер одним касанием', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [{ id: 's1', title: 'Первая', targetBpm: 96, currentBpm: 88 }] });
  await melete.free('F', ['metro']);
  const T = '.session .pane[data-tool="metro"] ';
  await page.waitForSelector(T + '[data-s="sl"]', { timeout: 15_000 });
  await melete.click(T + '[data-s="sl"]');
  await melete.click(T + '[data-sl="new"]');
  await page.fill('.sheet [data-v]', 'Концерт'); await page.click('.sheet [data-ok]');
  // шторка «Добавить»: песня из библиотеки и новая (название, темп, размер)
  await page.locator('.sheet [data-song="s1"]').click();
  await page.fill('.sheet [data-qt]', 'Вальс'); await page.fill('.sheet [data-qb]', '150'); await page.click('.sheet [data-qm="3/4"]'); await page.click('.sheet [data-qadd]');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await expect(page.locator(T + '.mslit')).toHaveCount(2);
  await melete.click(T + '[data-x="metro"], ' + T + '.bigplay').catch(() => {});
  await page.locator(T + '.mslit').nth(1).click();
  await expect(page.locator(T + '#bpm')).toHaveText('150');
  await expect(page.locator(T + '[data-s="meter"]')).toContainText('3/4');
  await page.locator(T + '.mslit').nth(0).click();
  await expect(page.locator(T + '#bpm')).toHaveText('96');
  // удержание — темп «как играю» в этом сет-листе
  const b = await page.locator(T + '.mslit').nth(0).boundingBox();
  await page.mouse.move(b.x + 20, b.y + 20); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up();
  await page.locator('.sheet [data-bpm="88"]').click(); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await expect(page.locator(T + '.mslit').nth(0)).toContainText('88 bpm');
  // полоса остаётся после перерисовки (другой размер окна)
  await page.screenshot({ path: 'test-results/metroset-port.png' });
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(500);
  await expect(page.locator(T + '.msl')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/metroset-land.png' });
  expect(errors).toEqual([]);
});
