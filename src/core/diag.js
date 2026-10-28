// Диагностика — приложение само считает, как оно работает на этом устройстве (решение автора 28.10.2026: «чтобы
// приложение само всё подсчитывало и показывало, а не я описывал»). Только техническое и только здесь: ничего не
// отправляется само; видно на экране «Диагностика» (screens/diag.js), уходит — в отчёте, который отправляет человек.
// Без названий песен и файлов, текстов, имени, звука и кадров.
//
// Что хранится (localStorage, по дням, 14 дней):
//   счётчики  count(name, n)  — сколько раз (перегрузки, ошибки по разделам, открытия инструментов…);
//   времена   time(name, ms)  — сколько длилось (запуск, загрузка модуля, обработки): число, сумма, наибольшее,
//                               корзины для 95-го процентиля;
//   показатели gauge(name, v) — величины (нагрузка, память, во сколько раз быстрее реального времени): число, сумма,
//                               наименьшее, наибольшее;
//   события   event(kind, d)  — редкие важные случаи (перегрузка, вылет, подвисание) вместе с обстановкой: что открыто,
//                               сколько голосов, какая реверберация (поставщики обстановки — provide(name, fn)).
// Самоанализ по этим данным — diagnose.js (чистые функции), экран — screens/diag.js. Без DOM, кроме наблюдателя
// подвисаний (PerformanceObserver), памяти и места — они включаются в startDiag().

export const DIAG_KEY = 'practice.v1.diag';
export const DAYS = 14, EVENTS_MAX = 120;
const BINS = [16, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000, Infinity]; // мс — корзины времён

let S = null, saveTm = 0;
const providers = new Map(); // имя → () => значение для обстановки событий
const store = () => { try { return globalThis.localStorage; } catch { return null; } };
export const dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

export function emptyState() { return { v: 1, days: {}, events: [], last: {} }; }
function load() {
  if (S) return S;
  try { S = JSON.parse(store()?.getItem(DIAG_KEY) || 'null'); } catch { S = null; }
  if (!S || S.v !== 1 || typeof S.days !== 'object') S = emptyState();
  if (!Array.isArray(S.events)) S.events = [];
  if (!S.last || typeof S.last !== 'object') S.last = {};
  return S;
}
// Старше DAYS дней — вон; событий — не больше EVENTS_MAX
export function prune(state, now = Date.now()) {
  const keep = new Set(Array.from({ length: DAYS }, (_, i) => dayKey(now - i * 864e5)));
  Object.keys(state.days).forEach((k) => { if (!keep.has(k)) delete state.days[k]; });
  state.events = state.events.filter((e) => now - e[0] < DAYS * 864e5).slice(-EVENTS_MAX);
  return state;
}
export function flushDiag() {
  clearTimeout(saveTm); saveTm = 0;
  if (!S) return;
  prune(S);
  try { store()?.setItem(DIAG_KEY, JSON.stringify(S)); } catch { /* места нет — останется в памяти */ }
}
const later = () => { if (!saveTm) saveTm = setTimeout(flushDiag, 10000); };
const today = (state = load()) => { const k = dayKey(); return state.days[k] || (state.days[k] = { c: {}, t: {}, g: {} }); };
const key = (name) => String(name).slice(0, 48);

// Чистые свёртки (для тестов): одна запись в сводку дня
export function addCount(day, name, n = 1) { day.c[key(name)] = (day.c[key(name)] || 0) + n; }
export function addTime(day, name, ms) {
  const v = Math.max(0, +ms || 0), x = day.t[key(name)] || (day.t[key(name)] = { n: 0, sum: 0, max: 0, b: Array(BINS.length).fill(0) });
  x.n++; x.sum += v; x.max = Math.max(x.max, v); x.b[BINS.findIndex((u) => v <= u)]++;
}
export function addGauge(day, name, v) {
  const x = day.g[key(name)] || (day.g[key(name)] = { n: 0, sum: 0, min: Infinity, max: -Infinity });
  v = +v; if (!Number.isFinite(v)) return;
  x.n++; x.sum += v; x.min = Math.min(x.min, v); x.max = Math.max(x.max, v);
}

export const count = (name, n = 1) => { addCount(today(), name, n); later(); };
export const time = (name, ms) => { addTime(today(), name, ms); later(); };
export const gauge = (name, v) => { addGauge(today(), name, v); later(); };
// Последнее значение (не по дням): итог самопроверки, замер звука, сведения об устройстве
export const setLast = (name, v) => { load().last[key(name)] = { t: Date.now(), v }; later(); };
export const getLast = (name) => load().last[key(name)] || null;
// Замер: const stop = timer('name'); …; stop() — записать время
export const timer = (name) => { const t0 = performance.now(); return () => { const ms = performance.now() - t0; time(name, ms); return ms; }; };

