import { it, expect } from 'vitest';
import { newPart, partXML } from '../src/music/livescore.js';
import * as at from '@coderline/alphatab';
it('партия с игры → Guitar Pro (.gp): экспорт читается обратно', () => {
  const p = newPart({ inst: 'guitar', bpm: 100 });
  p.raw = [{ t: 0, m: 64, v: 0.8, d: 0.5 }, { t: 0.5, m: 67, v: 0.8, d: 0.5 }, { t: 1, m: 71, v: 0.8, d: 1 }];
  const sc = at.importer.ScoreLoader.loadScoreFromBytes(new TextEncoder().encode(partXML(p, { title: 'T' })), new at.Settings());
  const out = new at.exporter.Gp7Exporter().export(sc, new at.Settings());
  expect(out.length).toBeGreaterThan(500);
  const back = at.importer.ScoreLoader.loadScoreFromBytes(out, new at.Settings());
  expect(back.tracks[0].staves[0].bars.length).toBeGreaterThan(0);
  expect(String.fromCharCode(...out.slice(0, 2))).toBe('PK');
});
