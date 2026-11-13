// Вокал (DECISIONS 2026-11-13 «Вокал»): распевка по диапазону с нотами шага, выбор из библиотеки и программы,
// голос (тип без проверки, правка края), импровизация над дроном, своё расписание инструмента, размеры окна.
import { test, expect } from './melete.js';

test('вокал: распевка — ноты шага и шаги по диапазону, выбор упражнения, программа', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['vocal']);
  await expect(page.locator('.vc .vcstaff .bkscore')).toHaveCount(1); // ноты шага видны и до начала
  await expect(page.locator('.vcov b')).toHaveText('Губная трель по пяти ступеням');
  await page.locator('.vcbar [data-x="play"]').click(); await page.waitForTimeout(1500);
  await expect(page.locator('#vcsub')).toContainText('Шаг 1 из');
  const playingVoices = await page.evaluate(() => window.__melete.audio.synth.voiceCount);
  expect(playingVoices).toBeGreaterThan(0); // аккорд и тоника звучат
  await page.locator('.vcbar [data-x="play"]').click(); await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__melete.audio.synth.voiceCount)).toBe(0); // «Стоп» снимает и запланированные наперёд ноты
  // библиотека: другое упражнение
  await page.locator('.vcbar [data-x="list"]').click(); await page.waitForTimeout(500);
  await page.locator('.sheet [data-ex="mimema"]').click(); await page.waitForTimeout(400);
  await expect(page.locator('.vcov b')).toHaveText('Ми-мэ-ма-мо-му');
  await expect(page.locator('.vcstaff .st').first()).toHaveText('ми');
  // «вперёд» — следующее упражнение
  await page.locator('.vcbar [data-x="next"]').click(); await page.waitForTimeout(300);
  await expect(page.locator('.vcov b')).toHaveText('Гласные на одной ноте');
  // программа: первое упражнение без высоты (дыхание) — отсчёт фаз
  await page.locator('.vcbar [data-x="list"]').click(); await page.waitForTimeout(500);
  await page.locator('.sheet [data-prog="morning"]').click(); await page.waitForTimeout(1200);
  await expect(page.locator('#vcfree b')).toHaveText('Вдох');
  await expect(page.locator('#vcsub')).toContainText('Утро · 1 из 6');
  await page.locator('.vcbar [data-x="play"]').click();
});

test('вокал: голос — тип без проверки, правка края, импровизация, расписание', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['vocal']);
  await page.locator('[data-seg="vcsec"] [data-v="voice"]').click(); await page.waitForTimeout(300);
  await page.locator('.vctypes [data-type="tenor"]').click(); await page.waitForTimeout(300);
  await expect(page.locator('.vcrl .lab').first()).toHaveText('E♭3'); // удобная часть тенора: C3+3 … C5−3
  await page.locator('[data-adj="hi:1"]').click(); await page.waitForTimeout(300);
  const r = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).settings.vocal);
  expect([r.type, r.range.lo, r.range.hi]).toEqual(['tenor', 51, 70]);
  await expect(page.locator('.vcv .typ').first()).toContainText('Вероятно');
  // импровизация: дрон и микрофон включаются и выключаются без ошибок
  await page.locator('[data-seg="vcsec"] [data-v="improv"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-x="pcup"]').click();
  await expect(page.locator('[data-x="scale"]')).toContainText('D♭ · Мажор');
  await page.locator('[data-x="imgo"]').click(); await page.waitForTimeout(1500);
  await page.locator('[data-x="imgo"]').click(); await page.waitForTimeout(300);
  // своё расписание вокала: шторка занятия с выбранным инструментом → занятие с tool в «Неделе»
  await page.locator('[data-seg="vcsec"] [data-v="warm"]').click(); await page.waitForTimeout(300);
  await page.locator('.vcbar [data-x="set"]').click(); await page.waitForTimeout(500);
  await page.locator('.sheet [data-sched]').click(); await page.waitForTimeout(800);
  await expect(page.locator('.sheet [data-ptool]')).toHaveValue('vocal');
  await page.locator('.sheet [data-psave]').click(); await page.waitForTimeout(500);
  const slots = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).settings.plan.slots);
  expect(slots.some((s) => s.tool === 'vocal' && s.from === '19:00')).toBe(true);
});

test('вокал: четверть и полоска — распевка помещается', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('QQ', ['vocal', 'metro']);
  const q = page.locator('.vc.quarter');
  await expect(q.locator('.vcbar [data-x="play"]')).toBeVisible();
  await expect(q.locator('.vcbar [data-x="list"]')).toBeHidden();
  const pane = await q.boundingBox(), bar = await q.locator('.vcbar').boundingBox();
  expect(bar.x + bar.width).toBeLessThanOrEqual(pane.x + pane.width + 1);
  await melete.free('SS', ['metro', 'vocal']);
  await expect(page.locator('.vc .bigplay').first()).toBeVisible();
});
