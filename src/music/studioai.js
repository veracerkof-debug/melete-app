// Студия и нейросеть (слово автора 26.11.2026): ИИ — любой, человек сам выбирает (свой ключ или копирование) — не добавляет звук, а пишет ДАННЫЕ:
// ударные (строки по 16 знаков на такт) и бас (события на шестнадцатых с тоном относительно аккорда) — тот же формат, что у каталога «Рисунков»
// (studioloops.js). Студия сама кладёт партию клипом по аккордам проекта, поэтому бас всегда в тональности, а ошибки модели не звучат фальшью.
// Чистые функции без DOM и сети: очистка ответа с понятными замечаниями, применение к проекту, откат, текст контекста и карточек.
import { DRUMS, STEP, chordName, CLIPS_MAX, songBars } from './project.js';
import { placeLoop, chordsTimeline, chordAtBeat } from './studioloops.js';

export const AI_LIMITS = { bars: 16, ops: 12, len: 64, ctxClips: 40, ctxBars: 16, name: 40 };
export const TONES = ['r', '3', '5', '6', '7', '8', 'a'];
const HIT = new Set(['x', 'X', '1', 'o', 'O', '*', '#']);
const int = (v) => { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? +v : NaN; return Number.isFinite(n) ? Math.round(n) : null; };

// Строка такта → ровно 16 знаков 'x' и '.'; замечания (w) — что поправили
function cleanRow(s, w, where) {
  let r = String(s == null ? '' : s).replace(/[\s|]+/g, '');
  const hit = (c) => (HIT.has(c) ? 'x' : '.');
  if (r.length && r.length !== 16) w.push(where + ': в строке ' + r.length + ' знаков, нужно 16' + (r.length < 16 ? ' — дополнено паузами' : ' — лишнее отброшено'));
  r = r.slice(0, 16).split('').map(hit).join('');
  return r.padEnd(16, '.');
}

// Партия от модели → { loop, warns } | { error }. fam: drums | bass. Остальное (аккорды, клавиши) — позже.
export function cleanPattern(o) {
  const w = [];
  if (!o || typeof o !== 'object') return { error: 'нет рисунка' };
  const fam = o.fam === 'drum' ? 'drums' : o.fam;
  if (fam !== 'drums' && fam !== 'bass') return { error: 'неизвестный вид «' + String(o.fam).slice(0, 20) + '» (есть drums и bass)' };
  let bars = int(o.bars);
  if (bars == null) bars = fam === 'drums' ? 0 : (Array.isArray(o.ev) ? o.ev.length : 0);
  if (fam === 'drums' && !bars && o.lanes && typeof o.lanes === 'object') for (const v of Object.values(o.lanes)) if (Array.isArray(v)) bars = Math.max(bars, v.length);
  if (!bars) bars = 1;
  if (bars < 1 || bars > AI_LIMITS.bars) { w.push('тактов ' + bars + ': допустимо 1–' + AI_LIMITS.bars); bars = Math.max(1, Math.min(AI_LIMITS.bars, bars)); }
  if (fam === 'drums') {
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
  if (!Array.isArray(o.ev)) return { error: 'у баса нет ev' };
  if (o.ev.length > bars) bars = Math.min(AI_LIMITS.bars, o.ev.length);
  const ev = Array.from({ length: bars }, () => []);
  let count = 0;
  o.ev.slice(0, bars).forEach((bar, b) => {
    if (!Array.isArray(bar)) return;
    const seen = new Set();
    bar.forEach((n, k) => {
      const step = Array.isArray(n) ? int(n[0]) : null, len = Array.isArray(n) ? int(n[1]) : null, tone = Array.isArray(n) ? String(n[2]).trim() : '';
      if (step == null || len == null || step < 0 || step > 15 || len < 1) { w.push('такт ' + (b + 1) + ', нота ' + (k + 1) + ': нужен вид [шаг 0–15, длина ≥ 1, тон] — пропущена'); return; }
      if (!TONES.includes(tone)) { w.push('такт ' + (b + 1) + ', нота ' + (k + 1) + ': тон «' + tone.slice(0, 6) + '» неизвестен (есть ' + TONES.join(' ') + ') — пропущена'); return; }
      if (seen.has(step)) { w.push('такт ' + (b + 1) + ': две ноты на шаге ' + step + ' — вторая пропущена'); return; }
      seen.add(step); ev[b].push([step, Math.min(len, 16 - step), tone]); count++;
    });
    ev[b].sort((a, c) => a[0] - c[0]);
  });
  if (!count) return { error: 'в басу нет ни одной ноты' };
  return { loop: { id: 'ai', fam: 'bass', bars, ev }, warns: w };
}

// Правка от модели: { op: 'add', at, ...рисунок } | { op: 'replace', clip, ...рисунок } → { op, loop, at?, clip?, len?, name?, warns } | { error }
export function cleanStudioOp(o) {
  if (!o || typeof o !== 'object' || (o.op !== 'add' && o.op !== 'replace')) return { error: 'правка должна быть add или replace' };
  const r = cleanPattern(o);
  if (r.error) return { error: r.error };
  const out = { op: o.op, loop: r.loop, warns: r.warns };
  if (o.op === 'replace') { if (typeof o.clip !== 'string' || !o.clip) return { error: 'у replace нет clip' }; out.clip = o.clip.slice(0, 40); }
  else { const at = int(o.at); out.at = at != null && at >= 1 ? Math.min(at, 512) : 1; if (typeof o.track === 'string' && o.track) out.track = o.track.slice(0, 40); }
  const len = int(o.len);
  if (len != null && len >= 1) out.len = Math.min(len, AI_LIMITS.len);
  if (typeof o.name === 'string' && o.name.trim()) out.name = o.name.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, AI_LIMITS.name);
  return out;
}
export function cleanStudioOps(arr) {
  const ops = [], errors = [];
  (Array.isArray(arr) ? arr : []).slice(0, AI_LIMITS.ops).forEach((o, i) => { const r = cleanStudioOp(o); if (r.error) errors.push('правка ' + (i + 1) + ': ' + r.error); else ops.push(r); });
  return { ops, errors };
}

