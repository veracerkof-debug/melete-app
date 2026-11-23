// «Песни»: удержать — «Выбрать несколько», касанием отметить, действия над выбранными (22.11.2026)
import { test, expect } from './melete.js';
test('песни: выбор нескольких — отметить, выбрать все, удалить', async ({ page, melete, errors }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const songs = ['Альфа', 'Бета', 'Гамма', 'Дельта'].map((n, i) => ({ id: 'q' + i, title: n, created: Date.now() }));
  await melete.open({ songs });
  await page.evaluate(() => { const b = [...document.querySelectorAll('[data-tab="library"], [data-go="library"]')][0]; b && b.click(); });
  await page.waitForTimeout(600);
  if (!(await page.locator('button.stile3').count())) { await melete.click('[data-tab="library"]').catch(() => {}); await page.waitForTimeout(600); }
  await expect(page.locator('button.stile3')).toHaveCount(4);
  const b = await page.locator('button.stile3').first().boundingBox();
  await page.mouse.move(b.x + 40, b.y + 20); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
  await page.locator('.hmenu button', { hasText: 'Выбрать несколько' }).click(); await page.waitForTimeout(300);
  await expect(page.locator('.selbar .selt')).toContainText('1');
  await page.locator('button.stile3').nth(1).click(); await page.waitForTimeout(200);
  await expect(page.locator('.selbar .selt')).toContainText('2');
  await page.click('[data-act="selall"]'); await page.waitForTimeout(200);
  await expect(page.locator('.selbar .selt')).toContainText('4');
  await page.click('[data-act="selall"]'); await page.waitForTimeout(200);
  await expect(page.locator('.selbar .selt')).toContainText('0');
  await page.locator('button.stile3').nth(0).click(); await page.locator('button.stile3').nth(2).click();
  await page.click('[data-act="seldel"]'); await page.waitForTimeout(300);
  await page.click('.ask [data-k="yes"]'); await page.waitForTimeout(500);
  await expect(page.locator('button.stile3')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('песни: дубли — фильтр, «Выбрать лишние» оставляет по одной', async ({ page, melete, errors }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const songs = [['q0', 'Альфа'], ['q1', 'Альфа'], ['q2', 'Бета'], ['q3', 'Альфа']].map(([id, n], i) => ({ id, title: n, artist: 'Автор', created: Date.now() + i, createdAt: Date.now() + i }));
  await melete.open({ songs });
  await page.evaluate(() => { const b = [...document.querySelectorAll('[data-tab="library"], [data-go="library"]')][0]; b && b.click(); });
  await page.waitForTimeout(600);
  await expect(page.locator('button.stile3')).toHaveCount(4);
  await page.selectOption('[data-input="flt"]', 'x:dup'); await page.waitForTimeout(300);
  await expect(page.locator('button.stile3')).toHaveCount(3); // три «Альфы»
  await page.click('[data-act="dupsel"]'); await page.waitForTimeout(300);
  await expect(page.locator('.selbar .selt')).toContainText('2'); // лишних две
  await page.click('[data-act="seldel"]'); await page.waitForTimeout(300);
  await page.click('.ask [data-k="yes"]'); await page.waitForTimeout(500);
  await page.selectOption('[data-input="flt"]', ''); await page.waitForTimeout(300);
  await expect(page.locator('button.stile3')).toHaveCount(2);
  expect(errors).toEqual([]);
});
