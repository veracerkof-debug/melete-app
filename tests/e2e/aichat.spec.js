// Чат с нейросетью (слово автора 23–25.11.2026): настройки, лента, предложение «Применить / Отменить»; сеть подменена (vite dev)
import { test, expect } from './melete.js';

const CFG = { on: true, format: 'openai', url: 'https://api.example.com/v1', model: 'm', key: 'sk-SECRET-KEY', access: { songs: 'write', stats: 'read', log: 'none' }, auto: false, instruction: '' };
const REPLY = 'Меняю жанр.\n```melete-ops\n[{"op":"set","ref":"s1","fields":{"genre":"Блюз"}}]\n```';

test('нейросеть: чат с предложением — применить и отменить; ключ вне practice.v1', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((c) => { try { if (!localStorage.getItem('melete.ai')) localStorage.setItem('melete.ai', JSON.stringify(c)); } catch { /* */ } }, CFG);
  await melete.open({ settings: { home: { off: [] } }, songs: [{ id: 's1', title: 'Песня', artist: 'Я', genre: 'Рок', key: 'Am', notes: '', targetBpm: 100, currentBpm: 80, createdAt: 1, updatedAt: 1 }] });
  await page.evaluate((reply) => {
    const app = window.__melete;
    window.__aiCalls = [];
    app.ai.__test({ avail: true, post: async (req) => { window.__aiCalls.push(req); return { status: 200, data: JSON.stringify({ choices: [{ message: { content: reply } }] }) }; } });
    app.render();
  }, REPLY);
  await page.waitForTimeout(500);
  // лицо маскота ведёт в чат, когда он подключён
  const face = page.locator('.mascotb[data-act="aichat"]'); await expect(face).toBeVisible();
  await face.click(); await page.waitForTimeout(500);
  await expect(page.locator('.aichat')).toBeVisible();
  await expect(page.locator('[data-aictx]')).toContainText('Песни'); // видно, что уйдёт в запрос
  await page.fill('[data-aiin]', 'Поправь жанр у песни'); await page.click('[data-ai="send"]');
  await expect(page.locator('.aip')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.aim.a').first()).toContainText('Меняю жанр');
  await expect(page.locator('.aip')).toContainText('Песня: жанр → Блюз');
  const calls = await page.evaluate(() => window.__aiCalls);
  expect(calls).toHaveLength(1); expect(calls[0].headers.Authorization).toContain('sk-SECRET-KEY'); expect(calls[0].body.messages[0].content).toContain('s1 | Песня');
  const genre = () => page.evaluate(() => window.__melete.store.state.songs.find((s) => s.id === 's1').genre);
  expect(await genre()).toBe('Рок'); // без подтверждения не меняется
  await page.click('[data-ai="apply"]'); await expect(page.locator('.aip')).toContainText('применено'); expect(await genre()).toBe('Блюз');
  await page.click('[data-ai="undo"]'); await page.waitForTimeout(300); expect(await genre()).toBe('Рок');
  await expect(page.locator('.aip')).toContainText('Отменено');
  // ключ — отдельно от данных приложения
  const leak = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('practice.v1') && (localStorage.getItem(k) || '').includes('sk-SECRET-KEY')));
  expect(leak).toEqual([]);
  void errors;
});

test('нейросеть: страница настроек — выключена по умолчанию, адрес только https, доступ по категориям', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await page.evaluate(() => { window.__melete.ai.__test({ avail: true }); });
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('[data-pp="ai"]'); await page.waitForTimeout(400);
  await expect(page.locator('[data-ai-sw="on"]')).not.toBeChecked();
  await page.locator('[data-ai-sw="on"]').evaluate((el) => el.click()); await page.waitForTimeout(300);
  await page.fill('[data-ai-f="url"]', 'http://api.example.com'); await page.locator('[data-ai-f="url"]').blur(); await page.waitForTimeout(300);
  await expect(page.getByText('Нужен адрес с https://')).toBeVisible();
  await page.selectOption('[data-ai-acc="songs"]', 'write'); await page.waitForTimeout(300);
  await expect(page.locator('[data-ai-sw="auto"]')).toHaveCount(1); // «применять сразу» — только при праве на правку
  await page.locator('[data-ai-sw="auto"]').evaluate((el) => el.click()); await page.waitForTimeout(300);
  await expect(page.getByText('скрытые команды')).toBeVisible(); // предупреждение про чужие тексты
  const c = await page.evaluate(() => JSON.parse(localStorage.getItem('melete.ai')));
  expect(c).toMatchObject({ on: true, auto: true, access: { songs: 'write', stats: 'none', log: 'none' } });
  await page.selectOption('[data-ai-acc="songs"]', 'read'); await page.waitForTimeout(300);
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('melete.ai')))).auto).toBe(false); // без права на правку авто выключается
  void errors;
});

test('нейросеть: в обычной версии страницы нет', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await expect(page.locator('[data-pp="ai"]')).toHaveCount(0);
  await expect(page.locator('.mascotb[data-act="aichat"]')).toHaveCount(0);
  void errors;
});
