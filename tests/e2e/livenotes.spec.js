// Ноты и табы с игры (автор 29.10.2026): «Табы» → «С игры», запись с инструмента приложения рядом (пианино в занятии),
// без метронома — темп по игре; после «Стоп» партия сразу в «Табах»; касание ноты — правка (выше, отмена), такты — удалить
import { test, expect } from './melete.js';

test('ноты с игры: запись, файл, правка ноты, отмена, такты', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await melete.open();
  // окно нот — побольше: стан и таб целиком
  await melete.tools({ notes: { live: { src: 'midi', metro: false, inst: 'guitar' } }, wsMap: { free: { layout: 'HH', panes: ['notes', 'piano'], focus: 0, sub: {}, ratio: 0.72 } } });
  await page.waitForSelector('[data-act="free"]', { timeout: 10_000 });
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session .pane', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.click('[data-x="lvnew"]');
  await page.waitForTimeout(300);
  await melete.click('[data-x="lvrec"]');
  await page.waitForTimeout(400);
  for (const m of [64, 66, 67, 69, 71, 69, 67, 66]) {
    const c = await melete.centre('.pane[data-tool="piano"] [data-m="' + m + '"]', 0.5, 0.85);
    await page.mouse.move(c[0], c[1]); await page.mouse.down(); await page.waitForTimeout(260); await page.mouse.up(); await page.waitForTimeout(70);
  }
  await melete.click('[data-x="lvstop"]');
  await page.waitForFunction(() => document.querySelectorAll('.atsurf text').length > 5, null, { timeout: 20_000 });
  await page.waitForTimeout(1500);
  // файл — в «Табах», с партией
  const saved = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('practice-audio'); r.onsuccess = () => { const tx = r.result.transaction('tracks', 'readonly').objectStore('tracks').getAll(); tx.onsuccess = () => res(tx.result.filter((x) => x.fmt === 'live').map((x) => x.live.raw.length)); }; r.onerror = () => res([]); }));
  expect(saved.length).toBe(1);
  expect(saved[0]).toBe(8);
  // касание цифры «5» в табе — нота выбрана
  const five = await page.evaluate(() => { const g = [...document.querySelectorAll('.atsurf text')].find((x) => ['2', '3', '5', '7'].includes(x.textContent.trim()) && x.getAttribute('fill') !== '#C80000'); if (!g) return [...document.querySelectorAll('.atsurf text')].map((x) => x.textContent).join(','); const r = g.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  expect(five).not.toBeNull();
  await page.mouse.click(five[0], five[1]);
  await page.waitForTimeout(500);
  expect(await melete.count('[data-x="lvpitch"]')).toBe(2);
  const before = await melete.text('.lvbar2 .lvv');
  await melete.click('[data-x="lvpitch"][data-d="1"]');
  await page.waitForTimeout(400);
  expect(await melete.text('.lvbar2 .lvv')).not.toBe(before);
  await melete.click('[data-x="lvundo"]');
  await page.waitForTimeout(400);
  expect(await melete.text('.lvbar2 .lvv')).toBe(before);
  await melete.click('[data-x="lvdesel"]');
  await page.waitForTimeout(300);
  // такты: выбор режима — панель тактов, «Удалить» убирает такт 1
  await melete.click('[data-x="lvbars"]');
  await page.waitForTimeout(300);
  expect(await melete.count('[data-x="lvbdel"]')).toBe(1);
  await melete.click('[data-x="lvbdel"]');
  await page.waitForTimeout(1500);
  const left = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('practice-audio'); r.onsuccess = () => { const tx = r.result.transaction('tracks', 'readonly').objectStore('tracks').getAll(); tx.onsuccess = () => res(tx.result.filter((x) => x.fmt === 'live').map((x) => x.live.raw.length)[0]); }; }));
  expect(left).toBeLessThan(8);
  expect(errors).toEqual([]);
});
