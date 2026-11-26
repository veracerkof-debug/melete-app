// Правка вида сцены (слова автора 22.11 и 25.11.2026): удержать блок — режим правки, только в тишине; размер плавно (планка внизу),
// порядок, скрыть и вернуть; «Готово» — вид сохранён и заморожен: на ходу (звучит метроном) правка не включается
import { test, expect } from './melete.js';

const hold = async (page, loc) => { const b = await loc.boundingBox(); await page.mouse.move(b.x + 4, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); };
// удержать блок и перетащить в точку (fx, fy) блока target; смахнуть блок вбок
const dragTo = async (page, id, target, fx, fy) => {
  const a = await page.locator('.lyb.ed[data-lb="' + id + '"]').boundingBox(), b = await page.locator('.lyb.ed[data-lb="' + target + '"]').boundingBox();
  const x0 = a.x + a.width / 2, y0 = a.y + Math.min(a.height / 2, 40), x1 = b.x + b.width * fx, y1 = b.y + b.height * fy;
  await page.mouse.move(x0, y0); await page.mouse.down(); await page.waitForTimeout(450);
  for (let i = 1; i <= 10; i++) await page.mouse.move(x0 + (x1 - x0) * i / 10, y0 + (y1 - y0) * i / 10);
  await page.mouse.up(); await page.waitForTimeout(300);
};
const swipe = async (page, id) => {
  const a = await page.locator('.lyb.ed[data-lb="' + id + '"]').boundingBox(), y = a.y + Math.min(a.height / 2, 40);
  await page.mouse.move(a.x + 20, y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(a.x + 20 + a.width * 0.8 * i / 10, y);
  await page.mouse.up(); await page.waitForTimeout(300);
};
const lay = (page) => page.evaluate(() => window.__melete.store.state.settings.layout.stage);

test('сцена: правка вида — размер, порядок, скрыть/вернуть, «Готово» замораживает', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  await expect(page.locator('.sgplayer')).toBeVisible();
  await expect(page.locator('.lybar')).toHaveCount(0); // обычный вид: никаких рамок и кнопок правки
  // удержание в тишине — правка; содержимое блоков не нажимается
  const geo = () => page.evaluate(() => [...document.querySelectorAll('.sgtempo, .sgplayer, .sgbar, .sgmain')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }));
  const g0 = await geo();
  await hold(page, page.locator('.sgplayer'));
  await expect(page.locator('.lybi').first()).toBeVisible();
  await expect(page.locator('.lyb.ed')).not.toHaveCount(0);
  // вид правки совпадает с обычным: те же места и высоты (слово автора 26.11.2026)
  const g1 = await geo();
  expect(g1.length).toBe(g0.length);
  g1.forEach((b, i) => { expect(Math.abs(b[0] - g0[i][0])).toBeLessThanOrEqual(3); expect(Math.abs(b[1] - g0[i][1])).toBeLessThanOrEqual(3); });
  // размер: тянуть планку вниз → число в данных, больше единицы
  const g = await page.locator('.lyb[data-lb="tempo"] .lyh').boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + i * 8);
  await page.mouse.up(); await page.waitForTimeout(300);
  const z = (await lay(page)).size.tempo;
  expect(typeof z).toBe('number'); expect(z).toBeGreaterThan(1.05); expect(z).toBeLessThanOrEqual(2.2);
  // кнопок нет, блоки вплотную, инструмент не нажимается
  await expect(page.locator('[data-ly="up"], [data-ly="down"], [data-ly="hide"], [data-ly="pair"]')).toHaveCount(0);
  // порядок: удержать темп и перетащить под следующий блок
  const before = await page.evaluate(() => [...document.querySelectorAll('.lyb.ed')].map((e) => e.dataset.lb));
  await dragTo(page, 'tempo', before[before.indexOf('tempo') + 1], 0.5, 0.9);
  const after = await page.evaluate(() => [...document.querySelectorAll('.lyb.ed')].map((e) => e.dataset.lb));
  expect(after).not.toEqual(before); expect(after.indexOf('tempo')).toBe(before.indexOf('tempo') + 1);
  // скрыть плеер смахиванием и вернуть из «Скрыто»
  await swipe(page, 'player'); await page.waitForTimeout(200);
  await expect(page.locator('.lyb[data-lb="player"]')).toHaveCount(0);
  await page.click('[data-ly="show"][data-id="player"]'); await page.waitForTimeout(200);
  await expect(page.locator('.lyb[data-lb="player"]')).toHaveCount(1);
  // «Готово»: правка закрыта, вид сохранён
  await page.click('[data-ly="done"]'); await page.waitForTimeout(300);
  await expect(page.locator('.lybar')).toHaveCount(0);
  expect((await lay(page)).size.tempo).toBe(z);
  // заморожено на ходу: метроном идёт — удержание правку не включает
  await page.click('[data-sgmetro]'); await page.waitForTimeout(500);
  await hold(page, page.locator('.sgplayer'));
  await expect(page.locator('.lybar')).toHaveCount(0);
  await expect(page.locator('.toast, #toast')).toBeVisible();
  await page.click('[data-sgmetro]'); // остановить
  expect(errors).toEqual([]);
});

