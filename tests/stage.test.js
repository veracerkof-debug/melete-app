import { describe, it, expect } from 'vitest';
import { itemOf, setItem, moveSong, songKey, barSec, resumeOk, tracksOf, chordsAbove } from '../src/core/stage.js';
import { lyricsHTML } from '../src/music/lyrics.js';

const song = { id: 's1', title: 'Песня', key: 'G', targetBpm: 72, notes: '[G]Слово [C]ещё' };
const files = [{ id: 'f1', name: 'минус.mp3', songs: ['s1'] }, { id: 'f2', kind: 'tab', songs: ['s1'] }, { id: 'f3', songs: ['x'] }];

describe('сет-лист', () => {
  it('настройки пункта по умолчанию — из песни', () => {
    const it0 = itemOf({}, song, files);
    expect([it0.bpm, it0.track, it0.click, it0.count, it0.pad, it0.text]).toEqual([72, 'f1', false, true, false, true]);
    const it1 = itemOf({}, song, []);
    expect([it1.click, it1.pad, it1.count]).toEqual([true, true, false]);
    expect(tracksOf(files, 's1').map((r) => r.id)).toEqual(['f1']);
  });
  it('свои настройки и сдвиг тональности', () => {
    const ev = { songs: ['s1'] };
    setItem(ev, 's1', { bpm: 500, tr: 2, track: '', pad: true });
    const it = itemOf(ev, song, files);
    expect([it.bpm, it.tr, it.track, it.pad, it.key.pc]).toEqual([300, 2, '', true, 9]); // G + 2 = A
    setItem(ev, 's1', { bpm: null });
    expect(itemOf(ev, song, files).bpm).toBe(72);
  });
  it('порядок, тональность по тексту, такт, возврат на сцену', () => {
    const ev = { songs: ['a', 'b', 'c'] };
    moveSong(ev, 2, -1);
    expect(ev.songs).toEqual(['a', 'c', 'b']);
    moveSong(ev, 0, -1);
    expect(ev.songs).toEqual(['a', 'c', 'b']);
    expect(songKey({ notes: '[Am]a [Dm]b [E]c [Am]d' }).minor).toBe(true);
    expect(songKey({})).toBe(null);
    expect(barSec(120, 4)).toBe(2);
    expect(resumeOk({ ev: 'e1', i: 2, at: Date.now() })).toBe(true);
    expect(resumeOk({ ev: 'e1', i: 2, at: Date.now() - 7 * 3600000 })).toBe(false);
  });
  it('аккорды над словами', () => {
    const [c, w] = chordsAbove('[G]О Господь мой [C]Бог').split('\n');
    expect([c.indexOf('G'), c.indexOf('C')]).toEqual([w.indexOf('О'), w.indexOf('Бог')]);
    expect(chordsAbove('[Am][F]Слово')).toBe('Am F\n   Слово'); // слово — под последним аккордом
    expect(chordsAbove('просто строка')).toBe('просто строка');
    expect(lyricsHTML(chordsAbove('[G]Слово'), 2)).toContain('<b class="chd">A</b>');
  });
});

// Капо (ночь 22.10.2026): у песни — song.capo, в сет-листе — своё; аккорды формами ниже, звучит та же тональность
import { capoClamp, CAPO_MAX } from '../src/core/stage.js';
describe('капо', () => {
  it('по умолчанию — из песни, в пределах 0…7; своё в пункте сет-листа', () => {
    expect(itemOf({}, { ...song, capo: 3 }, []).capo).toBe(3);
    expect(itemOf({}, { ...song, capo: 12 }, []).capo).toBe(CAPO_MAX);
    expect(itemOf({}, song, []).capo).toBe(0);
    const ev = { songs: ['s1'] };
    setItem(ev, 's1', { capo: 2 });
    expect(itemOf(ev, { ...song, capo: 5 }, []).capo).toBe(2);
    expect(capoClamp(-1)).toBe(0); expect(capoClamp('4')).toBe(4);
  });
  it('формы: капо 3 в G показывает E-формы, а звучит G', () => {
    const it = itemOf({}, { ...song, capo: 3 }, []);
    const html = lyricsHTML(chordsAbove(song.notes), it.tr - it.capo, it.srcKey);
    expect(html).toMatch(/>E</); expect(html).toMatch(/>A</); // G→E, C→A
    expect(it.key.pc).toBe(7); // звучит по-прежнему G
  });
});

