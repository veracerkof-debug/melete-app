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

it('бенд на ноте: MusicXML читается alphaTab, бенд виден в партитуре', () => {
  const p = newPart({ inst: 'guitar', bpm: 100 });
  p.raw = [{ t: 0, m: 64, v: 0.8, d: 1, tech: 'b' }, { t: 1, m: 67, v: 0.8, d: 1 }];
  const sc = at.importer.ScoreLoader.loadScoreFromBytes(new TextEncoder().encode(partXML(p, { title: '' })), new at.Settings());
  const bs = sc.tracks[0].staves[0].bars[0].voices[0].beats;
  expect(bs[0].notes[0].hasBend).toBe(true);
  expect(bs[1].notes[0].hasBend).toBe(false);
});

import { copyBars, pasteBars } from '../src/music/livescore.js';
it('копирование и вставка тактов: кусок встаёт после выбранных, остальное сдвигается', () => {
  const p = newPart({ inst: 'guitar', bpm: 120 }); // 0,5 с на долю, такт 2 с
  p.raw = [{ t: 0, m: 60, d: 0.5 }, { t: 2, m: 62, d: 0.5 }, { t: 4, m: 64, d: 0.5 }];
  const clip = copyBars(p, 0, 0);
  expect(clip.bars).toBe(1); expect(clip.raw).toEqual([{ t: 0, m: 60, d: 0.5 }]);
  pasteBars(p, 1, clip); // после первого такта
  expect(p.raw.map((r) => [r.t, r.m])).toEqual([[0, 60], [2, 60], [4, 62], [6, 64]]);
});
