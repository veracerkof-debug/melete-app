// Точка входа чата с нейросетью (app.ai): настройки, готовность, сессия чата. Только Android (нативный HTTP), в веб-версии
// функции нет (правило 13: скрыта). Всё подгружается по требованию; в звуковой тракт не входит.
import { load, save, wipe, ready, checkUrl } from './config.js';
import { aiAvail, post as netPost, get as netGet } from './transport.js';
import { fromFile, fromUrl, shrinkImage } from './attach.js';
import { buildRequest, parseResponse } from './provider.js';
import { createChat } from './chat.js';
import { entries, logText } from '../log.js';
import { getLang, mascotGender } from '../../i18n/index.js';

const NAMES = { m: { ru: 'Мелетий', en: 'Meletius', uz: 'Meletiy' }, f: { ru: 'Мелета', en: 'Meleta', uz: 'Meleta' } };
export const mascotName = (lang = getLang()) => (NAMES[mascotGender()] || NAMES.f)[lang] || 'Melete';

export function createAi(app, { avail = aiAvail, post = netPost } = {}) {
  let chat = null, over = { avail: null, post: null, get: null };
  const api = {
    get avail() { return over.avail != null ? over.avail : avail(); },
    cfg: () => load(),
    save(patch) { const c = { ...load(), ...patch, access: { ...load().access, ...(patch && patch.access) } }; save(c); return load(); },
    ready: () => api.avail && ready(load()),
    // быстрая проверка связи: одно короткое сообщение без данных человека
    async ping() {
      const c = load(); if (!checkUrl(c.url).ok) return { ok: false, kind: 'config' };
      try { const r = await (over.post || post)(buildRequest(c, { system: 'Ответь одним словом.', messages: [{ role: 'user', content: 'Привет' }] })); return parseResponse(c, r.status, r.data); }
      catch (e) { return { ok: false, kind: (e && e.kind) || 'net', message: String((e && e.message) || '').slice(0, 120) }; }
    },
    chat() {
      return (chat ??= createChat({
        app, cfg: () => load(), post: (req) => (over.post || post)(req), mascot: () => mascotName(), lang: () => getLang(),
        data: () => ({ studio: (app.studioAI && app.studioAI.project()) || null, projects: (app.store.state.projects || []), songs: app.store.state.songs || [], recs: app.files ? app.files.list('audio').filter((r) => !r.stem && !r.dn && !r.show && !r.dict) : [], used: ((app.device && app.device.audio) || {}).used || {}, show: (app.device && app.device.show) || null, sessions: app.store.sessions(), goalMin: app.store.state.settings.goalMin || 0, logText: logText(entries().filter((e) => e[1] !== 'i')), now: Date.now() }),
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
