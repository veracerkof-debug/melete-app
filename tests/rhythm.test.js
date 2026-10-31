// Тренажёр ритма: ячейки, генерация, моменты ударов, нотная запись, сверка ударов, диктант, статистика, хлопки.
import { describe, it, expect } from 'vitest';
import {
  CELLS, LEVELS, METERS, parseMeter, poolOf, fits, genRhythm, onsets, rhythmBeats, notation, sameRhythm, dictPush, dictFull,
  matchTaps, drift, polyBeats, echoDelay, normalizeData, recordRun, weekOf, weakSpots, normalizeConf,
} from '../src/music/rhythm.js';
import { createOnsetDetector } from '../src/audio/claps.js';
import { scoreSVG, durOf } from '../src/modules/theory/book/score.js';

const seq = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

describe('ячейки', () => {
  it('нотная запись совпадает с ударами и длиной', () => {
    for (const c of Object.values(CELLS)) {
      const notes = c.notes.filter((n) => !n.rest).length;
      expect(notes, c.id).toBe(c.hits.filter(Boolean).length);
      expect(c.hits.length, c.id).toBe(c.beats * c.sub);
      // длина нот в четвертях: простой размер — доли, сложный — доля = три восьмые
      const len = c.notes.reduce((s, n) => s + durOf(n), 0);
      expect(len, c.id).toBeCloseTo(c.compound ? c.beats * 1.5 : c.beats, 5);
    }
  });
  it('размеры', () => {
    expect(parseMeter('6/8')).toMatchObject({ compound: true, beats: 2 });
    expect(parseMeter('3/4')).toMatchObject({ compound: false, beats: 3 });
    expect(parseMeter('12/8').beats).toBe(4);
  });
  it('длинные ноты — только с сильных долей', () => {
    expect(fits(CELLS.w, 0, 4)).toBe(true);
    expect(fits(CELLS.w, 1, 4)).toBe(false);
    expect(fits(CELLS.h, 1, 4)).toBe(false);
    expect(fits(CELLS.h, 1, 3)).toBe(true);
    expect(fits(CELLS.hd, 0, 3)).toBe(true);
    expect(fits(CELLS.dqe, 3, 4)).toBe(false);
  });
  it('набор уровня растёт; свой набор заменяет уровень', () => {
    const n = LEVELS.map((l) => poolOf('4/4', l).length);
    n.slice(1).forEach((x, i) => expect(x).toBeGreaterThan(n[i]));
    expect(poolOf('4/4', 6, ['ee', 'r']).map((c) => c.id).sort()).toEqual(['ee', 'r']);
    // без единой доли с ударом — добавляется четверть
    expect(poolOf('4/4', 1, ['r', 'h']).some((c) => c.id === 'q')).toBe(true);
    expect(poolOf('6/8', 2).every((c) => c.compound)).toBe(true);
  });
});

describe('генерация', () => {
  it('такты полные, в каждом есть удар, во всех размерах и уровнях', () => {
    const rnd = seq(7);
    for (const meter of METERS) for (const level of LEVELS) for (let i = 0; i < 20; i++) {
      const r = genRhythm({ meter, bars: 2, level, rnd });
      const M = parseMeter(meter);
      expect(r.bars.length).toBe(2);
      r.bars.forEach((bar) => {
        expect(bar.reduce((s, id) => s + CELLS[id].beats, 0)).toBe(M.beats);
        expect(bar.some((id) => !CELLS[id].rest)).toBe(true);
        bar.forEach((id) => expect(CELLS[id].compound).toBe(M.compound));
      });
    }
  });
  it('новое уровня встречается в ритме', () => {
    const rnd = seq(11);
    for (let i = 0; i < 30; i++) {
      const r = genRhythm({ meter: '4/4', bars: 2, level: 4, rnd });
      expect(r.bars.flat().some((id) => CELLS[id].lv === 4)).toBe(true);
    }
  });
  it('удары и доли', () => {
    const r = { meter: '4/4', bars: [['q', 'ee', 'h']] };
    expect(onsets(r).map((o) => o.b)).toEqual([0, 1, 1.5, 2]);
    expect(onsets(r, { swing: true }).map((o) => +o.b.toFixed(3))).toEqual([0, 1, 1.667, 2]);
    expect(onsets(r).map((o) => o.beat)).toEqual([0, 1, 1, 2]);
    expect(rhythmBeats(r)).toBe(4);
    const r2 = { meter: '4/4', bars: [['q', 'q', 'q', 'q'], ['ssss', 'r', 'h']] };
    expect(onsets(r2).map((o) => o.b)).toEqual([0, 1, 2, 3, 4, 4.25, 4.5, 4.75, 6]);
  });
  it('нотная запись: такты, ребра, отметки ударов', () => {
    const r = { meter: '4/4', bars: [['q', 'ee', 'r', 'q'], ['w']] };
    const it = notation(r, ['ok', 'near', 'off', 'miss', 'ok']);
    expect(it.filter((x) => x.bar).map((x) => x.bar)).toEqual(['|', '|.']);
    expect(it.filter((x) => !x.bar && !x.rest).map((x) => x.c)).toEqual(['ok', 'near', 'off', 'miss', 'ok']);
    const eighths = it.filter((x) => x.d === 'e');
    expect(eighths[0].bm).toBe(eighths[1].bm);
    expect(scoreSVG(it, { clef: 'perc', time: [4, 4] })).toContain('<svg');
  });
  it('одинаковое на слух', () => {
    expect(sameRhythm({ meter: '4/4', bars: [['h', 'q', 'q']] }, { meter: '4/4', bars: [['q', 'r', 'q', 'q']] })).toBe(true);
    expect(sameRhythm({ meter: '4/4', bars: [['ee', 'q', 'h']] }, { meter: '4/4', bars: [['q', 'q', 'h']] })).toBe(false);
  });
});

