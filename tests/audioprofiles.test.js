import { describe, it, expect } from 'vitest';
import { capture, restore, save, forKey, normalize, remove, PROFILES_MAX } from '../src/audio/profiles.js';
import { createMixer } from '../src/audio/mixer.js';

const mk = () => ({ metro: 1, piano: 0.9, drone: 1, audio: 1, master: 1, mute: {}, fx: {}, mode: 'smooth', perf: 'full' });
const rec = () => { const calls = []; const m = { setMaster: (v) => calls.push(['master', v]), set: (b, v) => calls.push(['set', b, v]), toggleMute: (b) => calls.push(['mute', b]), setFx: (b, p) => calls.push(['fx', b, p.mode]) }; return { m, calls }; };

describe('профили вывода', () => {
  it('снимок и восстановление: только изменившиеся значения, только через микшер', () => {
    const mx = mk(); mx.piano = 0.5; mx.master = 0.7; mx.mute.metro = true;
    const snap = capture(mx);
    const mx2 = mk(), { m, calls } = rec();
    const n = restore(m, mx2, snap);
    expect(n).toBe(calls.length); expect(calls).toContainEqual(['master', 0.7]); expect(calls).toContainEqual(['set', 'piano', 0.5]); expect(calls).toContainEqual(['mute', 'metro']);
    expect(calls.some((c) => c[1] === 'drone')).toBe(false); // не менялось — не трогаем
    expect(restore(rec().m, mx, snap)).toBe(0); // уже так — ничего
  });
  it('эффекты (эквалайзер) шины переносятся', () => {
    const mx = mk(); mx.fx.piano = { mode: 'adv', adv: [{ type: 'peaking', f: 400, g: 3 }] };
    const snap = capture(mx), { m, calls } = rec();
    restore(m, mk(), snap); expect(calls).toContainEqual(['fx', 'piano', 'adv']);
  });
  it('профиль по устройству: создаётся, обновляется, ищется по ключу, удаляется; предел', () => {
    const P = normalize(null), mx = mk();
    const a = save(P, { key: 'bt:jbl', label: 'JBL Go', name: 'Колонка' }, mx); expect(forKey(P, 'bt:jbl')).toBe(a);
    mx.piano = 0.3; const b = save(P, { key: 'bt:jbl', label: 'JBL Go' }, mx); expect(b).toBe(a); expect(P.list.length).toBe(1); expect(b.snap.levels.piano).toBe(0.3);
    remove(P, a.id); expect(P.list.length).toBe(0);
    for (let i = 0; i < PROFILES_MAX; i++) save(P, { key: 'k' + i }, mx);
    expect(save(P, { key: 'extra' }, mx)).toBe(null);
  });
  it('битые данные не ломают загрузку', () => {
    expect(normalize({ list: [null, { id: 'x' }, { id: 'a', snap: { master: 9, levels: { piano: 'x', metro: 2 } }, key: 'k' }], auto: false }).list[0].snap).toEqual({ master: 1, levels: { metro: 1.5 }, mute: {}, fx: {} });
    expect(normalize('мусор').auto).toBe(true);
  });
  it('на настоящем микшере без AudioContext: применение не падает', () => {
    const mx = mk(), mixer = createMixer(mx, {});
    const snap = capture(mx); mx.piano = 0.2;
    expect(() => restore(mixer, mx, snap)).not.toThrow(); expect(mx.piano).toBeCloseTo(0.9, 1);
  });
});
