// Совместное чтение (слово автора 22.11.2026): модуль «Вместе» есть только в церковном режиме; не подключён — одна кнопка;
// подключение к (фальшивому) GitHub, отчёт дня уходит в репозиторий, экран без прокрутки
import { test, expect } from './melete.js';

test('«Вместе»: подключение, отчёт, экран без прокрутки', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // фальшивый GitHub: репозиторий в памяти страницы
  const files = new Map(); let rev = 0;
  const sha = (s) => 'h' + [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16) + s.length;
  await page.route('https://api.github.com/**', async (route) => {
    const req = route.request(), u = new URL(req.url()), m = req.method();
    const json = (status, body, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'etag', ...headers }, body: JSON.stringify(body) });
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const p = u.pathname;
    if (/^\/repos\/[^/]+\/[^/]+$/.test(p)) return json(200, { default_branch: 'main', permissions: { push: true } });
    if (p.includes('/git/trees/')) return files.size ? json(200, { tree: [...files].map(([path, f]) => ({ path, sha: f.sha, type: 'blob' })) }, { etag: '"r' + rev + '"' }) : json(409, { message: 'Git Repository is empty.' });
    if (p.includes('/git/blobs/')) { const f = [...files.values()].find((x) => x.sha === p.split('/').pop()); return f ? route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: Buffer.from(f.body, 'base64') }) : json(404, { message: 'Not Found' }); }
    if (p.includes('/contents/') && m === 'PUT') { const path = decodeURIComponent(p.split('/contents/')[1]), b = JSON.parse(req.postData()); const s = sha(b.content + path); files.set(path, { sha: s, body: b.content }); rev++; return json(201, { content: { path, sha: s } }); }
    return json(404, { message: 'Not Found' });
  });
  await melete.open({ settings: { church: true, configured: true } });
  await melete.tab('bible'); await page.waitForTimeout(600); // «Вместе» — не отдельный инструмент, а кнопка в полосе Библии (с 22.11.2026)
  await page.click('[data-x="btogether"]'); await page.waitForTimeout(700);
  await expect(page.locator('.tg [data-x="connect"]')).toBeVisible();
  await page.click('.tg [data-x="connect"]');
  await page.fill('[data-f="invite"]', 'alice/data'); await page.fill('[data-f="token"]', 'tok'); await page.fill('[data-f="name"]', 'Алиса');
  await page.click('[data-go="create"]');
  await expect(page.locator('.tg [data-x="report"]')).toBeVisible({ timeout: 10_000 });
  expect([...files.keys()].some((k) => k === 'couple.json')).toBe(true);
  await page.click('.tg [data-x="report"]');
  await page.fill('[data-f="text"]', 'Хорошо');
  await page.click('[data-send]');
  await expect.poll(() => [...files.keys()].some((k) => /\/c\/\d{4}-\d\d-\d\d\.json$/.test(k)), { timeout: 10_000 }).toBe(true);
  const sc = await page.locator('.tg').evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(sc).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/together.png' });
  errors.splice(0, errors.length, ...errors.filter((e) => !/409/.test(e))); // пустой репозиторий отвечает 409 (так и у настоящего GitHub)
});
