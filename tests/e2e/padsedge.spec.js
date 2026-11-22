// Пэды (слово автора 22.11.2026): плитки до верхнего края окна без полосы-«чёлки», острые углы, диезы не ярче прежнего.
import { test, expect } from './melete.js';

test('пэды: без чёлки сверху, острые углы плиток', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.free('F', ['drone']);
  await page.waitForSelector('.dtile', { timeout: 10_000 });
  const gap = await page.evaluate(() => { const p = document.querySelector('.pane.toolhost'), g = document.querySelector('.dgrid, .dkeys'); return g.getBoundingClientRect().top - p.getBoundingClientRect().top; });
  expect(gap).toBeLessThan(12);
  const r = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.dtile')).borderTopLeftRadius));
  expect(r).toBeLessThanOrEqual(6);
  void errors;
});
