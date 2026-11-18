// Канал событий: сверка часов двух устройств, как в NTP. Чистый модуль.
// Обмен: A шлёт PING в t0 (часы A) → B получает в t1 и отвечает в t2 (часы B) → A получает в t3 (часы A).
//   круг  rtt    = (t3 − t0) − (t2 − t1)
//   сдвиг offset = ((t1 − t0) + (t2 − t3)) / 2     — на сколько часы B опережают часы A
// Один обмен врёт на половину асимметрии пути, поэтому держим последние 16 обменов и берём медиану сдвигов
// у восьми с самым коротким кругом (короткий круг — меньше очереди, меньше ошибка).
export const WINDOW = 16, KEEP = 8;

const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export function sample(t0, t1, t2, t3) {
  return { rtt: Math.max(0, (t3 - t0) - (t2 - t1)), offset: ((t1 - t0) + (t2 - t3)) / 2 };
}

export function createClock({ window = WINDOW, keep = KEEP, minReady = 4 } = {}) {
  let list = [];
  const best = () => [...list].sort((a, b) => a.rtt - b.rtt).slice(0, Math.min(keep, list.length));
  return {
    // Новый обмен; → оценка после него. Обмен с отрицательным кругом (часы прыгнули) отбрасывается
    add(t0, t1, t2, t3) {
      if (![t0, t1, t2, t3].every(Number.isFinite) || (t3 - t0) < (t2 - t1) - 1e-6) return null;
      list.push(sample(t0, t1, t2, t3));
      if (list.length > window) list.shift();
      return this.estimate();
    },
    estimate() { const b = best(); return { offset: median(b.map((s) => s.offset)), rtt: median(b.map((s) => s.rtt)), n: list.length }; },
    ready() { return list.length >= minReady; },
    // Разброс сдвигов у лучших обменов (мс) — насколько можно верить оценке
    spread() { const b = best(); if (b.length < 2) return 0; const o = b.map((s) => s.offset); return Math.max(...o) - Math.min(...o); },
    // время события на моём устройстве → на другом, и обратно
    toRemote(local) { return local + this.estimate().offset; },
    toLocal(remote) { return remote - this.estimate().offset; },
    reset() { list = []; },
    get count() { return list.length; },
  };
}
