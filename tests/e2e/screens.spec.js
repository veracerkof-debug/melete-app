// Проверка экранов (слово автора 14.11.2026, DECISIONS «Экраны: размеры окон»): каждый инструмент × раскладка окон ×
// положение телефона → снимок и замеры. Ищет: мелкие цели касания (< 40 px), кнопки друг на друге, кнопки и надписи за
// краем окна, надписи друг на друге, слишком много кнопок для маленького окна (четверть — 2, меньше — 1).
// Запуск: SCREENS=1 npm run e2e -- tests/e2e/screens.spec.js (долго; в обычный прогон не входит).
// SCREENS_ONLY=piano,metro — только эти; итог — screens-out/report.json и screens-out/index.html со снимками.
import { test, expect } from './melete.js';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'screens-out';
const ON = !!process.env.SCREENS;
const ONLY = (process.env.SCREENS_ONLY || '').split(',').filter(Boolean);
// телефон автора (Honor, 435×956 CSS-пикселей): стоя и на боку
// r — стоя, но пианино повёрнуто «на бок» самим приложением (кнопка поворота: экран сессии поворачивается целиком)
const PHONES = [['p', 435, 956], ['l', 956, 435], ['r', 435, 956]];
// раскладки: целое, половины, четверти, полосы; ratio — доля верхней части (0,25 — окно в 1/8)
const LAYOUTS = [['F', 1, 0.5], ['HH', 2, 0.5], ['QQ', 4, 0.5], ['SS', 4, 0.5], ['QQ', 4, 0.25, 'QQ25']];
// сколько кнопок помещается так, чтобы попасть и не перепутать: по площади окна
export const maxTargets = (w, h) => { const a = w * h; return a < 50000 ? 1 : a < 120000 ? 2 : a < 200000 ? 4 : 99; }; // как fitOf (src/core/workspace.js)

test.skip(!ON, 'проверка экранов — по SCREENS=1');

function measure() {
  // в окне страницы: замеры каждого окна сессии
  const vis = (el) => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const sel = 'button, [role="button"], a[href], input:not([type="hidden"]), select, textarea, [data-x], [data-act], [data-step]';
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('data-x') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 30);
  return [...document.querySelectorAll('.session .pane')].map((pane) => {
    const pr = pane.getBoundingClientRect(), id = pane.dataset.tool || '?';
    const clip = (r) => ({ left: Math.max(r.left, pr.left), top: Math.max(r.top, pr.top), right: Math.min(r.right, pr.right), bottom: Math.min(r.bottom, pr.bottom) });
    // кнопки окна: видимые и хоть чуть внутри окна; вложенные (кнопка в кнопке) — внешняя
    // рамка окна (ручка, «во весь экран») — общая для всех, считается отдельно
    let btns = [...pane.querySelectorAll(sel)].filter((el) => !el.matches('.grip, .pfbtn') && vis(el) && !el.closest('[aria-hidden="true"]') && !(el.parentElement && el.parentElement.closest(sel) && pane.contains(el.parentElement.closest(sel))));
    // невидимые за прокруткой внутри окна — тоже «за краем»
    const issues = [];
    const rects = btns.map((el) => ({ el, r: el.getBoundingClientRect() }));
    const inPane = rects.filter(({ r }) => inter(r, pr) > 0);
    inPane.forEach(({ el, r }) => {
      const c = clip(r), w = c.right - c.left, h = c.bottom - c.top;
      if (Math.min(w, h) < 30) issues.push(['small', name(el), Math.round(w) + '×' + Math.round(h)]);
      else if (Math.min(w, h) < 40) issues.push(['small40', name(el), Math.round(w) + '×' + Math.round(h)]);
      if (inter(r, pr) < r.width * r.height * 0.9) issues.push(['cut', name(el)]);
    });
    for (let i = 0; i < inPane.length; i++) for (let j = i + 1; j < inPane.length; j++) {
      const a = inPane[i], b = inPane[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const o = inter(a.r, b.r), m = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
      if (m && o / m > 0.25) issues.push(['overlap', name(a.el) + ' / ' + name(b.el)]);
    }
    // надписи: листья с текстом, наложение друг на друга и обрезка
    const texts = [...pane.querySelectorAll('*')].filter((el) => el.childElementCount === 0 && el.textContent.trim() && vis(el) && !el.closest('[aria-hidden="true"]')).map((el) => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => inter(r, pr) > 0).slice(0, 250);
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      const o = inter(a.r, b.r), m = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
      if (m && o / m > 0.3) issues.push(['textover', name(a.el) + ' / ' + name(b.el)]);
    }
    texts.forEach(({ el, r }) => {
      if (inter(r, pr) < r.width * r.height * 0.8) issues.push(['textcut', name(el)]);
      else if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).textOverflow !== 'ellipsis' && getComputedStyle(el).overflow !== 'visible') issues.push(['textclip', name(el)]);
    });
    // пустое: доля окна без содержимого (карточка посередине и пустые поля по краям)
    const kids = [...pane.querySelectorAll('.pbody *')].filter(vis).map((el) => el.getBoundingClientRect()).filter((r) => r.width * r.height < pr.width * pr.height * 0.95);
    let minX = pr.right, maxX = pr.left, minY = pr.bottom, maxY = pr.top;
    kids.forEach((r) => { minX = Math.min(minX, r.left); maxX = Math.max(maxX, r.right); minY = Math.min(minY, r.top); maxY = Math.max(maxY, r.bottom); });
    const used = kids.length ? (Math.min(maxX, pr.right) - Math.max(minX, pr.left)) * (Math.min(maxY, pr.bottom) - Math.max(minY, pr.top)) / (pr.width * pr.height) : 0;
    return { id, size: pane.dataset.size || pane.className.match(/\b(full|half|quarter|strip)\b/)?.[1] || '', w: Math.round(pr.width), h: Math.round(pr.height), x: Math.round(pr.left), y: Math.round(pr.top), targets: inPane.length, used: Math.round(used * 100), issues };
  });
}

