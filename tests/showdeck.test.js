// Основной трек пульта: два места, загрузка заранее, плавные вход/выход (src/audio/showdeck.js)
import { describe, it, expect } from 'vitest';
import { createShowDeck } from '../src/audio/showdeck.js';

function fakeCtx() {
  const param = () => ({ value: 0, v: [], setValueAtTime(x) { this.value = x; this.v.push(['set', x]); }, linearRampToValueAtTime(x, t) { this.v.push(['ramp', x, t]); }, setTargetAtTime(x) { this.target = x; }, cancelScheduledValues() {} });
  const node = () => ({ gain: param(), connect() {}, disconnect() {} });
  const gains = [];
  return { currentTime: 10, gains, createGain: () => { const n = node(); gains.push(n); return n; } };
}
function fakePlayer() {
  const p = new EventTarget();
  Object.assign(p, { paused: true, duration: 100, currentTime: 0, loaded: 0, pitch: 0, async load() { p.loaded++; }, async play() { p.paused = false; }, pause() { p.paused = true; }, setPitch(s) { p.pitch = s; }, destroy() {} });
  return p;
}
const setup = () => {
  const c = fakeCtx(), dest = { context: c, connect() {} }, made = [];
  const deck = createShowDeck({ dest, getBlob: (id) => (id === 'none' ? null : { id }), makePlayer: async () => { const p = fakePlayer(); made.push(p); return p; }, now: () => c.currentTime });
  return { c, deck, made };
};

describe('основной трек пульта', () => {
  it('запуск: загрузка, сдвиг тональности, плавный вход, играет', async () => {
    const { deck, made } = setup();
    const d = await deck.start({ file: 'a', level: 100, fadeIn: 2, shift: 3, from: 5 });
    expect(d).toBe(100); expect(made[0].pitch).toBe(3); expect(made[0].currentTime).toBe(5); expect(made[0].paused).toBe(false);
    expect(deck.state.playing).toBe(true);
  });
  it('следующий трек грузится заранее на второе место и стартует без новой загрузки', async () => {
    const { deck, made } = setup();
    await deck.start({ file: 'a' });
    await deck.prepare('b');
    expect(made.length).toBe(2); expect(deck.isReady('b')).toBe(true);
    await deck.start({ file: 'b' });
    expect(made[1].loaded).toBe(1); expect(made[1].paused).toBe(false); expect(made[0].paused).toBe(false); // старый уходит сам по stop()
  });
  it('стоп с плавным уходом: пауза после затухания', async () => {
    const { deck, made } = setup();
    await deck.start({ file: 'a' });
    deck.stop(0.05);
    expect(deck.state.fading).toBe(true);
    await new Promise((r) => setTimeout(r, 160));
    expect(made[0].paused).toBe(true);
  });
  it('нет файла в медиатеке: ошибка наружу, место не залипает', async () => {
    const { deck } = setup();
    await expect(deck.start({ file: 'none' })).rejects.toThrow();
    await expect(deck.start({ file: 'a' })).resolves.toBe(100);
  });
  it('плавный уход в конце по fadeOut номера', async () => {
    const { deck, made } = setup();
    await deck.start({ file: 'a', fadeOut: 4 });
    made[0].currentTime = 97; deck.tick();
    expect(deck.state.fading).toBe(true);
  });
  it('громкость трека и номера правятся параметрами', async () => {
    const { deck } = setup();
    await deck.start({ file: 'a', level: 80 });
    deck.setTrim(50); expect(deck.trim.gain.target).toBeCloseTo(0.25);
  });
  it('нормализация: поправка в дБ ложится на узел места; на ходу меняется', async () => {
    const { deck, c } = setup();
    await deck.start({ file: 'a', normDb: -6 });
    expect(c.gains.some((g) => Math.abs(g.gain.value - 0.501) < 0.002)).toBe(true);
    deck.setNorm(3); expect(c.gains.some((g) => g.gain.target && Math.abs(g.gain.target - 1.413) < 0.002)).toBe(true);
  });
});
