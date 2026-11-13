// Аудит лаунчера (docs/launcher.md → «Как проверять»): все стили × колесо/циферблат — главный, правка, все приложения,
// настройки; находки (за край, наложение, контраст, мелкие цели, ошибки) — в OUT/report.txt; AUDIT_SHOTS=1 — снимки.
import { test } from './melete.js';
import fs from 'fs';
import path from 'path';
const OUT = process.env.OUT || 'test-results/launcher-audit/';
fs.mkdirSync(OUT, { recursive: true });
const PAGE = '/launcher/index.html';
const STYLES = ['classic','strip','soft','term','menu','cli','inst','panel','tele','cont','diary'];
test('audit', async ({ page }) => {
  test.setTimeout(600000);
  await page.setViewportSize({ width: +(process.env.AUDIT_W || 390), height: +(process.env.AUDIT_H || 820) });
  await page.addInitScript({ path: path.resolve('tests/launcher-tools/audit.js') });
  const all = [];
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const MODE = process.env.AUDIT_SHOTS === '1';
  for (const st of STYLES) {
    for (const v of [{}, { homeWheel: true }, { homeWheel: true, wheelShape: 'dial', bulge: true }]) {
      const tag = st + (v.homeWheel ? (v.wheelShape === 'dial' ? '+dial' : '+wheel') : '');
      await page.goto(PAGE);
      await page.evaluate(([p]) => { localStorage.clear(); localStorage.setItem('elachiston.money.draft', JSON.stringify({ recs: [{ k: 'i', a: 1250000 }, { k: 'e', a: 350000 }] })); localStorage.setItem('elachiston.prefs', JSON.stringify({ v: 2, lang: 'ru', mono: false, church: true, cross: 'dove', crossAt: 'center', ...p })); }, [{ style: st, ...v }]);
      await page.reload();
      await page.waitForSelector('.l-home .clock');
      await page.waitForTimeout(700);
      all.push(...await page.evaluate((l) => window.__audit('.l-home', l), tag + ' главный'));
      if (MODE && !v.homeWheel) await page.screenshot({ path: OUT + st + '-home.png' });
      if (v.homeWheel) continue;
      // правка: удержание часов
      const c = await page.locator('[data-blk="clock"]').boundingBox();
      await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
      await page.waitForTimeout(300);
      all.push(...await page.evaluate((l) => window.__audit('.l-home', l), tag + ' правка'));
      if (MODE) await page.screenshot({ path: OUT + st + '-edit.png' });
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      // все приложения
      await page.keyboard.press('ArrowUp'); await page.waitForTimeout(500);
      all.push(...await page.evaluate((l) => window.__audit('.l-drawer', l), tag + ' все'));
      if (MODE) await page.screenshot({ path: OUT + st + '-drawer.png' });
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      // настройки: вид и главный
      { const sp = await page.locator('.l-spacer').boundingBox(); const y = sp && sp.height > 30 ? sp.y + sp.height / 2 : 14; await page.mouse.move(200, y); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); }
      await page.waitForTimeout(500);
      all.push(...await page.evaluate((l) => window.__audit('.l-sheet', l), tag + ' настройки'));
      if (MODE) await page.screenshot({ path: OUT + st + '-settings.png' });
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    }
  }
  fs.writeFileSync(OUT + 'report.txt', [...errs.map((e) => 'ОШИБКА ' + e), ...all].join('\n'));
});
