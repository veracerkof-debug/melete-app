// Самоанализ: по счёту диагностики (diag.js) за 7 дней приложение само находит, что не так на этом устройстве, и
// говорит, что делать. Чистые функции (тесты — tests/diag.test.js); слова — ключи i18n diag.f.<id> (что найдено)
// и diag.h.<id> (что делать), переменные — в vars. Пороги — с запасом: находка — повод действовать, а не шум.
import { mergeDays, p95, avg } from './diag.js';

const top = (obj, n = 3) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
const r1 = (x) => Math.round(x * 10) / 10;

// state — diag.state(); env — { audio: audio.state() | null }; now — для окна в 7 дней
export function diagnose(state, env = {}, now = Date.now()) {
  const w = mergeDays(state.days || {}, 7, now), c = w.c, t = w.t, g = w.g, out = [];
  const add = (id, sev, vars = {}, hint = id) => out.push({ id, sev, vars, hint }); // hint — ключ совета diag.h.<hint>
  const ev = (state.events || []).filter((e) => now - e[0] < 7 * 864e5);

  // Звук не успевает: секунды выше 90 % и 70 %; чаще всего при чём (обстановка перегрузок)
  const s90 = c['audio.s90'] || 0, s70 = c['audio.s70'] || 0;
  if (s90 >= 30 || s70 >= 600) {
    const ctx = {};
    ev.filter((e) => e[1] === 'overload').forEach((e) => {
      const x = e[2].ctx || {}, a = x.audio || {};
      String(x.open || '').split(',').filter(Boolean).forEach((m) => { ctx[m] = (ctx[m] || 0) + 1; });
      if (a.pads) ctx.pads = (ctx.pads || 0) + 1;
      if (a.verb) ctx['verb:' + a.verb] = (ctx['verb:' + a.verb] || 0) + 1;
      if (a.voices >= 12) ctx.voices = (ctx.voices || 0) + 1;
    });
    const when = top(ctx).map(([k]) => k).join(', ');
    add('overload', s90 >= 30 ? 'bad' : 'warn', { min90: r1(s90 / 60), min70: r1(s70 / 60), when }, when ? 'overloadAt' : 'overload'); // обстановка известна — совет с ней
  }
  if ((c['audio.squeeze'] || 0) >= 3) add('squeeze', 'warn', { n: c['audio.squeeze'] });
  if (g['audio.underrun'] && g['audio.underrun'].max > 0.01) add('underrun', 'warn', { pct: r1(g['audio.underrun'].max * 100) });
  const a = env.audio;
  if (a && a.base + a.out > 150) add('latency', 'warn', { ms: a.base + a.out });
  // Студия: ноты планировались позже своего времени
  if ((c['studio.late'] || 0) > 0) add('late', 'warn', { n: c['studio.late'], ms: Math.round((g['studio.lateMs'] || {}).max || 0) });
  // Интерфейс подвисал (длинные задачи главного потока — звук и касания запаздывают)
  const fr = c['ev.freeze'] || 0, lt = t['ui.longtask'];
  if (fr >= 3 || (lt && p95(lt) > 400 && lt.n >= 20)) add('freeze', fr >= 10 ? 'bad' : 'warn', { n: fr, max: Math.round(lt ? lt.max : 0) });
  // Вылеты и ошибки
  if ((c['app.crash'] || 0) > 0) add('crash', 'bad', { n: c['app.crash'] });
  const errs = {};
  Object.entries(c).forEach(([k, v]) => { if (k.startsWith('log.e.')) errs[k.slice(6)] = v; });
  const ne = Object.values(errs).reduce((s, v) => s + v, 0);
  if (ne > 0) add('errors', ne >= 20 ? 'bad' : 'warn', { n: ne, where: top(errs).map(([k, v]) => k + ' ' + v).join(', ') });
  // Скорость: запуск, открытие инструментов, обработки, сведение
  if (t['app.start'] && avg(t['app.start']) > 4000) add('start', 'warn', { s: r1(avg(t['app.start']) / 1000) });
  if (t['mod.load'] && p95(t['mod.load']) > 2500) add('modload', 'warn', { s: r1(p95(t['mod.load']) / 1000) });
  const jx = g['job.stems.x'] || g['job.stems.hq.x'];
  if (jx && avg(jx) > 2) add('stems', 'info', { x: r1(avg(jx)) });
  if (g['ana.x'] && avg(g['ana.x']) > 1) add('ana', 'info', { x: r1(avg(g['ana.x'])) });
  const rx = g['studio.render.x'];
  if (rx && avg(rx) > 0.8) add('render', 'warn', { x: r1(1 / Math.max(0.01, avg(rx))) });
  // Память и место
  if (g['mem.heap'] && g['mem.heap'].max > 0.8) add('memory', 'warn', { pct: Math.round(g['mem.heap'].max * 100) });
  if (g['disk.free'] && g['disk.free'].min < 300) add('disk', g['disk.free'].min < 100 ? 'bad' : 'warn', { mb: Math.round(g['disk.free'].min) });
  // Самопроверка и замер звука: последние итоги
  const ck = state.last && state.last.check;
  if (ck && Array.isArray(ck.v)) { const bad = ck.v.filter((r) => r.st === 'fail').map((r) => r.id); if (bad.length) add('check', 'bad', { list: bad.join(', ') }); }
  if (!ck || now - ck.t > 7 * 864e5) add('nocheck', 'info');
  const bn = state.last && state.last.bench;
  if (bn && bn.v && bn.v.x < 2.5) add('bench', bn.v.x < 1 ? 'bad' : 'warn', { x: r1(bn.v.x) });
  const rank = { bad: 0, warn: 1, info: 2 };
  return out.sort((x, y) => rank[x.sev] - rank[y.sev]);
}

