// Пэды не «качают» в моно: маленькая Bluetooth-колонка, телефон и зал складывают каналы — расстроенные голоса
// унисона раньше гасили друг друга раз в секунду (жалоба автора 27.10.2026). Голос airvoice.worklet.js
// прогоняется в Node: в моно громкость ровная, в каждом ухе колеблется слабо
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { AIR } from '../src/audio/airsound.js';

function render(uni, secs = 6) {
  const sr = 48000; let P = null;
  const g = { sampleRate: sr, currentTime: 0, AudioWorkletProcessor: class { constructor() { this.port = {}; } }, registerProcessor: (n, c) => { P = c; } };
  new Function(...Object.keys(g), readFileSync('src/audio/wl/airvoice.worklet.js', 'utf8'))(...Object.values(g));
  const R = { ...AIR.air, breath: 0, drift: 0 }, p = new P({ processorOptions: { R, f: 110, t: 0, width: 1, bright: 1, fade: 0.01, uni } });
  const N = 128, L = new Float32Array(secs * sr), Rr = new Float32Array(secs * sr);
  for (let b = 0; b < L.length / N; b++) { const o = [[new Float32Array(N), new Float32Array(N)]]; g.currentTime = (b * N) / sr; p.process([], o, { freq: [110], vib: [0] }); L.set(o[0][0], b * N); Rr.set(o[0][1], b * N); }
  const swing = (x) => { const w = sr * 0.05, e = []; for (let i = sr; i + w < x.length; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += x[j] * x[j]; e.push(Math.sqrt(s / w)); } return 20 * Math.log10(Math.max(...e) / Math.min(...e)); };
  return { mono: swing(L.map((v, i) => v + Rr[i])), left: swing(L), right: swing(Rr) };
}

describe('пэды в моно', () => {
  for (const uni of [2, 3]) {
    it('унисон ' + uni + ': в моно ровно, в ушах — мягко', () => {
      const r = render(uni);
      expect(r.mono).toBeLessThan(1);
      expect(r.left).toBeLessThan(5);
      expect(r.right).toBeLessThan(5);
    });
  }
});
