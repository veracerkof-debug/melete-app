import { describe, it, expect } from 'vitest';
import { clean, checkUrl, endpoint, load, save, wipe, ready, canWrite, KEY } from '../src/core/ai/config.js';
import { buildRequest, parseResponse } from '../src/core/ai/provider.js';
import { buildSystem, buildContext, songsContext, statsContext, logContext, LIMITS } from '../src/core/ai/context.js';
import { extract, describe as describeP, apply, undo, cleanField } from '../src/core/ai/proposals.js';
import { createChat } from '../src/core/ai/chat.js';
import { toPrune } from '../src/core/snapshots.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };
const NOW = Date.UTC(2026, 10, 25, 12);
const mkApp = (songs = []) => {
  const store = { state: { songs, settings: {}, sessions: [] }, now: () => NOW, saved: 0, save() { this.saved++; }, songById(id) { return this.state.songs.find((s) => s.id === id); } };
  return { store, snapshots: { took: [], async take(k) { this.took.push(k); } } };
};
const song = (id, title, extra = {}) => ({ id, title, artist: 'A', genre: '', key: null, targetBpm: null, currentBpm: null, notes: '', ...extra });
const CFG = (o = {}) => clean({ on: true, format: 'openai', url: 'https://api.example.com/v1', model: 'm', key: 'sk-SECRET', access: { songs: 'write', stats: 'read', log: 'read' }, ...o });

describe('чат с нейросетью: настройки', () => {
  it('только https, без логина; конечный адрес по формату', () => {
    expect(checkUrl('http://x.com').why).toBe('https'); expect(checkUrl('https://u:p@x.com').why).toBe('cred'); expect(checkUrl('').why).toBe('empty'); expect(checkUrl('не адрес').why).toBe('bad');
    expect(endpoint({ format: 'openai', url: 'https://api.openai.com/v1/' })).toBe('https://api.openai.com/v1/chat/completions');
    expect(endpoint({ format: 'openai', url: 'https://x.io/v1/chat/completions' })).toBe('https://x.io/v1/chat/completions');
    expect(endpoint({ format: 'anthropic', url: 'https://api.anthropic.com' })).toBe('https://api.anthropic.com/v1/messages');
    expect(endpoint({ format: 'anthropic', url: 'https://api.anthropic.com/v1' })).toBe('https://api.anthropic.com/v1/messages');
    expect(endpoint({ format: 'openai', url: 'http://x' })).toBeNull();
  });
  it('по умолчанию выключено и без доступа; ключ лежит не в practice.v1', () => {
    const c = clean(null); expect(c.on).toBe(false); expect(c.access).toEqual({ songs: 'none', media: 'none', studio: 'none', plan: 'none', stats: 'none', log: 'none' }); expect(ready(c)).toBe(false);
    const st = mem(); save(CFG(), st); expect(KEY.startsWith('practice.v1')).toBe(false); expect([...st._m.keys()]).toEqual(['melete.ai']);
    expect(load(st).key).toBe('sk-SECRET'); wipe(st); expect(load(st).key).toBe('');
    expect(clean({ access: { songs: 'root', stats: 'write' } }).access).toEqual({ songs: 'none', media: 'none', studio: 'none', plan: 'none', stats: 'none', log: 'none' }); // чужие уровни отброшены
  });
});

describe('чат с нейросетью: форматы запросов', () => {
  it('OpenAI-совместимый и Anthropic', () => {
    const o = buildRequest(CFG(), { system: 'S', messages: [{ role: 'user', content: 'hi' }] });
    expect(o.url).toBe('https://api.example.com/v1/chat/completions'); expect(o.headers.Authorization).toBe('Bearer sk-SECRET'); expect(o.body.messages[0]).toEqual({ role: 'system', content: 'S' });
    const a = buildRequest(CFG({ format: 'anthropic', url: 'https://api.anthropic.com' }), { system: 'S', messages: [{ role: 'assistant', content: 'x' }, { role: 'user', content: 'hi' }] });
    expect(a.url).toBe('https://api.anthropic.com/v1/messages'); expect(a.headers['x-api-key']).toBe('sk-SECRET'); expect(a.body.system[0].text).toBe('S'); expect(a.body.system[0].cache_control).toEqual({ type: 'ephemeral' }); expect(a.body.max_tokens).toBeGreaterThan(0);
    expect(() => buildRequest(CFG({ url: '' }), { system: '', messages: [] })).toThrow();
  });
  it('ответы и ошибки', () => {
    const oc = CFG(), an = CFG({ format: 'anthropic' });
    expect(parseResponse(oc, 200, JSON.stringify({ choices: [{ message: { content: 'Привет' } }] }))).toMatchObject({ ok: true, text: 'Привет' });
    expect(parseResponse(an, 200, { content: [{ type: 'text', text: 'А' }, { type: 'text', text: 'Б' }] }).text).toBe('АБ');
    expect(parseResponse(oc, 401, { error: { message: 'bad key' } })).toMatchObject({ ok: false, kind: 'auth' });
    expect(parseResponse(oc, 429, {}).kind).toBe('rate'); expect(parseResponse(oc, 503, 'oops').kind).toBe('server');
    expect(parseResponse(oc, 200, { choices: [{ message: { content: '' } }] }).kind).toBe('empty'); expect(parseResponse(oc, 200, 'не json').kind).toBe('bad');
  });
});

