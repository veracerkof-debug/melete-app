// Студия и нейросеть: очистка партий от модели, применение к проекту с откатом, контекст, блок melete-studio, ручной режим чата
import { describe, it, expect } from 'vitest';
import { cleanPattern, cleanStudioOp, cleanStudioOps, applyStudioOps, undoStudioOps, studioContext, describeStudioOps, STUDIO_PROMPT } from '../src/music/studioai.js';
import { newProject, newTrack, newClip, newData, setChord } from '../src/music/project.js';
import { extract, describe as describeP } from '../src/core/ai/proposals.js';
import { buildSystem, buildContext } from '../src/core/ai/context.js';
import { createChat } from '../src/core/ai/chat.js';
import { clean } from '../src/core/ai/config.js';

const ROCK = { op: 'add', at: 1, bars: 2, fam: 'drums', lanes: { kick: ['x.......x.x.....', 'x.......x.x...x.'], snare: ['....x.......x...'], hat: ['x.x.x.x.x.x.x.x.'] } };
const BASS = { op: 'add', at: 1, bars: 2, fam: 'bass', ev: [[[0, 2, 'r'], [2, 2, 'r'], [4, 2, '5']], [[0, 4, 'r'], [8, 4, 'a']]] };
const proj = () => { const p = newProject({ bpm: 100, key: { pc: 9, minor: true } }); const ch = p.tracks.find((t) => t.kind === 'chords'); const d = newData('chords', 2); setChord(d, 0, 4, 9, 'min'); setChord(d, 4, 4, 5, 'maj'); const c = newClip(p, ch, 0, 8, d); p.clips.push(c); return p; };

describe('cleanPattern: ответ модели → безопасный рисунок', () => {
  it('ударные: строки ровно по 16, одна строка — на все такты, замечания о правках', () => {
    const r = cleanPattern(ROCK);
    expect(r.loop.fam).toBe('drums'); expect(r.loop.bars).toBe(2);
    expect(r.loop.lanes.snare).toEqual(['....x.......x...', '....x.......x...']); // одна строка повторена
    expect(r.loop.lanes.kick[1]).toBe('x.......x.x...x.'); expect(r.warns).toEqual([]);
    const short = cleanPattern({ fam: 'drums', bars: 1, lanes: { kick: ['x...x...'], hh: ['X.X.X.X.X.X.X.X.X.X.'] } });
    expect(short.loop.lanes.kick[0]).toBe('x...x...........'); expect(short.loop.lanes.hat[0]).toHaveLength(16);
    expect(short.warns.length).toBe(2); expect(short.warns[0]).toContain('дополнено');
  });
  it('мусор отбрасывается с причиной', () => {
    expect(cleanPattern({ fam: 'drums', lanes: { cowbell: ['x...'] } }).error).toContain('ни одного');
    expect(cleanPattern({ fam: 'drums' }).error).toContain('lanes');
    expect(cleanPattern({ fam: 'strings' }).error).toContain('неизвестный вид');
    expect(cleanPattern({ fam: 'drums', lanes: { cowbell: ['x'], kick: ['x...'] } }).warns.join()).toContain('cowbell');
    expect(cleanPattern({ fam: 'drums', bars: 99, lanes: { kick: ['x'] } }).loop.bars).toBe(16);
  });
  it('бас: шаг, длина, тон проверяются; дубли и неизвестные тоны пропускаются', () => {
    const r = cleanPattern({ fam: 'bass', ev: [[[0, 2, 'r'], [0, 2, '5'], [4, 99, 'x'], [14, 8, '3'], ['z', 1, 'r']]] });
    expect(r.loop.ev[0]).toEqual([[0, 2, 'r'], [14, 2, '3']]); // длина обрезана до конца такта
    expect(r.warns.length).toBe(3);
    expect(cleanPattern({ fam: 'bass', ev: [[]] }).error).toContain('нет ни одной ноты');
    expect(cleanPattern(BASS).loop.ev).toHaveLength(2);
  });
  it('cleanStudioOp: at с 1, replace требует clip, len и имя', () => {
    expect(cleanStudioOp({ ...ROCK, at: 3, len: 8, name: 'Рок' })).toMatchObject({ op: 'add', at: 3, len: 8, name: 'Рок' });
    expect(cleanStudioOp({ ...ROCK, at: 0 }).at).toBe(1);
    expect(cleanStudioOp({ ...ROCK, op: 'replace' }).error).toContain('clip');
    expect(cleanStudioOp({ ...ROCK, op: 'delete' }).error).toContain('add или replace');
    const r = cleanStudioOps([ROCK, { op: 'add', fam: 'drums' }, ...Array(20).fill(BASS)]);
    expect(r.ops.length).toBe(11); expect(r.errors.length).toBe(1); // лишнее после 12 правок отброшено
  });
});

