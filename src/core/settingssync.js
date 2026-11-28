// Настройки и оформление между своими устройствами (слово автора 28.11.2026: «между моими устройствами нужна полная
// синхронизация: статистика, настройки, библиотека»; отменяет прежнее «настройки у каждого устройства свои»).
// Без DOM и сети. Принципы: данные человека целы — слияние, не перезапись; секретное и привязанное к железу не уходит никогда.
//
// Слияние — по ключу верхнего уровня settings со временем правки значения: settings.__at = { ключ: мс }, позднее
// побеждает; settings.__sig = { ключ: отпечаток значения } — по нему видно, что значение изменили (store.write
// проставляет время при любой записи). Удаление ключа — тоже правка (в __at время есть, значения нет).
// Счётчики статистики (ear, beat, вокал: журнал по дням) не перезаписываются целиком: записи объединяются, у записи
// побеждает та, где больше накоплено. Ключи собственных частей копии (lib, profile, bible, cal…) здесь не участвуют —
// они идут своими частями (backupparts.js).
//
// Какие ключи ходят: SYNC_SETTINGS (белый список). Всё прочее — не ходит: DEVICE_ONLY (чёрный список, привязано к
// устройству), запрещённые имена (FORBIDDEN: секреты, сеть, железо) побеждают любой белый список, неизвестное не ходит.
// Настройки инструментов этого устройства (practice.v1.tools: уровни, раскладки окон, тюнер…) не переносятся —
// там уровни громкости и устройство; свои пресеты (settings.presets) и данные модулей (settings.<id>) переносятся.

// Что переносится: оформление, язык, цели, вкладки и главная, метроном, пресеты, свои сборники, статистика модулей
export const SYNC_SETTINGS = Object.freeze([
  'theme', 'accent', 'palette', 'ownMain', 'ownBg', 'uiStyle', 'monoBare', 'monoGrid', 'monoLang', 'mascot', 'iconCaps', 'onText',
  'calmView', 'calmSec', 'solidView', 'showClock', 'lang', 'church', 'toolsOnly', 'off',
  'tabs', 'tabsOff', 'tabMods', 'dockOrder', 'toolsTab', 'quick', 'home',
  'goalMin', 'days', 'todayGoal', 'begMin', 'breakMin', 'remind', 'scale', 'trackMode', 'autoTrack',
  'metro', 'metroAdj', 'presets', 'quoteBooks', 'qsets', 'routines', 'mediaFolders', 'study', 'plan', 'midiSpeed', 'ensClean',
  'noSoundNote', 'askIdle', 'rankNote', 'firstHide',
  'ear', 'beat', 'vocal', 'theory', // данные модулей (ctx.data()): статистика и свои настройки
]);

// Только это устройство: ключи и токены, привязки, железо, пути, разрешения, метки миграций, состояние этого экрана
export const DEVICE_ONLY = Object.freeze([
  'gdrive', 'gauth', 'classroom', 'student', 'folder', 'configured', 'sealed', 'updatedAt', 'demo',
  'uiScale', 'deskBg', 'screenOn', 'appIcon', 'appIconOwn', 'guardShots', 'micPresence', 'calmColors', 'tabsBibleMid', 'trainSplit',
  'pcWork', 'pcStems', 'syncAuto', 'autoStems', 'autoPower', 'autoHq', 'autoAna', 'autoLyr', 'localSend', 'updMode', 'updMobile', 'upOk',
  'midiIn', 'midiOnly', 'rec', 'stageMix', 'stagePads', 'stagePedal', 'stageTap', 'stageDrums', 'stageWork', 'levelAsk',
  'guest', 'guestAudio', 'guestOn',
]);

// Собственные части копии: ходят своими частями синхронизации, здесь не участвуют
export const PART_KEYS = Object.freeze(['lib', 'profile', 'leagueSeen', 'helpSeen', 'helpOff', 'bible', 'cal']);

