// Арпеджиатор пэдов (автор 06.11.2026, вместо тампуры): касание кнопки на полосе — вкл, играет, пока звучит пэд;
// удержание — настройки; «Глайдер рядом» — мелодия поверх.
import { test, expect } from './melete.js';

const stat = (page) => page.evaluate(async () => ({ ...(await import('/src/audio/arp.js')).arpStat }));

test('арпеджиатор: играет с пэдом, стоит без него; настройки удержанием; глайдер рядом', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['drone']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="drone"] ';
  await melete.swipe(T + '.dtile[data-v="0"]', 0, 0, { steps: 1 });
  const s0 = await stat(page);
  await page.click(T + '[data-x="darp"]'); await page.waitForTimeout(2600);
  await expect(page.locator(T + '.darp.on')).toHaveCount(1);
  const s1 = await stat(page);
  expect(s1.notes - s0.notes).toBeGreaterThan(3);
  // пэд смолк — арпеджиатор стоит
  await page.click(T + '[data-x="dstop"]'); await page.waitForTimeout(800);
  const s2 = await stat(page); await page.waitForTimeout(800);
  expect((await stat(page)).notes - s2.notes).toBeLessThanOrEqual(1);
  // удержание — шторка; «Глайдер рядом»
  await melete.hold(T + '[data-x="darp"]', 700);
  await expect(page.locator('.sheet [data-asty]').first()).toBeVisible();
  await page.click('.sheet [data-sw="aglide"] + i, .sheet label:has([data-sw="aglide"])');
  await page.click('.sheet [data-asty="pedal"]');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await melete.swipe(T + '.dtile[data-v="7"]', 0, 0, { steps: 1 });
  await page.waitForTimeout(2500);
  const s3 = await stat(page);
  expect(s3.glide).toBeGreaterThan(0);
  const d = (await melete.toolsNow()).drone;
  expect(d.arp).toMatchObject({ on: true, style: 'pedal', glide: { on: true } });
  await page.click(T + '[data-x="dstop"]');
  expect(errors).toEqual([]);
});
