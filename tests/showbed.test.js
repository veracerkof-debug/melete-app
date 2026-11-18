// Фон пульта: пэд на квинте и шумы с наплывом (src/audio/showbed.js)
import { describe, it, expect } from 'vitest';
import { createShowBed } from '../src/audio/showbed.js';

function fakeCtx() {
  const param = (v = 0) => ({ value: v, last: null, target: null, setValueAtTime(x) { this.value = x; }, linearRampToValueAtTime(x, t) { this.last = [x, t]; }, setTargetAtTime(x) { this.target = x; }, cancelScheduledValues() {} });
  const node = () => ({ gain: param(1), connect() {}, disconnect() {} });
  const c = { currentTime: 0, oscs: [], srcs: [] };
  c.createGain = node;
  c.createBiquadFilter = () => ({ type: '', frequency: param(), Q: param(), connect() {}, disconnect() {} });
  c.createOscillator = () => { const o = { type: '', frequency: param(), detune: param(), started: false, stopped: false, connect() {}, disconnect() {}, start() { o.started = true; }, stop() { o.stopped = true; } }; c.oscs.push(o); return o; };
  c.createBufferSource = () => { const s = { buffer: null, loop: false, started: false, stopped: false, connect() {}, disconnect() {}, start() { s.started = true; }, stop() { s.stopped = true; } }; c.srcs.push(s); return s; };
  c.decodeAudioData = async () => ({ duration: 10 });
  return c;
}
const setup = () => { const c = fakeCtx(); return { c, bed: createShowBed({ dest: { context: c, connect() {} }, getBlob: (id) => (id === 'none' ? null : { arrayBuffer: async () => new ArrayBuffer(4) }), now: () => c.currentTime }) }; };

describe('фон пульта', () => {
  it('пэд на квинте: 8 генераторов, частоты тоники и квинты (Ля♭ = 8)', () => {
    const { bed, c } = setup();
    bed.padOn({ pc: 8, level: 60 });
    expect(c.oscs.length).toBe(8);
    const fr = c.oscs.map((o) => o.frequency.value), root = Math.min(...fr);
    expect(new Set(fr.map((x) => x.toFixed(3))).size).toBe(4);
    expect(root).toBeCloseTo(103.83, 1); // Ля♭ (MIDI 44)
    expect(fr.some((x) => Math.abs(x / root - 2 ** (7 / 12)) < 1e-6)).toBe(true); // квинта (7 полутонов)
    expect(bed.state.pad).toBe(true);
  });
  it('смена тональности: частоты плывут параметром, без новых узлов', () => {
    const { bed, c } = setup();
    bed.padOn({ pc: 0 });
    const n = c.oscs.length; bed.padTonic(7);
    expect(c.oscs.length).toBe(n); expect(c.oscs[0].frequency.target).toBeCloseTo(98, 0); // соль (MIDI 43)
    expect(bed.state.tonic).toBe(7);
  });
  it('повторное включение не плодит голоса; выключение гасит и останавливает', async () => {
    const { bed, c } = setup();
    bed.padOn({ pc: 0 }); bed.padOn({ pc: 2 });
    expect(c.oscs.length).toBe(8);
    bed.padOff(0.02); expect(bed.state.pad).toBe(false);
    await new Promise((r) => setTimeout(r, 200));
    expect(c.oscs.every((o) => o.stopped)).toBe(true);
  });
  it('шум: наплыв — новый нарастает, прежний уходит; тот же шум не перезапускается', async () => {
    const { bed, c } = setup();
    await bed.setNoise('a', 100, 4); await bed.setNoise('b', 100, 4);
    expect(c.srcs.length).toBe(2); expect(c.srcs[0].loop).toBe(true); expect(c.srcs[0].stopped).toBe(true); expect(c.srcs[1].stopped).toBe(false);
    await bed.setNoise('b', 50, 4); expect(c.srcs.length).toBe(2);
    expect(bed.state.noise).toBe('b');
    bed.stopNoise(0.02); expect(bed.state.noise).toBeNull();
  });
  it('нет файла шума — ошибка наружу, фон не ломается', async () => {
    const { bed } = setup();
    await expect(bed.setNoise('none')).rejects.toThrow();
    expect(bed.state.noise).toBeNull();
  });
  it('громкость фона — параметром', () => {
    const { bed } = setup(); bed.setLevel(50); expect(bed.out.gain.target).toBeCloseTo(0.25);
  });
});
