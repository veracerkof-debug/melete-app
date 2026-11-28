// Вид для новичка внутри инструментов (макеты Н4–Н8): метроном, тюнер, ноты, диктофон, учебник
import { test as base, expect } from './melete.js';

// Свой сборщик ошибок: в песочнице без сети внешние запросы дают 403 (не ошибка приложения)
const test = base.extend({
  errs: async ({ page }, use) => {
    const list = [];
    page.on('pageerror', (e) => list.push('page: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/403|favicon|Autoplay|ERR_BLOCKED|AudioContext/i.test(m.text())) list.push('console: ' + m.text().slice(0, 300)); });
    await use(list);
  },
});

const BEG = { profile: { name: 'A', instruments: ['guitar'], level: 'beginner', priorHours: 0, createdAt: 1760000000000 } };
async function openTool(page, melete, id, settings = BEG) {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: { ...settings } });
  await melete.tab('tools');
  await page.evaluate((id) => document.querySelector('[data-open-tool="' + id + '"]').click(), id);
  await page.waitForTimeout(1200);
}

test('метроном новичка: макет Н4, темп, размер, старт и стоп', async ({ page, melete, errs }) => {
  await openTool(page, melete, 'metro');
  await expect(page.locator('.nmv')).toBeVisible();
  await expect(page.locator('.nmv .nbpm')).toBeVisible();
  expect(await page.locator('.nmv .nbeats .beat').count()).toBe(4);
  expect(await page.locator('.nmv .nstp').count()).toBe(4);
  await expect(page.locator('.nmv .nsl')).toBeVisible();
  const b0 = +(await page.locator('#bpm').textContent());
  await page.locator('.nstp[data-hold="5"]').dispatchEvent('pointerdown');
  await page.evaluate(() => window.dispatchEvent(new Event('pointerup')));
  await page.waitForTimeout(200);
  expect(+(await page.locator('#bpm').textContent())).toBe(b0 + 5);
  await expect(page.locator('#nsl')).toHaveValue(String(b0 + 5));
  await page.screenshot({ path: 'test-results/nb-metro.png' });
  await page.click('.nstart'); await page.waitForTimeout(1500);
  await expect(page.locator('.nstart')).toHaveText('Стоп');
  await page.screenshot({ path: 'test-results/nb-metro-run.png' });
  await page.click('.nstart'); await page.waitForTimeout(300);
  await expect(page.locator('.nstart')).toHaveText('Старт');
  expect(errs).toEqual([]);
});

test('метроном любителя прежний: кольцо', async ({ page, melete, errs }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.tab('tools');
  await page.evaluate(() => document.querySelector('[data-open-tool="metro"]').click());
  await page.waitForTimeout(1000);
  await expect(page.locator('.nmv')).toHaveCount(0);
  await expect(page.locator('.mwheel')).toBeVisible();
  void errs;
});

test('тюнер новичка: макет Н5, нота, шкала, шесть струн, подсказка', async ({ page, melete, errs }) => {
  await openTool(page, melete, 'tuner');
  await expect(page.locator('.tbeg')).toBeVisible();
  await expect(page.locator('.tbeg #tnote')).toBeVisible();
  await expect(page.locator('.tbeg .tbar')).toBeVisible();
  expect(await page.locator('.tbeg .tsb').count()).toBe(6);
  await expect(page.locator('#tbhint')).toContainText('струны 6');
  await page.screenshot({ path: 'test-results/nb-tuner.png' });
  expect(errs).toEqual([]);
});

test('диктофон новичка: макет Н7, запись и остановка, запись в списке', async ({ page, melete, errs }) => {
  await openTool(page, melete, 'voice');
  await expect(page.locator('.vbeg')).toBeVisible();
  expect(await page.locator('.vbeg .vbvu i').count()).toBe(16);
  await expect(page.locator('.vbeg #vc-time')).toHaveText('00:00');
  await page.screenshot({ path: 'test-results/nb-voice.png' });
  await page.click('.vbrec'); await page.waitForTimeout(2600);
  await expect(page.locator('.vbrec.on')).toBeVisible();
  await expect(page.locator('.vbeg #vc-time')).not.toHaveText('00:00');
  await page.screenshot({ path: 'test-results/nb-voice-rec.png' });
  await page.click('.vbrec'); await page.waitForTimeout(2500);
  await expect(page.locator('.vbeg #vblist .nli')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/nb-voice-done.png' });
  await page.click('#vblist [data-rplay]'); await page.waitForTimeout(600);
  expect(errs).toEqual([]);
});

test('учебник новичка: макет Н8, «Пройдено N из M», список уроков, весь учебник', async ({ page, melete, errs }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: BEG });
  await melete.tools({ book: { book: { done: { g1: 1, g2: 1 } } } });
  await melete.openTool('book');
  await page.waitForSelector('.book', { timeout: 15_000 });
  await expect(page.locator('.bgwrap .ncard')).toContainText('2 из 42');
  expect(await page.locator('.bgwrap .nli').count()).toBeGreaterThanOrEqual(20);
  await expect(page.locator('.bgwrap .nstep.d')).toHaveCount(2);
  await expect(page.locator('.bgwrap .nli.now')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/nb-book.png' });
  await page.click('[data-bfull="1"]');
  await expect(page.locator('.book .bcard').first()).toBeVisible();
  await page.click('[data-bfull="0"]');
  await expect(page.locator('.bgwrap')).toBeVisible();
  await page.click('.bgwrap .nli.now'); await page.waitForTimeout(800);
  await expect(page.locator('.bklex, .bktext').first()).toBeVisible();
  expect(errs).toEqual([]);
});

test('ноты новичка: макет Н6, аккорды и табы, песни, метроном', async ({ page, melete, errs }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const songs = [
    { id: 's1', title: "Knockin' on Heaven's Door", artist: 'Dylan', key: 'G', targetBpm: 68, masteryPct: 60, notes: '[G]Mama, take this [D]badge\n[Am]off of me', createdAt: 1, updatedAt: 1 },
    { id: 's2', title: 'Три аккорда', artist: '', targetBpm: 60, notes: '[Em]la [Am]la [D]la', createdAt: 2, updatedAt: 2 },
    { id: 's3', title: 'Без текста', artist: '', createdAt: 3, updatedAt: 3 },
  ];
  await melete.open({ settings: BEG, songs });
  await melete.tab('tools');
  await page.evaluate(() => document.querySelector('[data-open-tool="notes"]').click());
  await page.waitForTimeout(1200);
  await expect(page.locator('.nbeg .nseg button')).toHaveCount(2);
  await expect(page.locator('.nbcard')).toContainText('Heaven');
  await expect(page.locator('.nbcard')).toContainText('68 bpm');
  await expect(page.locator('.nbcard .chd').first()).toBeVisible();
  expect(await page.locator('.nbeg .nli').count()).toBe(2);
  await page.screenshot({ path: 'test-results/nb-notes.png' });
  await page.click('.nli[data-id="s2"]'); await page.waitForTimeout(300);
  await expect(page.locator('.nbcard')).toContainText('Три аккорда');
  await page.click('[data-x="nbmetro"]'); await page.waitForTimeout(900);
  await expect(page.locator('.nmv .nbpm')).toHaveText('60');
  expect(errs).toEqual([]);
});
