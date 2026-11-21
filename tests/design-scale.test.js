// «Храповик» оформления (docs/design-system.md, раздел 9): разнобой размеров шрифта, радиусов и цветов в CSS может только падать.
// Уменьшили — поправь число ниже (оно подтягивается вниз); выросло — тест красный: берите значение из шкалы в src/styles/tokens.css.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? (n === 'fonts' ? [] : files(p)) : p.endsWith('.css') ? [p] : [];
});
const CSS = files('src').map((p) => [p, readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')]);
const distinct = (re, skip = () => false) => new Set(CSS.filter(([p]) => !skip(p)).flatMap(([, t]) => [...t.matchAll(re)].map((m) => m[1].toLowerCase()))).size;

// Потолки на 21.11.2026 (замер в docs/design-system.md, раздел 3); цель — шкала из 8 / 5 ступеней
const MAX = { fontSize: 49, radius: 28, hexOutsideTokens: 485 };

describe('шкалы оформления', () => {
  it('разных font-size не больше потолка', () => {
    expect(distinct(/font-size:\s*([\d.]+px)/g)).toBeLessThanOrEqual(MAX.fontSize);
  });
  it('разных border-radius не больше потолка', () => {
    expect(distinct(/border-radius:\s*([\d.]+px)/g)).toBeLessThanOrEqual(MAX.radius);
  });
  it('цветов #hex вне tokens.css не больше потолка', () => {
    const n = CSS.filter(([p]) => !p.endsWith('tokens.css')).reduce((a, [, t]) => a + [...t.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].length, 0);
    expect(n).toBeLessThanOrEqual(MAX.hexOutsideTokens);
  });
});
