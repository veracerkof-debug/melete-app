// Наборы драм-пэдов сцены (src/audio/stagepads.js): электронные по умолчанию, силой 60 %; сэмпл вместо синтеза, мягкий и жёсткий слой
import { describe, it, expect } from 'vitest';
import { createStagePads, PADS, DEF_KIT, DEF_VEL, DEF_SPACE, DEF_ECHO } from '../src/audio/stagepads.js';

function fakeCtx() {
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime(v) { this.t = v; }, exponentialRampToValueAtTime() {} });
  const node = () => ({ gain: param(), frequency: param(), Q: param(), delayTime: param(), connect(x) { return x; }, disconnect() {} });
  const c = { currentTime: 0, state: 'running', sampleRate: 48000, started: [], bufSrc: 0 };
  c.createGain = node; c.createBiquadFilter = node; c.createDelay = node; c.createOscillator = () => ({ ...node(), start() {}, stop() {} });
  c.createBuffer = (n, len) => ({ getChannelData: () => new Float32Array(len) });
  c.createConvolver = () => ({ ...node(), buffer: null });
  c.createBufferSource = () => { const s = { ...node(), buffer: null, start() { c.started.push(s.buffer); }, stop() {} }; return s; };
  c.decodeAudioData = async (ab) => ({ tag: new Uint8Array(ab)[0] });
  return c;
}
const loader = (log = []) => (url) => { log.push(url); const kind = url.includes('_b.mp3') ? 2 : 1; return Promise.resolve(new Uint8Array([kind]).buffer); };
const tick = () => new Promise((r) => setTimeout(r, 20));

describe('наборы драм-пэдов', () => {
  it('умолчания: электронные, сила 60 %, зал длинный, эхо выключено', () => {
    expect(DEF_KIT).toBe('elec'); expect(DEF_VEL).toBe(0.6); expect(DEF_SPACE).toBe(0.6); expect(DEF_ECHO).toBe(0);
    const p = createStagePads(fakeCtx(), { connect() {} }, { load: loader() });
    expect(p.kit).toBe('elec'); expect(p.vel).toBe(0.6);
  });
  it('грузит 16 файлов набора; после загрузки играет сэмпл: мягкий слой на 60 %, жёсткий выше', async () => {
    const log = [], c = fakeCtx(), p = createStagePads(c, { connect() {} }, { load: loader(log) });
    expect(log.length).toBe(PADS.length * 2); expect(log[0]).toContain('drums/elec/');
    await tick(); expect(p.ready()).toBe(true);
    expect(p.hit(0)).toBe(true); expect(c.started.at(-1).tag).toBe(1); // 0,6 — мягкий
    p.hit(0, 0.9); expect(c.started.at(-1).tag).toBe(2); // жёсткий
  });
  it('пока не загружено — синтез, не тишина; переключение набора грузит новый, synth — без файлов', async () => {
    const log = [], c = fakeCtx(), p = createStagePads(c, { connect() {} }, { load: loader(log) });
    expect(p.ready()).toBe(false);
    expect(p.hit(0)).toBe(true); expect(c.started.filter((b) => b && b.tag).length).toBe(0); // сэмплов нет — играет синтез
    await tick();
    p.setKit('muld'); expect(log.some((u) => u.includes('drums/muld/'))).toBe(true);
    const n = log.length; p.setKit('synth'); expect(log.length).toBe(n); expect(p.ready()).toBe(true);
    p.setKit('нет'); expect(p.kit).toBe('synth');
  });
  it('ошибка файла: этот звук остаётся синтезом, остальные играют', async () => {
    const c = fakeCtx(), bad = (url) => (url.includes('kick_a') ? Promise.reject(new Error('x')) : Promise.resolve(new Uint8Array([1]).buffer));
    const p = createStagePads(c, { connect() {} }, { load: bad });
    await tick();
    expect(p.hit(0)).toBe(true); // kick_b есть → играет жёсткий вместо мягкого
    expect(p.hit(2)).toBe(true);
  });
});
