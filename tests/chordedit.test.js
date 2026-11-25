import { describe, it, expect } from 'vitest';
import { parseText, norm, setRange, setAt, replaceAll, split, mergeNext, shiftLabel, applyItems, markEdited, resetEdited, labelOf } from '../src/music/chordedit.js';

const L = () => [{ t: 0, d: 2, c: 'A:min' }, { t: 2, d: 2, c: 'F' }, { t: 4, d: 2, c: 'C' }, { t: 6, d: 2, c: 'G' }];

describe('parseText', () => {
  it.each([['Am', 'A:min'], ['F#m7', 'F#:min7'], ['Bb', 'A#'], ['Bbmaj7', 'A#:maj7'], ['C/E', 'C'], ['G7', 'G:7'], ['Cmaj9', 'C:maj7'], ['Dm9', 'D:min7'],
    ['Esus4', 'E:sus4'], ['Bm7b5', 'B:hdim7'], ['C°', 'C:dim'], ['Caug', 'C:aug'], ['A♭', 'G#'], ['Fm6', 'F:min6'], ['C6', 'C:maj6'], ['D9', 'D:7']])('%s → %s', (a, b) => {
    expect(parseText(a)).toEqual({ ok: true, c: b });
  });
  it('нет аккорда и мусор', () => {
    expect(parseText('N')).toEqual({ ok: true, c: null });
    expect(parseText('')).toEqual({ ok: true, c: null });
    expect(parseText('H')).toEqual({ ok: false });
    expect(parseText('Cxyz')).toEqual({ ok: false });
  });
});
describe('правка', () => {
  it('norm: порядок, наложение, равные соседи', () => {
    const r = norm([{ t: 2, d: 3, c: 'F' }, { t: 0, d: 2, c: 'F' }, { t: 4, d: 2, c: 'C' }]);
    expect(r).toEqual([{ t: 0, d: 4, c: 'F' }, { t: 4, d: 2, c: 'C' }]);
  });
  it('norm: чужие подписи отбрасываются', () => { expect(norm([{ t: 0, d: 1, c: 'Q:zz' }])).toEqual([]); });
  it('setAt меняет подпись, границы целы', () => { expect(setAt(L(), 1, 'D:min')[1]).toEqual({ t: 2, d: 2, c: 'D:min' }); });
  it('setAt: соседи с тем же аккордом сливаются', () => { expect(setAt(L(), 1, 'A:min')).toHaveLength(3); });
  it('setRange делит чужой отрезок', () => {
    const r = setRange(L(), 3, 5, 'E:7');
    expect(r).toEqual([{ t: 0, d: 2, c: 'A:min' }, { t: 2, d: 1, c: 'F' }, { t: 3, d: 2, c: 'E:7' }, { t: 5, d: 1, c: 'C' }, { t: 6, d: 2, c: 'G' }]);
  });
  it('replaceAll', () => { expect(replaceAll(L(), 'C', 'G').map((x) => x.c)).toEqual(['A:min', 'F', 'G']); });
  it('split и mergeNext', () => {
    const s = split(L(), 0, 1); expect(s).toHaveLength(5); expect(s[0]).toEqual({ t: 0, d: 1, c: 'A:min' }); expect(s[1]).toEqual({ t: 1, d: 1, c: 'A:min' });
    expect(split(L(), 0, 0.05)).toHaveLength(4); // слишком близко к краю
    expect(mergeNext(s, 0)).toHaveLength(4);
    expect(mergeNext(L(), 0)[0]).toEqual({ t: 0, d: 4, c: 'A:min' });
  });
  it('shiftLabel', () => { expect(shiftLabel('A:min', 1)).toBe('A#:min'); expect(shiftLabel('B:7', 1)).toBe('C:7'); expect(shiftLabel('C', -1)).toBe('B'); expect(shiftLabel(null, 1)).toBe(null); });
  it('labelOf', () => { expect(labelOf(14, 'min')).toBe('D:min'); expect(labelOf(0, 'zz')).toBe(null); });
});
describe('applyItems (нейросеть)', () => {
  it('каждый элемент ставит аккорд до следующего', () => {
    const r = applyItems(L(), [{ t: 0, c: 'Am7' }, { t: 4, c: 'Dm' }], 8);
    expect(r.n).toBe(2); expect(r.bad).toBe(0);
    expect(r.chords[0]).toEqual({ t: 0, d: 4, c: 'A:min7' });
    expect(r.chords[1]).toEqual({ t: 4, d: 2, c: 'D:min' }); // последний — до конца того отрезка, где стоит
    expect(r.chords.at(-1)).toEqual({ t: 6, d: 2, c: 'G' }); // дальше — как было
  });
  it('заполнение пропуска', () => {
    const gap = [{ t: 0, d: 2, c: 'C' }, { t: 6, d: 2, c: 'G' }];
    const r = applyItems(gap, [{ t: 2, d: 4, c: 'F' }], 8);
    expect(r.chords).toEqual([{ t: 0, d: 2, c: 'C' }, { t: 2, d: 4, c: 'F' }, { t: 6, d: 2, c: 'G' }]);
  });
  it('мусор считается, не ломает', () => {
    const r = applyItems(L(), [{ t: 'x', c: 'C' }, { t: 1, c: 'Hm' }, null, { t: 99, c: 'C' }], 8);
    expect(r.n).toBe(0); expect(r.bad).toBe(4); expect(r.chords).toEqual(norm(L()));
  });
  it('конец не дальше длины записи', () => { expect(applyItems([], [{ t: 7, d: 10, c: 'C' }], 8).chords).toEqual([{ t: 7, d: 1, c: 'C' }]); });
});
describe('пометка правки', () => {
  it('первая правка запоминает исходное, возврат его возвращает', () => {
    const a = { v: 3, chords: L() };
    markEdited(a, setAt(L(), 0, 'E'), 1000);
    expect(a.cedit).toBe(1000); expect(a.cauto).toEqual(L());
    markEdited(a, setAt(a.chords, 1, 'D'), 2000);
    expect(a.cauto).toEqual(L()); // исходное не перезаписывается второй правкой
    resetEdited(a, 3000);
    expect(a.chords).toEqual(L()); expect(a.cauto).toBeUndefined(); expect(a.cedit).toBe(3000);
  });
});
