// Настройки картинкой (слово автора 22.11.2026): «Данные» — плитки и полоса места, «Неделя» — гистограмма плана по дням.
import { test, expect } from './melete.js';

test('данные и неделя: инфографика', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('[data-pp="data"]'); await page.waitForTimeout(800);
  await expect(page.locator('.dstiles .tile')).toHaveCount(2);
  await expect(page.locator('[data-dsdisk]')).toBeVisible({ timeout: 5000 });
  expect(await page.locator('[data-dsval]').textContent()).toMatch(/\d/);
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/data.png' });
  await page.keyboard.press('Escape');
  await page.reload(); await page.waitForTimeout(800);
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('#panelLayer [data-pp="week"]'); await page.waitForTimeout(900);
  await expect(page.locator('.wkbars .wkc')).toHaveCount(7);
  await page.locator('.wkinfo').scrollIntoViewIfNeeded();
  const hs = await page.locator('.wkc i:not(.z)').evaluateAll((a) => a.map((e) => e.getBoundingClientRect().height));
  expect(hs.length).toBeGreaterThan(0); hs.forEach((h) => expect(h).toBeGreaterThan(10)); // занятые дни — со столбиком
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/week.png' });
  void errors;
});

test('звук, маскот, вкладки: карточки, значки, миниатюра панели', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  const go = async (k) => { await melete.click('.avatar'); await page.waitForTimeout(500); await page.click('#panelLayer [data-pp="' + k + '"]'); await page.waitForTimeout(800); };
  await go('sound');
  await expect(page.locator('[data-seg="sndmode"] .scard')).toHaveCount(3);
  await page.click('[data-seg="sndmode"] .scard[data-v="smooth"]'); await page.waitForTimeout(300);
  await expect(page.locator('[data-seg="sndmode"] .scard[data-v="smooth"][aria-pressed="true"]')).toHaveCount(1);
  // выход звука — «Авто» и устройства (там, где WebView умеет setSinkId)
  if (await page.locator('[data-act="sndout"]').count()) {
    await page.click('[data-act="sndout"]'); await page.waitForTimeout(900);
    await expect(page.locator('[data-od=""]')).toHaveCount(1);
    await page.click('[data-od=""]'); await page.waitForTimeout(400);
  }
  await page.locator('[data-seg="sndmode"]').scrollIntoViewIfNeeded();
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/sound.png' });
  await page.reload(); await page.waitForTimeout(800);
  await go('mascot');
  await expect(page.locator('.group .cell .ticon').first()).toBeVisible();
  await page.reload(); await page.waitForTimeout(800);
  await go('tabs');
  expect(await page.locator('.tbprev .tbp').count()).toBeGreaterThan(2);
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/tabs2.png' });
  void errors;
});
