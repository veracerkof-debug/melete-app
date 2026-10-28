// Запись студии: punch-in (место под новый клип), дубли на петле, смена дубля, замер задержки по щелчкам
import { describe, it, expect } from 'vitest';
import { newProject, newTrack, addClip, clipsOf, punchClip, takesOf, setTake, normalizeProject, secPerBeat } from '../src/music/project.js';
import { latencyOf } from '../src/modules/studio/record.js';

const audioProj = () => { const p = newProject({ bpm: 120 }); const tr = newTrack('audio', 0); p.tracks = [tr]; p.clips = []; return { p, tr }; };

describe('punch-in', () => {
  it('середина старого клипа освобождается, края целы и тянутся обратно', () => {
    const { p, tr } = audioProj();
    addClip(p, tr, 0, 16, { fileId: 'a', off: 0 });
    const c = punchClip(p, tr, 4, 8, { fileId: 'b', off: 0.05 });
    const cs = clipsOf(p, tr);
    expect(cs.map((x) => [x.at, x.len, x.data.fileId])).toEqual([[0, 4, 'a'], [4, 4, 'b'], [8, 8, 'a']]);
    expect(c.data.fileId).toBe('b');
    expect(cs[2].data.off).toBeCloseTo(8 * secPerBeat(p)); // правая часть — с того же места файла
  });
  it('клипы целиком внутри — убираются, задевающие край — обрезаются', () => {
    const { p, tr } = audioProj();
    addClip(p, tr, 0, 6, { fileId: 'a', off: 0 });
    addClip(p, tr, 6, 2, { fileId: 'x', off: 0 });
    addClip(p, tr, 9, 7, { fileId: 'z', off: 0 });
    punchClip(p, tr, 4, 12, { fileId: 'n', off: 0 });
    expect(clipsOf(p, tr).map((x) => [x.at, x.len, x.data.fileId])).toEqual([[0, 4, 'a'], [4, 8, 'n'], [12, 4, 'z']]);
  });
});

describe('дубли на петле', () => {
  it('только полные круги; ни одного — один с начала', () => {
    expect(takesOf(8.1, 0.05, 2)).toEqual([0.05, 2.05, 4.05, 6.05]);
    expect(takesOf(1.2, 0.05, 2)).toEqual([0.05]);
  });
  it('смена дубля сохраняет обрезку; дубли переживают нормализацию проекта', () => {
    const { p, tr } = audioProj();
    const c = punchClip(p, tr, 0, 4, { fileId: 'f', off: 4.05, takes: [0.05, 2.05, 4.05], take: 2 });
    c.data.off += 0.5; // обрезали начало
    setTake(c, 0);
    expect(c.data.off).toBeCloseTo(0.55);
    expect(c.data.take).toBe(0);
    setTake(c, -1); // по кругу — последний
    expect(c.data.take).toBe(2);
    const q = normalizeProject(JSON.parse(JSON.stringify(p)));
    expect(q.clips[0].data.takes).toEqual([0.05, 2.05, 4.05]);
    expect(q.clips[0].data.take).toBe(2);
  });
});

describe('замер задержки', () => {
  it('медиана запаздывания щелчков', () => {
    const sr = 8000, ch = new Float32Array(sr * 3), rel = [0.2, 0.7, 1.2, 1.7];
    rel.forEach((t, i) => { const at = Math.round((t + 0.08 + (i === 1 ? 0.01 : 0)) * sr); for (let k = 0; k < 40; k++) ch[at + k] = 0.5 * Math.sin(k); });
    expect(latencyOf(ch, sr, rel)).toBeCloseTo(0.08, 2);
  });
  it('тишина — не услышали', () => {
    expect(latencyOf(new Float32Array(16000), 8000, [0.2, 0.7])).toBeNull();
  });
});

import { notesFromTake } from '../src/music/project.js';
describe('партия из записи игры', () => {
  it('ноты с первой, доли по темпу, скольжение — к полутону, такты целиком', () => {
    const p = newProject({ bpm: 120 }); // доля — 0,5 с
    const ev = [{ t: 1, k: 'on', id: 'a', m: 60.2, v: 0.7 }, { t: 1.5, k: 'off', id: 'a' }, { t: 2, k: 'on', id: 'b', m: 64, v: 1 }, { t: 2.2, k: 'mv', id: 'b', m: 65.5 }, { t: 4, k: 'off', id: 'b' }];
    const d = notesFromTake(p, ev);
    expect(d.notes).toEqual([{ t: 0, d: 1, m: 60, v: 0.7 }, { t: 2, d: 4, m: 64, v: 1 }]);
    expect(d.bars).toBe(2);
    expect(notesFromTake(p, [])).toBeNull();
  });
});
