// Замер длины страниц настроек на 390×844 (слово автора 21.11.2026: настройки короче). Не проверка, а отчёт: PAGEH=1 — печатает высоты.
import { test, expect } from './melete.js';

const LIMIT = { week: 1560, tabs: 1520, feat: 1530, help: 1210 }; // 22.11.2026 после сжатия (было 1632 / 1595 / 1747 / 1374); потолок только вниз

test('страницы настроек: длина', async ({ page, melete }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  const out = {};
  for (const k of Object.keys(LIMIT)) {
    await melete.click('.avatar'); await page.waitForTimeout(500);
    await page.click('[data-pp="' + k + '"]'); await page.waitForTimeout(900);
    out[k] = await page.evaluate(() => { const els = [...document.querySelectorAll('.large')]; const sc = els.length ? els[els.length - 1].closest('.sheet, .panel, [class*="pane"], div') : null; let e = sc; while (e && e.scrollHeight <= e.clientHeight + 2) e = e.parentElement; return e ? e.scrollHeight : 0; });
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await page.reload(); await page.waitForTimeout(700);
  }
  if (process.env.PAGEH) console.log('PAGEH', JSON.stringify(out));
  for (const k of Object.keys(LIMIT)) expect(out[k], k).toBeLessThanOrEqual(LIMIT[k]);
});
