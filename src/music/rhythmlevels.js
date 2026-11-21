// «Начать занятие» в тренажёре ритма (слово автора 21.11.2026): 10 уровней — выбор сложности и сразу нужное упражнение с метром, длиной и темпом.
// Лесенка: от эхо четвертей — к чтению с листа и диктанту в сложных метрах и полиритмии. Значения по умолчанию, правятся в настройках упражнения.
export const RLEVEL_COUNT = 10;
export const RLEVEL_PLAN = [
  { drill: 'echo', meter: '4/4', level: 1, bars: 1, bpm: 70, strict: 'soft' },    // 1 — повтори четверти
  { drill: 'echo', meter: '4/4', level: 2, bars: 1, bpm: 80, strict: 'soft' },    // 2 — плюс восьмые
  { drill: 'read', meter: '4/4', level: 2, bars: 2, bpm: 80, strict: 'soft' },    // 3 — с листа, два такта
  { drill: 'dict', meter: '4/4', level: 2, bars: 1, bpm: 80, strict: 'soft' },    // 4 — диктант: собрать ритм на слух
  { drill: 'read', meter: '3/4', level: 3, bars: 2, bpm: 84, strict: 'mid' },     // 5 — вальс, синкопы
  { drill: 'echo', meter: '4/4', level: 4, bars: 2, bpm: 90, strict: 'mid' },     // 6 — шестнадцатые
  { drill: 'dict', meter: '4/4', level: 4, bars: 2, bpm: 90, strict: 'mid' },     // 7 — диктант посложнее
  { drill: 'read', meter: '6/8', level: 4, bars: 2, bpm: 80, strict: 'mid' },     // 8 — шесть восьмых
  { drill: 'read', meter: '4/4', level: 5, bars: 4, bpm: 96, strict: 'mid' },     // 9 — четыре такта, триоли
  { drill: 'poly', meter: '4/4', level: 6, bars: 2, bpm: 80, strict: 'strict' },  // 10 — полиритмия, строго
];
export const clampRLevel = (n) => Math.max(1, Math.min(RLEVEL_COUNT, Math.round(+n) || 1));
// Применить уровень к настройкам тренажёра ритма; вернуть id упражнения
export function applyRLevel(e, n) {
  const lv = clampRLevel(n), p = RLEVEL_PLAN[lv - 1];
  e.lv10 = lv; e.custom = null;
  e.level = p.level; e.meter = p.meter; e.bars = p.bars; e.bpm = p.bpm; e.strict = p.strict;
  return p.drill;
}
