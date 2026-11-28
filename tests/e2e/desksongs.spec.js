// Компьютер (окно 1536×790, мышь): песни и служение — таблица «Песни» с предпросмотром, страница песни с панелью,
// сет-лист, источник песен, сцена. Снимки — в папку из DESK_SHOTS (для сверки с макетом).
import { test, expect } from './melete.js';

test.use({ viewport: { width: 1536, height: 790 }, hasTouch: false });

const SHOTS = process.env.DESK_SHOTS || '';
const shot = (page, n) => (SHOTS ? page.screenshot({ path: SHOTS + '/' + n + '.png' }) : null);
const notes = 'G       D/F#\nГосподь Ты Пастырь мой,\nEm      C\nЯ не буду нуждаться.\n';
const songs = [
  { id: 's1', title: 'Господь Ты Пастырь мой', key: 'G', currentBpm: 68, notes, created: Date.now() },
  { id: 's2', title: 'Бог верный', key: 'D', currentBpm: 74, notes: 'Бог верный, Бог живой,\nОн всегда рядом со мной.\n', created: Date.now() },
  { id: 's3', title: 'Всем своим сердцем', key: 'A', currentBpm: 72, targetBpm: 84, notes: 'A   E\nВсем своим сердцем', src: { s: 'p1', k: 'a.txt', h: 'x', b: 'x' }, created: Date.now() },
];
const withEvent = (page) => page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('practice.v1'));
  s.events = [{ id: 'ev1', title: 'Служение', kind: 'concert', start: Date.now() + 3600000, end: Date.now() + 7200000, allDay: false, repeat: 'none', songs: ['s2', 's1', 's3'], stage: {} }];
  localStorage.setItem('practice.v1', JSON.stringify(s));
});

test('песни: таблица и предпросмотр', async ({ page, melete, errors }) => {
  await melete.open({ songs });
  await melete.tab('library'); await page.waitForTimeout(500);
  expect(await melete.count('.dlib .dprev')).toBe(1);
  expect(await melete.count('.dlib .stile3')).toBe(3);
  await shot(page, 'library3');
  await page.locator('.dlib .stile3').nth(1).click(); await page.waitForTimeout(300);
  expect(await melete.count('.sdcols')).toBe(0); // одно касание — предпросмотр, не страница
  expect(await page.locator('.dprev h2').innerText()).toContain('Бог верный');
  await page.locator('.dlib .stile3').nth(1).click(); await page.waitForTimeout(500); // второе — открыть
  expect(await melete.count('.sdcols')).toBe(1);
  await shot(page, 'song3');
  expect(await melete.overflow()).toEqual([]);
  expect(errors).toEqual([]);
});

test('сет-лист на компьютере', async ({ page, melete, errors }) => {
  await melete.open({ songs });
  await withEvent(page); await page.reload(); await page.waitForTimeout(1200);
  await page.click('.htdh'); await page.waitForTimeout(600);
  await page.evaluate(() => { const b = document.querySelector('[data-cev]'); b && b.click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const b = document.querySelector('[data-ce="setlist"]'); b && b.click(); });
  await page.waitForTimeout(700);
  await shot(page, 'setlist');
  expect(await melete.count('.dset')).toBe(1);
  expect(errors).toEqual([]);
});