// Автопрокрутка и длительность (ночь 22.10.2026)
describe('автопрокрутка', () => {
  it('включена по умолчанию; длительность — из минусовки, иначе своя', () => {
    const it0 = itemOf({}, song, [{ id: 'f1', name: 'минус.mp3', songs: ['s1'], dur: 212.4 }]);
    expect([it0.scroll, it0.dur]).toEqual([true, 212]);
    const ev = { songs: ['s1'] };
    setItem(ev, 's1', { scroll: false, dur: 185, track: '' });
    const it1 = itemOf(ev, song, []);
    expect([it1.scroll, it1.dur]).toEqual([false, 185]);
    setItem(ev, 's1', { dur: 99999 });
    expect(itemOf(ev, song, []).dur).toBe(3600);
  });
});

import { stageFont } from '../src/core/screens/stage.js';
describe('сцена: размер текста', () => {
  it('куплет целиком по высоте, строка по ширине, не больше A+', () => {
    const v = 'a\nb\nc\nd\n\ne\nf';
    expect(stageFont(v, 1000, 400, 100, 1.5)).toBe(Math.floor(400 / (4 * 1.5)));
    expect(stageFont(v, 1000, 4000, 30, 1.5)).toBe(30);
    expect(stageFont('x'.repeat(100), 1000, 4000, 64)).toBe(Math.floor(1000 / 61));
    expect(stageFont('x'.repeat(100), 300, 4000, 64)).toBe(12);
    expect(stageFont(Array(60).fill('строка').join('\n'), 1000, 500, 40, 1.5)).toBe(16);
  });
});

// Рабочая сцена, темп по касанию, барабанные пэды (слово автора 22.11.2026)
import { workEvent, toggleWorkSong, tapTempo, WORK } from '../src/core/stage.js';
import { echoTime, PADS } from '../src/audio/stagepads.js';
describe('рабочая сцена и пэды', () => {
  it('рабочий «событие»: хранится в настройках, песни добавляются и убираются, лишнее отбрасывается', () => {
    const st = {}, songs = { a: { id: 'a' }, b: { id: 'b' } }, by = (id) => songs[id];
    const w = workEvent(st);
    expect(w.id).toBe(WORK); expect(st.stageWork).toBe(w);
    expect(toggleWorkSong(w, 'a', by)).toBe(true); toggleWorkSong(w, 'b', by);
    expect(w.songs).toEqual(['a', 'b']);
    expect(toggleWorkSong(w, 'a', by)).toBe(false); expect(w.songs).toEqual(['b']);
    expect(toggleWorkSong(w, 'нет', by)).toBe(false); expect(w.songs).toEqual(['b']);
    w.songs.push('удалена'); toggleWorkSong(w, 'b', by); expect(w.songs).toEqual([]);
  });
  it('темп по касанию: интервал → bpm, пауза начинает заново', () => {
    let r = tapTempo([], 0); expect(r.bpm).toBeNull();
    r = tapTempo(r.times, 500); expect(r.bpm).toBe(120);
    r = tapTempo(r.times, 1000); r = tapTempo(r.times, 1500); expect(r.bpm).toBe(120);
    r = tapTempo(r.times, 6000); expect(r.bpm).toBeNull(); // пауза > 2,5 с — счёт заново
    r = tapTempo(r.times, 6667); expect(r.bpm).toBeGreaterThan(85); expect(r.bpm).toBeLessThan(95); // 667 мс ≈ 90 bpm
  });
  it('эхо — пунктирная восьмая от темпа, в пределах 0,12…1,2 с; у пэдов осмысленные посылы', () => {
    expect(echoTime(120)).toBeCloseTo(0.375, 3); expect(echoTime(60)).toBeCloseTo(0.75, 3);
    expect(echoTime(20)).toBe(1.2); expect(echoTime(400)).toBe(0.12); expect(echoTime(0)).toBeCloseTo(0.5, 2);
    expect(PADS).toHaveLength(8);
    expect(PADS.find((p) => p.id === 'kick').room).toBeLessThan(PADS.find((p) => p.id === 'kickw').room); // сухая бочка и «мокрая»
    expect(new Set(PADS.map((p) => p.id)).size).toBe(8);
  });
});
