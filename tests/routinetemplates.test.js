import { describe, it, expect } from 'vitest';
import { TEMPLATES, FAMILIES, VARIANTS, familiesFor, templateMin } from '../src/core/routinetemplates.js';
import { example, cleanRoutine } from '../src/core/routine.js';
import { readFileSync } from 'node:fs';

describe('заготовки планов', () => {
  it('у каждого семейства три варианта, минуты растут, пункты проходят очистку', () => {
    FAMILIES.forEach((f) => {
      VARIANTS.forEach((v) => expect(TEMPLATES[f][v].length).toBeGreaterThan(0));
      expect(templateMin(f, 'quick')).toBeLessThan(templateMin(f, 'main'));
      expect(templateMin(f, 'main')).toBeLessThanOrEqual(templateMin(f, 'full'));
      VARIANTS.forEach((v) => { const r = example(f + '.' + v, (k) => k); expect(cleanRoutine(r)).toBeTruthy(); expect(r.items).toHaveLength(TEMPLATES[f][v].length); });
    });
  });
  it('семейство человека — первым', () => {
    expect(familiesFor(['drums', 'cello'])).toEqual(['drums', 'strings', 'guitar', 'piano', 'vocal', 'winds']);
    expect(familiesFor([])[0]).toBe('guitar');
  });
  it('все названия пунктов и семейств есть во всех языках', () => {
    const keys = new Set(['rt.tpl', 'rt.tplTitle', 'rt.tplMin']);
    FAMILIES.forEach((f) => { keys.add('rt.fam.' + f); Object.values(TEMPLATES[f]).forEach((l) => l.forEach((x) => keys.add('rt.it.' + x[0]))); });
    VARIANTS.forEach((v) => keys.add('rt.var.' + v));
    ['ru', 'en', 'uz'].forEach((l) => { const j = JSON.parse(readFileSync('src/i18n/' + l + '.json', 'utf8')); keys.forEach((k) => expect(j[k], l + ' ' + k).toBeTruthy()); });
  });
  it('первый пункт «Гитары» — с метрономом (проверка прежнего поведения)', () => {
    expect(example('guitar', (k) => k).items[0].tool).toBeTruthy();
  });
});
