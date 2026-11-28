// Компьютер, не новичок: верхняя полоса, рельса инструментов, «Сегодня» — центр управления, рабочая станция (core/screens/deskshell.js, deskhome.js, deskwork.js)
import { test, expect } from './melete.js';

test.use({ viewport: { width: 1440, height: 900 }, hasTouch: false, deviceScaleFactor: 1 });

const SHOTS = process.env.SHOTS || '';
const day = 86400000;
const songs = [
  { id: 's1', title: 'Ученик Христа', artist: '', key: 'E', notes: '[E]Слова [A]песни', targetBpm: 76, currentBpm: 76, createdAt: 1, updatedAt: 1 },
  { id: 's2', title: 'Бог верный', artist: '', key: 'D', notes: '', targetBpm: 0, currentBpm: '', createdAt: 1, updatedAt: 1 },
  { id: 's3', title: 'Всем своим сердцем', artist: '', key: 'A', notes: '[A]Слова [D]песни', targetBpm: 84, currentBpm: 72, createdAt: 1, updatedAt: 1 },
];
const events = () => {
  const n = Date.now();
  return [{ id: 'e1', title: 'Служение', kind: 'concert', start: n + 3 * day, end: n + 3 * day + 5400000, allDay: false, repeat: 'none', songs: ['s1', 's2', 's3'], updatedAt: 1 }];
};
const open = async (melete, page, level = 'amateur') => {
  await melete.open({ songs, settings: { profile: { name: 'A', instruments: ['guitar'], level, priorHours: 0, createdAt: 1760000000000 }, church: true } });
  await page.evaluate((ev) => { const s = JSON.parse(localStorage.getItem('practice.v1')); s.events = ev; localStorage.setItem('practice.v1', JSON.stringify(s)); }, events());
  await page.reload(); await page.waitForTimeout(1500);
};

test('не новичок на компьютере: верхняя полоса, рельса, «Сегодня»', async ({ page, melete, errors }) => {
  await open(melete, page);
  expect(await page.evaluate(() => document.documentElement.classList.contains('dpro'))).toBe(true);
  await expect(page.locator('.dtop .dtab')).toHaveCount(5);
  await expect(page.locator('.dtab[data-dt="today"]')).toHaveAttribute('aria-current', 'page');
  expect(await page.locator('.drail .drt').count()).toBeGreaterThan(12);
  await expect(page.locator('.dday')).toBeVisible();
  await expect(page.locator('.dday')).toContainText('Ближайшее служение');
  await expect(page.locator('.dday')).toContainText('Бог верный');
  expect(await melete.overflow()).toEqual([]);
  if (SHOTS) await page.screenshot({ path: SHOTS + '/today.png' });
  // время занятия: 20 мин — в плане
  await page.click('[data-act="deskmin"][data-min="20"]'); await page.waitForTimeout(300);
  await expect(page.locator('.dplan')).toContainText('20 мин');
  // «Песни» — вкладка сверху
  await page.click('.dtab[data-dt="songs"]'); await page.waitForTimeout(500);
  await expect(page.locator('.dtab[data-dt="songs"]')).toHaveAttribute('aria-current', 'page');
  // инструмент из рельсы: окно и подсветка
  await page.click('.drt[data-rail="tuner"]'); await page.waitForTimeout(900);
  await expect(page.locator('.tview[data-tool="tuner"]')).toHaveCount(1);
  await expect(page.locator('.drt[data-rail="tuner"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.dtab[data-dt="tools"]')).toHaveAttribute('aria-current', 'page');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/tool.png' });
  await page.click('.drt[data-rail="metro"]'); await page.waitForTimeout(900);
  await expect(page.locator('.tview[data-tool="metro"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('«Начать» — занятие с планом на выбранное время', async ({ page, melete, errors }) => {
  await open(melete, page);
  await page.click('[data-act="deskstart"]'); await page.waitForSelector('.session .pane', { timeout: 10000 }); await page.waitForTimeout(800);
  await expect(page.locator('#splan')).toHaveCount(1); // полоса плана занятия
  expect(errors).toEqual([]);
});

test('рабочая станция: раскладка и микшер', async ({ page, melete, errors }) => {
  await open(melete, page);
  await page.click('[data-act="deskwork"]'); await page.waitForSelector('.session .dmix', { timeout: 10000 }); await page.waitForTimeout(1200);
  expect(await page.locator('.session .pane').count()).toBe(3);
  expect(await page.locator('.dmix .dfd').count()).toBeGreaterThan(2);
  await expect(page.locator('.dmix [data-dpre="lesson"]')).toHaveAttribute('aria-pressed', 'true');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/work.png' });
  // общая громкость: стрелка вниз
  await page.focus('.dmix .dfd[data-k="master"] .dtk'); await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => +document.querySelector('.dmix .dfd[data-k="master"] .dtk').getAttribute('aria-valuenow'))).toBeLessThan(100);
  // другая раскладка: окна пересобираются, микшер на месте
  await page.click('.dmix [data-dpre="rehearse"]'); await page.waitForTimeout(1500);
  await expect(page.locator('.session .dmix [data-dpre="rehearse"]').last()).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('новичок — без оболочки', async ({ page, melete, errors }) => {
  await open(melete, page, 'beginner');
  expect(await page.evaluate(() => document.documentElement.classList.contains('dpro'))).toBe(false);
  await expect(page.locator('.dtop')).toHaveCount(0);
  expect(errors).toEqual([]);
});
