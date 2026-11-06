// «Слух и ритм» (автор 06.11.2026, пункт 11): один инструмент, две главы; главу можно выключить; прежние места
// «Слуха» и «Ритма» переходят к нему; в занятии — окно с переключателем глав.
import { test, expect } from './melete.js';

test('слух и ритм: одна карточка, главы переключаются и выключаются', async ({ page, melete, errors }) => {
  await melete.open({ settings: { quick: ['metro', 'ear', 'beat'] } });
  expect((await melete.settings()).quick).toEqual(['metro', 'train']); // прежний быстрый доступ — к общему инструменту
  await melete.tab('tools');
  await expect(page.locator('.tgrid [data-open-tool="train"]')).toHaveCount(1);
  await expect(page.locator('.tgrid [data-open-tool="ear"], .tgrid [data-open-tool="beat"]')).toHaveCount(0);
  await melete.click('[data-open-tool="train"]'); await page.waitForTimeout(900);
  await expect(page.locator('.tview [data-trch="ear"].on')).toHaveCount(1);
  await page.click('.tview [data-trch="beat"]'); await page.waitForTimeout(700);
  await expect(page.locator('.tview .cbody .pane[data-tool="beat"], .tview .cbody[data-tool="beat"]')).toHaveCount(1);
  // выключить «Слух» — остаётся одна глава
  await page.click('.tview [data-trsets]'); await page.waitForTimeout(400);
  await page.click('.sheet label:has([data-sw="trch-ear"])'); await page.waitForTimeout(300);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await expect(page.locator('.tview [data-trch]')).toHaveCount(1);
  expect((await melete.settings()).off.ear).toBe(true);
  expect(errors).toEqual([]);
});

test('слух и ритм в занятии: окно с переключателем глав', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['train']);
  await expect(page.locator('.ws .pane .csw [data-csub]')).toHaveCount(2);
  await page.click('.ws .pane .csw [data-csub="beat"]'); await page.waitForTimeout(700);
  await expect(page.locator('.ws .pane[data-tool="beat"], .ws .pane [data-tool="beat"]')).not.toHaveCount(0);
  expect(errors).toEqual([]);
});
