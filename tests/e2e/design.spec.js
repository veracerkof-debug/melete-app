// Обзор дизайна 28.10.2026: главная (кольцо — сколько осталось, шаг «первая песня», полоса лиги), подписи вкладок
// как вариант, свёртка длинных пояснений в шторках
import { test, expect } from './melete.js';

test('дизайн: главная, вкладки, пояснения', async ({ page, melete, errors }) => {
  await melete.open();
  await expect(page.locator('.gring .rcap')).toHaveCount(1);
  await expect(page.locator('.hfirst[data-act="addSong"]')).toBeVisible();
  // лига — вторым кольцом с камнем в плитке недели, отдельной плитки нет
  await expect(page.locator('.hwgem .hgring[data-act="gem"] canvas[data-gem3d]')).toHaveCount(1);
  await expect(page.locator('.gemrow')).toHaveCount(0);
  // подписи вкладок — вариант
  await expect(page.locator('.tab .tl').first()).toBeHidden();
  await page.evaluate(() => localStorage.setItem('melete.variants', JSON.stringify({ tabs: 'labels' })));
  await page.reload(); await page.waitForTimeout(1200);
  await expect(page.locator('.tab .tl').first()).toBeVisible();
  // длинное пояснение в шторке — две строки, касание раскрывает
  const h = await page.evaluate(async () => {
    const u = await import('/src/ui/index.js');
    const L = 'Длинное пояснение '.repeat(16);
    u.sheet(() => '<p class="ftr" id="lh">' + L + '</p><p class="ftr" id="sh">Коротко.</p>');
    const e = document.getElementById('lh'), a = e.clientHeight;
    e.click();
    return { clamp: e.classList.contains('clamp'), short: document.getElementById('sh').classList.contains('clamp'), a, b: e.clientHeight, exp: e.getAttribute('aria-expanded') };
  });
  expect(h.clamp).toBe(true);
  expect(h.short).toBe(false);
  expect(h.b).toBeGreaterThan(h.a);
  expect(h.exp).toBe('true');
});
