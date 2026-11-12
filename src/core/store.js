// Хранение состояния: песни, сессии, события календаря, настройки. Local-first, формат совместим с прототипом (version: 1).
import { seal, splitVerified, profileSeal } from './integrity.js';
import { stripDemo } from './demo.js';
export const LS = 'practice.v1';

export const METRO_DEF = {
  bpm: 90, num: 4, den: 4, sub: 1, swing: false, sound: 'click',
  accents: [3, 1, 1, 1],
  trainer: { on: false, step: 2, every: 4, max: 140 },
  gap: { on: false, play: 2, mute: 2 },
};

const clone = (o) => JSON.parse(JSON.stringify(o));

export function blank() {
  return {
    version: 1,
    songs: [],
    sessions: [],
    settings: {
      goalMin: 300,                 // цель недели, минуты
      days: [1, 1, 1, 1, 1, 0, 0],  // дни практики, Пн…Вс
      theme: 'system',
      scale: '5',                   // шкала выученности: '5' | '10' | '100'
      configured: false,
      updatedAt: 0,
      metro: clone(METRO_DEF),
    },
    updatedAt: 0,
  };
}

// Дополняет настройки значениями по умолчанию (прототип: fixSettings)
export function normalize(state) {
  const s = Object.assign(blank(), state);
  s.settings = Object.assign(blank().settings, s.settings || {});
  s.settings.metro = Object.assign(clone(METRO_DEF), s.settings.metro || {});
  return s;
}

export const isBackup = (p) => !!p && p.version === 1 && Array.isArray(p.sessions);

// По id побеждает запись с бóльшим updatedAt; при равенстве — из первого списка
export const byId = (x, y) => {
  const m = new Map();
  [...(x || []), ...(y || [])].forEach((it) => {
    if (!it || !it.id) return;
    const c = m.get(it.id);
    if (!c || (it.updatedAt || 0) > (c.updatedAt || 0)) m.set(it.id, it);
  });
  return [...m.values()];
};

// Слияние двух состояний: по id побеждает запись с бóльшим updatedAt; настройки — целиком более свежие
export function merge(a, b) {
  const out = blank();
  out.songs = byId(a.songs, b.songs);
  out.sessions = byId(a.sessions, b.sessions);
  // События календаря (src/core/calendar.js) — поле новее прототипа, появляется с первым событием
  if (a.events || b.events) out.events = byId(a.events, b.events);
  if (a.projects || b.projects) out.projects = byId(a.projects, b.projects); // проекты студии (src/music/project.js)
  const sa = a.settings || {}, sb = b.settings || {};
  out.settings = Object.assign({}, blank().settings, (sa.updatedAt || 0) >= (sb.updatedAt || 0) ? sa : sb);
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  const sch = Math.max(a.schema || 0, b.schema || 0); // номер формата (migrate.js) не понижается слиянием
  if (sch) out.schema = sch;
  return out;
}

export const liveSongs = (state) => state.songs.filter((s) => !s.deleted);
export const liveSessions = (state) => state.sessions.filter((s) => !s.deleted);

function safeStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

