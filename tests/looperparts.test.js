// Лупер, вид «Партии»: кусок записи в петлю, умолчания партий, длина доли проекта
import { describe, it, expect } from 'vitest';
import { layOut, starter } from '../src/modules/looper/parts.js';
import { newData, secPerBeat, drumNotes, expandChords, newTrack } from '../src/music/project.js';

describe('кусок записи в петле', () => {
  it('повтор: кусок идёт по всей петле, края мягкие', () => {
    const out = layOut(new Float32Array(100).fill(1), 450, { repeat: true, sr: 48000 });
    expect(out.length).toBe(450);
    expect(out[50]).toBe(1); expect(out[150]).toBe(1); expect(out[430]).toBe(1);
    expect(out[0]).toBe(0); // начало куска — с нуля
  });
  it('один раз: дальше тишина', () => {
    const out = layOut(new Float32Array(100).fill(1), 450, { repeat: false, sr: 48000 });
    expect(out[50]).toBe(1); expect(out[150]).toBe(0);
  });
});

describe('умолчания партий', () => {
  it('ударные: бочка на 1 и 3, малый на 2 и 4, хэт восьмыми', () => {
    const d = starter('drums', newData('drums', 1), 4);
    expect(d.steps.kick).toEqual([0, 8]); expect(d.steps.snare).toEqual([4, 12]); expect(d.steps.hat.length).toBe(8);
    expect(drumNotes(d).length).toBe(12);
  });
  it('аккорды: I–V–vi–IV по такту', () => {
    const d = starter('chords', newData('chords', 4), 4, { pc: 0, minor: false });
    expect(d.chords.map((c) => c.pc)).toEqual([0, 7, 9, 5]);
    expect(expandChords(d, newTrack('chords'), { num: 4 }).length).toBeGreaterThan(0);
  });
});

it('доля проекта — точная длина петли (spb), иначе по темпу', () => {
  expect(secPerBeat({ bpm: 90 })).toBeCloseTo(60 / 90);
  expect(secPerBeat({ bpm: 90, spb: 0.6543 })).toBe(0.6543);
});
