// «Улучшить разбор»: сетка тактов, сжатие повторов, кандидаты в части, сводка, правки по тактам с пометкой «от ИИ» и откатом
import { describe, it, expect } from 'vitest';
import { barStarts, chordsByBar, gridText, localSections, recDigest, barItems, barSpan, TASKS, ANA_PROMPT } from '../src/music/anaai.js';
import { cleanRecOp, extract, describe as describeP, apply, undo } from '../src/core/ai/proposals.js';
import { buildSystem, buildContext } from '../src/core/ai/context.js';
import { markEdited, resetEdited } from '../src/music/chordedit.js';
import { clean } from '../src/core/ai/config.js';

// 8 тактов по 2 с: Am | F | C | G | Am | F | C | G
const CH = ['A:min', 'F', 'C', 'G', 'A:min', 'F', 'C', 'G'];
const ana = (extra = {}) => ({ pc: 9, minor: true, conf: 0.82, bpm: 120, bpb: 4, downbeats: [0, 2, 4, 6, 8, 10, 12, 14], chords: CH.map((c, i) => ({ t: i * 2, d: 2, c })), ...extra });
const rec = (o = {}) => ({ id: 'r1', name: 'Song.mp3', kind: 'audio', dur: 16, marks: [], ana: ana(), ...o });