// Обстановка для событий: provide('audio', () => ({ voices, verb, … })); поставщик с ошибкой — пропускается
export const provide = (name, fn) => { providers.set(name, fn); return () => providers.delete(name); };
export function snapshot() {
  const o = {};
  providers.forEach((fn, k) => { try { const v = fn(); if (v != null) o[k] = v; } catch { /* */ } });
  return o;
}
// Важный случай с обстановкой; одинаковые подряд чаще раза в 20 с — только счётчик
const lastEv = {};
export function event(kind, data = {}) {
  count('ev.' + kind);
  const now = Date.now();
  if (now - (lastEv[kind] || 0) < 20000) return;
  lastEv[kind] = now;
  load().events.push([now, key(kind), { ...data, ctx: snapshot() }]);
  if (load().events.length > EVENTS_MAX * 1.5) prune(load());
  later();
}

// Всё накопленное (копия) и сводка за n последних дней: { c, t, g } — суммы по дням
export const state = () => JSON.parse(JSON.stringify(load()));
export function mergeDays(days, n = 7, now = Date.now()) {
  const out = { c: {}, t: {}, g: {}, days: 0 };
  for (let i = 0; i < n; i++) {
    const d = days[dayKey(now - i * 864e5)];
    if (!d) continue;
    out.days++;
    Object.entries(d.c || {}).forEach(([k, v]) => { out.c[k] = (out.c[k] || 0) + v; });
    Object.entries(d.t || {}).forEach(([k, v]) => { const x = out.t[k] || (out.t[k] = { n: 0, sum: 0, max: 0, b: Array(BINS.length).fill(0) }); x.n += v.n; x.sum += v.sum; x.max = Math.max(x.max, v.max); (v.b || []).forEach((m, j) => { x.b[j] += m; }); });
    Object.entries(d.g || {}).forEach(([k, v]) => { const x = out.g[k] || (out.g[k] = { n: 0, sum: 0, min: Infinity, max: -Infinity }); x.n += v.n; x.sum += v.sum; x.min = Math.min(x.min, v.min == null ? Infinity : v.min); x.max = Math.max(x.max, v.max == null ? -Infinity : v.max); }); // в JSON бесконечность — null
  }
  return out;
}
// 95-й процентиль по корзинам (верхняя граница корзины), мс
export function p95(t) {
  if (!t || !t.n) return 0;
  const want = Math.ceil(t.n * 0.95);
  let acc = 0;
  for (let i = 0; i < BINS.length; i++) { acc += t.b[i] || 0; if (acc >= want) return Math.min(BINS[i], t.max); }
  return t.max;
}
export const avg = (x) => (x && x.n ? x.sum / x.n : 0);
export function clearDiag() { S = emptyState(); flushDiag(); }
// для тестов
export const _reset = () => { S = null; providers.clear(); Object.keys(lastEv).forEach((k) => delete lastEv[k]); };

// Запуск: подвисания интерфейса (длинные задачи главного потока — из-за них звук и касания запаздывают), память
// и место раз в минуту, сохранение при уходе в фон. Включается ядром один раз
let started = false;
export function startDiag() {
  if (started || typeof window === 'undefined') return;
  started = true;
  load();
  try {
    if (typeof PerformanceObserver !== 'undefined' && (PerformanceObserver.supportedEntryTypes || []).includes('longtask')) {
      new PerformanceObserver((list) => list.getEntries().forEach((e) => {
        if (document.visibilityState !== 'visible') return;
        time('ui.longtask', e.duration);
        if (e.duration > 700) event('freeze', { ms: Math.round(e.duration) });
      })).observe({ type: 'longtask', buffered: false });
    }
  } catch { /* нет наблюдателя */ }
  const sample = async () => {
    const m = performance.memory;
    if (m && m.jsHeapSizeLimit) gauge('mem.heap', m.usedJSHeapSize / m.jsHeapSizeLimit);
    try { const e = await navigator.storage.estimate(); if (e.quota) gauge('disk.free', Math.max(0, (e.quota - (e.usage || 0)) / 1048576)); } catch { /* */ }
  };
  setTimeout(sample, 20000);
  setInterval(() => { if (document.visibilityState === 'visible') sample(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') flushDiag(); });
  addEventListener('pagehide', flushDiag);
}
