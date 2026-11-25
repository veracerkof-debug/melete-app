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
  // лицо маскота рядом с таймером ведёт в чат, когда он подключён; в шапке чата — кнопка настроек нейросети
  const face = page.locator('.topbar .hai[data-act="aichat"]'); await expect(face).toBeVisible();
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/home-ai.png' });
  await face.click(); await page.waitForTimeout(500);
  await expect(page.locator('.aichat')).toBeVisible();
  await expect(page.locator('.snav [data-ai="settings"]')).toBeVisible();
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/chat-head.png' });
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
  await page.click('button[data-ai-acc="songs"][data-v="write"]'); await page.waitForTimeout(300);
  await expect(page.locator('[data-ai-sw="auto"]')).toHaveCount(1); // «применять сразу» — только при праве на правку
  await page.locator('[data-ai-sw="auto"]').evaluate((el) => el.click()); await page.waitForTimeout(300);
  await expect(page.getByText('скрытые команды')).toBeVisible(); // предупреждение про чужие тексты
  const c = await page.evaluate(() => JSON.parse(localStorage.getItem('melete.ai')));
  expect(c).toMatchObject({ on: true, auto: true, access: { songs: 'write', stats: 'none', log: 'none' } });
  await page.click('button[data-ai-acc="songs"][data-v="read"]'); await page.waitForTimeout(300);
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

test('нейросеть: вложения — файл и ссылка уходят блоком в сообщении, видны в ленте; поля настроек выровнены влево', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((c) => { try { if (!localStorage.getItem('melete.ai')) localStorage.setItem('melete.ai', JSON.stringify(c)); } catch { /* */ } }, { ...CFG, attach: { files: true, links: true } });
  await melete.open({ settings: { home: { off: [] } } });
  await page.evaluate(() => {
    const app = window.__melete; window.__aiCalls = [];
    app.ai.__test({ avail: true, post: async (req) => { window.__aiCalls.push(req); return { status: 200, data: JSON.stringify({ choices: [{ message: { content: 'Разобрал.' } }] }) }; },
      get: async () => ({ status: 200, headers: { 'content-type': 'text/html' }, data: '<html><head><title>Песня на сайте</title></head><body><p>Куплет: Am G C</p></body></html>' }) });
    app.render();
  });
  await page.waitForTimeout(400);
  // настройки: поля слева, карточка состояния
  await melete.click('.avatar'); await page.waitForTimeout(500);
  await page.click('[data-pp="ai"]'); await page.waitForTimeout(400);
  await expect(page.locator('.aistat.ok')).toBeVisible();
  expect(await page.locator('[data-ai-f="url"]').evaluate((el) => getComputedStyle(el).textAlign)).toBe('left');
  expect(await page.locator('[data-ai-f="model"]').evaluate((el) => getComputedStyle(el).textAlign)).toBe('left');
  await expect(page.locator('[data-ai-sw="att:files"]')).toBeChecked(); await expect(page.locator('[data-ai-sw="att:links"]')).toBeChecked();
  if (process.env.UPD_SHOTS) { await page.screenshot({ path: process.env.UPD_SHOTS + '/ai-settings1.png' }); await page.evaluate(() => document.querySelector('#panelLayer').scrollTo(0, 800)); await page.waitForTimeout(300); await page.screenshot({ path: process.env.UPD_SHOTS + '/ai-settings2.png' }); }
  await expect(page.locator('.aistat .aibadge')).toHaveText('E'); // у «api.example.com» и модели «m» фирма неизвестна — по имени сайта
  await page.click('[data-ai-act="open"]'); await page.waitForTimeout(500);
  await expect(page.locator('[data-aiin]')).toBeVisible();
  await expect(page.locator('.aibrand')).toContainText('Отвечает: Example');
  expect(await page.locator('[data-aiin]').evaluate((el) => getComputedStyle(el).textAlign)).toBe('left');
  // файл
  await page.setInputFiles('[data-aifile]', { name: 'аккорды.txt', mimeType: 'text/plain', buffer: Buffer.from('Am  G\nСлова песни') });
  await expect(page.locator('.aichip', { hasText: 'аккорды.txt' })).toBeVisible();
  // ссылка
  await page.click('[data-ai="link"]'); await page.fill('[data-ailink]', 'https://site.org/song'); await page.click('[data-ai="linkgo"]');
  await expect(page.locator('.aichip', { hasText: 'site.org' })).toBeVisible();
  await expect(page.locator('[data-aictx]')).toContainText('вложения: 2');
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/ai-chat-att.png' });
  await page.fill('[data-aiin]', 'Забери аккорды'); await page.click('[data-ai="send"]');
  await expect(page.locator('.aim.a').first()).toContainText('Разобрал', { timeout: 8000 });
  await expect(page.locator('.aim.a .aiwho').first()).toContainText('Example');
  const calls = await page.evaluate(() => window.__aiCalls); const sent = calls[0].body.messages.at(-1).content;
  expect(sent).toContain('=== ВЛОЖЕНИЕ: аккорды.txt ==='); expect(sent).toContain('Am  G'); expect(sent).toContain('Куплет: Am G C'); expect(sent).toContain('Песня на сайте');
  await expect(page.locator('.aim.u .aiatl')).toContainText('аккорды.txt');
  await expect(page.locator('.aichip')).toHaveCount(0); // после отправки вложения очищены
  void errors;
});

