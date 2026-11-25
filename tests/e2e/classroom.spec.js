// Учитель и ученик (слово автора 24–25.11.2026): у ученика — «Домашка» на главной и раздел «Учитель»; у учителя — «Ученики»
import { test, expect } from './melete.js';

test('ученик: домашка от учителя на главной, отметка, раздел «Учитель»; страница «Ученики»', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: { student: { on: true, salt: '1', hash: 'x', open: [], openLessons: ['g1'], tasks: [{ id: 't1', text: 'Выучить аккорд C', kind: 'free', due: 0, at: 1, done: false, doneAt: 0 }, { id: 't2', text: 'Сыграть G–D', kind: 'free', due: 0, at: 2, done: false, doneAt: 0 }], teacher: { key: 'k', name: 'Брат-учитель', at: 1 }, note: 'Не спешить', syncedAt: Date.now() } } });
  await expect(page.locator('.hstudy', { hasText: 'Домашка' })).toBeVisible();
  await expect(page.locator('.hstudy [data-act="hw"]')).toHaveCount(2);
  await page.locator('.hstudy [data-act="hw"]').first().click();
  await expect(page.locator('.hstudy [data-act="hw"]')).toHaveCount(1);
  expect((await melete.settings()).student.tasks[0].done).toBe(true);
  // раздел «Учитель» на странице ученика
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('[data-pp="student"]'); await page.waitForTimeout(400);
  await expect(page.getByText('Брат-учитель')).toBeVisible();
  await expect(page.getByText('Не спешить')).toBeVisible();
  await expect(page.getByText('Учитель видит')).toBeVisible();
  await expect(page.locator('[data-pp="class"]')).toHaveCount(0); // страница учителя ученику не видна
  void errors;
});

test('учитель: страница «Ученики» без сопряжённых', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('[data-pp="class"]'); await page.waitForTimeout(400);
  await expect(page.locator('.large')).toHaveText('Ученики');
  await expect(page.getByText('Учеников пока нет')).toBeVisible();
  void errors;
});

test('учитель: шторка ученика — задание, уроки, инструмент; ученик: урок закрыт до открытия', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { try { if (!localStorage.getItem('melete.sync')) localStorage.setItem('melete.sync', JSON.stringify({ devs: { 'https://192.168.1.9:53329': { addr: 'https://192.168.1.9:53329', key: 'k', name: 'Брат', phone: true, last: 0, ids: [] } } })); } catch { /* */ } });
  await melete.open();
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('[data-pp="class"]'); await page.waitForTimeout(500);
  await expect(page.locator('[data-cls="open"]')).toHaveCount(1);
  await page.click('[data-cls="open"]'); await page.waitForTimeout(500);
  await page.fill('[data-cs-text]', 'Выучить C'); await page.click('[data-cs="add"]'); await page.waitForTimeout(300);
  await expect(page.locator('.sheet').getByText('Выучить C')).toBeVisible();
  await page.click('[data-cs="linc"]'); await page.click('[data-cs="linc"]'); await page.waitForTimeout(200);
  await expect(page.locator('.sheet').getByText('Открыто уроков: 2 из 20')).toBeVisible();
  const s = await melete.settings(), rec = Object.values(s.classroom.students)[0];
  expect(rec.tasks.map((x) => x.text)).toEqual(['Выучить C']); expect(rec.lessons).toEqual(['g1', 'g2']);
  void errors;
});

test('ученик с учителем: урок курса закрыт, открытый виден', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: { student: { on: true, salt: '1', hash: 'x', open: [], openLessons: ['g1'], tasks: [], teacher: { key: 'k', name: 'У', at: 1 } } } });
  await melete.tools({ book: { book: { lvl: 'beginner', sec: 'first', ch: 'g2', mode: 'lessons' } } }); await melete.free('F', ['book']);
  await page.waitForSelector('.pane .book', { timeout: 15_000 });
  await expect(page.locator('.bkles.locked')).toHaveCount(1);
  await expect(page.getByText('Урок откроет учитель')).toBeVisible();
  await melete.tools({ book: { book: { lvl: 'beginner', sec: 'first', ch: 'g1', mode: 'lessons' } } }); await melete.free('F', ['book']);
  await page.waitForSelector('.pane .book', { timeout: 15_000 });
  await expect(page.locator('.bkles.locked')).toHaveCount(0);
  void errors;
});
