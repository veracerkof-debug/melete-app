// Глайдер (автор 06.11.2026): в альбомном положении полутон под пальцем той же ширины, что в портрете — нот на доске
// больше, диапазон начинается там же; в настройках остаётся свой
import { test, expect } from './melete.js';

test('глайдер: полутон одной ширины в портрете и в альбомном положении', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.tab('tools');
  await melete.click('[data-open-tool="glider"]'); await page.waitForTimeout(900);
  const semi = () => page.evaluate(() => { const p = document.querySelector('#glpad'), n = p.querySelectorAll('.glk').length; return { n, w: p.clientWidth / n }; });
  const a = await semi();
  expect(a.n).toBe(13); // C4–C5
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(900);
  const b = await semi();
  expect(b.n).toBeGreaterThan(20);
  expect(Math.abs(b.w - a.w) / a.w).toBeLessThan(0.25);
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools') || '{}').glider?.width ?? 12))).toBe(12);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(900);
  expect((await semi()).n).toBe(13);
  expect(errors).toEqual([]);
});
