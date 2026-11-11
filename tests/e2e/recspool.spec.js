import { test, expect, sleep } from './melete.js';

// Запись в инструментах пишется кусками на диск: страница «упала» посреди записи — после перезапуска
// запись склеивается из кусков и возвращается в медиатеку (recspool.js, recorder.js: recover)
test('запись: оборванная сбоем запись возвращается в медиатеку после перезапуска', async ({ page, melete, errors }) => {
  await melete.open();
  const r = await page.evaluate(async () => {
    const app = window.__melete;
    app.audio.ensure && app.audio.ensure();
    return app.rec.start({ tool: 'Пианино' });
  });
  expect(r).toBe('ok');
  await sleep(page, 3500); // несколько кусков по секунде
  const onDisk = await page.evaluate(() => new Promise((res) => {
    const q = indexedDB.open('melete-rec', 1);
    q.onsuccess = () => { const c = q.result.transaction('chunks').objectStore('chunks').count(); c.onsuccess = () => res(c.result); };
    q.onerror = () => res(-1);
  }));
  expect(onDisk).toBeGreaterThan(0);
  // «сбой»: страница перезагружается без «Стоп»
  await page.reload();
  await expect(page.locator('.toast, [role=status]').filter({ hasText: 'Восстановлена' })).toBeVisible({ timeout: 8000 });
  const got = await page.evaluate(async () => {
    const l = await window.__melete.files.list();
    const x = l.find((f) => f.recovered);
    return x ? { name: x.name, size: x.size } : null;
  });
  expect(got).not.toBeNull();
  expect(got.name).toContain('восстановлено');
  expect(got.size).toBeGreaterThan(0);
  // куски убраны с диска
  const left = await page.evaluate(() => new Promise((res) => {
    const q = indexedDB.open('melete-rec', 1);
    q.onsuccess = () => { const c = q.result.transaction('meta').objectStore('meta').count(); c.onsuccess = () => res(c.result); };
  }));
  expect(left).toBe(0);
  expect(errors).toEqual([]);
});

test('запись: обычный «Стоп» сохраняет запись и не оставляет кусков', async ({ page, melete }) => {
  await melete.open();
  await page.evaluate(() => window.__melete.rec.start({ tool: 'Пэды' }));
  await sleep(page, 2500);
  const rec = await page.evaluate(async () => { const r = await window.__melete.rec.stop(); return r && { name: r.name, size: r.size }; });
  expect(rec).not.toBeNull();
  expect(rec.size).toBeGreaterThan(0);
  const left = await page.evaluate(() => new Promise((res) => {
    const q = indexedDB.open('melete-rec', 1);
    q.onsuccess = () => { const c = q.result.transaction('chunks').objectStore('chunks').count(); c.onsuccess = () => res(c.result); };
  }));
  expect(left).toBe(0);
});
