// Пульт звукаря: единый список выступления на «Эфире» (касание выбирает, смахнуть влево — плавный переход, вправо — вернуть), фон на «Звуках», общая громкость
import { test, expect } from './melete.js';

const swipeEl = (page, sel, dx, idx = 0) => page.evaluate(({ sel, dx, idx }) => {
  const el = document.querySelectorAll(sel)[idx], r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const ev = (type, cx) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, isPrimary: true, pointerType: 'touch', clientX: cx, clientY: y }));
  ev('pointerdown', x); ev('pointermove', x + dx / 2); ev('pointerup', x + dx);
}, { sel, dx, idx });

test('пульт: единый список, плавный переход жестом, возврат проигранного, фон в «Звуках», громкость', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.free('F', ['show']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="show"] ';
  await page.click(T + '[data-x="evnew"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click(T + '[data-x="progsheet"]');
  for (const name of ['Выход', 'Первая', 'Вторая']) {
    await page.click('.sheet [data-x="numnew"]');
    await page.fill('.sheet [data-f="title"]', name);
    await page.fill('.sheet [data-f="note"]', 'заметка ' + name);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  }
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await expect(page.locator(T + '.shpick[data-pick]')).toHaveCount(3);
  // касание — выбрать, звук не включается
  await page.click(T + '.shpick[data-pick] >> nth=1'); await page.waitForTimeout(200);
  await expect(page.locator(T + '.shpick.cur b')).toHaveText('Первая');
  // смахнуть влево — перейти к «Второй»; «Первая» проиграна
  await swipeEl(page, T + '.shpick[data-pick]', -120, 2); await page.waitForTimeout(500);
  await expect(page.locator(T + '.shpick.cur b')).toHaveText('Вторая');
  await expect(page.locator(T + '.shpick.done')).toHaveCount(1);
  // смахнуть вправо по проигранной — вернуть в программу
  await swipeEl(page, T + '.shpick.done', 120); await page.waitForTimeout(400);
  await expect(page.locator(T + '.shpick.done')).toHaveCount(0);
  await page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/desk.png' : 'test-results/desk.png' });
  // общая громкость всегда на виду
  await expect(page.locator(T + '[data-knob="master"]')).toBeVisible();
  // «Звуки»: фон там же
  await page.click(T + '[data-page="pads"]'); await page.waitForTimeout(300);
  await expect(page.locator(T + '[data-x="bedtoggle"]')).toBeVisible();
  await expect(page.locator(T + '[data-knob="master"]')).toBeVisible();
  await page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/pads.png' : 'test-results/pads.png' });
  expect(errors).toEqual([]);
});

test('пульт: тональность и темп номера правятся вручную и видны в списке', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.free('F', ['show']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="show"] ';
  await page.click(T + '[data-x="evnew"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click(T + '[data-x="progsheet"]'); await page.click('.sheet [data-x="numnew"]');
  await page.fill('.sheet [data-f="title"]', 'Песня');
  await page.click('.sheet [data-seg="nkind"] [data-v="track"]');
  await page.click('.sheet [data-nkey="7"]'); // G
  await page.click('.sheet [data-seg="nminor"] [data-v="min"]');
  await page.fill('.sheet [data-f="bpm"]', '96'); await page.press('.sheet [data-f="bpm"]', 'Tab');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await expect(page.locator(T + '.shpick em').first()).toContainText('G');
  await expect(page.locator(T + '.shpick[data-pick]')).toContainText('96');
  expect(errors).toEqual([]);
});
