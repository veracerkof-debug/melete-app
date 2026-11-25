import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { CHORDS, SCALES, INTERVALS, harmonize, rootN, scaleById, parseChord } from '../src/modules/book/book/engine.js';
import { createLabs } from '../src/modules/book/book/labs.js';
import { chapterHTML, fill, PARTS, ordered } from '../src/modules/book/book/reader.js';
import { LESSONS, PATH, PATHS, lessonById, INSTS } from '../src/modules/book/book/lessons.js';
import { PIECES, tabOf, shiftFor } from '../src/modules/book/book/pieces.js';
import { parseMel } from '../src/modules/book/book/labs1.js';
import { durOf } from '../src/modules/book/book/score.js';
import ru from '../src/modules/book/book/lang/ru/index.js';
import uz from '../src/modules/book/book/lang/uz/index.js';
import en from '../src/modules/book/book/lang/en/index.js';

vi.mock('../src/modules/book/book/book.css', () => ({}));
const LANGS = { ru, uz, en };
// Ключи, которые схемы и оболочка спрашивают у языкового файла
const src = ['labs.js', 'labs1.js', 'labs2.js', 'labs3.js', 'labs4.js', 'labs5.js', 'labs6.js', 'reader.js'].map((f) => readFileSync('src/modules/book/book/' + f, 'utf8')).join('\n');
const used = new Set();
const T = (k) => { used.add(k); return 'x'; };
const snd = new Proxy({}, { get: () => () => {} });

describe('учебник: движок', () => {
  it('гармонизация E♭ мажора', () => { expect(harmonize(rootN('E♭'), scaleById('ionian')).map((h) => h.sym).join(' ')).toBe('E♭maj7 Fm7 Gm7 A♭maj7 B♭7 Cm7 Dm7♭5'); });
  it('разбор символов', () => { expect(['Dm7', 'G7alt', 'F#ø', 'Eb°7', 'Bbmaj7'].map((s) => parseChord(s).fam)).toEqual(['min', 'dom', 'hdim', 'dim', 'maj']); });
});

