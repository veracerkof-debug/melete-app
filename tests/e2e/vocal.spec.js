// Вокал (DECISIONS «Вокал» 13.11 и 14.11.2026): сначала диапазон (тип или проверка), рабочий и физический, уровни распевок,
// ноты шага, свой дрон импровизации (пэды не трогаются, всё стихает), автоопределение лада по «голосу», расписание, размеры.
import { test, expect } from './melete.js';

const voices = () => page => page.evaluate(() => { const a = window.__melete.audio; return { pads: a.drone.sounding, voices: a.synth.voiceCount, vocal: a.synth.active('vocal') }; });

test('вокал: сначала диапазон — без него распевок нет; по типу; края; уровни; ноты шага', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['vocal']);
  await expect(page.locator('.vcv .card.first h3')).toHaveText('Сначала — диапазон голоса');
  await expect(page.locator('[data-seg="vcsec"]')).toHaveCount(0);
  await page.locator('.vctypes [data-type="tenor"]').click(); await page.waitForTimeout(300);
  const r = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).settings.vocal.range);
  expect([r.lo, r.hi, r.plo, r.phi]).toEqual([51, 69, 48, 72]); // рабочий — без крайних терций, физический — ориентир тенора
  // край: «Раб. верх» выше на полутон
  await page.locator('[data-edge="hi"]').click();
  await page.locator('[data-adj="1"]').click(); await page.waitForTimeout(200);
  await expect(page.locator('[data-edge="hi"] b')).toHaveText('B♭4');
  // физический не уже рабочего: рабочий верх выше физического тянет его за собой
  for (let i = 0; i < 3; i++) await page.locator('[data-adj="1"]').click();
  await expect(page.locator('[data-edge="phi"] b')).toHaveText('C♯5'.replace('C♯', 'D♭'));
  // распевки: лёгкое по умолчанию, ноты шага, звук и «Стоп»
  await page.locator('[data-seg="vcsec"] [data-v="warm"]').click(); await page.waitForTimeout(300);
  await expect(page.locator('.vcov b')).toContainText('Мычание');
  await expect(page.locator('.vcstaff .bkscore')).toHaveCount(1);
  await page.locator('.vcbar [data-x="play"]').click(); await page.waitForTimeout(1500);
  await expect(page.locator('#vcsub')).toContainText('Шаг 1 из');
  expect((await voices()(page)).vocal).toBe(true);
  await page.locator('.vcbar [data-x="play"]').click(); await page.waitForTimeout(500);
  expect((await voices()(page)).voices).toBe(0);
  // список: уровни, «Основа» первой
  await page.locator('.vcbar [data-x="list"]').click(); await page.waitForTimeout(500);
  await expect(page.locator('.sheet .vcpr button').first()).toContainText('Основа');
  await expect(page.locator('.sheet .hdr')).toContainText(['Программы', 'Основа', 'Дальше', 'Сложнее']);
  await page.locator('.sheet [data-ex="mimema"]').click(); await page.waitForTimeout(400);
  await expect(page.locator('.vcstaff .st').first()).toHaveText('ми');
  // программа: дыхание без нот — отсчёт фаз
  await page.locator('.vcbar [data-x="list"]').click(); await page.waitForTimeout(500);
  await page.locator('.sheet [data-prog="base"]').click(); await page.waitForTimeout(1200);
  await expect(page.locator('#vcfree b')).toHaveText('Вдох');
  await expect(page.locator('#vcsub')).toContainText('Основа · 1 из 6');
  await page.locator('.vcbar [data-x="play"]').click();
});

test('вокал: импровизация — свой дрон, пэды не трогаются, после неё распевка звучит; расписание', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['vocal']);
  await page.locator('.vctypes [data-type="bari"]').click(); await page.waitForTimeout(200);
  await page.locator('[data-seg="vcsec"] [data-v="improv"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-x="imgo"]').click(); await page.waitForTimeout(1500);
  let v = await voices()(page);
  expect([v.pads, v.voices]).toEqual([false, 2]); // тоника и квинта на шине «Вокал»
  await page.locator('[data-seg="vcsec"] [data-v="warm"]').click(); await page.waitForTimeout(400);
  await page.locator('.vcbar [data-x="play"]').click(); await page.waitForTimeout(1500);
  v = await voices()(page);
  expect(v.vocal).toBe(true);
  await page.locator('.vcbar [data-x="play"]').click(); await page.waitForTimeout(3500); // хвост дрона затихает
  expect((await voices()(page)).voices).toBe(0);
  // лады: ручной выбор
  await page.locator('[data-seg="vcsec"] [data-v="improv"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-x="scale"]').click(); await page.waitForTimeout(400);
  await page.locator('.sheet [data-sc="phrygdom"]').click(); await page.waitForTimeout(300);
  await expect(page.locator('[data-x="scale"]')).toContainText('хиджаз');
  // своё расписание вокала
  await page.locator('[data-seg="vcsec"] [data-v="warm"]').click(); await page.waitForTimeout(300);
  await page.locator('.vcbar [data-x="set"]').click(); await page.waitForTimeout(500);
  await page.locator('.sheet [data-sched]').click(); await page.waitForTimeout(800);
  await expect(page.locator('.sheet [data-ptool]')).toHaveValue('vocal');
  await page.locator('.sheet [data-psave]').click(); await page.waitForTimeout(500);
  const slots = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).settings.plan.slots);
  expect(slots.some((s) => s.tool === 'vocal' && s.from === '19:00')).toBe(true);
});

test('вокал: четверть и полоска — распевка помещается; без диапазона — подсказка', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('QQ', ['vocal', 'metro']);
  await expect(page.locator('.vc.quarter .vcneed')).toBeVisible();
  await melete.open({ settings: { vocal: { range: { lo: 48, hi: 64, plo: 45, phi: 67 } } } });
  await melete.free('QQ', ['vocal', 'metro']);
  const q = page.locator('.vc.quarter');
  await expect(q.locator('.vcbar [data-x="play"]')).toBeVisible();
  await expect(q.locator('.vcbar [data-x="list"]')).toBeHidden();
  const pane = await q.boundingBox(), bar = await q.locator('.vcbar').boundingBox();
  expect(bar.x + bar.width).toBeLessThanOrEqual(pane.x + pane.width + 1);
  await melete.free('SS', ['metro', 'vocal']);
  await expect(page.locator('.vc .bigplay').first()).toBeVisible();
});

test('вокал: прогресс — неделя; три дня чисто выше рабочего → «Расширить до …?», согласие расширяет', async ({ page, melete, errors }) => {
  const day = (k) => { const d = new Date(Date.now() - k * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const log = [2, 1, 0].map((k, i) => ({ d: day(k), sec: 300, n: 20, ok: 15, near: 3, cs: -60, cn: 18, hi: 66 + (i % 2), lo: 48, up: 66 + (i % 2), dn: 0, takes: [] }));
  await melete.open({ settings: { vocal: { range: { lo: 48, hi: 64, plo: 45, phi: 69 }, log } } });
  await melete.tools({ vocal: { sec: 'voice' } });
  await melete.free('F', ['vocal']);
  await expect(page.locator('.vcweek')).toBeVisible();
  await expect(page.locator('.vcsug')).toContainText('F♯4'); // самый осторожный из трёх: 66
  await page.locator('[data-x="expyes"]').click(); await page.waitForTimeout(300);
  const r = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).settings.vocal.range);
  expect(r.hi).toBe(66);
  await expect(page.locator('.vcsug')).toHaveCount(0);
});
