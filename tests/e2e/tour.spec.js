// Инструкции (слово автора 13.11.2026): по умолчанию — у каждого инструмента при каждом открытии, пока не отмечена
// яркая галочка «Больше не показывать» (на каждом шаге, по умолчанию снята); касание по тёмной области — дальше, до конца;
// кнопки под затемнением не нажимаются.
import { test, expect } from './melete.js';

test('инструкция главной: шаги, подсветка, «больше не показывать»', async ({ page, melete, errors }) => {
  await melete.open({ settings: { helpOff: false } });
  await expect(page.locator('.tour .tourhole')).toBeVisible({ timeout: 5000 });
  const n = +(await page.locator('.tourn').textContent()).split('/')[1];
  expect(n).toBeGreaterThanOrEqual(3);
  await expect(page.locator('.tour [data-tour="never"]')).not.toBeChecked(); // галочка — с первого шага, снята
  await page.click('.tour .tournv');
  for (let i = 1; i < n; i++) { await page.click('.tour [data-tour="next"]'); await page.waitForTimeout(150); }
  await expect(page.locator('.tour [data-tour="never"]')).toBeChecked(); // отметка держится между шагами
  await page.click('.tour [data-tour="next"]'); await page.waitForTimeout(400);
  await expect(page.locator('.tour')).toHaveCount(0);
  expect((await melete.settings()).helpSeen['core:start']).toBe(true);
  await page.reload(); await page.waitForTimeout(1800);
  await expect(page.locator('.tour')).toHaveCount(0); // больше не показывается
  expect(errors).toEqual([]);
});

test('инструкция: касание мимо — дальше до конца, кнопка под затемнением не срабатывает; снова при каждом открытии', async ({ page, melete, errors }) => {
  await melete.open({ settings: { helpOff: false, helpSeen: { 'core:start': true, 'core:share': true } } });
  await melete.tab('tools');
  await melete.click('[data-open-tool="metro"]');
  await expect(page.locator('.tour .tourhole')).toBeVisible({ timeout: 5000 });
  const n = +(await page.locator('.tourn').textContent()).split('/')[1];
  // касание по кнопке старта под затемнением — следующий шаг, метроном не пошёл
  const b = await page.locator('.tview .bigplay').boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(300);
  if (n > 1) await expect(page.locator('.tourn')).toHaveText('2 / ' + n);
  expect(await page.evaluate(async () => (await import('/src/audio/index.js')).default?.metro?.running ?? false)).toBeFalsy();
  for (let i = 1; i < n; i++) { await page.mouse.click(5, 5); await page.waitForTimeout(300); }
  await expect(page.locator('.tour')).toHaveCount(0);
  expect((await melete.settings()).helpSeen.metro).toBeUndefined();
  // закрыть и открыть снова — инструкция опять
  await melete.click('.tview [data-tv="close"]'); await page.waitForTimeout(500);
  await melete.click('[data-open-tool="metro"]');
  await expect(page.locator('.tour')).toHaveCount(1, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('инструмент без шагов — карточка с яркой галочкой, касание мимо закрывает', async ({ page, melete, errors }) => {
  await melete.open({ settings: { helpOff: false, helpSeen: { 'core:start': true, 'core:share': true } } });
  await melete.tab('tools');
  await melete.click('[data-open-tool="tuner"]');
  await expect(page.locator('.helpask .hcnever')).toBeVisible({ timeout: 5000 });
  await page.click('.helpask .hcnever');
  await page.mouse.click(3, 3); await page.waitForTimeout(400);
  await expect(page.locator('.helpask')).toHaveCount(0);
  expect((await melete.settings()).helpSeen.tuner).toBe(true);
  expect(errors).toEqual([]);
});
