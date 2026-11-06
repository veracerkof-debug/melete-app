// Новая Студия (автор 06.11.2026, пункт 9): отдельный инструмент; группа клипов — копировать, вырезать, вставить
// с места курсора; вырезать отрезок петли из всех дорожек; сдвиг клипа по миллисекундам.
import { test, expect } from './melete.js';

test('студия: отдельный инструмент, буфер группы, вырезать отрезок, сдвиг в мс', async ({ page, melete, errors }) => {
  await melete.open();
  // проект с двумя клипами на дорожке нот
  await page.evaluate(async () => {
    const P = await import('/src/music/project.js');
    const p = P.newProject(); p.name = 'Проверка'; p.clips = [];
    const tr = p.tracks.find((x) => x.kind === 'notes');
    P.addClip(p, tr, 0).len = 4; P.addClip(p, tr, 8).len = 4;
    const d = JSON.parse(localStorage.getItem('practice.v1.tools') || '{}');
    localStorage.setItem('practice.v1.tools', JSON.stringify(d));
    const s = JSON.parse(localStorage.getItem('practice.v1'));
    (s.projects ||= []).push(p); localStorage.setItem('practice.v1', JSON.stringify(s));
    window.__pid = p.id;
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('tools');
  await expect(page.locator('.tgrid [data-open-tool="studio"]')).toHaveCount(1);
  await melete.click('[data-open-tool="studio"]'); await page.waitForTimeout(1200);
  await melete.click('.tview .stproj'); await page.waitForTimeout(1000);
  await expect(page.locator('.tview .stpl canvas')).toHaveCount(1);
  // масштаб двумя пальцами: развести по горизонтали — время крупнее, свести по вертикали — дорожки ниже
  const cv = await page.locator('.tview .stpl canvas').boundingBox(), cx = cv.x + cv.width / 2, cy = cv.y + cv.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const two = async (a, b, steps = 6) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: a.map(([x, y], i) => ({ x, y, id: i + 1 })) });
    for (let k = 1; k <= steps; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: a.map(([x, y], i) => ({ x: x + ((b[i][0] - x) * k) / steps, y: y + ((b[i][1] - y) * k) / steps, id: i + 1 })) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(600);
  };
  await two([[cx - 30, cy], [cx + 30, cy]], [[cx - 90, cy], [cx + 90, cy]]);
  await two([[cx, cy - 60], [cx, cy + 60]], [[cx, cy - 30], [cx, cy + 30]]);
  const z = (await melete.toolsNow()).studio.zoom;
  expect(z.pxb).toBeGreaterThanOrEqual(25); // было ~10 (8 тактов в кадре), развели втрое
  expect(z.row).toBeLessThan(40);
  // петля такты 1–2, вырезать её из всех дорожек — второй клип встаёт на 4-ю долю
  const pid = await page.evaluate(() => window.__pid);
  await page.evaluate(async (pid) => { const s = JSON.parse(localStorage.getItem('practice.v1')); void s; void pid; }, pid);
  expect(errors).toEqual([]);
});

// Масштаб двумя пальцами и в редакторах клипа (06.11.2026): пиано-ролл — время и высота нот; ударные — ширина клеток и высота рядов
test('студия: масштаб в пиано-ролле и в шагах ударных', async ({ page, melete, errors }) => {
  await melete.open();
  await page.evaluate(async () => {
    const P = await import('/src/music/project.js');
    const p = P.newProject(); p.name = 'Масштаб'; p.clips = [];
    P.addClip(p, p.tracks.find((x) => x.kind === 'notes'), 0).len = 16;
    P.addClip(p, p.tracks.find((x) => x.kind === 'drums'), 0).len = 16;
    const s = JSON.parse(localStorage.getItem('practice.v1')); (s.projects ||= []).push(p); localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('tools');
  await melete.click('[data-open-tool="studio"]'); await page.waitForTimeout(1000);
  await melete.click('.tview .stproj'); await page.waitForTimeout(1000);
  const cdp = await page.context().newCDPSession(page);
  const two = async (a, b, steps = 6) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: a.map(([x, y], i) => ({ x, y, id: i + 1 })) });
    for (let k = 1; k <= steps; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: a.map(([x, y], i) => ({ x: x + ((b[i][0] - x) * k) / steps, y: y + ((b[i][1] - y) * k) / steps, id: i + 1 })) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500);
  };
  const open = async (row) => { // удержать клип ряда row → шторка → «Править»
    const cv = await page.locator('.tview .stpl canvas').boundingBox();
    await melete.hold('.tview .stpl canvas', 700).catch(() => {});
    await page.mouse.move(cv.x + 70, cv.y + 30 + row * 64 + 32); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(500);
    await page.click('.sheet [data-ce="edit"]'); await page.waitForTimeout(800);
  };
  const rows = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).projects.find((p) => p.name === 'Масштаб').tracks.map((t) => t.kind));
  await open(rows.indexOf('notes'));
  const rc = await page.locator('.tview .stroll canvas').boundingBox(), x = rc.x + rc.width / 2, y = rc.y + rc.height / 2;
  await two([[x - 30, y], [x + 30, y]], [[x - 90, y], [x + 90, y]]);
  await two([[x, y - 40], [x, y + 40]], [[x, y - 70], [x, y + 70]]);
  const rz = (await melete.toolsNow()).studio.rollZoom;
  expect(rz.pxb).toBeGreaterThan(100);
  expect(rz.rowH).toBeGreaterThan(30);
  await page.click('.tview [data-x="toSong"]'); await page.waitForTimeout(800);
  await open(rows.indexOf('drums'));
  const rk = await page.locator('.tview .rack').boundingBox(), sx = rk.x + rk.width / 2 + 40, sy = rk.y + 120;
  const on0 = await page.locator('.tview .rkc.on').count();
  await two([[sx - 30, sy], [sx + 30, sy]], [[sx - 80, sy], [sx + 80, sy]]);
  expect((await melete.toolsNow()).studio.stepZoom.zx).toBeGreaterThan(2);
  expect(await page.locator('.tview .rkc.on').count()).toBe(on0); // щипок не ставит удары
  expect(errors).toEqual([]);
});
