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
  await expect(page.locator('.arrghost')).toHaveCount(0); // призрак (в обёртках классов) убран целиком
  // главную не унести
  await expect(page.locator('.tab[data-tab="home"] .arrb')).toHaveCount(0);
  // в «Инструментах» — карточка календаря; ведение на полосу перед «Песнями» — снова вкладка
  await page.click('.tab[data-tab="tools"]'); await page.waitForTimeout(800);
  c = await page.locator('.tgrid [data-open-tool="calendar"]').boundingBox();
  const lib = await page.locator('.tab[data-tab="library"]').boundingBox();
  await page.mouse.move(c.x + 30, c.y + 30); await page.mouse.down(); await page.mouse.move(c.x + 50, c.y + 50, { steps: 4 });
  await page.mouse.move(lib.x + 5, lib.y + lib.height / 2, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(500);
  expect(await tabs(page)).toBe('home,calendar,library,tools');
  // «+» у метронома — вкладкой; «−» — обратно
  await page.locator('.tgrid [data-open-tool="metro"] .arrb.in').click({ force: true }); await page.waitForTimeout(400);
  expect(await tabs(page)).toContain('metro');
  await page.locator('.tab[data-tab="metro"] .arrb').click({ force: true }); await page.waitForTimeout(400);
  expect(await tabs(page)).not.toContain('metro');
  // «−» на карточке — выключить инструмент, как в «Модулях и функциях» (06.11.2026); «Вернуть» в сообщении
  await page.locator('.tgrid [data-open-tool="tuner"] .arrb.off').click({ force: true }); await page.waitForTimeout(400);
  await expect(page.locator('.tgrid [data-open-tool="tuner"]')).toHaveCount(0);
  await page.locator('.toast button').click(); await page.waitForTimeout(400);
  await expect(page.locator('.tgrid [data-open-tool="tuner"]')).toHaveCount(1);
  await page.click('[data-arr="done"]'); await page.waitForTimeout(300);
  await expect(page.locator('html')).not.toHaveClass(/arrange/);
  // без правки карточка страницы открывает её
  await page.locator('.tab[data-tab="calendar"]').click(); await page.waitForTimeout(300);
  await expect(page.locator('.tab[data-tab="calendar"]')).toHaveAttribute('aria-current', 'page');
});

test('«Минимал»: три вкладки (с 06.11.2026 и «Инструменты»), значки и на главной', async ({ page, melete, errors }) => {
  await melete.open({ mono: true });
  expect(await tabs(page)).toBe('home,library,tools');
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
  await expect(page.locator('.tgrid [data-open-tool="train"] .tcs2')).toBeEmpty(); // описаний нет
  // все карточки — на одном экране телефона
  const last = await page.locator('.tgrid [data-open-tool]').last().boundingBox();
  expect(last.y + last.height).toBeLessThan(page.viewportSize().height);
});


test('занятие: любой инструмент во весь экран — двойное касание по полоске окна', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('HH', ['drone', 'metro']);
  const grip = page.locator('.ws .grip').first();
  await grip.click(); await page.waitForTimeout(80); await grip.click(); await page.waitForTimeout(700);
  await expect(page.locator('.ws .pane.pfull')).toHaveCount(1);
  await expect(page.locator('#sheetLayer .scrim')).toHaveCount(0); // меню окна не открылось
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await expect(page.locator('.ws .pane.pfull')).toHaveCount(0);
  // одно касание — меню окна, в нём «Полный экран» и у метронома
  await page.locator('.ws .grip').nth(1).click(); await page.waitForTimeout(700);
  await expect(page.locator('.sheet [data-pm="pure"]')).toHaveCount(1);
});

test('занятие: кнопка полного экрана видна в каждом окне — войти и свернуть', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('HH', ['drone', 'metro']); // окна внутри колонок — тоже на весь экран
  const btn = page.locator('.ws .pane .pfbtn').first();
  await expect(btn).toBeVisible();
  await btn.click(); await page.waitForTimeout(600);
  await expect(page.locator('.ws .pane.pfull')).toHaveCount(1);
  const vp = page.viewportSize(), box = await page.locator('.ws .pane.pfull').boundingBox();
  expect(box.width).toBe(vp.width); expect(box.height).toBe(vp.height);
  const b = await page.locator('.ws .pane.pfull > .pfbtn').boundingBox();
  expect(b.width).toBeGreaterThanOrEqual(40); // в полном экране — крупная «Свернуть»
  await page.locator('.ws .pane.pfull > .pfbtn').click(); await page.waitForTimeout(600);
  await expect(page.locator('.ws .pane.pfull')).toHaveCount(0);
  await expect(btn).toBeVisible();
});

// Блоки главной разной высоты (слово автора 06.11.2026, «переносятся некорректно»): поднятый блок остаётся под пальцем,
// не меняется с соседом туда-сюда, отпущенный — встаёт на новое место
test('блоки главной: перенос — блок под пальцем, порядок меняется', async ({ page, melete, errors }) => {
  await melete.open();
  const ids = () => page.evaluate(() => [...document.querySelectorAll('[data-hb]')].map((x) => x.dataset.hb));
  const before = await ids();
  expect(before.length).toBeGreaterThan(2);
  const last = before[before.length - 1];
  const el = page.locator('[data-hb="' + last + '"]');
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  const fx = b.x + 20, fy = b.y + 12;
  await page.mouse.move(fx, fy); await page.mouse.down(); await page.waitForTimeout(650);
  // ведём вверх медленно; на каждом шаге точка блока под пальцем — та же (±12 px)
  let y = fy;
  const dev = [];
  for (let i = 0; i < 30; i++) {
    y -= 12;
    if (y < 120) break;
    await page.mouse.move(fx, y, { steps: 2 });
    const r = await el.boundingBox();
    // точка блока под пальцем: из-за «приподнятого» масштаба 1,04 (от середины) — поправка
    const px = r.x + r.width / 2 + (20 - b.width / 2) * 1.04, py = r.y + r.height / 2 + (12 - b.height / 2) * 1.04;
    dev.push(Math.round(Math.hypot(px - fx, py - y)));
  }
  expect(Math.max(...dev), dev.join(',')).toBeLessThan(10);
  {
  }
  await page.mouse.up(); await page.waitForTimeout(500);
  const after = await ids();
  expect(after.indexOf(last)).toBeLessThan(before.indexOf(last));
});
