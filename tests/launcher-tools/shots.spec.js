// Снимки экранов лаунчера по стилям (docs/launcher.md → «Как проверять»): главный, все приложения, папка, настройки
// (три вида), кошелёк (ввод, обзор), блокнот. ST=стили через запятую, SCR=экраны, VAR=claude, MONO=1, THEME=dark, TAG=приставка.
import { test } from './melete.js';
const PAGE = '/launcher/index.html';
import fs from 'fs';
const OUT = process.env.OUT || 'test-results/launcher-shots/';
fs.mkdirSync(OUT, { recursive: true });
const STYLES = (process.env.ST || 'classic,strip,soft,term,menu,cli,inst,panel,tele,cont,diary').split(',');
const SCR = (process.env.SCR || 'home,drawer,folder,settings,app,money,notes').split(',');
const TAG = process.env.TAG || '';
test.describe.configure({ mode: 'parallel' });
for (const st of STYLES) test('shots ' + st, async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 820 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(PAGE);
  await page.evaluate(([s, V, M, TH]) => { localStorage.clear(); localStorage.setItem('elachiston.money.draft', JSON.stringify({ recs: [{ k: 'i', a: 1250000, c: 'salary', t: Date.now() - 864e5 * 3 }, { k: 'e', a: 350000, c: 'food', t: Date.now() - 3600e3 }, { k: 'e', a: 120000, c: 'trans', t: Date.now() - 864e5 }] })); localStorage.setItem('elachiston.prefs', JSON.stringify({ v: 2, lang: 'ru', mono: M === '1', church: true, cross: 'dove', style: s, ...(V ? { variant: V } : {}), ...(TH ? { theme: TH } : {}) })); }, [st, process.env.VAR || '', process.env.MONO || '', process.env.THEME || '']);
  await page.reload(); await page.waitForSelector('.l-home .clock'); await page.waitForTimeout(1000);
  const shot = (n) => page.screenshot({ path: OUT + TAG + st + '-' + n + '.png' });
  if (SCR.includes('home')) await shot('home');
  const esc = async () => { for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); } };
  if (SCR.includes('drawer')) { await page.keyboard.press('ArrowUp'); await page.waitForTimeout(800); await shot('drawer');
    if (SCR.includes('folder')) { const tabs = page.locator('.l-d-tab'); if (await tabs.count() > 2) { await tabs.nth(1).click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(700); await shot('folder'); } }
    await esc(); }
  if (SCR.includes('settings')) { { const sp = await page.locator('.l-spacer').first().boundingBox().catch(() => null); const y = sp && sp.height > 30 ? sp.y + sp.height / 2 : 14; await page.mouse.move(200, y); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up(); }
    await page.waitForTimeout(800); await shot('settings');
    await page.locator('.l-sheet-body').first().evaluate((b) => b.scrollTop = 700, null, { timeout: 2000 }).catch(() => {}); await page.waitForTimeout(300); await shot('settings2');
    await page.locator('.l-set-tabs button').nth(1).click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(500); await shot('settings3');
    await esc(); }
  if (SCR.includes('money')) { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(1500); await shot('money');
    const f = page.frameLocator('iframe.l-money:not(.l-notes)'); await f.locator('.top button').nth(1).click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(900); await shot('money2');
    await esc(); }
  if (SCR.includes('notes')) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1500); await shot('notes'); await esc(); }
  if (errs.length) console.log('ERRS ' + st, errs.join('\n'));
});
