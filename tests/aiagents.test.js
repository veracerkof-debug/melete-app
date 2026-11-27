import { describe, it, expect, beforeEach } from 'vitest';
import { clean, load, save, KEY } from '../src/core/ai/config.js';
import { createAi } from '../src/core/ai/index.js';
import { agentLabel } from '../src/core/screens/aichat.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };

describe('агенты нейросети (несколько подключений)', () => {
  it('старое единственное подключение становится первым агентом, верхние поля — у выбранного', () => {
    const c = clean({ on: true, format: 'anthropic', url: 'https://api.anthropic.com', model: 'claude-haiku-5-5', key: 'k1' });
    expect(c.agents).toHaveLength(1); expect(c.agent).toBe('g1'); expect(c.agents[0]).toMatchObject({ format: 'anthropic', model: 'claude-haiku-5-5', key: 'k1' });
    const two = clean({ agents: [{ id: 'a', model: 'm1', key: 'k1', url: 'https://x.io' }, { id: 'b', model: 'm2', key: 'k2', format: 'anthropic', url: 'https://y.io' }], agent: 'b' });
    expect(two).toMatchObject({ agent: 'b', model: 'm2', key: 'k2', format: 'anthropic' });
    expect(clean({ agents: [{ id: 'a' }], agent: 'нет' }).agent).toBe('a'); // выбранного нет — первый
  });
  it('подпись агента: своё название или «фирма · модель»', () => {
    expect(agentLabel({ name: 'Быстрый', model: 'm' })).toBe('Быстрый');
    expect(agentLabel({ model: 'gemini-2.5-flash', url: 'https://generativelanguage.googleapis.com/' })).toBe('Gemini · gemini-2.5-flash');
  });
});

describe('агенты и чаты: app.ai', () => {
  let st, ai;
  beforeEach(() => { st = mem(); globalThis.localStorage = st; save({ on: true, url: 'https://a.io/v1', model: 'm1', key: 'k1' }); ai = createAi({ store: { state: {} } }, { avail: () => true }); });
  it('правка подключения идёт в выбранного агента; новый агент не стирает старого', () => {
    ai.addAgent({ format: 'anthropic' }); ai.save({ url: 'https://api.anthropic.com', model: 'claude-haiku-5-5', key: 'k2' });
    const c = ai.cfg(); expect(c.agents).toHaveLength(2); expect(c.agents[0]).toMatchObject({ model: 'm1', key: 'k1' }); expect(c.agents[1]).toMatchObject({ model: 'claude-haiku-5-5', key: 'k2', format: 'anthropic' }); expect(c.key).toBe('k2');
    ai.selectAgent(c.agents[0].id); expect(ai.cfg()).toMatchObject({ model: 'm1', key: 'k1' });
    expect(ai.removeAgent(c.agents[0].id)).toBe(true); expect(ai.cfg().agents).toHaveLength(1); expect(ai.removeAgent(ai.cfg().agent)).toBe(false); // последнего не удалить
  });
  it('чаты: у каждого своя история и свой агент; удаление чистит историю', () => {
    ai.addAgent({ format: 'openai' }); ai.save({ url: 'https://b.io/v1', model: 'm2', key: 'k2' });
    const [a1, a2] = ai.cfg().agents.map((a) => a.id);
    expect(ai.chats()).toHaveLength(1); expect(ai.chatId).toBe('main');
    ai.selectAgent(a1);
    const id2 = ai.newChat(); expect(ai.chatId).toBe(id2); expect(ai.chats()).toHaveLength(2);
    ai.selectAgent(a2); // второй чат — со вторым агентом
    ai.useChat('main'); expect(ai.cfg().agent).toBe(a1); // вернулись в первый чат — вернулся его агент
    ai.useChat(id2); expect(ai.cfg().agent).toBe(a2);
    st.setItem(KEY + '.chat.' + id2, '[{"id":"x","role":"user","text":"привет","at":1}]');
    expect(ai.deleteChat(id2)).toBe(true); expect(st.getItem(KEY + '.chat.' + id2)).toBeNull(); expect(ai.chatId).toBe('main');
    ai.wipe(); expect(load(st).agents).toHaveLength(1); expect(load(st).key).toBe('');
  });
  it('прежняя история (melete.ai.chat) — первый чат «main»', () => {
    expect(ai.chats()[0].id).toBe('main');
  });
});
