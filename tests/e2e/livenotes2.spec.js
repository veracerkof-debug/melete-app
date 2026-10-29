// Ноты с игры под метроном: отсчёт, темп записи держится, перезапись с такта заменяет сыгранное; микрофон без звука — честное «нот не слышно»
import { test, expect } from './melete.js';

test('ноты с игры: метроном и отсчёт, перезапись, микрофон', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await melete.open();
  await melete.tools({ notes: { live: { src: 'midi', metro: true, bpm: 120, cnt: 1, inst: 'guitar' } }, wsMap: { free: { layout: 'HH', panes: ['notes', 'piano'], focus: 0, sub: {}, ratio: 0.72 } } });
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session .pane', { timeout: 10_000 });
  await page.waitForTimeout(1500);
  const play = async (ms) => { for (const m of ms) { const c = await melete.centre('.pane[data-tool="piano"] [data-m="' + m + '"]', 0.5, 0.85); await page.mouse.move(c[0], c[1]); await page.mouse.down(); await page.waitForTimeout(220); await page.mouse.up(); await page.waitForTimeout(30); } };
  await melete.click('[data-x="lvnew"]'); await page.waitForTimeout(300);
  await melete.click('[data-x="lvrec"]'); await page.waitForTimeout(300);
  expect(await melete.text('.lvhint')).toBe('Отсчёт');
  await page.waitForTimeout(2000); // отсчёт такт на 120
  await play([60, 62, 64, 65, 67, 65, 64, 62]);
  await melete.click('[data-x="lvstop"]');
  await page.waitForFunction(() => document.querySelectorAll('.atsurf text').length > 5, null, { timeout: 20_000 });
  const get = () => page.evaluate(() => new Promise((res) => { const r = indexedDB.open('practice-audio'); r.onsuccess = () => { const tx = r.result.transaction('tracks', 'readonly').objectStore('tracks').getAll(); tx.onsuccess = () => res(tx.result.filter((x) => x.fmt === 'live').map((x) => ({ bpm: x.live.bpm, n: x.live.raw.length, t: x.live.raw.map((q) => Math.round(q.t * 100) / 100) }))[0]); }; }));
  const a = await get();
  expect(a.bpm).toBe(120);
  expect(a.n).toBe(8);
  // перезапись с такта 2
  await melete.click('[data-x="lvbars"]'); await page.waitForTimeout(200);
  // выбран такт 1 — «Переписать с 1»: отсчёт и новая игра вместо старой
  await melete.click('[data-x="lvrerec"]'); await page.waitForTimeout(2300);
  await play([72, 71]);
  await melete.click('[data-x="lvstop"]'); await page.waitForTimeout(2000);
  const b = await get();
  expect(b.n).toBe(2);
  // микрофон (поддельный)
  await melete.click('[data-x="lvset"]'); await page.waitForTimeout(400);
  await melete.click('[data-seg="lvsrc"] [data-v="mic"]'); await page.waitForTimeout(200);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await melete.click('[data-x="tlist"]'); await page.waitForTimeout(400);
  await melete.click('.sheet [data-x="lvnew"]'); await page.waitForTimeout(400);
  await melete.click('[data-x="lvrec"]'); await page.waitForTimeout(5000);
  await melete.click('[data-x="lvstop"]'); await page.waitForTimeout(2000);
  expect(await page.evaluate(() => [...document.querySelectorAll('.toast')].map((x) => x.textContent).join('|'))).toContain('Нот не слышно');
  expect(errors).toEqual([]);
});
