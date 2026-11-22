// Сцена: жесты настоящим касанием (CDP touch — браузер сам решает, отдать ли жест прокрутке), а не синтетическими событиями:
// смахивание влево-вправо по тексту (даже при длинной строке) и по списку, вверх-вниз по свободному месту — программа
import { test, expect } from './melete.js';
test.use({ hasTouch: true });

const swipe = async (page, from, to, steps = 8) => {
  const cdp = await page.context().newCDPSession(page);
  const pt = (k) => ({ x: from.x + ((to.x - from.x) * k) / steps, y: from.y + ((to.y - from.y) * k) / steps });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(0)] });
  for (let k = 1; k <= steps; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pt(k)] }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
};

test('сцена: настоящие касания — влево-вправо по тексту и списку, вверх-вниз по пустому месту', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const long = 'G       C       D       ' + 'очень длинная строка текста, которая шире экрана '.repeat(4) + '\n';
  const songs = ['Первая', 'Вторая', 'Третья'].map((n, i) => ({ id: 's' + i, title: n, key: 'G', notes: long + 'ещё строка\n', created: Date.now() }));
  await melete.open({ songs });
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('practice.v1'));
    s.events = [{ id: 'ev1', title: 'Концерт', kind: 'concert', start: Date.now(), end: Date.now() + 3600000, songs: ['s0', 's1', 's2'], stage: {} }];
    localStorage.setItem('practice.v1', JSON.stringify(s));
    localStorage.setItem('melete.stage', JSON.stringify({ ev: 'ev1', i: 0, at: Date.now() }));
  });
  await page.reload(); await page.waitForTimeout(1500);
  if (!(await melete.count('.stage'))) { await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /сцен|Resume|Sahna/i.test(x.textContent)); b && b.click(); }); await page.waitForTimeout(1200); }
  const cur = () => melete.text('.sgsong.cur b');
  expect(await cur()).toBe('Первая');
  // по тексту (строка шире экрана) — влево: следующая песня
  const tb = await page.locator('.sgmain > .sgtext').boundingBox();
  await swipe(page, { x: tb.x + tb.width - 20, y: tb.y + 60 }, { x: tb.x + 20, y: tb.y + 60 }); await page.waitForTimeout(500);
  expect(await cur()).toBe('Вторая');
  // вправо по тексту — назад
  await swipe(page, { x: tb.x + 20, y: tb.y + 60 }, { x: tb.x + tb.width - 20, y: tb.y + 60 }); await page.waitForTimeout(500);
  expect(await cur()).toBe('Первая');
  // по списку песен — влево
  const lb = await page.locator('.sgsongs').boundingBox();
  await swipe(page, { x: lb.x + lb.width - 10, y: lb.y + 60 }, { x: lb.x + 10, y: lb.y + 60 }); await page.waitForTimeout(500);
  expect(await cur()).toBe('Вторая');
  // вверх по свободному месту (под строкой темпа, правее «Далее») — программа включилась
  const nb = await page.locator('.sgnext').boundingBox();
  await swipe(page, { x: nb.x + nb.width / 2, y: nb.y + 40 }, { x: nb.x + nb.width / 2, y: nb.y - 140 }); await page.waitForTimeout(500);
  await expect(page.locator('.sgbpm.on')).toHaveCount(1);
  await swipe(page, { x: nb.x + nb.width / 2, y: nb.y - 140 }, { x: nb.x + nb.width / 2, y: nb.y + 40 }); await page.waitForTimeout(500);
  await expect(page.locator('.sgbpm.on')).toHaveCount(0);
  expect(errors).toEqual([]);
});
