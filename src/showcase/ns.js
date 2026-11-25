// Демонстрация лежит на том же сайте, что и веб-версия (…/Practice-app/show/ рядом с …/Practice-app/), а хранилище
// браузера у них общее. Поэтому все ключи демонстрации — с приставкой: выдуманные данные не попадают в настоящие.
// Сценарии демонстрации (слово автора 25.11.2026): профессионал (по умолчанию), ученик, учитель — у каждого свои данные
// (своя приставка), переключатель — в настройках; выбор хранится под служебным ключом без приставки сценария.
// Подключается первым, до приложения (src/showcase/main.js).
const S = Storage.prototype, get = S.getItem, set = S.setItem, del = S.removeItem;
const KEY = 'melete-show:@scenario', SCEN = ['pro', 'student', 'teacher'];
let cur = 'pro';
try { const v = get.call(globalThis.localStorage, KEY); if (SCEN.includes(v)) cur = v; } catch { /* без хранилища — профессионал */ }
const P = 'melete-show:' + (cur === 'pro' ? '' : cur + ':');
const mine = (st) => { try { return st === globalThis.localStorage; } catch { return false; } };
S.getItem = function (k) { return get.call(this, mine(this) ? P + k : k); };
S.setItem = function (k, v) { return set.call(this, mine(this) ? P + k : k, v); };
S.removeItem = function (k) { return del.call(this, mine(this) ? P + k : k); };
if (globalThis.indexedDB) {
  const idb = globalThis.indexedDB, open = idb.open.bind(idb), drop = idb.deleteDatabase.bind(idb);
  idb.open = (name, ...a) => open(P + name, ...a);
  idb.deleteDatabase = (name) => drop(P + name);
}
// Для настроек (панель) и main.js: текущий сценарий и переключение (перезагрузка — за вызывающим)
globalThis.__SCEN__ = { cur, list: SCEN, set(v) { if (SCEN.includes(v)) set.call(globalThis.localStorage, KEY, v); } };
export const scenario = cur;
