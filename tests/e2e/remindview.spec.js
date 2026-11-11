// Расписание занятий (автор 11.11.2026: «как в Google Календаре», одно место — «Неделя») и форма уведомлений.
// Настройки — по новой карте: «Звук», «Маскот», «Связь».
import { test, expect } from './melete.js';

test('расписание: из прежних дней; новое касанием; сдвиг удержанием «только этот день»; перерыв', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: { remind: { mode: 'classic', time: '19:00', leads: [60, 5] }, days: [true, true, true, true, true, false, false], goalMin: 300 } });
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(600);
  await melete.click('#panelLayer [data-pp="week"]'); await page.waitForTimeout(700);
  // прежние дни — точки в полосе дней (пн–пт), выбран сегодняшний день
  await expect(page.locator('.pstrip .pday i.dot')).toHaveCount(5);
  // перейти на понедельник этой недели: там занятие 19:00–20:00 (цель 5 ч на 5 дней)
  await page.locator('.pstrip .pday').first().click(); await page.waitForTimeout(400);
  await expect(page.locator('.pgrid .pblk')).toHaveCount(1);
  await expect(page.locator('.pgrid .pblk .num')).toHaveText('19:00–20:00');
  await page.screenshot({ path: 'test-results/plan.png' });
  // касание пустого места в 8 утра — новое занятие на час, сохранить
  const grid = page.locator('.pgrid'), gb = await grid.boundingBox();
  await page.locator('.pscroll').evaluate((el) => { el.scrollTop = 7 * 52; });
  await page.waitForTimeout(200);
  const g2 = await grid.boundingBox();
  await page.mouse.click(g2.x + 80, g2.y + 8.25 * 52); await page.waitForTimeout(600);
  await expect(page.locator('.sheet [data-pfrom]')).toHaveValue('08:00');
  await page.click('.sheet [data-psave]'); await page.waitForTimeout(600);
  await expect(page.locator('.pgrid .pblk')).toHaveCount(2);
  const st = await melete.settings();
  expect(st.plan.slots.some((s) => s.from === '08:00' && s.days.length === 1)).toBe(true);
  // удержать вечернее занятие и вести вниз на час — «только этот день»
  await page.locator('.pscroll').evaluate((el) => { el.scrollTop = 17 * 52; }); await page.waitForTimeout(200);
  const blk = page.locator('.pgrid .pblk', { hasText: '19:00' }), bb = await blk.boundingBox();
  await page.mouse.move(bb.x + 20, bb.y + 10); await page.mouse.down(); await page.waitForTimeout(500);
  for (let i = 1; i <= 8; i++) { await page.mouse.move(bb.x + 20, bb.y + 10 + i * 6.5); await page.waitForTimeout(20); }
  await page.mouse.up(); await page.waitForTimeout(500);
  await page.click('.sheet [data-sc="day"]'); await page.waitForTimeout(600);
  await expect(page.locator('.pgrid .pblk.once', { hasText: '20:00–21:00' })).toHaveCount(1);
  await expect(page.locator('.pnote [data-pl="reset"]')).toHaveCount(1);
  // следующая неделя — как обычно
  await page.click('[data-pl="next"]'); await page.waitForTimeout(400);
  await page.locator('.pstrip .pday').first().click(); await page.waitForTimeout(400);
  await expect(page.locator('.pgrid .pblk', { hasText: '19:00–20:00' })).toHaveCount(1);
  // перерыв на сегодня
  await page.click('[data-pl="addoff"]'); await page.waitForTimeout(400);
  await page.fill('.sheet [data-ot]', 'Гастроли');
  await page.click('.sheet [data-osave]'); await page.waitForTimeout(500);
  expect((await melete.settings()).plan.off.length).toBe(1);
  // «Уведомления»: дней и времени там больше нет — ссылка на расписание
  await page.click('#panelLayer [data-pp="root"]').catch(() => {}); await page.waitForTimeout(400);
  await melete.click('#panelLayer [data-pp="notif"]'); await page.waitForTimeout(500);
  await expect(page.locator('.gform .gfday')).toHaveCount(0);
  await expect(page.locator('.gform .gflink[data-pp="week"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('настройки по карте: звук, маскот, связь — чат и идея', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(600);
  await melete.click('#panelLayer [data-pp="sound"]'); await page.waitForTimeout(500);
  await expect(page.locator('[data-seg="sndmode"]')).toHaveCount(1);
  await melete.click('#panelLayer [data-pp="root"]'); await page.waitForTimeout(300);
  await melete.click('#panelLayer [data-act="idea"]'); await page.waitForTimeout(500);
  await expect(page.locator('.sheet a[href*="t.me"]')).toHaveCount(1);
  await expect(page.locator('.sheet .ideatext')).toHaveCount(1);
  // поле идеи — во всю ширину карточки (06.11.2026: было в половину)
  const ta = await page.locator('.sheet .ideatext').boundingBox(), gr = await page.locator('.sheet .ideatext').locator('xpath=ancestor::div[contains(@class,"group")]').boundingBox();
  expect(ta.width).toBeGreaterThan(gr.width * 0.8);
  expect(errors).toEqual([]);
});

// Форма, как событие в Google Календаре (слово автора 08.11): время крупно, дни кружками, уведомления списком
test('уведомления: форма — добавить и убрать уведомление, тихие часы', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: { remind: { mode: 'classic', time: '19:00', leads: [60] }, days: [true, false, true, false, true, false, false] } });
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(600);
  await melete.click('#panelLayer [data-pp="notif"]'); await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/remind-form.png', fullPage: false });
  await page.click('.gform [data-mlleadadd]'); await page.waitForTimeout(400);
  await page.click('.sheet [data-mlpick="5"]'); await page.waitForTimeout(500);
  expect((await melete.settings()).remind.leads.sort((a, b) => a - b)).toEqual([5, 60]);
  await page.click('.gform [data-mllead="60"]'); await page.waitForTimeout(400);
  expect((await melete.settings()).remind.leads).toEqual([5]);
  await page.selectOption('.gform [data-mlq="from"]', '21'); await page.waitForTimeout(300);
  expect((await melete.settings()).remind.quietFrom).toBe(21);
  expect(errors).toEqual([]);
});
