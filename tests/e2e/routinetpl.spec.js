// Заготовки планов занятий (слово автора 22.11.2026): «Заготовки» → выбор семейства и варианта → копия в планах, правится как свой
import { test, expect } from './melete.js';

test('планы: заготовка для барабанов — копия в «Песнях», правка', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [{ id: 's1', title: 'Песня', createdAt: 1 }] });
  await melete.tab('library');
  await melete.click('[data-act="rtTpl"]');
  await page.waitForSelector('.sheet [data-rtex="drums.quick"]');
  await melete.click('.sheet [data-rtex="drums.quick"]');
  await page.waitForSelector('[data-rtsave]');
  await expect(page.locator('.rtitem')).toHaveCount(2);
  await melete.click('[data-rtsave]'); await page.waitForTimeout(400);
  await expect(page.locator('.rtrow')).toHaveCount(1);
  await expect(page.locator('.rtrow')).toContainText('Барабаны');
  expect(errors).toEqual([]);
});
