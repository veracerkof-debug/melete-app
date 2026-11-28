// Занятие новичка: «Н2 · Урок» → «Н9 · Занятие» → «Н10 · Итог», «Н11 · Неделя», «Н12 · Ещё» (макеты BLesson, BPlay, BDone, BWeek, BMore)
import { test, expect } from './melete.js';

const BEG = { profile: { name: 'A', instruments: ['guitar'], level: 'beginner', priorHours: 0, createdAt: 1760000000000 } };

test('новичок: урок по шагам, занятие с остатком времени, итог', async ({ page, melete, errors }) => {
  await melete.open({ settings: { ...BEG, begMin: 10 } });
  await expect(page.locator('[data-bgtitle]')).not.toHaveText('Учебник', { timeout: 8000 });
  await page.click('.bgcta');
  await expect(page.locator('.session.bgsess')).toBeVisible();
  await expect(page.locator('.session .bgsub')).toContainText('шаг 1 из', { timeout: 8000 }); // шаги — из учебника
  const total = +(await page.locator('.session .bgsub').textContent()).match(/из (\d+)/)[1];
  await expect(page.locator('[data-bgclk]')).toHaveText(/^(10:00|09:5\d)$/); // время плана — с главной (10 минут)
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/beg-lesson.png' });
  for (let i = 0; i < total; i++) await page.click('[data-bg="ok"]'); // «Получилось» на каждом шаге
  await expect(page.locator('.bgttl.l h1')).toHaveText('Занятие'); // урок пройден → занятие
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools') || '{}').book?.book?.done || {});
  expect(Object.keys(done)).toContain('f1'); // урок отмечен в учебнике
  await expect(page.locator('.bgbpm')).toBeVisible();
  await page.click('[data-bg="bpm"][data-d="5"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/beg-play.png' });
  // инструмент поверх занятия и возврат
  await page.click('[data-bg="tool"][data-id="tuner"]');
  await expect(page.locator('.tview')).toBeVisible();
  await page.click('[data-tv="close"]');
  await expect(page.locator('.session.bgsess')).toBeVisible();
  // занятие длится больше минуты — иначе в статистику не попадёт; перезагрузка — занятие продолжается (resume)
  await page.reload();
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const a = window.__melete.active; a.startedAt -= 130000; a.last = Date.now(); });
  await expect(page.locator('.session.bgsess [data-s="finish"]')).toBeVisible();
  await page.click('.session.bgsess [data-s="finish"]');
  await expect(page.locator('.bgdone')).toBeVisible();
  await expect(page.locator('.bgdone .bgdbig')).toContainText('мин');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/beg-done.png' });
  await page.click('.bgdone [data-k="save"]');
  await expect(page.locator('.session')).toHaveCount(0);
  const n = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).sessions.length);
  expect(n).toBe(1);
});

test('новичок: «Играть» — занятие без урока, остаток времени по выбранному плану', async ({ page, melete, errors }) => {
  await melete.open({ settings: { ...BEG, begMin: 30 } });
  await page.click('.tabbar [data-act="free"]');
  await expect(page.locator('.bgttl.l h1')).toHaveText('Занятие');
  await expect(page.locator('[data-bgclk]')).toHaveText(/^(30:00|29:5\d)$/);
  await page.click('[data-bgm]');
  await expect(page.locator('[data-bgm]')).toHaveText('Стоп');
  await page.click('[data-bgm]');
  await melete.click('.session [data-s="hide"]');
  await expect(page.locator('.session')).toHaveCount(0);
});

test('новичок: «Неделя» и «Ещё» по макетам', async ({ page, melete, errors }) => {
  await melete.open({ settings: BEG });
  await page.click('.bgweek');
  await expect(page.locator('.bgbars .bgbar2')).toHaveCount(7);
  await expect(page.locator('.bgp')).toContainText('Без серий');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/beg-week.png' });
  await page.click('.tabbar [data-act="panel"]');
  await expect(page.locator('.bgp .bgcell')).toHaveCount(5);
  await expect(page.locator('.bgp')).toContainText('Больше инструментов');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/beg-more.png' });
  await page.click('.bgp [data-act="begall"]'); // «Настройки» — полный список
  await expect(page.locator('.panel .cell').first()).toBeVisible();
  await melete.click('[data-act="pclose"]'); // полный список — обычная панель поверх
  await expect(page.locator('.bgnext')).toBeVisible();
});

test('любитель: занятие прежнее (окна и панель инструментов)', async ({ page, melete, errors }) => {
  await melete.open();
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await expect(page.locator('.session .ws')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.session.bgsess')).toHaveCount(0);
});

// Урок с аккордом: схема на экране, а после урока — смена аккордов со счётом (макеты BLesson, BPlay)
test('новичок: схема аккорда в уроке и смена в занятии', async ({ page, melete, errors }) => {
  const f = Array.from({ length: 24 }, (_, i) => 'f' + (i + 1)), g = ['g2', 'g1', 'g3', 'g4', 'g32'], done = Object.fromEntries([...f, ...g].map((x) => [x, 1]));
  await melete.open({ settings: { ...BEG, begMin: 20 }, tools: { book: { book: { done } } } });
  await expect(page.locator('[data-bgtitle]')).not.toHaveText('Учебник', { timeout: 8000 });
  await page.click('.bgcta');
  await expect(page.locator('.session .bgcd')).toBeVisible({ timeout: 8000 }); // схема аккорда
  await expect(page.locator('.session .bgchips button')).toHaveCount(3); // C D E
  await page.click('.session .bgchips button:nth-child(2)');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/beg-lesson-chord.png' });
  await page.click('[data-bg="listen"]');
  const total = +(await page.locator('.session .bgsub').textContent()).match(/из (\d+)/)[1];
  for (let i = 0; i < total; i++) await page.click('[data-bg="ok"]');
  await expect(page.locator('.bgttl.l h1')).toHaveText('Занятие');
  await expect(page.locator('.session')).toContainText('Смена C → D');
  await expect(page.locator('[data-bg="rep"]')).toHaveText('0 из 8');
  await page.click('[data-bg="rep"]');
  await expect(page.locator('[data-bg="rep"]')).toHaveText('1 из 8');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/beg-play-chord.png' });
});
