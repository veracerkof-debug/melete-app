// Табы и тексты: капо — кнопка, шторка 0…7, аккорды формами ниже, удержание снимает; сохраняется в песне
import { test, expect } from './melete.js';

test('капо', async ({ page, melete, errors }) => {
  const songs = [{ id: 's1', title: 'Песня', key: 'G', notes: 'G       C\nСлово ещё\n', created: Date.now() }];
  await melete.open({ songs, tools: { notes: { sec: 'text', textPick: { id: 's1', sess: null } } } });
  await melete.free('F', ['notes']);
  expect(await melete.count('[data-x="ncapo"]')).toBe(1);
  await melete.click('[data-x="ncapo"]'); await page.waitForTimeout(400);
  expect(await melete.count('[data-capo]')).toBe(8);
  await melete.click('[data-capo="3"]'); await page.waitForTimeout(400);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).songs[0].capo)).toBe(3);
  expect(await melete.text('[data-x="ncapo"]')).toContain('3');
  await melete.hold('[data-x="ncapo"]');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).songs[0].capo || 0)).toBe(0);
  expect(errors).toEqual([]);
});

// Ступени в тексте песни (слово автора 22.11.2026): три вида, подсветка при наборе, непонятое — красным
test('ступени: вид «аккорд и ступень», редактор подсвечивает римские цифры и опечатки', async ({ page, melete, errors }) => {
  const songs = [{ id: 's1', title: 'Песня', key: 'C', notes: 'I   V   vi  IIII\nСвя[IV]той [Vv] [x2]\n', created: Date.now() }];
  await melete.open({ songs, tools: { notes: { sec: 'text', textPick: { id: 's1', sess: null } } } });
  await melete.free('F', ['notes']);
  await expect(page.locator('.lyr .chd.bad')).toHaveCount(2); // IIII и [Vv]
  await expect(page.locator('.lyr .chd:not(.bad)').first()).toHaveText('C');
  // три вида по кругу: аккорды → ступени → вместе
  await melete.click('[data-x="nview"]'); await page.waitForTimeout(300);
  await expect(page.locator('.lyr .chd:not(.bad)').first()).toHaveText('I');
  await melete.click('[data-x="nview"]'); await page.waitForTimeout(300);
  await expect(page.locator('.lyr .chd.both').first()).toContainText('CI');
  // редактор: подсветка под текстом и счётчик непонятого
  await melete.click('[data-x="nedit"]'); await page.waitForTimeout(500);
  await expect(page.locator('#lhl mark.c').first()).toBeVisible();
  await expect(page.locator('#lhl mark.x')).toHaveCount(2);
  await expect(page.locator('#lbad')).toBeVisible();
  await page.fill('#lta', 'I IV\nа [vi] [Vv]'); await page.waitForTimeout(200);
  await expect(page.locator('#lhl mark.c')).toHaveCount(3);
  await expect(page.locator('#lhl mark.x')).toHaveCount(1);
  if (process.env.ED_SHOTS) await page.screenshot({ path: process.env.ED_SHOTS + '/deg.png' });
  expect(errors).toEqual([]);
});

// Замена записи и угаданная тональность (слово автора 22.11.2026)
test('ступени: замена аккордов ступенями в редакторе, угаданная тональность помечена', async ({ page, melete, errors }) => {
  const songs = [{ id: 's1', title: 'Песня', notes: 'Am   F   C   G\nСвя[Dm]той\n', created: Date.now() }]; // тональность не задана
  await melete.open({ songs, tools: { notes: { sec: 'text', textPick: { id: 's1', sess: null } } } });
  await melete.free('F', ['notes']);
  await expect(page.locator('.trkey.guess')).toHaveCount(1); // «≈ Am» — угадана по аккордам
  await melete.click('[data-x="nedit"]'); await page.waitForTimeout(500);
  await page.click('[data-cv="deg"]'); await page.waitForTimeout(200);
  expect(await page.inputValue('#lta')).toBe('i    VI  III VII\nСвя[iv]той\n');
  await page.click('[data-cv="chords"]'); await page.waitForTimeout(200);
  expect(await page.inputValue('#lta')).toBe('Am   F   C   G\nСвя[Dm]той\n');
  await page.click('[data-cv="deg"]'); await page.click('#lsave'); await page.waitForTimeout(500);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).songs[0].notes)).toContain('VII');
  expect(errors).toEqual([]);
});
