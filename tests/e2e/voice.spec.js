// Диктофон: режимы обработки (ряд, шторка настройки, «Свой» и возврат), запись с поддельного микрофона кусками в
// IndexedDB, дубль, обработка цепочкой и сохранение в медиатеку; исходник остаётся в «Записях в памяти».
import { test, expect } from './melete.js';

const open = async (page, melete) => {
  await melete.open();
  await melete.tab('tools');
  await melete.click('[data-open-tool="voice"]');
  await page.waitForSelector('.voice .vc-bot', { timeout: 10_000 });
};
const voiceSet = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools') || '{}').voice.voice);

test('режимы: по умолчанию «Музыка», выбор, настройка → «Свой», возврат', async ({ page, melete, errors }) => {
  await open(page, melete);
  await expect(page.locator('.voice [data-vmode="music"].on')).toHaveCount(1);
  await melete.click('.voice [data-vmode="radio"]');
  await expect(page.locator('.voice [data-vmode="radio"].on')).toHaveCount(1);
  expect((await voiceSet(page)).mode).toBe('radio');
  await melete.click('.voice [data-x="vset"]');
  await page.waitForSelector('.sheet [data-vp="compRatio"]');
  await page.locator('.sheet input[data-vp="compRatio"]').fill('8');
  await page.waitForTimeout(200);
  const v = await voiceSet(page);
  expect(v.mode).toBe('own');
  expect(v.base).toBe('radio');
  expect(v.p.compRatio).toBe(8);
  await expect(page.locator('.sheet [data-vmode="own"].on')).toHaveCount(1);
  await melete.click('.sheet [data-vreset]');
  await page.waitForTimeout(200);
  expect((await voiceSet(page)).mode).toBe('radio');
  expect(errors).toEqual([]);
});

test('запись → дубль → обработка → в медиатеку; исходник в памяти', async ({ page, melete, errors }) => {
  await open(page, melete);
  await melete.click('.voice [data-vmode="speech"]');
  await melete.click('.voice .vc-bot [data-x="rec"]');
  await page.waitForSelector('.voice [data-x="stop"]', { timeout: 8_000 });
  await page.waitForTimeout(2600); // больше двух секунд — хотя бы один кусок ушёл в IndexedDB
  const chunks = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('melete-voice'); r.onsuccess = () => { const q = r.result.transaction('chunks').objectStore('chunks').count(); q.onsuccess = () => res(q.result); }; r.onerror = () => res(-1); }));
  expect(chunks).toBeGreaterThan(0);
  await melete.click('.voice [data-x="stop"]');
  await page.waitForSelector('.voice #vc-wave', { timeout: 8_000 });
  await melete.click('.voice .vc-bot [data-x="save"]');
  await expect(page.locator('.voice .vc-bot [data-x="save"].done')).toHaveCount(1, { timeout: 15_000 });
  // новая запись → дубль уходит, исходник сохранённого — в «Записях в памяти»
  await melete.click('.voice .vc-bot [data-x="rec"]');
  await page.waitForSelector('.voice [data-x="stop"]', { timeout: 8_000 });
  await page.waitForTimeout(600);
  await melete.click('.voice [data-x="stop"]');
  await page.waitForSelector('.voice #vc-wave', { timeout: 8_000 });
  await melete.click('.voice [data-x="drop"]');
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('.ask [data-ok], .ask .act.danger, .ask button:last-child')?.click());
  await page.waitForSelector('.voice [data-kopen]', { timeout: 8_000 });
  await expect(page.locator('.voice [data-kopen]')).toHaveCount(1);
  expect(errors).toEqual([]);
});
