// Предложения модели: блоки ```melete-json (песни, формат docs/ai-format.md) и ```melete-ops (правки полей песен).
// Модель ничего не применяет сама: человек нажимает «Применить» (или включил автоматический режим), перед применением —
// копия данных, после — «Отменить» в ленте чата. Только песни и только безопасные поля; удалений нет. Без DOM.
import { unpack, planImport, applyImport, normKey } from '../share.js';
import { deleteSong } from '../library.js';
import { canWrite } from './config.js';

export const OPS_MAX = 100, FIELDS = ['title', 'artist', 'genre', 'key', 'targetBpm', 'notes', 'capo'];
const BLOCK = /```(melete-json|melete-ops)[ \t]*\r?\n([\s\S]*?)```/g;

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
let seq = 0;
const pid = () => 'p' + Date.now().toString(36) + (seq++).toString(36);

// Найти предложения в ответе → { text (без блоков), proposals: [{ id, kind: 'songs'|'ops', status, manifest|ops, blocked? }] }
export function extract(reply, cfg) {
  const proposals = [];
  const text = String(reply || '').replace(BLOCK, (all, kind, body) => {
    const mk = (extra) => proposals.push({ id: pid(), kind: kind === 'melete-json' ? 'songs' : 'ops', status: canWrite(cfg, 'songs') ? 'pending' : 'blocked', ...extra });
    try {
      const j = JSON.parse(body);
      if (kind === 'melete-json') { const u = unpack(new TextEncoder().encode(JSON.stringify(j))); mk({ manifest: u.manifest }); }
      else {
        const ops = (Array.isArray(j) ? j : []).slice(0, OPS_MAX).map((o) => {
          if (!o || o.op !== 'set' || typeof o.ref !== 'string' || !o.fields || typeof o.fields !== 'object') return null;
          const fields = {}; for (const k of FIELDS) if (k in o.fields) { const v = cleanField(k, o.fields[k]); if (v !== undefined) fields[k] = v; }
          return Object.keys(fields).length ? { op: 'set', ref: o.ref, fields } : null;
        }).filter(Boolean);
        if (ops.length) mk({ ops });
      }
    } catch { proposals.push({ id: pid(), kind: kind === 'melete-json' ? 'songs' : 'ops', status: 'invalid' }); }
    return '';
  }).replace(/\n{3,}/g, '\n\n').trim();
  return { text, proposals };
}

const FIELD_NAME = { title: 'название', artist: 'исполнитель', genre: 'жанр', key: 'тональность', targetBpm: 'темп', notes: 'текст', capo: 'каподастр' };
// Строки для карточки: что именно изменится
export function describe(p, songs) {
  if (p.kind === 'songs' && p.manifest) { const plan = planImport(songs, p.manifest); return plan.map((x) => (x.match ? '↻ ' : '+ ') + x.x.title + (x.x.artist ? ' — ' + x.x.artist : '') + (x.x.key ? ' (' + x.x.key + ')' : '')); }
  if (p.kind === 'ops') return (p.ops || []).map((o) => { const s = songs.find((q) => q.id === o.ref && !q.deleted); return (s ? s.title : '? ' + o.ref) + ': ' + Object.entries(o.fields).map(([k, v]) => (FIELD_NAME[k] || k) + ' → ' + (k === 'notes' ? '…' : v)).join(', '); });
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
  return { ok: false, why: 'kind' };
}
export function undo(app, u) {
  const store = app.store, st = store.state, now = store.now ? store.now() : Date.now();
  if (!u) return false;
  if (u.kind === 'songs') {
    (u.added || []).forEach((id) => { const s = st.songs.find((q) => q.id === id); if (s && !s.deleted) deleteSong(store, id); });
    (u.prev || []).forEach(({ id, copy }) => { const s = st.songs.find((q) => q.id === id); if (s) Object.assign(s, copy, { updatedAt: now }); });
  } else if (u.kind === 'ops') {
    (u.prev || []).forEach(({ id, old }) => { const s = st.songs.find((q) => q.id === id); if (s) Object.assign(s, old, { updatedAt: now }); });
  } else return false;
  save(store);
  return true;
}
