import { describe, it, expect } from 'vitest';
import { extract, apply, undo, describe as describeP, cleanRecOp, mergeMarks } from '../src/core/ai/proposals.js';
import { buildContext, buildSystem, mediaContext } from '../src/core/ai/context.js';
import { clean } from '../src/core/ai/config.js';
import { mergeMeta, metaHash } from '../src/core/sync.js';

const cfg = (media = 'write') => clean({ on: true, access: { songs: 'none', media } });
const mkRec = () => ({ id: 'r1', kind: 'audio', name: 'song.mp3', dur: 60, created: 1, songs: ['s1'], marks: [{ t: 1, name: 'старая' }],
  ana: { pc: 9, minor: true, bpm: 100, bpb: 4, v: 3, beats: [0, 0.6], downbeats: [0, 9.6, 19.2, 28.8], chords: [{ t: 0, d: 10, c: 'A:min' }, { t: 10, d: 10, c: 'F' }, { t: 20, d: 10, c: 'C' }] } });
const mkApp = (rec) => { const saved = []; return { saved, store: { state: { songs: [] }, now: () => 5, save() {} }, files: { get: (id) => (id === rec.id ? rec : null), save: async (r) => { saved.push(JSON.parse(JSON.stringify(r))); return true; } } }; };
const block = (j) => '```melete-rec\n' + JSON.stringify(j) + '\n```';

