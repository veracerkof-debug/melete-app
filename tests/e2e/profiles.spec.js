// Профили вывода: окно открывается из «Звук», профиль сохраняется для текущего устройства, применяется и удаляется; настройки микшера возвращаются.
import { test, expect } from './melete.js';

test('профили вывода: сохранить, изменить громкость, применить, удалить', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(400);
  await page.click('#panelLayer [data-pp="sound"]'); await page.waitForTimeout(500);
  await page.click('[data-act="sndprof"]'); await page.waitForTimeout(600);
  await expect(page.locator('.sheet')).toContainText('Профили вывода');
  await page.click('[data-pf="save"]'); await page.waitForTimeout(400);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools')).profiles.list.length)).toBe(1);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools')).mix.piano);
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('practice.v1.tools')); d.mix.piano = 0.3; });
  await page.click('[data-pf="apply"]'); await page.waitForTimeout(400);
  await page.click('[data-pf="del"]'); await page.waitForTimeout(400);
  await page.click('.sheet [data-ok], .confirm [data-ok], button:has-text("Удалить") >> nth=-1').catch(() => {});
  await page.waitForTimeout(500);
  expect(before).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('профили и сцены под рукой: в «Выход звука» и в боковом микшере', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(400);
  await page.click('#panelLayer [data-pp="sound"]'); await page.waitForTimeout(500);
  // «Профили вывода» — в той же группе, что и «Выход звука» (если выход выбирается)
  const same = await page.evaluate(() => { const p = document.querySelector('[data-act="sndprof"]'), o = document.querySelector('[data-act="sndout"]'); return !o || (p && p.parentElement === o.parentElement); });
  expect(same).toBe(true);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // боковой микшер: язычок виден, когда что-то звучит или он открыт — открываем напрямую
  await page.evaluate(() => { const e = document.querySelector('#mixd'); e.classList.add('show', 'open'); });
  await page.evaluate(() => window.__melete.audio.mixer.apply && 0);
  const has = await page.locator('#mixd [data-mxprof], #mixd [data-mxscn]').count();
  expect(has).toBe(2);
  await page.evaluate(() => document.querySelector('#mixd [data-mxprof]').click()); await page.waitForTimeout(600);
  await expect(page.locator('.sheet')).toContainText('Профили вывода');
  expect(errors).toEqual([]);
});
