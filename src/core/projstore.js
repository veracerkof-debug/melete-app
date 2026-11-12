// Проекты студии и петли лупера — отдельно от practice.v1, в IndexedDB `melete-proj` (горячие данные: с нотами они
// большие и меняются на каждую правку). Раньше каждая правка ноты переписывала всё состояние в localStorage синхронно
// (20–100 мс и квота 5–10 МБ на сайт); теперь пишется только изменённый проект. Логику (что писать, когда, переход
// со старого формата, отказ базы) держит store.js — здесь только сама база. Без DOM.
const DB = 'melete-proj', ST = 'projects';

// → { load(): Promise<проекты[]>, put(проекты[]): Promise, clear(): Promise } или null, если базы нет совсем
export function createProjStore({ indexedDB = globalThis.indexedDB } = {}) {
  if (!indexedDB) return null;
  let dbp = null;
  const open = () => (dbp ??= new Promise((res, rej) => {
    let r;
    try { r = indexedDB.open(DB, 1); } catch (e) { rej(e); return; }
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(ST)) r.result.createObjectStore(ST, { keyPath: 'id' }); };
    r.onsuccess = () => { const db = r.result; db.onversionchange = () => { db.close(); dbp = null; }; res(db); };
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('blocked'));
  }).catch((e) => { dbp = null; throw e; }));
  // одна транзакция; ответ — когда она записана (oncomplete), а не когда запрос принят
  const tx = (mode, fn) => open().then((db) => new Promise((res, rej) => {
    const t = db.transaction(ST, mode), s = t.objectStore(ST);
    const out = fn(s);
    t.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('abort'));
  }));
  return {
    load: () => tx('readonly', (s) => s.getAll()).then((x) => x || []),
    // структурная копия снимается в момент вызова: правки проекта после put в эту запись не попадут
    put: (list) => tx('readwrite', (s) => { list.forEach((p) => s.put(p)); }),
    clear: () => tx('readwrite', (s) => { s.clear(); }),
  };
}
