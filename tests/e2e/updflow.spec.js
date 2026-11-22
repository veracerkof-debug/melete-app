// Инфографика обновления (шторка «Обновление»): цепочка «Сборка → Готова → Скачивание → Установка», проценты, строка о сборке на GitHub.
import { test, expect } from './melete.js';

const SHOT = process.env.UPD_SHOTS || '';

test('обновление: цепочка по этапам', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  const now = Date.now();
  const states = [
    { name: 'build', s: { st: 'none', info: null, building: { n: 318, started: now - 240000, eta: now + 360000, left: 360000, queued: false } }, head: 'собирается', node: 0 },
    { name: 'ready', s: { st: 'avail', info: { build: 318, size: 330 * 1048576 }, building: null }, head: 'готова', node: 1 },
    { name: 'down', s: { st: 'down', f: 0.42, info: { build: 318, size: 330 * 1048576 }, building: null }, head: 'Скачивание', node: 1, pct: '42' },
    { name: 'done', s: { st: 'ready', f: 1, info: { build: 318, size: 330 * 1048576 }, building: null }, head: 'скачана', node: 2 },
  ];
  for (const x of states) {
    await page.evaluate(async (s) => {
      const { updateSheet } = await import('/src/core/screens/update.js');
      const subs = [];
      const U = { state: s, build: 317, channel: 'dev', platform: 'android', mode: 'auto', subscribe: (f) => { subs.push(f); return () => {}; }, fresh() {}, check() {}, download() {}, install: async () => {} };
      window.__sh = updateSheet({ updater: U, store: { state: { settings: {} }, settingsChanged() {} } });
    }, x.s);
    await page.waitForSelector('.updflow');
    await expect(page.locator('.updflow .updfl-t b')).toContainText(x.head);
    await expect(page.locator('.updfl-n.cur')).toHaveCount(1);
    expect(await page.locator('.updfl-n.done').count()).toBe(x.node);
    if (x.pct) await expect(page.locator('.updfl-p')).toContainText(x.pct);
    if (SHOT) await page.screenshot({ path: SHOT + '/upd-' + x.name + '.png' });
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  }
  void errors;
});
