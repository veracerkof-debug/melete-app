// «Начать занятие» в тренажёре слуха (слово автора 21.11.2026): 10 уровней — человек выбирает сложность, и сразу идёт нужное упражнение с нужным набором.
// Лесенка — по образцу известных тренажёров слуха (от самых узнаваемых интервалов — к ступеням, цепочкам и всем аккордам); наборы — те же, что у упражнений (src/music/ear.js: LEVELS).
// Чистые данные и одна функция без DOM; уровни можно менять — это значения по умолчанию.
import { LEVELS } from './ear.js';

export const LEVEL_COUNT = 10;
export const LEVEL_PLAN = [
  { drill: 'iv', sets: { iv: [12, 7] } },                                          // 1 — октава и квинта: самые узнаваемые
  { drill: 'iv', sets: { iv: [12, 7, 5, 4, 3] } },                                  // 2 — плюс кварта, большая и малая терции
  { drill: 'ch', sets: { ch: ['maj', 'min'] } },                                    // 3 — мажор и минор: светлый и тёмный
  { drill: 'iv', sets: { iv: LEVELS.iv.mid } },                                     // 4 — интервалы шире (консонансы и диссонансы)
  { drill: 'ch', sets: { ch: LEVELS.ch.mid } },                                     // 5 — уменьшённый, увеличенный, септаккорд
  { drill: 'dg', sets: { dg: LEVELS.dg.easy }, mode: 'major', dgKind: 'note' },     // 6 — ступени 1–3–5 в мажоре
  { drill: 'sc', sets: { sc: LEVELS.sc.easy } },                                    // 7 — мажорная и минорная гаммы
  { drill: 'dg', sets: { dg: LEVELS.dg.mid }, mode: 'major', dgKind: 'chord' },     // 8 — аккорды ступеней (римские цифры)
  { drill: 'ch', sets: { ch: LEVELS.ch.hard } },                                    // 9 — все аккорды
  { drill: 'dg', sets: { dg: LEVELS.dg.hard }, mode: 'mix', dgKind: 'chain' },      // 10 — цепочки ступеней во всех ладах
];

export const clampLevel = (n) => Math.max(1, Math.min(LEVEL_COUNT, Math.round(+n) || 1));

// Применить уровень к настройкам тренажёра; вернуть id упражнения, которое надо открыть
export function applyLevel(e, n) {
  const lv = clampLevel(n), plan = LEVEL_PLAN[lv - 1];
  e.lv10 = lv;
  e.level = 'custom';
  Object.entries(plan.sets).forEach(([k, v]) => { e[k + 'Set'] = v.slice(); });
  if (plan.mode) e.mode = plan.mode;
  if (plan.dgKind) e.dgKind = plan.dgKind;
  return plan.drill;
}
