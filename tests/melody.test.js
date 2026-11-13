// Мелодия для «Петь» (src/music/melody.js) и прогресс вокала по дням (src/music/vocalprog.js) — DECISIONS 2026-11-14.
import { describe, it, expect } from 'vitest';
import { trackPitch, cleanLine, melodyNotes, phrasesOf, scoreTake, HOP, MEL_SR, packLine, unpackLine } from '../src/music/melody.js';
import { addToDay, purity, drift, weekSummary, suggestExpand, dayOf } from '../src/music/vocalprog.js';

// «Голос»: ноты (MIDI) по dur секунд с паузой gap, тон с гармониками
function voice(notes, { dur = 0.5, gap = 0.1, sr = MEL_SR } = {}) {
  const out = [];
  notes.forEach((m) => {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    for (let k = 0; k < dur * sr; k++) { const t = k / sr, ph = 2 * Math.PI * f * t; out.push(0.4 * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph))); }
    for (let k = 0; k < gap * sr; k++) out.push(0);
  });
  return Float32Array.from(out);
}

describe('мелодия из вокала', () => {
  it('линия высоты: ноты гаммы с точностью до четверти тона, паузы — тишина', () => {
    const p = trackPitch(voice([48, 55, 60, 64, 69]), MEL_SR);
    const notes = melodyNotes(p);
    expect(notes.map((n) => n.m)).toEqual([48, 55, 60, 64, 69]);
    notes.forEach((n) => expect(n.d).toBeGreaterThan(0.35));
    expect(p.some((v) => v === 0)).toBe(true);
  });
  it('сглаживание: одиночный октавный скачок — к соседям, короткий обрывок — тишина', () => {
    const p = Int16Array.from([600, 600, 720, 600, 600, 0, 0, 650, 0, 0]);
    const q = cleanLine(p, 3);
    expect(Array.from(q.slice(0, 5))).toEqual([600, 600, 600, 600, 600]);
    expect(q[7]).toBe(0);
  });
  it('фразы по паузам', () => {
    expect(phrasesOf([{ t: 0, d: 1, m: 60 }, { t: 1.2, d: 1, m: 62 }, { t: 3.5, d: 1, m: 64 }])).toEqual([{ t0: 0, t1: 2.2 }, { t0: 3.5, t1: 4.5 }]);
  });
  it('хранение в записи — числа туда и обратно', () => {
    expect(Array.from(unpackLine(packLine(Int16Array.from([0, 600, 612]))))).toEqual([0, 600, 612]);
  });
});

describe('оценка дубля', () => {
  const ref = new Int16Array(Math.round(4 / HOP)); // 4 с: две фразы по 1,5 с — C4 и E4
  for (let f = 0; f < ref.length; f++) { const t = f * HOP; if (t < 1.5) ref[f] = 600; else if (t > 2.2 && t < 3.7) ref[f] = 640; }
  const phrases = phrasesOf(melodyNotes(ref));
  const sing = (fn) => { const s = []; for (let t = 0; t < 4; t += 0.05) { const m = fn(t); if (m) s.push({ t, m }); } return s; };
  it('точно — около 100; октавой ниже — тоже точно', () => {
    expect(scoreTake(ref, HOP, sing((t) => (t < 1.5 ? 60 : t > 2.2 && t < 3.7 ? 64 : 0)), { phrases }).score).toBeGreaterThanOrEqual(95);
    expect(scoreTake(ref, HOP, sing((t) => (t < 1.5 ? 48 : t > 2.2 && t < 3.7 ? 52 : 0)), { phrases }).score).toBeGreaterThanOrEqual(95);
  });
  it('вторая фраза мимо — счёт около половины, разбор по фразам, уход в центах', () => {
    const r = scoreTake(ref, HOP, sing((t) => (t < 1.5 ? 60.2 : t > 2.2 && t < 3.7 ? 67 : 0)), { phrases });
    expect(r.score).toBeGreaterThan(40); expect(r.score).toBeLessThan(60);
    expect(r.phr.map((p) => p.r)).toEqual(['ok', 'miss']);
    expect(r.cents).toBe(20);
    expect(r.hi).toBe(60);
  });
  it('молчание — 0; сдвиг тональности сдвигает мелодию', () => {
    expect(scoreTake(ref, HOP, [], { phrases }).score).toBe(0);
    expect(scoreTake(ref, HOP, sing((t) => (t < 1.5 ? 62 : t > 2.2 && t < 3.7 ? 66 : 0)), { semi: 2, phrases }).score).toBeGreaterThanOrEqual(95);
  });
  it('отрезок: оценивается только спетая часть', () => {
    const r = scoreTake(ref, HOP, sing((t) => (t < 1.5 ? 60 : 0)), { phrases, from: 0, to: 1.6 });
    expect(r.score).toBeGreaterThanOrEqual(95); expect(r.phr.length).toBe(1);
  });
});

describe('прогресс по дням', () => {
  const t0 = new Date(2026, 10, 9, 19).getTime(), DAY = 86400000; // понедельник
  it('день складывается: время, чистота, края, дубли', () => {
    const data = {};
    addToDay(data, { sec: 60, n: 10, ok: 8, near: 1, cs: -100, cn: 9, hi: 64, lo: 48, take: { k: 'ex', id: 'ma5', s: 85 } }, t0);
    addToDay(data, { sec: 30, n: 10, ok: 5, near: 2, hi: 66, lo: 50, up: 66, take: { k: 'song', id: 'r1', s: 70 } }, t0 + 3600000);
    expect(data.log.length).toBe(1);
    const r = data.log[0];
    expect([r.d, r.sec, r.n, r.hi, r.lo, r.up, r.takes.length]).toEqual([dayOf(t0), 90, 20, 66, 48, 66, 2]);
    expect(purity(r)).toBeCloseTo(0.725, 5); // (13 + 3 × 0,5) / 20
    expect(drift(r)).toBe(-11);
  });
  it('итог недели — с понедельника', () => {
    const data = {};
    addToDay(data, { sec: 600, n: 10, ok: 10, hi: 62 }, t0 - DAY); // прошлое воскресенье — не в неделе
    addToDay(data, { sec: 300, n: 10, ok: 8, hi: 64, lo: 50 }, t0);
    addToDay(data, { sec: 300, n: 10, ok: 6, hi: 66, lo: 52 }, t0 + 2 * DAY);
    const w = weekSummary(data.log, t0 + 2 * DAY);
    expect([w.days, w.min, w.hi, w.lo]).toEqual([2, 10, 66, 50]);
    expect(w.purity).toBeCloseTo(0.7, 5);
  });
  it('расширить рабочий: три дня чисто выше верха — самый осторожный край, не дальше физического; отклонённый — не снова', () => {
    const data = {}, range = { lo: 50, hi: 64, plo: 45, phi: 69 };
    [66, 67, 66].forEach((up, i) => addToDay(data, { n: 5, ok: 5, up }, t0 + i * DAY));
    expect(suggestExpand(data.log, range, { now: t0 + 2 * DAY })).toEqual({ edge: 'hi', m: 66 });
    expect(suggestExpand(data.log, range, { now: t0 + 2 * DAY, skip: { hi: 66 } })).toBe(null);
    expect(suggestExpand(data.log, { ...range, phi: 65 }, { now: t0 + 2 * DAY })).toEqual({ edge: 'hi', m: 65 });
    const two = { log: data.log.slice(0, 2) };
    expect(suggestExpand(two.log, range, { now: t0 + 2 * DAY })).toBe(null);
  });
});
