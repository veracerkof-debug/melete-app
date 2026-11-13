// Голос: диапазон, тип голоса и спетые ноты (слово автора 13.11.2026, DECISIONS «Вокал»). Чистые функции без DOM
// (tests/voicetype.test.js); экран — src/modules/vocal/index.js.
// - createNoteTracker — из потока высоты (MIDI дробью или 0 — тишина) выделяет спетые ноты: держится ровно (±0,4 полутона
//   от медианы) не меньше minDur — нота { m — медиана, t0, t1, dur };
// - rangeOf — диапазон по спетым нотам: удобный — ноты, удержанные не меньше секунды; крайние — хоть четверть секунды;
// - voiceType — тип голоса по наибольшему перекрытию с ориентирами (Interlochen; тип определяют удобная зона и тембр —
//   это лишь подсказка, экран говорит это прямо);
// - scoreNote — спетая нота против лада: в ладу ли, насколько точно (импровизация с дроном).

// Ориентиры типов: [id, низ, верх] в MIDI (C4 = 60)
export const TYPES = [['sop', 60, 84], ['mezzo', 57, 81], ['alto', 53, 77], ['tenor', 48, 72], ['bari', 43, 67], ['bass', 40, 64]];
export const typeRange = (id) => { const x = TYPES.find((y) => y[0] === id); return x ? { lo: x[1], hi: x[2] } : null; };
// Удобный диапазон по типу (без проверки): ориентир без верхней и нижней терции — крайние ноты типа не всем удобны
export const typeComfort = (id) => { const r = typeRange(id) || typeRange('bari'); return { lo: r.lo + 3, hi: r.hi - 3 }; };

// Тип голоса по удобному диапазону: доля перекрытия от большего из двух диапазонов, при равенстве — ближе середина.
// → { id, list: [{ id, s }] по убыванию }
export function voiceType(lo, hi) {
  const span = Math.max(1, hi - lo), mid = (lo + hi) / 2;
  const list = TYPES.map(([id, a, b]) => {
    const ov = Math.max(0, Math.min(hi, b) - Math.max(lo, a)), s = ov / Math.max(span, b - a);
    return { id, s, dm: Math.abs(mid - (a + b) / 2) };
  }).sort((x, y) => y.s - x.s || x.dm - y.dm);
  return { id: list[0].id, list: list.map(({ id, s }) => ({ id, s: Math.round(s * 100) / 100 })) };
}

// Спетые ноты из потока высоты. push(t — секунды, m — MIDI дробью или 0) → закрытая нота или null; flush(t) — закрыть текущую.
// cur() — идущая нота (для показа), даже если она ещё короче minDur
export function createNoteTracker({ minDur = 0.15, tol = 0.4, gap = 0.12 } = {}) {
  let seg = null; // { t0, t1, ms: [] }
  const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
  const close = () => {
    const s = seg; seg = null;
    if (!s) return null;
    const dur = s.t1 - s.t0;
    return dur >= minDur ? { m: med(s.ms), t0: s.t0, t1: s.t1, dur } : null;
  };
  return {
    push(t, m) {
      if (!m) { if (seg && t - seg.t1 > gap) return close(); return null; }
      if (seg && Math.abs(m - med(seg.ms)) <= tol && t - seg.t1 <= gap) { seg.ms.push(m); if (seg.ms.length > 60) seg.ms.shift(); seg.t1 = t; return null; }
      const done = close();
      seg = { t0: t, t1: t, ms: [m] };
      return done;
    },
    flush() { return close(); },
    cur() { return seg ? { m: med(seg.ms), t0: seg.t0, t1: seg.t1, dur: seg.t1 - seg.t0 } : null; },
  };
}