// Запрещено всегда, даже если имя попало в белый список (тест краснеет): секреты, учётные записи, сеть, железо звука
export const FORBIDDEN = Object.freeze([
  /^ai($|[A-Z_.-])/, /key|token|secret|passw|pwd|credential|oauth|auth|gauth|gdrive|cookie|jwt/i,
  /^(audio|output|outs?|eq|buf|buffer|latency|lat|profiles?|vol|volume|gain|device|devs|mic|bluetooth|bt)($|[A-Z0-9_.-])/i,
  /^(addr|address|host|ip|port|fp|fingerprint|peers?|pc|mesh|nsd|url|perm|permissions?|sync)($|[A-Z0-9_.-])/i,
]);
// Те же секреты внутри значений (вложенные поля) — отбрасываются при отправке и приёме
const SECRET_FIELD = /token|secret|passw|pwd|credential|apikey|api_key|oauth|cookie|jwt/i;

export const isForbidden = (k) => FORBIDDEN.some((r) => r.test(String(k)));
// 'sync' | 'device' | 'part' | 'internal' | 'unknown'
export function kindOf(k) {
  k = String(k);
  if (k.startsWith('__')) return 'internal';
  if (isForbidden(k) || DEVICE_ONLY.includes(k)) return 'device';
  if (PART_KEYS.includes(k)) return 'part';
  return SYNC_SETTINGS.includes(k) ? 'sync' : 'unknown';
}
export const isSyncKey = (k) => kindOf(k) === 'sync';

/* ---------- отпечаток и время правки ---------- */

function stable(v) {
  if (v === undefined) return 'u';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}
function hashStr(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + '.' + str.length.toString(36); }
export const hashVal = (v) => (v === undefined ? '-' : hashStr(stable(v)));

const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
// Вложенные секретные поля — прочь (на всякий случай: в белом списке их быть не должно)
export function scrub(v) {
  if (Array.isArray(v)) return v.map(scrub);
  if (!isObj(v)) return v;
  const o = {};
  for (const k of Object.keys(v)) if (!SECRET_FIELD.test(k)) o[k] = scrub(v[k]);
  return o;
}

// Проставить время правки по тому, что изменилось с прошлого раза. Первый раз (нет __sig) — всё получает время последней
// правки настроек устройства (settings.updatedAt): у кого настройки правились позже, тот и побеждает, как при прежнем слиянии.
// Мутирует S. → сколько ключей получили новое время
export function stampSettings(S, now = Date.now()) {
  if (!S || typeof S !== 'object') return 0;
  const boot = !S.__sig, base = boot ? +S.updatedAt || 0 : now;
  const at = (S.__at = isObj(S.__at) ? S.__at : {}), sig = (S.__sig = isObj(S.__sig) ? S.__sig : {});
  let n = 0;
  for (const k of Object.keys(S)) {
    if (!isSyncKey(k)) continue;
    const h = hashVal(S[k]);
    if (sig[k] !== h) { sig[k] = h; at[k] = base; n++; }
  }
  for (const k of Object.keys(sig)) {
    if (isSyncKey(k) && S[k] === undefined && sig[k] !== '-') { sig[k] = '-'; at[k] = base; n++; }
  }
  return n;
}

/* ---------- что уходит ---------- */

// → { values: { ключ: значение }, at: { ключ: мс } } — только белый список; ничего не мутирует
export function pickSettings(S) {
  const values = {}, at = {}, A = isObj(S && S.__at) ? S.__at : {};
  if (!S) return { values, at };
  for (const k of Object.keys(S)) if (isSyncKey(k) && S[k] !== undefined) { values[k] = scrub(clone(S[k])); at[k] = +A[k] || 0; }
  for (const k of Object.keys(A)) if (isSyncKey(k) && !(k in values)) at[k] = +A[k] || 0; // удалён: время есть, значения нет
  return { values, at };
}

/* ---------- слияние счётчиков статистики ---------- */

