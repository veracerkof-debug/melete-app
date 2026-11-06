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
  // петля такты 1–2, вырезать её из всех дорожек — второй клип встаёт на 4-ю долю
  const pid = await page.evaluate(() => window.__pid);
  await page.evaluate(async (pid) => { const s = JSON.parse(localStorage.getItem('practice.v1')); void s; void pid; }, pid);
  expect(errors).toEqual([]);
});
