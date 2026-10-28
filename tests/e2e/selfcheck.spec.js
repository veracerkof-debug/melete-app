// Диагностика (панель → «Диагностика») и самопроверка внутри неё: все проверки проходят в браузере с поддельными
// устройствами; диагностика показывает находки и живые показания, отчёт несёт сводку для разработчика
import { test, expect } from './melete.js';

test('все проверки в порядке', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(500);
  await melete.click('[data-act="diag"]'); await page.waitForTimeout(500);
  await melete.click('[data-dg-act="check"]');
  await page.waitForSelector('[data-ck-act="run"]:not([disabled])', { timeout: 90_000 });
  const rows = await page.evaluate(() => [...document.querySelectorAll('.ckrow')].map((r) => ({ id: r.dataset.ck, st: r.dataset.st, info: r.querySelector('.psub')?.textContent || '' })));
  expect(rows.length).toBe(12);
  for (const r of rows) test.info().annotations.push({ type: r.id, description: r.st + ' — ' + r.info });
  // запас звука зависит от машины проверки: «с замечанием» допустимо, «не прошло» — нет
  const bad = rows.filter((r) => r.st !== 'ok' && r.st !== 'skip' && !(r.id === 'bench' && r.st === 'warn'));
  expect(bad, 'проверки не в порядке').toEqual([]);
  // итог попал в журнал и в диагностику
  const logged = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.log') || '[]').filter((x) => x[2] === 'check').length);
  expect(logged).toBeGreaterThan(5);
  expect(errors).toEqual([]);
});

test('диагностика: находки, показания, сводка в отчёте', async ({ page, melete, errors }) => {
  await melete.open();
  // неделя с перегрузкой и вылетом — самоанализ должен их назвать
  await page.evaluate(async () => {
    const D = await import('/src/core/diag.js');
    D.count('audio.s90', 120); D.count('app.crash'); D.gauge('audio.load', 0.95); D.event('overload', { load: 97 });
    D.flushDiag();
  });
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(500);
  await melete.click('[data-act="diag"]'); await page.waitForTimeout(800);
  const found = await page.evaluate(() => [...document.querySelectorAll('[data-find]')].map((x) => x.dataset.find));
  expect(found).toEqual(expect.arrayContaining(['overload', 'crash']));
  expect(await melete.count('[data-dg="now"] .cell')).toBeGreaterThan(3);
  const txt = await page.evaluate(async () => { const R = await import('/src/core/report.js'); const app = { store: { state: { settings: {} }, allSessions: () => [], songs: () => [] }, audio: { state: () => null } }; return R.reportText(app, 'x', true); });
  expect(txt).toContain('Диагностика за 7 дней');
  expect(txt).toContain('Сводка для разработчика:');
  const json = JSON.parse(txt.split('Сводка для разработчика:\n')[1].split('\n')[0]);
  expect(json.c['audio.s90']).toBe(120);
  expect(txt).toContain('Важное за 7 дней');
  expect(errors).toEqual([]);
});
