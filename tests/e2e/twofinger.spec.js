// Два пальца (22.11.2026): вверх/вниз — общая громкость пропорционально ходу пальцев; развести — окно звука инструмента; свести — во весь экран
import { test, expect } from './melete.js';
test.use({ hasTouch: true });

const touches = async (page, frames) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: frames[0] });
  for (const f of frames.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: f }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
};
const two = (x, y, gap) => [{ x: x - gap / 2, y }, { x: x + gap / 2, y }];

test('два пальца: громкость вверх/вниз по ходу пальцев; развести — звук инструмента', async ({ page, melete, errors }) => {
  test.setTimeout(100_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.free('F', ['metro']); await page.waitForTimeout(1200);
  const master = () => page.evaluate(() => window.__melete.audio.mixer.master());
  expect(await master()).toBe(1);
  // вниз на 200 px (≈ треть хода) — тише, но не до нуля
  await touches(page, Array.from({ length: 9 }, (_, k) => two(195, 300 + k * 25, 80)));
  const down = await master();
  expect(down).toBeLessThan(0.85); expect(down).toBeGreaterThan(0.5);
  // вверх на ту же длину — почти вернулась
  await touches(page, Array.from({ length: 9 }, (_, k) => two(195, 500 - k * 25, 80)));
  expect(await master()).toBeGreaterThan(down + 0.15);
  // развести (80 → 220 px между пальцами) — окно звука инструмента
  await touches(page, Array.from({ length: 8 }, (_, k) => two(195, 400, 80 + k * 20)));
  await page.waitForTimeout(500);
  await expect(page.locator('.sheet')).toBeVisible();
  expect(errors).toEqual([]);
});