const allNum = (o) => isObj(o) && Object.keys(o).length > 0 && Object.values(o).every((v) => typeof v === 'number');
const mag = (o) => (typeof o.t === 'number' ? o.t : typeof o.n === 'number' ? o.n : Object.values(o).reduce((a, v) => a + Math.abs(v), 0));
// Симметрично (a, b) = (b, a): на обоих устройствах получается одно и то же
function pickBigger(x, y) {
  const mx = mag(x), my = mag(y);
  if (mx !== my) return mx > my ? x : y;
  return stable(x) >= stable(y) ? x : y;
}
export function mergeCounters(a, b) {
  if (!isObj(a)) return clone(b);
  if (!isObj(b)) return clone(a);
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if (x === undefined) out[k] = clone(y);
    else if (y === undefined) out[k] = clone(x);
    else if (allNum(x) && allNum(y)) out[k] = clone(pickBigger(x, y));
    else if (isObj(x) && isObj(y)) out[k] = mergeCounters(x, y);
    else if (typeof x === 'number' && typeof y === 'number') out[k] = Math.max(x, y);
    else out[k] = clone(stable(x) >= stable(y) ? x : y);
  }
  return out;
}
const dayScore = (r) => (+r.sec || 0) + (+r.n || 0);
export function mergeLog(a, b, keep = 400) {
  const m = new Map();
  [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach((r) => {
    if (!r || !r.d) return;
    const c = m.get(r.d);
    if (!c || dayScore(r) > dayScore(c) || (dayScore(r) === dayScore(c) && stable(r) > stable(c))) m.set(r.d, r);
  });
  return [...m.values()].sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0)).slice(-keep).map(clone);
}
// ключи, где накопленное объединяется (остальное внутри ключа — по времени правки)
const COUNTERS = { ear: ['stats', 'days'], beat: ['days', 'cells', 'drills', 'beat'] };
function mergeSpecial(k, local, remote, remoteWins) {
  if (!isObj(local) || !isObj(remote)) return null;
  if (!COUNTERS[k] && k !== 'vocal') return null;
  const out = clone(remoteWins ? remote : local);
  for (const sub of COUNTERS[k] || []) {
    if (isObj(local[sub]) || isObj(remote[sub])) out[sub] = mergeCounters(local[sub] || {}, remote[sub] || {});
  }
  if (k === 'vocal' && (Array.isArray(local.log) || Array.isArray(remote.log))) out.log = mergeLog(local.log, remote.log);
  return out;
}

/* ---------- что приходит ---------- */

const MAX_VALUE = 1.5 * 1048576; // значение крупнее — не принимается (повреждение, не настройка)

// Влить настройки другого устройства R = { values, at } в S (мутирует). Позднее время правки побеждает; равное —
// детерминированно (одинаково на обеих сторонах); счётчики объединяются. → список изменённых ключей
export function mergeSettings(S, R, now = Date.now()) {
  if (!S || !isObj(R)) return [];
  const rvals = isObj(R.values) ? R.values : {}, rat = isObj(R.at) ? R.at : {};
  stampSettings(S, now);
  const at = S.__at, sig = S.__sig, changed = [];
  for (const k of new Set([...Object.keys(rvals), ...Object.keys(rat)])) {
    if (!isSyncKey(k)) continue;
    const rv = rvals[k] === undefined ? undefined : scrub(rvals[k]), rt = +rat[k] || 0;
    if (rv === undefined && !rt) continue; // нет ни значения, ни времени — не «удаление», а пустота
    if (rv !== undefined && stable(rv).length > MAX_VALUE) continue;
    const lv = S[k], lh = hashVal(lv), rh = hashVal(rv), la = +at[k] || 0;
    if (lh === rh) { at[k] = Math.max(la, rt); sig[k] = lh; continue; }
    const remoteWins = rt > la || (rt === la && rh > lh);
    if (lv !== undefined && rv !== undefined) {
      const m = mergeSpecial(k, lv, rv, remoteWins);
      if (m) {
        const mh = hashVal(m);
        // объединённое отличается от чужого — время «сейчас», чтобы оно победило и там
        at[k] = mh === rh ? Math.max(la, rt) : Math.max(now, la, rt);
        if (mh !== lh) { S[k] = m; sig[k] = mh; changed.push(k); }
        continue;
      }
    }
    if (!remoteWins) continue;
    if (rv === undefined) delete S[k]; else S[k] = clone(rv);
    at[k] = rt; sig[k] = rh; changed.push(k);
  }
  return changed;
}

// Участвует ли устройство в обмене настройками: роль «своё» (docs/ecosystem.md) или роли ещё нет (старые сопряжения)
export const isOwn = (entry) => !!entry && (entry.role == null || entry.role === 'own');
