// Канал событий: адаптивный буфер дрожания. Чистый модуль.
// Событие несёт время отправителя; на приёмнике оно пересчитано в свои часы (linkclock.toLocal) → eventLocal.
// Запаздывание кадра d = прибытие − eventLocal. Самое малое d за окно — «пол» (путь без очереди, плюс ошибка часов);
// всё сверх пола — дрожание. Играем событие в eventLocal + пол + буфер: у всех кадров одинаковая задержка, и ритм
// не рвётся. Буфер — высокий процентиль дрожания с запасом, но в границах min…max (по умолчанию 15–40 мс):
// растёт сразу, когда кадр опоздал, и убывает медленно. Опоздавший кадр играется немедленно и считается.
export const DEFAULTS = { min: 15, max: 40, window: 64, pct: 0.95, margin: 4, decay: 0.02 };

export function createJitter(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  let ds = [], buf = o.min, late = 0, total = 0;
  const floor = () => (ds.length ? Math.min(...ds) : 0);
  const pctile = () => {
    const f = floor(), j = ds.map((d) => d - f).sort((a, b) => a - b);
    return j.length ? j[Math.min(j.length - 1, Math.ceil(o.pct * j.length) - 1)] : 0;
  };
  const clamp = (v) => Math.max(o.min, Math.min(o.max, v));
  return {
    // Кадр пришёл: arrival и eventLocal — мс на своих часах. → { at: когда играть (мс), late: мс опоздания или 0 }
    observe(arrival, eventLocal) {
      const d = arrival - eventLocal;
      ds.push(d); if (ds.length > o.window) ds.shift();
      total++;
      const want = clamp(pctile() + o.margin);
      if (want > buf) buf = want;                       // быстро вверх
      else buf = clamp(buf + (want - buf) * o.decay);   // медленно вниз
      const at = eventLocal + floor() + buf;
      const lateBy = arrival > at ? arrival - at : 0;
      if (lateBy > 0) { late++; buf = clamp(buf + lateBy); }
      return { at: Math.max(at, arrival), late: lateBy };
    },
    // Сколько мс заранее планировать событие относительно его времени (пол + буфер)
    ahead() { return floor() + buf; },
    buffer: () => buf,
    jitter: pctile,
    stats: () => ({ buffer: buf, floor: floor(), jitter: pctile(), late, total }),
    reset() { ds = []; buf = o.min; late = 0; total = 0; },
  };
}