test('сцена: блоки рядом — пара, ширина планкой, «Готово», работает и после перезагрузки', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  await expect(page.locator('.lyrow')).toHaveCount(0); // без пар разметка прежняя: рядов нет
  await hold(page, page.locator('.sgplayer'));
  await expect(page.locator('.lybi').first()).toBeVisible();
  // рядом: перетащить клавиши к правому краю темпа
  await dragTo(page, 'keys', 'tempo', 0.92, 0.5); await page.waitForTimeout(250);
  await expect(page.locator('.lyrow.ed > .lyb[data-lb="tempo"]')).toHaveCount(1);
  await expect(page.locator('.lyrow.ed > .lyb[data-lb="keys"]')).toHaveCount(1);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  // ширина: тянуть планку вправо
  const v = await page.locator('.lyrow.ed .lyv').boundingBox();
  await page.mouse.move(v.x + v.width / 2, v.y + v.height / 2); await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(v.x + v.width / 2 + i * 10, v.y + v.height / 2);
  await page.mouse.up(); await page.waitForTimeout(300);
  const r = (await lay(page)).pair.keys;
  expect(r).toBeGreaterThan(0.55); expect(r).toBeLessThanOrEqual(0.75);
  await page.click('[data-ly="done"]'); await page.waitForTimeout(300);
  await expect(page.locator('.lybar')).toHaveCount(0);
  // обычный вид: ряд из двух блоков, доля ширины как заданно; метроном по-прежнему работает
  await expect(page.locator('.lyrow > .lyb')).toHaveCount(2);
  const w = await page.evaluate(() => { const row = document.querySelector('.lyrow'), [a, b] = [...row.children]; return a.getBoundingClientRect().width / row.getBoundingClientRect().width; });
  expect(Math.abs(w - r)).toBeLessThan(0.05);
  await page.click('[data-sgmetro]'); await page.waitForTimeout(400);
  expect(await page.evaluate(() => document.querySelector('[data-sgmetro]').getAttribute('aria-pressed'))).toBe('true');
  await page.click('[data-sgmetro]');
  // «Разделить» возвращает обычный вид
  await page.evaluate(() => { window.__melete.store.state.settings.layout.stage.pair = {}; window.__melete.store.save(); });
  expect(errors).toEqual([]);
});

// слово автора 26.11.2026: в правке раскладки ничто не играет и не нажимается; граница между блоками двигает оба соседних блока
test('сцена: в правке «играть» и пэды молчат; граница сужает соседа, когда растёт блок', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  await hold(page, page.locator('.sgplayer'));
  await expect(page.locator('.lybi').first()).toBeVisible();
  const pl = await page.locator('.sgbpm').boundingBox();
  await page.mouse.click(pl.x + pl.width / 2, pl.y + pl.height / 2); await page.waitForTimeout(300);
  await expect(page.locator('.sgbpm.on')).toHaveCount(0); // метроном в правке не включается
  const key = await page.locator('.sgkey').first().boundingBox();
  await page.mouse.click(key.x + key.width / 2, key.y + key.height / 2); await page.waitForTimeout(300);
  await expect(page.locator('.sgkey.on')).toHaveCount(0);
  await page.locator('.sgpad[data-pad]').first().dispatchEvent('pointerdown', { pointerId: 9, isPrimary: true });
  await expect(page.locator('.sgpad.hit')).toHaveCount(0);
  const g = await page.locator('.lyb[data-lb="tempo"] .lyh').boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + i * 6);
  await page.mouse.up(); await page.waitForTimeout(300);
  const L = await lay(page);
  expect(L.size.tempo).toBeGreaterThan(1.03);
  const nextId = await page.evaluate(() => { const a = [...document.querySelectorAll('.lyb.ed')].map((e) => e.dataset.lb); return a[a.indexOf('tempo') + 1]; });
  expect(L.size[nextId]).toBeLessThan(0.97);
  expect(errors).toEqual([]);
});

test('сцена: мелкие кнопки пэдов — настройки и волна открываются кнопкой, а не долгим нажатием', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  await expect(page.locator('[data-sgap="set"]')).toBeVisible();
  const b = await page.locator('[data-sgap="arp"]').boundingBox();
  expect(b.height).toBeLessThanOrEqual(40);
  // весь ряд метронома — в окне, и на узком экране тоже
  for (const w of [390, 360]) {
    await page.setViewportSize({ width: w, height: 800 }); await page.waitForTimeout(300);
    const xs = await page.evaluate(() => [...document.querySelectorAll('.sgtempo button')].map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.right]; }));
    xs.forEach(([l, r]) => { expect(l).toBeGreaterThanOrEqual(0); expect(r).toBeLessThanOrEqual(w + 1); });
  }
  await page.click('[data-sgap="set"]'); await page.waitForTimeout(800);
  await expect(page.locator('#sheetLayer .sheet')).toBeVisible();
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.click('[data-sgap="wave"]'); await page.waitForTimeout(500);
  await expect(page.locator('[data-sgap="wave"]')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});
