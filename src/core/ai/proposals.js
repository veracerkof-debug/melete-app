// Предложения модели: блоки ```melete-json (песни, формат docs/ai-format.md) и ```melete-ops (правки полей песен).
// Модель ничего не применяет сама: человек нажимает «Применить» (или включил автоматический режим), перед применением —
// копия данных, после — «Отменить» в ленте чата. Только песни и только безопасные поля; удалений нет. Без DOM.
import { unpack, planImport, applyImport, normKey } from '../share.js';
import { deleteSong } from '../library.js';
import { canWrite } from './config.js';
import { cleanShowOp, applyShowOps, undoShowOps, describeShow, SHOW_MAX } from './showops.js';
import { applyItems, markEdited, norm } from '../../music/chordedit.js';
import { cleanQueries, describeQueries } from './queries.js';
import { cleanStudioOps, applyStudioOps, undoStudioOps, describeStudioOps } from '../../music/studioai.js';

export const REC_MAX = { ops: 20, chords: 2000, marks: 100 }, MARK_NAME = 40;
export const OPS_MAX = 100, FIELDS = ['title', 'artist', 'genre', 'key', 'targetBpm', 'notes', 'capo'];
const BLOCK = /```(melete-json|melete-ops|melete-rec|melete-show|melete-studio|melete-query)[ \t]*\r?\n([\s\S]*?)```/g;

// Значение поля → допустимое или undefined (не применять)
export function cleanField(k, v) {
  if (k === 'title') { const s = String(v == null ? '' : v).trim().slice(0, 120); return s || undefined; }
  if (k === 'artist') return String(v == null ? '' : v).trim().slice(0, 120);
  if (k === 'genre') return String(v == null ? '' : v).trim().slice(0, 40);
  if (k === 'notes') return String(v == null ? '' : v).slice(0, 20000);
  if (k === 'key') return normKey(v) || undefined;
  if (k === 'targetBpm') { const n = Math.round(+v); return n >= 20 && n <= 400 ? n : undefined; }
  if (k === 'capo') { const n = Math.round(+v); return n >= 0 && n <= 12 ? n : undefined; }
  return undefined;
}
// Правки записи от модели: { op: 'chords' | 'marks', ref: id записи, items: […] } → очищенная правка или null
const num = (v, lo, hi) => { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? +v : NaN; return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
export function cleanRecOp(o) {
  if (!o || typeof o.ref !== 'string' || !o.ref || !Array.isArray(o.items)) return null;
  if (o.op === 'chords') {
    const items = o.items.slice(0, REC_MAX.chords).map((x) => { const t = x && num(x.t, 0, 86400), c = x && typeof x.c === 'string' ? x.c.trim().slice(0, 24) : null; if (t == null || c == null) return null; const d = x.d == null ? null : num(x.d, 0.05, 3600); return d == null && x.d != null ? null : { t, ...(d == null ? {} : { d }), c }; }).filter(Boolean);
    return items.length ? { op: 'chords', ref: o.ref, items } : null;
  }
  if (o.op === 'marks') {
    const items = o.items.slice(0, REC_MAX.marks).map((x) => { const t = x && num(x.t, 0, 86400), name = x && typeof x.name === 'string' ? x.name.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, MARK_NAME) : null; return t == null || !name ? null : { t, name }; }).filter(Boolean);
    return items.length ? { op: 'marks', ref: o.ref, items } : null;
  }
  return null;
}
// Части песни → метки записи: время притягивается к ближайшей сильной доле (не дальше 0,8 с); рядом (в 0,5 с) уже есть метка — получает имя
export function mergeMarks(marks, items, downs = [], dur = 0) {
  const list = (marks || []).map((m) => ({ ...m }));
  for (const it of items) {
    let t = it.t;
    if (downs.length) { const c = downs.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a)); if (Math.abs(c - t) <= 0.8) t = c; }
    if (dur && t > dur) continue;
    t = Math.round(t * 10) / 10;
    const k = list.findIndex((m) => Math.abs(m.t - t) < 0.5);
    if (k >= 0) list[k].name = it.name; else if (list.length < 200) list.push({ t, name: it.name });
  }
  return list.sort((a, b) => a.t - b.t);
}
let seq = 0;
const pid = () => 'p' + Date.now().toString(36) + (seq++).toString(36);

