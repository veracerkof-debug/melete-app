// Режимы связи сопряжённого устройства (слово автора 18.11.2026). Два независимых переключателя на каждое устройство:
//   rc   — «Пульт»: команды и события (звук, метроном, пэды, плеер, открыть инструмент); база не затрагивается;
//   sync — «Синхронизация базы»: песни, профиль (занятия, часы), чтение, календарь и файлы (записи, видео, табы, ноты).
// Можно оба, можно один. Хранится в записи устройства в `melete.sync`: peers[ключ].mode (на компьютере), pc.mode и
// devs[адрес].mode (на телефоне). Нет поля — как до появления режимов: включено всё. Чистые функции, без DOM и памяти.
export const MODES = ['rc', 'sync'];
export const DEFAULT_MODE = Object.freeze({ rc: true, sync: true });

// Режим записи устройства (с умолчаниями для старых сопряжений)
export const modeOf = (entry) => {
  const m = (entry && entry.mode) || {};
  return { rc: m.rc !== false, sync: m.sync !== false };
};

// Новый режим после правки patch ({ rc?, sync? }). Оба выключить нельзя — связь осталась бы без дела: выключаемое
// выключается, а второй включается (одно касание не должно оставить устройство «ни там ни там»)
export function applyMode(entry, patch) {
  const cur = modeOf(entry), next = { ...cur };
  for (const k of MODES) if (patch && typeof patch[k] === 'boolean') next[k] = patch[k];
  if (!next.rc && !next.sync) { const other = patch && patch.rc === false ? 'sync' : 'rc'; next[other] = true; }
  return next;
}

// Путь запроса относится к: 'rc' (пульт), 'sync' (данные и файлы) или 'other' (сопряжение, hello, ансамбль — без режима)
const SYNC_PATHS = ['/melete/v1/sync', '/melete/v1/setmeta', '/melete/v1/delete', '/melete/v1/meta', '/melete/v1/get', '/melete/v1/put'];
export function kindOf(path) {
  if (String(path).startsWith('/melete/v1/rc/')) return 'rc';
  return SYNC_PATHS.includes(path) ? 'sync' : 'other';
}

// Пропустить ли запрос устройства entry. Исключения из «только Пульт»: отправка файла кнопкой («Отправить на устройство»,
// meta.sent) и записи ансамбля (meta.ens) — это явное действие человека, а не обмен базой
export function allows(entry, path, json) {
  const k = kindOf(path), m = modeOf(entry);
  if (k === 'rc') return m.rc;
  if (k === 'sync') {
    if (m.sync) return true;
    const meta = path === '/melete/v1/put' && json && json.meta;
    return !!(meta && (meta.sent || meta.ens));
  }
  return true;
}

// Описание режима для подписи под устройством: 'both' | 'rc' | 'sync'
export const modeName = (entry) => { const m = modeOf(entry); return m.rc && m.sync ? 'both' : m.rc ? 'rc' : 'sync'; };

// Устройство «в сети»: последний запрос не старше окна (пульт опрашивает раз в секунду). seen: ключ → время (мс)
export const ACTIVE_MS = 20000;
export const activeCount = (seen, now = Date.now(), win = ACTIVE_MS) => Object.values(seen || {}).filter((at) => now - at <= win).length;
