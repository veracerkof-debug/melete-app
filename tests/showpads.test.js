// Звуки пульта: игра падов на подложной звуковой системе (src/audio/showpads.js)
import { describe, it, expect } from 'vitest';
import { createShowPads } from '../src/audio/showpads.js';
import { newPad, faderGain } from '../src/music/show.js';

function fakeCtx() {
  const c = { currentTime: 0, made: [] };
  const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.last = v; (this.ramps ??= []).push(v); }, setTargetAtTime(v) { this.target = v; }, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
  const node = () => ({ gain: param(), connect(x) { return x; }, disconnect() {} });
  c.gains = []; c.createGain = () => { const n = node(); c.gains.push(n); return n; };
  c.filters = []; c.createBiquadFilter = () => { const f = { ...node(), type: '', frequency: { value: 0 }, Q: { value: 0 }, gain: param() }; c.filters.push(f); return f; };
  c.createBufferSource = () => { const s = { ...node(), playbackRate: { value: 1 }, started: null, stopped: null, loop: false, start(t, o, d) { s.started = { t, o, d }; }, stop(t) { s.stopped = t; setTimeout(() => s.onended && s.onended(), 0); } }; c.made.push(s); return s; };
  c.decodeAudioData = async () => ({ duration: 4, numberOfChannels: 1, sampleRate: 8000, getChannelData: () => Float32Array.from({ length: 8000 }, (_, i) => 0.05 * Math.sin(i / 8000 * 2 * Math.PI * 997)) });
  return c;
}
const setup = (extra = {}) => {
  const c = fakeCtx(), dest = { context: c, connect() {} };
  const files = { f1: { arrayBuffer: async () => new ArrayBuffer(8) }, f2: { arrayBuffer: async () => new ArrayBuffer(8) } };
  return { c, eng: createShowPads({ dest, getBlob: (id) => files[id], now: () => c.currentTime, ...extra }) };
};
const tick = () => new Promise((r) => setTimeout(r, 40));

