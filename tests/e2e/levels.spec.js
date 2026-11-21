// «Начать занятие» и 10 уровней (слух и ритм, слово автора 21.11.2026): выбор уровня, кнопка открывает нужное упражнение; всё на одном экране
import { test, expect } from './melete.js';

const noScroll = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e.scrollHeight - e.clientHeight; }, sel);

test('слух: уровень 1–10, «Начать занятие» открывает упражнение уровня, экран без прокрутки', async ({ page, melete, errors }) => {
  await melete.open(); await melete.free('F', ['ear']);
  expect(await noScroll(page, '.ewrap.ehome')).toBeLessThanOrEqual(1);
  await expect(page.locator('.elvt b')).toHaveText('Уровень 1 из 10');
  await page.click('[data-x="elv"][data-d="1"]'); await page.click('[data-x="elv"][data-d="1"]');
  await expect(page.locator('.elvt b')).toHaveText('Уровень 3 из 10');
  await page.click('[data-x="elstart"]');
  await expect(page.locator('.ewrap .ehn')).toHaveCount(1); // экран упражнения «Аккорды»
  const t = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools')).ear);
  expect(t.sec).toBe('ch'); expect(t.chSet).toEqual(['maj', 'min']); expect(t.lv10).toBe(3);
  expect(errors).toEqual([]);
});

test('ритм: уровень и «Начать занятие», экран без прокрутки', async ({ page, melete, errors }) => {
  await melete.open(); await melete.free('F', ['beat']);
  expect(await noScroll(page, '.rywrap.ryhome')).toBeLessThanOrEqual(1);
  await page.click('[data-x="rlv"][data-d="1"]'); await page.click('[data-x="rlv"][data-d="1"]');
  await page.click('[data-x="rlstart"]');
  await expect(page.locator('.rywrap .ryhead')).toHaveCount(1);
  const t = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools')).beat);
  expect(t.drill).toBe('read'); expect(t.lv10).toBe(3); expect(t.meter).toBe('4/4');
  expect(errors).toEqual([]);
});

test('теория: все разделы без прокрутки на телефоне', async ({ page, melete, errors }) => {
  await melete.open(); await melete.free('F', ['theory']);
  expect(await noScroll(page, '.cwrap.f')).toBeLessThanOrEqual(1);
  for (const v of ['scales', 'chords', 'keys', 'intervals']) {
    await page.click('button.tswb[data-v="' + v + '"]'); await page.waitForTimeout(600);
    expect(await noScroll(page, '.swrap'), v).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});
