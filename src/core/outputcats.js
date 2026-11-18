// Вывод на другое устройство — чистая логика интерфейса (без DOM): категории, порядок целей, подписи, состояние канала.
// Сам вывод — src/core/output.js (контракт: app.output.get/set/target/state/subscribe); пока его нет — outputstub.js.
// Не выводятся: Библия, вокал, ритм, тюнер, слух, учебник, спектр, конвертер (слово автора 18.11.2026).

// 'sound' — инструменты и звук, 'click' — метроном и сигналы, 'media' — плеер и основной трек, 'control' — громкости и настройки
export const CATS = ['sound', 'click', 'media', 'control'];
export const MODES = ['local', 'remote', 'both'];

// Инструмент → категория вывода (нет в списке — на другое устройство не выводится)
export const CAT_OF = {
  piano: 'sound', drone: 'sound', glider: 'sound', theremin: 'sound', looper: 'sound', studio: 'sound',
  metro: 'click',
  audio: 'media', show: 'media',
};
export const catOfModule = (id) => CAT_OF[id] || null;

// Сопряжённые устройства: компьютер (pc) первым, потом «Мои устройства» (devs) → [{ key, name, kind }]
export function candidates(pc, devs = []) {
  const out = [];
  if (pc && pc.addr) out.push({ key: 'pc:' + pc.addr, name: pc.name || '', kind: 'pc' });
  devs.forEach((d) => { if (d && d.addr) out.push({ key: 'dev:' + d.addr, name: d.name || '', kind: 'dev' }); });
  return out;
}

// Строки списка целей в шторке — порядок всегда один: «Этот телефон», «Компьютер …», «Оба сразу».
// Без выбранного устройства две последние недоступны (disabled), но остаются на месте.
export function targetRows(target) {
  const has = !!(target && target.key);
  return [
    { mode: 'local', disabled: false },
    { mode: 'remote', disabled: !has, name: has ? target.name || '' : '', kind: has ? target.kind || 'pc' : null },
    { mode: 'both', disabled: !has },
  ];
}

// Общий итог по категориям: { mixed, mode } — mode общий, если у всех одинаков; иначе mixed
export function summarize(get) {
  const modes = CATS.map((c) => get(c));
  const same = modes.every((m) => m === modes[0]);
  return { mixed: !same, mode: same ? modes[0] : null, modes };
}

// Короткая подпись цели на кнопке; L — готовые строки { local, remote, both, mixed }
export function shortLabel(sum, target, L) {
  if (sum.mixed) return L.mixed;
  if (sum.mode === 'local') return L.local;
  if (sum.mode === 'both') return L.both;
  return (target && target.name) || L.remote;
}

// Жест удержания: «Телефон ↔ Компьютер» для всего. Всё на телефоне → всё на компьютер; иначе (компьютер, оба, разное) → на телефон
export const swapMode = (sum) => (!sum.mixed && sum.mode === 'local' ? 'remote' : 'local');

// Состояние канала → вид метки: kind off | connecting | ok | slow | bad, ms — задержка (если известна)
export const SLOW_MS = 120, BAD_MS = 400;
export function linkStatus(state) {
  const s = state || {};
  if (s.link === 'connecting') return { kind: 'connecting', ms: null };
  if (s.link !== 'on') return { kind: 'off', ms: null };
  const ms = Number.isFinite(s.rtt) ? Math.round(s.rtt) : null;
  if (ms == null) return { kind: 'ok', ms: null };
  const j = Number.isFinite(s.jitter) ? s.jitter : 0, w = ms + j;
  return { kind: w >= BAD_MS ? 'bad' : w >= SLOW_MS ? 'slow' : 'ok', ms };
}

// Ключ понятной ошибки (out.err.*) или null. usesRemote — хоть что-то уходит на другое устройство
export function errorKey({ target, state, usesRemote, ping = null }) {
  if (!target || !target.key) return usesRemote ? 'noDevice' : null;
  if (ping && ping.ok === false) return 'noAnswer';
  if (!usesRemote) return null;
  const k = linkStatus(state).kind;
  if (k === 'off') return 'noLink';
  if (k === 'connecting') return 'connecting';
  if (k === 'bad') return 'bad';
  return null;
}
