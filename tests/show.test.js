// Пульт выступления: данные, шкала громкости, метки и таймер (src/music/show.js)
import { describe, it, expect } from 'vitest';
import { faderDb, faderGain, gainFader, dbText, normalizePad, normalizeBank, resizeBank, normalizeNumber, normalizeEvent, normalizeShow, cueNow, addCue, newNumber, eventTimer, clock, parseTime, parseHhmm, hhmm, padById, bankOf, dockOf, newPad, currentNumber, nextNumber, newEvent, tonicFor, fifthNotes } from '../src/music/show.js';

describe('шкала громкости 0…100', () => {
  it('100 — без ослабления, 50 — −12 дБ, ниже 1 — тишина', () => {
    expect(faderDb(100)).toBe(0);
    expect(faderDb(50)).toBeCloseTo(-12.04, 1);
    expect(faderGain(0)).toBe(0);
    expect(faderGain(0.5)).toBe(0);
    expect(faderGain(100)).toBe(1);
    expect(dbText(0)).toBe('−∞');
    expect(dbText(100)).toBe('0');
  });
  it('возрастает без скачков и обратима', () => {
    let prev = -1;
    for (let v = 1; v <= 100; v++) { const g = faderGain(v); expect(g).toBeGreaterThan(prev); prev = g; expect(gainFader(g)).toBe(v); }
  });
});

describe('пэды и банки', () => {
  it('пэд: умолчания и защита от мусора', () => {
    const p = normalizePad({ mode: 'x', level: 999, fadeIn: -3, group: 77, color: 'nope', from: 5, to: 2, name: 'я'.repeat(99) });
    expect(p.mode).toBe('shot'); expect(p.level).toBe(100); expect(p.fadeIn).toBe(0); expect(p.group).toBe(9);
    expect(p.color).toBe('pink'); expect(p.to).toBe(0); expect(p.name.length).toBe(40); expect(p.file).toBeNull();
  });
  it('банк: размер сетки и число ячеек всегда совпадают', () => {
    const b = normalizeBank({ cols: 99, rows: 0, pads: [{ name: 'а' }] });
    expect(b.cols).toBe(5); expect(b.rows).toBe(1); expect(b.pads.length).toBe(5); expect(b.pads[0].name).toBe('а'); expect(b.pads[1]).toBeNull();
  });
  it('уменьшение сетки не теряет звуки: они ждут в запасе', () => {
    let b = normalizeBank({ cols: 3, rows: 2, pads: [1, 2, 3, 4, 5, 6].map((n) => ({ name: 'п' + n })) });
    b = resizeBank(b, 2, 2);
    expect(b.pads.length).toBe(4); expect(b.spare.map((p) => p.name)).toEqual(['п5', 'п6']);
  });
  it('готовый банк «Ударные»: один раз, удалённый не возвращается', () => {
    const s = normalizeShow({});
    s.banks = s.banks.filter((b) => b.preset !== 'drums');
    expect(normalizeShow(s).banks.some((b) => b.preset === 'drums')).toBe(false);
    expect(normalizeShow({ banks: [] }).banks.filter((b) => b.preset === 'drums').length).toBe(1);
  });
  it('умолчания хранилища: пустые банки, закреплённые «верно/неверно» без файлов', () => {
    const s = normalizeShow({});
    expect(s.banks.length).toBe(3); expect(s.banks.filter((b) => b.preset === 'drums').length).toBe(1); expect(s.banks.find((b) => b.preset === 'drums').pads.every((p) => p.synth)).toBe(true); expect(dockOf(s).pads.length).toBe(2); expect(dockOf(s).pads.every((p) => p.file === null)).toBe(true);
    expect(bankOf(s).pinned).toBe(false); expect(s.page).toBe('desk'); expect(s.event).toBeNull();
  });
  it('поиск пада по id и повторная нормализация без потерь', () => {
    const s = normalizeShow({}); const p = newPad({ name: 'x' }); bankOf(s).pads[0] = p;
    const s2 = normalizeShow(JSON.parse(JSON.stringify(s)));
    expect(padById(s2, p.id).name).toBe('x');
  });
});

describe('номера, метки, таймер', () => {
  it('номер без трека не держит файл; метки по порядку времени', () => {
    const n = normalizeNumber({ kind: 'none', file: 'f1', cues: [{ t: 30, text: 'б' }, { t: 5, text: 'а' }, { t: 'x' }] });
    expect(n.file).toBeNull(); expect(n.cues.map((c) => c.text)).toEqual(['а', 'б']);
    expect(normalizeNumber({ kind: 'track', file: 'f1' }).file).toBe('f1');
  });
  it('время номера — минуты суток или без времени', () => {
    expect(normalizeNumber({ at: 1999 }).at).toBe(1439); expect(normalizeNumber({}).at).toBeNull(); expect(normalizeNumber({ at: 0 }).at).toBe(0);
  });
  it('ближайшая метка и обратный отсчёт', () => {
    const n = newNumber({ kind: 'track' }); addCue(n, 42, 'свет'); addCue(n, 130, 'тише');
    expect(cueNow(n, 10)).toMatchObject({ prev: null, in: 32 });
    expect(cueNow(n, 50).prev.text).toBe('свет'); expect(cueNow(n, 50).next.t).toBe(130);
    expect(cueNow(n, 500).next).toBeNull();
  });
  it('таймер выступления: до начала, идёт, обратный отсчёт, вышло время', () => {
    const e = normalizeEvent({ start: 10_000_000, timer: 'start' });
    expect(eventTimer(e, 9_990_000)).toEqual({ state: 'before', secs: 10 });
    expect(eventTimer(e, 10_065_000)).toEqual({ state: 'run', secs: 65 });
    const L = normalizeEvent({ start: 10_000_000, timer: 'length', length: 60 });
    expect(eventTimer(L, 10_020_000)).toEqual({ state: 'run', secs: 40 });
    expect(eventTimer(L, 10_075_000)).toEqual({ state: 'over', secs: 15 });
    expect(eventTimer(normalizeEvent({ timer: 'none', start: 5 }), 99).state).toBe('none');
    expect(eventTimer(normalizeEvent({ start: 0 }), 99).state).toBe('none');
  });
  it('время: разбор и вывод', () => {
    expect(clock(65)).toBe('1:05'); expect(clock(3725)).toBe('1:02:05');
    expect(parseTime('1:05')).toBe(65); expect(parseTime('65')).toBe(65); expect(parseTime('1:05.5')).toBe(65.5); expect(parseTime('abc')).toBeNull();
    expect(parseHhmm('19:30')).toBe(1170); expect(parseHhmm('25:00')).toBeNull(); expect(hhmm(1170)).toBe('19:30');
  });
});

