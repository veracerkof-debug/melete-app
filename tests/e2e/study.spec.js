// Учёба на главной (автор 06.11.2026, пункт 22): строка на инструмент — часы за неделю из цели; касание — открыть на
// своём месте; ⋯ — часы в неделю; время «Слуха и ритма» пишется по главам.
import { test, expect } from './melete.js';

test('учёба: строки, открыть главу, часы в неделю', async ({ page, melete, errors }) => {
  await melete.open({ settings: { study: { goals: { ear: 60 } } } });
  await expect(page.locator('.hstudy .hsrow[data-k="ear"]')).toHaveCount(1);
  await expect(page.locator('.hstudy .hsrow')).toHaveCount(1);
  await melete.click('.hstudy .hsrow[data-k="ear"]'); await page.waitForTimeout(1000);
  await expect(page.locator('.tview [data-trch="ear"].on')).toHaveCount(1);
  await page.waitForTimeout(11_000); // время в инструменте пишется от 10 секунд
  await melete.click('.tview [data-tv="close"]'); await page.waitForTimeout(800);
  const tools = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).sessions.filter((s) => s.type === 'tool').map((s) => s.tool));
  expect(tools).toContain('ear'); // по главе, не «train»
  // ⋯ — добавить «Ритм» на 30 минут
  await melete.click('.hstudy [data-act="studyset"]'); await page.waitForTimeout(400);
  await page.click('.sheet [data-sgid="beat"]'); await page.waitForTimeout(400);
  await page.click('.sheet [data-sg="30"]'); await page.waitForTimeout(600);
  await expect(page.locator('.hstudy .hsrow')).toHaveCount(2);
  expect(errors).toEqual([]);
});
