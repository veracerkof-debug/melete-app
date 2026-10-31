// Регистрация: четыре уровня карточками (решение автора 31.10.2026) — выбор уровня задаёт профиль, набор инструментов
// и уровень учебника
import { test, expect, sleep } from './melete.js';

test('регистрация: уровень карточкой → профиль и учебник', async ({ page, melete, errors }) => {
  await melete.open({ fresh: true });
  for (let i = 0; i < 6 && !(await page.locator('#onboard').count()); i++) {
    await sleep(page, 1000);
    const b = page.locator('button.btn.fill:visible').first();
    if (await b.count()) await b.click();
  }
  await expect(page.locator('#onboard .lvc')).toHaveCount(4);
  await expect(page.locator('#onboard [data-lv="beginner"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#onboard [data-lv="advanced"]').click();
  await expect(page.locator('#onboard [data-lv="advanced"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#onboard [data-obgo]').click();
  await expect(page.locator('#onboard')).toHaveCount(0);
  const p = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).settings.profile);
  expect(p.level).toBe('advanced');
  expect(p.priorHours).toBe(1000);
  void errors;
});
