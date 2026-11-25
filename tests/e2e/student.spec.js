// Режим «Ученик» (слово автора 24.11.2026): блокировка с кодом учителя, открытие инструментов, обход закрыт
import { test, expect } from './melete.js';

test('ученик: блокировка кодом, учитель открывает инструмент, неверный код не снимает', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('[data-pp="student"]'); await page.waitForTimeout(500);
  await page.fill('[data-stucode]', '12'); await page.click('[data-stu="lock"]');
  expect((await melete.settings()).student || null).toBeNull();      // короткий код не принят
  await page.fill('[data-stucode]', '4821'); await page.click('[data-stu="lock"]'); await page.waitForTimeout(500);
  let s = await melete.settings();
  expect(s.student.on).toBe(true);
  expect(JSON.stringify(s.student)).not.toContain('4821');          // код — только хэш
  await expect(page.locator('[data-stuopen]').first()).toBeVisible();
  await page.click('[data-stuopen="ear"]', { force: true }); await page.waitForTimeout(300);
  expect((await melete.settings()).student.open).toContain('ear');
  await page.click('[data-pp="root"]'); await page.waitForTimeout(500);
  await expect(page.locator('[data-pp="data"]')).toHaveCount(0);    // обходы скрыты
  await expect(page.locator('[data-pp="feat"]')).toHaveCount(0);
  await page.click('[data-pp="student"]'); await page.waitForTimeout(400);
  await page.fill('[data-stucode]', '0000'); await page.click('[data-stu="unlock"]'); await page.waitForTimeout(300);
  expect((await melete.settings()).student.on).toBe(true);          // неверный код
  await page.fill('[data-stucode]', '4821'); await page.click('[data-stu="unlock"]'); await page.waitForTimeout(400);
  expect((await melete.settings()).student || null).toBeNull();
  void errors;
});
