// Правка партитуры (src/music/scoreedit.js): документ, ввод «поверх», такты, техники, размер, файл
import { it, expect, beforeAll } from 'vitest';
import * as at from '@coderline/alphatab';
import * as E from '../src/music/scoreedit.js';

beforeAll(() => E.useAlphaTab(at));
const L0 = { t: 0, b: 0, v: 0, i: 0 };
const sum = (doc, b = 0, t = 0, v = 0) => doc.tracks[t].staves[0].bars[b].voices[v].beats.reduce((a, x) => a + E.beatTicks(x), 0);
const guitar = () => E.newDoc({ inst: 'guitar', bars: 4 });

it('новый документ: гитара, 4 такта, каждый — целая пауза; строй, табы и ноты', () => {
  const d = guitar();
  expect(E.nBars(d)).toBe(4);
  expect(E.trackIsTab(d, 0)).toBe(true);
  expect(E.tuningOf(d, 0)).toEqual([64, 59, 55, 50, 45, 40]);
  for (let b = 0; b < 4; b++) expect(sum(d, b)).toBe(3840);
  const sc = E.toScore(d);
  expect(sc.masterBars.length).toBe(4);
  expect(sc.tracks[0].staves[0].showTablature).toBe(true);
});
it('пианино: нотный стан без струн; нота по высоте — октава и тон', () => {
  const d = E.newDoc({ inst: 'keys', bars: 2 });
  expect(E.trackIsTab(d, 0)).toBe(false);
  expect(E.noteFor(d, 0, 60)).toEqual({ octave: 5, tone: 0 });
  E.put(d, L0, { dur: 4, notes: [E.noteFor(d, 0, 64)] });
  const sc = E.toScore(d);
  expect(sc.tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0].realValue).toBe(64);
});
it('ввод поверх: четвертная нота в паузу — остаток такта паузами, такт полон', () => {
  const d = guitar();
  const r = E.put(d, L0, { dur: 4, notes: [{ string: 3, fret: 2 }] });
  expect(r.placed).toBe(960);
  const bs = d.tracks[0].staves[0].bars[0].voices[0].beats;
  expect(bs.length).toBe(3);
  expect(bs[0].notes[0].fret).toBe(2);
  expect(bs.slice(1).every(E.isRest)).toBe(true);
  expect(bs.slice(1).map(E.beatTicks)).toEqual([960, 1920]); // четверть + половинная: пауза «по сетке» (вторая доля, потом половина)
  expect(sum(d)).toBe(3840);
});
it('ввод: восьмые подряд, следом четвертная; длинная нота съедает следующие', () => {
  const d = guitar();
  let l = L0;
  for (const f of [0, 2, 3]) { E.put(d, l, { dur: 8, notes: [{ string: 4, fret: f }] }); l = E.next(d, l); }
  expect(l).toEqual({ t: 0, b: 0, v: 0, i: 3 });
  E.put(d, { ...L0, i: 1 }, { dur: 2, notes: [{ string: 4, fret: 5 }] }); // половинная с места 2-й восьмой: съела 3-ю
  const bs = d.tracks[0].staves[0].bars[0].voices[0].beats;
  expect(bs.map((x) => x.notes.length ? x.notes[0].fret : 'r')).toEqual([0, 5, 'r', 'r']); // остаток — паузы по сетке
  expect(sum(d)).toBe(3840);
});
it('не влезает в такт — укорачивается до остатка; курсор за последним ударом — новый такт', () => {
  const d = guitar();
  const l = { ...L0, i: 0 };
  E.put(d, l, { dur: 2, dots: 1, notes: [{ string: 1, fret: 1 }] }); // 3 четверти
  const l2 = E.next(d, l);
  expect(E.beatsOf(d, l2).length).toBeGreaterThan(0);
  const r = E.put(d, l2, { dur: 2, notes: [{ string: 1, fret: 3 }] }); // осталась 1 четверть
  expect(r.placed).toBe(960);
  expect(E.beatAt(d, l2).duration).toBe(4);
  const l3 = E.next(d, l2); // следующий такт
  expect(l3.b).toBe(1);
  const last = { ...L0, b: 3, i: 0 };
  E.put(d, last, { dur: 1, notes: [{ string: 2, fret: 0 }] });
  const l4 = E.next(d, last);
  expect(l4.b).toBe(4); expect(E.nBars(d)).toBe(5); // партитура выросла
  expect(sum(d, 4)).toBe(3840);
});
it('нота на той же струне заменяется, одинаковая — убирается; аккорд из двух струн', () => {
  const d = guitar();
  E.put(d, L0, { dur: 4, notes: [{ string: 2, fret: 1 }] });
  E.toggleNote(d, L0, { string: 3, fret: 2 });
  expect(E.beatAt(d, L0).notes.map((n) => n.string)).toEqual([2, 3]);
  E.toggleNote(d, L0, { string: 2, fret: 5 });
  expect(E.beatAt(d, L0).notes.find((n) => n.string === 2).fret).toBe(5);
  E.toggleNote(d, L0, { string: 2, fret: 5 });
  expect(E.beatAt(d, L0).notes.length).toBe(1);
});
it('длительность удара меняется с сохранением нот; ⌫ — нота в паузу той же длины', () => {
  const d = guitar();
  E.put(d, L0, { dur: 4, notes: [{ string: 5, fret: 7 }] });
  E.resize(d, L0, 8);
  const b = E.beatAt(d, L0);
  expect(b.duration).toBe(8); expect(b.notes[0].fret).toBe(7);
  expect(sum(d)).toBe(3840);
  E.clearBeat(d, L0);
  expect(E.isRest(E.beatAt(d, L0))).toBe(true);
  expect(E.beatAt(d, L0).duration).toBe(8);
});
it('триоль восьмых: тройка из трёх долей по 2/3, такт остаётся полным', () => {
  const d = guitar();
  let l = L0;
  for (let k = 0; k < 3; k++) { E.put(d, l, { dur: 8, tup: 3, notes: [{ string: 3, fret: k }] }); l = E.next(d, l); }
  const bs = d.tracks[0].staves[0].bars[0].voices[0].beats;
  expect(bs.slice(0, 3).map((x) => x.notes[0] && x.notes[0].fret)).toEqual([0, 1, 2]);
  expect(bs.slice(0, 3).reduce((a, x) => a + E.beatTicks(x), 0)).toBe(960); // три «триольные» восьмые = четверть
  expect(bs[0].tupletnumerator).toBe(3);
  expect(sum(d)).toBe(3840);
  expect(() => E.toScore(d)).not.toThrow();
  const bt = E.toScore(d).tracks[0].staves[0].bars[0].voices[0].beats;
  expect(bt[1].playbackStart).toBe(320); // вторая нота — на 1/3 четверти, а не на восьмой
});
it('техники: хаммер, слайд, бенд, глушение — признаки видны alphaTab; переключатель снимает', () => {
  const d = guitar();
  E.put(d, L0, { dur: 4, notes: [{ string: 3, fret: 3 }] });
  E.put(d, { ...L0, i: 1 }, { dur: 4, notes: [{ string: 3, fret: 5 }] });
  expect(E.toggleTech(d, L0, 'hp')).toBe(true);
  expect(E.techOn(d, L0, 'hp')).toBe(true);
  let sc = E.toScore(d), bs = sc.tracks[0].staves[0].bars[0].voices[0].beats;
  expect(bs[0].notes[0].isHammerPullOrigin).toBe(true);
  expect(bs[1].notes[0].isHammerPullDestination).toBe(true); // связь восстановлена
  E.toggleTech(d, L0, 'hp');
  E.toggleTech(d, L0, 'slide');
  E.toggleTech(d, { ...L0, i: 1 }, 'bend');
  E.toggleTech(d, { ...L0, i: 1 }, 'dead');
  sc = E.toScore(d); bs = sc.tracks[0].staves[0].bars[0].voices[0].beats;
  expect(bs[0].notes[0].slideOutType).toBe(2);
  expect(bs[1].notes[0].hasBend).toBe(true);
  expect(bs[1].notes[0].isDead).toBe(true);
  expect(E.toggleTech(d, { ...L0, i: 1 }, 'dead')).toBe(false);
});
it('лига: пауза после ноты — копия ноты с лигой; на ноте — признак', () => {
  const d = guitar();
  E.put(d, L0, { dur: 4, notes: [{ string: 2, fret: 3 }] });
  const l = { ...L0, i: 1 };
  expect(E.tie(d, l, 4)).toBe(true);
  const b = E.beatAt(d, l);
  expect(b.notes[0].istiedestination).toBe(true);
  expect(b.duration).toBe(4);
  const sc = E.toScore(d);
  expect(sc.tracks[0].staves[0].bars[0].voices[0].beats[1].notes[0].isTieDestination).toBe(true);
});
it('перенос: на полутон/октаву, на краю грифа — на соседнюю струну', () => {
  const d = guitar();
  E.put(d, L0, { dur: 4, notes: [{ string: 3, fret: 2 }] });
  expect(E.transpose(d, L0, 1)).toBe(true);
  expect(E.beatAt(d, L0).notes[0]).toMatchObject({ string: 3, fret: 3 });
  E.put(d, L0, { dur: 4, notes: [{ string: 6, fret: 24 }] });
  E.transpose(d, L0, 1); // выше лада 24 на верхней струне нет
  expect(E.beatAt(d, L0).notes[0]).toMatchObject({ string: 6, fret: 24 });
  E.put(d, L0, { dur: 4, notes: [{ string: 1, fret: 0 }] });
  E.transpose(d, L0, -12 + 12 + 5);
  expect(E.midiOf(d, 0, E.beatAt(d, L0).notes[0])).toBe(45);
});
it('такты: вставка, удаление, копия и вставка, последний такт не удаляется', () => {
  const d = guitar();
  E.put(d, L0, { dur: 4, notes: [{ string: 3, fret: 7 }] });
  const clip = E.copyBars(d, 0, 0);
  const at2 = E.insertBar(d, 0, true);
  expect(at2).toBe(1); expect(E.nBars(d)).toBe(5);
  E.pasteBars(d, 2, clip, true);
  expect(E.nBars(d)).toBe(6);
  expect(E.beatAt(d, { t: 0, b: 2, v: 0, i: 0 }).notes[0].fret).toBe(7);
  E.delBars(d, 1, 2);
  expect(E.nBars(d)).toBe(4);
  const one = E.newDoc({ bars: 1 });
  E.put(one, L0, { dur: 4, notes: [{ string: 1, fret: 1 }] });
  E.delBars(one, 0);
  expect(E.nBars(one)).toBe(1);
  expect(E.isRest(E.beatAt(one, L0))).toBe(true);
  expect(() => E.toScore(d)).not.toThrow();
});
it('размер: 4/4 → 3/4 обрезает лишнее и сохраняет полноту тактов', () => {
  const d = guitar();
  E.put(d, L0, { dur: 4, notes: [{ string: 3, fret: 1 }] });
  E.put(d, { ...L0, i: 1 }, { dur: 2, dots: 1, notes: [{ string: 3, fret: 2 }] }); // доля 2–4
  E.setTimeSig(d, 0, 3, 4);
  for (let b = 0; b < 4; b++) expect(sum(d, b)).toBe(2880);
  expect(E.beatAt(d, { ...L0, i: 1 }).duration).toBe(2); // половинная вместо пунктирной
  expect(E.toScore(d).masterBars[2].timeSignatureNumerator).toBe(3);
});
it('тональность, темп, повтор, секция, вольта — читаются alphaTab', () => {
  const d = guitar();
  E.setKey(d, 0, 2); E.setTempo(d, 2, 140); E.setRepeat(d, 1, 3); E.setSection(d, 0, 'Куплет'); E.setVolta(d, 3, 1);
  const sc = E.toScore(d);
  expect(sc.tracks[0].staves[0].bars[3].keySignature).toBe(2);
  expect(E.tempoAt(d, 3)).toBe(140);
  expect(sc.masterBars[1].isRepeatStart).toBe(true);
  expect(sc.masterBars[3].repeatCount).toBe(2);
  expect(sc.masterBars[0].section.text).toBe('Куплет');
  expect(sc.masterBars[3].alternateEndings).toBe(1);
});
it('вторая дорожка и второй голос; сохранение в Guitar Pro и обратно', () => {
  const d = guitar();
  E.put(d, L0, { dur: 4, notes: [{ string: 3, fret: 2 }] });
  const t2 = E.addTrack(d, 'keys');
  expect(t2).toBe(1);
  E.put(d, { t: 1, b: 0, v: 0, i: 0 }, { dur: 2, notes: [E.noteFor(d, 1, 67)] });
  E.ensureVoice(d, 0, 0, 1);
  E.put(d, { t: 0, b: 0, v: 1, i: 0 }, { dur: 1, notes: [{ string: 5, fret: 0 }] });
  const gp = E.toGp(d);
  expect(String.fromCharCode(...gp.slice(0, 2))).toBe('PK');
  const back = E.fromBytes(gp);
  expect(back.tracks.length).toBe(2);
  const vb = back.tracks[0].staves[0].bars[0].voices;
  expect(vb.some((v) => v.beats.some((x) => x.notes.some((n) => n.string === 5)))).toBe(true); // второй голос пережил файл
  expect(back.tracks[1].staves[0].bars[0].voices[0].beats[0].notes[0].octave).toBe(5);
  // снимок для отмены восстанавливает документ
  const s = E.snap(d);
  E.delBars(d, 0, 2);
  expect(E.nBars(E.unsnap(s))).toBe(4);
});
it('ноты чужого файла правятся: Guitar Pro → документ → правка → партитура', () => {
  const src = E.toGp(guitar());
  const d = E.fromBytes(src);
  E.put(d, L0, { dur: 8, notes: [{ string: 1, fret: 12 }] });
  expect(E.toScore(d).tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0].fret).toBe(12);
});

