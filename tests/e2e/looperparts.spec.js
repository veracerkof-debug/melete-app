// Лупер, вид «Партии» (30.10.2026): партия ударных в петле, правка в шторке, петля по тактам, вкл/выкл с начала такта
import { test, expect } from './melete.js';

test('партии: ударные в петле, правка, вкл/выкл с такта', async ({ page, melete, errors }) => {
  await melete.open({ tools: { looper: { metro: false, view: 'parts', bars: 4 } } });
  await melete.free('F', ['looper']);
  await expect(page.locator('.lpwrap.parts')).toHaveCount(1);
  await melete.click('[data-x="padd"]'); await page.waitForTimeout(500);
  await page.locator('.hmenu button').first().click(); await page.waitForTimeout(1500);
  await expect(page.locator('.lpped .stwrap')).toHaveCount(1); // редактор ударных в шторке
  await page.locator('.lpped .rack [data-step], .lpped .rack button').first().click().catch(() => {});
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  await expect(page.locator('.lprow[data-tr]')).toHaveCount(1);
  await melete.click('[data-x="main"]'); await page.waitForTimeout(800); // петля играет, партия — в такт
  const playing = await page.evaluate(() => document.querySelector('[data-x="main"]')?.getAttribute('aria-label'));
  expect(playing).toBeTruthy();
  await page.locator('.lprow[data-tr] .lprn').click(); await page.waitForTimeout(200);
  await expect(page.locator('.lprow[data-tr].pend')).toHaveCount(1); // выключится с начала такта
  await page.waitForTimeout(3200);
  await expect(page.locator('.lprow[data-tr].off')).toHaveCount(1);
  await melete.click('[data-x="stop"]');
  expect(errors).toEqual([]);
});

test('партии: игра на MIDI-клавиатуре — новая партия', async ({ page, melete, errors }) => {
  await melete.open({ tools: { looper: { metro: false, view: 'parts', bars: 4 } } });
  await melete.free('F', ['looper']);
  await melete.click('[data-x="main"]'); await page.waitForTimeout(500); // петля 4 такта (90 bpm ≈ 10,7 с)
  await melete.click('[data-x="padd"]'); await page.waitForTimeout(400);
  await page.locator('.hmenu button').nth(3).click(); await page.waitForTimeout(300);
  await expect(page.locator('.lpcap')).toHaveCount(1);
  // ждём начала круга и играем три ноты через MIDI-вход лупера
  await page.waitForFunction(() => !document.querySelector('.lpcap.wait'), null, { timeout: 15000 });
  await page.evaluate(async () => {
    const m = (await import('/src/modules/looper/index.js')).default;
    for (const [i, n] of [60, 64, 67].entries()) { m.midiIn({ k: 'on', id: 'k' + i, m: n, v: 0.8 }); await new Promise((r) => setTimeout(r, 300)); m.midiIn({ k: 'off', id: 'k' + i }); }
  });
  await melete.click('[data-x="capstop"]'); await page.waitForTimeout(400);
  await expect(page.locator('.lprow[data-tr]')).toHaveCount(1);
  await melete.click('[data-x="stop"]');
  expect(errors).toEqual([]);
});

test('партии: запись с микрофона по кругам — дубли, листать и удалить', async ({ page, melete, errors }) => {
  await melete.open({ settings: { metro: { bpm: 240, num: 4, den: 4, sub: 1 } }, tools: { looper: { metro: false, view: 'parts', bars: 4 } } });
  await melete.free('F', ['looper']);
  await melete.click('[data-x="main"]'); await page.waitForTimeout(600); // петля 4 такта по 240 — 4 с
  await melete.click('[data-x="main"]'); await page.waitForTimeout(9000); // три круга записи
  await melete.click('[data-x="main"]'); await page.waitForTimeout(500);
  const tk = await page.locator('.lptkb').textContent().catch(() => '');
  test.info().annotations.push({ type: 'takes', description: tk });
  expect(tk).toMatch(/^\d\/[2-9]$/);
  const n = +tk.split('/')[1];
  await page.locator('.lptkb').click(); await page.waitForTimeout(200); // следующий по кругу: последний → первый
  expect(await page.locator('.lptkb').textContent()).toBe('1/' + n);
  await melete.hold('.lprow.layer'); await page.waitForTimeout(300);
  await page.locator('.hmenu button').first().click(); await page.waitForTimeout(300);
  const after = await page.locator('.lptkb').textContent({ timeout: 1000 }).catch(() => '');
  expect(n === 2 ? after === '' : after.endsWith('/' + (n - 1))).toBe(true);
  await melete.click('[data-x="stop"]');
  expect(errors).toEqual([]);
});
