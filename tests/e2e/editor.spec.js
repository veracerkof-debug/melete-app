// Редактор нот и табов (слово автора 22.11.2026): стан на весь экран, ввод одной полосой, жесты, такты, техники, дорожки.
import { test, expect } from './melete.js';
import { writeFileSync } from 'node:fs';
const SHOT = process.env.ED_SHOTS || '';

async function openEditor(page, melete, inst = 'guitar') {
  await melete.open();
  await melete.tools({ notes: { live: { src: 'midi', metro: false, inst: 'guitar' } }, wsMap: { free: { layout: 'HH', panes: ['notes', 'piano'], focus: 0, sub: {}, ratio: 0.72 } } });
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session .pane', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.click('[data-x="lvblank"]'); await page.waitForTimeout(400);
  await page.click('.sheet [data-k="' + inst + '"]');
  await page.waitForSelector('.ned .nedscore svg', { timeout: 20_000 });
  await page.waitForTimeout(1200);
}
const shot = async (page, n) => { if (SHOT) await page.screenshot({ path: SHOT + '/' + n + '.png' }); };

test('редактор: гитара — табы и ноты на весь экран, лад на струне, длительность, отмена', async ({ page, melete, errors }) => {
  test.setTimeout(150_000);
  await openEditor(page, melete);
  await shot(page, 'e1');
  // стан занимает большую часть окна (первый принцип: пространство работает на функцию)
  const sb = await page.locator('.nedscore').boundingBox(), vh = page.viewportSize().height;
  expect(sb.height).toBeGreaterThan(vh * 0.4);
  await expect(page.locator('.edfret .lvfc').first()).toBeVisible();
  // 1/8 → нота на струне и ладе, курсор уходит дальше
  await page.click('[data-e="dur"][data-d="8"]');
  await page.locator('.edfret .lvfc[data-s="4"][data-f="3"]').dispatchEvent('pointerdown', { pointerId: 1, isPrimary: true, clientX: 100, clientY: 500 }).catch(() => {});
  const c = await page.locator('.edfret .lvfc[data-s="4"][data-f="3"]').boundingBox();
  await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2); await page.waitForTimeout(500);
  await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2); await page.waitForTimeout(700);
  await shot(page, 'e2');
  const doc = async () => page.evaluate(() => new Promise((res) => { const r = indexedDB.open('practice-audio'); r.onsuccess = () => { const q = r.result.transaction('tracks', 'readonly').objectStore('tracks').getAll(); q.onsuccess = () => res(q.result.filter((x) => x.ed).map((x) => JSON.parse(x.ed))[0] || null); }; }));
  await page.waitForTimeout(1200);
  const d = await doc();
  expect(d).not.toBeNull();
  const beats = d.tracks[0].staves[0].bars[0].voices[0].beats;
  expect(beats[0].notes[0]).toMatchObject({ string: 4, fret: 3 });
  expect(beats[1].notes.length).toBe(1);
  await page.click('[data-e="undo"]'); await page.waitForTimeout(400);
  await expect(page.locator('[data-e="redo"]')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('редактор: пианино — нота жестом (вверх — октава), техники, выбор тактов удержанием, вставка, дорожка', async ({ page, melete, errors }) => {
  test.setTimeout(180_000);
  await openEditor(page, melete, 'keys');
  await expect(page.locator('.edpiano .lvpk').first()).toBeVisible();
  const doc = async () => page.evaluate(() => new Promise((res) => { const r = indexedDB.open('practice-audio'); r.onsuccess = () => { const q = r.result.transaction('tracks', 'readonly').objectStore('tracks').getAll(); q.onsuccess = () => res(q.result.filter((x) => x.ed).map((x) => JSON.parse(x.ed))[0] || null); }; }));
  // C4 (m=60) касанием; следующая — свайпом вверх на ту же клавишу — октава выше
  const key = page.locator('.edpiano .lvpk[data-m="60"]');
  const kb = await key.boundingBox();
  await page.mouse.click(kb.x + kb.width / 2, kb.y + kb.height - 8); await page.waitForTimeout(400);
  await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height - 8); await page.mouse.down(); await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height - 60, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(500);
  await shot(page, 'k1');
  await page.waitForTimeout(1200);
  let d = await doc();
  const bs = d.tracks[0].staves[0].bars[0].voices[0].beats;
  expect(bs[0].notes[0]).toMatchObject({ octave: 5, tone: 0 }); // C4
  expect(bs[1].notes[0]).toMatchObject({ octave: 6, tone: 0 }); // C5: вверх — октава
  // техники: курсор на ноте (шаг назад), панель приёмов
  await page.click('[data-e="prev"]'); await page.waitForTimeout(200);
  await page.click('[data-e="techp"]'); await page.waitForTimeout(300);
  await shot(page, 'k2');
  await expect(page.locator('[data-e="tech"][data-k="stac"]')).toBeEnabled();
  await page.click('[data-e="tech"][data-k="stac"]'); await page.waitForTimeout(600);
  await expect(page.locator('[data-e="tech"][data-k="stac"].on')).toHaveCount(1);
  await page.click('[data-e="techp"]');
  // удержание на стане — выбор такта; копировать, вставить после
  const sb = await page.locator('.nedscore').boundingBox();
  await page.mouse.move(sb.x + 120, sb.y + 90); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up(); await page.waitForTimeout(400);
  await expect(page.locator('[data-e="bar"][data-k="copy"]')).toBeVisible();
  await shot(page, 'k3');
  await page.click('[data-e="bar"][data-k="copy"]'); await page.waitForTimeout(200);
  await page.click('[data-e="bar"][data-k="paste"]'); await page.waitForTimeout(900);
  await page.click('[data-e="bar"][data-k="done"]'); await page.waitForTimeout(800);
  d = await doc();
  expect(d.masterbars.length).toBe(5);
  expect(d.tracks[0].staves[0].bars[1].voices[0].beats[0].notes[0]).toMatchObject({ octave: 5, tone: 0 });
  // вторая дорожка — гитара
  await page.click('.edtr'); await page.waitForTimeout(400);
  await page.click('.sheet [data-k="add"][data-i="guitar"]'); await page.waitForTimeout(1200);
  await expect(page.locator('.edfret')).toBeVisible();
  await shot(page, 'k4');
  expect(errors).toEqual([]);
});

