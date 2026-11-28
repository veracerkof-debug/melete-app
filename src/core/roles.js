// Роли доступа сопряжённого устройства (слово автора 28.11.2026, docs/ecosystem.md). Роль задаёт ПРИНИМАЮЩАЯ сторона:
// тот, кто показывает код/QR, выбирает роль для нового устройства; она хранится у него (`melete.sync` → peers[ключ].role)
// и проверяется на каждом запросе. Клиент свою роль не присылает и подменить её не может. Чистые функции, без DOM и памяти.
//   own     — «Моё устройство»: всё (двусторонняя синхронизация, пульт, правка библиотеки);
//   receive — «Приёмник песен»: только принимает файлы, отправленные кнопкой (`/put` с `meta.sent`); ничего не отдаёт;
//   control — «Пульт»: только команды и события (`/rc/*`); база недоступна;
//   view    — «Зритель»: только чтение списка песен и сет-листов (`/view`), без записи и управления.
// Нет поля `role` (сопряжения до 28.11.2026) — `own`: поведение прежнее. Неизвестное значение — `view` (самое узкое чтение).
export const ROLES = ['own', 'receive', 'control', 'view'];
export const DEFAULT_ROLE = 'own';
const P = '/melete/v1/';

// Роль записи устройства. На принимающей стороне запись — peers[ключ] (поле role); у начинающей — pc / devs[адрес] (поле
// myRole: какую роль мне выдало то устройство; пришло в ответе на сопряжение и по /me)
export function roleOf(entry) {
  const r = entry && (entry.role != null ? entry.role : entry.myRole);
  if (r == null || r === '') return DEFAULT_ROLE;
  return ROLES.includes(r) ? r : 'view';
}
export const normRole = (r) => (ROLES.includes(r) ? r : DEFAULT_ROLE); // выбор человека / пришедшее при сопряжении

// Кому какой путь. Пути сопряжения и hello — до проверки ключа (роли не нужны). Запись пути — список ролей.
export const ACCESS = Object.freeze({
  [P + 'sync']: ['own'], [P + 'get']: ['own'], [P + 'meta']: ['own'], [P + 'setmeta']: ['own'], [P + 'delete']: ['own'],
  [P + 'put']: ['own', 'receive'], // receive — только с meta.sent, см. roleAllows
  [P + 'ens']: ['own'],
  [P + 'rc/*']: ['own', 'control'],
  [P + 'ts/*']: ['own'],
  [P + 'view']: ['own', 'view'],
  [P + 'me']: ['own', 'receive', 'control', 'view'],
});
const rolesFor = (path) => {
  const p = String(path || '');
  if (ACCESS[p]) return ACCESS[p];
  const i = p.lastIndexOf('/');
  return i > 0 ? ACCESS[p.slice(0, i + 1) + '*'] || null : null;
};

// Можно ли роли role этот запрос. Неизвестный путь — только own (остальным отказ: ничего лишнего не открываем)
export function roleAllows(role, path, json) {
  const r = ROLES.includes(role) ? role : 'view', list = rolesFor(path);
  if (!list) return r === 'own';
  if (!list.includes(r)) return false;
  if (r === 'receive' && path === P + 'put') { const meta = json && json.meta; return !!(meta && meta.sent === true); } // только отправленное кнопкой
  return true;
}

// Режимы linkmode, которые роль допускает вообще: { rc, sync }. Приём отправленного файла и чтение /view от них не зависят
export function roleToMode(role) {
  switch (ROLES.includes(role) ? role : 'view') {
    case 'own': return { rc: true, sync: true };
    case 'control': return { rc: true, sync: false };
    default: return { rc: false, sync: false }; // receive, view
  }
}

// Что роль может со своей стороны (кнопки не показываются, запросы не идут): send — отправить файл на устройство
export const canSend = (role) => role === 'own' || role === 'receive';
export const canView = (role) => role === 'own' || role === 'view';
