// Проекты студии — в своей базе IndexedDB melete-proj (store.js, projstore.js): старые данные переезжают из
// practice.v1, после перезагрузки проект на месте и открывается, правка доходит до базы.
import { test, expect } from './melete.js';

const idb = (page) => page.evaluate(() => new Promise((res, rej) => {
  const r = indexedDB.open('melete-proj', 1);
  r.onsuccess = () => { const db = r.result; const q = db.transaction('projects').objectStore('projects').getAll(); q.onsuccess = () => { db.close(); res(q.result); }; q.onerror = () => rej(q.error); };
  r.onerror = () => rej(r.error);
}));

test('проекты: переезд из practice.v1 в свою базу, перезагрузка, правка', async ({ page, melete, errors }) => {
  await melete.open();
  await page.evaluate(async () => {
    const P = await import('/src/music/project.js');
    const p = P.newProject(); p.name = 'Переезд'; p.id = 'pmove'; p.updatedAt = 1000;
    const s = JSON.parse(localStorage.getItem('practice.v1')); s.projects = [p]; localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  expect((await idb(page)).map((p) => p.id)).toEqual(['pmove']);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).projects)).toBeUndefined();
  expect(await page.evaluate(() => window.__melete.store.projMode)).toBe('side');
  // после ещё одной перезагрузки — из базы, в студии виден
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('tools');
  await melete.click('[data-open-tool="studio"]'); await page.waitForTimeout(1200);
  await expect(page.locator('.tview .stproj')).toHaveCount(1);
  await expect(page.locator('.tview .stproj')).toContainText('Переезд');
  // правка через ctx.projects доходит до базы
  await page.evaluate(async () => {
    const app = window.__melete, p = app.store.state.projects.find((x) => x.id === 'pmove');
    p.name = 'После правки'; p.updatedAt = Date.now(); app.store.projectChanged(p.id); app.store.save(); await app.store.flush();
  });
  expect((await idb(page))[0].name).toBe('После правки');
  expect(errors).toEqual([]);
});
