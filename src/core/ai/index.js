// Точка входа чата с нейросетью (app.ai): настройки, готовность, сессия чата. Только Android (нативный HTTP), в веб-версии
// функции нет (правило 13: скрыта). Всё подгружается по требованию; в звуковой тракт не входит.
import { load, save, wipe, ready, checkUrl } from './config.js';
import { aiAvail, post as netPost, get as netGet } from './transport.js';
import { fromFile, fromUrl, shrinkImage } from './attach.js';
import { buildRequest, parseResponse } from './provider.js';
import { createChat } from './chat.js';
import { entries, logText, log } from '../log.js';
import { count as dCount, time as dTime } from '../diag.js';
import { statOf, kindOfStatus, kindOfError, configSteps, verdict, slowWhy, reportOf, STATS_MAX, SLOW_TOKENS } from './netdiag.js';
import { selfDiagText, aiSection } from './selfdiag.js';
import { getLang, mascotGender } from '../../i18n/index.js';

const NAMES = { m: { ru: 'Мелетий', en: 'Meletius', uz: 'Meletiy' }, f: { ru: 'Мелета', en: 'Meleta', uz: 'Meleta' } };
export const mascotName = (lang = getLang()) => (NAMES[mascotGender()] || NAMES.f)[lang] || 'Melete';

const STATS_KEY = 'melete.ai.stats'; // замеры запросов — рядом с настройками, вне копий и синхронизации
const readStats = () => { try { const j = JSON.parse(localStorage.getItem(STATS_KEY)); return Array.isArray(j) ? j.slice(-STATS_MAX) : []; } catch { return []; } };
const hostOf = (u) => { try { return new URL(u).host; } catch { return ''; } };

