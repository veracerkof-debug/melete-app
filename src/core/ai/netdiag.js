// Самодиагностика связи с нейросетью (слово автора 27.11.2026): причина отказа человеческими словами, замеры запросов и
// «что делать». Чистые функции, без сети и DOM (тесты — tests/ainetdiag.test.js). Ключ и тексты запросов сюда не попадают.
export const STATS_MAX = 20;
export const SLOW_MS = 20_000, SLOW_TOKENS = 15_000;

// Причина по тексту ошибки нативного HTTP (Capacitor/Java)
export function kindOfError(msg) {
  const m = String(msg || '');
  if (/time ?out|timed out|SocketTimeout/i.test(m)) return 'timeout';
  if (/UnknownHost|Unable to resolve|resolve host|dns|nodename/i.test(m)) return 'dns';
  if (/SSL|TLS|certificate|handshake|CertPath|trust/i.test(m)) return 'tls';
  if (/cleartext|CLEARTEXT/i.test(m)) return 'cleartext';
  if (/refused|ECONNREFUSED|Connection reset|unreachable|ENETUNREACH/i.test(m)) return 'refused';
  return 'net';
}
// Причина по коду ответа
export function kindOfStatus(status) {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'notfound';
  if (status === 429) return 'rate';
  if (status >= 500) return 'server';
  return 'bad';
}
// Запись о запросе для журнала и счётчиков: только числа и причина (ни адреса с путём, ни текста)
export function statOf({ t, ms, tok, status, kind, host }) {
  return { t, ms: Math.round(ms), tok: tok || 0, status: status || 0, kind: kind || kindOfStatus(status), host: String(host || '').slice(0, 60) };
}
export const statLine = (s) => (s.kind === 'ok' ? 'ответ' : 'отказ ' + s.kind) + (s.status ? ' ' + s.status : '') + ', ' + (s.ms / 1000).toFixed(1) + ' с, ≈' + s.tok + ' токенов' + (s.host ? ', ' + s.host : '');

// Сводка последних запросов
export function summarize(stats) {
  const L = (stats || []).slice(-STATS_MAX), ok = L.filter((s) => s.kind === 'ok'), by = {};
  L.forEach((s) => { if (s.kind !== 'ok') by[s.kind] = (by[s.kind] || 0) + 1; });
  const ms = ok.map((s) => s.ms).sort((a, b) => a - b);
  return { n: L.length, ok: ok.length, fail: L.length - ok.length, by, avg: ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : 0, max: ms.length ? ms[ms.length - 1] : 0, tokAvg: ok.length ? Math.round(ok.reduce((a, s) => a + s.tok, 0) / ok.length) : 0 };
}
// Почему медленно: больше всего времени — у модели (большой запрос, тяжёлая модель) или в сети (малый запрос, а долго)
export function slowWhy({ ms, tok }) {
  if (!ms || ms < SLOW_MS) return null;
  return tok >= SLOW_TOKENS ? 'big' : 'slowmodel';
}

// Проверка настроек без сети: [{ id, st: 'ok'|'fail', key }]
export function configSteps(cfg, urlOk) {
  return [
    { id: 'url', st: urlOk ? 'ok' : 'fail', info: urlOk ? 'url.ok' : 'url.fail' },
    { id: 'model', st: cfg.model ? 'ok' : 'fail', info: cfg.model ? 'model.ok' : 'model.fail' },
    { id: 'key', st: cfg.key ? 'ok' : 'fail', info: cfg.key ? 'key.ok' : 'key.fail' },
  ];
}
// Итог подробной проверки: steps (с настройками, пробным запросом, размером запроса и историей) → { ok, kind }
export function verdict(steps) { const bad = steps.find((s) => s.st === 'fail'); return { ok: !bad, kind: bad ? (bad.kind || bad.id) : null }; }

// Текст отчёта о связи (человек видит и отправляет сам; ключа нет)
export function reportOf(res, t) {
  const L = ['— Нейросеть: диагностика связи —', 'Формат: ' + (res.format || '?') + ', модель: ' + (res.model || '—') + ', хост: ' + (res.host || '—')];
  (res.steps || []).forEach((s) => L.push((s.st === 'ok' ? '✓ ' : s.st === 'warn' ? '! ' : '✗ ') + t('ai.dg.' + s.info, s.vars || {}) + (s.kind && s.st !== 'ok' ? ' — ' + t('ai.why.' + s.kind) : '')));
  if (res.stats && res.stats.length) { L.push('Последние запросы:'); res.stats.slice(-8).forEach((s) => L.push('  ' + new Date(s.t).toLocaleTimeString('ru-RU') + ' ' + statLine(s))); }
  return L.join('\n');
}
