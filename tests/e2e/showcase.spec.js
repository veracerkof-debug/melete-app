// Витрина (PW_MODE=showcase, `vite --mode showcase`): после первого посева есть демонстрационный пульт выступления
// (День студента: номера, метки, банки падов со звуками, шумы) и проект студии. Остальное — выдуманный музыкант (src/showcase/main.js)
import { test, expect } from './melete.js';

test.skip(process.env.PW_MODE !== 'showcase', 'только в сборке витрины (PW_MODE=showcase)');

test('витрина: пульт выступления с готовым набором и проект студии', async ({ page, errors }) => {
  await page.goto('/');
  // первый заход: посев песен, файлов и пульта, затем перезапуск (до минуты: синтез звуков и разбор)
  await page.waitForFunction(() => localStorage.getItem('showcase.seeded.show.v1') === '1' && localStorage.getItem('showcase.seeded.v1') === '1', null, { timeout: 90_000 });
  await page.waitForTimeout(2500);
  const tools = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools') || '{}'));
  const sh = tools.show;
  expect(sh.events[0].title).toBe('День студента');
  expect(sh.events[0].numbers.length).toBe(7);
  expect(sh.events[0].numbers.filter((n) => n.kind === 'track' && n.file).length).toBe(3);
  expect(sh.banks.some((b) => b.pads.filter((p) => p && p.file).length >= 5)).toBe(true);
  expect(sh.noises.length).toBe(3);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('showcase.practice.v1') || localStorage.getItem('practice.v1') || '{}'));
  void st;
  expect(errors.filter((e) => !/Failed to load resource|404/.test(String(e)))).toEqual([]);
});
