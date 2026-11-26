import { describe, it, expect } from 'vitest';
import { scaleOf, clampScale, normLay, arrange, moveBlock, moveTo, tierOf, isEditing, setEditing, rowsOf, togglePair, clampRatio, SCALE_MIN, SCALE_MAX } from '../src/ui/layout.js';

const B = [{ id: 'a', html: '<i>A</i>' }, { id: 'b', html: '<i>B</i>' }, { id: 'c', html: '<i>C</i>' }, { id: 'd', html: '' }];
const ids = ['a', 'b', 'c', 'd'];

describe('размер блока', () => {
  it('ступени s/m/l читаются числом, число — как есть, мусор — 1', () => {
    const lay = { size: { a: 's', b: 'l', c: 1.4, d: 'xx', e: null } };
    expect(scaleOf(lay, 'a')).toBe(0.8); expect(scaleOf(lay, 'b')).toBe(1.25); expect(scaleOf(lay, 'c')).toBe(1.4);
    expect(scaleOf(lay, 'd')).toBe(1); expect(scaleOf(lay, 'zzz')).toBe(1); expect(scaleOf(null, 'a')).toBe(1);
  });
  it('границы: 0,5…2,2, два знака', () => { expect(clampScale(0.1)).toBe(SCALE_MIN); expect(clampScale(9)).toBe(SCALE_MAX); expect(clampScale(1.23456)).toBe(1.23); expect(scaleOf({ size: { a: 5 } }, 'a')).toBe(SCALE_MAX); });
  it('normLay чинит данные и выбрасывает мусор', () => {
    const o = normLay({ order: 'x', hidden: null, size: { a: 'm', b: 'zz', c: NaN } });
    expect(o.order).toEqual([]); expect(o.hidden).toEqual([]); expect(Object.keys(o.size)).toEqual(['a']);
  });
});

describe('ступень размера (data-z для stagefit.css)', () => {
  it('xs ≤ 0,65 < s ≤ 0,9 < m ≤ 1,25 < l ≤ 1,7 < xl', () => {
    expect([0.5, 0.65, 0.66, 0.9, 1, 1.25, 1.26, 1.7, 1.71, 2.2].map(tierOf)).toEqual(['xs', 'xs', 's', 's', 'm', 'm', 'l', 'l', 'xl', 'xl']);
  });
  it('arrange отдаёт ступень и в обычном виде, и в правке', () => {
    const lay = { size: { a: 0.5, c: 2 } };
    expect(arrange(B, lay)).toContain('data-lb="a" style="--lz:0.5" data-z="xs"');
    expect(arrange(B, lay)).toContain('data-z="xl"');
    setEditing(lay, true); expect(arrange(B, lay, { t: (k) => k })).toContain('data-z="xs"'); setEditing(lay, false);
  });
});

describe('arrange: обычный вид заморожен и прост', () => {
  it('порядок, скрытые и пустые блоки; размер — в --lz; никаких кнопок правки', () => {
    const lay = { order: ['c', 'a'], hidden: ['b'], size: { c: 1.5 } };
    const h = arrange(B, lay);
    expect(h.indexOf('data-lb="c"')).toBeLessThan(h.indexOf('data-lb="a"'));
    expect(h).not.toContain('data-lb="b"'); expect(h).not.toContain('data-lb="d"');
    expect(h).toContain('data-lb="c" style="--lz:1.5"'); expect(h).toContain('data-lb="a" style="--lz:1"');
    expect(h).not.toContain('data-ly'); expect(h).not.toContain('lyh');
  });
  it('в правке: рамки, планка размера, порядок, «Готово», скрытые внизу', () => {
    const lay = { hidden: ['b'] }; setEditing(lay, true);
    expect(isEditing(lay)).toBe(true);
    const h = arrange(B, lay, { t: (k) => k, name: (i) => 'имя-' + i });
    expect(h).toContain('data-ly="done"'); expect(h).toContain('data-ly="grip"'); expect(h).toContain('имя-a');
    // кнопок «выше / ниже / скрыть / рядом» нет — место и скрытие жестами
    for (const k of ['up', 'down', 'hide', 'pair']) expect(h).not.toContain('data-ly="' + k + '"');
    expect(h).toContain('data-ly="show" data-id="b"'); expect(h).not.toContain('data-lb="b"');
    setEditing(lay, false); expect(isEditing(lay)).toBe(false);
  });
  it('правка не хранится в данных', () => { const lay = {}; setEditing(lay, true); expect(JSON.stringify(lay)).not.toMatch(/edit/i); });
});

