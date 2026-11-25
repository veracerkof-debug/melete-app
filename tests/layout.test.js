import { describe, it, expect } from 'vitest';
import { scaleOf, clampScale, normLay, arrange, moveBlock, isEditing, setEditing, SCALE_MIN, SCALE_MAX } from '../src/ui/layout.js';

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
    expect(h).toContain('data-ly="done"'); expect(h).toContain('data-ly="grip"'); expect(h).toContain('data-ly="up"'); expect(h).toContain('имя-a');
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