// clockBad() — часы устройства сбиты (src/core/clock.js): записи в это время не подтверждаются
// onWriteFail(e) — запись не прошла (нет места, запрещено): сказать человеку, не молчать
// migrate(state) → { changed } — шаги формата (migrate.js): при запуске, после копии и синхронизации
// side — отдельная база проектов студии (projstore.js: load, put, clear); нет — проекты в practice.v1, как раньше
// onLog(текст, уровень) — журнал (store без DOM и без log.js)
export function createStore({ storage = safeStorage(), now = Date.now, clockBad = () => false, onWriteFail = () => {}, migrate = null, side = null, onLog = () => {} } = {}) {
  const subs = new Set();
  let state = blank(), broken = false;
  // Данные не читаются (запись оборвалась, кончилось место, чужой формат) — строка не теряется: она сохраняется
  // отдельно (practice.v1.broken) до того, как приложение что-либо запишет поверх; дальше — с пустого, а копии на
  // устройстве (snapshots.js) и папка Melete помогут вернуть данные
  let raw = null;
  try { raw = storage && storage.getItem(LS); } catch { raw = null; }
  if (raw) {
    try { const p = JSON.parse(raw); if (p && p.version === 1 && typeof p === 'object') state = p; else broken = true; }
    catch { broken = true; }
    if (broken) { try { storage.setItem(LS + '.broken', raw); storage.setItem(LS + '.brokenAt', String(now())); } catch { /* места нет — хотя бы не затираем молча ниже */ } }
  }
  state = normalize(state);
  const runMigrate = () => {
    if (!migrate) return false;
    const r = migrate(state) || {};
    if (r.changed) state.settings.updatedAt = now();
    return !!(r.changed || r.bumped);
  };
  if (!broken && runMigrate()) { try { storage && storage.setItem(LS, JSON.stringify(state)); } catch { /* запишется со следующим сохранением */ } }
  // Переход на печати: всё, что записано до них, — подтверждено (один раз; позже записи без печати — нет)
  if (!state.settings.sealed) {
    state.sessions.forEach((r) => { if (!r.sig) seal(r); });
    const pr = state.settings.profile;
    if (pr && !pr.sig) pr.sig = profileSeal(pr);
    state.settings.sealed = 1;
    try { storage && storage.setItem(LS, JSON.stringify(state)); } catch { /* */ }
  }
  // Подтверждённые и нет — считаются один раз на каждое изменение списка
  let vKey = '', vCache = { ok: [], bad: [] };
  const verified = () => {
    const live = liveSessions(state), key = live.length + ':' + state.updatedAt;
    if (key !== vKey) { vKey = key; vCache = splitVerified(live, now()); }
    return vCache;
  };

  /* ---------- проекты студии: отдельная база (горячие данные) ----------
     mode: 'ls' — проекты лежат в practice.v1 (базы нет или она отказала); 'wait' — база ещё читается: пишем как
     раньше, вместе с проектами (так переход безопасен при обрыве); 'side' — проекты в базе, practice.v1 без них.
     В базу пишется только изменённое: id → updatedAt того, что уже лежит там (kept), и явные правки (dirty — две
     правки за одну миллисекунду). Отказ базы — проекты сразу возвращаются в practice.v1: правка не теряется молча. */
  let mode = side ? 'wait' : 'ls';
  const kept = new Map(), dirty = new Set();
  let chain = Promise.resolve();
  const plain = (p) => JSON.parse(JSON.stringify(p)); // как раньше в localStorage: только то, что переживает JSON
  const toSide = () => {
    if (mode !== 'side') return chain;
    const L = (state.projects || []).filter((p) => p && p.id && (dirty.has(p.id) || kept.get(p.id) !== (p.updatedAt || 0)));
    if (!L.length) return chain;
    const rows = L.map(plain);
    // отмечается сразу, в момент отправки: следующая запись не повторит то, что уже в пути (отказ — режим 'ls')
    L.forEach((p) => { dirty.delete(p.id); kept.set(p.id, p.updatedAt || 0); });
    const step = side.put(rows).then(() => {}, (e) => {
      if (mode !== 'side') return;
      onLog('проекты не записались в базу (' + (e && (e.name || e.message)) + ') — они снова в основных данных', 'e');
      mode = 'ls'; writeLS(); onWriteFail(e);
    });
    chain = chain.then(() => step);
    return chain;
  };
  const writeLS = () => {
    try {
      // проекты в своей базе — в practice.v1 их нет (копия поверхностная: остальное не копируется)
      const body = mode === 'side' && state.projects ? JSON.stringify({ ...state, projects: undefined }) : JSON.stringify(state);
      storage && storage.setItem(LS, body);
    } catch (e) { onWriteFail(e); }
  };
  const write = () => { writeLS(); toSide(); };
  const emit = () => subs.forEach((fn) => fn(state));
  // Чтение базы при запуске; затем проекты из practice.v1 (прежний формат или правки откатанной сборки) переезжают
  // в базу и только после записи убираются из practice.v1
  const ready = !side ? Promise.resolve() : Promise.resolve().then(() => side.load()).then(async (rows) => {
    rows.forEach((p) => p && p.id && kept.set(p.id, p.updatedAt || 0));
    const mem = state.projects || [], moved = mem.filter((p) => p && p.id && kept.get(p.id) !== (p.updatedAt || 0)).length;
    if (rows.length || mem.length) state.projects = byId(mem, rows);
    mode = 'side';
    await toSide();
    if (mode !== 'side') return; // база отказала при записи — проекты остались в practice.v1
    writeLS();
    if (moved) onLog('проекты студии переехали в свою базу: ' + moved);
    if (rows.length) emit();
  }).catch((e) => {
    mode = 'ls'; writeLS();
    onLog('база проектов не открылась (' + (e && (e.name || e.message)) + ') — проекты в основных данных', 'w');
  });

  const store = {
    get state() { return state; },
    // данные при запуске не прочитались (сохранены в practice.v1.broken)
    broken,
    now,
    // проекты студии прочитаны из своей базы (до этого list() видит только то, что было в practice.v1)
    ready,
    // где проекты сейчас: 'ls' | 'wait' | 'side' (для самопроверки и тестов)
    get projMode() { return mode; },
    // проект изменён (ctx.projects.save): записать в базу, даже если updatedAt совпал с прошлой записью
    projectChanged(id) { if (id) dirty.add(id); },
    // дождаться, пока проекты дойдут до базы (перед копией, выходом)
    flush: () => toSide(),

    save() {
      state.updatedAt = now();
      write();
      emit();
    },
    // Записать без смены updatedAt (прототип: saveMetro — частые правки метронома)
    persist() { write(); },
    settingsChanged() {
      state.settings.updatedAt = now();
      store.save();
    },

    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },

    songs: () => liveSongs(state),
    // Для статистики, недели, камня и звания — только подтверждённые записи
    sessions: () => verified().ok,
    // Неподтверждённые: видны только в истории
    unverified: () => verified().bad,
    allSessions: () => liveSessions(state),
    // Новая запись о занятии — с печатью; при сбитых часах — с пометкой и потому не подтверждённая
    addSession(rec) {
      if (clockBad()) rec.clk = 'bad';
      seal(rec);
      state.sessions.push(rec);
      store.save();
      return rec;
    },
    songById: (id) => state.songs.find((s) => s.id === id && !s.deleted),

    // Импорт резервной копии; возвращает число новых сессий
    importBackup(p) {
      if (!isBackup(p)) throw new Error('not a backup');
      const before = store.allSessions().length;
      state = normalize(merge(state, stripDemo(p))); // демо из копий не возвращается
      runMigrate(); // копия могла прийти от старой версии
      store.save();
      return store.allSessions().length - before;
    },
    // Заменить состояние целиком (загрузка копии по частям: backupparts.js собирает новое из старого и копии)
    replaceState(next) {
      state = normalize(next);
      runMigrate();
      store.save();
    },
    // info — подпись копии (кто, когда, откуда): { by, at, app }; при загрузке не мешает (слияние берёт только данные)
    // демо в копию не попадает (demo.js: stripDemo)
    exportBackup: (info) => JSON.stringify(info ? { backupInfo: info, ...stripDemo(state) } : stripDemo(state), null, 1),

    // Удалить все данные, сохранив тему
    reset() {
      const keep = state.settings.theme;
      state = blank();
      state.settings.theme = keep;
      if (side) { kept.clear(); dirty.clear(); chain = chain.then(() => side.clear()).catch((e) => onLog('база проектов не очистилась: ' + (e && e.message), 'e')); }
      store.save();
    },
  };
  return store;
}
