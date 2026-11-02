// Сцена под нагрузкой: метроном, пэды, пианино и лупер в одной сессии (четверти окна) — без ошибок, кадры ровные,
// клавиатура пианино помещается в узкое окно целиком (раньше часть клавиш уезжала за край).
import { test, expect } from './melete.js';

test('четыре инструмента сразу: без ошибок, клавиши в окне', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.free('QQ', ['metro', 'drone', 'piano', 'looper']);
  await melete.click('[data-s="metro"]');
  await page.waitForTimeout(600);
  const f = await melete.frames(90);
  expect(f.p95).toBeLessThan(40);
  const fit = await page.evaluate(() => { const kb = document.querySelector('.session .kb'), pane = kb.closest('.pane').getBoundingClientRect(), r = kb.getBoundingClientRect(); return { inside: r.left >= pane.left - 1 && r.right <= pane.right + 1, n: +kb.style.getPropertyValue('--n') }; });
  expect(fit.inside).toBe(true);
  expect(fit.n).toBeGreaterThanOrEqual(5);
  // уход в фон и обратно — звук и окна живы
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(800);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(500);
  await expect(page.locator('.session .pane')).toHaveCount(4);
  expect(errors).toEqual([]);
});
