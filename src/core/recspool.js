// Куски записи в инструментах — сразу на диск (IndexedDB), пока идёт запись (третий принцип: запись не теряется молча).
// MediaRecorder отдаёт кусок раз в секунду; раньше куски копились в памяти страницы до «Стоп» — система выгрузила
// приложение посреди двухчасовой репетиции, и запись пропадала целиком. Теперь: начало записи — строка «meta»,
// каждый кусок — строка «chunks» [id, номер]. «Стоп» — склейка с диска; после сохранения в медиатеку — удаляются.
// Осталось после сбоя (meta без сохранения) — при следующем запуске склеивается и уходит в медиатеку (recover в
// recorder.js). Нет IndexedDB или кусок не принят (место кончилось) — кусок остаётся в памяти, как раньше.
// Хранилище подменяемое (be): в тестах — в памяти.

export function idbBackend(name = 'melete-rec') {
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res) => {
    try {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('meta'); d.createObjectStore('chunks'); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch { res(null); }
  }));
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function tx(store, mode, fn) {
    const d = await db();
    if (!d) throw new Error('no idb');
    const t = d.transaction(store, mode), out = await fn(t.objectStore(store));
    await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
    return out;
  }
  const range = (id) => IDBKeyRange.bound([id, 0], [id, Infinity]);
  return {
    putMeta: (id, m) => tx('meta', 'readwrite', (s) => req(s.put(m, id))),
    put: (id, seq, blob) => tx('chunks', 'readwrite', (s) => req(s.put(blob, [id, seq]))),
    async parts(id) {
      const keys = await tx('chunks', 'readonly', (s) => req(s.getAllKeys(range(id))));
      const vals = await tx('chunks', 'readonly', (s) => req(s.getAll(range(id))));
      return vals.map((b, i) => ({ seq: keys[i][1], blob: b }));
    },
    async drop(id) {
      await tx('chunks', 'readwrite', (s) => req(s.delete(range(id))));
      await tx('meta', 'readwrite', (s) => req(s.delete(id)));
    },
    async metas() {
      const keys = await tx('meta', 'readonly', (s) => req(s.getAllKeys()));
      const vals = await tx('meta', 'readonly', (s) => req(s.getAll()));
      return vals.map((m, i) => ({ id: keys[i], meta: m }));
    },
  };
}

// В памяти — для тестов и как запасной ход
export function memBackend() {
  const meta = new Map(), chunks = new Map();
  return {
    putMeta: async (id, m) => { meta.set(id, m); },
    put: async (id, seq, blob) => { chunks.set(id + '\u0000' + seq, { id, seq, blob }); },
    parts: async (id) => [...chunks.values()].filter((x) => x.id === id).map(({ seq, blob }) => ({ seq, blob })),
    drop: async (id) => { meta.delete(id); for (const [k, x] of chunks) if (x.id === id) chunks.delete(k); },
    metas: async () => [...meta].map(([id, m]) => ({ id, meta: m })),
  };
}

// Одна запись: begin → add (на каждый кусок) → blob (дождаться записи кусков, склеить) → drop после сохранения.
// Куски, которые не удалось положить на диск, держатся в памяти и входят в склейку на своём месте.
export function spoolTake(be, id, meta) {
  const mem = new Map(), pending = new Set();
  let seq = 0, disk = true;
  const track = (p) => { pending.add(p); p.finally(() => pending.delete(p)); return p; };
  track(Promise.resolve().then(() => be.putMeta(id, meta)).catch(() => { disk = false; }));
  return {
    id,
    add(blob) {
      const n = seq++;
      if (!disk) { mem.set(n, blob); return; }
      track(Promise.resolve().then(() => be.put(id, n, blob)).catch(() => { mem.set(n, blob); }));
    },
    async blob(type) {
      while (pending.size) await Promise.all([...pending]);
      let parts = [];
      if (disk) { try { parts = await be.parts(id); } catch { parts = []; } }
      const have = new Set(parts.map((p) => p.seq));
      for (const [n, b] of mem) if (!have.has(n)) parts.push({ seq: n, blob: b });
      parts.sort((a, b) => a.seq - b.seq);
      return parts.length ? new Blob(parts.map((p) => p.blob), { type }) : null;
    },
    drop: () => be.drop(id).catch(() => {}),
  };
}

// Записи, которые начались, но не дошли до медиатеки (сбой, выгрузка), кроме тех, что идут сейчас. Склейка — по одной,
// по запросу (load): двухчасовая запись не держится в памяти вместе с другими. → [{ id, meta, load() → { blob, n } }]
export async function leftovers(be, busy = () => false) {
  let list = [];
  try { list = await be.metas(); } catch { return []; }
  return list.filter(({ id }) => !busy(id)).map(({ id, meta }) => ({
    id, meta: meta || {},
    async load() {
      let parts = [];
      try { parts = await be.parts(id); } catch { /* нет кусков */ }
      parts.sort((a, b) => a.seq - b.seq);
      return { n: parts.length, blob: parts.length ? new Blob(parts.map((p) => p.blob), { type: ((meta && meta.type) || '').split(';')[0] }) : null };
    },
  }));
}

// Длительность оборванной записи по числу кусков: кусок — slice мс (MediaRecorder.start(slice)), последний неполный —
// ошибка меньше одного куска; медиатека уточнит, когда раскроет файл ради волны. → секунды или 0
export const durOfParts = (n, slice) => (n > 0 && slice > 0 ? Math.max(0, n - 0.5) * slice / 1000 : 0);

// Похоже ли начало файла на свой формат: WebM/Matroska — EBML 1A 45 DF A3, MP4 — «ftyp» на 4-м байте, Ogg — «OggS».
// Не похоже — файл всё равно сохраняется (исходник не выбрасывается), только с предупреждением в журнал.
export function headOk(bytes, type = '') {
  const b = bytes || new Uint8Array(0);
  if (b.length < 8) return false;
  if (type.includes('mp4')) return b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;
  if (type.includes('ogg')) return b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53;
  return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
}
