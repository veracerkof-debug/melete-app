// Табы с нуля (слово автора 22.11.2026): «Писать с нуля» — пустая партия на 4 такта; касание паузы → «нота»; длительность кнопками; «+ такт».
import { test, expect } from './melete.js';

test('табы с нуля: пустая партия, нота в паузу, длительность, + такт', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await melete.open();
  await melete.tools({ notes: { live: { src: 'midi', metro: false, inst: 'guitar' } }, wsMap: { free: { layout: 'HH', panes: ['notes', 'piano'], focus: 0, sub: {}, ratio: 0.72 } } });
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session .pane', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.click('[data-x="lvnew"]'); await page.waitForTimeout(300);
  await melete.click('[data-x="lvblank"]');
  await page.waitForFunction(() => document.querySelectorAll('.atsurf text, .atsurf svg').length > 0, null, { timeout: 20_000 });
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-x="lvbaradd"]')).toHaveCount(1);
  // касание по первому такту — пауза выбрана, «добавить ноту»
  const box = await page.locator('.atsurf').boundingBox();
  await page.mouse.click(box.x + 60, box.y + 40); await page.waitForTimeout(500);
  const add = page.locator('[data-x="lvadd"]');
  await expect(add).toHaveCount(1); // пауза выбрана — предложено добавить ноту
  {
    await add.click(); await page.waitForTimeout(600);
    await expect(page.locator('[data-x="lvdur"]')).toHaveCount(5);
    await page.click('[data-x="lvdur"][data-b="0.5"]'); await page.waitForTimeout(400);
    await expect(page.locator('[data-x="lvdur"][data-b="0.5"].on')).toHaveCount(1);
  }
  await melete.click('[data-x="lvdesel"]').catch(() => {});
  await melete.click('[data-x="lvbaradd"]'); await page.waitForTimeout(800);
  expect(await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('practice-audio'); r.onsuccess = () => { const q = r.result.transaction('tracks', 'readonly').objectStore('tracks').getAll(); q.onsuccess = () => res(Math.max(0, ...q.result.filter((x) => x.fmt === 'live').map((x) => (x.live && x.live.minBars) || 0))); }; }))).toBeGreaterThanOrEqual(5);
  expect(errors).toEqual([]);
});

// Выбор входа для записи табов с микрофона (слово автора 22.11.2026)
test('табы с микрофона: вход выбирается из списка, «Авто» по умолчанию', async ({ page, melete, errors }) => {
  test.setTimeout(90_000);
  await melete.open();
  await melete.tools({ notes: { live: { src: 'mic', metro: false, inst: 'guitar' } }, wsMap: { free: { layout: 'HH', panes: ['notes', 'piano'], focus: 0, sub: {}, ratio: 0.72 } } });
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session .pane', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.click('[data-x="lvnew"]'); await page.waitForTimeout(300);
  await melete.click('[data-x="lvset"]'); await page.waitForTimeout(500);
  await expect(page.locator('[data-x="lvindev"]')).toHaveCount(1);
  await page.click('[data-x="lvindev"]'); await page.waitForTimeout(900);
  await expect(page.locator('[data-dev=""]')).toHaveCount(1); // «Авто»
  expect(await page.locator('[data-dev]').count()).toBeGreaterThanOrEqual(1);
  await page.click('[data-dev=""]'); await page.waitForTimeout(400);
  void errors;
});

// Выбор MIDI-устройства для записи табов (слово автора 22.11.2026)
test('табы с MIDI: устройство выбирается, «Все» по умолчанию', async ({ page, melete, errors }) => {
  test.setTimeout(90_000);
  await melete.open();
  await melete.tools({ notes: { live: { src: 'midi', metro: false, inst: 'guitar' } }, wsMap: { free: { layout: 'HH', panes: ['notes', 'piano'], focus: 0, sub: {}, ratio: 0.72 } } });
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session .pane', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.click('[data-x="lvnew"]'); await page.waitForTimeout(300);
  await melete.click('[data-x="lvset"]'); await page.waitForTimeout(500);
  await page.click('[data-x="lvmidev"]'); await page.waitForTimeout(500);
  await expect(page.locator('[data-md=""]')).toHaveCount(1);
  await page.click('[data-md=""]'); await page.waitForTimeout(300);
  void errors;
});

// PDF для печати и Guitar Pro (слово автора 22.11.2026)
test('табы: выгрузка в PDF и Guitar Pro', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await melete.open();
  await melete.tools({ notes: { live: { src: 'midi', metro: false, inst: 'guitar' } }, wsMap: { free: { layout: 'HH', panes: ['notes', 'piano'], focus: 0, sub: {}, ratio: 0.72 } } });
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session .pane', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.click('[data-x="lvnew"]'); await page.waitForTimeout(300);
  await melete.click('[data-x="lvrec"]'); await page.waitForTimeout(400);
  for (const m of [64, 67, 71, 69]) {
    const c = await melete.centre('.pane[data-tool="piano"] [data-m="' + m + '"]', 0.5, 0.85);
    await page.mouse.move(c[0], c[1]); await page.mouse.down(); await page.waitForTimeout(260); await page.mouse.up(); await page.waitForTimeout(80);
  }
  await melete.click('[data-x="lvstop"]');
  await page.waitForFunction(() => document.querySelectorAll('.atsurf text').length > 5, null, { timeout: 20_000 });
  await page.waitForTimeout(1500);
  const get = async (k) => {
    await melete.click('[data-x="lvshare"]'); await page.waitForTimeout(400);
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30_000 }), page.click('[data-k="' + k + '"]')]);
    const fs = await import('node:fs'); const buf = fs.readFileSync(await d.path());
    return { name: d.suggestedFilename(), buf };
  };
  const pdf = await get('pdf');
  expect(pdf.buf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.buf.length).toBeGreaterThan(8000);
  expect(pdf.buf.toString('latin1')).toContain('/Count 1');
  if (process.env.PDF_OUT) (await import('node:fs')).writeFileSync(process.env.PDF_OUT, pdf.buf);
  const gp = await get('gp');
  expect(gp.buf.subarray(0, 2).toString()).toBe('PK');
  expect(errors).toEqual([]);
});
