// Чтение Библии по норме и свои напоминания (слово автора 24.11.2026, церковный режим)
import { test, expect } from './melete.js';

test('норма чтения: включить, карточка дня, догнать, свои напоминания', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: { church: true } });
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('#panelLayer [data-pp="bible"]'); await page.waitForTimeout(500); // в профиле; такая же карточка есть и на главной
  await expect(page.locator('.hdr', { hasText: 'Чтение по норме' })).toBeVisible();
  await page.locator('[data-bn-sw="on"]').evaluate((el) => el.click()); await page.waitForTimeout(400);
  let s = await melete.settings();
  expect(s.bible.norm).toMatchObject({ on: true, kind: 'ch', n: 1, order: 'seq' });
  await expect(page.getByText('Сегодня: 0 из 1 глав')).toBeVisible();
  // две главы в день, затем минуты
  await page.click('[data-bnact="inc"]'); await page.waitForTimeout(200);
  expect((await melete.settings()).bible.norm.n).toBe(2);
  await page.click('[data-bnseg="kind"][data-v="min"]'); await page.waitForTimeout(200);
  expect((await melete.settings()).bible.norm).toMatchObject({ kind: 'min', n: 15 });
  await page.click('[data-bnseg="kind"][data-v="ch"]'); await page.waitForTimeout(200);
  // строгий режим: серия видна только здесь
  await page.locator('[data-bn-sw="strict"]').evaluate((el) => el.click()); await page.waitForTimeout(300);
  expect((await melete.settings()).bible.norm.strict).toBe(true);
  // своё напоминание
  await page.click('[data-bnact="newnote"]'); await page.waitForTimeout(400);
  await page.fill('[data-nt="text"]', 'Прочитать главу'); await page.fill('[data-nt="at"]', '08:15');
  await page.locator('[data-nt="persist"]').evaluate((el) => el.click());
  await page.click('[data-ntact="save"]'); await page.waitForTimeout(500);
  s = await melete.settings();
  expect(s.bible.notes).toHaveLength(1); expect(s.bible.notes[0]).toMatchObject({ text: 'Прочитать главу', at: '08:15', persist: true });
  await expect(page.getByText('Прочитать главу').first()).toBeVisible();
  // карточка дня на главной — без «дня N из M»
  await page.click('[data-act="pclose"]'); await page.waitForTimeout(600);
  const card = page.locator('.hread');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Чтение дня');
  await expect(card).not.toContainText('из 365');
  await expect(card.locator('.hrr')).toContainText('Быт 1');
  void errors;
});