describe('applyStudioOps: клипы в проект и откат', () => {
  it('ударные и бас ложатся по аккордам проекта, на новые дорожки при необходимости', () => {
    const p = proj(), n0 = p.clips.length;
    const { ops } = cleanStudioOps([ROCK, BASS]);
    const r = applyStudioOps(p, ops);
    expect(r.n).toBe(2); expect(p.clips.length).toBe(n0 + 2);
    const bass = p.clips.find((c) => c.id === r.undo.clips[1]), tr = p.tracks.find((t) => t.id === bass.tr);
    expect(tr.kind).toBe('notes'); expect(bass.data.notes.length).toBe(5);
    expect(bass.data.notes[0].m % 12).toBe(9); // корень Am — ля, по аккорду проекта
    expect(bass.data.notes[3].m % 12).toBe(5); // во втором такте аккорд F — бас играет его корень
  });
  it('len растягивает рисунок повтором; replace меняет клип; откат возвращает как было', () => {
    const p = proj(), before = JSON.stringify(p);
    const first = applyStudioOps(p, cleanStudioOps([{ ...ROCK, at: 1, len: 8 }]).ops);
    const clip = p.clips.find((c) => c.id === first.undo.clips[0]);
    expect(clip.len).toBeGreaterThanOrEqual(8); expect(clip.loop).toBe(true);
    const second = applyStudioOps(p, cleanStudioOps([{ ...ROCK, op: 'replace', clip: clip.id, lanes: { kick: ['x...x...x...x...'] }, bars: 1 }]).ops);
    expect(second.n).toBe(1); expect(p.clips.some((c) => c.id === clip.id)).toBe(false); expect(second.undo.removed[0].id).toBe(clip.id);
    undoStudioOps(p, second.undo); expect(p.clips.some((c) => c.id === clip.id)).toBe(true);
    undoStudioOps(p, first.undo);
    expect(p.clips.map((c) => c.id).sort()).toEqual(JSON.parse(before).clips.map((c) => c.id).sort());
    expect(p.tracks.length).toBe(JSON.parse(before).tracks.length);
  });
  it('нет места или клипа — пропускается без поломки', () => {
    const p = proj();
    expect(applyStudioOps(p, cleanStudioOps([{ ...ROCK, op: 'replace', clip: 'нет' }]).ops).n).toBe(0);
  });
});

describe('что видит модель', () => {
  it('контекст: темп, тональность, аккорды по тактам, дорожки, клипы и содержимое ударных и баса', () => {
    const p = proj(); applyStudioOps(p, cleanStudioOps([ROCK, BASS]).ops);
    const s = studioContext(p);
    expect(s).toContain('темп 100'); expect(s).toContain('тональность A'); expect(s).toContain('1: Am'); expect(s).toContain('2: F');
    expect(s).toContain('Ударные'); expect(s).toContain('"x.......x.x.....'); expect(s).toContain('Бас'); expect(s).toContain('"r"');
    expect(studioContext(null)).toBe('');
  });
  it('в системную инструкцию формат попадает только при праве на правку студии', () => {
    expect(buildSystem(clean({ access: { studio: 'write' } }))).toContain('melete-studio');
    expect(buildSystem(clean({ access: { studio: 'read' } }))).not.toContain('melete-studio');
    expect(buildSystem(clean({ access: { studio: 'read' } }))).toContain('только для чтения');
    expect(STUDIO_PROMPT).toContain('kick');
    const c = buildContext(clean({ access: { studio: 'read' } }), { studio: proj() });
    expect(c.parts.map((x) => x.cat)).toEqual(['studio']);
    expect(buildContext(clean({ access: { studio: 'none' } }), { studio: proj() }).text).toBe('');
  });
});

