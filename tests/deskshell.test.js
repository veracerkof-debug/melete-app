import { describe, it, expect } from 'vitest';
import { deskPro, railGroups, topTabs, activeTop, RAIL } from '../src/core/screens/deskshell.js';
import { planFor, planText, songInfo, MINUTES } from '../src/core/screens/deskhome.js';
import { presetWS, PRESETS } from '../src/core/screens/deskwork.js';
import { cleanRoutine } from '../src/core/routine.js';
import { lsizes } from '../src/core/workspace.js';

const st = (o = {}) => ({ configured: true, profile: { level: 'amateur' }, ...o });
const tr = (k, p) => k + (p ? JSON.stringify(p) : '');

describe('компьютер: оболочка не-новичка', () => {
  it('включается только на компьютере, не у новичка, не в «Минимал» и не в «только инструменты»', () => {
    expect(deskPro(st(), true)).toBe(true);
    expect(deskPro(st(), false)).toBe(false);
    expect(deskPro(st({ profile: { level: 'beginner' } }), true)).toBe(false);
    expect(deskPro(st({ uiStyle: 'mono' }), true)).toBe(false);
    expect(deskPro(st({ toolsOnly: true }), true)).toBe(false);
    expect(deskPro({ profile: null }, true)).toBe(false);
    expect(deskPro(st({ profile: { level: 'pro' } }), true)).toBe(true);
  });
  it('рельса: порядок групп как в макете; выключенные и отсутствующие убираются; пустая группа — тоже', () => {
    const have = new Set(RAIL.flat());
    const all = railGroups(st({ church: true }), (id) => (have.has(id) ? { id } : null));
    expect(all.flat()).toEqual(RAIL.flat());
    const off = railGroups(st({ church: true, off: { metro: true, tuner: true, piano: true, drone: true, looper: true, glider: true, theremin: true } }), (id) => ({ id }));
    expect(off.length).toBe(3); // первая группа пропала целиком
    expect(off[0]).toEqual(['ear', 'beat', 'theory']);
    // Библия — только в церковном режиме
    expect(railGroups(st(), (id) => ({ id })).flat()).not.toContain('bible');
    expect(railGroups(st({ church: true }), (id) => ({ id })).flat()).toContain('bible');
  });
  it('вкладки: пять, «Служение» только в церковном режиме; активная — по открытому', () => {
    const a = topTabs(st({ church: true }));
    expect(a.map((x) => x.id)).toEqual(['today', 'service', 'songs', 'tools', 'stats']);
    expect(a.map((x) => x.go)).toEqual(['home', 'calendar', 'library', 'tools', 'stats']);
    expect(topTabs(st())[1].label).not.toBe(a[1].label);
    expect(activeTop({ tab: 'home' })).toBe('today');
    expect(activeTop({ tab: 'library' })).toBe('songs');
    expect(activeTop({ tab: 'home', tool: true })).toBe('tools');
    expect(activeTop({ tab: 'home', session: true })).toBe('tools');
    expect(activeTop({ tab: 'home', panel: 'stats' })).toBe('stats');
    expect(activeTop({ tab: 'home', panel: 'look' })).toBe('');
  });
});

describe('«Сегодня»: план занятия', () => {
  const songs = [{ id: 'a', title: 'Бог верный', currentBpm: '', targetBpm: 0 }, { id: 'b', title: 'Всем своим сердцем', currentBpm: 72, targetBpm: 84 }];
  it('сумма пунктов — ровно выбранное время, план принимается планами занятий', () => {
    for (const min of MINUTES) for (const k of [0, 1, 2]) {
      const p = planFor(min, songs.slice(0, k), tr);
      expect(p.items.reduce((a, x) => a + x.min, 0)).toBe(min);
      const c = cleanRoutine(p);
      expect(c).toBeTruthy();
      expect(c.items.length).toBe(p.items.length);
    }
  });
  it('разминка первой; песни — со своим темпом; нет песен — разминка и свободная игра', () => {
    const p = planFor(30, songs, tr);
    expect(p.items[0].tool).toBe('metro');
    expect(p.items.filter((x) => x.songId).map((x) => x.songId)).toEqual(['a', 'b']);
    expect(p.items.find((x) => x.songId === 'b').bpm).toBe(72);
    expect(planFor(10, songs, tr).items.filter((x) => x.songId).length).toBe(1); // до 30 мин — одна песня
    expect(planFor(20, [], tr).items.map((x) => x.title)).toEqual(['desk.plan.warm', 'desk.plan.free']);
  });
  it('текст плана называет песню и цель темпа', () => {
    const p = planFor(30, songs, tr);
    expect(planText(p, songs, tr)).toContain('desk.plan.upTo');
  });
  it('песня готова: есть аккорды и темп дошёл до цели', () => {
    expect(songInfo({ notes: '[Am]слова', targetBpm: 80, currentBpm: 80 }).ready).toBe(true);
    expect(songInfo({ notes: '', targetBpm: 0, currentBpm: '' }).ready).toBe(false);
    expect(songInfo({ notes: '[Am]слова', targetBpm: 80, currentBpm: 70 }).gap).toBe(true);
  });
});

describe('рабочая станция: раскладки', () => {
  it('каждая раскладка укладывается в окна (хватает инструментов под число окон)', () => {
    for (const id of Object.keys(PRESETS)) {
      const w = presetWS({}, id);
      expect(w.panes.length).toBeLessThanOrEqual(lsizes(w.layout).length);
    }
  });
});