// Найти предложения в ответе → { text (без блоков), proposals: [{ id, kind: 'songs'|'ops', status, manifest|ops, blocked? }] }
export function extract(reply, cfg) {
  const proposals = [];
  const text = String(reply || '').replace(BLOCK, (all, kind, body) => {
    const k0 = kind === 'melete-json' ? 'songs' : kind === 'melete-rec' ? 'rec' : kind === 'melete-show' ? 'show' : kind === 'melete-studio' ? 'studio' : kind === 'melete-query' ? 'query' : 'ops';
    const mk = (extra) => proposals.push({ id: pid(), kind: k0, status: k0 === 'query' ? 'pending' : canWrite(cfg, k0 === 'rec' || k0 === 'show' ? 'media' : k0 === 'studio' ? 'studio' : 'songs') ? 'pending' : 'blocked', ...extra });
    try {
      const j = JSON.parse(body);
      if (kind === 'melete-query') {
        const queries = cleanQueries(j);
        if (queries.length) mk({ queries }); else proposals.push({ id: pid(), kind: 'query', status: 'invalid' });
      } else
      if (kind === 'melete-studio') {
        const r = cleanStudioOps(j);
        if (r.ops.length) mk({ ops: r.ops, errors: r.errors }); else proposals.push({ id: pid(), kind: 'studio', status: 'invalid', errors: r.errors });
      } else
      if (kind === 'melete-show') {
        const ops = (Array.isArray(j) ? j : []).slice(0, SHOW_MAX.ops).map(cleanShowOp).filter(Boolean);
        if (ops.length) mk({ ops }); else proposals.push({ id: pid(), kind: 'show', status: 'invalid' });
      } else
      if (kind === 'melete-rec') {
        const ops = (Array.isArray(j) ? j : []).slice(0, REC_MAX.ops).map(cleanRecOp).filter(Boolean);
        if (ops.length) mk({ ops }); else proposals.push({ id: pid(), kind: 'rec', status: 'invalid' });
      } else
      if (kind === 'melete-json') { const u = unpack(new TextEncoder().encode(JSON.stringify(j))); mk({ manifest: u.manifest }); }
      else {
        const ops = (Array.isArray(j) ? j : []).slice(0, OPS_MAX).map((o) => {
          if (!o || o.op !== 'set' || typeof o.ref !== 'string' || !o.fields || typeof o.fields !== 'object') return null;
          const fields = {}; for (const k of FIELDS) if (k in o.fields) { const v = cleanField(k, o.fields[k]); if (v !== undefined) fields[k] = v; }
          return Object.keys(fields).length ? { op: 'set', ref: o.ref, fields } : null;
        }).filter(Boolean);
        if (ops.length) mk({ ops });
      }
    } catch { proposals.push({ id: pid(), kind: k0, status: 'invalid' }); }
    return '';
  }).replace(/\n{3,}/g, '\n\n').trim();
  return { text, proposals };
}

const FIELD_NAME = { title: 'название', artist: 'исполнитель', genre: 'жанр', key: 'тональность', targetBpm: 'темп', notes: 'текст', capo: 'каподастр' };
// Строки для карточки: что именно изменится
export function describe(p, songs, recs = [], show = null) {
  if (p.kind === 'query') return describeQueries(p.queries);
  if (p.kind === 'studio') return describeStudioOps(p.ops || []).concat((p.ops || []).flatMap((o) => (o.warns || []).map((x) => '⚠ ' + x)), p.errors || []);
  if (p.kind === 'show') return describeShow(p.ops || [], show);
  if (p.kind === 'songs' && p.manifest) { const plan = planImport(songs, p.manifest); return plan.map((x) => (x.match ? '↻ ' : '+ ') + x.x.title + (x.x.artist ? ' — ' + x.x.artist : '') + (x.x.key ? ' (' + x.x.key + ')' : '')); }
  if (p.kind === 'ops') return (p.ops || []).map((o) => { const s = songs.find((q) => q.id === o.ref && !q.deleted); return (s ? s.title : '? ' + o.ref) + ': ' + Object.entries(o.fields).map(([k, v]) => (FIELD_NAME[k] || k) + ' → ' + (k === 'notes' ? '…' : v)).join(', '); });
  if (p.kind === 'rec') {
    return (p.ops || []).map((o) => { const r = recs.find((q) => q.id === o.ref), nm = r ? r.name : '? ' + o.ref;
      return nm + ': ' + (o.op === 'chords' ? 'аккорды — ' + o.items.length + ': ' + o.items.slice(0, 4).map((x) => Math.floor(x.t / 60) + ':' + String(Math.round(x.t % 60)).padStart(2, '0') + ' ' + x.c).join(', ') + (o.items.length > 4 ? '…' : '')
        : 'части — ' + o.items.map((x) => x.name + ' ' + Math.floor(x.t / 60) + ':' + String(Math.round(x.t % 60)).padStart(2, '0')).join(', ')); });
  }
  return [];
}

