// Учёба на главной (слово автора 06.11.2026, пункт 22): учебник, слух и ритм — программа «часы в неделю» в каждом,
// без серий и забегов. С 14.11.2026 — и «Вокал», а строка показывает ещё и расписание: ежедневные занятия и дни, которые
// человек поставил себе (Неделя → расписание, `slot.tool`), — сегодня ли, во сколько, сделано ли. Что выбрал и поставил —
// то и на главной (любое сочетание из четырёх); без цели в часах — только цифры недели и расписание. После пройденного урока — предложение добавить строку на главную с часами в неделю.
// Время — из занятий в самом инструменте (записи type 'tool': book, ear, beat — «Слух и ритм» пишет время по главам).
// Логика без DOM; блок и шторка — screens/study.js. settings.study = { goals: { id: минуты в неделю }, show: { id: 1 } — строка без цели, asked: { id: 1 } }
import { weekStart, dayStart, weekday } from './time.js';
import { planOf, slotsOn, minOf } from './schedule.js';

export const STUDY_IDS = ['book', 'ear', 'beat', 'vocal'];
export const STUDY_PRESETS = [30, 60, 120];
const DAY = 86400000;

export const studyOf = (st) => { const s = st.study && typeof st.study === 'object' ? st.study : {}; return { goals: { ...(s.goals || {}) }, asked: { ...(s.asked || {}) }, show: { ...(s.show || {}) } }; };
// Строки программы по порядку: [{ id, goal (мин), sec (за эту неделю) }]
// Время: инструмент вне занятия (type 'tool'; прежний «Слух и ритм» — train — считается «Слухом») и окна внутри занятия
// (s.study — секунды, пока окно было на экране; screens/session.js)
export function studyRows(st, sessions, now = Date.now()) {
  const { goals, show } = studyOf(st), ws = weekStart(now), we = ws + 7 * DAY, d0 = dayStart(now), sec = {}, today = {};
  const add = (id, v, s) => { if (STUDY_IDS.includes(id) && v > 0) { sec[id] = (sec[id] || 0) + v; if (s.start >= d0 && s.start < d0 + DAY) today[id] = (today[id] || 0) + v; } };
  sessions.forEach((s) => {
    if (!(s.start >= ws && s.start < we)) return;
    if (s.type === 'tool') add(s.tool === 'train' ? 'ear' : s.tool, s.dur, s);
    else if (s.study && typeof s.study === 'object') Object.entries(s.study).forEach(([id, v]) => add(id, Math.min(+v || 0, s.dur || 0), s));
  });
  const plan = planOf(st), nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  return STUDY_IDS.filter((id) => goals[id] > 0 || show[id]).map((id) => ({ id, goal: goals[id] || 0, sec: sec[id] || 0, today: today[id] || 0, sched: scheduleOf(plan, id, now, nowMin) }));
}
// Расписание инструмента (слоты с tool === id): дни недели, сегодняшний блок и ближайший → { days, today: {from,to,past}|null, next: {wd, from}|null }
export function scheduleOf(plan, id, now = Date.now(), nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes()) {
  const d0 = dayStart(now), days = new Set();
  plan.slots.filter((x) => x.tool === id).forEach((x) => x.days.forEach((d) => days.add(d)));
  let today = null, next = null;
  for (let k = 0; k < 8 && !(today && next) ; k++) {
    const d = dayStart(d0 + k * DAY + 12 * 3600000), list = slotsOn(plan, d).filter((x) => x.tool === id);
    if (!list.length) continue;
    if (k === 0) { const x = list[0]; today = { from: x.from, to: x.to, past: nowMin >= minOf(x.to) }; if (!today.past) next = { wd: weekday(d), from: x.from, today: true }; }
    else if (!next) next = { wd: weekday(d), from: list[0].from, today: false };
  }
  return { days: [...days].sort(), today, next };
}
export function setGoal(st, id, min) {
  const s = studyOf(st);
  if (min > 0) s.goals[id] = Math.round(min); else delete s.goals[id];
  delete s.show[id]; // цель задана — «без цели» не нужна; убрать (0) — убрать совсем
  s.asked[id] = 1;
  st.study = s;
}
// Показывать строку без цели в часах — только цифры недели и расписание
export function setShow(st, id, on) { const s = studyOf(st); if (on) s.show[id] = 1; else delete s.show[id]; st.study = s; }
// Предлагать ли после урока: ещё нет в программе и не спрашивали
export const shouldOffer = (st, id) => { const s = studyOf(st); return STUDY_IDS.includes(id) && !(s.goals[id] > 0) && !s.asked[id]; };
export const markAsked = (st, id) => { const s = studyOf(st); s.asked[id] = 1; st.study = s; };
