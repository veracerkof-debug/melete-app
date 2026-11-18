// Витрина: звуки, шумы и мелодии для пульта синтезируются сами; данные пульта и проект студии собираются без файлов в репозитории
import { describe, it, expect } from 'vitest';
import { SOUNDS, melodyTrack, wavBlob, SR, showData, studioSong } from '../src/showcase/showdemo.js';
import { projectFromSong } from '../src/music/project.js';

const stats = (b) => { let m = 0, bad = 0; for (const v of b) { if (!Number.isFinite(v)) bad++; m = Math.max(m, Math.abs(v)); } return { peak: m, bad }; };

describe('витрина: звуки пульта', () => {
  it('каждый звук — конечные отсчёты, не тишина, не выше полной шкалы', () => {
    for (const [k, fn] of Object.entries(SOUNDS)) {
      const b = fn(), s = stats(b);
      expect(b.length, k).toBeGreaterThan(SR * 0.5); expect(s.bad, k).toBe(0); expect(s.peak, k).toBeGreaterThan(0.3); expect(s.peak, k).toBeLessThanOrEqual(0.9001);
    }
  });
  it('шумы зациклены: шов не заметнее обычного шага отсчётов (нет щелчка)', () => {
    for (const k of ['hall', 'rain', 'wind']) {
      const b = SOUNDS[k](), n = b.length; let step = 0; for (let i = 1; i < n; i++) step += Math.abs(b[i] - b[i - 1]); step /= n - 1;
      expect(Math.abs(b[0] - b[n - 1]), k).toBeLessThan(Math.max(0.05, step * 8));
    }
  });
  it('мелодии из классики: ода, бубенцы, мерцай', () => {
    for (const id of ['ode', 'jingle', 'twinkle']) { const b = melodyTrack(id), s = stats(b); expect(b.length / SR, id).toBeGreaterThan(10); expect(s.bad).toBe(0); expect(s.peak).toBeGreaterThan(0.5); }
    expect(melodyTrack('нет')).toBeNull();
  });
  it('WAV: заголовок и размер', async () => {
    const w = wavBlob(new Float32Array(SR)), u = new Uint8Array(await w.arrayBuffer());
    expect(String.fromCharCode(...u.slice(0, 4))).toBe('RIFF'); expect(w.size).toBe(44 + SR * 2);
  });
});

describe('витрина: данные пульта и студия', () => {
  const f = {}; ['roll', 'fanfare', 'gong', 'applause', 'tick', 'right', 'wrong', 'hall', 'rain', 'wind', 'n_hall', 'n_rain', 'n_wind', 't_ode', 't_jingle', 't_twinkle'].forEach((k) => { f[k] = 'id-' + k; });
  it('выступление с номерами, метками и фоном; банки с падами; закреплённые «Верно» и «Неверно»', () => {
    const s = showData(f, 'ru', new Date(2026, 10, 15, 12, 0).getTime()), e = s.events[0];
    expect(e.title).toBe('День студента'); expect(e.numbers.length).toBe(7); expect(new Date(e.start).getHours()).toBe(19);
    expect(e.numbers.filter((n) => n.kind === 'track').length).toBe(3); expect(e.numbers[1].cues.length).toBeGreaterThan(0);
    expect(e.numbers.some((n) => n.bed && n.bed.pad)).toBe(true);
    expect(s.noises.length).toBe(3); expect(s.noises.every((x) => x.file)).toBe(true);
    const dock = s.banks.find((b) => b.pinned); expect(dock.pads.filter(Boolean).map((p) => p.name)).toEqual(['Верно', 'Неверно']);
    expect(s.banks.find((b) => !b.pinned).pads.filter((p) => p && p.file).length).toBeGreaterThanOrEqual(5);
    expect(e.numbers[3].note).toContain('Верно');
  });
  it('все языки дают названия', () => { for (const l of ['ru', 'en', 'uz']) expect(showData(f, l).events[0].title).toBeTruthy(); });
  it('проект студии из мелодии: три дорожки (мелодия, бас, ударные)', () => {
    const p = projectFromSong(studioSong('ru'));
    expect(p.tracks.length).toBe(3); expect(p.tracks.some((t) => t.kind === 'drums')).toBe(true); expect(p.clips.length).toBeGreaterThanOrEqual(3);
  });
});