describe('порядок', () => {
  it('moveBlock сдвигает среди видимых, скрытые остаются в конце', () => {
    const lay = { hidden: ['b'] };
    expect(moveBlock(lay, ids, 'a', 1)).toBe(true);
    expect(lay.order).toEqual(['c', 'a', 'd', 'b']);
    expect(moveBlock(lay, ids, 'c', -1)).toBe(false); // выше некуда
  });
});

describe('несколько блоков рядом', () => {
  it('ряды: пара встаёт в ряд с предыдущим, если тот один; третий — новая строка', () => {
    const lay = { pair: { b: 0.4, c: 0.5 } };
    expect(rowsOf(lay, ids)).toEqual([['a', 'b'], ['c'], ['d']]); // у c запись есть, но предыдущий ряд уже на двоих
    expect(rowsOf({ pair: { d: 0.5 } }, ids)).toEqual([['a'], ['b'], ['c', 'd']]);
    expect(rowsOf({}, ids)).toEqual([['a'], ['b'], ['c'], ['d']]);
    expect(rowsOf({ pair: { a: 0.5 } }, ids)).toEqual([['a'], ['b'], ['c'], ['d']]); // у первого предыдущего нет
  });
  it('togglePair: встать рядом, разделить; нельзя к парному и первому', () => {
    const lay = {};
    expect(togglePair(lay, ids, 'a')).toBe(false);
    expect(togglePair(lay, ids, 'b')).toBe(true); expect(lay.pair).toEqual({ b: 0.5 });
    expect(togglePair(lay, ids, 'c')).toBe(false); // предыдущий ряд уже на двоих
    expect(togglePair(lay, ids, 'a')).toBe(true); expect(lay.pair).toEqual({}); // с первого члена — разделить
    expect(togglePair(lay, ids, 'c')).toBe(true); expect(togglePair(lay, ids, 'c')).toBe(true); expect(lay.pair).toEqual({});
  });
  it('доля ширины: 25–75 %, мусор отбрасывается', () => {
    expect(clampRatio(0.1)).toBe(0.25); expect(clampRatio(0.9)).toBe(0.75); expect(clampRatio(0.456)).toBe(0.46);
    expect(normLay({ pair: { b: 'x', c: 0.9, d: 0.5 } }).pair).toEqual({ c: 0.75, d: 0.5 });
  });
  it('ряд сдвигается целиком', () => {
    const lay = { pair: { b: 0.5 } }; // [a b] [c] [d]
    expect(moveBlock(lay, ids, 'b', 1)).toBe(true); expect(lay.order).toEqual(['c', 'a', 'b', 'd']);
    expect(moveBlock(lay, ids, 'd', -1)).toBe(true); expect(lay.order).toEqual(['c', 'd', 'a', 'b']);
  });
  it('arrange: без пар разметка прежняя (нет рядов); пара — один ряд с долей', () => {
    expect(arrange(B, {})).not.toContain('lyrow');
    const h = arrange(B, { pair: { b: 0.4 } }, { grow: ['b'] });
    expect(h).toContain('<div class="lyrow lyg" style="--lw:0.4">'); expect((h.match(/class="lyb"/g) || []).length).toBe(3);
    expect(h.indexOf('data-lb="a"')).toBeLessThan(h.indexOf('data-lb="b"'));
  });
  it('arrange в правке: планка ширины между блоками пары', () => {
    const lay = { pair: { b: 0.5 } }; setEditing(lay, true);
    const h = arrange(B, lay, { t: (k) => k });
    expect(h).toContain('data-ly="width"');
  });
  it('moveTo: до / после, рядом (к боку одиночного блока), из пары, ширина сохраняется', () => {
    const lay = {};
    expect(moveTo(lay, ids, 'c', 'a', 'before')).toBe(true); expect(lay.order.slice(0, 3)).toEqual(['c', 'a', 'b']);
    expect(moveTo(lay, ids, 'a', 'b', 'right')).toBe(true); expect(rowsOf(lay, ids)).toEqual([['c'], ['b', 'a'], ['d']]); expect(lay.pair.a).toBe(0.5);
    lay.pair.a = 0.4;
    expect(moveTo(lay, ids, 'd', 'b', 'left')).toBe(false); // у пары бока нет — встаёт после ряда, а там уже стоит
    expect(rowsOf(lay, ids)).toEqual([['c'], ['b', 'a'], ['d']]);
    expect(moveTo(lay, ids, 'a', 'c', 'after')).toBe(true); expect(rowsOf(lay, ids)).toEqual([['c'], ['a'], ['b'], ['d']]); expect(lay.pair.a).toBeUndefined();
    expect(moveTo(lay, ids, 'a', 'a', 'before')).toBe(false); expect(moveTo(lay, ids, 'a', 'zz', 'before')).toBe(false);
  });
});