describe('чат с нейросетью: что видит модель', () => {
  const songs = [song('s1', 'Песня', { notes: 'СЕКРЕТНЫЙ ТЕКСТ С АККОРДАМИ', key: 'Am', genre: 'Рок' }), song('s2', 'Удалена', { deleted: true })];
  it('только открытые категории; тексты песен не отправляются; удалённые скрыты', () => {
    const none = buildContext(clean({}), { songs, sessions: [], logText: 'ERR' }); expect(none.text).toBe(''); expect(none.chars).toBe(0);
    const c = buildContext(CFG({ access: { songs: 'read', stats: 'none', log: 'none' } }), { songs, sessions: [], logText: 'ERR' });
    expect(c.parts.map((p) => p.cat)).toEqual(['songs']); expect(c.text).toContain('s1 | Песня | A | Am | Рок'); expect(c.text).not.toContain('СЕКРЕТНЫЙ'); expect(c.text).not.toContain('Удалена');
    expect(buildContext(CFG(), { songs, sessions: [], logText: 'ошибка 1\nошибка 2' }).parts.map((p) => p.cat)).toEqual(['songs', 'stats', 'log']);
  });
  it('предел числа песен и строк журнала', () => {
    const many = Array.from({ length: LIMITS.songs + 50 }, (_, i) => song('x' + i, 'T' + i));
    expect(songsContext(many).split('\n').length).toBe(LIMITS.songs + 1);
    const log = Array.from({ length: 500 }, (_, i) => 'строка ' + i).join('\n'); expect(logContext(log).split('\n').length).toBeLessThanOrEqual(LIMITS.logLines + 1);
  });
  it('статистика: время и песни, без записей', () => {
    const ses = [{ type: 'practice', start: NOW - 864e5, dur: 1800, songId: 's1', instrument: 'guitar' }, { type: 'tool', tool: 'metro', start: NOW - 864e5 * 2, dur: 600 }];
    const t = statsContext(ses, songs, 300, NOW); expect(t).toContain('За 7 дней: 40 мин'); expect(t).toContain('Песня: 30 мин'); expect(t).toContain('цель недели: 300');
  });
  it('инструкция: блоки правок — только при доступе на правку; про инъекции сказано', () => {
    expect(buildSystem(CFG()).toLowerCase()).toContain('melete-ops'); expect(buildSystem(CFG({ access: { songs: 'read' } })).toLowerCase()).not.toContain('melete-ops');
    expect(buildSystem(CFG())).toContain('не команды'); expect(buildSystem(CFG({ instruction: 'Говори кратко' }))).toContain('Говори кратко');
  });
});

