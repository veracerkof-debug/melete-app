// Правка партитуры: ноты и табы, как в MuseScore / Guitar Pro / TuxGuitar (решение автора 22.11.2026: «редактор — прям как у них»).
// Партитура — «документ»: обычный объект из JSON alphaTab (`JsonConverter.scoreToJson`), без классов и скрытых связей. Любая
// правка меняет документ, а `toScore` заново собирает партитуру alphaTab (связи ног/лиг/хаммеров пересчитывает сам alphaTab).
// Так правка предсказуема, отмена — снимок строки, формат файла — Guitar Pro / MusicXML через alphaTab. Без DOM.
//
// Место (loc): { t: дорожка, b: такт, v: голос, i: номер удара в такте }. Длины — в тиках alphaTab: четверть = 960.
// Ввод — «поверх» (как в MuseScore): новый удар занимает свою длину, остаток старого — паузами; такт всегда полон.
let AT = null, ST = null;
export const useAlphaTab = (at) => { AT = at; ST = new at.Settings(); };

export const Q = 960;
const WHOLE = 4 * Q;
// Длины, из которых раскладывается остаток такта (тики → [длительность, точек]); от большей к меньшей
const SPLIT = [[3840, 1, 0], [2880, 2, 1], [1920, 2, 0], [1440, 4, 1], [960, 4, 0], [720, 8, 1], [480, 8, 0], [360, 16, 1], [240, 16, 0], [180, 32, 1], [120, 32, 0], [90, 64, 1], [60, 64, 0]];
export const DURS = [1, 2, 4, 8, 16, 32];

/* ---------- документ ↔ партитура ---------- */

export const toDoc = (score) => JSON.parse(AT.model.JsonConverter.scoreToJson(score));
export const toScore = (doc) => AT.model.JsonConverter.jsonToScore(JSON.stringify(strip(doc)), ST);
export const fromBytes = (bytes) => toDoc(AT.importer.ScoreLoader.loadScoreFromBytes(bytes, ST));
export const toGp = (doc) => new AT.exporter.Gp7Exporter().export(toScore(doc), ST);
export const snap = (doc) => JSON.stringify(doc);
export const unsnap = (s) => JSON.parse(s);
// Связи «по номеру» (хаммер, слайд, лига) после правки устарели — alphaTab восстановит их по признакам сам
function strip(doc) {
  let bi = 0, vi = 0, ei = 0, ni = 0; // номера — заново и подряд: копии тактов и дорожек несут чужие, а экспорт в Guitar Pro на них опирается
  doc.tracks.forEach((tr) => tr.staves.forEach((s) => s.bars.forEach((b) => {
    b.id = bi++;
    b.voices.forEach((v) => { v.id = vi++; v.beats.forEach((be) => {
      be.id = ei++;
      (be.notes || []).forEach((n) => {
        n.id = ni++;
        delete n.hammerpulldestinationnoteid; delete n.hammerpulloriginnoteid; delete n.slidetargetnoteid; delete n.slideoriginnoteid;
        delete n.tieoriginnoteid; delete n.tiedestinationnoteid; delete n.slurdestinationnoteid; delete n.sluroriginnoteid;
      });
    }); });
  })));
  return doc;
}

/* ---------- инструменты ---------- */

