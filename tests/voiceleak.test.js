import { describe, it, expect, vi, afterEach } from 'vitest';
import { createGlideVoice } from '../src/modules/glider/voice.js';
import { createPadVoice } from '../src/audio/padvoice.js';

// Поддельный AudioContext, который считает связи графа: голос, отпущенный и отзвучавший, не должен оставлять
// ни одной связи — иначе цепочка не освобождается и за долгую игру в терменвоксе копятся сотни мёртвых голосов.
function fakeCtx() {
  const edges = new Set();
  const param = (v = 0) => ({ value: v, setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
  let id = 0;
  const c = { currentTime: 0, sampleRate: 48000, edges, destination: null };
  const node = (extra = {}) => {
    const n = { id: ++id, context: c, gain: param(1), frequency: param(440), detune: param(0), Q: param(1), playbackRate: param(1), ...extra };
    n.connect = (to) => { edges.add(n.id + '>' + (to.id ?? ('p' + id))); return to && to.connect ? to : to; };
    n.disconnect = () => { for (const e of [...edges]) if (e.startsWith(n.id + '>')) edges.delete(e); };
    n.start = () => {}; n.stop = () => {};
    return n;
  };
  Object.assign(c, {
    createGain: () => node(), createBiquadFilter: () => node({ type: 'lowpass' }), createOscillator: () => node({ setPeriodicWave() {} }),
    createWaveShaper: () => node({ curve: null, oversample: 'none' }), createStereoPanner: () => node({ pan: param(0) }),
    createBufferSource: () => node({ buffer: null, loop: false }), createDelay: () => node({ delayTime: param(0) }),
    createConstantSource: () => node({ offset: param(0) }), createDynamicsCompressor: () => node(),
    createPeriodicWave: () => ({}), createBuffer: (ch, len) => ({ length: len, getChannelData: () => new Float32Array(len) }),
  });
  c.destination = node();
  return c;
}
// Связь наружу (в шину или зал) — утечка, только если её узел ещё что-то питает: узел посыла без входа мёртв и освобождается
const leaks = (c, ...outs) => {
  const fed = new Set([...c.edges].map((e) => e.split('>')[1]));
  return [...c.edges].filter((e) => { const [a, b] = e.split('>'); return outs.some((o) => String(o.id) === b) && fed.has(a); });
};
const PATCH = { kind: 'soft', tone: 0.5, att: 10, dec: 0.3, sus: 0.8, rel: 0.3, bright: 0.2, cho: 0, hall: 0.3 };

afterEach(() => vi.useRealTimers());

describe('голоса глайдера и пэдов: отпущенный голос не остаётся в графе', () => {
  it('глайдер с посылом в зал: после отпускания связей не остаётся', () => {
    vi.useFakeTimers();
    const c = fakeCtx(), bus = c.createGain(), hall = c.createGain();
    const before = c.edges.size;
    for (let i = 0; i < 50; i++) { const v = createGlideVoice(c, bus, PATCH, { hallVia: hall }); v.start(60 + (i % 12), {}); v.release(); }
    expect(c.edges.size).toBeGreaterThan(before);
    vi.advanceTimersByTime(5000);
    // все рёбра в шину и в зал разорваны: живых путей от голосов наружу нет
    expect(leaks(c, bus, hall)).toEqual([]);
  });
  it('пэд: после отпускания связей с шиной и залом нет', () => {
    vi.useFakeTimers();
    const c = fakeCtx(), bus = c.createGain(), hall = c.createGain();
    for (let i = 0; i < 20; i++) { const v = createPadVoice(c, bus, 'warm', { hall: 0.3, via: hall }); v.start(60, {}); v.release(); }
    vi.advanceTimersByTime(10000);
    expect(leaks(c, bus, hall)).toEqual([]);
  });
});