describe('диктант', () => {
  it('ячейки по тактам, лишнее не влезает', () => {
    let b = [];
    b = dictPush(b, '3/4', 'q', 2); b = dictPush(b, '3/4', 'h', 2);
    expect(b).toEqual([['q', 'h']]);
    expect(dictPush(b, '3/4', 'w', 2)).toBeNull();
    b = dictPush(b, '3/4', 'hd', 2);
    expect(dictFull(b, '3/4', 2)).toBe(true);
    expect(dictPush(b, '3/4', 'q', 2)).toBeNull();
  });
});

describe('сверка ударов', () => {
  const exp = [1, 1.5, 2, 3];
  it('точно, рядом, мимо, пропуск, лишний', () => {
    const r = matchTaps(exp, [1.01, 1.56, 2.2, 2.6], 0.035);
    expect(r.hits.map((h) => h.g)).toEqual(['ok', 'near', 'off', 'miss']);
    expect(r.hits[0].err).toBe(10);
    expect(r.extra).toEqual([2.6]);
    expect(r.pass).toBe(false);
  });
  it('сдано: всё в двойном допуске, без пропусков и лишних', () => {
    const r = matchTaps(exp, [0.99, 1.52, 2.05, 3.0], 0.035);
    expect(r.pass).toBe(true);
    expect(r.mean).toBe(Math.round((-10 + 20 + 50 + 0) / 4));
    expect(r.hits[2].g).toBe('near');
  });
  it('удар достаётся ближайшему ожидаемому', () => {
    const r = matchTaps([1, 1.25], [1.2], 0.035);
    expect(r.hits[0].g).toBe('miss');
    expect(r.hits[1].err).toBe(-50);
  });
  it('ход темпа', () => {
    expect(drift([0, -5, -10, -15, -20])).toBeCloseTo(-5, 5);
    expect(drift([null, 2, 4, 6])).toBeCloseTo(2, 5);
    expect(drift([1, 2])).toBe(0);
  });
  it('полиритм', () => {
    expect(polyBeats('3:2')).toEqual({ a: 3, b: 2, at: [0, 2 / 3, 4 / 3] });
  });
  it('задержка по эху щелчков', () => {
    expect(echoDelay([1, 1.5, 2, 2.5], [1.12, 1.62, 2.121, 2.4])).toBeCloseTo(0.12, 3);
    expect(echoDelay([1, 1.5], [1.12])).toBeNull();
    expect(echoDelay([1, 1.5, 2], [1.05, 1.3, 2.2])).toBeNull();
  });
});

describe('статистика и настройки', () => {
  it('неделя и слабые места', () => {
    const d = normalizeData({});
    const bad = matchTaps([0, 0.5, 1, 1.5], [0.08, 0.58, 1.08, 1.58], 0.035);
    for (let i = 0; i < 5; i++) recordRun(d, { drill: 'read', res: bad, cells: ['ee', 'ee', 'q', 'q'], beats: [0, 0, 1, 2], day: '2026-10-31' });
    const w = weekOf(d, ['2026-10-31', '2026-10-30']);
    expect(w.n).toBe(5);
    expect(w.abs).toBe(80);
    const ws = weakSpots(d);
    expect(ws.cells.map((x) => x.id).sort()).toEqual(['ee', 'q']);
    expect(ws.beats[0]).toEqual({ beat: 0, ms: 80 });
    expect(d.drills.read).toEqual({ c: 0, t: 5 });
  });
  it('умолчания и починка', () => {
    const e = normalizeConf({ bpm: 999, meter: '7/9', level: -3, strict: 'x' });
    expect(e).toMatchObject({ bpm: 200, meter: '4/4', level: 1, strict: 'mid', bars: 2, drill: 'home' });
    expect(normalizeConf({})).toMatchObject({ level: 2, bpm: 80, click: true });
  });
});

describe('хлопки', () => {
  it('всплеск над шумом — удар в нужное время, повтор не раньше 90 мс', () => {
    const sr = 48000, det = createOnsetDetector(), buf = new Float32Array(sr);
    const rnd = seq(3);
    for (let i = 0; i < buf.length; i++) buf[i] = (rnd() - 0.5) * 0.004;
    const clap = (at) => { const i0 = Math.round(at * sr); for (let i = 0; i < 2400; i++) buf[i0 + i] += 0.6 * Math.exp(-i / 300) * (i % 2 ? 1 : -1); };
    clap(0.25); clap(0.27); clap(0.6);
    const out = [];
    // кусками по 480 отсчётов, как приходят из анализатора (окно 4096)
    for (let end = 4096; end <= buf.length; end += 480) out.push(...det.push(buf.subarray(end - 4096, end), end / sr, sr));
    expect(out.length).toBe(2);
    expect(Math.abs(out[0].t - 0.25)).toBeLessThan(0.003);
    expect(Math.abs(out[1].t - 0.6)).toBeLessThan(0.003);
    // порог выше эха: тихий всплеск не слышен
    const d2 = createOnsetDetector();
    d2.floor(0.8);
    const o2 = [];
    for (let end = 4096; end <= buf.length; end += 480) o2.push(...d2.push(buf.subarray(end - 4096, end), end / sr, sr));
    expect(o2.length).toBe(0);
  });
});
