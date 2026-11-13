// Задержка выхода (src/audio/latency.js, DECISIONS 2026-11-14 «Вокал: задержка»): своя на каждый выход, умолчания, пределы.
import { describe, it, expect, beforeEach } from 'vitest';
import { latencyNow, setLatency, DEFAULT_MS } from '../src/audio/latency.js';

const mem = {};
globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };

describe('задержка по выходу', () => {
  beforeEach(() => { Object.keys(mem).forEach((k) => delete mem[k]); });
  it('без замера — умолчание выхода', () => {
    expect(latencyNow('bt')).toEqual({ ms: DEFAULT_MS.bt, kind: 'bt', measured: false });
    expect(latencyNow('wired').ms).toBe(DEFAULT_MS.wired);
  });
  it('замер хранится отдельно для каждого выхода, в пределах 0…800, сброс — к умолчанию', () => {
    setLatency(180, 'bt'); setLatency(-5, 'wired');
    expect(latencyNow('bt')).toEqual({ ms: 180, kind: 'bt', measured: true });
    expect(latencyNow('wired').ms).toBe(0);
    expect(latencyNow('phone').measured).toBe(false);
    setLatency(5000, 'phone'); expect(latencyNow('phone').ms).toBe(800);
    setLatency(null, 'bt'); expect(latencyNow('bt')).toEqual({ ms: DEFAULT_MS.bt, kind: 'bt', measured: false });
  });
});
