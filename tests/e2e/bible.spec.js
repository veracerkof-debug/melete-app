// Библия (автор 06.11.2026): полоса управления внизу, поиск по всей Библии, полный экран, выбор стихов —
// копировать с ссылкой и переводом.
import { test, expect } from './melete.js';

test('Библия: полоса внизу, поиск, полный экран, копирование стихов', async ({ page, melete, errors, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await melete.open({ settings: { church: true } });
  await melete.tab('bible');
  await page.waitForSelector('.bwrap .bv', { timeout: 15_000 });
  // полоса — под текстом
  const tx = await page.locator('.bwrap .btext').boundingBox(), bar = await page.locator('.bwrap .bbar').boundingBox();
  expect(bar.y).toBeGreaterThanOrEqual(tx.y + tx.height - 1);
  // поиск: «возлюбил Бог мир» → От Иоанна 3:16
  await page.click('.bbar [data-x="bsearch"]');
  await page.fill('.bsq', 'так возлюбил Бог мир');
  await page.keyboard.press('Enter');
  await expect(page.locator('.bshit').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.bshit[data-r="JOH:3:16"]')).toHaveCount(1);
  await page.click('.bshit[data-r="JOH:3:16"]');
  await expect(page.locator('.bpick')).toContainText('3');
  // выбор двух стихов → копировать
  await page.locator('.bv[data-v="16"]').hover();
  const v16 = page.locator('.bv[data-v="16"]');
  await v16.dispatchEvent('pointerdown', { clientX: 0, clientY: 0 });
  await page.waitForTimeout(650);
  await expect(page.locator('.sheet [data-vm="select"]')).toBeVisible();
  await page.click('.sheet [data-vm="select"]'); await page.waitForTimeout(500);
  await expect(page.locator('.bwrap.bselm .bv.sel')).toHaveCount(1);
  const b17 = await page.locator('.bv[data-v="17"]').boundingBox();
  await page.mouse.click(b17.x + 20, b17.y + b17.height / 2);
  await expect(page.locator('.bwrap .bv.sel')).toHaveCount(2);
  await page.click('[data-x="bselcopy"]');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toMatch(/^16 .+ 17 .+\n— .+ 3:16–17 \(Синодальный перевод\)$/s);
  await expect(page.locator('.bwrap.bselm')).toHaveCount(0);
  // полный экран: вкладки спрятаны, выход — кнопкой
  await page.click('.bbar [data-x="bpure"]');
  await expect(page.locator('.bwrap.bpure')).toHaveCount(1);
  await expect(page.locator('.tabbar')).toBeHidden();
  await page.click('[data-x="bunpure"]');
  await expect(page.locator('.bwrap.bpure')).toHaveCount(0);
  await expect(page.locator('.tabbar')).toBeVisible();
  expect(errors).toEqual([]);
});
