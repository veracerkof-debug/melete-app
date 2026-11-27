// Форматы запросов и ответов: OpenAI-совместимый (OpenAI, OpenRouter и др.) и Anthropic. Без сети и DOM.
import { endpoint } from './config.js';

export const MAX_TOKENS = 4096;
export function buildRequest(cfg, { system, messages }) {
  const url = endpoint(cfg); if (!url) throw Object.assign(new Error('url'), { kind: 'config' });
  // у реплики могут быть картинки: m.images = [{ mime, b64 }] — в формате своего провайдера (модель должна уметь читать картинки)
  const part = (m) => {
    const imgs = m.images || [], text = String(m.content);
    if (!imgs.length) return text;
    return cfg.format === 'anthropic' ? [...imgs.map((i) => ({ type: 'image', source: { type: 'base64', media_type: i.mime, data: i.b64 } })), { type: 'text', text }]
      : [{ type: 'text', text }, ...imgs.map((i) => ({ type: 'image_url', image_url: { url: 'data:' + i.mime + ';base64,' + i.b64 } }))];
  };
  const msgs = messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: part(m) }));
  if (cfg.format === 'anthropic') {
    return { url, headers: { 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: { model: cfg.model, max_tokens: MAX_TOKENS, system, messages: msgs } };
  }
  return { url, headers: { Authorization: 'Bearer ' + cfg.key, 'Content-Type': 'application/json' }, body: { model: cfg.model, messages: [{ role: 'system', content: system }, ...msgs] } };
}
// Текст ответа или причина: { ok, text } | { ok:false, kind: 'auth'|'notfound'|'rate'|'server'|'bad'|'empty', message }
export function parseResponse(cfg, status, data) {
  let j = data; if (typeof data === 'string') { try { j = JSON.parse(data); } catch { j = null; } }
  const msg = (j && ((j.error && (j.error.message || j.error)) || j.message)) || '';
  if (status === 401 || status === 403) return { ok: false, kind: 'auth', message: String(msg).slice(0, 200) };
  if (status === 404) return { ok: false, kind: 'notfound', message: String(msg).slice(0, 200) };
  if (status === 429) return { ok: false, kind: 'rate', message: String(msg).slice(0, 200) };
  if (status >= 500) return { ok: false, kind: 'server', message: String(msg).slice(0, 200) };
  if (status < 200 || status >= 300 || !j) return { ok: false, kind: 'bad', message: String(msg || status).slice(0, 200) };
  let text = '';
  if (cfg.format === 'anthropic') text = (Array.isArray(j.content) ? j.content : []).filter((b) => b && b.type === 'text').map((b) => b.text).join('');
  else { const m = j.choices && j.choices[0] && j.choices[0].message; text = m ? (typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.map((p) => p.text || '').join('') : '') : ''; }
  return text.trim() ? { ok: true, text: String(text) } : { ok: false, kind: 'empty', message: '' };
}