// Применить к проекту p → { n, undo }; undo — только то, что сделано (добавленные клипы и дорожки, снятые клипы)
export function applyStudioOps(p, ops) {
  const undo = { clips: [], tracks: [], removed: [] }; let n = 0;
  for (const o of ops) {
    if (p.clips.length >= CLIPS_MAX) break;
    let r, old = null, idx = -1;
    if (o.op === 'replace') {
      old = p.clips.find((c) => c.id === o.clip); if (!old) continue;
      idx = p.clips.indexOf(old); p.clips.splice(idx, 1);
      r = placeLoop(p, o.loop, old.at, old.tr);
      if (!r) { p.clips.splice(idx, 0, old); continue; }
      undo.removed.push(JSON.parse(JSON.stringify(old)));
    } else {
      r = placeLoop(p, o.loop, (o.at - 1) * p.num, o.track || null);
      if (!r) continue;
    }
    if (o.len) { // растянуть: рисунок повторяется; дальше соседнего клипа дорожки не тянем
      const nx = p.clips.filter((c) => c.tr === r.tr.id && c !== r.clip && c.at >= r.clip.at + 1e-6).reduce((m, c) => Math.min(m, c.at), Infinity);
      const want = o.len * p.num, room = nx - r.clip.at;
      if (want > r.clip.len && room > r.clip.len + 1e-6) { r.clip.len = Math.min(want, room); r.clip.loop = true; }
    }
    if (o.name) r.clip.name = o.name;
    undo.clips.push(r.clip.id); if (r.fresh) undo.tracks.push(r.tr.id); n++;
  }
  return { n, undo };
}
export function undoStudioOps(p, u) {
  if (!u) return false;
  const gone = new Set(u.clips || []);
  p.clips = p.clips.filter((c) => !gone.has(c.id));
  (u.tracks || []).forEach((id) => { if (!p.clips.some((c) => c.tr === id)) p.tracks = p.tracks.filter((t) => t.id !== id); });
  (u.removed || []).forEach((c) => { if (!p.clips.some((x) => x.id === c.id)) p.clips.push(c); });
  p.clips.sort((a, b) => a.at - b.at);
  return true;
}

/* ---------- что видит модель ---------- */

