// Занятия (слово автора 13.11.2026, «для занятий — всё»): перерывы расписания, разбор, «перерыв?», план занятия,
// повторение репертуара, сравнение дублей, тихий вид, отчёт для педагога.
import { test, expect } from './melete.js';

const key = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

test('перерыв расписания: на главной «Отпуск до …», день перерыва отмечен', async ({ page, melete, errors }) => {
  const now = new Date(), to = new Date(Date.now() + 3 * 86400000);
  await melete.open({ settings: { plan: { slots: [{ id: 'a', days: [0, 1, 2, 3, 4, 5, 6], from: '19:00', to: '20:00' }], off: [{ id: 'o', from: key(now), to: key(to), title: 'Отпуск' }], once: {} } } });
  await expect(page.locator('.hlink')).toContainText('Отпуск до');
  await expect(page.locator('.hdays .day.off.today')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('разбор после занятия: три поля, «Дальше» — в начале следующего занятия', async ({ page, melete, errors }) => {
  await melete.open();
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session', { timeout: 10_000 });
  await expect(page.locator('.slast')).toHaveCount(0); // прошлого разбора нет
  // занятие длиной две минуты
  await page.evaluate(() => { const a = window.__melete.active; a.startedAt -= 120000; a.last = Date.now(); });
  await melete.click('[data-s="finish"]');
  await page.waitForSelector('[data-rv="next"]');
  await page.fill('[data-rv="good"]', 'Гамма ровно');
  await page.fill('[data-rv="next"]', 'Баррэ медленно');
  await melete.click('[data-k="save"]');
  await page.waitForTimeout(500);
  const rec = await page.evaluate(() => window.__melete.store.sessions().slice(-1)[0]);
  expect(rec.review).toEqual({ good: 'Гамма ровно', next: 'Баррэ медленно' });
  expect(rec.note).toContain('Баррэ медленно');
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await expect(page.locator('.slast')).toContainText('Баррэ медленно', { timeout: 5000 });
  await page.click('.slast'); await page.waitForTimeout(400);
  await expect(page.locator('.slast')).toHaveCount(0);
  expect(errors).toEqual([]);
});