export function createAi(app, { avail = aiAvail, post = netPost } = {}) {
  let chat = null, over = { avail: null, post: null, get: null }, stats = readStats(), lastDiag = null;
  // Каждый запрос к модели меряется: время, размер (токены), причина отказа → память чата, журнал [ai], счётчики самоанализа
  const record = (s) => {
    stats = [...stats, s].slice(-STATS_MAX);
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* места нет — замеры только в памяти */ }
    try { dTime('ai.req', s.ms); if (s.kind !== 'ok') dCount('ai.err.' + s.kind); log('ai', (s.kind === 'ok' ? 'ответ ' : 'отказ ' + s.kind + ' ') + (s.status || '') + ', ' + (s.ms / 1000).toFixed(1) + ' с, ≈' + s.tok + ' токенов, ' + s.host, s.kind === 'ok' ? 'i' : 'w'); } catch { /* журнал не должен ломать запрос */ }
  };
  const timed = async (req) => {
    const t0 = performance.now(), tok = Math.ceil(JSON.stringify(req.body || '').length / 3.5), host = hostOf(req.url);
    try { const r = await (over.post || post)(req); record(statOf({ t: Date.now(), ms: performance.now() - t0, tok, status: r.status, host })); return r; }
    catch (e) { const kind = (e && e.kind) || kindOfError(e && e.message); record(statOf({ t: Date.now(), ms: performance.now() - t0, tok, kind, host })); throw e; }
  };
  const api = {
    get avail() { return over.avail != null ? over.avail : avail(); },
    cfg: () => load(),
    save(patch) { const c = { ...load(), ...patch, access: { ...load().access, ...(patch && patch.access) } }; save(c); return load(); },
    ready: () => api.avail && ready(load()),
    // быстрая проверка связи: одно короткое сообщение без данных человека
    async ping() {
      const c = load(); if (!checkUrl(c.url).ok) return { ok: false, kind: 'config' };
      try { const r = await timed(buildRequest(c, { system: 'Ответь одним словом.', messages: [{ role: 'user', content: 'Привет' }] })); return parseResponse(c, r.status, r.data); }
      catch (e) { return { ok: false, kind: (e && e.kind) || 'net', message: String((e && e.message) || '').slice(0, 120) }; }
    },
    // Подробная проверка: настройки → пробный запрос с замером → размер обычного запроса → история; для каждого шага — причина и что делать
    async diagnose() {
      const c = load(), steps = configSteps(c, checkUrl(c.url).ok);
      let ms = 0;
      if (steps.every((s) => s.st === 'ok')) {
        const t0 = performance.now(), r = await api.ping(); ms = performance.now() - t0;
        if (!r.ok) steps.push({ id: 'req', st: 'fail', info: 'req.fail', kind: r.kind, vars: { msg: r.message || '' } });
        else steps.push(ms > 8000 ? { id: 'req', st: 'warn', info: 'req.slow', kind: 'timeout', vars: { s: (ms / 1000).toFixed(1) } } : { id: 'req', st: 'ok', info: 'req.ok', vars: { s: (ms / 1000).toFixed(1) } });
        try { const tk = api.chat().preview().tokens; steps.push(tk > SLOW_TOKENS ? { id: 'ctx', st: 'warn', info: 'ctx.big', kind: 'big', vars: { n: tk } } : { id: 'ctx', st: 'ok', info: 'ctx.ok', vars: { n: tk } }); } catch { /* без размера */ }
        const hist = stats.filter((x) => x.kind === 'ok').slice(-5), slow = hist.map((x) => slowWhy(x)).find(Boolean);
        if (slow) steps.push({ id: 'hist', st: 'warn', info: 'hist.slow', kind: slow, vars: { s: (Math.max(...hist.map((x) => x.ms)) / 1000).toFixed(0) } });
      }
      const v = verdict(steps);
      lastDiag = { t: Date.now(), ok: v.ok, kind: v.kind, steps, ms: Math.round(ms) };
      return { ...lastDiag, format: c.format, model: c.model, host: hostOf(c.url), stats: stats.slice(), text: (tr) => reportOf({ format: c.format, model: c.model, host: hostOf(c.url), steps, stats }, tr) };
    },
    stats: () => stats.slice(),
    lastDiag: () => lastDiag,
    // сводка для отчёта о проблеме: без ключа и текстов
    reportSection: () => (load().on ? aiSection(stats, lastDiag) : ''),
    chat() {
      return (chat ??= createChat({
        app, cfg: () => load(), post: (req) => timed(req), mascot: () => mascotName(), lang: () => getLang(),
        data: () => ({ focusRec: (app.aiFocus && app.aiFocus.rec && app.files && app.files.get(app.aiFocus.rec)) || null, focusParts: (app.aiFocus && app.aiFocus.rec && app.files ? app.files.list('audio').filter((r) => r.stem && r.stem.src === app.aiFocus.rec).map((r) => r.stem.part) : []), studio: (app.studioAI && app.studioAI.project()) || null, projects: (app.store.state.projects || []), songs: app.store.state.songs || [], recs: app.files ? app.files.list('audio').filter((r) => !r.stem && !r.dn && !r.show && !r.dict) : [], used: ((app.device && app.device.audio) || {}).used || {}, show: (app.device && app.device.show) || null, sessions: app.store.sessions(), goalMin: app.store.state.settings.goalMin || 0, logText: logText(entries().filter((e) => e[1] !== 'i')), now: Date.now(), diag: () => selfDiagText(app, stats, lastDiag) }),
      }));
    },
    // Вложения: файл с телефона (текст, PDF, DOCX, HTML, картинка) и ссылка; ссылку приложение открывает само — только по нажатию и если это включено
    async attachFile(file) {
      if (!load().attach.files) throw Object.assign(new Error('off'), { kind: 'off' });
      return fromFile(file, { pdfText: async (u8) => (await import('./pdftext.js')).pdfText(u8), shrink: shrinkImage });
    },
    async attachUrl(url) {
      if (!load().attach.links) throw Object.assign(new Error('off'), { kind: 'off' });
      return fromUrl(url, over.get || netGet);
    },
    wipe() { wipe(); chat = null; },
  };
  // только для проверок в браузере (vite dev, как window.__melete): подменить доступность и сеть
  if (import.meta.env && import.meta.env.DEV) api.__test = (o) => { over = { avail: null, post: null, get: null, ...o }; chat = null; };
  return api;
}
