import { describe, it, expect } from 'vitest';
import { newPart, quantize, autoGrid, guessTempo, splitDur12, partXML, tabOf, setFret, delBars, cutFrom, insertAt, addNote, setLen, playTimes, partEvents, notesFromEvents, barsOf, setTempo } from '../src/music/livescore.js';
import { createNoteTracker } from '../src/audio/notein.js';

const spb = 60 / 120;
const part = (raw, patch = {}) => newPart({ bpm: 120, raw, ...patch });

describe('ноты с игры: партия', () => {
  it('восьмые ложатся на восьмые, сетка — сама', () => {
    const raw = [0, 0.5, 1, 1.5, 2].map((b, i) => ({ t: b * spb + (i % 2 ? 0.02 : -0.015), d: 0.45 * spb, m: 60 + i, v: 0.8 }));
    const p = part(raw);
    expect(autoGrid(p.raw, p.bpm)).toBe('8');
    expect(quantize(p).map((n) => n.t)).toEqual([0, 0.5, 1, 1.5, 2]);
  });
  it('триоли узнаются', () => {
    const raw = [0, 1 / 3, 2 / 3, 1, 4 / 3, 5 / 3].map((b) => ({ t: b * spb, d: 0.3 * spb, m: 64 }));
    expect(autoGrid(raw, 120)).toBe('8t');
  });
  it('темп без метронома: ровные четверти на 100', () => {
    const on = Array.from({ length: 12 }, (_, i) => 1.234 + i * 0.6);
    const g = guessTempo(on);
    expect([100, 50, 200].some((b) => Math.abs(g.bpm - b) <= 1)).toBe(true);
    expect(Math.abs(g.t0 - 1.234)).toBeLessThan(0.05);
  });
  it('длины в делениях: ровные и триольные', () => {
    expect(splitDur12(12)).toEqual([[12, 'quarter', false]]);
    expect(splitDur12(4)).toEqual([[4, 'eighth', true]]);
    expect(splitDur12(10).map((x) => x[0])).toEqual([6, 4]);
    expect(splitDur12(18).map((x) => x[1])).toEqual(['quarter', 'eighth']);
  });
  it('MusicXML: такты, табы, триоли', () => {
    const p = part([{ t: 0, d: spb, m: 64 }, { t: spb * 4, d: spb / 3, m: 67 }, { t: spb * 4 + spb / 3, d: spb / 3, m: 69 }, { t: spb * 4 + (2 * spb) / 3, d: spb / 3, m: 71 }], { grid: '8t' });
    const x = partXML(p, { title: 'Проба' });
    expect((x.match(/<measure /g) || []).length).toBe(2);
    expect(x).toContain('<time-modification>');
    expect(x).toContain('<fret>');
    expect(x).toContain('Проба');
  });
  it('струна и лад руками держатся, высота следует', () => {
    const p = part([{ t: 0, d: spb, m: 64 }]);
    expect(tabOf(p)[0]).toEqual({ s: 1, f: 0 });
    setFret(p, 0, 2, 5);
    expect(p.raw[0].m).toBe(64);
    expect(tabOf(p)[0]).toEqual({ s: 2, f: 5 });
  });
  it('удалить такты, перезаписать с такта, ввод руками', () => {
    const p = part([0, 4, 8, 12].map((b) => ({ t: b * spb, d: spb, m: 60 + b })));
    delBars(p, 1, 2);
    expect(quantize(p).map((n) => [n.t, n.m])).toEqual([[0, 60], [4, 68], [8, 72]]);
    cutFrom(p, 1);
    expect(p.raw.length).toBe(1);
    insertAt(p, 1, [{ t: 0, d: spb, m: 50 }]);
    expect(quantize(p).map((n) => n.t)).toEqual([0, 4]);
    addNote(p, 2, 62, 2);
    setLen(p, 0, 3);
    expect(quantize(p).find((n) => n.m === 62).d).toBe(2);
    expect(quantize(p).find((n) => n.m === 60).d).toBe(2); // одноголосие: до следующей ноты
    expect(barsOf(p)).toBe(2);
  });
  it('сила квантования — только для прослушивания', () => {
    const p = part([{ t: 0.1, d: 0.4, m: 60 }], { str: 0.5 });
    expect(quantize(p)[0].t).toBe(0);
    expect(playTimes(p)[0].t).toBeCloseTo(0.1, 3);
    expect(partEvents(p)[0].t).toBeCloseTo(0.05, 3);
  });
  it('новый темп — доли на месте', () => {
    const p = part([{ t: 1, d: 0.5, m: 60 }]);
    setTempo(p, 60);
    expect(quantize(p)[0].t).toBe(2);
  });
  it('пустая партия: такт паузы, без табов', () => {
    const p = part([]);
    expect(tabOf(p)).toEqual([]);
    expect((partXML(p).match(/<measure /g) || []).length).toBe(1);
  });
  it('события игры → ноты', () => {
    const r = notesFromEvents([{ t: 1, k: 'on', id: 'a', m: 60 }, { t: 1.5, k: 'off', id: 'a' }, { t: 2, k: 'on', id: 'b', m: 62 }]);
    expect(r.done).toEqual([{ t: 1, d: 0.5, m: 60, v: 0.8 }]);
    expect(r.open.size).toBe(1);
  });
});

describe('ноты с микрофона: кадры → ноты', () => {
  const f = (m) => 440 * 2 ** ((m - 69) / 12);
  it('устойчивая высота — нота, тишина — конец, смена — новая', () => {
    const tr = createNoteTracker(), ev = [];
    for (let i = 0; i < 20; i++) ev.push(...tr.push(i * 0.016, f(60) * (1 + (i % 2) * 0.002), 0.1));
    for (let i = 20; i < 40; i++) ev.push(...tr.push(i * 0.016, f(64), 0.1));
    for (let i = 40; i < 50; i++) ev.push(...tr.push(i * 0.016, 0, 0));
    expect(ev.filter((e) => e.k === 'on').map((e) => e.m)).toEqual([60, 64]);
    expect(ev.filter((e) => e.k === 'off').length).toBe(2);
    expect(ev[0].t).toBe(0);
  });
  it('короткий призвук — не нота', () => {
    const tr = createNoteTracker(), ev = [];
    for (let i = 0; i < 2; i++) ev.push(...tr.push(i * 0.016, f(70), 0.1));
    for (let i = 2; i < 10; i++) ev.push(...tr.push(i * 0.016, 0, 0));
    expect(ev).toEqual([]);
  });
});
