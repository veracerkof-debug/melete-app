// Ноты и табы с игры (решение автора 29.10.2026): партия, снятая вживую с микрофона, MIDI-клавиатуры или инструмента
// приложения, и её правка. Источник правды — сыгранные ноты (raw, секунды от первой доли первого такта): сетка,
// темп и сила квантования меняются когда угодно, ноты на стане пересчитываются из сыгранного. Правки (высота, длина,
// струна и лад, удаление, новые ноты, удаление тактов, перезапись с такта) — тоже над сыгранными нотами.
// Как у других (ScoreCloud, MuseScore, Guitar Pro): ноты — по ближайшей сетке, сила квантования — для прослушивания
// и MIDI (чувство игры сохраняется), на стане — всегда ровно. Чистые функции без DOM (tests/livescore.test.js).
import { fitOffset } from './quantize.js';
import { fretNotes } from './tabfinger.js';

// Сетки: делений на долю
export const GRIDS = { 8: 2, '8t': 3, 16: 4, '16t': 6 };
// Инструменты партии: строй (MIDI от толстой струны) или null, звук General MIDI, ключ
export const INSTS = {
  guitar: { tuning: [40, 45, 50, 55, 59, 64], gm: 25, oct: -1 },
  bass: { tuning: [28, 33, 38, 43], gm: 33, oct: -1 },
  ukulele: { tuning: [67, 60, 64, 69], gm: 24, oct: 0 },
  keys: { tuning: null, gm: null, oct: 0 },
  voice: { tuning: null, gm: 52, oct: 0 },
};

export function newPart(patch = {}) {
  const inst = patch.inst && INSTS[patch.inst] ? patch.inst : 'guitar';
  return { v: 1, bpm: 90, num: 4, den: 4, key: { pc: 0, minor: false }, grid: 'auto', str: 1, inst, tuning: INSTS[inst].tuning, capo: 0, mono: true, raw: [], ...patch };
}

const spbOf = (p) => 60 / Math.max(20, p.bpm || 90);
const r6 = (x) => Math.round(x * 1e6) / 1e6;

// Сетка сама: восьмые, если игра на них ложится; иначе — что ближе: триоли восьмых или шестнадцатые
export function autoGrid(raw, bpm) {
  const spb = 60 / Math.max(20, bpm || 90), bs = raw.map((n) => n.t / spb);
  if (bs.length < 2) return '8';
  const err = (div) => bs.reduce((a, b) => a + Math.abs(b * div - Math.round(b * div)) / div, 0) / bs.length;
  const e8 = err(2), e8t = err(3), e16 = err(4);
  if (e8 < 0.055) return '8';
  return e8t < e16 * 0.8 ? '8t' : '16';
}
export const gridOf = (p) => (p.grid && p.grid !== 'auto' && GRIDS[p.grid] ? p.grid : autoGrid(p.raw, p.bpm));

// Темп и начало без метронома: темп, при котором начала нот ближе всего к восьмым; 60…180, ближе к 100 — чуть лучше.
// onsets — секунды. → { bpm, t0 } (t0 — секунда первой доли: первая нота — на ней или чуть после)
export function guessTempo(onsets) {
  const on = onsets.slice().sort((a, b) => a - b);
  if (on.length < 3) return { bpm: 90, t0: on.length ? on[0] : 0 };
  let best = null;
  for (let bpm = 60; bpm <= 180; bpm += 1) {
    const spb = 60 / bpm, step = spb / 2, off = fitOffset(on, spb, 2);
    let e = 0;
    for (const t of on) { const r = ((t - off) % step + step) % step; e += Math.min(r, step - r) / step; }
    const score = e / on.length + 0.02 * Math.abs(Math.log2(bpm / 100));
    if (!best || score < best.score) best = { bpm, off, score };
  }
  const spb = 60 / best.bpm, k = Math.floor((on[0] - best.off) / spb + 0.25);
  return { bpm: best.bpm, t0: best.off + k * spb };
}

