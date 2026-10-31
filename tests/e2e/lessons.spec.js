// Уроки тренажёров слуха и ритма: путь, урок до итога, запись прогресса, проверка уровня и выход из урока.
import { test, expect } from './melete.js';

const data = (page, id) => page.evaluate((id) => JSON.parse(localStorage.getItem('practice.v1')).settings[id], id);

test('слух: урок до итога, прогресс сохраняется; проверка уровня — выход', async ({ page, melete, errors }) => {
  await melete.open({ tools: { ear: { view: 'course' } } });
  await melete.tab('tools');
  await melete.click('[data-open-tool="ear"]');
  await page.waitForSelector('.crs', { timeout: 10_000 });
  await expect(page.locator('.crsl')).toHaveCount(40);
  await melete.click('[data-x="lgo"][data-v="i1"]');
  await expect(page.locator('.crslb')).toBeVisible();
  for (let i = 0; i < 16 && !(await page.locator('.crsres').count()); i++) {
    await melete.click('.eopt');
    await page.waitForTimeout(150);
    if (await page.locator('[data-x="enext"]').count()) await melete.click('[data-x="enext"]');
    else await page.waitForTimeout(1300);
  }
  await expect(page.locator('.crsres')).toBeVisible();
  const d = await data(page, 'ear');
  expect(d.course.done.i1.n).toBe(1);
  await melete.click('[data-x="lhome"]');
  await expect(page.locator('.crs')).toBeVisible();
  await melete.click('[data-x="lplace"]');
  await expect(page.locator('.crslb')).toContainText('Проверка уровня');
  await melete.click('[data-x="lhome"]');
  await expect(page.locator('.crs')).toBeVisible();
  // режим «Тренажёр» — неделя вместо цели на день
  await melete.click('[data-seg="xmode"] [data-v="free"]');
  await expect(page.locator('.ewbars')).toBeVisible();
  expect(errors).toEqual([]);
});

test('ритм: урок-диктант до итога', async ({ page, melete, errors }) => {
  await melete.open({ tools: { beat: { view: 'course' } } });
  await melete.tab('tools');
  await melete.click('[data-open-tool="beat"]');
  await page.waitForSelector('.crs', { timeout: 10_000 });
  await melete.click('[data-x="lgo"][data-v="r6"]');
  for (let k = 0; k < 4; k++) {
    await page.waitForSelector('.rypal .rycell[data-v="w"]', { timeout: 8_000 });
    await melete.click('.rycell[data-v="w"]'); await melete.click('.rycell[data-v="w"]');
    await melete.click('[data-x="check"]');
    await page.waitForSelector('[data-x="lnext"]');
    await melete.click('[data-x="lnext"]');
    await page.waitForTimeout(200);
  }
  await expect(page.locator('.crsres')).toBeVisible();
  const d = await data(page, 'beat');
  expect(d.course.done.r6.n).toBe(1);
  expect(errors).toEqual([]);
});
