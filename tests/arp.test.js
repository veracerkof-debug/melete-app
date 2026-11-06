// Арпеджиатор пэдов (06.11.2026): лесенка аккорда, рисунки из устойчивых ходов, жизнь и плотность, спутник по ладу
import { describe, it, expect } from 'vitest';
import { ladder, barNotes, normalizeArp, glideNext, scaleOf, MOTIFS } from '../src/audio/arp.js';
import { normalizeDrone } from '../src/audio/drone.js';

const seq = (xs) => { let i = 0; return () => xs[i++ % xs.length]; };

describe('арпеджиатор', () => {
  it('лесенка: ноты аккорда по октавам и верхняя тоника; у квинты — добавлена терция', () => {
    expect(ladder(0, 'maj', 3, 1)).toEqual([48, 52, 55, 60]);
    expect(ladder(9, 'min', 3, 1)).toEqual([57, 60, 64, 69]);
    expect(ladder(0, 'fifth', 3, 1)).toEqual([48, 52, 55, 60]);
  });
  it('рисунок «вверх»: шаги по лесенке; сильная доля — без паузы и громче', () => {
    const a = normalizeArp({ style: 'up', life: 0, density: 1 }), lad = ladder(0, 'maj', 3, 2);
    const { notes } = barNotes(a, lad, 8, null, seq([0.5]));
    expect(notes.slice(0, 4).map((n) => n.m)).toEqual([48, 52, 55, 60]);
    expect(notes[0].rest).toBe(false);
    expect(notes[0].vel).toBeGreaterThan(notes[1].vel);
  });
  it('все ноты — из аккорда или лада; «Жизнь» 0 — рисунок не меняется', () => {
    const a = normalizeArp({ style: 'mix', life: 0 }), lad = ladder(2, 'min', 3, 2), sc = scaleOf(2, 'min');
    const r1 = barNotes(a, lad, 8, 'arc', Math.random, sc);
    expect(r1.name).toBe('arc');
    for (let k = 0; k < 50; k++) {
      const { notes } = barNotes(normalizeArp({ style: 'mix', life: 1 }), lad, 8, null, Math.random, sc);
      notes.forEach((n) => expect(sc).toContain(n.m % 12));
    }
  });
  it('плотность: меньше — больше пауз, первая нота такта звучит всегда', () => {
    const lad = ladder(0, 'maj', 3, 2), rnd = seq([0.9, 0.2, 0.95, 0.4]);
    const { notes } = barNotes(normalizeArp({ style: 'up', life: 0, density: 0.5 }), lad, 8, null, rnd);
    expect(notes[0].rest).toBe(false);
    expect(notes.some((n) => n.rest)).toBe(true);
  });
  it('спутник: ступени той же тональности, шаг небольшой', () => {
    let m = 0;
    for (let k = 0; k < 40; k++) { const n = glideNext(m, 7, 'maj'); expect(scaleOf(7, 'maj')).toContain(n % 12); if (m) expect(Math.abs(n - m)).toBeLessThanOrEqual(7); m = n; }
  });
  it('настройки по умолчанию и переход с тампуры', () => {
    const a = normalizeArp({});
    expect(a).toMatchObject({ on: false, style: 'mix', rate: '1/8', range: 2, sound: 'wkpad', glide: { on: false } });
    const d = normalizeDrone({ sound: 'tanpura', layers: { 3: true }, pc: 2 });
    expect(d.sound).toBe('soft');
    expect(d.arp.on).toBe(true);
    expect(Object.keys(MOTIFS).length).toBeGreaterThanOrEqual(8);
  });
});
