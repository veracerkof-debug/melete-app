// Главная новичка (макет «Н1 · Сегодня»): урок, время занятия, четыре кнопки, неделя
import { test, expect } from './melete.js';

test('главная новичка: урок, выбор времени, четыре кнопки, неделя', async ({ page, melete, errors }) => {
  await melete.open({ settings: { profile: { name: 'A', instruments: ['guitar'], level: 'beginner', priorHours: 0, createdAt: 1760000000000 } } });
  await expect(page.locator('.bgnext')).toBeVisible();
  await expect(page.locator('[data-bgtitle]')).not.toHaveText('Учебник', { timeout: 8000 }); // название урока подгрузилось
  await expect(page.locator('.bgseg button.on')).toHaveText('20');
  await page.click('.bgseg button:has-text("30")');
  await expect(page.locator('.bgseg button.on')).toHaveText('30');
  await expect(page.locator('.bgplan')).toContainText('30');
  expect(await page.locator('.bggrid .bgt').count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator('.bgweek')).toBeVisible();
  await page.screenshot({ path: 'test-results/begin-home.png' });
});

test('главная любителя прежняя', async ({ page, melete, errors }) => {
  await melete.open();
  await expect(page.locator('.bgnext')).toHaveCount(0);
});

test('новичок: «Инструменты» — пять плиток и подсказка про скрытое', async ({ page, melete, errors }) => {
  await melete.open({ settings: { profile: { name: 'A', instruments: ['guitar'], level: 'beginner', priorHours: 0, createdAt: 1760000000000 } } });
  await melete.tab('tools');
  await expect(page.locator('.bggrid .bgt')).toHaveCount(5);
  await expect(page.locator('.bgmore')).toBeVisible();
  await page.click('.bggrid [data-open-tool="metro"]');
  await expect(page.locator('.mring, .metro, [data-tv]').first()).toBeVisible({ timeout: 5000 });
});

test('новичок: нижняя панель из пяти кнопок', async ({ page, melete, errors }) => {
  await melete.open({ settings: { profile: { name: 'A', instruments: ['guitar'], level: 'beginner', priorHours: 0, createdAt: 1760000000000 } } });
  await expect(page.locator('.tabbar .bgtab')).toHaveCount(5);
  await page.click('.tabbar [data-tab="tools"]');
  await expect(page.locator('.bggrid')).toBeVisible();
  await page.click('.tabbar [data-tab="home"]');
  await expect(page.locator('.bgnext')).toBeVisible();
  await page.screenshot({ path: 'test-results/beg-home-bar.png' });
  await page.click('.tabbar [data-act="panel"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/beg-bar.png' });
});
