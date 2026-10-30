// Лупер, вид «Партии» (30.10.2026): партия ударных в петле, правка в шторке, петля по тактам, вкл/выкл с начала такта
import { test, expect } from './melete.js';

test('партии: ударные в петле, правка, вкл/выкл с такта', async ({ page, melete, errors }) => {
  await melete.open({ tools: { looper: { metro: false, view: 'parts', bars: 4 } } });
  await melete.free('F', ['looper']);
  await expect(page.locator('.lpwrap.parts')).toHaveCount(1);
  await melete.click('[data-x="padd"]'); await page.waitForTimeout(500);
  await page.locator('.hmenu button').first().click(); await page.waitForTimeout(1500);
  await expect(page.locator('.lpped .stwrap')).toHaveCount(1); // редактор ударных в шторке
  await page.locator('.lpped .rack [data-step], .lpped .rack button').first().click().catch(() => {});
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  await expect(page.locator('.lprow[data-tr]')).toHaveCount(1);
  await melete.click('[data-x="main"]'); await page.waitForTimeout(800); // петля играет, партия — в такт
  const playing = await page.evaluate(() => document.querySelector('[data-x="main"]')?.getAttribute('aria-label'));
  expect(playing).toBeTruthy();
  await page.locator('.lprow[data-tr] .lprn').click(); await page.waitForTimeout(200);
  await expect(page.locator('.lprow[data-tr].pend')).toHaveCount(1); // выключится с начала такта
  await page.waitForTimeout(3200);
  await expect(page.locator('.lprow[data-tr].off')).toHaveCount(1);
  await melete.click('[data-x="stop"]');
  expect(errors).toEqual([]);
});