describe('учебник: все схемы рисуются и отвечают на действия, все строки на месте', () => {
  for (const [code, L] of Object.entries(LANGS)) {
    it(code + ': схемы', () => {
      const LABS = createLabs({ T: (k, v) => { used.add(k); if (!(k in L.S)) throw new Error(code + ': нет строки ' + k); return fill(L.S[k], v); }, L, snd });
      for (const [id, lab] of Object.entries(LABS)) {
        const st = JSON.parse(JSON.stringify(lab.st));
        const html = lab.render(st);
        expect(html, id).not.toMatch(/undefined|NaN/);
        // нажать все кнопки схемы
        for (const a of [...html.matchAll(/data-a="([^"]+)"/g)].map((m) => m[1]).slice(0, 40)) { lab.on(st, a, { querySelectorAll: () => [] }); expect(lab.render(st), id + ' ' + a).not.toMatch(/undefined|NaN/); }
      }
    });
    it(code + ': названия и термины полные', () => {
      CHORDS.forEach((c) => expect(L.CHN[c.id], code + ' аккорд ' + c.id).toBeTruthy());
      SCALES.forEach((s) => { expect(L.SCN[s.id], code + ' гамма ' + s.id).toBeTruthy(); expect(L.SG[s.g]).toBeTruthy(); });
      INTERVALS.forEach((x) => expect(L.IV[x.k], code + ' интервал ' + x.k).toBeTruthy());
      ['perf', 'imperf', 'ctx', 'diss'].forEach((k) => expect(L.CONS[k]).toBeTruthy());
      expect(Object.keys(L.TERMS).sort()).toEqual(Object.keys(ru.TERMS).sort());
      expect(Object.keys(L.S).sort()).toEqual(Object.keys(ru.S).sort());
    });
    it(code + ': главы — те же, ссылки на термины и схемы существуют', () => {
      expect(L.CH.map((c) => c.id)).toEqual(ru.CH.map((c) => c.id));
      // каждая глава — в одной из частей; источники глав — из SRC
      L.CH.forEach((c) => expect(PARTS.flat(), c.id).toContain(c.id));
      expect(ordered(L).length).toBe(L.CH.length);
      L.CH.forEach((c) => (c.src || '').split(',').filter(Boolean).forEach((k) => expect(L.SRC[k.trim()], code + ' ' + c.id + ' источник ' + k).toBeTruthy()));
      const LABS = createLabs({ T, L, snd });
      for (const c of L.CH) {
        for (const m of c.h.matchAll(/\[\[([a-zA-Z0-9]+)\|/g)) expect(L.TERMS[m[1]], code + ' ' + c.id + ' термин ' + m[1]).toBeTruthy();
        for (const m of c.h.matchAll(/\{\{lab:([a-z0-9]+)\}\}/g)) expect(LABS[m[1]], code + ' ' + c.id + ' схема ' + m[1]).toBeTruthy();
        expect(chapterHTML(c, L.TERMS)).not.toMatch(/\[\[|\{\{/);
        // те же схемы в том же порядке, что в русском
        expect([...c.h.matchAll(/\{\{lab:([a-z0-9]+)\}\}/g)].map((m) => m[1])).toEqual([...ru.CH.find((x) => x.id === c.id).h.matchAll(/\{\{lab:([a-z0-9]+)\}\}/g)].map((m) => m[1]));
      }
      for (const [, , ch] of Object.values(L.TERMS)) expect(L.CH.some((c) => c.id === ch)).toBe(true);
    });
  }
  it('в русском файле есть все строки, которые спрашивает код', () => {
    const keys = [...src.matchAll(/T\('([a-zA-Z0-9.]+)'(?!\s*\+)/g)].map((m) => m[1]);
    keys.forEach((k) => expect(ru.S[k], k).toBeDefined());
  });
});

describe('учебник: уроки', () => {
  for (const [code, L] of Object.entries(LANGS)) {
    it(code + ': уроки делят главы, у каждого — название и упражнения, проверки рисуются', () => {
      const T = (k, v) => { if (!(k in L.S)) throw new Error(code + ': нет строки ' + k); return fill(L.S[k], v); };
      const LABS = createLabs({ T, L, snd });
      for (const [ch, ls] of Object.entries(LESSONS)) {
        const c = L.CH.find((x) => x.id === ch); expect(c, code + ' глава ' + ch).toBeTruthy();
        // куски главы: вступление + по подзаголовкам; столько же, сколько в русском
        const n = (c.h.match(/<h3>/g) || []).length + 1, nru = (ru.CH.find((x) => x.id === ch).h.match(/<h3>/g) || []).length + 1;
        expect(n, code + ' ' + ch + ' подзаголовки').toBe(nru);
        // каждый кусок — ровно в одном уроке, по порядку
        expect(ls.flatMap((l) => l.secs), ch).toEqual([...Array(n).keys()]);
        for (const l of ls) {
          T('ls.' + l.id);
          for (const x of l.ex) {
            expect(LABS[x.lab], l.id + ' ' + x.lab).toBeTruthy();
            for (const inst of INSTS) {
              if (x.only && !x.only.includes(inst)) continue;
              const st = Object.assign(JSON.parse(JSON.stringify(LABS[x.lab].st)), x.cfg, { inst });
              expect(LABS[x.lab].render(st), l.id + ' ' + x.lab + ' ' + inst).not.toMatch(/undefined|NaN/);
            }
          }
          // упражнения по инструменту: все три или ни одного
          const has = INSTS.filter((i) => !/^g\d+$/.test(l.id) || i === 'g').map((i) => ('lx.' + l.id + '.' + i) in L.S); // «Гитара с нуля» (g1…g9) — только гитара
          expect(has.every(Boolean) || !has.some(Boolean), code + ' ' + l.id + ' упражнения по инструментам').toBe(true);
        }
      }
      expect(PATH.length).toBe(20);
      PATH.forEach((id) => expect(lessonById(id), id).toBeTruthy());
    });
  }
});

describe('учебник: произведения и пути', () => {
  it('такты произведений полные (кроме затакта и последнего), аккордов — по числу тактов, табулатура строится', () => {
    for (const [id, pc] of Object.entries(PIECES)) {
      if (pc.arp) continue;
      const items = parseMel(pc.mel), bars = [[]];
      items.forEach((x) => { if (x.bar) bars.push([]); else bars[bars.length - 1].push(x); });
      if (!bars[bars.length - 1].length) bars.pop();
      const want = (pc.time[0] * 4) / pc.time[1], len = bars.map((b) => b.reduce((a, x) => a + durOf(x), 0));
      len.forEach((l, i) => { if (i === 0 || i === len.length - 1) expect(l, id + ' такт ' + (i + 1)).toBeLessThanOrEqual(want + 1e-9); else expect(l, id + ' такт ' + (i + 1)).toBeCloseTo(want, 6); });
      if (pc.ch) expect(pc.ch.length, id + ' аккорды по тактам').toBe(bars.length);
      for (const inst of ['g', 'b']) {
        const ms = items.filter((x) => !x.rest && !x.bar).map((x) => x.m), sh = shiftFor(pc, inst, ms);
        tabOf(ms.map((m) => m + sh), inst).forEach((c, i) => { expect(c, id + ' ' + inst + ' нота ' + i).toBeTruthy(); expect(c.f, id + ' ' + inst + ' лад').toBeLessThanOrEqual(15); });
      }
    }
  });
  it('пути: уроки существуют, без повторов внутри пути', () => {
    for (const [k, P] of Object.entries(PATHS)) { P.forEach((id) => expect(lessonById(id), k + ' ' + id).toBeTruthy()); expect(new Set(P).size, k).toBe(P.length); }
  });
});

describe('учебник: простые версии глав (средний уровень)', () => {
  for (const [code, L] of Object.entries(LANGS)) {
    it(code + ': те же подзаголовки и схемы, ссылки на термины существуют', () => {
      expect(Object.keys(L.CHM).sort(), code).toEqual(Object.keys(ru.CHM).sort());
      for (const [id, h] of Object.entries(L.CHM)) {
        const c = L.CH.find((x) => x.id === id); expect(c, id).toBeTruthy();
        const h3 = (x) => (x.match(/<h3>/g) || []).length, labs = (x) => [...x.matchAll(/\{\{lab:([a-z0-9]+)\}\}/g)].map((m) => m[1]);
        expect(h3(h), code + ' ' + id + ' подзаголовки').toBe(h3(c.h));
        // схемы — те же и в тех же кусках текста (уроки делят главу по подзаголовкам)
        expect(h.split('<h3>').map(labs), code + ' ' + id + ' схемы').toEqual(c.h.split('<h3>').map(labs));
        for (const m of h.matchAll(/\[\[([a-zA-Z0-9]+)\|/g)) expect(L.TERMS[m[1]], code + ' ' + id + ' термин ' + m[1]).toBeTruthy();
      }
    });
  }
});


describe('учебник: «Аккорд над басом» — аккорд стоит, бас меняется', () => {
  const L = LANGS.ru, mk = () => createLabs({ T: (k, v) => fill(L.S[k], v), L, snd });
  const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  it('C/E — первое обращение: звуки аккорда считаются от его корня', () => {
    const lab = mk().slashbass, st = { root: 'C', q: 'maj', i: 4 }, t = text(lab.render(st));
    expect(t).toContain('C/E'); expect(t).toContain('тот же аккорд, терция в басу'); expect(t).toContain('C = 1 · E = 3 · G = 5');
  });
  it('C/G — второе обращение; C7/B♭ — третье; C/D — чужой бас: ступени от баса ♭7 9 11', () => {
    const lab = mk().slashbass;
    expect(text(lab.render({ root: 'C', q: 'maj', i: 7 }))).toContain('квинта в басу');
    expect(text(lab.render({ root: 'C', q: '7', i: 10 }))).toContain('септима в басу');
    const t = text(lab.render({ root: 'C', q: 'maj', i: 2 }));
    expect(t).toContain('бас не из аккорда'); expect(t).toMatch(/♭7 9 11/);
  });
  it('все басы всех видов аккорда рисуются и играют', () => {
    const lab = mk().slashbass;
    for (const q of ['maj', 'min', '7', 'maj7']) for (let i = 0; i < 12; i++) { const st = { root: 'E♭', q, i }; expect(lab.render(st)).not.toMatch(/undefined|NaN/); lab.on(st, 'p'); lab.on(st, 'walk'); }
  });
  it('септаккорды над G: у каждой строки есть ступени от баса (Fmaj7/G → ♭7 9 11 13)', () => {
    const t = text(mk().slash7.render({ i: 0 }));
    expect(t).toContain('Ступени от G'); expect(t).toContain('♭7 9 11 13');
  });
});

describe('«Гитара с нуля»: схемы аккордов', () => {
  it('аккорды: лады и пальцы согласованы, звуки — от шести струн', async () => {
    const { GCH, midisOf, chordBoxSVG } = await import('../src/modules/book/book/labs9.js');
    for (const [name, c] of Object.entries(GCH)) {
      expect(c.f.length, name).toBe(6); expect(c.p.length, name).toBe(6);
      c.f.forEach((f, i) => { expect(f >= 0 && f <= 4 ? true : f === -1, name + i).toBe(true); expect((f > 0) === (c.p[i] > 0), name + ' палец ' + i).toBe(true); });
      expect(midisOf(name).length, name).toBeGreaterThanOrEqual(4);
      expect(chordBoxSVG(name, 'x'), name).not.toMatch(/NaN|undefined/);
    }
    expect(midisOf('C')).toEqual([48, 52, 55, 60, 64]); // C: до ми соль до ми
    expect(midisOf('G')).toEqual([43, 47, 50, 55, 59, 67]);
  });
});

describe('«Гитара с нуля»: барре, арпеджио, септаккорды', () => {
  it('барре рисуется полосой, пальцы согласованы; арпеджио — по струнам аккорда', async () => {
    const { GCH, chordBoxSVG, midisOf, guitarLabs } = await import('../src/modules/book/book/labs9.js');
    expect(chordBoxSVG('F', 'x')).toContain('class="barre"'); expect(chordBoxSVG('Bm', 'x')).toContain('class="barre"'); expect(chordBoxSVG('Dm7', 'x')).toContain('class="barre"');
    expect(chordBoxSVG('C', 'x')).not.toContain('class="barre"'); expect(chordBoxSVG('Am', 'x')).not.toContain('class="barre"');
    expect(midisOf('F')).toEqual([41, 48, 53, 57, 60, 65]); // F C F A C F
    expect(midisOf('Cmaj7')).toEqual([48, 52, 55, 59, 64]); // C E G B E
    const T = (k, o) => k + (o ? JSON.stringify(o) : ''), played = [];
    const L = guitarLabs({ T, snd: { hits: (l) => played.push(l) } });
    for (const lab of ['garp', 'garp6']) {
      const st = JSON.parse(JSON.stringify(L[lab].st)); expect(L[lab].render(st)).not.toMatch(/undefined|NaN/);
      ['Am', 'C', 'G', 'Em'].forEach((c) => { L[lab].on(st, 'c:' + c); ['p4', 'p6', 'p8'].forEach((p) => { L[lab].on(st, 's:' + p); expect(L[lab].render(st)).not.toMatch(/undefined|NaN/); L[lab].on(st, 'hear'); }); });
    }
    expect(played.length).toBe(24); played.forEach((l) => l.forEach((n) => expect(n[1][0]).toBeGreaterThanOrEqual(40)));
    ['gboxb', 'gboxf', 'gboxbm', 'gboxm7', 'gprogj'].forEach((k) => expect(L[k].render(JSON.parse(JSON.stringify(L[k].st)))).not.toMatch(/undefined|NaN/));
  });
});

describe('«Гитара с нуля»: гаммы на грифе', () => {
  it('ноты гамм сходятся с названиями; формулы шагов верны', async () => {
    const { guitarLabs } = await import('../src/modules/book/book/labs9.js');
    const played = [], T = (k) => k, L = guitarLabs({ T, snd: { hits: (l) => played.push(l) } });
    const mids = (lab, id) => { const st = JSON.parse(JSON.stringify(L[lab].st)); st.id = id; L[lab].on(st, 'hear'); return played.at(-1).map((x) => x[1][0]); };
    const up = (lab, id, n) => mids(lab, id).slice(0, n);
    expect(up('gscmaj', 'cmaj', 8)).toEqual([48, 50, 52, 53, 55, 57, 59, 60]);          // до мажор: C D E F G A B C
    expect(up('gscmaj', 'gmaj', 8)).toEqual([43, 45, 47, 48, 50, 52, 54, 55]);           // соль мажор: …F♯ G
    expect(up('gscmin', 'amin', 8)).toEqual([45, 47, 48, 50, 52, 53, 55, 57]);           // ля минор: A B C D E F G A
    expect(up('gscpent', 'apent', 12)).toEqual([45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72]); // A C D E G A C D E G A C
    expect(up('gscchrom', 'chrom', 13)).toEqual(Array.from({ length: 13 }, (_, i) => 40 + i)); // E2…E3 по полутонам
    const diff = (a) => a.slice(1).map((m, i) => m - a[i]);
    expect(diff(up('gscmaj', 'cmaj', 8))).toEqual([2, 2, 1, 2, 2, 2, 1]); // тон тон полутон тон тон тон полутон
    expect(diff(up('gscmin', 'amin', 8))).toEqual([2, 1, 2, 2, 1, 2, 2]);
    ['gscmaj', 'gscmin', 'gscpent', 'gscchrom'].forEach((k) => expect(L[k].render(JSON.parse(JSON.stringify(L[k].st)))).not.toMatch(/undefined|NaN/));
    expect(played.at(-1)).toBeTruthy();
  });
});
