// Микшер сбоку на узком экране: шире экрана не выходит, лента листается, язычок на месте (отчёт автора 02.11)
import { test, expect } from './melete.js';
test('микшер на телефоне не выходит за экран', async ({ page, melete }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await melete.open();
  await melete.free('F', ['voice']);
  await page.waitForSelector('#mixd', { state: 'attached' }); await page.evaluate(() => document.getElementById('mixd').classList.add('show'));
  await page.locator('#mixd .mxh').dispatchEvent('pointerdown', { clientX: 380, pointerId: 1 }); await page.locator('#mixd .mxh').dispatchEvent('pointerup', { pointerId: 1 });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => { const p = document.querySelector('#mixd .mxp').getBoundingClientRect(), h = document.querySelector('#mixd .mxh').getBoundingClientRect(), q = document.querySelector('#mixd .mxp'); return { pl: p.left, pr: p.right, hl: h.left, sw: q.scrollWidth, cw: q.clientWidth }; });
  expect(r.hl).toBeGreaterThanOrEqual(0);
  expect(r.pr).toBeLessThanOrEqual(393.5);
});
