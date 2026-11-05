// Хроматический круг в «Теории» (05.11.2026): аккорд — фигура, шаги дугами и формула «4 + 3 = …»; гамма — тот же круг,
// касание ноты гаммы — лад от неё
import { test, expect } from './melete.js';

test('теория: аккорд и гамма на хроматическом круге', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.tools({ theory: { sec: 'chords', croot: 0, ctype: 'min' } }); await melete.free('F', ['theory']);
  const cr = page.locator('.crwrap .chroma');
  await expect(cr).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('.crform')).toContainText('3 + 4');
  await expect(cr.locator('.cr-n.on')).toHaveCount(3);
  await expect(cr.locator('.cr-arc')).toHaveCount(2);
  await cr.locator('[data-cpc="3"]').click(); // нота аккорда — звук, без ошибок
  await melete.tools({ theory: { sec: 'scales', scale: { pc: 0, type: 'major' } } }); await melete.free('F', ['theory']);
  const sr = page.locator('.srwrap .chroma');
  await expect(sr).toHaveCount(1, { timeout: 15_000 });
  await expect(sr.locator('.cr-n.on')).toHaveCount(7);
  await expect(sr.locator('.cr-sstep')).toHaveCount(7);
  await sr.locator('[data-cpc="2"]').click(); await page.waitForTimeout(300); // ре — дорийский от ре
  await expect(page.locator('.srwrap .chroma .cr-c1')).toHaveText(/D/);
  expect(errors).toEqual([]);
});
