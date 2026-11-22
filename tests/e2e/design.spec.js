// Обзор дизайна 28.10.2026: главная (кольцо — сколько осталось, шаг «первая песня», полоса лиги), подписи вкладок
// как вариант, свёртка длинных пояснений в шторках
import { test, expect } from './melete.js';

test('дизайн: главная, вкладки, пояснения', async ({ page, melete, errors }) => {
  await melete.open();
  await expect(page.locator('.gring .rcap')).toHaveCount(1);
  await expect(page.locator('.hfirst[data-act="addSong"]')).toBeVisible();
  // камень (вместо самоцвета, 06.11.2026) — в плитке недели, отдельной плитки нет
  await expect(page.locator('.hwgem .hgstone canvas[data-stone="home"]')).toHaveCount(1);
  await expect(page.locator('.gemrow')).toHaveCount(0);
  // подписи вкладок — всегда (решение автора 05.11.2026, не вариант): прежний выбор «только значки» не действует
  await expect(page.locator('.tab .tl').first()).toBeVisible();
  await page.evaluate(() => localStorage.setItem('melete.variants', JSON.stringify({ tabs: 'icons' })));
  await page.reload(); await page.waitForTimeout(1200);
  await expect(page.locator('.tab .tl').first()).toBeVisible();
  // длинное пояснение в шторке — не текстом, а по запросу (21.11.2026): абзац одной строкой или название-ссылка, касание открывает окошко; короткая подпись остаётся
  const h = await page.evaluate(async () => {
    const u = await import('/src/ui/index.js');
    const L = 'Длинное пояснение '.repeat(16);
    u.sheet(() => '<p class="ftr" id="lh">' + L + '</p><p class="ftr" id="sh">Коротко.</p>');
    const e = document.getElementById('lh');
    return { hidden: e.hidden, shortHidden: document.getElementById('sh').hidden, hq: document.querySelectorAll('.sheet .hqline').length, circles: document.querySelectorAll('.hq').length };
  });
  expect(h.hidden).toBe(false); // без названия рядом — абзац остаётся одной строкой (22.11.2026: кружков «?» больше нет)
  expect(h.shortHidden).toBe(false);
  expect(h.hq).toBe(1);
  expect(h.circles).toBe(0);
  await page.locator('.sheet .hqline').click();
  await expect(page.locator('.hintpop')).toContainText('Длинное пояснение');
  await page.mouse.click(200, 60); // касание в стороне закрывает окошко
  await expect(page.locator('.hintpop')).toHaveCount(0);
});
