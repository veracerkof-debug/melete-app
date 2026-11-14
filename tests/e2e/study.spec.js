// Учёба на главной (автор 06.11.2026, пункт 22): строка на инструмент — часы за неделю из цели; касание — открыть на
// своём месте; ⋯ — часы в неделю. С 11.11.2026 «Слух» и «Ритм» — снова отдельные инструменты; время окон внутри занятия
// тоже считается.
import { test, expect } from './melete.js';

test('учёба: строки, открыть главу, часы в неделю', async ({ page, melete, errors }) => {
  await melete.open({ settings: { study: { goals: { ear: 60 } } } });
  await expect(page.locator('.hstudy .hsrow[data-k="ear"]')).toHaveCount(1);
  await expect(page.locator('.hstudy .hsrow')).toHaveCount(1);
  await melete.click('.hstudy .hsrow[data-k="ear"]'); await page.waitForTimeout(1000);
  await expect(page.locator('.tview [data-tool="ear"], .tview .tvhost')).not.toHaveCount(0);
  await page.waitForTimeout(11_000); // время в инструменте пишется от 10 секунд
  await melete.click('.tview [data-tv="close"]'); await page.waitForTimeout(800);
  const tools = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).sessions.filter((s) => s.type === 'tool').map((s) => s.tool));
  expect(tools).toContain('ear');
  // ⋯ — добавить «Ритм» на 30 минут
  await melete.click('.hstudy [data-act="studyset"]'); await page.waitForTimeout(400);
  await page.click('.sheet [data-sgid="beat"]'); await page.waitForTimeout(400);
  await page.click('.sheet [data-sg="30"]'); await page.waitForTimeout(600);
  await expect(page.locator('.hstudy .hsrow')).toHaveCount(2);
  expect(errors).toEqual([]);
});

// 14.11.2026 («виджет» слуха, ритма, вокала, учебника): любое сочетание, цифры недели, расписание и «без цели»
test('«Мои занятия»: вокал, расписание на сегодня, строка без цели, любое сочетание', async ({ page, melete, errors }) => {
  const slot = { id: 'p1', days: [0, 1, 2, 3, 4, 5, 6], from: '23:00', to: '23:30', title: '', tool: 'vocal' }; // каждый день вечером
  await melete.open({ settings: { study: { goals: { vocal: 60 }, show: { ear: 1 } }, plan: { slots: [slot], off: [], once: {} } } });
  await expect(page.locator('.hstudy .hsrow')).toHaveCount(2); // выбрали два из четырёх — два и видно
  const v = page.locator('.hstudy .hsrow[data-k="vocal"]');
  await expect(v).toContainText('Вокал');
  await expect(v.locator('.hsbar')).toHaveCount(1); // есть цель — полоска
  await expect(v.locator('.hsdays i.on')).toHaveCount(7); // каждый день
  await expect(v.locator('.hsub')).toContainText(/Сегодня в 23:00|в 23:00/); // расписание: во сколько
  const e = page.locator('.hstudy .hsrow[data-k="ear"]');
  await expect(e.locator('.hsbar')).toHaveCount(0); // «без цели» — полоски нет, только цифры недели
  await expect(e.locator('.hsv')).toContainText('за неделю');
  void errors;
});
