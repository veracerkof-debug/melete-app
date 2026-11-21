// Вывод на другое устройство (dev): кнопка в шапке сессии, шторка «Вывод», «Оба сразу», по категориям, значок в окне,
// удержание кнопки, страница «Вывод и пульт» в настройках. Слой вывода здесь — временный адаптер (outputstub.js).
import { test, expect } from './melete.js';

const seedPc = (page) => page.evaluate(() => {
  localStorage.setItem('melete.sync', JSON.stringify({ pc: { addr: '192.168.1.5:53329', key: 'k', name: 'Студия', v: 3, fp: 'ab12cd34' } }));
});

test('вывод: шторка, «Оба сразу», по категориям, значок, удержание', async ({ page, melete, errors }) => {
  await page.goto('/');
  await seedPc(page);
  await melete.open();
  await melete.free('HH', ['piano', 'metro']);
  const out = (js) => page.evaluate(js);
  expect(await out('window.__melete.output.get("sound")')).toBe('local');
  await expect(page.locator('.session .outbtn')).toBeVisible();
  expect(await page.locator('.session .outbadge').count()).toBe(0);
  // размер цели касания
  const box = await page.locator('.session .outbtn').boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(40); expect(box.height).toBeGreaterThanOrEqual(40);
  // шторка → «Оба сразу»
  await melete.click('.session .outbtn');
  await expect(page.locator('.sheet [data-all="both"]')).toBeVisible();
  await expect(page.locator('.sheet [data-all="remote"]')).toContainText('Студия');
  await page.click('.sheet [data-all="both"]');
  expect(await out('window.__melete.output.get("sound")')).toBe('both');
  expect(await out('window.__melete.output.get("click")')).toBe('both');
  // значки в окнах (пианино — звук, метроном — клик)
  await expect(page.locator('.session .outbadge')).toHaveCount(2);
  // по категориям: метроном — на телефон; общий итог — «Разное»
  await page.click('.sheet [data-more]');
  await page.click('.sheet [data-seg="ocat:click"] [data-v="local"]');
  expect(await out('window.__melete.output.get("click")')).toBe('local');
  expect(await out('window.__melete.output.get("sound")')).toBe('both');
  await expect(page.locator('.session .outbtn .outl')).toHaveText('Разное');
  await expect(page.locator('.session .outbadge')).toHaveCount(1);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  // удержание: всё не на телефоне → всё на телефон; ещё раз → на устройство
  await melete.hold('.session .outbtn');
  expect(await out('["sound","click","media","control"].map((c) => window.__melete.output.get(c)).join()')).toBe('local,local,local,local');
  await melete.hold('.session .outbtn');
  expect(await out('window.__melete.output.get("sound")')).toBe('remote');
  await expect(page.locator('.session .outbadge')).toHaveCount(2);
});

test('вывод: без сопряжённого устройства кнопки «Вывод» нет, звук — на телефоне', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['piano']);
  await expect(page.locator('.session .outbtn')).toHaveCount(0); // слово автора 21.11.2026: без компьютера кнопка не нужна
  expect(await page.evaluate(() => window.__melete.output.get('sound'))).toBe('local');
});

test('вывод: на странице связи есть вход в шторку «Вывод» (режимы «Пульт» и «Синхронизация» — переключатели устройства, core/linkmode.js)', async ({ page, melete }) => {
  await page.goto('/');
  await seedPc(page);
  await melete.open();
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(500);
  await melete.click('[data-pp="link"]'); await page.waitForTimeout(500);
  await page.waitForSelector('[data-act="outsheet"]', { timeout: 5000 });
  expect(await page.locator('[data-pmd]').count()).toBe(0); // второго набора переключателей режимов нет: он один, в разделе устройства
});
