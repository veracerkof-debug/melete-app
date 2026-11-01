// Тренажёр ритма (модуль beat): упражнения открываются, ритм нотами, запуск касанием и итог, диктант,
// смахивание — новый ритм, темп ведением, окно в занятии.
import { test, expect } from './melete.js';

const open = async (page, melete, conf) => {
  await melete.open({ tools: { beat: { bpm: 200, ...conf } } });
  await melete.tab('tools');
  await melete.click('[data-open-tool="beat"]');
  await page.waitForSelector('.rywrap', { timeout: 10_000 });
};

test('с листа: ноты, отсчёт, итог с полосой ударов', async ({ page, melete, errors }) => {
  await open(page, melete, { drill: 'read', bars: 1 });
  await expect(page.locator('.ryscore svg')).toHaveCount(1);
  const c = await melete.centre('.rypad');
  await page.mouse.click(c[0], c[1]);
  await page.waitForTimeout(400);
  await expect(page.locator('.rypad')).toHaveAttribute('data-ph', /count|play/);
  for (let i = 0; i < 4; i++) { await page.keyboard.press('j'); await page.waitForTimeout(200); }
  await page.waitForSelector('.ryfb', { timeout: 8_000 });
  await expect(page.locator('.ryline')).toHaveCount(1);
  await expect(page.locator('[data-x="next"]')).toBeVisible();
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).settings.beat);
  expect(st.drills.read.t).toBe(1);
  expect(errors).toEqual([]);
});

test('диктант: собрать ритм из четвертей — точно', async ({ page, melete, errors }) => {
  await open(page, melete, { drill: 'dict', bars: 2, custom: ['q'] });
  await expect(page.locator('.rypal .rycell')).toHaveCount(1);
  for (let i = 0; i < 8; i++) await melete.click('.rycell[data-v="q"]');
  await page.waitForTimeout(200);
  await melete.click('[data-x="check"]');
  await expect(page.locator('.ryfb.ok')).toBeVisible();
  expect(errors).toEqual([]);
});

test('смахивание по карточке — новый ритм; темп ведением', async ({ page, melete, errors }) => {
  await open(page, melete, { drill: 'read', bars: 2, level: 4 });
  const svg = () => page.locator('.ryscore').innerHTML();
  const a = await svg();
  let changed = false;
  for (let i = 0; i < 3 && !changed; i++) { await melete.swipe('.rycard', -160, 0, { fx: 0.8 }); changed = (await svg()) !== a; }
  expect(changed).toBe(true);
  const t = await melete.centre('[data-tempo]');
  await page.mouse.move(t[0], t[1]); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(t[0] - i * 10, t[1]); await page.waitForTimeout(20); }
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect((await melete.toolsNow()).beat.bpm).toBe(190);
  await expect(page.locator('.sheet')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('окно в занятии рядом с метрономом', async ({ page, melete, errors }) => {
  await melete.open({ tools: { beat: { drill: 'pulse' } } });
  await melete.free('HH', ['beat', 'metro']);
  await expect(page.locator('.session .pane .rywrap')).toHaveCount(1);
  await expect(page.locator('.session .pane .rypad')).toBeVisible();
  expect(errors).toEqual([]);
});
