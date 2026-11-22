// Серии: чистые функции. «День засчитан» у участника, когда его отчёт есть И подтверждён партнёром.
// Совместная серия — подряд идущие дни, засчитанные у обоих. Сегодняшний день серию не рвёт, пока не закончился.
import { addDays, weekStart, diffDays } from './dates.js';

export const both = (a, b) => new Set([...a].filter((d) => b.has(d)));

// Длина серии, заканчивающейся сегодня (если сегодня засчитан) или вчера
export function streakEnding(set, today) {
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
export function longestStreak(set) {
  const days = [...set].sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) { run = prev && diffDays(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}
// Недели: неделя «сохранена», если совместных дней ≥ goal. Возвращает { kept, streak }.
export function weekStats(togetherSet, today, first = 1, goal = 5) {
  const days = [...togetherSet].sort();
  if (!days.length) return { kept: 0, streak: 0 };
  const per = new Map();
  days.forEach((d) => { const w = weekStart(d, first); per.set(w, (per.get(w) || 0) + 1); });
  const ok = (w) => (per.get(w) || 0) >= goal;
  let kept = 0; per.forEach((n, w) => { if (n >= goal) kept++; });
  const cur = weekStart(today, first);
  let w = ok(cur) ? cur : addDays(cur, -7); // текущая неделя ещё не рвёт серию
  let streak = 0;
  while (ok(w)) { streak++; w = addDays(w, -7); }
  return { kept, streak };
}
