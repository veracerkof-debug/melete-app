// Студия и нейросеть (слово автора 26.11.2026): ИИ — любой, человек сам выбирает (свой ключ или копирование) — не добавляет звук, а пишет ДАННЫЕ.
// Партии (шесть семейств): ударные (строки по 16 знаков на такт), бас (события с тоном относительно аккорда), аккорды (имена и длины в тактах),
// клавиши и пэды (по аккордам проекта), мелодия/соло (ноты по именам с началом и длиной в долях). Ударные, бас, клавиши и пэды — тот же формат,
// что у каталога «Рисунков» (studioloops.js): студия сама кладёт их клипом по аккордам, поэтому ошибки модели не звучат фальшью.
// Правка проекта: темп, тональность, свинг, размер, дорожки (громкость, панорама, звук), клипы (двигать, копировать, убирать).
// Чистые функции без DOM и сети: очистка ответа с понятными замечаниями, применение к проекту, откат по шагам, текст контекста и карточек.
import { DRUMS, STEP, chordName, CLIPS_MAX, songBars, INSTRUMENTS, newData, newTrack, newClip, setChord, NOTE_LO, NOTE_HI } from './project.js';
import { placeLoop, chordsTimeline, chordAtBeat } from './studioloops.js';
import { parseNote } from './transpose.js';

