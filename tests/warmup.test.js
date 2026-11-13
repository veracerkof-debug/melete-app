// Распевки по диапазону (src/music/warmup.js), голос и тип голоса (src/music/voicetype.js), библиотека
// (src/modules/vocal/exercises.js) — DECISIONS 2026-11-13 «Вокал».
import { describe, it, expect } from 'vitest';
import { degOff, parseMotif, tonics, buildRun, chordFor, syllable, spellNote } from '../src/music/warmup.js';
import { voiceType, createNoteTracker, rangeOf, scoreNote, improvSummary, typeComfort } from '../src/music/voicetype.js';
import { EXERCISES, PROGRAMS, GROUPS, exById } from '../src/modules/vocal/exercises.js';

describe('мотив', () => {
  it('ступени мажора, альтерации, октава ниже', () => {
    expect(['1', '3', '5', '8', '10', 'b3', '#4', '_5', '9'].map(degOff)).toEqual([0, 4, 7, 12, 16, 3, 6, -5, 14]);
    expect(degOff('x')).toBe(null);
  });
  it('длительности, паузы и скольжение', () => {
    const m = parseMotif('1:.5 r:.5 1~8:2 5');
    expect(m.len).toBe(4);
    expect(m.notes.map((n) => [n.t, n.d, n.o ?? 'r', n.o2 ?? '-'])).toEqual([[0, 0.5, 0, '-'], [0.5, 0.5, 'r', '-'], [1, 2, 0, 12], [3, 1, 7, '-']]);
    expect([m.lo, m.hi]).toEqual([0, 12]);
  });
});

describe('шаги по диапазону', () => {
  const five = parseMotif('1 2 3 4 5 4 3 2 1:2'); // охват 0…7
  it('от нижней удобной до верхней и обратно, верх не повторяется', () => {
    expect(tonics(five, { lo: 57, hi: 67 })).toEqual([57, 58, 59, 60, 59, 58, 57]);
  });
  it('«сверх» расширяет на полутоны с двух сторон; только вверх; сверху вниз; шаг по тону', () => {
    expect(tonics(five, { lo: 57, hi: 67 }, { extra: 1, dir: 'up' })).toEqual([56, 57, 58, 59, 60, 61]);
    expect(tonics(five, { lo: 57, hi: 67 }, { dir: 'down' })).toEqual([60, 59, 58, 57]);
    expect(tonics(five, { lo: 57, hi: 67 }, { step: 2, dir: 'up' })).toEqual([57, 59]);
  });
  it('мотив шире диапазона — один шаг посередине', () => {
    expect(tonics(parseMotif('1 8 1'), { lo: 60, hi: 64 })).toEqual([56]);
  });
  it('прогон: аккорд перед шагом, ноты по времени, длинный прогон — по тону', () => {
    const ex = { p: '1 3 5 3 1:2', lead: 1, rest: 1 };
    const run = buildRun(ex, { lo: 48, hi: 60 }, { dir: 'up' });
    expect(run.steps[0].lead).toEqual({ t: 0, d: 1, ms: [36, 48, 52, 55] });
    expect(run.steps[0].sing.map((n) => [n.t, n.m])).toEqual([[1, 48], [2, 52], [3, 55], [4, 52], [5, 48]]);
    expect(run.steps[1].t0).toBe(8);
    expect(run.steps.at(-1).tonic).toBe(53);
    const long = buildRun(ex, { lo: 48, hi: 72 }, { maxBeats: 60 });
    expect(long.step).toBe(2);
  });
  it('аккорд в удобной октаве пианино, минор', () => {
    expect(chordFor(74)).toEqual([38, 50, 54, 57]);
    expect(chordFor(45, true)).toEqual([45, 57, 60, 64]);
  });
  it('запись нотами: буквы от тоники, знаки по высоте', () => {
    expect(spellNote(61, 2, 65)).toEqual({ l: 3, a: 0 }); // D♭: третья ступень — F
    expect(spellNote(66, 3, 71)).toEqual({ l: 6, a: 0 }); // F♯: четвёртая — B
    expect(spellNote(60, 2, 63)).toEqual({ l: 2, a: -1 }); // до минор: E♭
    expect(spellNote(66, 6, 77)).toEqual({ l: 2, a: 1 }); // F♯: седьмая — E♯
  });
});