describe('звуки пульта', () => {
  it('пад без файла молчит и не падает', () => {
    const { eng } = setup();
    expect(eng.press(newPad({}))).toBe('empty');
    expect(eng.active).toBe(0);
  });
  it('первое касание ждёт раскрытия файла и играет, после preload — сразу', async () => {
    const { eng, c } = setup(), p = newPad({ file: 'f1' });
    expect(eng.press(p)).toBe('wait'); await tick();
    expect(c.made.length).toBe(1); expect(eng.active).toBe(1);
    eng.stopAll(0); await tick();
    const q = newPad({ file: 'f2' }); await eng.preload([q]);
    expect(eng.press(q)).toBe('play'); expect(c.made.length).toBe(2);
  });
  it('повторное касание: с начала / стоп / поверх', async () => {
    const { eng, c } = setup(); const mk = (again) => newPad({ file: 'f1', again }); await eng.preload([mk()]);
    const a = mk('restart'); eng.press(a); eng.press(a); expect(c.made.length).toBe(2); expect(eng.active).toBe(1);
    const b = mk('stop'); eng.press(b); expect(eng.press(b)).toBe('stop');
    const l = mk('layer'); eng.press(l); eng.press(l); expect(eng.active).toBeGreaterThanOrEqual(2);
  });
  it('петля: повторное касание останавливает; отрезок задаёт границы', async () => {
    const { eng, c } = setup(), p = newPad({ file: 'f1', mode: 'loop', from: 1, to: 3 }); await eng.preload([p]);
    expect(eng.press(p)).toBe('play');
    const s = c.made.at(-1); expect(s.loop).toBe(true); expect(s.loopStart).toBe(1); expect(s.loopEnd).toBe(3);
    expect(eng.press(p)).toBe('stop');
  });
  it('группа: новый звук глушит прежний из той же группы', async () => {
    const { eng, c } = setup(), a = newPad({ file: 'f1', group: 2 }), b = newPad({ file: 'f2', group: 2 }); await eng.preload([a, b]);
    eng.press(a); eng.press(b);
    expect(c.made[0].stopped).not.toBeNull(); expect(eng.active).toBe(1);
  });
  it('«пока держат»: отпустили — звук уходит', async () => {
    const { eng, c } = setup(), p = newPad({ file: 'f1', mode: 'hold' }); await eng.preload([p]);
    eng.press(p); eng.release(p); expect(c.made[0].stopped).not.toBeNull();
  });
  it('приглушение: пока играет пад с «приглушать» — основной тише, потом возвращается', async () => {
    const { eng } = setup(), p = newPad({ file: 'f1', duck: true }); await eng.preload([p]);
    eng.setDuck(40, 0.2); eng.press(p);
    expect(eng.duckNode.gain.target).toBeCloseTo(0.6); eng.stopAll(0); await tick();
    expect(eng.duckNode.gain.target).toBe(1);
  });
  it('нет файла в медиатеке: ошибка, а не тишина без объяснения', async () => {
    const { eng } = setup(), p = newPad({ file: 'нет' });
    expect(eng.press(p)).toBe('wait'); await tick();
    expect(eng.failed('нет')).toBe(true); expect(eng.press(p)).toBe('error');
  });
  it('громкость падов: правится параметром', () => {
    const { eng } = setup(); eng.setLevel(50); expect(eng.out.gain.target).toBeCloseTo(0.25);
  });
  it('нормализация: тихий пад подтягивается до цели (не больше +12 дБ), выключена — без поправки', async () => {
    const got = [];
    const on = setup({ getNorm: () => ({ on: true, pads: true, target: -16 }), onMeasure: (id, m) => got.push([id, m]) }), p = newPad({ file: 'f1' });
    await on.eng.preload([p]);
    expect(got.length).toBe(1); expect(got[0][1].lufs).toBeLessThan(-25);
    expect(on.eng.normOf('f1')).toBe(12);
    on.eng.press(p);
    const g = on.c.gains.at(-1).gain.ramps[0]; // первый уровень последнего голоса (вход)
    expect(g).toBeCloseTo(faderGain(100) * Math.pow(10, 12 / 20), 3);
    const off = setup({ getNorm: () => ({ on: false }) }); await off.eng.preload([p]);
    expect(off.eng.normOf('f1')).toBe(0);
  });
  it('уже измеренная громкость берётся из записи, второй раз не считается', async () => {
    let n = 0;
    const s = setup({ getNorm: () => ({ on: true, pads: true, target: -16 }), known: () => ({ lufs: -26, peak: -10 }), onMeasure: () => { n++; } });
    await s.eng.preload([newPad({ file: 'f1' })]);
    expect(n).toBe(0); expect(s.eng.normOf('f1')).toBe(9); // −16 − (−26) = 10, но потолок по пику: −1 − (−10) = 9
  });
});

describe('звуки пульта: скорость, тональность, эквалайзер пада', () => {
  it('скорость и тональность задают темп воспроизведения, эквалайзер — три фильтра голоса', async () => {
    const { c, eng } = setup();
    const p = newPad({ file: 'f1', speed: 2, shift: 12, eq: 'warm' });
    eng.press(p); await tick(); eng.press(p); await tick();
    const s = c.made[c.made.length - 1];
    expect(s.playbackRate.value).toBe(4); // 2 × 2^(12/12), предел 4
    expect(c.filters.length % 3).toBe(0);
    expect(c.filters.slice(-3).map((f) => f.gain.value)).toEqual([3, 0, -3]);
  });
  it('без пресета фильтров нет', async () => {
    const { c, eng } = setup();
    const p = newPad({ file: 'f1' });
    eng.press(p); await tick(); eng.press(p); await tick();
    expect(c.filters.length).toBe(0);
  });
});