const TONE_BY_IV = { 0: 'r', 3: '3', 4: '3', 7: '5', 9: '6', 10: '7', 11: '7' };
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
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
  } else s += '\nАккордов в проекте нет: бас играет от тоники тональности.';
  s += '\nДорожки: id | вид | название | роль';
  s += '\n' + p.tracks.map((t) => [t.id, t.kind, one(t.name), t.role || t.inst || ''].join(' | ')).join('\n');
  const cl = p.clips.slice().sort((a, b) => a.at - b.at).slice(0, AI_LIMITS.ctxClips);
  if (cl.length) {
    s += '\nКлипы: id | дорожка | с такта | тактов | кусок (тактов в рисунке) | повтор';
    s += '\n' + cl.map((c) => [c.id, c.tr, Math.round(c.at / p.num) + 1, Math.round((c.len / p.num) * 10) / 10, c.data && c.data.bars || '', c.loop ? 'да' : 'нет'].join(' | ')).join('\n');
    cl.forEach((c) => {
      const tr = p.tracks.find((t) => t.id === c.tr); if (!tr || !c.data || !c.data.bars || c.data.bars > AI_LIMITS.ctxBars) return;
      if (tr.kind === 'drums') { const lanes = DRUMS.filter((l) => (c.data.steps[l] || []).length); if (lanes.length) s += '\nУдарные ' + c.id + ': ' + lanes.map((l) => l + ' ' + JSON.stringify(rowsOf(c.data, l, c.data.bars, spb))).join(', '); }
      else if (tr.kind === 'notes' && (tr.role === 'bass' || tr.inst === 'abass') && (c.data.notes || []).length) s += '\nБас ' + c.id + ': ' + JSON.stringify(bassEv(p, c, tl));
    });
  }
  return s;
}

// Строки карточки: что будет добавлено
export function describeStudioOps(ops) {
  return (ops || []).map((o) => {
    const l = o.loop, where = o.op === 'replace' ? 'заменить клип ' + o.clip : 'с такта ' + o.at, bars = l.bars + ' ' + (l.bars === 1 ? 'такт' : l.bars < 5 ? 'такта' : 'тактов');
    const body = l.fam === 'drums' ? Object.entries(l.lanes).map(([k, rows]) => k + ' ' + rows.reduce((n, r) => n + (r.match(/x/g) || []).length, 0)).join(', ') : l.ev.reduce((n, b) => n + b.length, 0) + ' нот';
    return (l.fam === 'drums' ? 'Ударные' : 'Бас') + (o.name ? ' «' + o.name + '»' : '') + ' · ' + bars + ' · ' + where + (o.len ? ' · на ' + o.len + ' тактов' : '') + ': ' + body;
  });
}

// Часть системной инструкции: формат блока ```melete-studio
export const STUDIO_PROMPT = [
  '5) Студия (открыт проект, см. данные «СТУДИЯ»): блок ```melete-studio с массивом правок — партии ударных и баса. Студия сама кладёт их клипом и подставляет ноты баса по аккордам проекта, поэтому пиши только рисунок.',
  'Ударные: {"op":"add","at":1,"bars":2,"fam":"drums","lanes":{"kick":["x...x...x...x...","x...x...x..x...."],"snare":["....x.......x..."],"hat":["x.x.x.x.x.x.x.x."]},"len":8,"name":"Рок"}. Дорожки: kick, snare, hat (закрытый), ohat (открытый), clap. Для каждой — массив строк по числу тактов (одна строка — одинаково во всех тактах). Строка — ровно 16 шестнадцатых одного такта, x — удар, . — пауза.',
  'Бас: {"op":"add","at":1,"bars":2,"fam":"bass","ev":[[[0,2,"r"],[2,2,"r"],[4,2,"5"],[8,4,"r"]],[[0,4,"r"],[8,4,"a"]]],"len":8}. ev — массив тактов; такт — список нот [шаг 0–15, длина в шестнадцатых, тон]; тон относительно аккорда: r корень, 3 терция, 5 квинта, 6 секста, 7 септима, 8 октава выше, a подход к корню следующего аккорда.',
  'at — с какого такта (с 1), bars — тактов в рисунке (1–16), len — на сколько тактов повторить (необязательно; по умолчанию — по аккордам проекта). Заменить существующий клип: {"op":"replace","clip":"<id клипа из данных>", …рисунок}. Не больше ' + AI_LIMITS.ops + ' правок в блоке.',
  'Партия должна быть играбельной и музыкальной: ударные — один ровный грув с акцентом на сильных долях и, если просят, филл в последнем такте; бас — связан с бочкой и аккордами. Если человек просит «попроще» или «посложнее» — меняй густоту, а не стиль.',
].join('\n');
