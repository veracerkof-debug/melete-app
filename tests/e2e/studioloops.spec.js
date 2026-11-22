// Студия: панель «Рисунки» — касание плитки кладёт рисунок и играет, перетаскивание вверх на плейлист — на выбранную
// дорожку и такт, семьи переключаются, закрывается кнопкой; бас идёт по аккордам проекта.
import { test, expect } from './melete.js';

const clips = async (page, melete) => { const p = (await melete.projects()).find((x) => x.name === 'Рисунки'); return { n: p.clips.length, tr: p.tracks.length, clips: p.clips.map((c) => ({ at: c.at, len: c.len, tr: c.tr })), tracks: p.tracks.map((t) => ({ id: t.id, kind: t.kind })) }; };

test('студия: панель «Рисунки» — касание, перетаскивание, семьи', async ({ page, melete, errors }) => {
  await melete.open();
  await page.evaluate(async () => {
    const P = await import('/src/music/project.js');
    const p = P.newProject(); p.name = 'Рисунки'; p.clips = [];
    const s = JSON.parse(localStorage.getItem('practice.v1')); (s.projects ||= []).push(p); localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('tools');
  await melete.click('[data-open-tool="studio"]'); await page.waitForTimeout(1200);
  await melete.click('.tview .stproj'); await page.waitForTimeout(1000);
  await expect(page.locator('.tview .stlps')).toHaveCount(0);
  await page.locator('.tview [data-x="loops"]').click(); await page.waitForTimeout(400);
  await expect(page.locator('.tview .stlps')).toHaveCount(1);
  await expect(page.locator('.tview .stlpc').first()).toBeVisible();
  // плитки не вылезают за окно по вертикали, плейлист остался
  const wrap = await page.locator('.tview .stwrap').boundingBox(), pl = await page.locator('.tview .stpl').boundingBox();
  expect(pl.height).toBeGreaterThan(110);
  expect(pl.y + pl.height).toBeLessThanOrEqual(wrap.y + wrap.height);
  // 1) аккорды: касание — клип на аккордовой дорожке
  await page.locator('.tview [data-lpf="chords"]').click(); await page.waitForTimeout(300);
  await page.locator('.tview [data-lp="pop"]').click(); await page.waitForTimeout(500);
  let c = await clips(page, melete); expect(c.n).toBe(1);
  expect(c.tracks.find((t) => t.id === c.clips[0].tr).kind).toBe('chords');
  await expect(page.locator('.tview .stlps')).toHaveCount(1); // панель осталась
  // 2) бас по аккордам: касание
  await page.locator('.tview [data-lpf="bass"]').click(); await page.waitForTimeout(300);
  await page.locator('.tview [data-lp="walking"]').click(); await page.waitForTimeout(500);
  c = await clips(page, melete); expect(c.n).toBe(2);
  expect(c.clips.find((x) => x.len === 16)).toBeTruthy();
  // 3) ударные: потянуть плитку вверх на плейлист — клип на такте под пальцем
  await page.locator('.tview [data-lpf="drums"]').click(); await page.waitForTimeout(300);
  const plate = await page.locator('.tview [data-lp="rock"]').boundingBox(), cv = await page.locator('.tview .stpl canvas').boundingBox();
  await page.mouse.move(plate.x + plate.width / 2, plate.y + plate.height / 2); await page.mouse.down();
  await page.mouse.move(plate.x + plate.width / 2, plate.y - 30, { steps: 4 });
  await page.mouse.move(cv.x + 56 + 200, cv.y + 30 + 64 * 0.5, { steps: 8 });
  await expect(page.locator('.stlpg')).toHaveCount(1);
  await page.mouse.up(); await page.waitForTimeout(500);
  await expect(page.locator('.stlpg')).toHaveCount(0);
  c = await clips(page, melete); expect(c.n).toBe(3);
  // 4) закрыть
  await page.locator('.tview .stlpx').click(); await page.waitForTimeout(300);
  await expect(page.locator('.tview .stlps')).toHaveCount(0);
  expect(errors.filter((e) => !/ResizeObserver/.test(String(e))).length).toBe(0);
});
