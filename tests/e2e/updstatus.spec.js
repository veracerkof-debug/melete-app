// «Обновление» и пояснения (слово автора 22.11.2026): статус обновления всегда на виду, кружков «?» нет — названия-ссылки
import { test, expect } from './melete.js';

test('обновление: статус на виду, без кружков «?»; название инструмента открывает инструкцию', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  const SHOT = process.env.UPD_SHOTS || '';
  for (const [name, st, rx] of [['none', { st: 'none', info: null, building: null }, /Актуально|актуальн|последн/i], ['err', { st: 'err', info: null, building: null }, /\S/], ['checking', { st: 'checking', info: null, building: null }, /\S/]]) {
    await page.evaluate(async (s) => {
      const { updateSheet } = await import('/src/core/screens/update.js');
      const U = { state: s, build: 317, channel: 'dev', platform: 'android', mode: 'auto', subscribe: () => () => {}, fresh() {}, check() {}, download() {}, install: async () => {} };
      updateSheet({ updater: U, store: { state: { settings: {} }, settingsChanged() {} } });
    }, st);
    await page.waitForSelector('.sheet .updflow');
    await expect(page.locator('.sheet .updflow.updst')).toHaveCount(1); // статус на виду, а не в пояснении под кнопками
    expect(await page.locator('.sheet .updflow b').first().textContent()).toMatch(rx);
    await expect(page.locator('.sheet .updflow')).toBeVisible();
    await expect(page.locator('.hq')).toHaveCount(0);                    // кружков нет нигде
    if (SHOT) await page.screenshot({ path: SHOT + '/updst-' + name + '.png' });
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  }
  // инструмент: название в шапке — ссылка на инструкцию, значка «?» нет
  await melete.tab('tools'); await melete.click('[data-open-tool="piano"]'); await page.waitForTimeout(1000);
  await expect(page.locator('.tview .stitle2.hqt[data-tv="help"]')).toHaveCount(1);
  await expect(page.locator('.tview .tvhd .ic [d^="M9.7 9.4"]')).toHaveCount(0);
  await page.locator('.tview .stitle2').click(); await page.waitForTimeout(600);
  await expect(page.locator('.helpcard').first()).toBeVisible();
  void errors;
});
