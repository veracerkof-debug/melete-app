// Чат с нейросетью (слово автора 23–25.11.2026, docs/ai-chat.md): настройки подключения. Хранятся отдельным ключом
// `melete.ai` на устройстве — НЕ в practice.v1: не попадают в резервные копии, синхронизацию, экспорт и «Что нового».
// Выключено по умолчанию. Только https. Без DOM (хранилище передаётся для тестов).
export const KEY = 'melete.ai';
export const FORMATS = ['openai', 'anthropic'];
export const LEVELS = { songs: ['none', 'read', 'write'], text: ['none', 'read'], media: ['none', 'read', 'write'], studio: ['none', 'read', 'write'], plan: ['none', 'read', 'write'], stats: ['none', 'read'], log: ['none', 'read'] };
// attach — вложения в чат: files (файл с телефона уходит провайдеру целиком) и links (приложение само открывает ссылку по нажатию; по умолчанию выключено)
export const DEFAULTS = { on: false, format: 'openai', url: '', model: '', key: '', access: { songs: 'none', text: 'none', media: 'none', studio: 'none', plan: 'none', stats: 'none', log: 'none' }, attach: { files: true, links: false }, auto: false, instruction: '' };

// Агенты — несколько подключений (слово автора 27.11.2026: «ChatGPT, Gemini, Claude — выбирать, кто лучше, дешевле, быстрее»).
// Это не аккаунты, а разные нейросети и их ключи. Верхние поля format/url/model/key — всегда у выбранного агента (весь прочий код читает их как раньше).
export const AGENTS_MAX = 12;
const aid = () => 'g' + Math.random().toString(36).slice(2, 8);
export function cleanAgent(a, i = 0) {
  if (!a || typeof a !== 'object') return null;
  return { id: String(a.id || 'g' + (i + 1)).slice(0, 20), name: String(a.name || '').trim().slice(0, 40), format: FORMATS.includes(a.format) ? a.format : 'openai', url: String(a.url || '').trim().slice(0, 300), model: String(a.model || '').trim().slice(0, 120), key: String(a.key || '').trim().slice(0, 400) };
}
export const newAgent = (o = {}) => cleanAgent({ id: aid(), ...o });
export function clean(x) {
  const c = { ...DEFAULTS, ...(x && typeof x === 'object' ? x : {}) };
  // агенты: старое единственное подключение становится первым агентом; верхние поля — у выбранного
  let agents = Array.isArray(c.agents) ? c.agents.map(cleanAgent).filter(Boolean).slice(0, AGENTS_MAX) : [];
  const seen = new Set(); agents = agents.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
  if (!agents.length) agents = [cleanAgent({ id: 'g1', format: c.format, url: c.url, model: c.model, key: c.key })];
  c.agents = agents; c.agent = agents.some((a) => a.id === c.agent) ? c.agent : agents[0].id;
  const act = agents.find((a) => a.id === c.agent);
  c.format = act.format; c.url = act.url; c.model = act.model; c.key = act.key;
  c.instruction = String(c.instruction || '').slice(0, 2000);
  const a = (x && x.access) || {};
  c.access = Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [k, v.includes(a[k]) ? a[k] : 'none']));
  const at = (x && x.attach) || {};
  c.attach = { files: at.files === undefined ? true : !!at.files, links: !!at.links };
  c.on = !!c.on; c.auto = !!c.auto;
  return c;
}
export function load(storage = globalThis.localStorage) { try { return clean(JSON.parse(storage.getItem(KEY))); } catch { return clean(null); } }
export function save(cfg, storage = globalThis.localStorage) { try { storage.setItem(KEY, JSON.stringify(clean(cfg))); return true; } catch { return false; } }
export function wipe(storage = globalThis.localStorage) { try { storage.removeItem(KEY); storage.removeItem(KEY + '.chat'); } catch { /* */ } }

// Адрес: только https, без логина и пароля в нём; → { ok, url (без пробелов) } | { ok:false, why }
export function checkUrl(u) {
  const s = String(u || '').trim();
  if (!s) return { ok: false, why: 'empty' };
  let x; try { x = new URL(s); } catch { return { ok: false, why: 'bad' }; }
  if (x.protocol !== 'https:') return { ok: false, why: 'https' };
  if (x.username || x.password) return { ok: false, why: 'cred' };
  return { ok: true, url: x.origin + x.pathname.replace(/\/+$/, '') + x.search };
}
// Полный адрес запроса: адрес можно вписать корнем («https://api.openai.com/v1») или уже конечным
export function endpoint(cfg) {
  const u = checkUrl(cfg.url); if (!u.ok) return null;
  const end = cfg.format === 'anthropic' ? '/messages' : '/chat/completions';
  if (u.url.endsWith(end)) return u.url;
  if (cfg.format === 'anthropic') return u.url + (/\/v\d+$/.test(u.url) ? '' : '/v1') + end;
  return u.url + end;
}
export const ready = (cfg) => !!(cfg.on && cfg.key && cfg.model && endpoint(cfg));
// Доступ по категориям: need — 'read' (чтение или правка) | 'write'
export const canRead = (cfg, cat) => (cfg.access[cat] || 'none') !== 'none';
export const canWrite = (cfg, cat) => cfg.access[cat] === 'write';
