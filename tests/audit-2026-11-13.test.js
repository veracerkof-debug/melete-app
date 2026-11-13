// Защиты от потери данных по аудиту 13.11.2026 (docs/archive/audit-2026-11-13.md)
import { describe, it, expect } from 'vitest';
import { planFiles } from '../src/core/sync.js';
import { applyParts } from '../src/core/backupparts.js';
import { createFiles } from '../src/core/files.js';

describe('синхронизация: недоступная база не удаляет чужие файлы', () => {
  const last = ['a', 'b', 'c'], full = last.map((id) => ({ id }));
  it('у меня пустой список при непустом прошлом — у них ничего не удаляется', () => {
    const p = planFiles([], full, last);
    expect(p.delTheirs).toEqual([]);
    expect(p.delMine).toEqual([]);
  });
  it('у них пустой список — у меня ничего не удаляется', () => {
    expect(planFiles(full, [], last).delMine).toEqual([]);
  });
  it('база недоступна (флаг) — удалений нет ни в одну сторону', () => {
    expect(planFiles([{ id: 'a' }], full, last, { mineOk: false })).toMatchObject({ delMine: [], delTheirs: [] });
    expect(planFiles(full, [{ id: 'a' }], last, { theirsOk: false })).toMatchObject({ delMine: [], delTheirs: [] });
  });
  it('обычное удаление одного файла работает как раньше', () => {
    expect(planFiles([{ id: 'a' }, { id: 'b' }], full, last).delTheirs).toEqual(['c']);
  });
});

describe('синхронизация: профиль — только более свежий', () => {
  const st = (profile) => ({ songs: [], sessions: [], settings: { profile, updatedAt: 1 } });
  const filled = { name: 'Анна', instruments: ['guitar'], at: 200 };
  it('пустой профиль с другого устройства не затирает заполненный', () => {
    const out = applyParts(st(filled), { settings: { profile: { name: '', instruments: [] } }, sessions: [] }, ['profile'], { fresh: true });
    expect(out.settings.profile.name).toBe('Анна');
  });
  it('более старый не затирает, более свежий — заменяет', () => {
    expect(applyParts(st(filled), { settings: { profile: { name: 'Б', at: 100 } }, sessions: [] }, ['profile'], { fresh: true }).settings.profile.name).toBe('Анна');
    expect(applyParts(st(filled), { settings: { profile: { name: 'В', at: 300 } }, sessions: [] }, ['profile'], { fresh: true }).settings.profile.name).toBe('В');
  });
  it('восстановление из копии (без fresh) — профиль из копии, как раньше', () => {
    expect(applyParts(st(filled), { settings: { profile: { name: 'Г', at: 1 } }, sessions: [] }, ['profile']).settings.profile.name).toBe('Г');
  });
});

describe('файлы: тот же id не дублируется', () => {
  it('повторный add заменяет запись в памяти', async () => {
    const f = createFiles({ indexedDB: { open() { throw new Error('нет'); } }, onError: () => {} });
    await f.ready;
    await f.add({ id: 'r1', name: 'старая' });
    await f.add({ id: 'r1', name: 'новая' });
    expect(f.list('audio').length).toBe(1);
    expect(f.get('r1').name).toBe('новая');
    await f.remove('r1');
    expect(f.get('r1')).toBeUndefined();
  });
});
