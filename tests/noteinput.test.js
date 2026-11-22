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

import { enterPitch, enterFret, atCursor, pianoKeys, shiftBase, baseAtPc, shiftFret, KB_VIEWS } from '../src/music/noteinput.js';

describe('пианино и окно клавиш', () => {
  it('белые и чёрные в настоящей раскладке, окно с любой ноты', () => {
    const p = part();
    const ks = pianoKeys(p, 60, 8);
    expect(ks.filter((k) => !k.black).map((k) => k.m)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
    expect(ks.filter((k) => k.black).map((k) => k.m)).toEqual([61, 63, 66, 68, 70]);
    expect(ks.find((k) => k.m === 60)).toMatchObject({ x: 0, label: 'C', oct: 4, c: true });
    const g = pianoKeys(p, 67, 8).filter((k) => !k.black).map((k) => k.m);
    expect(g[0]).toBe(67);
    const fs = pianoKeys(p, 66, 8); // с фа-диеза: чёрная клавиша у левого края
    expect(fs.find((k) => k.m === 66)).toMatchObject({ black: true });
    expect(fs.find((k) => k.m === 66).x).toBeLessThanOrEqual(0.01);
  });
  it('названия по тональности: бемоли в фа мажоре, диезы в соль мажоре', () => {
    expect(pianoKeys(part({ key: { pc: 5, minor: false } }), 60).find((k) => k.m === 70).label).toBe('B♭');
    expect(pianoKeys(part({ key: { pc: 7, minor: false } }), 60).find((k) => k.m === 66).label).toBe('F♯');
  });
  it('без чёрных — только белые; сдвиг и начало с ноты', () => {
    expect(pianoKeys(part(), 60, 8, { blacks: false }).every((k) => !k.black)).toBe(true);
    const i = newInput(0, part());
    i.base = 60; expect(shiftBase(i, 12)).toBe(72); expect(shiftBase(i, -100)).toBe(24); expect(shiftBase(i, 500)).toBe(96);
    i.base = 60; expect(baseAtPc(i, 7)).toBe(67); expect(baseAtPc(i, 6)).toBe(66);
  });
  it('виды клавиш и режим из настроек', () => {
    expect(KB_VIEWS).toEqual(['piano', 'deg', 'abc']);
    expect(newInput(0, part()).kb).toBe('piano');
    expect(newInput(0, part(), { kb: 'abc', stack: true })).toMatchObject({ kb: 'abc', stack: true, mode: 'keys' });
    expect(newInput(0, part(), { mode: 'fret' }).mode).toBe('keys'); // без строя грифа нет
    expect(newInput(0, newPart({ inst: 'guitar' }), { mode: 'fret' }).mode).toBe('fret');
  });
});

describe('гриф: ввод струной и ладом', () => {
  const guitar = () => newPart({ inst: 'guitar' });
  it('ладом — высота по строю, струна и лад запоминаются', () => {
    const p = guitar(), i = newInput(0, p, { mode: 'fret' });
    expect(enterFret(p, i, 1, 3)).toBe(67); // G на тонкой E
    expect(enterFret(p, i, 6, 0)).toBe(40);
    expect(p.raw.map((r) => [r.m, r.s, r.f])).toEqual([[67, 1, 3], [40, 6, 0]]);
    expect(i.beat).toBe(2);
  });
  it('капо сдвигает высоту; лады вне 0…24 и струны вне строя — нет', () => {
    const p = guitar(); p.capo = 2; const i = newInput(0, p);
    expect(enterFret(p, i, 6, 0)).toBe(42);
    expect(enterFret(p, i, 7, 0)).toBe(null);
    expect(enterFret(p, i, 1, 99)).toBe(64 + 2 + 24);
  });
  it('аккорд: курсор стоит, разные струны копятся, та же струна заменяется', () => {
    const p = guitar(), i = newInput(0, p); i.stack = true;
    enterFret(p, i, 6, 0); enterFret(p, i, 5, 2); enterFret(p, i, 4, 2);
    expect(i.beat).toBe(0);
    expect(p.raw.length).toBe(3);
    enterFret(p, i, 5, 3); // та же струна — заменяет
    expect(p.raw.length).toBe(3);
    expect(atCursor(p, i).map((x) => [x.s, x.f]).sort()).toEqual([[4, 2], [5, 3], [6, 0]]);
    rest(p, i); expect(i.beat).toBe(1);
  });
  it('аккорд на клавишах: разные высоты копятся; шаг назад убирает последнюю', () => {
    const p = part(), i = newInput(0, p); i.stack = true;
    enterPitch(p, i, 60); enterPitch(p, i, 64); enterPitch(p, i, 67);
    expect(notes(p).map((n) => n[2]).sort()).toEqual([60, 64, 67]);
    expect(back(p, i)).toBe(true);
    expect(p.raw.length).toBe(2);
  });
  it('без аккорда нота на той же доле заменяет прежнюю', () => {
    const p = part(), i = newInput(0, p);
    enterPitch(p, i, 60); moveTo(p, i, 0); enterPitch(p, i, 62);
    expect(notes(p)).toEqual([[0, 1, 62]]);
  });
  it('окно ладов — в пределах грифа', () => {
    const i = newInput(0, guitar());
    expect(shiftFret(i, -3)).toBe(0); expect(shiftFret(i, 3)).toBe(3); expect(shiftFret(i, 99)).toBe(18);
  });
  it('MusicXML с табами содержит струну и лад', () => {
    const p = guitar(), i = newInput(0, p); enterFret(p, i, 2, 5);
    const x = partXML(p, { title: 't' });
    expect(x).toMatch(/<string>2<\/string>/); expect(x).toMatch(/<fret>5<\/fret>/);
  });
});
