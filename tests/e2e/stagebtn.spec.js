// Сцена одной кнопкой (06.11.2026): на главной и в рабочей сессии; один сет-лист на сегодня — сразу на сцену
import { test, expect } from './melete.js';

test('сцена: кнопка на главной и в сессии', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [{ id: 's1', title: 'Первая', targetBpm: 96, notes: '[C]Раз [G]два' }] });
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('practice.v1')); s.events = [{ id: 'e1', title: 'Концерт', kind: 'concert', start: Date.now() + 3600000, end: Date.now() + 7200000, songs: ['s1'], repeat: 'none' }]; localStorage.setItem('practice.v1', JSON.stringify(s)); });
  await page.reload(); await page.waitForTimeout(1200);
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/stagebtn-btn.png' });
  await page.locator('.hstage').click();
  await expect(page.locator('.stage, .stg, [class*="stage"]').first()).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: 'test-results/stagebtn-home.png' });
  await page.evaluate(() => localStorage.removeItem('melete.stage')); // без возврата на сцену после перезагрузки
  await page.reload(); await page.waitForTimeout(1200);
  await melete.free('F', ['metro']);
  await expect(page.locator('.session .sstage')).toBeVisible();
  await page.screenshot({ path: 'test-results/stagebtn-session.png' });
  expect(errors).toEqual([]);
});
