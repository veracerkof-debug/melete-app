// Объединённые инструменты (src/core/groups.js, mergemap.js): таблицы согласованы с meta модулей, старые id отделов превращаются в группу
import { describe, it, expect } from 'vitest';
import { MERGE, GROUP_MEMBERS } from '../src/core/mergemap.js';
import { fixWS } from '../src/core/workspace.js';
import { readFileSync } from 'node:fs';

const groupOfMeta = (id) => (readFileSync('src/modules/' + id + '/meta.js', 'utf8').match(/\n  group: '([a-z]+)'/) || [])[1] || id;

describe('объединённые инструменты', () => {
  it('group в meta каждого отдела совпадает с таблицей', () => {
    for (const [g, ids] of Object.entries(GROUP_MEMBERS)) for (const id of ids) expect(groupOfMeta(id), id).toBe(g);
    for (const [id, g] of Object.entries(MERGE)) expect(GROUP_MEMBERS[g]).toContain(id);
  });
  it('раскладка со старым id отдела: окно — группа, отдел выбран', () => {
    const w = fixWS({ layout: 'F', panes: ['beat'], focus: 0, sub: {}, ratio: 0.5 }, ['metro', 'ear', 'theory'], null);
    expect(w.panes[0]).toBe('ear');
    expect(w.sub.ear).toBe('beat');
  });
  it('сессия с одним инструментом: «looper» → окно студии, отдел «лупер»', () => {
    const w = fixWS({ layout: 'F', panes: ['metro'], focus: 0, sub: {} }, ['metro', 'studio'], { type: 'tool', tool: 'looper' });
    expect(w.panes).toEqual(['studio']);
    expect(w.sub.studio).toBe('looper');
  });
  it('два старых id одной группы не дублируют окно', () => {
    const w = fixWS({ layout: 'HH', panes: ['ear', 'beat', 'metro', 'tuner'], focus: 0, sub: {} }, ['metro', 'tuner', 'ear'], null);
    expect(w.panes.filter((x) => x === 'ear').length).toBe(1);
  });
});