// Сыгранное → ноты в долях: [{ t, d, m, v, i }] (i — номер в raw). Начало и конец — к ближайшему делению,
// своя длина ноты (r.dq, доли) — после правки; одноголосная партия — нота кончается, где началась следующая
export function quantize(p) {
  const div = GRIDS[gridOf(p)], spb = spbOf(p), q = (b) => Math.round(b * div) / div, step = 1 / div;
  const out = [];
  p.raw.forEach((r, i) => {
    const t = Math.max(0, q(r.t / spb));
    let e = r.dq ? t + r.dq : q((r.t + r.d) / spb);
    if (e <= t) e = t + step;
    out.push({ t: r6(t), d: r6(e - t), m: r.m, v: r.v == null ? 0.8 : r.v, i });
  });
  out.sort((a, b) => a.t - b.t || a.m - b.m);
  const res = [];
  for (const n of out) {
    const same = res.find((x) => x.t === n.t && x.m === n.m);
    if (same) { same.d = Math.max(same.d, n.d); continue; }
    res.push(n);
  }
  if (p.mono) for (let k = 0; k < res.length; k++) { // одноголосие: созвучия нет, нахлёст — короче
    const nx = res.slice(k + 1).find((x) => x.t > res[k].t);
    if (nx && res[k].t + res[k].d > nx.t) res[k].d = r6(nx.t - res[k].t);
  }
  return res;
}

// Время для прослушивания и MIDI: сила квантования 0…1 — насколько сыгранное притянуто к сетке
export function playTimes(p, notes = quantize(p)) {
  const spb = spbOf(p), s = Math.max(0, Math.min(1, p.str == null ? 1 : p.str));
  return notes.map((n) => {
    const r = p.raw[n.i], b0 = r.t / spb, b1 = (r.t + r.d) / spb;
    const t = b0 + (n.t - b0) * s, e = b1 + (n.t + n.d - b1) * s;
    return { t, d: Math.max(0.05, e - t), m: n.m, v: n.v };
  });
}

export const barsOf = (p, notes = quantize(p)) => Math.max(1, Math.ceil(notes.reduce((a, n) => Math.max(a, n.t + n.d), 0) / p.num - 1e-6));

// Струна и лад каждой ноты: свои (после правки) — если сходятся со строем и капо, иначе — аппликатура сама.
// s — с тонкой струны (1), f — от капо
export function tabOf(p, notes = quantize(p)) {
  if (!p.tuning || !notes.length) return notes.map(() => null);
  const capo = p.capo || 0, tun = p.tuning.map((m) => m + capo), auto = fretNotes(notes, tun);
  return notes.map((n, k) => {
    const r = p.raw[n.i];
    if (r.s && r.f != null && tun[tun.length - r.s] + r.f === n.m) return { s: r.s, f: r.f };
    return auto[k];
  });
}

/* ---------- правка (всё — над сыгранным; меняет p, возвращает p) ---------- */

export function setPitch(p, i, m) { const r = p.raw[i]; if (r) { r.m = Math.max(0, Math.min(127, Math.round(m))); delete r.s; delete r.f; } return p; }
export function setLen(p, i, beats) { const r = p.raw[i]; if (r) r.dq = Math.max(1 / 6, beats); return p; }
// Струна (с тонкой, 1…) и лад (от капо) — высота следует
export function setFret(p, i, s, f) {
  const r = p.raw[i];
  if (!r || !p.tuning) return p;
  const tun = p.tuning, idx = tun.length - s;
  if (idx < 0 || idx >= tun.length) return p;
  r.s = s; r.f = Math.max(0, Math.min(24, f)); r.m = tun[idx] + (p.capo || 0) + r.f;
  return p;
}
export function delNote(p, i) { p.raw.splice(i, 1); return p; }
// Новая нота руками: доля, высота, длина в долях — ложится ровно на сетку
export function addNote(p, beat, m, beats = 1) {
  const spb = spbOf(p);
  p.raw.push({ t: beat * spb, d: beats * spb, m, v: 0.8, dq: beats });
  p.raw.sort((a, b) => a.t - b.t);
  return p;
}
// Убрать такты [b0, b1): ноты в них — прочь, всё после — сдвигается к b0
export function delBars(p, b0, b1) {
  const spb = spbOf(p), s0 = b0 * p.num * spb, s1 = b1 * p.num * spb, sh = s1 - s0;
  p.raw = p.raw.filter((r) => r.t < s0 - 1e-6 || r.t >= s1 - 1e-6).map((r) => (r.t >= s1 - 1e-6 ? { ...r, t: r.t - sh } : r));
  return p;
}
// Перезапись с такта: всё с такта bar — прочь (новая игра встанет с него)
export function cutFrom(p, bar) {
  const s0 = bar * p.num * spbOf(p);
  p.raw = p.raw.filter((r) => r.t < s0 - 1e-6);
  return p;
}
// Сыгранное с такта bar (секунды от его первой доли) — в партию
export function insertAt(p, bar, raw) {
  const s0 = bar * p.num * spbOf(p);
  p.raw.push(...raw.map((r) => ({ ...r, t: r.t + s0 })));
  p.raw.sort((a, b) => a.t - b.t);
  return p;
}
// Новый темп: доли остаются на месте (сыгранное растягивается вместе с сеткой)
export function setTempo(p, bpm) {
  const k = spbOf(p) / (60 / Math.max(20, bpm));
  p.raw.forEach((r) => { r.t /= k; r.d /= k; });
  p.bpm = bpm;
  return p;
}

