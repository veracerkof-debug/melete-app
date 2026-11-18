// Пульт: «открыть инструмент» при открытых настройках — инструмент виден сразу, настройки закрываются
import { test, expect } from './melete.js';

test('пульт: инструмент открывается поверх настроек', async ({ page, melete }) => {
  await melete.open();
  await page.waitForFunction(() => window.__melete && window.__melete.showTool);
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(600);
  await expect(page.locator('#panelLayer')).toHaveCount(1);
  await page.evaluate(async () => { const m = await import('/src/core/netctl.js'); return m.rcHandle(window.__melete, '/melete/v1/rc/cmd', { a: 'tool', id: 'tuner' }, { key: 'k1', name: 'Pixel' }, () => {}); });
  await expect(page.locator('.tview')).toHaveCount(1);
  await page.waitForTimeout(500);
  await expect(page.locator('#panelLayer')).toHaveCount(0);
});
