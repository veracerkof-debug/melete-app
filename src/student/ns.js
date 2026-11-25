// Чистая веб-версия ученика лежит на том же сайте, что и остальные (…/student/ рядом с корнем и …/show/), хранилище браузера общее —
// ключи с приставкой, чтобы данные не смешивались. Подключается первым, до приложения (src/student/main.js).
const P = 'melete-student:';
const S = Storage.prototype, get = S.getItem, set = S.setItem, del = S.removeItem;
const mine = (st) => { try { return st === globalThis.localStorage; } catch { return false; } };
S.getItem = function (k) { return get.call(this, mine(this) ? P + k : k); };
S.setItem = function (k, v) { return set.call(this, mine(this) ? P + k : k, v); };
S.removeItem = function (k) { return del.call(this, mine(this) ? P + k : k); };
if (globalThis.indexedDB) {
  const idb = globalThis.indexedDB, open = idb.open.bind(idb), drop = idb.deleteDatabase.bind(idb);
  idb.open = (name, ...a) => open(P + name, ...a);
  idb.deleteDatabase = (name) => drop(P + name);
}
