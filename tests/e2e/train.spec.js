// «Слух» и «Ритм»: с 06.11 были главами одного инструмента, с 11.11.2026 (слово автора) — снова отдельные.
import { test, expect } from './melete.js';

test('слух и ритм: снова два инструмента; места «Слуха и ритма» переходят к обоим', async ({ page, melete, errors }) => {
  await melete.open({ settings: { quick: ['metro', 'train'], trainSplit: false } }); // как у версий 06–11.11
  expect((await melete.settings()).quick).toEqual(['metro', 'ear', 'beat']);
  await melete.tab('tools');
  await expect(page.locator('.tgrid [data-open-tool="ear"]')).toHaveCount(1);
  await expect(page.locator('.tgrid [data-open-tool="beat"]')).toHaveCount(1);
  await expect(page.locator('.tgrid [data-open-tool="train"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('учёба в занятии: окно «Ритма» на экране — время идёт в блок «Учёба»', async ({ page, melete, errors }) => {
  await melete.open({ settings: { study: { goals: { beat: 30 } } } });
  await melete.free('HH', ['beat', 'metro']);
  await page.waitForTimeout(3500);
  const ms = await page.evaluate(() => (window.__melete.active.study || {}).beat || 0);
  expect(ms).toBeGreaterThan(2000);
  expect(errors).toEqual([]);
});

// Смахивание между страницами инструмента (автор 06.11.2026): влево — следующая, вправо — предыдущая
test('смахивание: страницы «Теории»', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.tab('tools');
  await melete.click('[data-open-tool="theory"]'); await page.waitForTimeout(900);
  // определитель по умолчанию выключен (06.11.2026): ни вкладки, ни ⋯
  await expect(page.locator('.tview .tswb[data-v="find"], .tview .tsets')).toHaveCount(0);
  const sec = () => page.evaluate(() => document.querySelector('.tview .tswb.on')?.dataset.v);
  const s0 = await sec();
  await melete.swipe('.tview .cbody', -160, 0, { fy: 0.4 });
  expect(await sec()).not.toBe(s0);
  await melete.swipe('.tview .cbody', 160, 0, { fy: 0.4 }); // гриф прокручивается вбок — здесь страница не листается
  expect(await sec()).not.toBe(s0);
  await melete.swipe('.tview .cbody', 160, 0, { fy: 0.85 });
  expect(await sec()).toBe(s0);
  expect(errors).toEqual([]);
});
