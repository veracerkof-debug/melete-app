// Кто отвечает в чате (слово автора 25.11.2026: «значок конкретной нейросети, чтобы не перепутать»). Определяется сам — по названию
// модели, затем по адресу API (у OpenRouter название модели вида «фирма/модель»). Официальные логотипы не используются (товарные
// знаки, отдельная лицензия): значок — свой, цветной кружок с первой буквой; цвет задаёт тон (hue). Без DOM.
const VENDORS = [
  { id: 'claude', name: 'Claude', hue: 17, mark: 'C', model: /claude|anthropic/i, host: /anthropic\.com$/i },
  { id: 'gemini', name: 'Gemini', hue: 215, mark: 'G', model: /gemini|gemma|palm/i, host: /googleapis\.com$|google\.com$/i },
  { id: 'openai', name: 'ChatGPT', hue: 160, mark: 'G', model: /(^|[\/:-])(gpt|o1|o3|o4|chatgpt|davinci)|openai/i, host: /openai\.com$|openai\.azure\.com$/i },
  { id: 'grok', name: 'Grok', hue: 265, mark: 'X', model: /grok|x-ai/i, host: /x\.ai$/i },
  { id: 'deepseek', name: 'DeepSeek', hue: 228, mark: 'D', model: /deepseek/i, host: /deepseek\.com$/i },
  { id: 'mistral', name: 'Mistral', hue: 28, mark: 'M', model: /mistral|mixtral|codestral|ministral/i, host: /mistral\.ai$/i },
  { id: 'llama', name: 'Llama', hue: 205, mark: 'L', model: /llama|meta-llama/i, host: /meta\.ai$|llama\.com$/i },
  { id: 'qwen', name: 'Qwen', hue: 262, mark: 'Q', model: /qwen/i, host: /aliyuncs\.com$|qwen\.ai$/i },
];
const hostOf = (url) => { try { return new URL(String(url || '')).hostname; } catch { return ''; } };
const prettyHost = (h) => h.replace(/^(api|www|chat)\./, '').split('.').slice(0, -1).join('.') || h;
// → { id, name (для подписи), mark (буква), hue, model, host }
export function brandOf(cfg) {
  const model = String((cfg && cfg.model) || '').trim(), host = hostOf(cfg && cfg.url);
  const v = VENDORS.find((x) => x.model.test(model)) || VENDORS.find((x) => x.host.test(host));
  if (v) return { id: v.id, name: v.name, mark: v.mark, hue: v.hue, model, host };
  const n = prettyHost(host) || 'AI';
  return { id: 'other', name: n.charAt(0).toUpperCase() + n.slice(1), mark: n.charAt(0).toUpperCase() || 'A', hue: 200, model, host };
}