test('нейросеть: ссылки по умолчанию выключены — кнопки «ссылка» нет, файлы включены', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((c) => { try { if (!localStorage.getItem('melete.ai')) localStorage.setItem('melete.ai', JSON.stringify(c)); } catch { /* */ } }, CFG);
  await melete.open({ settings: { home: { off: [] } } });
  await page.evaluate(() => { window.__melete.ai.__test({ avail: true }); window.__melete.render(); });
  await page.waitForTimeout(400);
  await page.locator('.mascotb[data-act="aichat"]').click(); await page.waitForTimeout(500);
  await expect(page.locator('[data-ai="file"]')).toBeVisible(); await expect(page.locator('[data-ai="link"]')).toHaveCount(0);
  void errors;
});

test('нейросеть: значок и название — Claude и Gemini по модели, сами', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((c) => { try { if (!localStorage.getItem('melete.ai')) localStorage.setItem('melete.ai', JSON.stringify(c)); } catch { /* */ } }, { ...CFG, format: 'anthropic', url: 'https://api.anthropic.com', model: 'claude-haiku-5-5' });
  await melete.open({ settings: { home: { off: [] } } });
  await page.evaluate(() => { window.__melete.ai.__test({ avail: true }); window.__melete.render(); });
  await page.waitForTimeout(400);
  await page.locator('.mascotb[data-act="aichat"]').click(); await page.waitForTimeout(500);
  await expect(page.locator('.aibrand')).toContainText('Отвечает: Claude'); await expect(page.locator('.aibrand')).toContainText('claude-haiku-5-5'); await expect(page.locator('.aibrand .aibadge')).toHaveText('C');
  if (process.env.UPD_SHOTS) await page.screenshot({ path: process.env.UPD_SHOTS + '/ai-brand.png' });
  // сменить модель на Gemini — значок меняется сам
  await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('melete.ai')); c.model = 'gemini-2.5-flash'; c.url = 'https://generativelanguage.googleapis.com/v1beta/openai/'; c.format = 'openai'; localStorage.setItem('melete.ai', JSON.stringify(c)); });
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.locator('.mascotb[data-act="aichat"]').click(); await page.waitForTimeout(500);
  await expect(page.locator('.aibrand')).toContainText('Отвечает: Gemini'); await expect(page.locator('.aibrand .aibadge')).toHaveText('G');
  void errors;
});

test('нейросеть: экранная клавиатура не закрывает поле ввода и кнопку отправки (--kb поднимает шторку)', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((c) => { try { if (!localStorage.getItem('melete.ai')) localStorage.setItem('melete.ai', JSON.stringify(c)); } catch { /* */ } }, CFG);
  await melete.open({ settings: { home: { off: [] } } });
  await page.evaluate(() => { window.__melete.ai.__test({ avail: true, post: async () => ({ status: 200, data: '{}' }) }); window.__melete.render(); });
  await page.waitForTimeout(400);
  await page.locator('.topbar .hai[data-act="aichat"]').click(); await page.waitForTimeout(600);
  const KB = 380;
  await page.evaluate((k) => document.documentElement.style.setProperty('--kb', k + 'px'), KB); await page.waitForTimeout(300);
  const box = async (sel) => page.locator(sel).first().boundingBox();
  const ta = await box('[data-aiin]'), send = await box('[data-ai="send"]');

  expect(ta.y + ta.height).toBeLessThanOrEqual(844 - KB + 1); // поле выше клавиатуры
  expect(send.y + send.height).toBeLessThanOrEqual(844 - KB + 1); // и кнопка отправки тоже
  expect(ta.y).toBeGreaterThan(0);
  void errors;
});
