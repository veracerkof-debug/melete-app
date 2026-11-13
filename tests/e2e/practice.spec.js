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
