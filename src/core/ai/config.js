// Чат с нейросетью (слово автора 23–25.11.2026, docs/ai-chat.md): настройки подключения. Хранятся отдельным ключом
// `melete.ai` на устройстве — НЕ в practice.v1: не попадают в резервные копии, синхронизацию, экспорт и «Что нового».
// Выключено по умолчанию. Только https. Без DOM (хранилище передаётся для тестов).
export const KEY = 'melete.ai';
export const FORMATS = ['openai', 'anthropic'];
export const LEVELS = { songs: ['none', 'read', 'write'], stats: ['none', 'read'], log: ['none', 'read'] };
export const DEFAULTS = { on: false, format: 'openai', url: '', model: '', key: '', access: { songs: 'none', stats: 'none', log: 'none' }, auto: false, instruction: '' };

export function clean(x) {
  const c = { ...DEFAULTS, ...(x && typeof x === 'object' ? x : {}) };
  c.format = FORMATS.includes(c.format) ? c.format : 'openai';
  c.url = String(c.url || '').trim().slice(0, 300); c.model = String(c.model || '').trim().slice(0, 120); c.key = String(c.key || '').trim().slice(0, 400);
  c.instruction = String(c.instruction || '').slice(0, 2000);
  const a = (x && x.access) || {};
  c.access = Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [k, v.includes(a[k]) ? a[k] : 'none']));
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
