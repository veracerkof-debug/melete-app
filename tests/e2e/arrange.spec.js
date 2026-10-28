// Полная настройка вкладок жестом (решение автора 28.10.2026): удержание — режим правки, вкладка вверх — в «Инструменты»,
// карточка на полосу — вкладкой, «+» и «−» для тех, кто жест не знает; главная остаётся. «Минимал» — две страницы и
// все значки на главной
import { test, expect } from './melete.js';

const tabs = (page) => page.evaluate(() => [...document.querySelectorAll('.tabbar .tab')].map((x) => x.dataset.tab).join(','));

test('правка вкладок: календарь в инструменты и обратно, инструмент вкладкой', async ({ page, melete, errors }) => {
  await melete.open();
  expect(await tabs(page)).toContain('calendar');
  // удержание календаря — режим правки, ведение вверх — в «Инструменты»
  let c = await page.locator('.tab[data-tab="calendar"]').boundingBox();
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await page.mouse.down(); await page.waitForTimeout(700);
  await expect(page.locator('html')).toHaveClass(/arrange/);
  await page.mouse.move(c.x + c.width / 2, c.y - 150, { steps: 8 }); await page.mouse.move(c.x + c.width / 2, c.y - 300, { steps: 8 });
  await page.mouse.up(); await page.waitForTimeout(500);
  expect(await tabs(page)).not.toContain('calendar');
  // главную не унести
  await expect(page.locator('.tab[data-tab="home"] .arrb')).toHaveCount(0);
  // в «Инструментах» — карточка календаря; ведение на полосу перед «Песнями» — снова вкладка
  await page.click('.tab[data-tab="tools"]'); await page.waitForTimeout(800);
  c = await page.locator('.tgrid [data-open-tool="calendar"]').boundingBox();
  const lib = await page.locator('.tab[data-tab="library"]').boundingBox();
  await page.mouse.move(c.x + 30, c.y + 30); await page.mouse.down(); await page.mouse.move(c.x + 50, c.y + 50, { steps: 4 });
  await page.mouse.move(lib.x + 5, lib.y + lib.height / 2, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(500);
  expect(await tabs(page)).toBe('home,calendar,library,tools,studio');
  // «+» у метронома — вкладкой; «−» — обратно
  await page.locator('.tgrid [data-open-tool="metro"] .arrb').click({ force: true }); await page.waitForTimeout(400);
  expect(await tabs(page)).toContain('metro');
  await page.locator('.tab[data-tab="metro"] .arrb').click({ force: true }); await page.waitForTimeout(400);
  expect(await tabs(page)).not.toContain('metro');
  await page.click('[data-arr="done"]'); await page.waitForTimeout(300);
  await expect(page.locator('html')).not.toHaveClass(/arrange/);
  // без правки карточка страницы открывает её
  await page.locator('.tab[data-tab="calendar"]').click(); await page.waitForTimeout(300);
  await expect(page.locator('.tab[data-tab="calendar"]')).toHaveAttribute('aria-current', 'page');
});

test('«Минимал»: две вкладки, всё остальное — значками на главной', async ({ page, melete, errors }) => {
  await melete.open({ mono: true });
  expect(await tabs(page)).toBe('home,library');
  const grid = page.locator('.mono-home .mall');
  await expect(grid.locator('[data-open-tool="calendar"]')).toHaveCount(1);
  await expect(grid.locator('[data-open-tool="metro"]')).toHaveCount(1);
  await expect(grid.locator('.mlbl')).toHaveCount(0); // без подписей
  await grid.locator('[data-open-tool="calendar"]').click(); await page.waitForTimeout(500);
  await expect(page.locator('#main')).toContainText(/\d/); // открылась страница календаря
  expect(await page.evaluate(() => !document.querySelector('.mono-home'))).toBe(true);
});

test('«Инструменты»: компактно, на карточке — последнее состояние после перезапуска', async ({ page, melete, errors }) => {
  await melete.open({ settings: { metro: { bpm: 233, num: 4, den: 4, sub: 1 } } });
  await page.click('.tab[data-tab="tools"]'); await page.waitForTimeout(1500);
  await expect(page.locator('.tgrid [data-open-tool="metro"] .tcs2')).toContainText('233');
  await expect(page.locator('.tgrid [data-open-tool="ear"] .tcs2')).toBeEmpty(); // описаний нет
  // все карточки — на одном экране телефона
  const last = await page.locator('.tgrid [data-open-tool]').last().boundingBox();
  expect(last.y + last.height).toBeLessThan(page.viewportSize().height);
});

