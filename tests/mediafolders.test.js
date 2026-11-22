import { describe, it, expect } from 'vitest';
import { autoOf, catOf, catsFor, addFolder, renameFolder, removeFolder, setFolder, inCat } from '../src/core/mediafolders.js';

describe('папки медиатеки', () => {
  it('авто-папки по типу записи', () => {
    expect(autoOf({ id: 'a1', dict: true })).toBe('dict');
    expect(autoOf({ id: 'a2', video: true })).toBe('video');
    expect(autoOf({ id: 'a3', type: 'video/mp4' })).toBe('video');
    expect(autoOf({ id: 'a4', rtool: 'Пианино', ses: 'tool' })).toBe('instr');
    expect(autoOf({ id: 'a5', rtool: 'Метроном', ses: 'free' })).toBe('free');
    expect(autoOf({ id: 'lp1x' })).toBe('instr');
    expect(autoOf({ id: 'q' })).toBe('songs');
  });
  it('своя папка сильнее авто; удалённая — запись возвращается', () => {
    const s = {}; const id = addFolder(s, 'Выходы');
    const x = { id: 'x', dict: true }; setFolder(x, id);
    expect(catOf(x, s.mediaFolders)).toBe(id);
    expect(inCat(x, id, s.mediaFolders)).toBe(true);
    const moved = removeFolder(s, id, [x]);
    expect(moved).toEqual([x]); expect(x.folder).toBeUndefined();
    expect(catOf(x, s.mediaFolders)).toBe('dict');
  });
  it('имена: пустые и повторы не принимаются; переименование', () => {
    const s = {};
    expect(addFolder(s, '  ')).toBeNull();
    const id = addFolder(s, 'Пэды');
    expect(addFolder(s, 'пэды')).toBeNull();
    expect(renameFolder(s, id, 'Фоны')).toBe(true);
    expect(s.mediaFolders[0].name).toBe('Фоны');
  });
  it('полоса: «Все», непустые авто, свои', () => {
    const s = {}; addFolder(s, 'А');
    const cs = catsFor([{ id: '1' }, { id: '2', dict: true }], s.mediaFolders);
    expect(cs.map((c) => c.id)).toEqual(['all', 'songs', 'dict', s.mediaFolders[0].id]);
    expect(cs[0].n).toBe(2);
  });
});
