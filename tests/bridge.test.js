// Мост с главным экраном Ἐλάχιστον (docs/launcher-bridge.md): состояние по договору, версия 1
import { describe, it, expect } from 'vitest';

globalThis.navigator ??= { language: 'ru' };
const { bridgeState } = await import('../src/core/bridge.js');

describe('мост с главным экраном', () => {
  const now = new Date(2026, 9, 28, 12).getTime(); // среда
  const app = (o = {}) => ({
    store: { state: { settings: { goalMin: 300, church: false, ...(o.settings || {}) } }, songById: (id) => (id === 's1' ? { id, title: 'Песня' } : null), sessions: () => o.sessions || [] },
    active: o.active || null,
    player: o.player || null,
  });
  it('без занятия и звука — неделя и цель', () => {
    const s = bridgeState(app({ sessions: [{ start: now - 3600e3, dur: 1800 }] }), now);
    expect(s).toMatchObject({ v: 1, session: null, playing: false, sounding: false, what: '', reading: null });
    expect(s.week.total).toBe(1800); expect(s.week.goal).toBe(18000); expect(s.week.per[2]).toBe(1800);
  });
  it('занятие с песней и звук', () => {
    const s = bridgeState(app({ active: { type: 'song', songId: 's1', startedAt: now - 60e3 }, player: { paused: false, sources: () => [{ name: 'Метроном' }, { name: 'Пэды' }] } }), now);
    expect(s.session).toEqual({ start: now - 60e3, title: 'Песня', mode: 'song' });
    expect(s.playing).toBe(true); expect(s.sounding).toBe(true); expect(s.what).toBe('Метроном · Пэды');
  });
  it('пауза — звук есть, но не играет; свободная практика', () => {
    const s = bridgeState(app({ active: { type: 'free', startedAt: now }, player: { paused: true, sources: () => [{ name: 'Метроном' }] } }), now);
    expect(s.session.mode).toBe('free'); expect(s.playing).toBe(false); expect(s.sounding).toBe(true);
  });
});
