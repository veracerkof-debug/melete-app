// «Лупер» в студии (слово автора 22.11.2026): одна заметная кнопка в транспорте — касание включает цикл по такту/выделенному
// и снимает его, удержание открывает экран лупера с этим проектом.
import { test, expect } from './melete.js';

test('студия: кнопка «Лупер» — цикл по касанию, экран лупера по удержанию', async ({ page, melete, errors }) => {
  await melete.open();
  await page.evaluate(async () => {
    const P = await import('/src/music/project.js');
    const p = P.newProject(); p.name = 'Петля'; p.clips = [];
    P.addClip(p, p.tracks.find((x) => x.kind === 'notes'), 0).len = 4;
    const s = JSON.parse(localStorage.getItem('practice.v1')); (s.projects ||= []).push(p); localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('tools');
  await melete.click('[data-open-tool="studio"]'); await page.waitForTimeout(1200);
  await melete.click('.tview .stproj'); await page.waitForTimeout(1000);
  // «Лупер» — в меню «⋯»: пункт «горит», пока есть цикл (p.region); касание включает и выключает цикл, удержание открывает лупер
  const more = async () => { await page.locator('.tview [data-x="more"]').click(); await page.waitForTimeout(200); };
  const item = () => page.locator('.tview .stmore [data-x="looper"]');
  await more(); await expect(item()).toHaveCount(1); await expect(page.locator('.tview .stmore [data-x="looper"].on')).toHaveCount(0);
  await item().click(); await page.waitForTimeout(300);
  await more(); await expect(page.locator('.tview .stmore [data-x="looper"].on')).toHaveCount(1);
  await item().click(); await page.waitForTimeout(300);
  await more(); await expect(page.locator('.tview .stmore [data-x="looper"].on')).toHaveCount(0);
  // удержание — лупер
  const box = await item().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
  await expect(page.locator('.looper, .lpwrap, [data-tool="looper"]').first()).toBeVisible({ timeout: 8000 });
  void errors;
});
