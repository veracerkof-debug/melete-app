// Демо-данные витрины (src/showcase/seeds/builders.js) читаются самими инструментами без ошибок: слух, ритм, вокал
import { test, expect } from './melete.js';

for (const [id, key, fn] of [['ear', 'ear', 'earDemo'], ['beat', 'beat', 'beatDemo'], ['vocal', 'vocal', 'vocalDemo']]) {
  test('демо-данные: ' + id + ' открывается с набором без ошибок', async ({ page, melete, errors }) => {
    await page.goto('/');
    const data = await page.evaluate(async ([f]) => (await import('/src/showcase/seeds/builders.js'))[f](Date.now()), [fn]);
    await melete.open({ settings: { [key]: data } });
    await melete.free('F', [id]);
    await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
    await page.waitForTimeout(800);
    await expect(page.locator('.session .pane[data-tool="' + id + '"]')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
