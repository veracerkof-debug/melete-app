import { describe, it, expect } from 'vitest';
import { resolveTarget } from '../src/core/notifytap.js';
import { goOf } from '../src/core/reminders.js';

const songs = { s1: { id: 's1', lastTool: 'piano' }, s2: { id: 's2' } };
const byId = (id) => songs[id] || null;
describe('касание уведомления', () => {
  it('goOf: что поставлено в расписании — то и цель (план важнее песни, песня важнее инструмента)', () => {
    expect(goOf({ routine: 'r1', songId: 's1', tool: 'metro' })).toEqual({ go: 'routine', routine: 'r1' });
    expect(goOf({ songId: 's1', tool: 'metro' })).toEqual({ go: 'song', songId: 's1' });
    expect(goOf({ tool: 'vocal' })).toEqual({ go: 'tool', tool: 'vocal' });
    expect(goOf({})).toEqual({ go: 'home' });
  });
  it('песня — с инструментом прошлого раза; нет такого инструмента или песни — аккуратно', () => {
    expect(resolveTarget({ go: 'song', songId: 's1' }, byId)).toEqual({ do: 'song', songId: 's1', tool: 'piano' });
    expect(resolveTarget({ go: 'song', songId: 's1' }, byId, () => false)).toEqual({ do: 'song', songId: 's1', tool: null });
    expect(resolveTarget({ go: 'song', songId: 's2' }, byId)).toEqual({ do: 'song', songId: 's2', tool: null });
    expect(resolveTarget({ go: 'song', songId: 'gone' }, byId)).toEqual({ do: 'home' });
  });
  it('план, инструмент, Библия, календарь, мусор', () => {
    expect(resolveTarget({ go: 'routine', routine: 'r1' }, byId)).toEqual({ do: 'routine', routine: 'r1' });
    expect(resolveTarget({ go: 'tool', tool: 'tuner' }, byId)).toEqual({ do: 'tool', tool: 'tuner' });
    expect(resolveTarget({ go: 'tool', tool: 'nope' }, byId, () => false)).toEqual({ do: 'home' });
    expect(resolveTarget({ go: 'bible' }, byId)).toEqual({ do: 'bible' });
    expect(resolveTarget({ go: 'calendar' }, byId)).toEqual({ do: 'calendar' });
    expect(resolveTarget(null, byId)).toBeNull();
    expect(resolveTarget({ go: 'xx' }, byId)).toEqual({ do: 'home' });
  });
  it('уведомление об обновлении: касание — установка', () => {
    expect(resolveTarget({ go: 'update' }, () => null)).toEqual({ do: 'update' });
  });
});