for (const seed0 of [12345, 777, 2026, 31337, 99]) it('случайные правки (зерно ' + seed0 + '): каждый такт каждого голоса остаётся полным, партитура собирается и играет', () => {
  let seed = seed0;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  const d = E.newDoc({ inst: 'guitar', bars: 3 });
  E.addTrack(d, 'keys');
  let l = L0;
  const check = () => {
    d.tracks.forEach((tr, t) => tr.staves[0].bars.forEach((br, b) => br.voices.forEach((v) => {
      expect(v.beats.reduce((a, x) => a + E.beatTicks(x), 0), 'дорожка ' + t + ' такт ' + b).toBe(E.barTicks(d, b));
    })));
  };
  for (let k = 0; k < 400; k++) {
    l = E.clampLoc(d, l);
    const op = rnd(11), dur = [1, 2, 4, 8, 16, 32][rnd(6)], dots = rnd(4) === 0 ? 1 : 0, tup = rnd(6) === 0 ? 3 : 0;
    const note = E.trackIsTab(d, l.t) ? { string: 1 + rnd(6), fret: rnd(13) } : E.noteFor(d, l.t, 48 + rnd(30));
    if (op <= 3) { E.put(d, l, { dur, dots, tup, notes: [note] }); l = E.next(d, l); }
    else if (op === 4) { E.put(d, l, { dur, dots, tup, notes: [] }); l = E.next(d, l); }
    else if (op === 5) E.resize(d, l, dur, dots, tup);
    else if (op === 6) E.clearBeat(d, l);
    else if (op === 7) E.tie(d, l, dur, dots);
    else if (op === 8) E.toggleNote(d, l, note);
    else if (op === 9 && E.nBars(d) < 12) E.insertBar(d, l.b, rnd(2) === 0);
    else if (op === 10 && rnd(3) === 0) E.setTimeSig(d, l.b, [3, 4, 6, 5][rnd(4)], [4, 8][rnd(2)]);
    else if (op === 10) { l = { ...l, t: (l.t + 1) % d.tracks.length, i: 0 }; }
    if (k % 20 === 0) { check(); expect(() => E.toScore(d)).not.toThrow(); }
  }
  check();
  const sc = E.toScore(d);
  expect(sc.masterBars.length).toBe(E.nBars(d));
  expect(E.toGp(d).length).toBeGreaterThan(500);
});
