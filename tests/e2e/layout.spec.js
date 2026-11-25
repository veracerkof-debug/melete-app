// Правка вида сцены (слова автора 22.11 и 25.11.2026): удержать блок — режим правки, только в тишине; размер плавно (планка внизу),
// порядок, скрыть и вернуть; «Готово» — вид сохранён и заморожен: на ходу (звучит метроном) правка не включается
import { test, expect } from './melete.js';

const hold = async (page, loc) => { const b = await loc.boundingBox(); await page.mouse.move(b.x + 4, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); };
const lay = (page) => page.evaluate(() => window.__melete.store.state.settings.layout.stage);

test('сцена: правка вида — размер, порядок, скрыть/вернуть, «Готово» замораживает', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  await expect(page.locator('.sgplayer')).toBeVisible();
  await expect(page.locator('.lybar')).toHaveCount(0); // обычный вид: никаких рамок и кнопок правки
  // удержание в тишине — правка; содержимое блоков не нажимается
  await hold(page, page.locator('.sgplayer'));
  await expect(page.locator('.lybar')).toBeVisible();
  await expect(page.locator('.lyb.ed')).not.toHaveCount(0);
  // размер: тянуть планку вниз → число в данных, больше единицы
  const g = await page.locator('.lyb[data-lb="tempo"] .lyh').boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + i * 8);
  await page.mouse.up(); await page.waitForTimeout(300);
  const z = (await lay(page)).size.tempo;
  expect(typeof z).toBe('number'); expect(z).toBeGreaterThan(1.05); expect(z).toBeLessThanOrEqual(2.2);
  // порядок: ↓ у темпа
  const before = await page.evaluate(() => [...document.querySelectorAll('.lyb.ed')].map((e) => e.dataset.lb));
  await page.click('.lyb[data-lb="tempo"] [data-ly="down"]'); await page.waitForTimeout(200);
  const after = await page.evaluate(() => [...document.querySelectorAll('.lyb.ed')].map((e) => e.dataset.lb));
  expect(after).not.toEqual(before); expect(after.indexOf('tempo')).toBe(before.indexOf('tempo') + 1);
  // скрыть плеер и вернуть из «Скрыто»
  await page.click('.lyb[data-lb="player"] [data-ly="hide"]'); await page.waitForTimeout(200);
  await expect(page.locator('.lyb[data-lb="player"]')).toHaveCount(0);
  await page.click('[data-ly="show"][data-id="player"]'); await page.waitForTimeout(200);
  await expect(page.locator('.lyb[data-lb="player"]')).toHaveCount(1);
  // «Готово»: правка закрыта, вид сохранён
  await page.click('[data-ly="done"]'); await page.waitForTimeout(300);
  await expect(page.locator('.lybar')).toHaveCount(0);
  expect((await lay(page)).size.tempo).toBe(z);
  // заморожено на ходу: метроном идёт — удержание правку не включает
  await page.click('[data-sgmetro]'); await page.waitForTimeout(500);
  await hold(page, page.locator('.sgplayer'));
  await expect(page.locator('.lybar')).toHaveCount(0);
  await expect(page.locator('.toast, #toast')).toBeVisible();
  await page.click('[data-sgmetro]'); // остановить
  expect(errors).toEqual([]);
});
