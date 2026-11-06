// Уведомления наглядно (автор 06.11.2026): неделя по часам — день практики касанием, метку занятия можно вести
// пальцем (своё время дня); сегодня — лента. Настройки — по новой карте: «Звук», «Маскот», «Связь».
import { test, expect } from './melete.js';

test('уведомления: неделя — дни, своё время дня ведением метки; сегодня — лента', async ({ page, melete, errors }) => {
  await melete.open({ settings: { remind: { mode: 'classic', time: '19:00', leads: [60, 5] }, days: [true, true, true, true, true, false, false] } });
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(600);
  await melete.click('#panelLayer [data-pp="notif"]'); await page.waitForTimeout(600);
  await expect(page.locator('.rvweek .rvmark')).toHaveCount(5);
  // суббота — день практики касанием
  await page.click('.rvday[data-rvday="5"]'); await page.waitForTimeout(400);
  await expect(page.locator('.rvweek .rvmark')).toHaveCount(6);
  // вести метку среды вниз — своё время
  const m = page.locator('.rvmark[data-rvmark="2"]'), b = await m.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + i * 6); await page.waitForTimeout(20); }
  await page.mouse.up(); await page.waitForTimeout(500);
  const r = (await melete.settings()).remind;
  expect(Object.keys(r.dayTimes || {})).toEqual(['2']);
  expect(r.dayTimes['2'] > '19:00').toBe(true);
  await expect(page.locator('.rvmark.own')).toHaveCount(1);
  // сегодня — лента
  await page.click('[data-rvview="today"]'); await page.waitForTimeout(300);
  await expect(page.locator('.rvlist .rvrow, .rvseg ~ .ftr')).not.toHaveCount(0);
  expect(errors).toEqual([]);
});

test('настройки по карте: звук, маскот, связь — чат и идея', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(600);
  await melete.click('#panelLayer [data-pp="sound"]'); await page.waitForTimeout(500);
  await expect(page.locator('[data-seg="sndmode"]')).toHaveCount(1);
  await melete.click('#panelLayer [data-pp="root"]'); await page.waitForTimeout(300);
  await melete.click('#panelLayer [data-act="idea"]'); await page.waitForTimeout(500);
  await expect(page.locator('.sheet a[href*="t.me"]')).toHaveCount(1);
  await expect(page.locator('.sheet .ideatext')).toHaveCount(1);
  expect(errors).toEqual([]);
});
