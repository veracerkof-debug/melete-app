// Запросы нейросети на чтение (melete-query): очистка, ответы по категориям доступа, круги в чате, ручной режим
import { describe, it, expect } from 'vitest';
import { cleanQueries, answerQueries, describeQueries, ROUNDS_MAX, RESULT_MAX } from '../src/core/ai/queries.js';
import { extract, describe as describeP } from '../src/core/ai/proposals.js';
import { buildSystem } from '../src/core/ai/context.js';
import { createChat } from '../src/core/ai/chat.js';
import { clean } from '../src/core/ai/config.js';
import { newProject } from '../src/music/project.js';

const REC = { id: 'r1', name: 'Paranoid.mp3', kind: 'audio', dur: 387, songs: [], marks: [{ t: 12, name: 'Куплет' }], ana: { pc: 4, minor: true, bpm: 163, bpb: 4, downbeats: [0.4, 1.8], chords: [{ t: 0, d: 2, c: 'E:min' }, { t: 2, d: 2, c: 'C' }] } };
const DATA = (o = {}) => ({ songs: [{ id: 's1', title: 'Песня', artist: 'Я', genre: 'Рок', key: 'Am', notes: 'Am  слова слова', targetBpm: 100 }], recs: [REC, { id: 'r2', name: 'Без разбора.wav', kind: 'audio', dur: 60 }], used: {}, projects: [newProject({ name: 'Идея' })], studio: null, ...o });
const CFG = (access) => clean({ on: true, url: 'https://x.io/v1', model: 'm', key: 'k', access });

describe('очистка и описание запросов', () => {
  it('известные виды, id, лимит', () => {
    expect(cleanQueries([{ q: 'project' }, { q: 'recording', id: ' r1 ' }, { q: 'hack' }, null, { q: 'songs', id: 5 }])).toEqual([{ q: 'project' }, { q: 'recording', id: 'r1' }, { q: 'songs' }]);
    expect(cleanQueries(Array(20).fill({ q: 'songs' }))).toHaveLength(6); expect(cleanQueries('x')).toEqual([]);
    expect(describeQueries([{ q: 'recording', id: 'r1' }, { q: 'songs' }])).toEqual(['recording r1', 'songs']);
  });
});

describe('ответы приложения: по категориям доступа', () => {
  it('запись: разбор есть — темп, тональность, аккорды; нет — честно «разбора нет»', () => {
    const t = answerQueries([{ q: 'recording', id: 'r1' }, { q: 'recording', id: 'r2' }, { q: 'recording', id: 'нет' }], DATA(), CFG({ media: 'read' }));
    expect(t).toContain('темп 163'); expect(t).toContain('Em'); expect(t).toContain('Куплет'); expect(t).toContain('разбора записи ещё нет'); expect(t).toContain('Записи с таким id нет');
  });
  it('закрытая категория — отказ с причиной, остальное отвечает', () => {
    const t = answerQueries([{ q: 'songs' }, { q: 'recordings' }, { q: 'instruments' }], DATA(), CFG({ songs: 'none', media: 'read' }));
    expect(t).toContain('НЕТ ДОСТУПА: категория «songs»'); expect(t).toContain('ЗАПИСИ МЕДИАТЕКИ'); expect(t).toContain('fmep');
  });
  it('песня: данные без текста; проекты и проект', () => {
    const t = answerQueries([{ q: 'song', id: 's1' }, { q: 'projects' }, { q: 'project' }], DATA(), CFG({ songs: 'read', studio: 'read' }));
    expect(t).toContain('текст есть (не выдаётся)'); expect(t).not.toContain('слова слова'); expect(t).toContain('Идея'); expect(t).toContain('Открытого проекта нет');
    const p = newProject({ name: 'Открытый' });
    expect(answerQueries([{ q: 'project' }], DATA({ studio: p }), CFG({ studio: 'read' }))).toContain('СТУДИЯ. Проект «Открытый»');
  });
  it('ответ ограничен по размеру', () => {
    const big = DATA({ recs: Array.from({ length: 5 }, (_, i) => ({ ...REC, id: 'r' + i, ana: { ...REC.ana, chords: Array.from({ length: 900 }, (_, k) => ({ t: k, d: 1, c: 'C' })) } })) });
    expect(answerQueries(Array(6).fill({ q: 'recording', id: 'r1' }), big, CFG({ media: 'read' })).length).toBeLessThanOrEqual(RESULT_MAX + 80);
  });
});

