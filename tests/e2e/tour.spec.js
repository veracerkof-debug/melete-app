// Инструкции с подсветкой (автор 06.11.2026, пункт 20): в первый раз — сами; всё затемнено, кроме элемента;
// «Дальше» — по шагам, на последнем «Больше не показывать»; касание мимо — пропуск, кнопки под затемнением не нажимаются.
import { test, expect } from './melete.js';

test('инструкция главной: шаги, подсветка, «больше не показывать»', async ({ page, melete, errors }) => {
  await melete.open({ settings: { helpOff: false } });
  await expect(page.locator('.tour .tourhole')).toBeVisible({ timeout: 5000 });
  const n = +(await page.locator('.tourn').textContent()).split('/')[1];
  expect(n).toBeGreaterThanOrEqual(3);
  for (let i = 1; i < n; i++) { await page.click('.tour [data-tour="next"]'); await page.waitForTimeout(150); }
  await expect(page.locator('.tour [data-tour="never"]')).toBeChecked();
  await page.click('.tour [data-tour="next"]'); await page.waitForTimeout(400);
  await expect(page.locator('.tour')).toHaveCount(0);
  expect((await melete.settings()).helpSeen['core:start']).toBe(true);
  await page.reload(); await page.waitForTimeout(1800);
  await expect(page.locator('.tour')).toHaveCount(0); // больше не показывается
  expect(errors).toEqual([]);
});

test('инструкция: касание мимо — пропуск, кнопка под затемнением не срабатывает; метроном — свои шаги', async ({ page, melete, errors }) => {
  await melete.open({ settings: { helpOff: false, helpSeen: { 'core:start': true } } });
  await melete.tab('tools');
  await melete.click('[data-open-tool="metro"]');
  await expect(page.locator('.tour .tourhole')).toBeVisible({ timeout: 5000 });
  // касание по кнопке старта под затемнением — это пропуск, метроном не пошёл
  const b = await page.locator('.tview .bigplay').boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(400);
  await expect(page.locator('.tour')).toHaveCount(0);
  expect(await page.evaluate(async () => (await import('/src/audio/index.js')).default?.metro?.running ?? false)).toBeFalsy();
  const st = await melete.settings();
  expect(st.helpSkip.metro).toBe(1);
  expect(st.helpSeen.metro).toBeUndefined();
  expect(errors).toEqual([]);
});
