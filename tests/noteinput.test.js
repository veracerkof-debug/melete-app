// Ввод нот на стане (music/noteinput.js): буквы, октава по ближайшей, ключ, пауза, лига, шаг назад, сетка, MusicXML
import { describe, it, expect } from 'vitest';
import { newPart, quantize, partXML, barsOf } from '../src/music/livescore.js';
import { newInput, enter, rest, tie, back, accent, octave, stepNote, pitchFor, keyAlter, moveTo, posOf, durBeats } from '../src/music/noteinput.js';

const part = (patch = {}) => newPart({ inst: 'keys', tuning: null, ...patch });
const notes = (p) => quantize(p).map((n) => [n.t, n.d, n.m]);

describe('высота', () => {
  it('октава — ближайшая к прошлой ноте', () => {
    expect(pitchFor('C', { prev: 60 })).toBe(60);
    expect(pitchFor('B', { prev: 60 })).toBe(59);
    expect(pitchFor('G', { prev: 71 })).toBe(67);
    expect(pitchFor('C', { prev: 71 })).toBe(72);
    expect(pitchFor('C', { prev: 60, oct: 1 })).toBe(72);
  });
  it('знаки: по ключу, нажатые, бекар', () => {
    const g = { pc: 7, minor: false };
    expect(keyAlter('F', g)).toBe(1); expect(keyAlter('C', g)).toBe(0);
    expect(pitchFor('F', { prev: 66, key: g })).toBe(66); // фа-диез в соль мажоре
    expect(pitchFor('F', { prev: 66, key: g, acc: 0 })).toBe(65); // бекар
    expect(pitchFor('B', { prev: 70, key: { pc: 5, minor: false } })).toBe(70); // си-бемоль в фа мажоре
    expect(pitchFor('E', { prev: 63, acc: -1 })).toBe(63);
  });
});

describe('ввод', () => {
  it('мелодия буквами ложится на сетку и растёт по тактам', () => {
    const p = part(), inp = newInput();
    ['C', 'D', 'E', 'F', 'G'].forEach((l) => enter(p, inp, l));
    expect(notes(p)).toEqual([[0, 1, 60], [1, 1, 62], [2, 1, 64], [3, 1, 65], [4, 1, 67]]);
    expect(inp.beat).toBe(5);
    expect(barsOf(p)).toBe(2);
  });
  it('длительность, точка, сетка шестнадцатых', () => {
    const p = part(), inp = newInput();
    inp.dur = 0.5; inp.dot = true; expect(durBeats(inp)).toBe(0.75);
    enter(p, inp, 'C'); inp.dot = false; inp.dur = 0.25; enter(p, inp, 'D');
    expect(notes(p)).toEqual([[0, 0.75, 60], [0.75, 0.25, 62]]);
    expect(p.grid).toBe('16');
  });
  it('в конце последнего такта появляется новый', () => {
    const p = part(), inp = newInput(); p.minBars = 1;
    for (let i = 0; i < 4; i++) enter(p, inp, 'C');
    expect(barsOf(p)).toBeGreaterThanOrEqual(2);
  });
  it('пауза двигает курсор, лига удлиняет ноту, шаг назад убирает', () => {
    const p = part(), inp = newInput();
    enter(p, inp, 'C'); rest(p, inp); enter(p, inp, 'E');
    expect(notes(p)).toEqual([[0, 1, 60], [2, 1, 64]]);
    const r0 = part(), i0 = newInput(); enter(r0, i0, 'C'); rest(r0, i0); i0.dur = 2; expect(tie(r0, i0)).toBe(false); // на курсоре нота не оканчивается — как пауза
    expect(i0.beat).toBe(4);
    const q = part(), i2 = newInput(); enter(q, i2, 'C'); i2.dur = 2; expect(tie(q, i2)).toBe(true);
    expect(notes(q)).toEqual([[0, 3, 60]]);
    const r = part(), i3 = newInput(); enter(r, i3, 'C'); enter(r, i3, 'D');
    expect(back(r, i3)).toBe(true); expect(notes(r)).toEqual([[0, 1, 60]]); expect(i3.beat).toBe(1);
    expect(back(r, i3)).toBe(true); expect(i3.beat).toBe(0);
    expect(back(r, i3)).toBe(false); expect(i3.beat).toBe(0);
  });
  it('новая нота встаёт на место прежней', () => {
    const p = part(), inp = newInput(); enter(p, inp, 'C'); moveTo(p, inp, 0); enter(p, inp, 'E');
    expect(notes(p)).toEqual([[0, 1, 64]]);
  });
  it('знак и октава действуют на одну ноту; шаг по тональности', () => {
    const p = part({ key: { pc: 0, minor: false } }), inp = newInput();
    accent(inp, 1); enter(p, inp, 'F'); expect(inp.acc).toBe(null);
    expect(notes(p)[0][2]).toBe(66);
    accent(inp, 1); accent(inp, 1); expect(inp.acc).toBe(0); accent(inp, 1); expect(inp.acc).toBe(null);
    octave(inp, 1); enter(p, inp, 'C'); expect(inp.oct).toBe(0);
    expect(stepNote(p, inp, 1)).toBe(notes(p)[1][2]); // до → ре
    expect(notes(p)[1][2] % 12).toBe(2);
    expect(posOf(p, inp)).toEqual({ bar: 1, beat: 3 });
  });
  it('MusicXML читается как обычная партия: ноты и размер', () => {
    const p = part(), inp = newInput();
    ['C', 'E', 'G'].forEach((l) => enter(p, inp, l)); inp.dur = 0.5; enter(p, inp, 'A'); enter(p, inp, 'B');
    const x = partXML(p, { title: 't' });
    expect((x.match(/<pitch>/g) || []).length).toBe(5);
    expect(x).toContain('<measure number="2">');
  });
});

describe('полоса клавиш тональности', () => {
  it('восемь ступеней от тоники; в соль мажоре — фа-диез, в ре миноре — си-бемоль', async () => {
    const { scaleKeys, startBase, enterPitch } = await import('../src/music/noteinput.js');
    const g = part({ key: { pc: 7, minor: false } }), k = scaleKeys(g, 55);
    expect(k.map((x) => x.m)).toEqual([55, 57, 59, 60, 62, 64, 66, 67]);
    expect(k.map((x) => x.label)).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F♯', 'G']);
    expect(k[0].tonic && k[7].tonic).toBe(true);
    const d = part({ key: { pc: 2, minor: true } });
    expect(scaleKeys(d, 62).map((x) => x.label)).toEqual(['D', 'E', 'F', 'G', 'A', 'B♭', 'C', 'D']);
    expect(startBase(g, 64)).toBe(55); // ми4 попадает в окно от соль3
    const inp = newInput(0, g); inp.dur = 1; inp.acc = 1; enterPitch(g, inp, 60);
    expect(notes(g)).toEqual([[0, 1, 61]]); expect(inp.acc).toBe(null);
  });
});