describe('сетка тактов и аккорды по тактам', () => {
  it('начала тактов — сильные доли; нет их — по темпу', () => {
    expect(barStarts(ana(), 16)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    const b = barStarts({ bpm: 120, bpb: 4, beats: [0.5] }, 8); expect(b[0]).toBe(0.5); expect(b[1]).toBe(2.5); expect(barStarts(null)).toEqual([]); expect(barStarts({})).toEqual([]);
  });
  it('в такте — один или два аккорда (занявшие четверть), дрожание не считается', () => {
    const a = ana({ chords: [{ t: 0, d: 1, c: 'A:min' }, { t: 1, d: 1, c: 'C' }, { t: 2, d: 1.9, c: 'F' }, { t: 3.9, d: 0.1, c: 'G' }] });
    expect(chordsByBar(a, [0, 2, 4], 4)).toEqual(['Am C', 'F', 'N']);
  });
  it('повторы подряд сжимаются, строки по 8 тактов', () => {
    expect(gridText(['Am', 'Am', 'Am', 'Am', 'F C', 'G'])).toBe('такт 1: Am×4 | F·C | G');
    expect(gridText(Array(20).fill('C')).split('\n')).toHaveLength(1);
    expect(gridText(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']).split('\n')).toHaveLength(2);
  });
});

describe('кандидаты в части по повторам', () => {
  const V = ['Am', 'F', 'C', 'G'], C = ['F', 'G', 'Am', 'Am'];
  it('куплет-припев-куплет-припев: одинаковые куски — одна буква', () => {
    const rows = [...V, ...V, ...C, ...C, ...V, ...V, ...C, ...C];
    const s = localSections(rows);
    expect(s.map((x) => x.g)).toEqual(['A', 'B', 'A', 'B']); // куплет, припев, куплет, припев
    expect(s[0]).toMatchObject({ from: 1, to: 8 }); expect(s[1]).toMatchObject({ from: 9, to: 16 }); expect(s[3].to).toBe(32);
  });
  it('короткие соседние куски, чья пара повторяется, собираются в одну часть (8 тактов ×2)', () => {
    const A = ['Am', 'F', 'C', 'G'], B = ['Dm', 'E', 'Dm', 'E'];
    const s = localSections([...A, ...B, ...A, ...B]);
    expect(s.map((x) => [x.from, x.to, x.g])).toEqual([[1, 8, 'A'], [9, 16, 'A']]);
  });
  it('уникальный кусок получает свою букву; короткое — не режется', () => {
    const s = localSections([...V, ...V, 'Dm', 'E', 'Dm', 'E', 'Dm', 'E', ...V, ...V]);
    expect(s.length).toBeGreaterThanOrEqual(3); expect(localSections(['Am', 'F'])).toEqual([]);
  });
});

describe('сводка записи для модели', () => {
  it('измерено, сетка, кандидаты, метки с источником, дорожки; секунд и текстов нет', () => {
    const r = rec({ marks: [{ t: 0, name: 'Вступление' }, { t: 8, name: 'Куплет', ai: true }] });
    const d = recDigest(r, ['vocals', 'drums']);
    expect(d).toContain('ИЗМЕРЕНО программой: тональность Am'); expect(d).toContain('уверенность 82 %'); expect(d).toContain('темп 120');
    expect(d).toContain('такт 1: Am | F | C | G | Am | F | C | G'); expect(d).toContain('КАНДИДАТЫ В ЧАСТИ');
    expect(d).toContain('такт 1 «Вступление» (человек)'); expect(d).toContain('такт 5 «Куплет» (ИИ)'); expect(d).toContain('vocals, drums');
  });
  it('нет разбора или сетки — честно; правка человека и ИИ различаются', () => {
    expect(recDigest(rec({ ana: null }))).toContain('Разбора записи ещё нет');
    expect(recDigest(rec({ ana: ana({ downbeats: [], bpm: 0 }) }))).toContain('Сетки тактов нет');
    expect(recDigest(rec({ ana: ana({ cedit: 5 }) }))).toContain('правил человек');
    expect(recDigest(rec({ ana: ana({ cedit: 5, cai: { at: 5 } }) }))).toContain('правила нейросеть');
    expect(recDigest(null)).toBe('');
  });
  it('сводка в разы короче списка «время: аккорд» на длинной записи', () => {
    const rows = Array.from({ length: 120 }, (_, i) => CH[i % 8]); const long = { ...ana(), downbeats: rows.map((_, i) => i * 2), chords: rows.map((c, i) => ({ t: i * 2, d: 2, c })) };
    const d = recDigest({ ...rec(), dur: 240, ana: long });
    expect(d.length).toBeLessThan(1700); expect(d).not.toMatch(/\d+\.\d:/);
  });
});

describe('перевод тактов в секунды', () => {
  it('barSpan и barItems: два аккорда делят такт; плохое считается', () => {
    const st = [0, 2, 4];
    expect(barSpan(st, 1, 6)).toEqual({ t0: 0, t1: 2 }); expect(barSpan(st, 3, 6)).toEqual({ t0: 4, t1: 6 }); expect(barSpan(st, 4, 6)).toBeNull(); expect(barSpan(st, 0, 6)).toBeNull();
    const r = barItems(st, [{ bar: 1, c: 'Am F' }, { bar: 2, c: 'C' }, { bar: 9, c: 'G' }, { bar: 3, c: 'Zzz' }], 6);
    expect(r.items).toEqual([{ t: 0, d: 1, c: 'Am' }, { t: 1, d: 1, c: 'F' }, { t: 2, d: 2, c: 'C' }]); expect(r.bad).toBe(2);
  });
});

describe('правки записи ИИ: очистка, применение, пометки, откат', () => {
  it('очистка новых операций', () => {
    expect(cleanRecOp({ op: 'barchords', ref: 'r1', items: [{ bar: 1, c: 'Am' }, { bar: 0, c: 'F' }, { bar: 2 }] }).items).toEqual([{ bar: 1, c: 'Am' }]);
    expect(cleanRecOp({ op: 'parts', ref: 'r1', items: [{ bar: 9, name: ' Припев ' }, { bar: 2, name: '' }] }).items).toEqual([{ bar: 9, name: 'Припев' }]);
    expect(cleanRecOp({ op: 'meta', ref: 'r1', title: 'X', instruments: ['гитара', '', 'бас'], note: 'не уверен' })).toEqual({ op: 'meta', ref: 'r1', title: 'X', instruments: ['гитара', 'бас'], note: 'не уверен' });
    expect(cleanRecOp({ op: 'meta', ref: 'r1' })).toBeNull();
    expect(cleanRecOp({ op: 'check', ref: 'r1', tempo: 'double', key: 'Am', confidence: 0.7, note: 'похоже на вдвое' })).toMatchObject({ tempo: 'double', key: 'Am', confidence: 0.7 });
    expect(cleanRecOp({ op: 'check', ref: 'r1', tempo: 'fast' })).toBeNull();
  });
  const mkApp = (r) => { const files = { get: (id) => (id === r.id ? r : null), async save() {} }; return { store: { state: { songs: [] }, now: () => 100, save() {} }, files }; };
  const prop = (ops) => ({ id: 'p', kind: 'rec', status: 'pending', ops });
  it('аккорды по тактам: применены, помечены «от ИИ», исходный разбор помнится; откат возвращает всё', async () => {
    const r = rec(), app = mkApp(r), before = JSON.stringify(r);
    const ops = [cleanRecOp({ op: 'barchords', ref: 'r1', items: [{ bar: 1, c: 'Am7' }, { bar: 3, c: 'Cmaj7 G' }] })];
    const res = await apply(app, prop(ops));
    expect(res.ok).toBe(true); expect(r.ana.cai).toEqual({ at: 100, n: expect.any(Number) }); expect(r.ana.cedit).toBe(100); expect(r.ana.cauto).toHaveLength(8);
    expect(r.ana.chords.some((c) => c.c === 'A:min7')).toBe(true);
    expect(undo(app, res.undo)).toBe(true); expect(JSON.stringify(r)).toBe(before);
  });
  it('части: метки помечены «от ИИ», человеческие не затираются; откат', async () => {
    const r = rec({ marks: [{ t: 0, name: 'Начало' }] }), app = mkApp(r);
    const res = await apply(app, prop([cleanRecOp({ op: 'parts', ref: 'r1', items: [{ bar: 1, name: 'Вступление' }, { bar: 5, name: 'Куплет' }] })]));
    expect(res.ok).toBe(true); expect(r.marks.map((m) => [m.t, m.name, !!m.ai])).toEqual([[0, 'Вступление', true], [8, 'Куплет', true]]);
    undo(app, res.undo); expect(r.marks).toEqual([{ t: 0, name: 'Начало' }]);
  });
  it('гипотезы (meta, check) — отдельно в r.ai, данные записи не меняют; откат удаляет', async () => {
    const r = rec(), app = mkApp(r), chordsBefore = JSON.stringify(r.ana.chords);
    const res = await apply(app, prop([cleanRecOp({ op: 'meta', ref: 'r1', title: 'Song', instruments: ['гитара', 'бас'], note: 'по названию' }), cleanRecOp({ op: 'check', ref: 'r1', tempo: 'ok', confidence: 0.9 })]));
    expect(res.ok).toBe(true); expect(r.ai).toMatchObject({ by: 'ai', title: 'Song', instruments: ['гитара', 'бас'], check: { tempo: 'ok', confidence: 0.9 } });
    expect(JSON.stringify(r.ana.chords)).toBe(chordsBefore); expect(r.ana.bpm).toBe(120);
    undo(app, res.undo); expect(r.ai).toBeUndefined();
  });
  it('без разбора или сетки правка по тактам не применяется; правка человека снимает пометку', async () => {
    const r = rec({ ana: null }), app = mkApp(r);
    expect((await apply(app, prop([cleanRecOp({ op: 'barchords', ref: 'r1', items: [{ bar: 1, c: 'Am' }] })]))).ok).toBe(false);
    const a = ana({ cai: { at: 1 } }); markEdited(a, a.chords, 5); expect(a.cai).toBeUndefined();
    const b = ana({ cai: { at: 1 }, cauto: [] }); resetEdited(b, 6); expect(b.cai).toBeUndefined();
  });
  it('блок в ответе и карточка', () => {
    const w = extract('Готово.\n```melete-rec\n[{"op":"barchords","ref":"r1","items":[{"bar":1,"c":"Am"}]},{"op":"parts","ref":"r1","items":[{"bar":5,"name":"Куплет"}]},{"op":"check","ref":"r1","tempo":"half","note":"?"}]\n```', clean({ access: { media: 'write' } }));
    expect(w.proposals[0]).toMatchObject({ kind: 'rec', status: 'pending' }); expect(w.proposals[0].ops).toHaveLength(3);
    const lines = describeP(w.proposals[0], [], [rec()]);
    expect(lines[0]).toContain('от ИИ'); expect(lines[1]).toContain('5 Куплет'); expect(lines[2]).toContain('вдвое медленнее');
  });
});

describe('инструкция и контекст «Улучшить разбор»', () => {
  it('формат по тактам — только при праве на правку медиатеки; задачи заданы', () => {
    expect(buildSystem(clean({ access: { media: 'write' } }))).toContain('barchords'); expect(buildSystem(clean({ access: { media: 'read' } }))).not.toContain('barchords');
    expect(ANA_PROMPT).toContain('«от ИИ»'); expect(TASKS.map((t) => t.id)).toEqual(['chords', 'structure', 'check', 'instruments', 'meta']);
    TASKS.forEach((t) => expect(t.tz).toContain('melete-rec'));
  });
  it('в режиме записи в контекст идёт сводка этой записи, а не список всех', () => {
    const c = buildContext(clean({ access: { media: 'read' } }), { recs: [rec(), rec({ id: 'r2' })], focusRec: rec(), focusParts: [] });
    expect(c.text).toContain('ИЗМЕРЕНО программой'); expect(c.text).not.toContain('ЗАПИСИ МЕДИАТЕКИ'); expect(c.parts.map((p) => p.cat)).toEqual(['media']);
  });
});
