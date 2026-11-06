// Учёба на главной (слово автора 06.11.2026, пункт 22): учебник, слух и ритм — программа «часы в неделю» в каждом,
// без серий и забегов. После пройденного урока — предложение добавить строку на главную с часами в неделю.
// Время — из занятий в самом инструменте (записи type 'tool': book, ear, beat — «Слух и ритм» пишет время по главам).
// Логика без DOM; блок и шторка — screens/study.js. settings.study = { goals: { id: минуты в неделю }, asked: { id: 1 } }
import { weekStart } from './time.js';

export const STUDY_IDS = ['book', 'ear', 'beat'];
export const STUDY_PRESETS = [30, 60, 120];
const DAY = 86400000;

export const studyOf = (st) => { const s = st.study && typeof st.study === 'object' ? st.study : {}; return { goals: { ...(s.goals || {}) }, asked: { ...(s.asked || {}) } }; };
// Строки программы по порядку: [{ id, goal (мин), sec (за эту неделю) }]
export function studyRows(st, sessions, now = Date.now()) {
  const { goals } = studyOf(st), ws = weekStart(now), we = ws + 7 * DAY, sec = {};
  sessions.forEach((s) => { if (s.type === 'tool' && s.start >= ws && s.start < we && STUDY_IDS.includes(s.tool)) sec[s.tool] = (sec[s.tool] || 0) + s.dur; });
  return STUDY_IDS.filter((id) => goals[id] > 0).map((id) => ({ id, goal: goals[id], sec: sec[id] || 0 }));
}
export function setGoal(st, id, min) {
  const s = studyOf(st);
  if (min > 0) s.goals[id] = Math.round(min); else delete s.goals[id];
  s.asked[id] = 1;
  st.study = s;
}
// Предлагать ли после урока: ещё нет в программе и не спрашивали
export const shouldOffer = (st, id) => { const s = studyOf(st); return STUDY_IDS.includes(id) && !(s.goals[id] > 0) && !s.asked[id]; };
export const markAsked = (st, id) => { const s = studyOf(st); s.asked[id] = 1; st.study = s; };
