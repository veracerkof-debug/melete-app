// Готовые подключения (слово автора 28.11.2026: «адреса и модели известны — зашить, чтобы выбирать, а не вводить»).
// Поставщик задаёт формат и адрес, модель — выбором из списка; свой вариант и ручной ввод остаются.
// Модели — от лёгкой к тяжёлой; def — выбор по умолчанию (золотая середина: умная, но недорогая; слово автора 28.11.2026). Названия моделей меняются у поставщиков: список — подсказка, любую другую модель можно вписать вручную. Без DOM.
export const PRESETS = [
  { id: 'openai', name: 'ChatGPT', format: 'openai', url: 'https://api.openai.com/v1', models: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4.1'], def: 'gpt-4o' },
  { id: 'claude', name: 'Claude', format: 'anthropic', url: 'https://api.anthropic.com', models: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'], def: 'claude-sonnet-5-5' },
  { id: 'gemini', name: 'Gemini', format: 'openai', url: 'https://generativelanguage.googleapis.com/v1beta/openai', models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'], def: 'gemini-2.5-flash' },
  { id: 'deepseek', name: 'DeepSeek', format: 'openai', url: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'mistral', name: 'Mistral', format: 'openai', url: 'https://api.mistral.ai/v1', models: ['mistral-small-latest', 'mistral-large-latest'] },
  { id: 'groq', name: 'Groq', format: 'openai', url: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
  { id: 'openrouter', name: 'OpenRouter', format: 'openai', url: 'https://openrouter.ai/api/v1', models: [] },
];
const norm = (u) => String(u || '').trim().replace(/\/+$/, '').toLowerCase();
// Поставщик по адресу агента (пусто — «свой»)
export const presetOf = (cfg) => PRESETS.find((p) => norm(p.url) === norm(cfg && cfg.url)) || null;
