// Пауза из шторки и пэды (автор 05.11.2026): на паузе звучащая плитка тусклая, касание — «продолжить», а не «стоп».
// Окно «Только свои файлы» — галочка ответственности обязательна: мимо окна и без галочки оно не закрывается.
import { test, expect } from './melete.js';

test('пэды: касание после паузы из шторки продолжает звук', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['drone']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="drone"] ';
  await melete.swipe(T + '.dtile[data-v="9"]', 0, 0, { steps: 1 });
  expect(await melete.count(T + '.dtile.on')).toBe(1);
  await page.evaluate(async () => (await import('/src/audio/context.js')).hold(true));
  await expect(page.locator(T + '.dwrap.held')).toHaveCount(1);
  await melete.swipe(T + '.dtile[data-v="9"]', 0, 0, { steps: 1 });
  expect(await page.evaluate(async () => (await import('/src/audio/context.js')).isHeld())).toBe(false);
  await expect(page.locator(T + '.dwrap.held')).toHaveCount(0);
  expect(await melete.count(T + '.dtile.on')).toBe(1);
  expect(errors).toEqual([]);
});

test('свои файлы: без галочки окно не закрывается', async ({ page, melete, errors }) => {
  await melete.open();
  await page.evaluate(async () => { const { agree } = await import('/src/ui/index.js'); window.__ag = agree('Т', 'текст', 'согласен', 'Продолжить').then(() => (window.__agOk = true)); });
  const btn = page.locator('.ask.agree [data-k="yes"]');
  await expect(btn).toBeDisabled();
  await page.mouse.click(5, 5); // мимо окна
  await page.keyboard.press('Escape');
  await expect(page.locator('.ask.agree')).toHaveCount(1);
  await page.click('.ask.agree .agchk');
  await expect(btn).toBeEnabled();
  await btn.click();
  await expect(page.locator('.ask.agree')).toHaveCount(0);
  expect(await page.evaluate(() => window.__agOk)).toBe(true);
  expect(errors).toEqual([]);
});
