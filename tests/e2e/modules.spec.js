// Все инструменты во всех размерах окна свободной сессии: монтируются, не пустые, без ошибок
import { test, expect } from './melete.js';

const PLAN = [['F', 1], ['HH', 2], ['QQ', 4], ['SS', 4]];

for (const [layout, per] of PLAN) {
  test('окна ' + layout, async ({ page, melete, errors }) => {
    test.setTimeout(240_000);
    await melete.open({ settings: { church: true, feat: { studio: true } } });
    const ids = await melete.modules();
    expect(ids.length).toBeGreaterThan(8);
    for (let i = 0; i < ids.length; i += per) {
      const panes = ids.slice(i, i + per);
      await melete.free(layout, panes);
      // модули догружаются по требованию (src/modules/index.js): заставка уходит, ошибки загрузки нет
      await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
      const got = await page.evaluate(() => [...document.querySelectorAll('.session .pane')].length);
      expect(got, layout + ':' + panes.join('+')).toBeGreaterThanOrEqual(panes.length); // в раскладке могут быть и пустые места
      const filled = await page.evaluate(() => [...document.querySelectorAll('.session .pane')].filter((x) => x.innerText.trim().length > 0 || x.querySelector('canvas, svg')).length);
      expect(filled, 'окна с содержимым ' + panes.join('+')).toBeGreaterThanOrEqual(panes.length);
      expect(errors, layout + ':' + panes.join('+')).toEqual([]);
    }
  });
}

// Загрузка по требованию (src/modules/index.js): окно показывает значок модуля, пока он грузится, потом — сам инструмент,
// без ошибки загрузки. На сервере разработки модули догружаются сразу после запуска — в сборках по требованию
test('модуль догружается и открывается', async ({ page, melete, errors }) => {
  await melete.open();
  expect(await page.evaluate(async () => (await import('/src/modules/index.js')).modules.every((m) => typeof m.load === 'function'))).toBe(true);
  await melete.free('F', ['drone']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  expect(await page.evaluate(() => document.querySelector('.session .pane[data-tool="drone"] .pbody')?.children.length || 0)).toBeGreaterThan(0);
  expect(await page.locator('.session .pane .modload.err').count()).toBe(0);
  void errors;
});