describe('библиотека', () => {
  it('каждое упражнение разбирается, слоги по языкам, группы известны', () => {
    EXERCISES.forEach((ex) => {
      expect(GROUPS).toContain(ex.g);
      if (ex.free) { expect(ex.free.length).toBeGreaterThan(0); return; }
      const m = parseMotif(ex.p);
      expect(m.notes.length, ex.id).toBeGreaterThan(0);
      expect(m.notes.every((n) => n.rest || n.o != null), ex.id).toBe(true);
      expect(syllable(ex, 0, 'ru'), ex.id).toBeTruthy();
      expect(syllable(ex, 0, 'en'), ex.id).toBeTruthy();
      expect(syllable(ex, 0, 'uz'), ex.id).toBe(syllable(ex, 0, 'en'));
      const r = buildRun(ex, { lo: 48, hi: 67 });
      expect(r.steps.length, ex.id).toBeGreaterThan(0);
    });
  });
  it('программы — только из существующих упражнений, id уникальны', () => {
    Object.values(PROGRAMS).flat().forEach((id) => expect(exById(id), id).toBeTruthy());
    expect(new Set(EXERCISES.map((x) => x.id)).size).toBe(EXERCISES.length);
  });
  it('слоги по нотам: «ми-мэ-ма-мо-му»', () => {
    const ex = exById('mimema');
    expect([0, 1, 2, 3, 4].map((k) => syllable(ex, k, 'ru')).join('-')).toBe('ми-мэ-ма-мо-му');
  });
});

describe('голос', () => {
  it('тип голоса по удобному диапазону', () => {
    expect(voiceType(45, 64).id).toBe('bari');
    expect(voiceType(48, 69).id).toBe('tenor');
    expect(voiceType(62, 81).id).toBe('sop');
    expect(voiceType(41, 60).id).toBe('bass');
    expect(voiceType(55, 75).id).toBe('alto');
    expect(voiceType(45, 64).list.length).toBe(6);
  });
  it('без проверки — удобная часть ориентира типа', () => {
    expect(typeComfort('tenor')).toEqual({ lo: 51, hi: 69 });
  });
  it('спетые ноты: ровная — нота, дрожь и короткие — нет', () => {
    const tr = createNoteTracker({ minDur: 0.15 });
    const out = [];
    for (let i = 0; i <= 10; i++) { const n = tr.push(i * 0.05, 60 + (i % 2) * 0.1); if (n) out.push(n); }
    for (let i = 11; i <= 13; i++) { const n = tr.push(i * 0.05, 64); if (n) out.push(n); } // 0,1 с — коротко
    const last = tr.push(0.7, 67); if (last) out.push(last);
    expect(out.length).toBe(1);
    expect(Math.round(out[0].m)).toBe(60);
    expect(out[0].dur).toBeCloseTo(0.5, 5);
  });
  it('тишина закрывает ноту после паузы', () => {
    const tr = createNoteTracker();
    tr.push(0, 62); tr.push(0.1, 62); tr.push(0.2, 62);
    expect(tr.push(0.25, 0)).toBe(null);
    expect(Math.round(tr.push(0.4, 0).m)).toBe(62);
  });
  it('диапазон: удобный — удержанные секунду, крайние — коротко', () => {
    const r = rangeOf([{ m: 45, dur: 1.2 }, { m: 43, dur: 0.3 }, { m: 64, dur: 1.5 }, { m: 67.2, dur: 0.4 }, { m: 70, dur: 0.1 }]);
    expect(r).toEqual({ lo: 45, hi: 64, xlo: 43, xhi: 67 });
    expect(rangeOf([])).toBe(null);
  });
  it('нота против лада: в ладу, точно, мимо', () => {
    const maj = [0, 2, 4, 5, 7, 9, 11];
    expect(scoreNote(64.1, 60, maj)).toMatchObject({ n: 64, deg: 4, inScale: true, exact: true });
    expect(scoreNote(64.4, 60, maj)).toMatchObject({ inScale: true, exact: false, cents: 40 });
    expect(scoreNote(63, 60, maj)).toMatchObject({ inScale: false, exact: false });
    const s = improvSummary([{ ...scoreNote(64, 60, maj), dur: 1 }, { ...scoreNote(63, 60, maj), dur: 1 }]);
    expect([s.inScale, s.exact, s.degs[4]]).toEqual([0.5, 0.5, 1]);
  });
});
