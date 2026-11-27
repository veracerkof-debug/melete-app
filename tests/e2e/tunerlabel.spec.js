import { test, expect } from './melete.js';
test('тюнер: подпись режима вверху по центру', async ({ page, melete }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 454, height: 1000 });
  await melete.open();
  await melete.tab('tools'); await melete.click('[data-open-tool="tuner"]'); await page.waitForTimeout(1200);
  const m = await page.locator('.tclean .tmode').boundingBox(), c = await page.locator('.tclean').boundingBox();
  expect(Math.abs((m.x + m.width / 2) - (c.x + c.width / 2))).toBeLessThan(1.5);
  expect(m.y - c.y).toBeLessThan(6);
});

test('тюнер: у «Профи» переключателя «По строю» нет — только «Хроматический · 440 Гц»', async ({ page, melete }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 454, height: 1000 });
  await melete.open({ settings: { profile: { level: 'pro', instruments: [] } } });
  await melete.tab('tools'); await melete.click('[data-open-tool="tuner"]'); await page.waitForTimeout(1200);
  await expect(page.locator('.tclean .tmodesw')).toHaveCount(0);
  await expect(page.locator('.tclean .tmode')).toContainText('Хроматический');
  await expect(page.locator('.tclean .tmode')).toContainText('440');
});
