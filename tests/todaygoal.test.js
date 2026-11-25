import { describe, it, expect } from 'vitest';
import { goalOf, setGoal, clearGoal, goalDone } from '../src/core/todaygoal.js';

const songs = [{ id: 's1', title: 'А' }, { id: 's2', title: 'Б', deleted: true }];
const T0 = new Date(2026, 10, 25, 12, 0).getTime(), DAY = 864e5;

describe('цель на день', () => {
  it('ставится на сегодня и действует только сегодня', () => {
    const st = {}; setGoal(st, 's1', T0);
    expect(goalOf(st, songs, T0).id).toBe('s1');
    expect(goalOf(st, songs, T0 + 3 * 3600000).id).toBe('s1'); // позже в тот же день
    expect(goalOf(st, songs, T0 + DAY)).toBeNull(); // завтра цели нет
  });
  it('нет цели, удалённая или чужая песня — null; убрать цель', () => {
    expect(goalOf({}, songs, T0)).toBeNull();
    const st = {}; setGoal(st, 's2', T0); expect(goalOf(st, songs, T0)).toBeNull();
    setGoal(st, 's1', T0); clearGoal(st); expect(st.todayGoal).toBeUndefined(); expect(goalOf(st, songs, T0)).toBeNull();
    setGoal(st, 'zzz', T0); expect(goalOf(st, songs, T0)).toBeNull();
  });
  it('цель выполнена: сегодня была минута с этой песней', () => {
    const S = (songId, start, dur) => ({ songId, start, dur });
    expect(goalDone([S('s1', T0, 600)], 's1', T0)).toBe(true);
    expect(goalDone([S('s1', T0, 30)], 's1', T0)).toBe(false);
    expect(goalDone([S('s1', T0 - DAY, 600)], 's1', T0)).toBe(false);
    expect(goalDone([S('s2', T0, 600)], 's1', T0)).toBe(false);
    expect(goalDone([], 's1', T0)).toBe(false);
  });
});
