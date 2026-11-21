// Объединённые инструменты (путь «А», docs/tool-merge.md): одна плитка и один значок, внутри — переключатель отделов; старые id не ломают данные
import { test, expect } from './melete.js';

test('«Инструменты»: плитки групп, без отдельных плиток отделов', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.tab('tools');
  for (const id of ['ear', 'studio', 'theory', 'glider']) await expect(page.locator('.tgrid [data-open-tool="' + id + '"]')).toHaveCount(1);
  for (const id of ['beat', 'vocal', 'looper', 'book', 'theremin']) await expect(page.locator('.tgrid [data-open-tool="' + id + '"]')).toHaveCount(0);
  await expect(page.locator('.tgrid [data-open-tool="ear"] .tcn2')).toHaveText('Тренажёр');
  expect(errors).toEqual([]);
});

test('окно инструмента: общее имя, переключатель отделов, «Ритм» открывается', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.tab('tools');
  await page.click('.tgrid [data-open-tool="ear"]'); await page.waitForTimeout(800);
  await expect(page.locator('.tview .stitle2')).toHaveText('Тренажёр');
  await expect(page.locator('.tvgrp [data-tv-grp]')).toHaveCount(3);
  await page.click('[data-tv-grp="beat"]'); await page.waitForSelector('.rywrap', { timeout: 10_000 });
  await page.waitForTimeout(500); // прежнее окно уходит с анимацией
  await expect(page.locator('.tvgrp [data-tv-grp="beat"]')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('быстрый доступ: старый id отдела заменяется группой, без повторов', async ({ page, melete, errors }) => {
  await melete.open({ settings: { quick: ['metro', 'beat', 'ear', 'looper'] } });
  const ids = await page.evaluate(() => [...document.querySelectorAll('.qgrid [data-open-tool]')].map((b) => b.dataset.openTool));
  expect(ids).toEqual(['metro', 'ear', 'studio']);
  expect(errors).toEqual([]);
});

test('занятие: старая раскладка с «looper» — окно студии с отделом «Лупер»', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['looper']);
  await expect(page.locator('.session .pane')).toHaveAttribute('data-group', 'studio');
  await expect(page.locator('.session .lpwrap')).toHaveCount(1);
  expect(errors).toEqual([]);
});