export const AI_LIMITS = { bars: 16, ops: 12, len: 64, ctxClips: 40, ctxBars: 16, name: 40, notes: 256, chords: 64, notesCtx: 64 };
export const TONES = ['r', '3', '5', '6', '7', '8', 'a'];
export const FAMS = ['drums', 'bass', 'chords', 'keys', 'pads', 'notes'];
const HIT = new Set(['x', 'X', '1', 'o', 'O', '*', '#']);
const int = (v) => { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? +v : NaN; return Number.isFinite(n) ? Math.round(n) : null; };
const num = (v, lo, hi) => { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? +v : NaN; return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const r2 = (x) => Math.round(x * 100) / 100;

// Строка такта → ровно 16 знаков 'x' и '.'; замечания (w) — что поправили
function cleanRow(s, w, where) {
  let r = String(s == null ? '' : s).replace(/[\s|]+/g, '');
  const hit = (c) => (HIT.has(c) ? 'x' : '.');
  if (r.length && r.length !== 16) w.push(where + ': в строке ' + r.length + ' знаков, нужно 16' + (r.length < 16 ? ' — дополнено паузами' : ' — лишнее отброшено'));
  r = r.slice(0, 16).split('').map(hit).join('');
  return r.padEnd(16, '.');
}

/* ---------- имена: аккорды и ноты ---------- */

// Обозначение аккорда → { pc, type } (типы студии) или null; бас после «/» отбрасывается
const SUF = [
  [/^(maj7|maj9|maj13|M7|M9|Δ7?|Δ)$/, 'maj7'], [/^(m7(b5|♭5)|ø7?|hdim7|min7(b5|♭5))$/, 'm7b5'], [/^(dim7|°7|o7)$/, 'dim7'], [/^(dim|°|o|mb5|m♭5)$/, 'dim'],
  [/^(aug|\+|aug7|\+7)$/, 'aug'], [/^(m6|min6|-6)$/, 'm6'], [/^(6|maj6|6\/9|69)$/, '6'], [/^(m7|min7|-7|m9|min9|m11|m13)$/, 'm7'],
  [/^(9)$/, '9'], [/^(7|11|13|dom7|7sus4|7\(.*\)|7[b#♭♯]\d+)$/, '7'], [/^add9$/, 'add9'], [/^sus2$/, 'sus2'], [/^(sus4|sus)$/, 'sus4'],
  [/^(m|min|-|mi)$/, 'min'], [/^(maj|M|add2|add11|5)?$/, 'maj'],
];
export function parseChordName(s) {
  const raw = String(s == null ? '' : s).trim().replace(/\s+/g, '').replace(/\/[A-Ga-g][#♯b♭]?$/, '');
  const n = parseNote(raw[0] ? raw[0].toUpperCase() + raw.slice(1) : raw);
  if (!n || n.pc == null) return null;
  const rest = raw.slice(n.len);
  for (const [re, type] of SUF) if (re.test(rest)) return { pc: n.pc, type };
  return null;
}
// Нота: число MIDI или имя «C4», «F♯3», «Bb2» (до — c4 = 60) → MIDI или null
export function noteMidi(x) {
  if (typeof x === 'number') return Number.isFinite(x) ? Math.round(x) : null;
  const s = String(x == null ? '' : x).trim(), n = parseNote(s[0] ? s[0].toUpperCase() + s.slice(1) : s);
  if (!n) return null;
  const o = /^-?\d+$/.exec(s.slice(n.len));
  return o ? 12 * (+o[0] + 1) + n.pc : null;
}
const instOk = (v) => (typeof v === 'string' && INSTRUMENTS.includes(v) ? v : null);

/* ---------- очистка партии ---------- */

// Партия от модели → { loop | spec, warns } | { error }. loop — рисунок каталога (ударные, бас, клавиши, пэды); spec — свои данные (аккорды, мелодия)
export function cleanPattern(o) {
  const w = [];
  if (!o || typeof o !== 'object') return { error: 'нет рисунка' };
  const fam = o.fam === 'drum' ? 'drums' : o.fam === 'lead' || o.fam === 'melody' ? 'notes' : o.fam;
  if (!FAMS.includes(fam)) return { error: 'неизвестный вид «' + String(o.fam).slice(0, 20) + '» (есть ' + FAMS.join(', ') + ')' };
  let bars = int(o.bars);
  const fixBars = () => { if (bars == null || bars < 1) bars = 1; if (bars > AI_LIMITS.bars) { w.push('тактов ' + bars + ': допустимо 1–' + AI_LIMITS.bars); bars = AI_LIMITS.bars; } };
  if (fam === 'drums') {
    if (bars == null && o.lanes && typeof o.lanes === 'object') { bars = 0; for (const v of Object.values(o.lanes)) if (Array.isArray(v)) bars = Math.max(bars, v.length); }
    fixBars();
    if (!o.lanes || typeof o.lanes !== 'object') return { error: 'у ударных нет lanes' };
    const lanes = {}; let hits = 0;
    for (const [name, v] of Object.entries(o.lanes)) {
      const lane = name === 'hihat' || name === 'hh' ? 'hat' : name === 'openhat' || name === 'oh' ? 'ohat' : name === 'snr' ? 'snare' : name;
      if (!DRUMS.includes(lane)) { w.push('дорожка «' + String(name).slice(0, 16) + '» неизвестна — пропущена (есть ' + DRUMS.join(', ') + ')'); continue; }
      const rows = Array.isArray(v) ? v : [v];
      if (!rows.length) continue;
      if (rows.length > 1 && rows.length !== bars) w.push(lane + ': строк ' + rows.length + ', тактов ' + bars + ' — недостающие повторяют начало');
      lanes[lane] = Array.from({ length: bars }, (_, b) => cleanRow(rows[b % rows.length], w, lane + ' такт ' + (b + 1)));
      hits += lanes[lane].reduce((n, r) => n + (r.match(/x/g) || []).length, 0);
    }
    if (!hits) return { error: 'в ударных нет ни одного удара' };
    return { loop: { id: 'ai', fam: 'drums', bars, lanes }, warns: w };
  }
  if (fam === 'bass' || fam === 'keys') {
    if (!Array.isArray(o.ev)) return { error: 'у ' + (fam === 'bass' ? 'баса' : 'клавиш') + ' нет ev' };
    if (bars == null) bars = o.ev.length;
    fixBars();
    if (o.ev.length > bars) bars = Math.min(AI_LIMITS.bars, o.ev.length);
    const ev = Array.from({ length: bars }, () => []);
    const arp = fam === 'keys' && !!o.arp;
    let count = 0;
    o.ev.slice(0, bars).forEach((bar, b) => {
      if (!Array.isArray(bar)) return;
      const seen = new Set();
      bar.forEach((n, k) => {
        const step = Array.isArray(n) ? int(n[0]) : null, len = Array.isArray(n) ? int(n[1]) : null;
        if (step == null || len == null || step < 0 || step > 15 || len < 1) { w.push('такт ' + (b + 1) + ', нота ' + (k + 1) + ': нужен вид [шаг 0–15, длина ≥ 1' + (fam === 'bass' ? ', тон' : arp ? ', номер ноты аккорда' : '') + '] — пропущена'); return; }
        if (seen.has(step)) { w.push('такт ' + (b + 1) + ': две ноты на шаге ' + step + ' — вторая пропущена'); return; }
        const L = Math.min(len, 16 - step);
        if (fam === 'bass') {
          const tone = String(n[2]).trim();
          if (!TONES.includes(tone)) { w.push('такт ' + (b + 1) + ', нота ' + (k + 1) + ': тон «' + tone.slice(0, 6) + '» неизвестен (есть ' + TONES.join(' ') + ') — пропущена'); return; }
          seen.add(step); ev[b].push([step, L, tone]);
        } else if (arp) {
          const idx = int(n[2]);
          if (idx == null || idx < 0 || idx > 8) { w.push('такт ' + (b + 1) + ', нота ' + (k + 1) + ': номер ноты аккорда 0–8 — пропущена'); return; }
          seen.add(step); ev[b].push([step, L, idx]);
        } else { seen.add(step); ev[b].push([step, L]); }
        count++;
      });
      ev[b].sort((a, c) => a[0] - c[0]);
    });
    if (!count) return { error: 'в ' + (fam === 'bass' ? 'басу' : 'клавишах') + ' нет ни одной ноты' };
    const loop = { id: 'ai', fam, bars, ev };
    if (fam === 'keys') { loop.voice = instOk(o.inst || o.voice) || 'piano'; if (arp) loop.arp = true; if (o.inst && !instOk(o.inst)) w.push('звук «' + String(o.inst).slice(0, 16) + '» неизвестен — рояль'); }
    return { loop, warns: w };
  }
  if (fam === 'pads') {
    if (bars == null) bars = 4;
    fixBars();
    const hold = num(o.hold, 0, AI_LIMITS.bars);
    const loop = { id: 'ai', fam: 'pads', bars, ev: [], voice: instOk(o.inst || o.voice) || 'wwarm', hold: hold == null ? 0 : Math.round(hold) };
    if (o.inst && !instOk(o.inst)) w.push('звук «' + String(o.inst).slice(0, 16) + '» неизвестен — тёплый пэд');
    return { loop, warns: w };
  }
  if (fam === 'chords') {
    if (!Array.isArray(o.chords)) return { error: 'у аккордов нет chords (список [«Am7», тактов])' };
    const list = [], max = AI_LIMITS.chords; let t = 0;
    o.chords.slice(0, max).forEach((c, k) => {
      const name = Array.isArray(c) ? c[0] : c && typeof c === 'object' ? c.c : c, len = Array.isArray(c) ? num(c[1], 0.25, AI_LIMITS.bars) : c && typeof c === 'object' ? num(c.bars, 0.25, AI_LIMITS.bars) : 1;
      const ch = parseChordName(name);
      if (!ch) { w.push('аккорд ' + (k + 1) + ' «' + String(name).slice(0, 12) + '» не распознан — пропущен'); return; }
      if (len == null) { w.push('аккорд ' + (k + 1) + ': длина в тактах 0,25–' + AI_LIMITS.bars + ' — взят 1'); }
      list.push({ pc: ch.pc, type: ch.type, bars: len == null ? 1 : r2(len) });
    });
    if (!list.length) return { error: 'нет ни одного распознанного аккорда' };
    const total = list.reduce((n, c) => n + c.bars, 0);
    if (total > AI_LIMITS.bars) w.push('аккордов на ' + r2(total) + ' тактов: допустимо до ' + AI_LIMITS.bars + ' — лишнее отброшено');
    let acc = 0; const keep = [];
    for (const c of list) { if (acc >= AI_LIMITS.bars) break; keep.push({ ...c, bars: Math.min(c.bars, AI_LIMITS.bars - acc) }); acc += c.bars; }
    return { spec: { fam: 'chords', bars: Math.max(1, Math.ceil(acc - 1e-6)), chords: keep }, warns: w };
  }
  // мелодия и соло: ноты по именам, начало и длина в долях от начала куска
  if (!Array.isArray(o.notes)) return { error: 'у мелодии нет notes (список [нота, начало, длина, сила])' };
  if (bars == null) bars = 0;
  const notes = [];
  o.notes.slice(0, AI_LIMITS.notes).forEach((n, k) => {
    const m = Array.isArray(n) ? noteMidi(n[0]) : null, t = Array.isArray(n) ? num(n[1], 0, AI_LIMITS.bars * 8) : null, d = Array.isArray(n) ? num(n[2], 0.0625, 64) : null;
    if (m == null || m < NOTE_LO || m > NOTE_HI || t == null || d == null) { w.push('нота ' + (k + 1) + ': нужен вид [нота C2–C7, начало ≥ 0, длина > 0, сила 0–1] — пропущена'); return; }
    const v = Array.isArray(n) && n[3] != null ? num(n[3], 0.05, 1) : 0.8;
    notes.push({ t: r2(t), d: r2(d), m, v: v == null ? 0.8 : r2(v) });
  });
  if (!notes.length) return { error: 'нет ни одной нотки' };
  const num4 = 4, need = Math.max(...notes.map((n) => n.t + n.d)) / num4;
  bars = Math.min(AI_LIMITS.bars, Math.max(1, bars || Math.ceil(need - 1e-6)));
  const inst = instOk(o.inst);
  if (o.inst && !inst) w.push('звук «' + String(o.inst).slice(0, 16) + '» неизвестен — рояль');
  return { spec: { fam: 'notes', bars, notes, inst: inst || 'piano' }, warns: w };
}

/* ---------- правки ---------- */

const PROJECT_SET = ['bpm', 'key', 'swing', 'num', 'name'];
const TRACK_SET = ['name', 'vol', 'pan', 'mute', 'solo', 'inst'];
const CLIP_SET = ['at', 'len', 'mute', 'gain', 'loop', 'semi'];
const cleanKey = (v) => { const m = /^([A-Ga-g])([#♯b♭]?)(m|min|minor)?$/.exec(String(v == null ? '' : v).trim()); if (!m) return null; const n = parseNote(m[1].toUpperCase() + (m[2] || '')); return n ? { pc: n.pc, minor: !!m[3] } : null; };

// Правка от модели → очищенная { op, … , warns } | { error }
//   add / replace — партия (cleanPattern); project — темп, тональность…; track — дорожка; clip — двигать, копировать, убирать
export function cleanStudioOp(o) {
  if (!o || typeof o !== 'object') return { error: 'правка не объект' };
  if (o.op === 'add' || o.op === 'replace') {
    const r = cleanPattern(o);
    if (r.error) return { error: r.error };
    const out = { op: o.op, warns: r.warns };
    if (r.loop) out.loop = r.loop; else out.spec = r.spec;
    if (o.op === 'replace') { if (typeof o.clip !== 'string' || !o.clip) return { error: 'у replace нет clip' }; out.clip = o.clip.slice(0, 40); }
    else { const at = int(o.at); out.at = at != null && at >= 1 ? Math.min(at, 512) : 1; if (typeof o.track === 'string' && o.track) out.track = o.track.slice(0, 40); }
    const len = int(o.len);
    if (len != null && len >= 1) out.len = Math.min(len, AI_LIMITS.len);
    if (typeof o.name === 'string' && o.name.trim()) out.name = o.name.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, AI_LIMITS.name);
    return out;
  }
  if (o.op === 'project') {
    const set = {}, w = [], s = o.set && typeof o.set === 'object' ? o.set : {};
    if ('bpm' in s) { const v = num(s.bpm, 30, 300); if (v != null) set.bpm = Math.round(v * 10) / 10; else w.push('темп 30–300'); }
    if ('key' in s) { const k = cleanKey(s.key); if (k) set.key = k; else w.push('тональность «' + String(s.key).slice(0, 8) + '» не распознана (C, Am, F♯m…)'); }
    if ('swing' in s) { const v = num(s.swing, 0, 1); if (v != null) set.swing = r2(v); else w.push('свинг 0–1'); }
    if ('num' in s) { const v = int(s.num); if (v != null && v >= 2 && v <= 12) set.num = v; else w.push('долей в такте 2–12'); }
    if ('name' in s) set.name = String(s.name == null ? '' : s.name).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 60);
    return Object.keys(set).length ? { op: 'project', set, warns: w } : { error: 'в project нечего менять' + (w.length ? ': ' + w.join('; ') : '') };
  }
  if (o.op === 'track') {
    if (typeof o.id !== 'string' || !o.id) return { error: 'у track нет id' };
    const set = {}, w = [], s = o.set && typeof o.set === 'object' ? o.set : {};
    if ('name' in s) set.name = String(s.name == null ? '' : s.name).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 40);
    if ('vol' in s) { const v = num(s.vol, 0, 1.5); if (v != null) set.vol = r2(v); else w.push('громкость 0–1,5'); }
    if ('pan' in s) { const v = num(s.pan, -1, 1); if (v != null) set.pan = r2(v); else w.push('панорама −1…1'); }
    if ('mute' in s) set.mute = !!s.mute;
    if ('solo' in s) set.solo = !!s.solo;
    if ('inst' in s) { const v = instOk(s.inst); if (v) set.inst = v; else w.push('звук «' + String(s.inst).slice(0, 16) + '» неизвестен'); }
    return Object.keys(set).length ? { op: 'track', id: o.id.slice(0, 40), set, warns: w } : { error: 'в track нечего менять' + (w.length ? ': ' + w.join('; ') : '') };
  }
  if (o.op === 'clip') {
    if (typeof o.id !== 'string' || !o.id) return { error: 'у clip нет id' };
    const out = { op: 'clip', id: o.id.slice(0, 40), warns: [] };
    if (o.act === 'remove') { out.act = 'remove'; return out; }
    if (o.act === 'copy') { const at = int(o.at); if (at == null || at < 1) return { error: 'у copy нужен at (такт ≥ 1)' }; out.act = 'copy'; out.at = Math.min(at, 512); const n = int(o.count); out.count = n != null && n >= 1 ? Math.min(n, 16) : 1; return out; }
    const s = o.set && typeof o.set === 'object' ? o.set : {}, set = {};
    if ('at' in s) { const v = int(s.at); if (v != null && v >= 1) set.at = Math.min(v, 512); else out.warns.push('at — такт ≥ 1'); }
    if ('len' in s) { const v = num(s.len, 0.25, AI_LIMITS.len); if (v != null) set.len = r2(v); else out.warns.push('len — тактов 0,25–' + AI_LIMITS.len); }
    if ('mute' in s) set.mute = !!s.mute;
    if ('loop' in s) set.loop = !!s.loop;
    if ('gain' in s) { const v = num(s.gain, 0, 2); if (v != null) set.gain = r2(v); else out.warns.push('gain 0–2'); }
    if ('semi' in s) { const v = int(s.semi); if (v != null && v >= -24 && v <= 24) set.semi = v; else out.warns.push('semi −24…24'); }
    if (!Object.keys(set).length) return { error: 'в clip нечего менять' };
    out.set = set; return out;
  }
  return { error: 'правка должна быть add, replace, project, track или clip' };
}
export function cleanStudioOps(arr) {
  const ops = [], errors = [];
  (Array.isArray(arr) ? arr : []).slice(0, AI_LIMITS.ops).forEach((o, i) => { const r = cleanStudioOp(o); if (r.error) errors.push('правка ' + (i + 1) + ': ' + r.error); else ops.push(r); });
  return { ops, errors };
}

/* ---------- применение ---------- */

// Своя партия (аккорды, мелодия) → клип: подходящая свободная дорожка того же вида или новая
const busy = (p, tr, at, len) => p.clips.some((c) => c.tr === tr.id && c.at < at + len - 1e-6 && c.at + c.len > at + 1e-6);
function placeSpec(p, spec, at, want) {
  if (p.clips.length >= CLIPS_MAX) return null;
  const beat = Math.max(0, Math.round(at / p.num) * p.num), len = spec.bars * p.num;
  let data, kind, patch = {};
  if (spec.fam === 'chords') { kind = 'chords'; data = newData('chords', spec.bars); let t = 0; spec.chords.forEach((c) => { setChord(data, t * p.num, c.bars * p.num, c.pc, c.type); t += c.bars; }); }
  else { kind = 'notes'; data = newData('notes', spec.bars); data.notes = spec.notes.filter((n) => n.t < len).map((n) => ({ ...n, d: Math.min(n.d, len - n.t) })).sort((a, b) => a.t - b.t || a.m - b.m); patch.inst = spec.inst; }
  const fits = (t) => t.kind === kind && (kind === 'chords' || (!t.role && t.inst !== 'abass' && t.inst === spec.inst));
  const w = want && p.tracks.find((t) => t.id === want);
  let tr = w && w.kind === kind && !busy(p, w, beat, len) ? w : p.tracks.find((t) => fits(t) && !busy(p, t, beat, len));
  let fresh = false;
  if (!tr) { if (p.tracks.length >= 24) return null; tr = newTrack(kind, p.tracks.length, patch); p.tracks.push(tr); fresh = true; }
  const c = newClip(p, tr, beat, len, data);
  p.clips.push(c); p.clips.sort((a, b) => a.at - b.at);
  return { tr, clip: c, fresh };
}

// Применить к проекту p → { n, undo }; undo — шаги в порядке выполнения, откат — с конца
export function applyStudioOps(p, ops) {
  const steps = []; let n = 0;
  const place = (o, at, want) => (o.loop ? placeLoop(p, o.loop, at, want) : placeSpec(p, o.spec, at, want));
  const stretch = (o, r) => {
    if (!o.len) return;
    const nx = p.clips.filter((c) => c.tr === r.tr.id && c !== r.clip && c.at >= r.clip.at + 1e-6).reduce((m, c) => Math.min(m, c.at), Infinity);
    const want = o.len * p.num, room = nx - r.clip.at;
    if (want > r.clip.len && room > r.clip.len + 1e-6) { r.clip.len = Math.min(want, room); r.clip.loop = true; }
  };
  for (const o of ops) {
    if (o.op === 'add' || o.op === 'replace') {
      if (p.clips.length >= CLIPS_MAX) continue;
      let r, old = null, idx = -1;
      if (o.op === 'replace') {
        old = p.clips.find((c) => c.id === o.clip); if (!old) continue;
        idx = p.clips.indexOf(old); p.clips.splice(idx, 1);
        r = place(o, old.at, old.tr);
        if (!r) { p.clips.splice(idx, 0, old); continue; }
      } else { r = place(o, (o.at - 1) * p.num, o.track || null); if (!r) continue; }
      stretch(o, r);
      if (o.name) r.clip.name = o.name;
      steps.push({ k: 'add', clip: r.clip.id, track: r.fresh ? r.tr.id : null, removed: old ? JSON.parse(JSON.stringify(old)) : null }); n++;
    } else if (o.op === 'project') {
      const prev = {}; for (const k of Object.keys(o.set)) prev[k] = JSON.parse(JSON.stringify(p[k] === undefined ? null : p[k]));
      Object.assign(p, o.set); steps.push({ k: 'project', prev }); n++;
    } else if (o.op === 'track') {
      const t = p.tracks.find((x) => x.id === o.id); if (!t) continue;
      const prev = {}; for (const k of Object.keys(o.set)) prev[k] = t[k] === undefined ? null : t[k];
      Object.assign(t, o.set); steps.push({ k: 'track', id: t.id, prev }); n++;
    } else if (o.op === 'clip') {
      const c = p.clips.find((x) => x.id === o.id); if (!c) continue;
      if (o.act === 'remove') { const copy = JSON.parse(JSON.stringify(c)); p.clips = p.clips.filter((x) => x !== c); steps.push({ k: 'removed', clip: copy }); n++; }
      else if (o.act === 'copy') {
        const ids = [];
        for (let i = 0; i < o.count && p.clips.length < CLIPS_MAX; i++) { const cp = JSON.parse(JSON.stringify(c)); cp.id = 'cl' + Math.random().toString(36).slice(2, 10) + i; cp.at = (o.at - 1) * p.num + i * c.len; p.clips.push(cp); ids.push(cp.id); }
        if (ids.length) { p.clips.sort((a, b) => a.at - b.at); steps.push({ k: 'copied', ids }); n++; }
      } else {
        const prev = {}, s = { ...o.set };
        if ('at' in s) { s.at = (s.at - 1) * p.num; }
        if ('len' in s) s.len = s.len * p.num;
        for (const k of Object.keys(s)) prev[k] = c[k] === undefined ? null : c[k];
        Object.assign(c, s); p.clips.sort((a, b) => a.at - b.at); steps.push({ k: 'clip', id: c.id, prev }); n++;
      }
    }
  }
  return { n, undo: { steps } };
}
// Клипы, добавленные правками (для «играть с этого места» и выделения)
export const addedClips = (u) => ((u && u.steps) || []).filter((x) => x.k === 'add' || x.k === 'copied').flatMap((x) => (x.k === 'add' ? [x.clip] : x.ids));
export function undoStudioOps(p, u) {
  if (!u || !Array.isArray(u.steps)) return false;
  for (const s of u.steps.slice().reverse()) {
    if (s.k === 'add') {
      p.clips = p.clips.filter((c) => c.id !== s.clip);
      if (s.track && !p.clips.some((c) => c.tr === s.track)) p.tracks = p.tracks.filter((t) => t.id !== s.track);
      if (s.removed && !p.clips.some((x) => x.id === s.removed.id)) p.clips.push(s.removed);
    } else if (s.k === 'removed') { if (!p.clips.some((x) => x.id === s.clip.id)) p.clips.push(s.clip); }
    else if (s.k === 'copied') { const gone = new Set(s.ids); p.clips = p.clips.filter((c) => !gone.has(c.id)); }
    else if (s.k === 'project') Object.entries(s.prev).forEach(([k, v]) => { if (v === null) delete p[k]; else p[k] = v; });
    else if (s.k === 'track') { const t = p.tracks.find((x) => x.id === s.id); if (t) Object.entries(s.prev).forEach(([k, v]) => { if (v === null) delete t[k]; else t[k] = v; }); }
    else if (s.k === 'clip') { const c = p.clips.find((x) => x.id === s.id); if (c) Object.entries(s.prev).forEach(([k, v]) => { if (v === null) delete c[k]; else c[k] = v; }); }
  }
  p.clips.sort((a, b) => a.at - b.at);
  return true;
}

/* ---------- что видит модель ---------- */

const TONE_BY_IV = { 0: 'r', 3: '3', 4: '3', 7: '5', 9: '6', 10: '7', 11: '7' };
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const midiName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const one = (v) => String(v == null ? '' : v).replace(/[\r\n|]+/g, ' ').trim();
const rowsOf = (d, lane, bars, spb) => Array.from({ length: bars }, (_, b) => { let r = ''; for (let k = 0; k < Math.min(16, spb); k++) r += (d.steps[lane] || []).includes(b * spb + k) ? 'x' : '.'; return r.padEnd(16, '.'); });
const bassEv = (p, c, tl) => {
  const bars = c.data.bars, out = Array.from({ length: bars }, () => []);
  (c.data.notes || []).slice().sort((a, b) => a.t - b.t).forEach((n) => {
    const b = Math.floor(n.t / p.num + 1e-6); if (b >= bars) return;
    const step = Math.round((n.t - b * p.num) / STEP), ch = chordAtBeat(tl, c.at + n.t), iv = ch ? (n.m - ch.pc + 1200) % 12 : null;
    out[b].push([step, Math.max(1, Math.round(n.d / STEP)), iv != null && TONE_BY_IV[iv] ? TONE_BY_IV[iv] : 'm' + n.m]);
  });
  return out;
};
export function studioContext(p) {
  if (!p) return '';
  const spb = Math.round(p.num / STEP), tl = chordsTimeline(p), bars = songBars(p);
  let s = 'СТУДИЯ. Проект «' + one(p.name) + '»: темп ' + Math.round(p.bpm) + ', размер ' + p.num + '/' + p.den + ' (шагов в такте: ' + spb + '), тональность ' + NOTE[p.key.pc] + (p.key.minor ? 'm' : '') + (p.swing ? ', свинг ' + Math.round(p.swing * 100) + ' %' : '') + ', тактов в песне: ' + bars + '.';
  if (tl.length) {
    const per = []; for (let b = 0; b < Math.min(bars, 64); b++) { const cs = tl.filter((c) => c.t >= b * p.num - 1e-6 && c.t < (b + 1) * p.num - 1e-6).map((c) => chordName(c.pc, c.type)); per.push((b + 1) + ': ' + (cs.length ? cs.join(' ') : '·')); }
    s += '\nАккорды по тактам (· — тянется предыдущий): ' + per.join(' | ');
  } else s += '\nАккордов в проекте нет: бас, клавиши и пэды играют от тоники тональности.';
  s += '\nДорожки: id | вид | название | звук/роль | громкость | панорама | выкл';
  s += '\n' + p.tracks.map((t) => [t.id, t.kind, one(t.name), t.role || t.inst || '', t.vol, t.pan || 0, t.mute ? 'да' : 'нет'].join(' | ')).join('\n');
  const cl = p.clips.slice().sort((a, b) => a.at - b.at).slice(0, AI_LIMITS.ctxClips);
  if (cl.length) {
    s += '\nКлипы: id | дорожка | с такта | тактов | кусок (тактов в рисунке) | повтор | выкл';
    s += '\n' + cl.map((c) => [c.id, c.tr, Math.round(c.at / p.num * 100) / 100 + 1, Math.round((c.len / p.num) * 10) / 10, c.data && c.data.bars || '', c.loop ? 'да' : 'нет', c.mute ? 'да' : 'нет'].join(' | ')).join('\n');
    cl.forEach((c) => {
      const tr = p.tracks.find((t) => t.id === c.tr); if (!tr || !c.data || !c.data.bars || c.data.bars > AI_LIMITS.ctxBars) return;
      if (tr.kind === 'drums') { const lanes = DRUMS.filter((l) => (c.data.steps[l] || []).length); if (lanes.length) s += '\nУдарные ' + c.id + ': ' + lanes.map((l) => l + ' ' + JSON.stringify(rowsOf(c.data, l, c.data.bars, spb))).join(', '); }
      else if (tr.kind === 'notes' && (tr.role === 'bass' || tr.inst === 'abass') && (c.data.notes || []).length) s += '\nБас ' + c.id + ': ' + JSON.stringify(bassEv(p, c, tl));
      else if (tr.kind === 'notes' && (c.data.notes || []).length) s += '\nНоты ' + c.id + ' (нота, начало, длина в долях): ' + c.data.notes.slice(0, AI_LIMITS.notesCtx).map((n) => midiName(n.m) + ' ' + Math.round(n.t * 100) / 100 + ' ' + Math.round(n.d * 100) / 100).join('; ') + (c.data.notes.length > AI_LIMITS.notesCtx ? ' … ещё ' + (c.data.notes.length - AI_LIMITS.notesCtx) : '');
    });
  }
  return s;
}

// Строки карточки: что будет сделано
const barsWord = (n) => n + ' ' + (n === 1 ? 'такт' : n < 5 ? 'такта' : 'тактов');
export function describeStudioOps(ops) {
  const FAM = { drums: 'Ударные', bass: 'Бас', chords: 'Аккорды', keys: 'Клавиши', pads: 'Пэды', notes: 'Мелодия' };
  return (ops || []).map((o) => {
    if (o.op === 'project') return 'Проект: ' + Object.entries(o.set).map(([k, v]) => ({ bpm: 'темп', key: 'тональность', swing: 'свинг', num: 'долей', name: 'название' }[k] || k) + ' → ' + (k === 'key' ? NOTE[v.pc] + (v.minor ? 'm' : '') : v)).join(', ');
    if (o.op === 'track') return 'Дорожка ' + o.id + ': ' + Object.entries(o.set).map(([k, v]) => ({ vol: 'громкость', pan: 'панорама', mute: 'выкл', solo: 'соло', inst: 'звук', name: 'название' }[k] || k) + ' → ' + v).join(', ');
    if (o.op === 'clip') return 'Клип ' + o.id + ': ' + (o.act === 'remove' ? 'убрать' : o.act === 'copy' ? 'копия ×' + o.count + ' с такта ' + o.at : Object.entries(o.set).map(([k, v]) => ({ at: 'с такта', len: 'тактов', mute: 'выкл', loop: 'повтор', gain: 'громкость', semi: 'сдвиг' }[k] || k) + ' → ' + v).join(', '));
    const l = o.loop || o.spec, where = o.op === 'replace' ? 'заменить клип ' + o.clip : 'с такта ' + o.at;
    const LANE = { kick: 'бочка', snare: 'малый', hat: 'хэт', ohat: 'открытый хэт', clap: 'хлопок' };
    const body = l.fam === 'drums' ? Object.entries(l.lanes).map(([k, rows]) => (LANE[k] || k) + ' ' + rows.reduce((n, r) => n + (r.match(/x/g) || []).length, 0)).join(', ')
      : l.fam === 'chords' ? l.chords.map((c) => chordName(c.pc, c.type) + (c.bars !== 1 ? '×' + c.bars : '')).join(' ')
      : l.fam === 'notes' ? l.notes.length + ' нот (' + (l.inst || 'piano') + ')'
      : l.fam === 'pads' ? (l.voice || 'пэд') : (l.ev || []).reduce((n, b) => n + b.length, 0) + ' нот';
    return FAM[l.fam] + (o.name ? ' «' + o.name + '»' : '') + ' · ' + barsWord(l.bars) + ' · ' + where + (o.len ? ' · на ' + o.len + ' тактов' : '') + ': ' + body;
  });
}

// Часть системной инструкции: формат блока ```melete-studio
export const STUDIO_PROMPT = [
  '5) Студия (открыт проект, см. данные «СТУДИЯ»): блок ```melete-studio с массивом правок. Партии из семейств drums, bass, keys, pads студия кладёт клипом по аккордам проекта сама (пиши только рисунок); аккорды и мелодию пишешь ты.',
  'Ударные: {"op":"add","at":1,"bars":2,"fam":"drums","lanes":{"kick":["x...x...x...x...","x...x...x..x...."],"snare":["....x.......x..."],"hat":["x.x.x.x.x.x.x.x."]},"len":8,"name":"Рок"}. Дорожки: kick, snare, hat (закрытый), ohat (открытый), clap. Для каждой — массив строк по числу тактов (одна строка — одинаково во всех тактах). Строка — ровно 16 шестнадцатых одного такта, x — удар, . — пауза.',
  'Бас: {"op":"add","at":1,"bars":2,"fam":"bass","ev":[[[0,2,"r"],[2,2,"r"],[4,2,"5"],[8,4,"r"]],[[0,4,"r"],[8,4,"a"]]],"len":8}. ev — массив тактов; такт — список нот [шаг 0–15, длина в шестнадцатых, тон]; тон относительно аккорда: r корень, 3 терция, 5 квинта, 6 секста, 7 септима, 8 октава выше, a подход к корню следующего аккорда.',
  'Клавиши: {"op":"add","at":1,"bars":2,"fam":"keys","inst":"fmep","ev":[[[2,2],[6,2],[10,2],[14,2]],[[0,8],[8,8]]]} — удары целого аккорда [шаг, длина]; с "arp":true — арпеджио [шаг, длина, номер ноты аккорда 0–8]. Пэды: {"op":"add","at":1,"bars":4,"fam":"pads","inst":"wwarm","hold":0} — длинные звуки на аккорд (hold — тактов, 0 — на весь аккорд).',
  'Аккорды: {"op":"add","at":1,"bars":4,"fam":"chords","chords":[["Am7",1],["Dm",1],["G7",1],["Cmaj7",1]]} — [название, длина в тактах (можно 0,5)]; названия: C, Am, F♯m7, B♭maj7, Gsus4, Edim, Caug, Cadd9, G7, D9…',
  'Мелодия, соло, любая партия нотами: {"op":"add","at":5,"bars":2,"fam":"notes","inst":"piano","notes":[["E5",0,1,0.9],["G5",1,0.5],["A5",1.5,0.5],["C6",2,2]]} — [нота C2–C7 или номер MIDI, начало в долях от начала куска (в такте 4/4 — доли 0–3), длина в долях, сила 0–1 (можно не указывать)].',
  'Звуки (inst): ' + INSTRUMENTS.join(', ') + '. at — с какого такта (с 1), bars — тактов в куске (1–16), len — на сколько тактов повторить (необязательно; по умолчанию — по аккордам проекта). Заменить существующий клип: {"op":"replace","clip":"<id клипа из данных>", …партия}.',
  'Править проект: {"op":"project","set":{"bpm":96,"key":"Am","swing":0.2,"num":4,"name":"Название"}}; дорожку: {"op":"track","id":"<id>","set":{"vol":0.8,"pan":-0.3,"mute":false,"solo":false,"inst":"fmep","name":"Лид"}}; клип: {"op":"clip","id":"<id>","set":{"at":5,"len":4,"mute":true,"gain":0.8,"loop":true,"semi":2}}, копия {"op":"clip","id":"<id>","act":"copy","at":9,"count":2}, убрать {"op":"clip","id":"<id>","act":"remove"}. Не больше ' + AI_LIMITS.ops + ' правок в блоке.',
  'Партия должна быть играбельной и музыкальной: ударные — ровный грув с акцентом на сильных долях и, если просят, филл в последнем такте; бас связан с бочкой и аккордами; мелодия поётся и укладывается в тональность проекта; не больше 4 нот одновременно в клавишах. «Попроще/посложнее» — меняй густоту, а не стиль. Если данных мало, спроси, а не выдумывай.',
].join('\n');
