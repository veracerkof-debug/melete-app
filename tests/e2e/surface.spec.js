// Доля рабочей поверхности (слово автора 18.11.2026, CLAUDE.md «Основной принцип»): площадь поверхности инструмента
// (доска, клавиатура, холст, шкала) к площади его окна, в full, half, quarter, strip на телефоне 390×800.
// SURFACE=1 npx playwright test tests/e2e/surface.spec.js — прогон со снимками в surface-out/ и таблицей report-*.json;
// без SURFACE проверяются только пороги (full ≥ 80 %, half ≥ 70 %) у инструментов из SURF с флагом gate.
// SURFACE_ONLY=glider,piano — только эти инструменты.
import { test, expect } from './melete.js';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'surface-out';
const SNAP = !!process.env.SURFACE;
const ONLY = (process.env.SURFACE_ONLY || '').split(',').filter(Boolean);
const W = 390, H = 800;
// раскладки окон: целое, половина, четверть, полоса (как в screens.spec.js)
const LAYOUTS = [['full', 'F', 1, 0.5], ['half', 'HH', 2, 0.5], ['quarter', 'QQ', 4, 0.5], ['strip', 'SS', 4, 0.5]];
// SURF: id инструмента → селектор рабочей поверхности (объединение площадей всех совпавших, внутри окна).
// gate — порог для full/half проверяется тестом (инструмент уже приведён к правилу); иначе только измерение.
export const SURF = {
  // ядро замеров: инструменты, приведённые к правилу (с порогом)
  glider: { sel: '#glpad', gate: true },
  theremin: { sel: '.tm', gate: true },
  piano: { sel: '.kbs', gate: true },
  // круглые и «одна кнопка» (ширина окна ограничивает круг — доля площади ниже 80 % по природе фигуры)
  drone: { sel: '.dgrid', gate: true },
  looper: { sel: '.lpbtn' },
  metro: { sel: '#mwheel' },
  theory: { sel: '.csvg' },
  // остальные — только замер
  studio: { sel: '.stpl canvas', seed: 'studio' },
  show: { sel: '.shbody' },
  voice: { sel: '.vc-stage' },
  tuner: { sel: '.tvis' },
  spectrum: { sel: '.spbox' },
  vocal: { sel: '.vcv' },
  convert: { sel: '.cvlist' },
  beat: { sel: '.rygrid' },
  ear: { sel: '.edgrid' },
  book: { sel: '.swrap' },
};

test.skip(!SNAP && !Object.values(SURF).some((v) => v.gate), 'нет инструментов с порогом');

// в окне страницы: объединённая площадь совпавших элементов внутри окна (пересечения не считаются дважды)
function measure({ id, sel }) {
  const pane = [...document.querySelectorAll('.session .pane')].find((p) => p.dataset.tool === id);
  if (!pane) return null;
  const pr = pane.getBoundingClientRect();
  const vis = (el) => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05; };
  const rs = [...pane.querySelectorAll(sel)].filter(vis).map((el) => el.getBoundingClientRect()).map((r) => ({ l: Math.max(r.left, pr.left), t: Math.max(r.top, pr.top), r: Math.min(r.right, pr.right), b: Math.min(r.bottom, pr.bottom) })).filter((r) => r.r > r.l && r.b > r.t);
  const xs = [...new Set(rs.flatMap((r) => [r.l, r.r]))].sort((a, b) => a - b), ys = [...new Set(rs.flatMap((r) => [r.t, r.b]))].sort((a, b) => a - b);
  let area = 0;
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) if (rs.some((r) => r.l <= xs[i] && r.r >= xs[i + 1] && r.t <= ys[j] && r.b >= ys[j + 1])) area += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
  return { w: Math.round(pr.width), h: Math.round(pr.height), surf: Math.round(area), share: Math.round((area / (pr.width * pr.height)) * 100) };
}

for (const [size, layout, per, ratio] of LAYOUTS) {
  test('поверхность ' + size, async ({ browser }) => {
    test.setTimeout(600_000);
    const ctxB = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'ru-RU' });
    const page = await ctxB.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const { helpers } = await import('./melete.js');
    const melete = helpers(page);
    await melete.open({ settings: { church: true, feat: { studio: true } } });
    const ids = Object.keys(SURF).filter((id) => (SNAP || SURF[id].gate) && (!ONLY.length || ONLY.includes(id)));
    fs.mkdirSync(OUT, { recursive: true });
    const rows = {};
    for (const id of ids) {
      const others = ['metro', 'tuner', 'drone'].filter((x) => x !== id).slice(0, per - 1);
      await page.evaluate(({ layout, panes, ratio }) => { const d = JSON.parse(localStorage.getItem('practice.v1.tools') || '{}'); d.wsMap = { free: { layout, panes, focus: 0, sub: {}, ratio } }; localStorage.setItem('practice.v1.tools', JSON.stringify(d)); }, { layout, panes: [id, ...others], ratio });
      if (SURF[id].seed === 'studio') await page.evaluate(async () => { // проект в старом месте — при запуске переедет в базу
        const P = await import('/src/music/project.js'), p = P.newProject(); p.name = 'Замер'; p.id = 'psurf'; p.clips = [];
        P.addClip(p, p.tracks.find((x) => x.kind === 'notes'), 0).len = 4;
        const s = JSON.parse(localStorage.getItem('practice.v1')); s.projects = [p]; localStorage.setItem('practice.v1', JSON.stringify(s));
      });
      await page.reload(); await page.waitForTimeout(700);
      await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
      await page.waitForSelector('.session .pane', { timeout: 10_000 }).catch(() => {});
      await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(900);
      if (SURF[id].seed === 'studio') { await page.evaluate(() => document.querySelector('.session .pane .stproj')?.click()); await page.waitForTimeout(1200); }
      const m = await page.evaluate(measure, { id, sel: SURF[id].sel });
      rows[id] = m;
      if (SNAP) await page.screenshot({ path: path.join(OUT, size + '-' + id + '.png') });
      if (SURF[id].gate && m && !process.env.SURFACE_NOGATE) {
        const min = size === 'full' ? 80 : size === 'half' ? 70 : 0;
        expect(m.share, id + ' ' + size + ' ' + JSON.stringify(m)).toBeGreaterThanOrEqual(min);
      }
    }
    if (SNAP) fs.writeFileSync(path.join(OUT, 'report-' + size + '.json'), JSON.stringify(rows, null, 1));
    await ctxB.close();
    expect(errs).toEqual([]);
  });
}
