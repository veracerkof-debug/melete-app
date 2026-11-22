// Хозяин микрофона (слово автора 22.11.2026): первая запись не прерывается, слух маскота уступает всем.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const track = () => { const l = {}; return { readyState: 'live', stop() { this.readyState = 'ended'; }, addEventListener(k, f) { l[k] = f; } }; };
let opened;
beforeEach(() => {
  vi.resetModules();
  opened = [];
  globalThis.window = globalThis.window || globalThis;
  globalThis.CustomEvent = globalThis.CustomEvent || class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
  if (!window.dispatchEvent) { window.dispatchEvent = () => true; window.addEventListener = () => {}; }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => { const tr = track(); opened.push(tr); return { getAudioTracks: () => [tr], getTracks: () => [tr] }; } } } });
});

describe('micowner', () => {
  it('вторая запись не начинается без вопроса, первая цела', async () => {
    const M = await import('../src/audio/micowner.js');
    const a = M.recBegin('voice');
    expect(a.ok).toBe(true);
    const b = M.recBegin('studio');
    expect(b.ok).toBe(false);
    expect(b.by.who).toBe('voice');
    expect(M.recBy().who).toBe('voice');
    a.end();
    expect(M.recBy()).toBe(null);
  });
  it('с вопросом: «да» — первая останавливается, вторая занимает; «нет» — первая идёт дальше', async () => {
    const M = await import('../src/audio/micowner.js');
    let stopped = 0;
    const a = M.recBegin('voice');
    M.setStopper('voice', async () => { stopped++; a.end(); }); // как модуль: останавливает и сохраняет, занятость снимается
    const no = await M.recBeginAsk('studio', async () => false);
    expect(no.ok).toBe(false); expect(stopped).toBe(0); expect(M.recBy().who).toBe('voice');
    const yes = await M.recBeginAsk('studio', async () => true);
    expect(yes.ok).toBe(true); expect(stopped).toBe(1); expect(M.recBy().who).toBe('studio');
  });
  it('пока идёт запись, другие инструменты получают busy и поток не открывается', async () => {
    const M = await import('../src/audio/micowner.js');
    M.recBegin('voice');
    await expect(M.micOpen({ audio: true }, 'tool')).rejects.toMatchObject({ reason: 'busy', by: 'voice' });
    expect(opened.length).toBe(0);
    const own = await M.micOpen({ audio: true }, 'voice'); // сама запись открывает свой поток
    expect(own).toBeTruthy();
  });
  it('слух маскота (soft) уступает инструменту и не открывается, пока занято', async () => {
    const M = await import('../src/audio/micowner.js');
    let yielded = 0, stream;
    stream = await M.micOpen({ audio: true }, 'mascot', { soft: true, yieldFn: () => { yielded++; stream.getTracks().forEach((t) => t.stop()); } });
    expect(M.micBusy('mascot')).toBe(false);
    await M.micOpen({ audio: true }, 'tool');
    expect(yielded).toBe(1);
    expect(M.micBusy('mascot')).toBe(true); // тюнер держит — маскот не откроется
  });
  it('поток освобождается, когда все дорожки остановлены', async () => {
    const M = await import('../src/audio/micowner.js');
    const s = await M.micOpen({ audio: true }, 'tool');
    expect(M.micBusy('x')).toBe(true);
    s.getTracks().forEach((t) => t.stop());
    expect(M.micBusy('x')).toBe(false);
  });
});
