// Программа выступления от нейросети (слово автора 25.11.2026): блок ```melete-show — правки номеров и падов Пульта по
// текстовой инструкции человека: эквалайзер-пресет, темп, тональность, громкость, плавные входы/уходы, события по времени записи.
// Чистые функции без DOM: очистка, применение к данным (device.show), откат, строки контекста и карточки.
import { normalizeNumber, normalizePad, normalizeProg, EQ_IDS } from '../../music/show.js';

export const SHOW_MAX = { ops: 30, prog: 64 };
const NUM_SET = ['eq', 'tempo', 'shift', 'level', 'fadeIn', 'fadeOut', 'title', 'note'];
const PAD_SET = ['level', 'speed', 'shift', 'eq', 'mode', 'again', 'fadeIn', 'fadeOut', 'from', 'to', 'duck', 'name'];
const isNum = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(+v);

// { op: 'number'|'pad', ref, set?: {…}, prog?: [{t,key?,tempo?,level?,ramp?}] } → очищенная правка или null
export function cleanShowOp(o) {
  if (!o || typeof o.ref !== 'string' || !o.ref || (o.op !== 'number' && o.op !== 'pad')) return null;
  const keys = o.op === 'number' ? NUM_SET : PAD_SET, set = {};
  if (o.set && typeof o.set === 'object') for (const k of keys) {
    if (!(k in o.set)) continue;
    const v = o.set[k];
    if (k === 'eq') { if (EQ_IDS.includes(v) || v === 'flat') set.eq = v === 'flat' ? '' : v; }
    else if (k === 'title' || k === 'name' || k === 'note') set[k] = String(v == null ? '' : v).slice(0, k === 'note' ? 4000 : 80);
    else if (k === 'mode' || k === 'again') set[k] = String(v);
    else if (k === 'duck') set.duck = !!v;
    else if (isNum(v)) set[k] = +v;
  }
  const out = { op: o.op, ref: o.ref };
  if (Object.keys(set).length) out.set = set;
  if (o.op === 'number' && Array.isArray(o.prog)) out.prog = normalizeProg(o.prog.slice(0, SHOW_MAX.prog));
  return out.set || out.prog ? out : null;
}

const numbers = (show) => (show && Array.isArray(show.events) ? show.events.filter((e) => !e.deleted).flatMap((e) => e.numbers || []) : []);
const pads = (show) => (show && Array.isArray(show.banks) ? show.banks.flatMap((b) => (b.pads || []).filter(Boolean)) : []);

// Применить к данным Пульта → { n, prev } (prev — для отката: полные копии изменённых номеров и падов)
export function applyShowOps(show, ops, now = Date.now()) {
  const prev = []; let n = 0;
  for (const o of ops) {
    const x = o.op === 'number' ? numbers(show).find((q) => q.id === o.ref) : pads(show).find((q) => q.id === o.ref);
    if (!x) continue;
    if (!prev.some((p) => p.id === x.id)) prev.push({ id: x.id, op: o.op, copy: JSON.parse(JSON.stringify(x)) });
    if (o.set) Object.assign(x, o.set);
    if (o.prog) x.prog = o.prog;
    Object.assign(x, o.op === 'number' ? normalizeNumber(x) : normalizePad(x));
    n++;
  }
  if (n) show.updatedAt = now;
  return { n, prev };
}
export function undoShowOps(show, prev) {
  for (const p of prev || []) {
    const x = p.op === 'number' ? numbers(show).find((q) => q.id === p.id) : pads(show).find((q) => q.id === p.id);
    if (x) { for (const k of Object.keys(x)) delete x[k]; Object.assign(x, p.copy); }
  }
}

// Контекст для модели: номера выступлений и пады (только то, что можно править)
export function showContext(show, recs = []) {
  const ns = numbers(show); if (!ns.length && !pads(show).length) return '';
  const nm = (id) => { const r = recs.find((q) => q.id === id); return r ? String(r.name || '').replace(/[\r\n|]+/g, ' ') : ''; };
  const one = (v) => String(v == null ? '' : v).replace(/[\r\n|]+/g, ' ').trim();
  let s = 'ПУЛЬТ ВЫСТУПЛЕНИЯ. Номера: id | название | трек | длина с | пресет эквалайзера | темп | сдвиг пт | громкость | событий программы\n' +
    ns.slice(0, 80).map((n) => [n.id, one(n.title), nm(n.file), Math.round(n.dur || 0), n.eq || 'flat', n.tempo || 1, n.shift || 0, n.level, (n.prog || []).length].join(' | ')).join('\n');
  const ps = pads(show).filter((p) => p.file || p.synth);
  if (ps.length) s += '\nПады: id | название | громкость | скорость | сдвиг пт | пресет | режим\n' + ps.slice(0, 80).map((p) => [p.id, one(p.name), p.level, p.speed || 1, p.shift || 0, p.eq || 'flat', p.mode].join(' | ')).join('\n');
  return s;
}
export const describeShow = (ops, show) => ops.map((o) => {
  const x = o.op === 'number' ? numbers(show).find((q) => q.id === o.ref) : pads(show).find((q) => q.id === o.ref);
  return (x ? one2(x.title || x.name) || o.ref : '? ' + o.ref) + ': ' + [o.set ? Object.entries(o.set).map(([k, v]) => k + ' ' + v).join(', ') : '', o.prog ? 'программа ' + o.prog.length : ''].filter(Boolean).join('; ');
});
const one2 = (v) => String(v == null ? '' : v).trim();