// Диапазон по спетым нотам: { lo, hi } — удобный (удержаны ≥ comfort с), { xlo, xhi } — крайние (≥ edge с).
// Нот мало — null
export function rangeOf(notes, { comfort = 1, edge = 0.25 } = {}) {
  const ok = (d) => notes.filter((n) => n.dur >= d).map((n) => Math.round(n.m));
  const c = ok(comfort), x = ok(edge);
  if (!x.length) return null;
  const xlo = Math.min(...x), xhi = Math.max(...x);
  const lo = c.length ? Math.min(...c) : xlo, hi = c.length ? Math.max(...c) : xhi;
  return { lo, hi: Math.max(lo, hi), xlo: Math.min(xlo, lo), xhi: Math.max(xhi, hi) };
}

// Рабочий диапазон по свободному пению (третий шаг проверки: «спеть удобно, как обычно»): ноты, удержанные хотя бы
// minDur, взвешенные по длительности; края — от 5-го до 95-го процентиля (случайная сорвавшаяся нота не растягивает).
// → { lo, hi } или null
export function workingOf(notes, { minDur = 0.3, cut = 0.05 } = {}) {
  const xs = notes.filter((n) => n.dur >= minDur).map((n) => ({ m: Math.round(n.m), w: n.dur })).sort((a, b) => a.m - b.m);
  const tot = xs.reduce((a, x) => a + x.w, 0);
  if (!xs.length || tot < 1) return null;
  const at = (q) => { let acc = 0; for (const x of xs) { acc += x.w; if (acc >= q * tot) return x.m; } return xs[xs.length - 1].m; };
  return { lo: at(cut), hi: at(1 - cut) };
}

// Спетая нота против лада: tonic — высота тоники (MIDI), pcs — ступени лада (полутоны от тоники), tolC — точность в центах.
// → { n — ближайшая нота, deg — ступень от тоники (0…11), cents, inScale, exact }
export function scoreNote(m, tonic, pcs, tolC = 25) {
  const n = Math.round(m), cents = Math.round((m - n) * 100), deg = (((n - tonic) % 12) + 12) % 12;
  const inScale = pcs.includes(deg);
  return { n, deg, cents, inScale, exact: inScale && Math.abs(cents) <= tolC };
}

// Итог импровизации по нотам (с длительностью): доли времени в ладу и точно, время на каждой ступени и средний уход
// по ступени в центах (где «не дотягивает»: третья ступень ниже на 20 центов — видно и понятно)
export function improvSummary(notes) {
  const tot = notes.reduce((a, x) => a + x.dur, 0);
  const sum = (f) => notes.filter(f).reduce((a, x) => a + x.dur, 0);
  const degs = Array(12).fill(0), cw = Array(12).fill(0);
  notes.forEach((x) => { degs[x.deg] += x.dur; cw[x.deg] += x.cents * x.dur; });
  const cents = degs.map((d, i) => (d ? Math.round(cw[i] / d) : 0));
  return { n: notes.length, sec: tot, inScale: tot ? sum((x) => x.inScale) / tot : 0, exact: tot ? sum((x) => x.exact) / tot : 0, degs, cents };
}

// Какой лад поётся (тоника — у дрона): degs — время на ступенях 0…11, cands — { id: ступени }. Для лада: P — доля
// времени на его ступенях, R — доля его ступеней, которые пели хоть заметно (≥ 4 % времени); оценка — F-мера с
// весом на P (лишняя нота — важнее, чем неспетая ступень). → [{ id, score, p, r }] по убыванию; пения мало — []
export function detectMode(degs, cands, { minSec = 4, used = 0.04, beta = 0.6 } = {}) {
  const tot = degs.reduce((a, x) => a + x, 0);
  if (tot < minSec) return [];
  const b2 = beta * beta;
  return Object.entries(cands).map(([id, pcs]) => {
    const p = pcs.reduce((a, d) => a + degs[d], 0) / tot, r = pcs.filter((d) => degs[d] / tot >= used).length / pcs.length;
    const score = p + r ? ((1 + b2) * p * r) / (b2 * p + r) : 0;
    return { id, score: Math.round(score * 1000) / 1000, p, r };
  }).sort((x, y) => y.score - x.score || x.id.localeCompare(y.id));
}
