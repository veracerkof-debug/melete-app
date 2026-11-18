// ВРЕМЕННЫЙ адаптер вывода (до src/core/output.js): тот же контракт, ничего не отправляет.
// Выбор хранится в настройках устройства (device.output), по умолчанию везде 'local' — поведение приложения не меняется.
// Контракт: get(cat) → 'local'|'remote'|'both'; set(cat, mode); target → { key, name, kind } | null; state → { link, rtt, jitter };
// subscribe(fn) → отписка; ping() → Promise<{ ok, rtt }>; mode(devKey) → { control, sync }; setMode(devKey, patch).
// Лишнее над контрактом (для шторки, всё через ?.): setAll(mode), setTarget(key), candidates().
import { CATS, MODES, candidates } from './outputcats.js';
import { devsOf, pcOf } from './sync.js';

export function createOutputStub(app) {
  const subs = new Set();
  const store = () => (app.device.output ??= { cats: {}, target: null, modes: {} });
  const emit = () => { subs.forEach((fn) => { try { fn(); } catch { /* подписчик не ломает остальных */ } }); };
  const persist = () => { try { app.saveDevice(); } catch { /* память недоступна — до перезапуска */ } emit(); };
  const cands = () => { let pc = null, devs = []; try { pc = pcOf(); devs = devsOf(); } catch { /* связь не готова */ } return candidates(pc, devs); };
  const out = {
    stub: true,
    state: { link: 'off', rtt: null, jitter: null },
    candidates: cands,
    get target() {
      const c = cands(), k = store().target;
      return c.find((x) => x.key === k) || c[0] || null;
    },
    setTarget(key) { store().target = key; persist(); },
    get(cat) {
      const m = store().cats[cat] || 'local';
      return MODES.includes(m) && out.target ? m : 'local'; // нет устройства — всё на этом
    },
    set(cat, mode) {
      if (!CATS.includes(cat) || !MODES.includes(mode)) return;
      store().cats[cat] = mode; persist();
    },
    setAll(mode) {
      if (!MODES.includes(mode)) return;
      const s = store(); CATS.forEach((c) => { s.cats[c] = mode; }); persist();
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    ping: async () => ({ ok: false, rtt: null }), // заглушка: канала нет
    mode: (devKey) => ({ control: false, sync: false, ...(store().modes[devKey] || {}) }),
    setMode(devKey, patch) { const s = store(); s.modes[devKey] = { ...out.mode(devKey), ...patch }; persist(); },
  };
  return out;
}