test('редактор: касание стана ставит курсор, свёрнутая панель отдаёт место стану, закрытие сохраняет файл и открывает просмотр', async ({ page, melete, errors }) => {
  test.setTimeout(150_000);
  await openEditor(page, melete, 'guitar');
  const sb = await page.locator('.nedscore').boundingBox();
  // касание по третьему такту (стан — вторая строка): курсор переехал
  const before = await page.locator('#edPos').textContent();
  await page.mouse.click(sb.x + sb.width * 0.55, sb.y + 90); await page.waitForTimeout(500);
  const after = await page.locator('#edPos').textContent();
  expect(after).not.toBe(before);
  // «свернуть» — панель ввода уходит, стан больше
  const h0 = (await page.locator('.nedscore').boundingBox()).height;
  await page.click('[data-e="fold"]'); await page.waitForTimeout(400);
  const h1 = (await page.locator('.nedscore').boundingBox()).height;
  expect(h1).toBeGreaterThan(h0 + 150);
  await expect(page.locator('.edfret')).toHaveCount(0);
  await page.click('[data-e="fold"]'); await page.waitForTimeout(300);
  // нота и закрытие: файл есть в списке «Табов», просмотр открыт
  const c = await page.locator('.edfret .lvfc[data-s="3"][data-f="5"]').boundingBox();
  await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2); await page.waitForTimeout(500);
  await page.click('[data-e="close"]'); await page.waitForTimeout(1500);
  await expect(page.locator('.ned')).toHaveCount(0);
  await expect(page.locator('[data-x="ted"]')).toHaveCount(1); // просмотр с кнопкой «Править ноты»
  expect(errors).toEqual([]);
});