describe('melete-rec: разбор', () => {
  it('аккорды и части — одно предложение', () => {
    const r = extract('Вот: ' + block([{ op: 'chords', ref: 'r1', items: [{ t: 10, c: 'Dm' }] }, { op: 'marks', ref: 'r1', items: [{ t: 9.7, name: 'Припев' }] }]), cfg());
    expect(r.proposals).toHaveLength(1);
    expect(r.proposals[0]).toMatchObject({ kind: 'rec', status: 'pending' });
    expect(r.proposals[0].ops).toHaveLength(2);
    expect(r.text).toBe('Вот:');
  });
  it('без права «Правка» у записей — blocked', () => { expect(extract(block([{ op: 'marks', ref: 'r', items: [{ t: 1, name: 'x' }] }]), cfg('read')).proposals[0].status).toBe('blocked'); });
  it('мусор отсеивается, пустое — invalid', () => {
    expect(extract(block([{ op: 'delete', ref: 'r1' }]), cfg()).proposals[0].status).toBe('invalid');
    expect(extract('```melete-rec\nне json\n```', cfg()).proposals[0].status).toBe('invalid');
    expect(cleanRecOp({ op: 'chords', ref: 'r', items: [{ t: -1, c: 'C' }, { t: 'x', c: 'C' }, { t: 3, c: 5 }, { t: 3, d: 0, c: 'C' }] })).toBeNull();
    expect(cleanRecOp({ op: 'marks', ref: 'r', items: [{ t: 3, name: 'A\u0007B' }] }).items[0].name).toBe('A B');
  });
  it('права на «песни» недостаточно для записей', () => { expect(extract(block([{ op: 'marks', ref: 'r', items: [{ t: 1, name: 'x' }] }]), clean({ on: true, access: { songs: 'write' } })).proposals[0].status).toBe('blocked'); });
});
describe('melete-rec: применение и отмена', () => {
  it('аккорды ставятся, исходное запоминается, правка помечена; отмена возвращает всё', async () => {
    const rec = mkRec(), app = mkApp(rec), orig = JSON.stringify(rec);
    const p = extract(block([{ op: 'chords', ref: 'r1', items: [{ t: 10, c: 'Dm7' }] }, { op: 'marks', ref: 'r1', items: [{ t: 9.7, name: 'Припев' }, { t: 0, name: 'Вступление' }] }]), cfg()).proposals[0];
    const r = await apply(app, p);
    expect(r.ok).toBe(true);
    expect(rec.ana.chords[1]).toEqual({ t: 10, d: 10, c: 'D:min7' });
    expect(rec.ana.cedit).toBe(5); expect(rec.ana.cauto).toHaveLength(3);
    expect(rec.marks.map((m) => [m.t, m.name])).toEqual([[0, 'Вступление'], [1, 'старая'], [9.6, 'Припев']]); // 9.7 притянулась к сильной доле 9.6
    expect(app.saved.length).toBe(1);
    expect(undo(app, r.undo)).toBe(true);
    await Promise.resolve();
    expect(JSON.stringify(rec)).toBe(orig);
  });
  it('записи нет или разбора нет — «нечего менять»', async () => {
    const rec = mkRec(); delete rec.ana;
    const app = mkApp(rec);
    expect((await apply(app, extract(block([{ op: 'chords', ref: 'r1', items: [{ t: 1, c: 'C' }] }]), cfg()).proposals[0])).ok).toBe(false);
    expect((await apply(app, extract(block([{ op: 'chords', ref: 'zzz', items: [{ t: 1, c: 'C' }] }]), cfg()).proposals[0])).ok).toBe(false);
  });
  it('карточка называет запись', () => {
    const p = extract(block([{ op: 'marks', ref: 'r1', items: [{ t: 65, name: 'Припев' }] }]), cfg()).proposals[0];
    expect(describeP(p, [], [mkRec()])[0]).toContain('song.mp3');
    expect(describeP(p, [], [mkRec()])[0]).toContain('Припев 1:05');
  });
  it('mergeMarks: имя ближней метки меняется, лишнего не добавляется', () => {
    expect(mergeMarks([{ t: 10, name: '' }], [{ t: 10.3, name: 'Куплет' }])).toEqual([{ t: 10, name: 'Куплет' }]);
    expect(mergeMarks([], [{ t: 99, name: 'x' }], [], 60)).toEqual([]);
  });
});
describe('контекст записей', () => {
  it('читаются только при доступе; в подробной части — аккорды, доли, части; текста песни нет', () => {
    const rec = mkRec(), songs = [{ id: 's1', title: 'Песня', artist: 'Группа', notes: 'СЕКРЕТНЫЙ ТЕКСТ' }];
    expect(buildContext(clean({ on: true }), { recs: [rec], songs }).text).toBe('');
    const t = buildContext(cfg('read'), { recs: [rec], songs, used: {} }).text;
    expect(t).toContain('r1 | song.mp3 | Песня — Группа | 60 | Am | 100');
    expect(t).toContain('0:Am 10:F 20:C');
    expect(t).toContain('Сильные доли, с: 0 9.6 19.2 28.8');
    expect(t).toContain('1:старая');
    expect(t).not.toContain('СЕКРЕТНЫЙ');
  });
  it('инструкция про melete-rec только при праве «Правка» и без обещания слуха', () => {
    expect(buildSystem(cfg('write'))).toContain('melete-rec');
    expect(buildSystem(cfg('write'))).toContain('НЕ слышишь звук');
    expect(buildSystem(cfg('read'))).not.toContain('melete-rec');
  });
  it('список ограничен', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ ...mkRec(), id: 'r' + i, created: i }));
    expect(mediaContext(many).split('\n').filter((l) => /^r\d+ \|/.test(l)).length).toBe(60);
  });
});
describe('синхронизация правки аккордов', () => {
  const base = () => ({ id: 'a', ana: { v: 3, at: 100, chords: [{ t: 0, d: 5, c: 'C' }] } });
  it('правка весомее более нового пересчёта, оба конца сходятся', () => {
    const edited = base(); edited.ana.cedit = 500; edited.ana.chords = [{ t: 0, d: 5, c: 'D' }];
    const recomputed = base(); recomputed.ana.v = 4; recomputed.ana.at = 900;
    expect(mergeMeta(recomputed, edited).ana.chords[0].c).toBe('D');
    expect(mergeMeta(edited, recomputed)).toBeNull();
    const a = { ...recomputed, ...mergeMeta(recomputed, edited) };
    expect(metaHash(a)).toBe(metaHash(edited));
  });
  it('более поздняя правка побеждает', () => {
    const a = base(), b = base(); a.ana.cedit = 10; b.ana.cedit = 20; b.ana.chords = [{ t: 0, d: 5, c: 'E' }];
    expect(mergeMeta(a, b).ana.chords[0].c).toBe('E'); expect(mergeMeta(b, a)).toBeNull();
  });
  it('без правок — прежнее правило', () => { const a = base(), b = base(); b.ana.at = 200; expect(mergeMeta(a, b).ana.at).toBe(200); });
});