for (const [ori, W, H] of PHONES) {
  for (const [layout, per, ratio, label = layout] of LAYOUTS) {
    test('экраны ' + ori + ' ' + label, async ({ browser }) => {
      test.setTimeout(900_000);
      const ctxB = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'ru-RU' });
      const page = await ctxB.newPage();
      const { helpers } = await import('./melete.js');
      const melete = helpers(page);
      await melete.open({ settings: { church: true, feat: { studio: true } } });
      let ids = await melete.modules();
      if (ONLY.length) ids = ids.filter((x) => ONLY.includes(x));
      if (ori === 'r') { ids = ['piano']; await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('practice.v1.tools') || '{}'); d.piano = Object.assign(d.piano || {}, { rot: true }); localStorage.setItem('practice.v1.tools', JSON.stringify(d)); }); }
      fs.mkdirSync(OUT, { recursive: true });
      const rows = [];
      // каждый инструмент — в первом окне раскладки, остальные окна — другими инструментами (сочетания)
      for (let i = 0; i < ids.length; i++) {
        const panes = [ids[i], ...ids.filter((x) => x !== ids[i]).slice(i % 5, (i % 5) + per - 1)];
        await page.evaluate(({ layout, panes, ratio }) => { const d = JSON.parse(localStorage.getItem('practice.v1.tools') || '{}'); d.wsMap = { free: { layout, panes, focus: 0, sub: {}, ratio } }; localStorage.setItem('practice.v1.tools', JSON.stringify(d)); }, { layout, panes, ratio });
        await page.reload(); await page.waitForTimeout(700);
        await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
        await page.waitForSelector('.session .pane', { timeout: 10_000 }).catch(() => {});
        await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(900);
        const m = await page.evaluate(measure);
        const file = ori + '-' + label + '-' + ids[i] + '.png';
        await page.screenshot({ path: path.join(OUT, file) });
        m.forEach((p) => { p.max = maxTargets(p.w, p.h); if (layout !== 'F' && p.targets > p.max) p.issues.push(['many', p.targets + ' > ' + p.max]); });
        rows.push({ ori, layout: label, main: ids[i], file, panes: m });
      }
      // SCREENS_ONLY — дописать к прежним замерам (остальные инструменты остаются)
      const fj = path.join(OUT, 'r-' + ori + '-' + label + '.json');
      const old = ONLY.length && fs.existsSync(fj) ? JSON.parse(fs.readFileSync(fj, 'utf8')).filter((r) => !ids.includes(r.main)) : [];
      fs.writeFileSync(fj, JSON.stringify(old.concat(rows), null, 1));
      await ctxB.close();
      expect(rows.length).toBe(ids.length);
    });
  }
}