describe('идущий номер и следующий', () => {
  it('следующий — не отыгранный за идущим; без идущего — первый не отыгранный', () => {
    const e = newEvent({ numbers: [{ id: 'a', done: true }, { id: 'b' }, { id: 'c' }] });
    const s = normalizeShow({ events: [e], event: e.id });
    expect(nextNumber(s).id).toBe('b');
    s.cur = 'b'; expect(currentNumber(s).id).toBe('b'); expect(nextNumber(s).id).toBe('c');
    s.cur = 'c'; expect(nextNumber(s)).toBeNull();
  });
  it('идущий номер, которого нет, забывается', () => {
    const e = newEvent({ numbers: [{ id: 'a' }] });
    expect(normalizeShow({ events: [e], event: e.id, cur: 'zzz' }).cur).toBeNull();
    expect(normalizeShow({ events: [e], event: e.id, cur: 'a' }).cur).toBe('a');
  });
});

describe('фон: пэд на квинте и шумы', () => {
  it('квинта: тоника и квинта в двух октавах, без терции', () => {
    expect(fifthNotes(8)).toEqual([44, 51, 56, 63]);
    expect(fifthNotes(-1)).toEqual([47, 54, 59, 66]);
  });
  it('тоника: вручную, иначе тональность записи со сдвигом, иначе прежняя', () => {
    const s = normalizeShow({}), n = { kind: 'track', shift: 1 };
    expect(tonicFor(s, n, { pc: 7 }, 3)).toBe(8);
    expect(tonicFor(s, { kind: 'none', shift: 0 }, null, 3)).toBe(3);
    s.bed.pad.tonic = 2; expect(tonicFor(s, n, { pc: 7 })).toBe(2);
    expect(tonicFor(normalizeShow({}), { kind: 'track', shift: -2 }, { pc: 1 })).toBe(11);
  });
  it('шумы и фон: умолчания, лишнее отбрасывается', () => {
    const s = normalizeShow({ noises: [{ file: 'f' }, { name: 'без файла' }], bed: { noise: { cur: 'нет' }, pad: { sound: 'x', tonic: 14 } } });
    expect(s.noises.length).toBe(1); expect(s.bed.noise.cur).toBeNull(); expect(s.bed.pad.sound).toBe('warm'); expect(s.bed.pad.tonic).toBe(2);
    expect(normalizeNumber({ bed: { pad: true, noise: 'a' } }).bed).toEqual({ pad: true, noise: 'a', padLevel: null, noiseLevel: null });
    expect(normalizeNumber({ bed: { pad: true, padLevel: 40, noiseLevel: 999 } }).bed).toMatchObject({ padLevel: 40, noiseLevel: 100 });
    expect(normalizeShow({}).norm).toEqual({ on: true, target: -16, pads: true });
    expect(normalizeShow({ norm: { target: -5, on: false } }).norm).toMatchObject({ on: false, target: -16 });
    expect(normalizeNumber({}).bed).toBeNull();
  });
});

import { normalizeProg, normalizePad as _np, normalizeNumber as _nn, eqGains as _eg } from '../src/music/show.js';
describe('программа и звук (25.11.2026)', () => {
  it('события: порядок, границы, пустые отбрасываются', () => {
    const p = normalizeProg([{ t: 20, key: 30 }, { t: 5, tempo: 9, ramp: 99 }, { t: 7 }, { t: -1, key: 1 }, null]);
    expect(p.map((e) => e.t)).toEqual([5, 20]);
    expect(p[0].tempo).toBe(1.5); expect(p[0].ramp).toBe(60); expect(p[1].key).toBe(12);
  });
  it('номер и пад: скорость, тональность, пресет в границах', () => {
    expect(_nn({ tempo: 5, eq: 'нет' }).tempo).toBe(1.5); expect(_nn({ eq: 'warm' }).eq).toBe('warm'); expect(_nn({ eq: 'x' }).eq).toBe('');
    const p = _np({ speed: 9, shift: -40, eq: 'vocal' }); expect(p.speed).toBe(2); expect(p.shift).toBe(-12); expect(p.eq).toBe('vocal');
    expect(_eg('zzz')).toEqual([0, 0, 0]);
  });
});
