// Пианино: палец ведут по клавише — вверх ярче и громче, вниз мягче (synth.expr, слово автора 21.11.2026); без исключений и без зависших нот
import { test, expect } from './melete.js';

test('пианино: движение пальца по клавише вызывает выразительность, нота потом отпускается', async ({ page, melete, errors }) => {
  await melete.open(); await melete.free('F', ['piano']);
  await page.evaluate(() => { const s = window.__melete.audio.synth, o = s.expr; window.__exprCalls = []; s.expr = (k, x) => { window.__exprCalls.push(+x.toFixed(2)); return o.call(s, k, x); }; });
  const c = await melete.centre('.kb .w[data-m="60"], .kb [data-m="60"]');
  await page.mouse.move(c[0], c[1] + 40); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(c[0], c[1] + 40 - i * 25); await page.waitForTimeout(30); }
  for (let i = 1; i <= 11; i++) { await page.mouse.move(c[0], c[1] - 160 + i * 25); await page.waitForTimeout(30); }
  await page.mouse.up(); await page.waitForTimeout(300);
  const calls = await page.evaluate(() => window.__exprCalls);
  expect(calls.length).toBeGreaterThan(2);
  expect(Math.max(...calls)).toBeGreaterThan(0.7); // вверх — больше
  expect(Math.min(...calls)).toBeLessThan(0.5);    // вниз — меньше
  expect(calls.every((x) => x >= 0 && x <= 1)).toBe(true);
  expect(await page.evaluate(() => document.querySelectorAll('.kb .down').length)).toBe(0); // клавиша отпущена, нота не зависла
  expect(errors).toEqual([]);
});
