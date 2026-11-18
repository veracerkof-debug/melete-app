// Витрина (PW_MODE=showcase, `vite --mode showcase`): после первого посева есть демонстрационный пульт выступления
// (День студента: номера, метки, банки падов со звуками, шумы) и проект студии. Остальное — выдуманный музыкант (src/showcase/main.js)
import { test, expect } from './melete.js';

test.skip(process.env.PW_MODE !== 'showcase', 'только в сборке витрины (PW_MODE=showcase)');

test('витрина: пульт выступления с готовым набором и проект студии', async ({ page, errors }) => {
  await page.goto('/');
  // первый заход: посев песен, файлов и пульта, затем перезапуск (до минуты: синтез звуков и разбор)
  await page.waitForFunction(() => ['show', 'studio', 'ear', 'beat', 'vocal', 'looper', 'voice'].every((id) => localStorage.getItem('showcase.seed.' + id + '.v1') === '1') && localStorage.getItem('showcase.seeded.v1') === '1', null, { timeout: 90_000 });
  await page.waitForTimeout(2500);
  const tools = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools') || '{}'));
  const sh = tools.show;
  expect(sh.events[0].title).toMatch(/День студента|Student Day|Talaba kuni/);
  expect(sh.events[0].numbers.length).toBe(7);
  expect(sh.events[0].numbers.filter((n) => n.kind === 'track' && n.file).length).toBe(3);
  expect(sh.banks.some((b) => b.pads.filter((p) => p && p.file).length >= 5)).toBe(true);
  expect(sh.noises.length).toBe(3);
  const ids = [...sh.banks.flatMap((b) => b.pads.filter((p) => p && p.file).map((p) => p.file)), ...sh.noises.map((n) => n.file)];
  expect(new Set(ids).size).toBe(ids.length); // у каждого звука свой файл (раньше подряд созданные получали один id)
  // слух, ритм, вокал — статистика и курс; лупер и диктофон — записи в медиатеке
  const set = (await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1') || '{}'))).settings;
  expect(Object.keys(set.ear.days).length).toBeGreaterThan(20); expect(Object.keys(set.ear.course.done).length).toBeGreaterThan(0);
  expect(Object.keys(set.beat.days).length).toBeGreaterThan(20); expect(set.vocal.log.length).toBeGreaterThan(20); expect(set.vocal.range.hi).toBeGreaterThan(set.vocal.range.lo);
  const names = await page.evaluate(async () => {
    const out = [];
    for (const info of await indexedDB.databases()) {
      const db = await new Promise((res) => { const r = indexedDB.open(info.name.replace(/^melete-show:/, '')); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
      if (!db) continue;
      for (const st of [...db.objectStoreNames]) { const rows = await new Promise((res) => { const rq = db.transaction(st).objectStore(st).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => res([]); }); rows.forEach((x) => x && x.name && out.push(String(x.name))); }
      db.close();
    }
    return out;
  });
  expect(names.some((n) => /(Лупер|Looper)/.test(n))).toBe(true); expect(names.some((n) => /(диктофон|recorder)/i.test(n))).toBe(true);
  expect(errors.filter((e) => !/Failed to load resource|404/.test(String(e)))).toEqual([]);
});
