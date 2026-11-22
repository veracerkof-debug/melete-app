// Студия: каталог рисунков (music/studioloops.js) — подгонка под аккорды, дорожки, размеры, целостность проекта
import { describe, it, expect } from 'vitest';
import { newProject, normalizeProject, songNotes, chordNotes } from '../src/music/project.js';
import { LOOPS, FAMILIES, loopById, loopsOf, placeLoop, chordsTimeline, spanFrom, buildLoop, loopShape, progLabel } from '../src/music/studioloops.js';

const proj = (patch) => normalizeProject(newProject(patch));
const pcs = (m) => ((m % 12) + 12) % 12;

describe('каталог', () => {
  it('идентификаторы уникальны, у каждой семьи есть рисунки', () => {
    expect(new Set(LOOPS.map((l) => l.id)).size).toBe(LOOPS.length);
    FAMILIES.forEach((f) => expect(loopsOf(f).length).toBeGreaterThan(0));
    expect(LOOPS.length).toBeGreaterThanOrEqual(20);
  });
  it('картинка плитки есть у всех, кроме аккордов', () => {
    LOOPS.forEach((l) => { const s = loopShape(l); if (l.fam === 'chords') expect(progLabel(proj(), l)).toMatch(/\w/); else expect(s.cells.length).toBeGreaterThan(0); });
  });
});

describe('постановка', () => {
  it('каждый рисунок встаёт в пустой проект и проходит нормализацию без потерь', () => {
    LOOPS.forEach((l) => { [3, 4, 6].forEach((num) => {
      const p = proj({ num }), r = placeLoop(p, l, 0);
      expect(r, l.id + '/' + num).toBeTruthy();
      const n = p.clips.length; normalizeProject(p);
      expect(p.clips.length).toBe(n);
      expect(r.clip.len).toBeGreaterThan(0);
    }); });
  });
  it('аккорды ложатся в аккордовую дорожку, поп I V vi IV в до мажоре', () => {
    const p = proj(), r = placeLoop(p, loopById('pop'), 0);
    expect(r.tr.kind).toBe('chords');
    expect(r.clip.data.chords.map((c) => [c.pc, c.type])).toEqual([[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']]);
    expect(chordsTimeline(p).length).toBe(4);
  });
  it('бас идёт по корням аккордов проекта и подходит к следующему', () => {
    const p = proj(); placeLoop(p, loopById('pop'), 0);
    const r = placeLoop(p, loopById('walking'), 0), ns = r.clip.data.notes;
    expect(r.clip.len).toBe(16); // закрыл все аккорды целиком
    const at = (t) => ns.find((n) => Math.abs(n.t - t) < 1e-6);
    expect(pcs(at(0).m)).toBe(0); expect(pcs(at(4).m)).toBe(7); expect(pcs(at(8).m)).toBe(9); expect(pcs(at(12).m)).toBe(5);
    expect(pcs(at(3).m)).toBe(6); // последняя доля такта — на полтона ниже корня G
    ns.forEach((n) => { expect(n.m).toBeGreaterThanOrEqual(24); expect(n.m).toBeLessThan(52); });
  });
  it('клавиши и пэд — звуки аккорда в своей тесситуре, смена аккорда режет ноты', () => {
    const p = proj(); placeLoop(p, loopById('pop'), 0);
    const k = placeLoop(p, loopById('block'), 0), c0 = chordNotes(0, 'maj').map((m) => m % 12);
    const first = k.clip.data.notes.filter((n) => n.t === 0).map((n) => pcs(n.m)).sort((a, b) => a - b);
    expect(first).toEqual([...new Set(c0)].sort((a, b) => a - b));
    k.clip.data.notes.forEach((n) => expect(n.t + n.d).toBeLessThanOrEqual(Math.floor(n.t / 4) * 4 + 4 + 1e-6)); // не переходит границу аккорда
    const pad = placeLoop(p, loopById('warm'), 0);
    expect(pad.tr.role).toBe('pad');
    expect(new Set(pad.clip.data.notes.map((n) => n.t))).toEqual(new Set([0, 4, 8, 12]));
  });
  it('нет аккордов — от тоники тональности (ля минор: бас на ля)', () => {
    const p = proj({ key: { pc: 9, minor: true } }), r = placeLoop(p, loopById('rootEights'), 0);
    expect(r.clip.data.notes.filter((n) => n.t === 0).every((n) => pcs(n.m) === 9)).toBe(true);
    expect(r.clip.len).toBe(8);
  });
  it('занятая дорожка — следующая свободная, иначе новая; роль запоминается', () => {
    const p = proj(), a = placeLoop(p, loopById('funk'), 0), b = placeLoop(p, loopById('funk'), 0);
    expect(a.fresh).toBe(false); // готовая дорожка баса из нового проекта
    expect(b.fresh).toBe(true); expect(b.tr.role).toBe('bass'); expect(b.tr.id).not.toBe(a.tr.id);
    const c = placeLoop(p, loopById('funk'), 8);
    expect(c.tr.id).toBe(a.tr.id); // на другом месте первая дорожка свободна
    normalizeProject(p); expect(p.tracks.find((t) => t.id === b.tr.id).role).toBe('bass');
  });
  it('ударные: по кругу, на всю протяжённость аккордов; размер 3/4 — 12 шагов в такте', () => {
    const p = proj(); placeLoop(p, loopById('pop'), 0);
    const d = placeLoop(p, loopById('rock'), 0);
    expect(d.clip.loop).toBe(true); expect(d.clip.len).toBe(16); expect(d.clip.data.bars).toBe(2);
    const q = proj({ num: 3 }), e = placeLoop(q, loopById('rock'), 0);
    Object.values(e.clip.data.steps).flat().forEach((i) => expect(i % 12).toBeLessThan(12));
    Object.values(e.clip.data.steps).flat().forEach((i) => expect(i).toBeLessThan(24));
  });
  it('играют: все ноты нового клипа попадают в песню', () => {
    const p = proj(); placeLoop(p, loopById('pop'), 0); placeLoop(p, loopById('floor'), 0); placeLoop(p, loopById('arp'), 0);
    expect(songNotes(p).length).toBeGreaterThan(100);
  });
  it('на такте с аккордами позади и пустом — span считается от аккордов', () => {
    const p = proj(); placeLoop(p, loopById('pop'), 4);
    expect(spanFrom(p, loopById('warm'), 4)).toBe(16); // от такта 2: 3 аккорда подряд = 12 долей, но не короче самого рисунка (4 такта)
    expect(spanFrom(p, loopById('walking'), 0)).toBe(16);
    expect(buildLoop(p, loopById('walking'), 0).len).toBe(16);
  });
});
