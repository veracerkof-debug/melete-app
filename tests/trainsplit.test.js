import { describe, it, expect } from 'vitest';
import { trainSplit } from '../src/core/settings.js';
import { moduleById } from '../src/modules/index.js';
import { buildRecord, createActive } from '../src/core/session.js';
import { problemOf, seal } from '../src/core/integrity.js';

describe('«Слух» и «Ритм» снова отдельно (11.11.2026)', () => {
  it('настройки: место «Слуха и ритма» занимают оба, выключенный — выключены оба; один раз', () => {
    const st = { tabs: ['home', 'train', 'tools'], quick: ['metro', 'train'], toolsTab: { order: ['piano', 'train', 'ear'] }, off: { train: true } };
    expect(trainSplit(st)).toBe(true);
    expect(st.tabs).toEqual(['home', 'ear', 'beat', 'tools']);
    expect(st.quick).toEqual(['metro', 'ear', 'beat']);
    expect(st.toolsTab.order).toEqual(['piano', 'ear', 'beat']);
    expect(st.off).toEqual({ ear: true, beat: true });
    expect(trainSplit(st)).toBe(false);
  });
  it('старые записи train не переписываются и читаются как «Слух»', () => {
    expect(moduleById('train').id).toBe('ear');
  });
  it('учёба в окнах занятия попадает в запись, печать её не касается', () => {
    const a = createActive({ type: 'free' }, 1_790_000_000_000);
    a.study = { ear: 125_400, beat: 900 };
    const r = seal(buildRecord(a, { dur: 600, best: 0 }, 1_790_000_600_000));
    expect(r.study).toEqual({ ear: 125, beat: 1 });
    r.study = { ear: 5 };
    expect(problemOf(r, 1_790_000_700_000)).toBe(null);
  });
});
