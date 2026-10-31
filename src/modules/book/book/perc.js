// Учебник: ударные для схем ритма, метра и латины — синтез без сэмплов, точное время контекста (как drums.js студии).
// kind: 'click' | 'clickHi' (щелчок метронома), 'clave', 'wood', 'cowbell', 'conga' (открытый), 'slap', 'heel' (пятка),
// 'guiro', 'shaker', 'cascara' (бок тимбалес), 'kick', 'snare', 'hat'. Без DOM.
import { drumHit } from '../../../audio/drums.js';

let noiseB = null;
const noise = (c) => {
  if (noiseB && noiseB.sampleRate === c.sampleRate) return noiseB;
  const len = Math.round(c.sampleRate * 0.6), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return (noiseB = b);
};
const env = (g, t, peak, dec, att = 0.001) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.setTargetAtTime(0.0001, t + att + 0.002, dec / 4); };
function tone(c, out, t, { f, f2 = f, type = 'sine', peak = 0.5, dec = 0.1, glide = 0.03 }) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t + glide);
  env(g, t, peak, dec); o.connect(g).connect(out); o.start(t); o.stop(t + dec * 2 + 0.05);
}
function burst(c, out, t, { hp = 0, lp = 0, bp = 0, q = 0.7, peak = 0.4, dec = 0.05, len = 0 }) {
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noise(c);
  if (bp) { f.type = 'bandpass'; f.frequency.value = bp; } else if (hp) { f.type = 'highpass'; f.frequency.value = hp; } else { f.type = 'lowpass'; f.frequency.value = lp || 8000; }
  f.Q.value = q;
  if (len) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.01); g.gain.setValueAtTime(peak, t + len - 0.02); g.gain.linearRampToValueAtTime(0.0001, t + len); } else env(g, t, peak, dec);
  s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + (len || dec * 2) + 0.05);
  return g;
}

export function perc(c, out, kind, at, v = 0.8) {
  const t = Math.max(at, c.currentTime), k = 0.35 + 0.65 * v;
  switch (kind) {
    case 'click': tone(c, out, t, { f: 1250, type: 'triangle', peak: 0.45 * k, dec: 0.035 }); break;
    case 'clickHi': tone(c, out, t, { f: 1900, type: 'triangle', peak: 0.55 * k, dec: 0.04 }); break;
    case 'clave': tone(c, out, t, { f: 2500, f2: 2350, peak: 0.5 * k, dec: 0.07 }); break;
    case 'wood': tone(c, out, t, { f: 900, f2: 800, type: 'triangle', peak: 0.5 * k, dec: 0.06 }); break;
    case 'cowbell': [540, 800].forEach((f) => { const o = c.createOscillator(), b = c.createBiquadFilter(), g = c.createGain(); o.type = 'square'; o.frequency.value = f; b.type = 'bandpass'; b.frequency.value = 900; b.Q.value = 1.4; env(g, t, 0.16 * k, 0.28); o.connect(b).connect(g).connect(out); o.start(t); o.stop(t + 0.7); }); break;
    case 'conga': tone(c, out, t, { f: 260, f2: 200, peak: 0.6 * k, dec: 0.22, glide: 0.05 }); break;
    case 'slap': tone(c, out, t, { f: 330, f2: 250, peak: 0.3 * k, dec: 0.05 }); burst(c, out, t, { bp: 1800, q: 0.8, peak: 0.5 * k, dec: 0.05 }); break;
    case 'heel': tone(c, out, t, { f: 150, f2: 110, peak: 0.25 * k, dec: 0.06 }); break;
    case 'guiro': { const g = burst(c, out, t, { bp: 3200, q: 2, peak: 0.25 * k, len: 0.16 }); const lfo = c.createOscillator(), d = c.createGain(); lfo.frequency.value = 45; d.gain.value = 0.2 * k; lfo.connect(d).connect(g.gain); lfo.start(t); lfo.stop(t + 0.2); break; }
    case 'shaker': burst(c, out, t, { hp: 5000, q: 0.5, peak: 0.22 * k, dec: 0.05 }); break;
    case 'cascara': tone(c, out, t, { f: 1700, f2: 1500, type: 'triangle', peak: 0.3 * k, dec: 0.04 }); burst(c, out, t, { bp: 4000, q: 1, peak: 0.2 * k, dec: 0.03 }); break;
    default: drumHit(c, out, kind, t, v); // kick | snare | hat
  }
}