describe('блок melete-query и инструкция', () => {
  it('извлекается без права на правку (чтение — pending), мусор — invalid', () => {
    const w = extract('Нужны данные.\n```melete-query\n[{"q":"recordings"},{"q":"project"}]\n```', CFG({ media: 'read' }));
    expect(w.proposals[0]).toMatchObject({ kind: 'query', status: 'pending' }); expect(w.proposals[0].queries).toHaveLength(2);
    expect(describeP(w.proposals[0], [])).toEqual(['recordings', 'project']);
    expect(extract('```melete-query\n[{"q":"x"}]\n```', CFG({})).proposals[0].status).toBe('invalid');
  });
  it('инструкция про запросы — только при открытом чтении', () => {
    expect(buildSystem(CFG({ media: 'read' }))).toContain('melete-query');
    expect(buildSystem(CFG({}))).not.toContain('melete-query');
  });
});

const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const reply = (text) => ({ status: 200, data: { choices: [{ message: { content: text } }] } });
describe('чат: круги запросов', () => {
  it('ИИ просит данные → приложение отвечает само → ИИ продолжает; в историю — строка «передано»', async () => {
    const calls = [], answers = ['Смотрю.\n```melete-query\n[{"q":"recording","id":"r1"}]\n```', 'Темп записи 163, тональность Em.'];
    const chat = createChat({ app: {}, cfg: () => CFG({ media: 'read' }), data: DATA, post: async (req) => { calls.push(JSON.stringify(req.body)); return reply(answers[calls.length - 1]); }, storage: store(), now: () => 1 });
    const r = await chat.sendText('Какой темп у записи?');
    expect(r.ok).toBe(true); expect(calls).toHaveLength(2);
    expect(calls[1]).toContain('ОТВЕТ ПРИЛОЖЕНИЯ НА ЗАПРОСЫ'); expect(calls[1]).toContain('темп 163');
    expect(chat.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
    expect(chat.messages[1].proposals[0].status).toBe('answered'); expect(chat.messages[3].text).toContain('163');
  });
  it('бесконечные запросы обрываются на ROUNDS_MAX', async () => {
    let n = 0;
    const chat = createChat({ app: {}, cfg: () => CFG({ media: 'read' }), data: DATA, post: async () => { n++; return reply('```melete-query\n[{"q":"recordings"}]\n```'); }, storage: store(), now: () => 1 });
    await chat.sendText('?'); expect(n).toBe(ROUNDS_MAX + 1);
  });
  it('закрытая категория в круге — отказ уходит модели, а не данные', async () => {
    const calls = [], answers = ['```melete-query\n[{"q":"songs"}]\n```', 'Без доступа не могу.'];
    const chat = createChat({ app: {}, cfg: () => CFG({ songs: 'none', media: 'read' }), data: DATA, post: async (req) => { calls.push(JSON.stringify(req.body)); return reply(answers[calls.length - 1]); }, storage: store(), now: () => 1 });
    await chat.sendText('песни?'); expect(calls[1]).toContain('НЕТ ДОСТУПА'); expect(calls[1]).not.toContain('Рок');
  });
  it('ручной режим: вставленный запрос данных → «ответ приложения» для копирования', () => {
    const chat = createChat({ app: {}, cfg: () => CFG({ media: 'read' }), data: DATA, post: async () => ({}), storage: store(), now: () => 1 });
    chat.addReply('```melete-query\n[{"q":"recording","id":"r1"}]\n```');
    const m = chat.messages[0], p = m.proposals[0], txt = chat.answerQuery(m.id, p.id);
    expect(txt).toContain('=== ОТВЕТ ПРИЛОЖЕНИЯ НА ЗАПРОСЫ ==='); expect(txt).toContain('темп 163'); expect(p.status).toBe('answered');
  });
});
