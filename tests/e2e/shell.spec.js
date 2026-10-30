// Оболочка: вкладки, панель и все её страницы, отчёт о проблеме — открываются без ошибок
import { test, expect } from './melete.js';

test('вкладки и панель', async ({ page, melete, errors }) => {
  await melete.open({ settings: { church: true, feat: { studio: true } } });
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.tabbar .tab')].map((x) => x.dataset.tab));
  expect(tabs.length).toBeGreaterThan(3);
  for (const id of tabs) { await melete.tab(id); expect(await melete.count('.tabbar [data-tab="' + id + '"]'), id).toBe(1); }
  await melete.tab('home');
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(500);
  expect(await melete.count('#panelLayer')).toBe(1);
  const pages = await page.evaluate(() => [...document.querySelectorAll('[data-pp]')].map((x) => x.dataset.pp).filter((x) => x !== 'root'));
  expect(pages.length).toBeGreaterThan(5);
  for (const pg of pages) {
    await melete.click('[data-pp="' + pg + '"]'); await page.waitForTimeout(450);
    expect(await melete.count('#panelLayer > .wrap'), pg).toBe(1);
    await melete.click('[data-pp="root"]'); await page.waitForTimeout(250);
  }
  // отчёт о проблеме: текст собирается
  await melete.click('[data-act="report"]'); await page.waitForTimeout(400);
  await melete.click('[data-rpt="show"]'); await page.waitForTimeout(800);
  expect(await melete.text('.rptpre')).toContain('Melete');
  expect(errors).toEqual([]);
});

test('первый запуск: стартовый экран, не главная', async ({ page, melete, errors }) => {
  await melete.open({ fresh: true });
  await page.waitForTimeout(800);
  expect(await melete.count('.tabbar .tab')).toBe(0);
  expect((await page.evaluate(() => document.body.innerText)).length).toBeGreaterThan(20);
  expect(errors).toEqual([]);
});

test('вкладки: инструмент вниз и обратно; студии вкладкой нет (часть лупера с 30.10.2026)', async ({ page, melete, errors }) => {
  await melete.open({ settings: { feat: { studio: true }, tabs: ['home', 'library', 'calendar', 'tools', 'studio'] } });
  const bar = () => page.evaluate(() => [...document.querySelectorAll('.tabbar .tab')].map((x) => x.dataset.tab));
  expect(await bar()).not.toContain('studio'); // и у тех, у кого она была внизу
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(500);
  await melete.click('[data-pp="tabs"]'); await page.waitForTimeout(450);
  await melete.click('[data-tabmk="metro"]'); await page.waitForTimeout(300);
  expect(await bar()).toContain('metro');
  expect(await melete.count('[data-tabun="metro"]')).toBe(1);
  await melete.click('[data-tabun="metro"]'); await page.waitForTimeout(300);
  expect(await bar()).not.toContain('metro');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#panelLayer [data-close], #panelLayer .close')?.click());
  await page.waitForTimeout(300);
  await melete.tab('tools'); await page.waitForTimeout(400);
  expect(await melete.count('[data-open-tool="studio"]')).toBe(0);
  expect(errors).toEqual([]);
});