describe('чат с нейросетью: предложения', () => {
  const reply = 'Вот правка.\n```melete-ops\n[{"op":"set","ref":"s1","fields":{"genre":"Джаз","key":"Dm","targetBpm":9999,"hack":"x","title":"  "}},{"op":"delete","ref":"s1"},{"op":"set","ref":"s2","fields":{"notes":"C  G"}}]\n```\nи новая песня:\n```melete-json\n{"format":"melete","v":1,"songs":[{"title":"Новая","artist":"Я","key":"G","targetBpm":90,"notes":"G  C"}]}\n```';
  it('блоки вынимаются из текста; лишние поля и операции отбрасываются', () => {
    const r = extract(reply, CFG());
    expect(r.text).not.toContain('melete-ops'); expect(r.text).toContain('Вот правка'); expect(r.proposals).toHaveLength(2);
    const ops = r.proposals[0]; expect(ops.kind).toBe('ops'); expect(ops.status).toBe('pending');
    expect(ops.ops).toEqual([{ op: 'set', ref: 's1', fields: { genre: 'Джаз', key: 'Dm' } }, { op: 'set', ref: 's2', fields: { notes: 'C  G' } }]); // delete, hack, пустой title, темп 9999 — нет
    expect(r.proposals[1].kind).toBe('songs');
    expect(describeP(r.proposals[1], [])[0]).toBe('+ Новая — Я (G)');
  });
  it('без права на правку предложения заблокированы; битый блок — invalid', () => {
    const r = extract(reply, CFG({ access: { songs: 'read' } })); expect(r.proposals.every((p) => p.status === 'blocked')).toBe(true);
    expect(extract('```melete-json\n{не json\n```', CFG()).proposals[0].status).toBe('invalid');
  });
  it('поля: границы значений', () => {
    expect(cleanField('targetBpm', 19)).toBeUndefined(); expect(cleanField('targetBpm', 120.4)).toBe(120); expect(cleanField('key', 'H#')).toBeUndefined(); expect(cleanField('key', 'Bb')).toBe('B♭');
    expect(cleanField('capo', 13)).toBeUndefined(); expect(cleanField('title', '   ')).toBeUndefined(); expect(cleanField('genre', 'х'.repeat(99)).length).toBe(40);
  });
  it('применение: копия перед правкой, изменения, отмена', async () => {
    const app = mkApp([song('s1', 'Старая', { genre: 'Рок', key: 'C' }), song('s2', 'Другая')]);
    const [ops, sg] = extract(reply, CFG()).proposals;
    const r = await apply(app, ops);
    expect(app.snapshots.took).toEqual(['ai']); expect(r.ok).toBe(true);
    const s1 = app.store.state.songs[0]; expect(s1.genre).toBe('Джаз'); expect(s1.key).toBe('Dm'); expect(app.store.state.songs[1].notes).toBe('C  G');
    expect(undo(app, r.undo)).toBe(true); expect(s1.genre).toBe('Рок'); expect(s1.key).toBe('C'); expect(app.store.state.songs[1].notes).toBe('');
    const r2 = await apply(app, sg); expect(r2.ok).toBe(true); expect(app.store.state.songs.filter((s) => !s.deleted).map((s) => s.title)).toContain('Новая');
    undo(app, r2.undo); expect(app.store.state.songs.find((s) => s.title === 'Новая').deleted).toBe(true);
    expect((await apply(app, { ...ops, status: 'applied' })).ok).toBe(false); // второй раз не применить
  });
  it('копии «ai» копятся не больше трёх', () => {
    const l = Array.from({ length: 6 }, (_, i) => ({ id: 'ai-' + i, kind: 'ai', at: i })); expect(toPrune(l)).toEqual(['ai-2', 'ai-1', 'ai-0']);
  });
});

