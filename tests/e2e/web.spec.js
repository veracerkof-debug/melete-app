// Обычная веб-версия (PW_MODE=web, `vite --mode web`): рабочая, но без того, что в браузере не работает, — ни кнопок, ни заглушек
// (DECISIONS 2026-11-15). Запуск: PW_MODE=web npx playwright test tests/e2e/web.spec.js. В обычном прогоне пропускается.
import { test, expect } from './melete.js';

test.skip(process.env.PW_MODE !== 'web', 'только в веб-сборке (PW_MODE=web)');

test('веб: в настройках нет страницы напоминаний, раздела «Папка Melete» и автообработки записей', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(600);
  await expect(page.locator('[data-pp="data"]').first()).toBeVisible();
  expect(await page.locator('[data-pp="notif"]').count()).toBe(0);   // напоминания приходят только в приложении — страницы нет
  await melete.click('[data-pp="data"]'); await page.waitForTimeout(700);
  const data = await page.evaluate(() => document.body.innerText);
  expect(data).not.toContain('Папка Melete');                         // раздела нет, и вместо него нет строки «есть в приложении»
  expect(data).not.toContain('приложении для Android');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await melete.click('[data-pp="sound"]'); await page.waitForTimeout(700);
  expect(await page.locator('[data-psw="autoAna"], [data-seg="autostems"]').count()).toBe(0); // разбор записей в браузере не работает — настроек нет
  expect(errors).toEqual([]);
});

test('веб: плеер медиатеки без переключателя видов (дорожки, текст, аккорды, «Петь»)', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['audio']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await expect(page.locator('.session .pane[data-tool="audio"] .pvsw')).toHaveCount(0);
  await expect(page.locator('.session [data-x="astems"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('веб: метроном — подсказки про «приложение для Android» нет', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['metro']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await expect(page.locator('.session')).not.toContainText('приложении для Android');
  expect(errors).toEqual([]);
});

test('веб: пульт выступления (только dev) в веб-версии из pre не показывается', async ({ page, melete }) => {
  await melete.open();
  await melete.free('F', ['audio']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const ch = await page.evaluate(async () => (await import('/src/core/variants.js')).DEV);
  // в обычном прогоне канал dev; кнопка есть только у dev — проверяем, что она ровно по признаку
  expect(await page.locator('.session [data-x="ashow"]').count()).toBe(ch ? 1 : 0);
});
