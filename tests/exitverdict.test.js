// Причина прошлого закрытия (Android): падение, система закрыла на экране (память), закрыл человек или фон
import { describe, it, expect, vi } from 'vitest';
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' }, registerPlugin: () => ({}) }));
globalThis.document ??= { documentElement: {}, addEventListener() {}, createElement: () => ({ style: {} }), querySelector: () => null };
globalThis.navigator ??= { language: 'ru' };
const { exitVerdict } = await import('../src/core/screens/report.js');

describe('exitVerdict', () => {
  it('падение кода и «не отвечает» — вылет', () => {
    expect(exitVerdict({ reason: 'crash', kind: 'native', importance: 100 }).kind).toBe('crash');
    expect(exitVerdict({ reason: 'crash', kind: 'anr', importance: 100 }).kind).toBe('crash');
  });
  it('нехватка памяти на экране — система закрыла', () => {
    const v = exitVerdict({ reason: 'other', kind: 'lowmem', importance: 100, pss: 1600 * 1024 });
    expect(v.kind).toBe('oom');
    expect(v.text).toMatch(/1600 МБ/);
  });
  it('смахнули из недавних или были в фоне — не вылет', () => {
    expect(exitVerdict({ reason: 'other', kind: 'other', desc: 'remove task', importance: 100 }).kind).toBe('closed');
    expect(exitVerdict({ reason: 'other', kind: 'user', importance: 100 }).kind).toBe('closed');
    expect(exitVerdict({ reason: 'other', kind: 'signal', importance: 400 }).kind).toBe('closed');
  });
});
