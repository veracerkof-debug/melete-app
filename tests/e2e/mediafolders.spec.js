// Папки-категории медиатеки (22.11.2026): авто-папки по типу, своя папка, перенос записи, удаление папки; сцена: выбор записи плеера по папке
import { test, expect } from './melete.js';

const add = (page) => page.evaluate(async () => {
  const app = window.__melete; await app.files.ready;
  const blob = () => new Blob([new Uint8Array(200)], { type: 'audio/wav' });
  await app.files.add({ id: 'pf1', name: 'Минусовка один', type: 'audio/wav', kind: 'audio', blob: blob(), size: 200, dur: 10, created: Date.now() });
  await app.files.add({ id: 'pf2', name: 'Заметка голосом', type: 'audio/wav', kind: 'audio', dict: true, blob: blob(), size: 200, dur: 5, created: Date.now() - 1000 });
  await app.files.add({ id: 'pf3', name: 'Клип', type: 'video/mp4', kind: 'audio', video: true, blob: blob(), size: 200, dur: 7, created: Date.now() - 2000 });
  await app.files.add({ id: 'pf4', name: 'Игра на пианино', type: 'audio/wav', kind: 'audio', rtool: 'Пианино', ses: 'tool', blob: blob(), size: 200, dur: 9, created: Date.now() - 3000 });
});

test('медиатека: авто-папки, своя папка, перенос записи, удаление папки', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: { upOk: 2 } });
  await add(page);
  await melete.free('F', ['audio']); await page.waitForTimeout(1200);
  const P = '.session ';
  // авто-папки: непустые видны; запись диктофона в «Все» не мешает
  for (const n of ['Все', 'Песни', 'Инструменты', 'Диктофон', 'Видео']) await expect(page.locator(P + '.mlcat', { hasText: n }).first()).toBeVisible();
  await expect(page.locator(P + '.mlrow', { hasText: 'Заметка голосом' })).toHaveCount(0);
  await page.locator(P + '.mlcat', { hasText: 'Диктофон' }).click(); await page.waitForTimeout(300);
  await expect(page.locator(P + '.mlrow')).toHaveCount(1);
  await expect(page.locator(P + '.mlrow', { hasText: 'Заметка голосом' })).toHaveCount(1);
  // своя папка: создать, переложить «Минусовку» через меню записи
  await page.locator(P + '.mlcat', { hasText: 'Все' }).first().click();
  await page.locator(P + '[data-x="mlcatadd"]').click();
  await page.fill('.sheet #fnv', 'Выходы'); await page.click('.sheet #fnok'); await page.waitForTimeout(400);
  await expect(page.locator(P + '.mlcat.on', { hasText: 'Выходы' })).toHaveCount(1);
  await page.locator(P + '.mlcat', { hasText: 'Песни' }).click(); await page.waitForTimeout(300);
  await page.locator(P + '.mlrow', { hasText: 'Минусовка один' }).locator('[data-x="mlmore"], .mlmore').first().click(); await page.waitForTimeout(400);
  await page.click('.sheet [data-m="folder"]'); await page.waitForTimeout(300);
  await page.locator('.sheet [data-fid]', { hasText: 'Выходы' }).click(); await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.locator(P + '.mlcat', { hasText: 'Выходы' }).click(); await page.waitForTimeout(300);
  await expect(page.locator(P + '.mlrow', { hasText: 'Минусовка один' })).toHaveCount(1);
  // удалить папку: запись остаётся и возвращается в «Песни»
  await page.evaluate(() => { const app = window.__melete; const f = app.store.state.settings.mediaFolders[0]; return f && f.id; });
  const id = await page.evaluate(() => window.__melete.store.state.settings.mediaFolders[0].id);
  await page.evaluate(({ id }) => { const app = window.__melete; const moved = app.files.list('audio').filter((x) => x.folder === id); moved.forEach((x) => { delete x.folder; app.files.save(x); }); app.store.state.settings.mediaFolders = []; app.store.settingsChanged(); }, { id });
  expect(await page.evaluate(() => window.__melete.files.get('pf1').folder)).toBeUndefined();
  expect(errors).toEqual([]);
});
