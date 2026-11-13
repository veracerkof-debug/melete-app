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

test('«перерыв?»: после 50 минут — полоска; «Перерыв» ставит паузу, «Продолжить» снимает', async ({ page, melete, errors }) => {
  await melete.open();
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session', { timeout: 10_000 });
  await page.waitForTimeout(800);
  await expect(page.locator('.sbrk')).toHaveCount(0);
  await page.evaluate(() => { const a = window.__melete.active; a.startedAt -= 51 * 60000; a.last = Date.now(); });
  await expect(page.locator('.sbrk')).toBeVisible({ timeout: 3000 });
  await page.click('.sbrk [data-brk="go"]');
  expect(await page.evaluate(() => !!window.__melete.active.pausedAt)).toBe(true);
  await expect(page.locator('.sbrk')).toContainText('Перерыв ·');
  await page.click('.sbrk [data-brk="back"]');
  expect(await page.evaluate(() => !!window.__melete.active.pausedAt)).toBe(false);
  await page.waitForTimeout(1200);
  await expect(page.locator('.sbrk')).toHaveCount(0); // отсчёт — заново с конца перерыва
  expect(errors).toEqual([]);
});

test('план занятия: пример в «Песнях», выбор при начале, полоса пунктов, разбивка в записи', async ({ page, melete, errors }) => {
  await melete.open({ songs: [{ id: 's1', title: 'Песня', createdAt: 1 }] });
  await melete.tab('library');
  await melete.click('[data-rtex="guitar"]');
  await page.waitForSelector('[data-rtsave]');
  await melete.click('[data-rtsave]'); await page.waitForTimeout(400);
  await expect(page.locator('.rtrow')).toHaveCount(1);
  await melete.click('[data-rtgo]');
  await page.waitForSelector('#splan', { timeout: 10_000 });
  await expect(page.locator('#splan .spn')).toHaveText('1/3');
  await melete.click('#splan [data-s="pnext"]'); await page.waitForTimeout(300);
  await expect(page.locator('#splan .spn')).toHaveText('2/3');
  // начать с главной — выбор «Свободно» или план
  await page.evaluate(() => { const a = window.__melete.active; a.startedAt -= 120000; a.routine.at -= 120000; a.last = Date.now(); });
  await melete.click('[data-s="finish"]');
  await page.waitForSelector('[data-rv="next"]');
  await melete.click('[data-k="save"]'); await page.waitForTimeout(500);
  const rec = await page.evaluate(() => window.__melete.store.sessions().slice(-1)[0]);
  expect(rec.plan.items).toHaveLength(3);
  expect(rec.plan.items[1].sec).toBeGreaterThan(100);
  await melete.tab('home');
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await expect(page.locator('[data-pk]')).toHaveCount(2);
  await melete.click('[data-pk=""]');
  await page.waitForSelector('.session', { timeout: 10_000 });
  await expect(page.locator('#splan')).toHaveCount(0);
  expect(errors).toEqual([]);
});
