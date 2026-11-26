// Студия и нейросеть (слово автора 26.11.2026): кнопка ИИ в студии, разрешение, ручной режим (копировать запрос, вставить ответ любой
// нейросети), прямой чат (сеть подменена), «Применить» кладёт ударные и бас клипами и играет, «Отменить» возвращает как было.
import { test, expect } from './melete.js';

const REPLY = 'Вот простой рок.\n```melete-studio\n' + JSON.stringify([
  { op: 'add', at: 1, bars: 2, fam: 'drums', name: 'Рок', lanes: { kick: ['x.......x.x.....', 'x.......x.x...x.'], snare: ['....x.......x...'], hat: ['x.x.x.x.x.x.x.x.'] } },
  { op: 'add', at: 1, bars: 2, fam: 'bass', ev: [[[0, 2, 'r'], [2, 2, 'r'], [4, 2, '5']], [[0, 4, 'r'], [8, 4, 'a']]] },
]) + '\n```';

const openStudio = async (page, melete) => {
  await melete.open();
  await page.evaluate(async () => {
    const P = await import('/src/music/project.js');
    const p = P.newProject(); p.name = 'ИИ'; p.clips = [];
    const s = JSON.parse(localStorage.getItem('practice.v1')); (s.projects ||= []).push(p); localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('tools');
  await melete.click('[data-open-tool="studio"]'); await page.waitForTimeout(1200);
  await melete.click('.tview .stproj'); await page.waitForTimeout(1000);
};
const proj = async (melete) => (await melete.projects()).find((x) => x.name === 'ИИ');

test('студия: ИИ без своего API — копировать запрос, вставить ответ, применить и отменить', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await openStudio(page, melete);
  if (process.env.SHOTDIR) await page.screenshot({ path: process.env.SHOTDIR + '/studio-bar.png' });
  await page.locator('.tview [data-x="ai"]').click(); await page.waitForTimeout(500);
  // сначала — разрешение (один раз)
  await expect(page.locator('.alert, .ask').first()).toContainText('проект студии');
  await page.getByRole('button', { name: 'Разрешить' }).click(); await page.waitForTimeout(600);
  await expect(page.locator('.aichat')).toBeVisible();
  await expect(page.locator('[data-ai="chip"]').first()).toBeVisible();
  if (process.env.SHOTDIR) await page.screenshot({ path: process.env.SHOTDIR + '/studio-chat.png' });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('melete.ai')).access.studio)).toBe('write');
  // быстрая просьба → копирование запроса: инструкция формата, данные проекта, просьба
  await page.locator('[data-ai="chip"]').first().click();
  await page.locator('[data-ai="copyprompt"]').click(); await page.waitForTimeout(400);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  if (clip) { expect(clip).toContain('melete-studio'); expect(clip).toContain('СТУДИЯ'); expect(clip).toContain('рок-бит'); expect(clip).not.toContain('sk-'); }
  // вставка ответа любой нейросети → предложение с карточкой
  await page.locator('[data-ai="paste"]').click(); await page.waitForTimeout(400);
  await page.locator('[data-pta]').fill(REPLY);
  await page.locator('[data-pgo]').click(); await page.waitForTimeout(500);
  await expect(page.locator('.aip.pend')).toContainText('Ударные'); await expect(page.locator('.aip.pend')).toContainText('Бас');
  if (process.env.SHOTDIR) await page.screenshot({ path: process.env.SHOTDIR + '/studio-card.png' });
  // применить: клипы в проекте; проект сохранён
  await page.locator('[data-ai="apply"]').click(); await page.waitForTimeout(800);
  let p = await proj(melete);
  expect(p.clips.length).toBe(2);
  const kinds = p.clips.map((c) => p.tracks.find((t) => t.id === c.tr).kind).sort();
  expect(kinds).toEqual(['drums', 'notes']);
  await expect(page.locator('[data-ai="undo"]')).toBeVisible();
  // отменить: как было
  await page.locator('[data-ai="undo"]').click(); await page.waitForTimeout(600);
  p = await proj(melete); expect(p.clips.length).toBe(0);
  // ответ без блока — понятная подсказка, ничего не ломается
  await page.locator('[data-ai="paste"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-pta]').fill('Просто совет: играйте тише.');
  await page.locator('[data-pgo]').click(); await page.waitForTimeout(400);
  await expect(page.locator('.toast, #toast').last()).toContainText('нет блока');
  expect(errors).toEqual([]);
});

test('студия: прямой чат — модель отвечает блоком, видит проект студии; применить', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { try { if (!localStorage.getItem('melete.ai')) localStorage.setItem('melete.ai', JSON.stringify({ on: true, format: 'openai', url: 'https://api.example.com/v1', model: 'm', key: 'sk-SECRET', access: { studio: 'write' }, auto: false, instruction: '' })); } catch { /* */ } });
  await openStudio(page, melete);
  await page.evaluate((reply) => {
    window.__aiCalls = [];
    window.__melete.ai.__test({ avail: true, post: async (req) => { window.__aiCalls.push(JSON.stringify(req)); return { status: 200, data: JSON.stringify({ choices: [{ message: { content: reply } }] }) }; } });
  }, REPLY);
  await page.locator('.tview [data-x="ai"]').click(); await page.waitForTimeout(600);
  await page.locator('[data-aiin]').fill('Простой рок-бит и бас на 2 такта'); await page.locator('[data-ai="send"]').click(); await page.waitForTimeout(900);
  const sent = JSON.stringify(JSON.parse(await page.evaluate(() => window.__aiCalls[0])).body); // тело запроса; ключ — только в заголовке для провайдера
  expect(sent).toContain('melete-studio'); expect(sent).toContain('СТУДИЯ'); expect(sent).not.toContain('sk-SECRET'); expect(sent).not.toContain('не можешь');
  await expect(page.locator('.aip.pend')).toBeVisible();
  await page.locator('[data-ai="apply"]').click(); await page.waitForTimeout(800);
  expect((await proj(melete)).clips.length).toBe(2);
  // автоприменения для студии нет: даже с «Применять правки сразу» предложение ждёт кнопки (проверено юнитом)
  expect(errors).toEqual([]);
});
