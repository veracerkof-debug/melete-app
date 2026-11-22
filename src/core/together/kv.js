// Локальное хранилище «ключ → значение» (кэш репозитория, очередь записи, фото). В браузере — IndexedDB, в тестах — память.
export function memKV() {
  const m = new Map();
  return { get: async (k) => m.get(k), set: async (k, v) => { m.set(k, v); }, del: async (k) => { m.delete(k); }, keys: async () => [...m.keys()] };
}
export function idbKV(name = 'tandem') {
  let dbp;
  const open = () => dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const run = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const tx = db.transaction('kv', mode); const out = fn(tx.objectStore('kv')); tx.oncomplete = () => res(out.result); tx.onerror = () => rej(tx.error); }); };
  return {
    get: (k) => run('readonly', (s) => s.get(k)),
    set: (k, v) => run('readwrite', (s) => s.put(v, k)),
    del: (k) => run('readwrite', (s) => s.delete(k)),
    keys: () => run('readonly', (s) => s.getAllKeys()),
  };
}
