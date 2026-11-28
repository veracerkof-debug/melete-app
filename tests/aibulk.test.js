import { describe, it, expect } from 'vitest';
import { cleanQueries, answerQueries } from '../src/core/ai/queries.js';
import { clean } from '../src/core/ai/config.js';
import { parseResponse } from '../src/core/ai/provider.js';
import { buildSystem } from '../src/core/ai/context.js';

const songs = Array.from({ length: 1000 }, (_, i) => ({ id: 's' + i, title: 'Песня ' + i, artist: i % 2 ? 'Иванов' : 'Петров', notes: 'Куплет ' + i }));
const cfg = (a) => clean({ on: true, access: a });
describe('нейросеть: много песен', () => {
  it('тексты — только при разрешении «Тексты», и только вместе с «Песни»', () => {
    const q = cleanQueries([{ q: 'songtext', ids: ['s1', 's2'] }]);
    expect(q[0].ids).toEqual(['s1', 's2']);
    expect(answerQueries(q, { songs }, cfg({ songs: 'read' }))).toContain('НЕТ ДОСТУПА');
    expect(answerQueries(q, { songs }, cfg({ songs: 'read', text: 'read' }))).toContain('Куплет 1');
    expect(answerQueries(q, { songs }, cfg({ text: 'read' }))).toContain('нужна ещё');
  });
  it('не больше 5 песен за запрос; пустой список отброшен', () => {
    expect(cleanQueries([{ q: 'songtext', ids: ['1', '2', '3', '4', '5', '6', '7'] }])[0].ids.length).toBe(5);
    expect(cleanQueries([{ q: 'songtext' }])).toEqual([]);
  });
  it('список песен — постранично и с отбором', () => {
    const c = cfg({ songs: 'read' });
    expect(answerQueries(cleanQueries([{ q: 'songs', from: 401 }]), { songs }, c)).toContain('s400 ');
    expect(answerQueries(cleanQueries([{ q: 'songs', like: 'петров' }]), { songs }, c)).toContain('Петров');
  });
  it('оборванный ответ помечается; инструкция знает про тексты', () => {
    expect(parseResponse({ format: 'anthropic' }, 200, { content: [{ type: 'text', text: 'ab' }], stop_reason: 'max_tokens' }).cut).toBe(true);
    expect(buildSystem(cfg({ songs: 'write', text: 'read' }))).toContain('songtext');
    expect(buildSystem(cfg({ songs: 'write' }))).not.toContain('songtext');
  });
});

import { addSongs, emptySong } from '../src/core/library.js';
describe('импорт сотен песен', () => {
  it('addSongs пишет состояние один раз', () => {
    let saves = 0; const store = { now: () => 1, state: { songs: [], settings: {} }, save: () => { saves++; } };
    const n = addSongs(store, Array.from({ length: 1500 }, (_, i) => ({ ...emptySong({}), title: 'П' + i, notes: 'x' })).concat([{ title: ' ' }]));
    expect(n).toBe(1500); expect(saves).toBe(1); expect(store.state.songs.length).toBe(1500);
  });
});