// Сводка недели для экрана и отчёта: строки [ключ, значение] (числа — уже словами единиц на экране)
export function weekly(state, now = Date.now()) {
  const w = mergeDays(state.days || {}, 7, now), c = w.c, t = w.t, g = w.g;
  const num = (x) => (x == null ? null : r1(x));
  return {
    days: w.days,
    load: g['audio.load'] ? Math.round(avg(g['audio.load']) * 100) : null,
    loadMax: g['audio.load'] ? Math.round(g['audio.load'].max * 100) : null,
    min90: num((c['audio.s90'] || 0) / 60),
    overloads: c['ev.overload'] || 0,
    squeeze: c['audio.squeeze'] || 0,
    freezes: c['ev.freeze'] || 0,
    freezeMax: t['ui.longtask'] ? Math.round(t['ui.longtask'].max) : 0,
    errors: Object.entries(c).filter(([k]) => k.startsWith('log.e.')).reduce((s, [, v]) => s + v, 0),
    warns: Object.entries(c).filter(([k]) => k.startsWith('log.w.')).reduce((s, [, v]) => s + v, 0),
    crashes: c['app.crash'] || 0,
    start: t['app.start'] ? num(avg(t['app.start']) / 1000) : null,
    modload: t['mod.load'] ? num(avg(t['mod.load']) / 1000) : null,
    stems: (g['job.stems.x'] && num(avg(g['job.stems.x']))) || null,
    ana: (g['ana.x'] && num(avg(g['ana.x']))) || null,
    render: g['studio.render.x'] ? num(1 / Math.max(0.01, avg(g['studio.render.x']))) : null,
    late: c['studio.late'] || 0,
    opens: Object.entries(c).filter(([k]) => k.startsWith('mod.open.')).map(([k, v]) => [k.slice(9), v]).sort((x, y) => y[1] - x[1]),
  };
}

// Машиночитаемая сводка для отчёта (разработчик читает её без расспросов): счётчики, времена (n, среднее, p95, max),
// показатели (n, среднее, min, max), последние события с обстановкой, итоги самопроверки и замера
export function machine(state, env = {}, now = Date.now()) {
  const w = mergeDays(state.days || {}, 7, now), R = (x) => Math.round(x * 1000) / 1000;
  return {
    v: 1, days: w.days, env,
    c: w.c,
    t: Object.fromEntries(Object.entries(w.t).map(([k, x]) => [k, [x.n, Math.round(avg(x)), Math.round(p95(x)), Math.round(x.max)]])),
    g: Object.fromEntries(Object.entries(w.g).map(([k, x]) => [k, [x.n, R(avg(x)), R(x.min), R(x.max)]])),
    ev: (state.events || []).slice(-30).map(([tm, k, d]) => [new Date(tm).toISOString().slice(5, 19), k, d]),
    last: state.last || {},
  };
}