/* ---------- MusicXML (12 делений на четверть: восьмые, шестнадцатые и триоли) ---------- */

const DIV = 12;
const STEPS = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'], ALTER = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const FSTEPS = ['C', 'D', 'D', 'E', 'E', 'F', 'G', 'G', 'A', 'A', 'B', 'B'], FALTER = [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0];
const FIFTHS = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
const STRAIGHT = [[48, 'whole'], [24, 'half'], [12, 'quarter'], [6, 'eighth'], [3, '16th']];
const TRIP = [[8, 'quarter'], [4, 'eighth'], [2, '16th'], [1, '32nd']];
const xesc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Длина в делениях → [[деления, тип, триоль?]]: ровная часть (кратная 3) + триольная
export function splitDur12(d) {
  d = Math.max(1, Math.round(d));
  let s = d - (d % 3);
  while (s > 0 && (d - s) % 2) s -= 3;
  const out = [];
  let a = s, b = d - s;
  for (const [n, type] of STRAIGHT) while (a >= n) { out.push([n, type, false]); a -= n; }
  for (const [n, type] of TRIP) while (b >= n) { out.push([n, type, true]); b -= n; }
  return out;
}

export function partXML(p, { title = '', label = title } = {}) {
  const notes = quantize(p), tab = tabOf(p, notes), bars = barsOf(p, notes);
  const fifths = p.key ? FIFTHS[p.key.minor ? (p.key.pc + 3) % 12 : p.key.pc] : 0, flats = fifths < 0;
  const inst = INSTS[p.inst] || INSTS.keys, barDiv = DIV * p.num * (4 / p.den), end = barDiv * bars;
  const segs = [];
  notes.forEach((n, k) => {
    let s = Math.round(n.t * DIV), e = Math.min(end, Math.round((n.t + n.d) * DIV));
    while (s < e) { const b1 = (Math.floor(s / barDiv) + 1) * barDiv, x = Math.min(e, b1); segs.push({ s, e: x, m: n.m, from: s > Math.round(n.t * DIV), cont: x < e, tf: tab[k] }); s = x; }
  });
  segs.sort((a, b) => a.s - b.s || a.m - b.m);
  const avg = segs.length ? segs.reduce((a, n) => a + n.m, 0) / segs.length : 60;
  const low = p.inst === 'bass' || (!p.tuning && avg < 55);
  const clef = (low ? '<sign>F</sign><line>4</line>' : '<sign>G</sign><line>2</line>') + (inst.oct ? '<clef-octave-change>' + inst.oct + '</clef-octave-change>' : '');
  const pitch = (m) => { const pc = m % 12, oct = Math.floor(m / 12) - 1, alt = (flats ? FALTER : ALTER)[pc]; return '<pitch><step>' + (flats ? FSTEPS : STEPS)[pc] + '</step>' + (alt ? '<alter>' + alt + '</alter>' : '') + '<octave>' + oct + '</octave></pitch>'; };
  const tm = (trip) => (trip ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' : '');
  const rest = (d) => splitDur12(d).map(([v, type, trip]) => '<note><rest/><duration>' + v + '</duration><voice>1</voice><type>' + type + '</type>' + tm(trip) + '</note>').join('');
  const tuningXML = p.tuning ? '<staff-details><staff-lines>' + p.tuning.length + '</staff-lines>' + p.tuning.map((m, i) => '<staff-tuning line="' + (i + 1) + '"><tuning-step>' + STEPS[m % 12] + '</tuning-step>' + (ALTER[m % 12] ? '<tuning-alter>1</tuning-alter>' : '') + '<tuning-octave>' + (Math.floor(m / 12) - 1) + '</tuning-octave></staff-tuning>').join('') + (p.capo ? '<capo>' + p.capo + '</capo>' : '') + '</staff-details>' : '';
  let body = '';
  for (let b = 0; b < bars; b++) {
    const b0 = b * barDiv, b1 = b0 + barDiv;
    let x = '<measure number="' + (b + 1) + '">';
    if (b === 0) x += '<attributes><divisions>' + DIV + '</divisions><key><fifths>' + fifths + '</fifths><mode>' + (p.key && p.key.minor ? 'minor' : 'major') + '</mode></key><time><beats>' + p.num + '</beats><beat-type>' + p.den + '</beat-type></time><clef>' + clef + '</clef>' + tuningXML + '</attributes>' +
      '<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>' + Math.round(p.bpm) + '</per-minute></metronome></direction-type><sound tempo="' + Math.round(p.bpm) + '"/></direction>';
    let at = b0;
    const inBar = segs.filter((n) => n.s >= b0 && n.s < b1);
    for (let i = 0; i < inBar.length;) {
      const s = inBar[i].s, group = [];
      while (i < inBar.length && inBar[i].s === s) group.push(inBar[i++]);
      if (s < at) continue; // нахлёст в одноголосии — уже звучит
      if (s > at) { x += rest(s - at); at = s; }
      const e = Math.min(b1, Math.max(...group.map((n) => n.e))), parts = splitDur12(e - s);
      parts.forEach(([d, type, trip], k) => group.forEach((n, j) => {
        const stop = k > 0 || n.from, start = k < parts.length - 1 || n.cont;
        x += '<note>' + (j ? '<chord/>' : '') + pitch(n.m) + '<duration>' + d + '</duration>' + (stop ? '<tie type="stop"/>' : '') + (start ? '<tie type="start"/>' : '') + '<voice>1</voice><type>' + type + '</type>' + tm(trip) +
          (stop || start || n.tf ? '<notations>' + (stop ? '<tied type="stop"/>' : '') + (start ? '<tied type="start"/>' : '') + (n.tf ? '<technical><string>' + n.tf.s + '</string><fret>' + n.tf.f + '</fret></technical>' : '') + '</notations>' : '') + '</note>';
      }));
      at = e;
    }
    if (at < b1) x += rest(b1 - at);
    body += x + '</measure>';
  }
  const gm = inst.gm == null ? 0 : inst.gm;
  return '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">' +
    '<score-partwise version="3.1">' + (title ? '<work><work-title>' + xesc(title) + '</work-title></work>' : '') + '<part-list><score-part id="P1"><part-name>' + xesc(label) + '</part-name>' +
    '<score-instrument id="P1-I1"><instrument-name>' + xesc(p.inst) + '</instrument-name></score-instrument><midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>' + (gm + 1) + '</midi-program></midi-instrument></score-part></part-list>' +
    '<part id="P1">' + body + '</part></score-partwise>';
}

// События игры (src/music/midi.js) — для .mid и прослушивания с силой квантования
export function partEvents(p) {
  const spb = spbOf(p), ev = [];
  playTimes(p).forEach((n, i) => { ev.push({ t: n.t * spb, k: 'on', id: 'l' + i, m: n.m, v: n.v }); ev.push({ t: (n.t + n.d) * spb, k: 'off', id: 'l' + i }); });
  return ev.sort((a, b) => a.t - b.t || (a.k === 'off' ? -1 : 1));
}

// Партия → песня для студии (src/music/project.js: projectFromSong)
export function partSong(p, name = '') {
  const inst = INSTS[p.inst] || INSTS.keys;
  return { name, bpm: Math.round(p.bpm), num: p.num, den: p.den, key: p.key, tracks: [{ name, program: inst.gm, notes: quantize(p).map(({ t, d, m, v }) => ({ t, d, m, v })) }] };
}

// Ноты сыгранного по ходу записи (секунды) — из событий игры: on/off по id
export function notesFromEvents(ev) {
  const open = new Map(), out = [];
  for (const e of ev) {
    if (e.k === 'on' && e.m != null) { if (open.has(e.id)) { const o = open.get(e.id); out.push({ t: o.t, d: Math.max(0.03, e.t - o.t), m: o.m, v: o.v }); } open.set(e.id, { t: e.t, m: Math.round(e.m), v: e.v == null ? 0.8 : e.v }); }
    else if (e.k === 'off' && open.has(e.id)) { const o = open.get(e.id); out.push({ t: o.t, d: Math.max(0.03, e.t - o.t), m: o.m, v: o.v }); open.delete(e.id); }
  }
  return { done: out, open };
}
