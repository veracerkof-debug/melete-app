import { describe, it, expect } from 'vitest';
import { kindOfError, kindOfStatus, statOf, summarize, slowWhy, configSteps, verdict, reportOf, SLOW_MS, SLOW_TOKENS } from '../src/core/ai/netdiag.js';
import { parseResponse } from '../src/core/ai/provider.js';
import { answerQueries, cleanQueries } from '../src/core/ai/queries.js';
import { aiSection } from '../src/core/ai/selfdiag.js';
import { buildSystem } from '../src/core/ai/context.js';
import { clean } from '../src/core/ai/config.js';
import { diagnose } from '../src/core/diagnose.js';
import ru from '../src/i18n/ru.json';
import en from '../src/i18n/en.json';
import uz from '../src/i18n/uz.json';

const CFG = (o = {}) => clean({ on: true, format: 'openai', url: 'https://api.example.com/v1', model: 'm', key: 'sk-SECRET', access: { log: 'read' }, ...o });

describe('самодиагностика нейросети: причины', () => {
  it('ошибка сети → причина', () => {
    expect(kindOfError('java.net.UnknownHostException: Unable to resolve host "x"')).toBe('dns');
    expect(kindOfError('SocketTimeoutException: timeout')).toBe('timeout');
    expect(kindOfError('javax.net.ssl.SSLHandshakeException')).toBe('tls');
    expect(kindOfError('CLEARTEXT communication not permitted')).toBe('cleartext');
    expect(kindOfError('Failed to connect: Connection refused')).toBe('refused');
    expect(kindOfError('что-то ещё')).toBe('net');
  });
  it('код ответа → причина; 404 — «адрес или модель»', () => {
    expect([200, 401, 403, 404, 429, 503, 400].map(kindOfStatus)).toEqual(['ok', 'auth', 'auth', 'notfound', 'rate', 'server', 'bad']);
    expect(parseResponse(CFG(), 404, '{"error":{"message":"no model"}}').kind).toBe('notfound');
  });
  it('замеры: сводка, «долго» — из-за размера или модели', () => {
    const L = [statOf({ t: 1, ms: 3000, tok: 2000, status: 200 }), statOf({ t: 2, ms: 30000, tok: 20000, status: 200 }), statOf({ t: 3, ms: 500, tok: 10, kind: 'dns' })];
    const S = summarize(L); expect(S).toMatchObject({ n: 3, ok: 2, fail: 1, by: { dns: 1 }, max: 30000 });
    expect(slowWhy({ ms: SLOW_MS, tok: SLOW_TOKENS })).toBe('big'); expect(slowWhy({ ms: SLOW_MS, tok: 100 })).toBe('slowmodel'); expect(slowWhy({ ms: 1000, tok: 99999 })).toBeNull();
  });
  it('шаги настроек и итог', () => {
    const s = configSteps(CFG({ key: '' }), true); expect(s.map((x) => x.st)).toEqual(['ok', 'ok', 'fail']); expect(verdict(s)).toEqual({ ok: false, kind: 'key' });
    expect(verdict(configSteps(CFG(), true)).ok).toBe(true);
  });
  it('отчёт и раздел для модели — без ключа', () => {
    const t = (k, v) => (ru[k] || k).replace(/\{(\w+)\}/g, (_, n) => (v && v[n] != null ? v[n] : ''));
    const steps = [...configSteps(CFG(), true), { id: 'req', st: 'fail', info: 'req.fail', kind: 'dns', vars: { msg: '' } }];
    const txt = reportOf({ format: 'openai', model: 'm', host: 'api.example.com', steps, stats: [statOf({ t: 1, ms: 1000, tok: 5, kind: 'dns', host: 'api.example.com' })] }, t);
    expect(txt).toContain('Устройство не нашло сервер'); expect(txt).not.toContain('sk-SECRET');
    const sec = aiSection([statOf({ t: 1, ms: 40000, tok: 20000, status: 200, host: 'h' })], { t: 2, ok: false, kind: 'req', steps }); expect(sec).toContain('Запросов в памяти: 1'); expect(sec).not.toContain('sk-');
  });
});

describe('самодиагностика нейросети: данные для модели и находки', () => {
  it('запрос diag идёт через «Журнал»', () => {
    expect(cleanQueries([{ q: 'diag' }])).toEqual([{ q: 'diag' }]);
    expect(answerQueries([{ q: 'diag' }], { diag: () => 'СВОДКА' }, CFG())).toContain('СВОДКА');
    expect(answerQueries([{ q: 'diag' }], { diag: () => 'СВОДКА' }, CFG({ access: { log: 'none' } }))).toContain('НЕТ ДОСТУПА');
  });
  it('в инструкции — «сначала diag», когда журнал открыт', () => {
    expect(buildSystem(CFG(), { mascot: 'М', lang: 'ru', now: 0 })).toContain('{"q":"diag"}');
  });
  it('находки: медленно и отказы', () => {
    const day = { c: { 'ai.err.dns': 4 }, t: { 'ai.req': { n: 4, sum: 140000, max: 50000, h: {} } }, g: {} };
    const f = diagnose({ days: { '2026-11-27': day }, events: [], last: {} }, {}, Date.parse('2026-11-27T12:00:00Z')).map((x) => x.id);
    expect(f).toContain('aierr');
  });
  it('слова есть во всех языках', () => {
    const keys = Object.keys(ru).filter((k) => /^(ai\.(why|dg|diag)|ai\.err\.(notfound|dns|tls|refused|cleartext)|diag\.[fh]\.ai(slow|err))/.test(k));
    expect(keys.length).toBeGreaterThan(40);
    for (const k of keys) { expect(en[k], 'en ' + k).toBeTruthy(); expect(uz[k], 'uz ' + k).toBeTruthy(); }
  });
});