describe('блок melete-studio в ответе', () => {
  const REPLY = 'Вот грув.\n```melete-studio\n' + JSON.stringify([ROCK, BASS]) + '\n```\nПроверьте.';
  it('извлекается в предложение; без права на правку — blocked; мусор — invalid с причиной', () => {
    const w = extract(REPLY, clean({ access: { studio: 'write' } }));
    expect(w.text).toBe('Вот грув.\n\nПроверьте.'); expect(w.proposals[0]).toMatchObject({ kind: 'studio', status: 'pending' }); expect(w.proposals[0].ops).toHaveLength(2);
    expect(extract(REPLY, clean({ access: { studio: 'read' } })).proposals[0].status).toBe('blocked');
    const bad = extract('```melete-studio\n[{"op":"add","fam":"drums","lanes":{"kick":[]}}]\n```', clean({ access: { studio: 'write' } })).proposals[0];
    expect(bad.status).toBe('invalid'); expect(bad.errors.length).toBe(1);
    expect(extract('```melete-studio\nне json\n```', clean({ access: { studio: 'write' } })).proposals[0].status).toBe('invalid');
  });
  it('карточка описывает партии и замечания', () => {
    const lines = describeP(extract(REPLY, clean({ access: { studio: 'write' } })).proposals[0], [], []);
    expect(lines[0]).toContain('Ударные'); expect(lines[0]).toContain('kick'); expect(lines[1]).toContain('Бас');
    expect(describeStudioOps([{ op: 'replace', clip: 'c1', loop: { fam: 'bass', bars: 1, ev: [[[0, 2, 'r']]] } }])[0]).toContain('заменить клип c1');
  });
});

describe('чат: применение через студию и ручной режим (без API)', () => {
  const mkApp2 = () => { const p = proj(), hook = { project: () => p, apply: (ops) => { const r = applyStudioOps(p, ops); return r.n ? { n: r.n, pid: p.id, undo: r.undo } : null; }, undo: (pid, u) => (pid === p.id ? undoStudioOps(p, u) : false) }; return { p, app: { store: { state: { songs: [] }, now: () => 1, save() {} }, studioAI: hook } }; };
  const storage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
  it('вставленный ответ → предложение → применить → отменить; студия получает правки', async () => {
    const { p, app } = mkApp2(), cfg = clean({ access: { studio: 'write' } });
    const chat = createChat({ app, cfg: () => cfg, data: () => ({ studio: p }), post: async () => ({}), storage: storage(), now: () => 1 });
    const r = chat.addReply('Вот:\n```melete-studio\n' + JSON.stringify([ROCK]) + '\n```');
    expect(r).toMatchObject({ ok: true, n: 1 });
    const m = chat.messages[0], pr = m.proposals[0], n0 = p.clips.length;
    expect(await chat.apply(m.id, pr.id)).toBe(true); expect(p.clips.length).toBe(n0 + 1);
    expect(chat.undo(m.id, pr.id)).toBe(true); expect(p.clips.length).toBe(n0);
    expect(chat.addReply('просто текст без блока').n).toBe(0);
    expect(chat.addReply('  ').ok).toBe(false);
  });
  it('запрос для копирования: инструкция, данные проекта и просьба человека', () => {
    const { p, app } = mkApp2(), cfg = clean({ access: { studio: 'write' } });
    const chat = createChat({ app, cfg: () => cfg, data: () => ({ studio: p }), post: async () => ({}), storage: storage(), now: () => 1 });
    const t = chat.buildPrompt('Простой рок-бит');
    expect(t).toContain('melete-studio'); expect(t).toContain('=== ДАННЫЕ ==='); expect(t).toContain('СТУДИЯ'); expect(t).toContain('Простой рок-бит');
    expect(t).not.toContain('sk-');
  });
  it('автоприменение никогда не трогает студию', async () => {
    const { p, app } = mkApp2(), cfg = clean({ on: true, url: 'https://x.io/v1', model: 'm', key: 'k', auto: true, access: { songs: 'write', studio: 'write' } });
    const reply = '```melete-studio\n' + JSON.stringify([ROCK]) + '\n```';
    const chat = createChat({ app, cfg: () => cfg, data: () => ({ studio: p }), post: async () => ({ status: 200, data: { choices: [{ message: { content: reply } }] } }), storage: storage(), now: () => 1 });
    const n0 = p.clips.length; await chat.sendText('грув');
    expect(p.clips.length).toBe(n0); expect(chat.messages.at(-1).proposals[0].status).toBe('pending');
  });
});
