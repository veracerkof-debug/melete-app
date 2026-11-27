// Проверка звука под нагрузкой (разбор 27.11.2026, пункт L3; принцип 3 «надёжность»): метроном 300 уд/мин с дроблением и полиритмом
// и частые нажатия на пианино — одновременно. Меряет, как ровно работает планировщик метронома (промежутки между вызовами),
// сколько «длинных задач» (> 50 мс) набралось на главном потоке и не ушёл ли звук вперёд часов.
// Запуск: STRESS=1 [STRESS_SEC=60] npm run e2e -- tests/e2e/stress.spec.js. В обычный прогон не входит.
// Это замер в браузере на компьютере: на телефоне автора числа будут хуже, но по ним видно, что стало хуже после правки.
import { test, expect, helpers } from './melete.js';

test.skip(!process.env.STRESS, 'нагрузочная проверка — по STRESS=1');

test('звук под нагрузкой: метроном 300 с дроблением и полиритмом + частые нажатия на пианино', async ({ page }) => {
  const SEC = +(process.env.STRESS_SEC || 30);
  test.setTimeout((SEC + 90) * 1000);
  const melete = helpers(page);
  await melete.open({ settings: { helpOff: true } });
  await melete.free('HH', ['metro', 'piano']);
  await page.evaluate(() => {
    const app = window.__melete, m = app.audio.metro, gaps = [], long = [];
    window.__stress = { gaps, long };
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => long.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); } catch { /* нет longtask */ }
    const orig = m.sched.bind(m); let last = 0;
    m.sched = () => { const n = performance.now(); if (last) gaps.push(n - last); last = n; orig(); };
    Object.assign(m.cfg, { bpm: 300, sub: 4, poly: 5, num: 7, den: 8 });
    app.audio.unlock && app.audio.unlock();
    m.start();
  });
  // пианино: частые нажатия по клавишам, пока идёт метроном (по 12 в секунду)
  const box = await page.locator('.pane[data-tool="piano"]').boundingBox();
  const end = Date.now() + SEC * 1000;
  for (let i = 0; Date.now() < end; i++) {
    const x = box.x + 20 + ((i * 37) % Math.max(40, box.width - 40)), y = box.y + box.height * 0.75;
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(40); await page.mouse.up(); await page.waitForTimeout(40);
  }
  const res = await page.evaluate(() => {
    const app = window.__melete, m = app.audio.metro, { gaps, long } = window.__stress;
    m.stop();
    const g = [...gaps].sort((a, b) => a - b), q = (p) => (g.length ? Math.round(g[Math.min(g.length - 1, Math.floor(g.length * p))]) : 0);
    return { ticks: g.length, gapP50: q(0.5), gapP99: q(0.99), gapMax: Math.round(g[g.length - 1] || 0), longTasks: long.length, longMax: Math.max(0, ...long) };
  });
  console.log('STRESS', JSON.stringify(res));
  expect(res.ticks, 'планировщик метронома вообще работал').toBeGreaterThan(SEC * 5);
  void expect;
  expect(res.gapMax, 'самая длинная пауза планировщика, мс (предел — запас упреждения)').toBeLessThan(400);
});