const save = (store) => (store.save ? store.save() : store.settingsChanged && store.settingsChanged());
// Применить: копия данных → изменения → запись для «Отменить». → { ok, undo } | { ok:false, why }
export async function apply(app, p) {
  const store = app.store, st = store.state, now = store.now ? store.now() : Date.now();
  if (p.status !== 'pending') return { ok: false, why: 'status' };
  try { if (app.snapshots && app.snapshots.take) await app.snapshots.take('ai'); } catch { /* копия — страховка, не условие */ }
  if (p.kind === 'songs') {
    const before = new Set(st.songs.map((s) => s.id)), plan = planImport(st.songs, p.manifest), prev = plan.filter((x) => x.match).map((x) => ({ id: x.match.id, copy: { ...x.match } }));
    await applyImport({ store, files: null, unpacked: { manifest: p.manifest, data: () => null }, plan, set: false, quotes: false, profile: false });
    const added = st.songs.filter((s) => !before.has(s.id)).map((s) => s.id);
    save(store);
    return { ok: true, undo: { kind: 'songs', added, prev }, n: added.length + prev.length };
  }
  if (p.kind === 'ops') {
    const prev = [];
    for (const o of p.ops) {
      const s = st.songs.find((q) => q.id === o.ref && !q.deleted); if (!s) continue;
      const old = {}; for (const k of Object.keys(o.fields)) old[k] = s[k] === undefined ? null : s[k];
      Object.assign(s, o.fields, { updatedAt: now }); prev.push({ id: s.id, old });
    }
    if (!prev.length) return { ok: false, why: 'none' };
    save(store);
    return { ok: true, undo: { kind: 'ops', prev }, n: prev.length };
  }
  if (p.kind === 'studio') { // студия правит проект сама (её стопка отмены, перерисовка, звук): app.studioAI регистрирует открытая студия
    const h = app.studioAI; if (!h) return { ok: false, why: 'none' };
    const r = h.apply(p.ops || []); if (!r || !r.n) return { ok: false, why: 'none' };
    return { ok: true, undo: { kind: 'studio', pid: r.pid, undo: r.undo }, n: r.n };
  }
  if (p.kind === 'show') {
    const show = app.device && app.device.show; if (!show) return { ok: false, why: 'none' };
    const r = applyShowOps(show, p.ops || [], now); if (!r.n) return { ok: false, why: 'none' };
    if (app.saveDevice) app.saveDevice();
    return { ok: true, undo: { kind: 'show', prev: r.prev }, n: r.n };
  }
  if (p.kind === 'rec') {
    const files = app.files; if (!files) return { ok: false, why: 'none' };
    const prev = new Map(), changed = new Set(); let n = 0;
    const cp = (a) => (Array.isArray(a) ? a.map((x) => ({ ...x })) : undefined);
    for (const o of p.ops) {
      const r = files.get(o.ref); if (!r || r.kind === 'tab' || r.kind === 'midi' || r.kind === 'bible' || r.kind === 'daw' || r.stem) continue;
      if (!prev.has(r.id)) prev.set(r.id, { id: r.id, ana: r.ana ? { chords: cp(r.ana.chords), cauto: cp(r.ana.cauto), cedit: r.ana.cedit } : null, marks: cp(r.marks) || [] });
      if (o.op === 'chords') {
        if (!r.ana) continue; // разбора записи ещё нет — править нечего
        const res = applyItems(Array.isArray(r.ana.chords) ? r.ana.chords : [], o.items, r.dur || 0);
        if (!res.n) continue;
        markEdited(r.ana, res.chords, now); n += res.n; changed.add(r.id);
      } else if (o.op === 'marks') {
        const before = JSON.stringify(r.marks || []);
        r.marks = mergeMarks(r.marks, o.items, (r.ana && r.ana.downbeats) || [], r.dur || 0);
        if (JSON.stringify(r.marks) !== before) { n += o.items.length; changed.add(r.id); }
      }
    }
    if (!changed.size) return { ok: false, why: 'none' };
    for (const id of changed) { try { await files.save(files.get(id)); } catch { /* ошибку базы файлов пишет сама база в журнал; правка осталась в памяти */ } }
    return { ok: true, undo: { kind: 'rec', prev: [...prev.values()].filter((x) => changed.has(x.id)) }, n };
  }
  return { ok: false, why: 'kind' };
}
export function undo(app, u) {
  const store = app.store, st = store.state, now = store.now ? store.now() : Date.now();
  if (!u) return false;
  if (u.kind === 'studio') { const h = app.studioAI; return !!(h && h.undo(u.pid, u.undo)); }
  if (u.kind === 'songs') {
    (u.added || []).forEach((id) => { const s = st.songs.find((q) => q.id === id); if (s && !s.deleted) deleteSong(store, id); });
    (u.prev || []).forEach(({ id, copy }) => { const s = st.songs.find((q) => q.id === id); if (s) Object.assign(s, copy, { updatedAt: now }); });
  } else if (u.kind === 'show') {
    const show = app.device && app.device.show; if (!show) return false;
    undoShowOps(show, u.prev); if (app.saveDevice) app.saveDevice();
    return true;
  } else if (u.kind === 'rec') {
    const files = app.files; if (!files) return false;
    for (const b of u.prev || []) {
      const r = files.get(b.id); if (!r) continue;
      if (b.ana && r.ana) { r.ana.chords = b.ana.chords || []; if (b.ana.cauto) r.ana.cauto = b.ana.cauto; else delete r.ana.cauto; if (b.ana.cedit) r.ana.cedit = b.ana.cedit; else delete r.ana.cedit; }
      r.marks = b.marks || [];
      Promise.resolve(files.save(r)).catch(() => {});
    }
    return true;
  } else if (u.kind === 'ops') {
    (u.prev || []).forEach(({ id, old }) => { const s = st.songs.find((q) => q.id === id); if (s) Object.assign(s, old, { updatedAt: now }); });
  } else return false;
  save(store);
  return true;
}
