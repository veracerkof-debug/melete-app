// Арпеджиатор пэдов (06.11.2026): лесенка аккорда, рисунки из устойчивых ходов, жизнь и плотность, спутник по ладу
import { describe, it, expect } from 'vitest';
import { ladder, barNotes, normalizeArp, glideNext, scaleOf, MOTIFS, keyFor, keyScale, nearRoot, lvlDb, LVL0, noteAt } from '../src/audio/arp.js';
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
  it('тональность: ii в до мажоре — лад до мажора (си, не си-бемоль); прежняя держится; круг квинт задаёт явно', () => {
    expect(keyFor(2, 'min')).toBe(5); // ре минор сам по себе: ни I, ни IV, ни V — vi в фа мажоре
    expect(keyFor(2, 'min', 0)).toBe(0); // круг квинт: до мажор
    expect(keyFor(2, 'min', null, 0)).toBe(0); // прежняя тональность — до мажор, ре минор в ней свой
    expect(keyScale(2, 'min', 0)).toContain(11);
    expect(keyScale(2, 'min', 0)).not.toContain(10);
    expect(keyFor(7, 'maj', null, 0)).toBe(0); // соль мажор после до — V в до мажоре
  });
  it('голосоведение: новый аккорд — ближайшая нижняя нота, без скачка на септиму', () => {
    expect(nearRoot(11, 60, 60)).toBe(59); // до → си: на полутон вниз
    expect(nearRoot(5, 60, 60)).toBe(65); // до → фа: вверх на кварту (ближе, чем вниз на квинту)
    expect(nearRoot(7, 60, 60)).toBe(55); // до → соль: вниз на кварту
  });
  it('проходящая нота — по ладу тональности', () => {
    const lad = ladder(2, 'min', 3, 2), sc = keyScale(2, 'min', 0);
    expect(noteAt(lad, 2, sc) % 12).toBe(11); // над ля — си (до мажор), а не си-бемоль
  });
  it('громкость: по умолчанию — прежний фон, вправо до +12 дБ; прежняя тихая — остаётся тише', () => {
    const a = normalizeArp({});
    expect(a.lvl).toBe(LVL0); expect(lvlDb(a.lvl)).toBe(0); expect(lvlDb(1)).toBe(12);
    expect(lvlDb(normalizeArp({ vol: 0.35 }).lvl)).toBeCloseTo(-6, 0);
    expect(a.glide.lvl).toBe(LVL0);
  });
});