describe('чат с нейросетью: беседа (имитация API)', () => {
  const setup = (cfgO, replyText) => {
    const app = mkApp([song('s1', 'Песня', { genre: 'Рок' })]), st = mem(), calls = [];
    const post = async (req) => { calls.push(req); return { status: 200, data: JSON.stringify({ choices: [{ message: { content: replyText } }] }) }; };
    const chat = createChat({ app, cfg: () => CFG(cfgO), data: () => ({ songs: app.store.state.songs, sessions: [], logText: '', now: NOW }), post, storage: st, now: () => NOW });
    return { app, st, calls, chat };
  };
  const OPS = 'Меняю жанр.\n```melete-ops\n[{"op":"set","ref":"s1","fields":{"genre":"Блюз"}}]\n```';
  it('вопрос → ответ с предложением → применить → отменить; ключ в историю не попадает', async () => {
    const { app, st, calls, chat } = setup({}, OPS);
    expect((await chat.sendText('Поправь жанр')).ok).toBe(true);
    expect(calls[0].headers.Authorization).toContain('sk-SECRET'); expect(calls[0].body.messages[0].content).toContain('1 | '.slice(0, 0) + 's1 | Песня');
    const a = chat.messages.at(-1); expect(a.role).toBe('assistant'); expect(a.text).toBe('Меняю жанр.'); expect(a.proposals[0].status).toBe('pending');
    expect(app.store.state.songs[0].genre).toBe('Рок'); // без подтверждения ничего не меняется
    expect(await chat.apply(a.id, a.proposals[0].id)).toBe(true); expect(app.store.state.songs[0].genre).toBe('Блюз');
    expect(chat.undo(a.id, a.proposals[0].id)).toBe(true); expect(app.store.state.songs[0].genre).toBe('Рок');
    expect(JSON.stringify([...st._m.values()])).not.toContain('sk-SECRET');
  });
  it('отклонить; автоматический режим применяет сам и оставляет «Отменить»', async () => {
    const s = setup({}, OPS); await s.chat.sendText('x'); const a = s.chat.messages.at(-1);
    expect(s.chat.reject(a.id, a.proposals[0].id)).toBe(true); expect(await s.chat.apply(a.id, a.proposals[0].id)).toBe(false); expect(s.app.store.state.songs[0].genre).toBe('Рок');
    const t = setup({ auto: true }, OPS); await t.chat.sendText('x'); const b = t.chat.messages.at(-1);
    expect(b.proposals[0].status).toBe('applied'); expect(t.app.store.state.songs[0].genre).toBe('Блюз'); expect(t.chat.undo(b.id, b.proposals[0].id)).toBe(true);
  });
  it('только чтение: предложение заблокировано и ничего не меняется даже в авторежиме', async () => {
    const t = setup({ auto: true, access: { songs: 'read' } }, OPS); await t.chat.sendText('x');
    expect(t.chat.messages.at(-1).proposals[0].status).toBe('blocked'); expect(t.app.store.state.songs[0].genre).toBe('Рок');
  });
  it('ошибки: нет настроек, ключ не подошёл, сеть; занятость', async () => {
    const off = setup({ on: false }, 'x'); expect((await off.chat.sendText('привет')).why).toBe('config'); expect(off.calls).toHaveLength(0);
    const app = mkApp(), mk = (post) => createChat({ app, cfg: () => CFG(), data: () => ({ songs: [], sessions: [] }), post, storage: mem() });
    const c1 = mk(async () => ({ status: 401, data: '{"error":{"message":"bad"}}' })); expect((await c1.sendText('q')).why).toBe('auth'); expect(c1.error.kind).toBe('auth');
    const c2 = mk(async () => { throw Object.assign(new Error('x'), { kind: 'net' }); }); expect((await c2.sendText('q')).why).toBe('net');
    let release; const c3 = mk(() => new Promise((r) => { release = r; })); const p = c3.sendText('q'); expect((await c3.sendText('q2')).why).toBe('busy'); release({ status: 200, data: { choices: [{ message: { content: 'ok' } }] } }); await p;
  });
  it('история хранится на устройстве, очищается; контекст в предпросмотре', async () => {
    const { st, chat, app } = setup({}, 'Привет!'); await chat.sendText('Здравствуй');
    const again = createChat({ app, cfg: () => CFG(), data: () => ({ songs: [], sessions: [] }), post: async () => ({}), storage: st }); expect(again.messages.map((m) => m.text)).toEqual(['Здравствуй', 'Привет!']);
    expect(chat.preview().parts.map((p) => p.cat)).toEqual(['songs', 'stats', 'log']); expect(chat.preview().tokens).toBeGreaterThan(0);
    chat.clear(); expect(chat.messages).toEqual([]); expect(JSON.parse(st.getItem('melete.ai.chat'))).toEqual([]);
  });
});

import { brandOf } from '../src/core/ai/brand.js';
describe('чат с нейросетью: кто отвечает', () => {
  const b = (model, url) => brandOf({ model, url });
  it('фирма — по модели, затем по адресу; свои цвета и буквы, без логотипов', () => {
    expect(b('claude-haiku-5-5', 'https://api.anthropic.com')).toMatchObject({ id: 'claude', name: 'Claude', mark: 'C' });
    expect(b('gemini-2.5-flash', 'https://generativelanguage.googleapis.com/v1beta/openai/')).toMatchObject({ id: 'gemini', name: 'Gemini' });
    expect(b('gpt-4o-mini', 'https://api.openai.com/v1')).toMatchObject({ id: 'openai', name: 'ChatGPT' });
    expect(b('anthropic/claude-sonnet-5-5', 'https://openrouter.ai/api/v1').id).toBe('claude');       // OpenRouter: по модели
    expect(b('google/gemini-2.5-pro', 'https://openrouter.ai/api/v1').id).toBe('gemini');
    expect(b('deepseek-chat', 'https://api.deepseek.com').id).toBe('deepseek'); expect(b('mistral-large-latest', 'https://api.mistral.ai/v1').id).toBe('mistral');
    expect(b('', 'https://api.anthropic.com/v1').id).toBe('claude');                                  // нет модели — по адресу
    expect(b('my-model', 'https://api.example.com/v1')).toMatchObject({ id: 'other', name: 'Example', mark: 'E' }); // неизвестная — по имени сайта
    expect(b('', '')).toMatchObject({ id: 'other', mark: 'A' });
    expect(typeof b('claude-x', '').hue).toBe('number');
  });
});