// строй — от верхней струны к нижней, как в alphaTex; prog — звук GM
export const INSTRUMENTS = {
  guitar: { name: 'Гитара', tuning: 'E4 B3 G3 D3 A2 E2', prog: 25, tab: true },
  bass: { name: 'Бас', tuning: 'G2 D2 A1 E1', prog: 33, tab: true },
  ukulele: { name: 'Укулеле', tuning: 'A4 E4 C4 G4', prog: 24, tab: true },
  guitar7: { name: 'Гитара 7', tuning: 'E4 B3 G3 D3 A2 E2 B1', prog: 25, tab: true },
  keys: { name: 'Пианино', tuning: 'piano', prog: 0, tab: false },
  voice: { name: 'Голос', tuning: 'piano', prog: 52, tab: false },
};
export const TUNINGS = {
  guitar: ['E4 B3 G3 D3 A2 E2', 'E4 B3 G3 D3 A2 D2', 'D4 A3 F3 C3 G2 D2', 'E♭4 B♭3 G♭3 D♭3 A♭2 E♭2'],
  bass: ['G2 D2 A1 E1', 'G2 D2 A1 D1'],
  ukulele: ['A4 E4 C4 G4', 'A4 E4 C4 G3'],
};
const keyTex = (k) => (k ? '\\ks ' + k + ' ' : '');
// Пустая партитура: одна дорожка, n пустых тактов (в тональности key — 'C', 'Am', 'D'…)
export function newDoc({ inst = 'guitar', name, bars = 4, num = 4, den = 4, bpm = 90, key = '', title = '' } = {}) {
  const I = INSTRUMENTS[inst] || INSTRUMENTS.guitar;
  const tex = '\\title "' + String(title).replace(/"/g, "'") + '" \\tempo ' + bpm + ' \\track "' + String(name || I.name).replace(/"/g, "'") + '" \\staff {' + (I.tab ? 'score tabs' : 'score') + '} \\tuning ' + I.tuning + ' \\ts ' + num + ' ' + den + ' ' + keyTex(key) +
    Array.from({ length: Math.max(1, bars) }, () => 'r.1').join(' | ');
  const doc = toDoc(AT.importer.ScoreLoader.loadScoreFromBytes(new TextEncoder().encode(tex), ST));
  doc.tracks[0].playbackinfo.program = I.prog;
  doc.masterbars.forEach((m, b) => { m.timesignaturenumerator = num; m.timesignaturedenominator = den; fillBars(doc, b); });
  return doc;
}
// Дорожку добавить (в конец): те же такты, пустые
export function addTrack(doc, inst = 'keys', name) {
  const I = INSTRUMENTS[inst] || INSTRUMENTS.keys;
  const tex = '\\tempo 90 \\track "' + String(name || I.name).replace(/"/g, "'") + '" \\staff {' + (I.tab ? 'score tabs' : 'score') + '} \\tuning ' + I.tuning + ' \\ts 4 4 r.1';
  const tr = toDoc(AT.importer.ScoreLoader.loadScoreFromBytes(new TextEncoder().encode(tex), ST)).tracks[0];
  tr.playbackinfo.program = I.prog;
  const bars = doc.masterbars.map((_, b) => ({ ...clone(tr.staves[0].bars[0]), keysignature: doc.tracks[0].staves[0].bars[b].keysignature, keysignaturetype: doc.tracks[0].staves[0].bars[b].keysignaturetype }));
  tr.staves[0].bars = bars;
  // каналы MIDI — подряд, чтобы дорожки звучали каждая своим звуком
  const used = new Set(doc.tracks.flatMap((x) => [x.playbackinfo.primarychannel, x.playbackinfo.secondarychannel]));
  let ch = 0; while (used.has(ch)) ch++;
  tr.playbackinfo.primarychannel = ch; tr.playbackinfo.secondarychannel = ch + 1; if (ch === 8) { tr.playbackinfo.primarychannel = 10; tr.playbackinfo.secondarychannel = 11; }
  doc.tracks.push(tr);
  doc.masterbars.forEach((_, b) => fillBars(doc, b));
  return doc.tracks.length - 1;
}
export function delTrack(doc, t) { if (doc.tracks.length > 1) doc.tracks.splice(t, 1); }

/* ---------- длины ---------- */

const clone = (o) => JSON.parse(JSON.stringify(o));
export function beatTicks(b) {
  let x = WHOLE / (b.duration || 4), h = x;
  for (let k = 0; k < (b.dots || 0); k++) { h /= 2; x += h; }
  const n = b.tupletnumerator, d = b.tupletdenominator;
  if (n > 0 && d > 0) x = (x * d) / n;
  return Math.round(x);
}
export const barTicks = (doc, b) => Math.round((WHOLE * doc.masterbars[b].timesignaturenumerator) / doc.masterbars[b].timesignaturedenominator);
// Остаток r, начиная с тика s: паузы «по сетке» (начало кратно своей длине, без точек) — как в MuseScore, не через середину такта;
// пустой такт целиком (с тика 0) — одна пауза на весь такт (целая или с точкой)
const splitTicks = (r, s = 0) => {
  const one = SPLIT.find((x) => x[0] === r);
  if (s === 0 && one) return [[one[1], one[2]]];
  const out = [];
  while (r > 0) {
    const f = SPLIT.find(([tk, , dots]) => !dots && tk <= r && s % tk === 0) || SPLIT.find(([tk, , dots]) => !dots && tk <= r);
    if (!f) break;
    out.push([f[1], f[2]]); r -= f[0]; s += f[0];
  }
  return out;
};
const fitOne = (avail) => SPLIT.find((s) => s[0] <= avail) || null;
export const mkRest = (duration = 4, dots = 0) => ({ duration, dots, isempty: false, notes: [] });
export const isRest = (b) => !b || !b.notes || !b.notes.length;
const bar = (doc, t, b) => doc.tracks[t].staves[0].bars[b];
export const beatsOf = (doc, l) => { const br = bar(doc, l.t, l.b); return (br.voices[l.v] || { beats: [] }).beats; };
export const beatAt = (doc, l) => beatsOf(doc, l)[l.i] || null;
export const trackIsTab = (doc, t) => { const s = doc.tracks[t].staves[0]; return !!(s.stringtuning && s.stringtuning.tunings && s.stringtuning.tunings.length); };
export const tuningOf = (doc, t) => (doc.tracks[t].staves[0].stringtuning || {}).tunings || [];
export const capoOf = (doc, t) => doc.tracks[t].staves[0].capo || 0;
export const nBars = (doc) => doc.masterbars.length;

// Такт полон: пустой голос — полотно пауз; голос короче такта — дополняется паузами
function fillBars(doc, b) {
  const total = barTicks(doc, b);
  doc.tracks.forEach((_, t) => {
    const br = bar(doc, t, b);
    if (!br.voices.length) br.voices.push({ beats: [] });
    br.voices.forEach((v, vi) => {
      const sum = v.beats.reduce((a, x) => a + beatTicks(x), 0), blank = !v.beats.length && vi > 0; // пустой второй голос не рисуется
      if (sum < total) splitTicks(total - sum, sum).forEach(([d, dots]) => { const r = mkRest(d, dots); if (blank) r.isempty = true; v.beats.push(r); });
      if (!v.beats.length) v.beats.push(mkRest(4, 0));
    });
  });
}
// Второй голос такта (для двух мелодий на одном стане): создаётся из пауз
export function ensureVoice(doc, t, b, v) {
  doc.tracks[t].staves[0].bars.forEach((br) => { while (br.voices.length <= v) br.voices.push({ beats: [] }); }); // голосов — поровну во всех тактах (требование alphaTab)
  doc.masterbars.forEach((_, k) => fillBars(doc, k));
}
export const startTick = (doc, l) => beatsOf(doc, l).slice(0, l.i).reduce((a, x) => a + beatTicks(x), 0);

/* ---------- такты: добавить, убрать, копировать ---------- */

const emptyBar = (doc, t, b) => {
  const src = bar(doc, t, b), nb = clone(src);
  nb.voices = [{ beats: [] }];
  return nb;
};
// Вставить пустой такт после/перед b (after=false — перед); свойства размера, тональности — от соседнего
export function insertBar(doc, b, after = true) {
  const at = after ? b + 1 : b;
  const mb = clone(doc.masterbars[b]);
  mb.isrepeatstart = false; mb.repeatcount = 0; mb.alternateendings = 0; delete mb.section; mb.tempoautomations = [];
  doc.masterbars.splice(at, 0, mb);
  doc.tracks.forEach((tr, t) => tr.staves.forEach((s) => s.bars.splice(at, 0, emptyBar(doc, t, b))));
  fillBars(doc, at);
  return at;
}
export function delBars(doc, b0, b1 = b0) {
  const n = b1 - b0 + 1;
  if (n >= doc.masterbars.length) { clearBars(doc, 0, doc.masterbars.length - 1); return 0; } // последний такт не удаляется — очищается
  doc.masterbars.splice(b0, n);
  doc.tracks.forEach((tr) => tr.staves.forEach((s) => s.bars.splice(b0, n)));
  return Math.min(b0, doc.masterbars.length - 1);
}
export function clearBars(doc, b0, b1 = b0, t = null) {
  for (let b = b0; b <= b1; b++) doc.tracks.forEach((tr, ti) => { if (t == null || t === ti) tr.staves[0].bars[b].voices = [{ beats: [] }]; fillBars(doc, b); });
}
// Буфер: копия тактов (все дорожки или одна); вставка — поверх (заменяет) или со вставкой новых
export function copyBars(doc, b0, b1, t = null) {
  return { n: b1 - b0 + 1, t, masters: doc.masterbars.slice(b0, b1 + 1).map(clone), bars: doc.tracks.map((tr, ti) => (t == null || t === ti ? tr.staves[0].bars.slice(b0, b1 + 1).map(clone) : null)) };
}
export function pasteBars(doc, b, clip, insert = true) {
  if (!clip) return b;
  const cl = clone(clip);
  if (insert) for (let k = 0; k < cl.n; k++) insertBar(doc, b + k, false); // новые такты — перед b, остальное сдвигается
  cl.bars.forEach((bs, ti) => {
    if (!bs || !doc.tracks[ti]) return; // копия одной дорожки ложится на ту же дорожку
    bs.forEach((x, k) => {
      if (b + k >= doc.masterbars.length) return;
      const dst = bar(doc, ti, b + k);
      x.keysignature = dst.keysignature; x.keysignaturetype = dst.keysignaturetype;
      doc.tracks[ti].staves[0].bars[b + k] = x;
    });
  });
  cl.masters.forEach((m, k) => { if (b + k < doc.masterbars.length) { const d = doc.masterbars[b + k]; d.timesignaturenumerator = m.timesignaturenumerator; d.timesignaturedenominator = m.timesignaturedenominator; } });
  for (let k = 0; k < cl.n && b + k < doc.masterbars.length; k++) fillBars(doc, b + k);
  return b;
}

/* ---------- ввод и правка нот ---------- */

// Курсор после (b, i): следующий удар; конец такта — начало следующего; конец партитуры — новый такт (как в MuseScore)
export function next(doc, l, grow = true) {
  const n = beatsOf(doc, l).length;
  if (l.i + 1 < n) return { ...l, i: l.i + 1 };
  if (l.b + 1 < doc.masterbars.length) return { ...l, b: l.b + 1, i: 0 };
  if (!grow) return { ...l };
  insertBar(doc, l.b, true);
  return { ...l, b: l.b + 1, i: 0 };
}
export function prev(doc, l) {
  if (l.i > 0) return { ...l, i: l.i - 1 };
  if (l.b > 0) return { ...l, b: l.b - 1, i: Math.max(0, beatsOf(doc, { ...l, b: l.b - 1 }).length - 1) };
  return { ...l };
}
// Ближайший удар к месту (индекс может «уехать» после правки)
export const clampLoc = (doc, l) => {
  const b = Math.max(0, Math.min(l.b, doc.masterbars.length - 1)), t = Math.max(0, Math.min(l.t || 0, doc.tracks.length - 1));
  ensureVoice(doc, t, b, l.v || 0);
  const n = beatsOf(doc, { t, b, v: l.v || 0, i: 0 }).length;
  return { t, b, v: l.v || 0, i: Math.max(0, Math.min(l.i, n - 1)) };
};

const mkNote = (n) => ({ ...n });
// Положить удар (ноты или пауза) длиной dur/dots/триоль на место l, «поверх»: занимает свою длину, остаток — паузами
// spec: { dur, dots, tup (3 — триоль), notes: [{string,fret}|{octave,tone}], keep: удар, чьи свойства сохранить }
// Возвращает { beat, placed } — placed = сколько тиков заняло (может быть меньше: не влезло в такт)
export function put(doc, l, spec) {
  ensureVoice(doc, l.t, l.b, l.v);
  const vs = bar(doc, l.t, l.b).voices[l.v], bt = vs.beats, total = barTicks(doc, l.b);
  const nb = { duration: spec.dur || 4, dots: spec.dots || 0, isempty: false, notes: (spec.notes || []).map(mkNote) };
  const tupRest = () => { const r = mkRest(nb.duration, nb.dots); r.tupletnumerator = nb.tupletnumerator; r.tupletdenominator = nb.tupletdenominator; return r; };
  if (spec.tup) { nb.tupletnumerator = spec.tup; nb.tupletdenominator = spec.tup === 3 ? 2 : 4; }
  if (spec.keep) for (const k of ['text', 'chordid', 'vibrato', 'brushtype', 'brushduration', 'dynamics', 'tap', 'slap', 'pop']) if (spec.keep[k] != null && k in spec.keep) nb[k] = spec.keep[k];
  const unit = beatTicks(nb), start = bt.slice(0, l.i).reduce((a, x) => a + beatTicks(x), 0), avail = total - start;
  // триоль: если на месте уже такая же «триольная» доля — заменяется она одна; иначе ложится вся тройка (нота + две паузы), остаток — паузами
  const cur = bt[l.i], inGroup = !!(spec.tup && cur && cur.tupletnumerator === spec.tup && cur.duration === nb.duration && (cur.dots || 0) === nb.dots);
  const group = spec.tup && !inGroup ? unit * spec.tup : unit;
  let need = group;
  if (need > avail) {
    if (spec.tup) return { beat: null, placed: 0 };
    const f = fitOne(avail);
    if (!f) return { beat: null, placed: 0 };
    nb.duration = f[1]; nb.dots = f[2]; need = f[0];
  }
  let c = 0, j = l.i;
  while (j < bt.length && c < need) { c += beatTicks(bt[j]); j++; }
  const rem = Math.max(0, c - need);
  const head = spec.tup && !inGroup ? [nb, ...Array.from({ length: spec.tup - 1 }, tupRest)] : [nb];
  bt.splice(l.i, j - l.i, ...head, ...splitTicks(rem, start + need).map(([d, dots]) => mkRest(d, dots)));
  mergeRests(doc, l.t, l.b, l.v);
  return { beat: nb, placed: need };
}
// Нота на струне/ладе (или высотой) в удар: если там уже есть нота на этой струне — заменить; одинаковая — убрать (как в Guitar Pro)
export function noteKey(n) { return n.string > 0 ? 's' + n.string : 'p' + n.octave * 12 + n.tone; }
export function toggleNote(doc, l, note) {
  const b = beatAt(doc, l);
  if (!b) return null;
  const k = noteKey(note), ix = b.notes.findIndex((x) => noteKey(x) === k || (x.string > 0 && note.string > 0 && x.string === note.string));
  if (ix >= 0) { if (b.notes[ix].fret === note.fret && note.string > 0 || (note.string < 0 && b.notes[ix].octave === note.octave && b.notes[ix].tone === note.tone)) b.notes.splice(ix, 1); else b.notes[ix] = mkNote({ ...b.notes[ix], ...note }); }
  else b.notes.push(mkNote(note));
  b.notes.sort((x, y) => (x.string > 0 ? x.string - y.string : y.octave * 12 + y.tone - (x.octave * 12 + x.tone)));
  return b;
}
export function setRest(doc, l, dur, dots = 0) { return put(doc, l, { dur, dots, notes: [] }); }
// Нота на курсоре заменяется на паузу той же длины (⌫)
export function clearBeat(doc, l) {
  const b = beatAt(doc, l);
  if (!b) return;
  b.notes = []; b.text = null; b.chordid = null; b.vibrato = 0; b.brushtype = 0;
}
// Другая длина у удара под курсором (ноты сохраняются; длиннее — съедает следующие, короче — добавляет паузы)
export function resize(doc, l, dur, dots = 0, tup = 0) {
  const b = beatAt(doc, l);
  if (!b) return null;
  return put(doc, l, { dur, dots, tup, notes: b.notes, keep: b });
}
// Удалить удар «со сжатием»: его длина уходит в паузу справа; пауза слева сливается с соседними паузами
export function mergeRests(doc, t, bi, v = 0) {
  const vs = bar(doc, t, bi).voices[v];
  if (!vs) return;
  let sum = 0, pos = 0; const out = [];
  const flush = () => { if (sum) { splitTicks(sum, pos - sum).forEach(([d, dots]) => out.push(mkRest(d, dots))); sum = 0; } };
  vs.beats.forEach((b) => {
    const tk = beatTicks(b);
    if (isRest(b) && !b.text && !b.chordid && !(b.tupletnumerator > 0)) { sum += tk; pos += tk; } else { flush(); out.push(b); pos += tk; }
  });
  flush();
  vs.beats = out;
}
// Перенос звучания: на полутон/октаву. Струнные — лад на той же струне (если влезает 0–24), иначе соседняя струна
export function transpose(doc, l, d) {
  const b = beatAt(doc, l);
  if (!b) return false;
  const tun = tuningOf(doc, l.t);
  let ok = true;
  b.notes.forEach((n) => {
    if (n.string > 0 && tun.length) {
      const midi = tun[tun.length - n.string] + n.fret + d; // string 1 в alphaTab — нижняя струна
      const here = n.fret + d;
      if (here >= 0 && here <= 24) n.fret = here;
      else {
        const f = fitString(tun, midi, n.string);
        if (f) { n.string = f.string; n.fret = f.fret; } else ok = false;
      }
    } else if (n.octave >= 0) { const m = n.octave * 12 + n.tone + d; if (m < 0 || m > 131) ok = false; else { n.octave = Math.floor(m / 12); n.tone = m % 12; } }
  });
  return ok;
}
// Номера струн — как в alphaTab: 1 — самая низкая. Высота (MIDI) → струна и лад; ближе всего к струне near (рука остаётся на месте), лад 0–24
export function fitString(tun, midi, near = 0) {
  let best = null;
  tun.forEach((open, i) => {
    const fret = midi - open, string = tun.length - i; // в строе — от верхней струны; номер струны у alphaTab — от нижней (1 = самая низкая)
    if (fret < 0 || fret > 24) return;
    const score = fret * 1 + Math.abs(string - (near || (tun.length + 1) / 2)) * 3;
    if (!best || score < best.score) best = { string, fret, score };
  });
  return best ? { string: best.string, fret: best.fret } : null;
}
// Высота → нота дорожки: у струнной — струна и лад (рядом с near), иначе октава/тон; с учётом каподастра
export function noteFor(doc, t, midi, near = 0) {
  const tun = tuningOf(doc, t);
  if (tun.length) { const f = fitString(tun, midi - capoOf(doc, t), near); return f ? { string: f.string, fret: f.fret } : null; }
  return { octave: Math.floor(midi / 12), tone: ((midi % 12) + 12) % 12 };
}
export const midiOf = (doc, t, n) => (n.string > 0 ? (tuningOf(doc, t)[tuningOf(doc, t).length - n.string] || 0) + n.fret + capoOf(doc, t) : n.octave * 12 + n.tone);

/* ---------- техники (по ноте / по удару) ---------- */

// Каждая техника: как прочитать признак с ноты и как переключить. Значения — как у alphaTab (JSON)
export const NOTE_TECH = {
  hp: { get: (n) => !!n.ishammerpullorigin, set: (n, v) => { n.ishammerpullorigin = v; } }, // хаммер-он / пулл-офф к следующей ноте на струне
  tie: { get: (n) => !!n.istiedestination, set: (n, v) => { n.istiedestination = v; } },
  slide: { get: (n) => n.slideouttype === 2, set: (n, v) => { n.slideouttype = v ? 2 : 0; } }, // легато-слайд к следующей
  slideShift: { get: (n) => n.slideouttype === 1, set: (n, v) => { n.slideouttype = v ? 1 : 0; } },
  slideUp: { get: (n) => n.slideouttype === 3, set: (n, v) => { n.slideouttype = v ? 3 : 0; } },
  slideDown: { get: (n) => n.slideouttype === 4, set: (n, v) => { n.slideouttype = v ? 4 : 0; } },
  slideIn: { get: (n) => n.slideintype === 1, set: (n, v) => { n.slideintype = v ? 1 : 0; } },
  bend: { get: (n) => n.bendtype === 2, set: (n, v) => { n.bendtype = v ? 2 : 0; n.bendpoints = v ? [{ offset: 0, value: 0 }, { offset: 60, value: 4 }] : []; } },
  bendRel: { get: (n) => n.bendtype === 4, set: (n, v) => { n.bendtype = v ? 4 : 0; n.bendpoints = v ? [{ offset: 0, value: 0 }, { offset: 30, value: 4 }, { offset: 30, value: 4 }, { offset: 60, value: 0 }] : []; } },
  vib: { get: (n) => n.vibrato === 1, set: (n, v) => { n.vibrato = v ? 1 : 0; } },
  dead: { get: (n) => !!n.isdead, set: (n, v) => { n.isdead = v; } },
  ghost: { get: (n) => !!n.isghost, set: (n, v) => { n.isghost = v; } },
  pm: { get: (n) => !!n.ispalmmute, set: (n, v) => { n.ispalmmute = v; } },
  lr: { get: (n) => !!n.isletring, set: (n, v) => { n.isletring = v; } },
  acc: { get: (n) => n.accentuated === 1, set: (n, v) => { n.accentuated = v ? 1 : 0; } },
  hac: { get: (n) => n.accentuated === 2, set: (n, v) => { n.accentuated = v ? 2 : 0; } },
  stac: { get: (n) => !!n.isstaccato, set: (n, v) => { n.isstaccato = v; } },
  harm: { get: (n) => n.harmonictype === 1, set: (n, v) => { n.harmonictype = v ? 1 : 0; n.harmonicvalue = v ? 12 : 0; } },
};
// Переключатель: если у всех нот удара техника уже есть — снять, иначе поставить всем. Возвращает новое состояние
export function toggleTech(doc, l, key) {
  const b = beatAt(doc, l), T = NOTE_TECH[key];
  if (!b || !T || !b.notes.length) return null;
  const on = !b.notes.every(T.get);
  b.notes.forEach((n) => { if (key.startsWith('slide') && key !== 'slideIn') { n.slideouttype = 0; } T.set(n, on); });
  return on;
}
export const techOn = (doc, l, key) => { const b = beatAt(doc, l), T = NOTE_TECH[key]; return !!(b && T && b.notes.length && b.notes.every(T.get)); };
// Лига: пауза после ноты — копия её звуков, «лигой» (удобно: набрать долгую ноту двумя длинами); на ноте — признак лиги с предыдущей той же высоты
export function tie(doc, l, dur, dots) {
  const cur = beatAt(doc, l);
  if (!cur) return false;
  const pl = prev(doc, l), pb = pl.b === l.b && pl.i === l.i ? null : beatAt(doc, pl);
  if (!pb || isRest(pb)) return false;
  if (isRest(cur)) {
    const { beat } = put(doc, l, { dur: dur || cur.duration, dots: dur ? dots || 0 : cur.dots, notes: pb.notes.map((n) => ({ ...n, istiedestination: true, ishammerpullorigin: false, slideouttype: 0, bendtype: 0, bendpoints: [], isdead: false })) });
    return !!beat;
  }
  const on = !cur.notes.every((n) => n.istiedestination);
  cur.notes.forEach((n) => { n.istiedestination = on; });
  return on;
}
// Удар: текст/аккорд над станом, штрих (стаккато вниз/вверх), вибрато, триоль
export function setText(doc, l, text) { const b = beatAt(doc, l); if (b) { b.text = text ? String(text) : null; } }
export function setChord(doc, l, name) { const b = beatAt(doc, l); if (b) { b.chordid = null; b.text = name ? String(name) : null; } }
export function setStroke(doc, l, dir) { const b = beatAt(doc, l); if (b) { b.brushtype = dir === 'up' ? 2 : dir === 'down' ? 1 : 0; b.brushduration = dir ? 60 : 0; } }
export function toggleBeat(doc, l, key) {
  const b = beatAt(doc, l);
  if (!b) return null;
  if (key === 'bvib') { b.vibrato = b.vibrato ? 0 : 1; return !!b.vibrato; }
  if (key === 'tap') { b.tap = !b.tap; return b.tap; }
  if (key === 'slap') { b.slap = !b.slap; return b.slap; }
  if (key === 'pm') { b.notes.forEach((n) => { n.ispalmmute = !b.notes.every((x) => x.ispalmmute); }); return b.notes.every((x) => x.ispalmmute); }
  return null;
}

/* ---------- такт: размер, тональность, темп, повторы, секция ---------- */

export function setTimeSig(doc, b, num, den) {
  const mb = doc.masterbars[b];
  // до конца партитуры (пока не встретится другой размер) — тот же размер; ноты вне размера обрезаются/дополняются паузами
  const oldN = mb.timesignaturenumerator, oldD = mb.timesignaturedenominator;
  for (let k = b; k < doc.masterbars.length; k++) {
    const m = doc.masterbars[k];
    if (k > b && (m.timesignaturenumerator !== oldN || m.timesignaturedenominator !== oldD)) break;
    m.timesignaturenumerator = num; m.timesignaturedenominator = den;
    const total = barTicks(doc, k);
    doc.tracks.forEach((_, t) => bar(doc, t, k).voices.forEach((v) => {
      let sum = 0; const out = [];
      for (const x of v.beats) {
        const tk = beatTicks(x);
        if (sum + tk <= total) { out.push(x); sum += tk; continue; }
        const f = fitOne(total - sum);
        if (f) { out.push({ ...x, duration: f[1], dots: f[2], tupletnumerator: -1, tupletdenominator: -1 }); sum = total; } break;
      }
      v.beats = out;
    }));
    fillBars(doc, k);
  }
}
// Тональность — количество знаков (−7…7), minor — минор; до конца партитуры
export function setKey(doc, b, fifths, minor = false) {
  doc.tracks.forEach((tr) => tr.staves.forEach((s) => { for (let k = b; k < s.bars.length; k++) { s.bars[k].keysignature = fifths; s.bars[k].keysignaturetype = minor ? 1 : 0; } }));
}
export const keyOf = (doc, b) => { const x = bar(doc, 0, b); return { fifths: x.keysignature, minor: x.keysignaturetype === 1 }; };
export function setTempo(doc, b, bpm) {
  const mb = doc.masterbars[b];
  mb.tempoautomations = bpm ? [{ islinear: false, type: 0, value: Math.max(20, Math.min(400, Math.round(bpm))), ratioposition: 0, text: '', isvisible: true }] : [];
  if (b === 0 && !bpm) mb.tempoautomations = [{ islinear: false, type: 0, value: 90, ratioposition: 0, text: '', isvisible: true }];
}
export const tempoAt = (doc, b) => { for (let k = b; k >= 0; k--) { const a = (doc.masterbars[k].tempoautomations || []).find((x) => x.type === 0); if (a) return a.value; } return 90; };
export function setRepeat(doc, b0, b1) { // повтор тактов b0…b1 (b1 < 0 — снять с b0)
  if (b1 < 0) { doc.masterbars[b0].isrepeatstart = false; doc.masterbars[b0].repeatcount = 0; return; }
  doc.masterbars[b0].isrepeatstart = true; doc.masterbars[b1].repeatcount = 2;
}
export function toggleRepeatStart(doc, b) { doc.masterbars[b].isrepeatstart = !doc.masterbars[b].isrepeatstart; return doc.masterbars[b].isrepeatstart; }
export function setRepeatEnd(doc, b, n) { doc.masterbars[b].repeatcount = n; } // 0 — снять; 2 — «играть дважды»
export function setSection(doc, b, text) { if (text) doc.masterbars[b].section = { marker: '', text: String(text) }; else delete doc.masterbars[b].section; }
export function setVolta(doc, b, mask) { doc.masterbars[b].alternateendings = mask; } // 1 — «1.», 2 — «2.», 3 — оба
export function setDoubleBar(doc, b, on) { doc.masterbars[b].isdoublebar = !!on; }

/* ---------- прочее ---------- */

export function setMeta(doc, { title, artist }) { if (title != null) doc.title = title; if (artist != null) doc.artist = artist; }
export function setCapo(doc, t, capo) { doc.tracks[t].staves[0].capo = Math.max(0, Math.min(12, capo | 0)); }
export function setTuning(doc, t, tunings) { const s = doc.tracks[t].staves[0]; s.stringtuning = { isstandard: false, name: '', tunings: tunings.slice() }; }
export function setTrackName(doc, t, name) { doc.tracks[t].name = name; doc.tracks[t].shortname = String(name).slice(0, 8); }
export function setVolume(doc, t, v) { doc.tracks[t].playbackinfo.volume = Math.max(0, Math.min(16, Math.round(v))); }
export function setMute(doc, t, m) { doc.tracks[t].playbackinfo.ismute = !!m; }
export function setProgram(doc, t, p) { doc.tracks[t].playbackinfo.program = p; }
// Место по удару alphaTab (касание по стану)
export function locOfBeat(beat) { const v = beat.voice, br = v.bar; return { t: br.staff.track.index, b: br.index, v: v.index, i: beat.index }; }
// Счёт: «такт 3 · доля 2» — доля начала удара (с 1)
export function posLabel(doc, l) { const mb = doc.masterbars[l.b], t = startTick(doc, l); return { bar: l.b + 1, beat: Math.floor(t / (WHOLE / mb.timesignaturedenominator)) + 1 }; }
