// Цель на день (слово автора 25.11.2026): одно произведение, которое человек поставил себе на сегодня. Хранится в
// settings.todayGoal = { day, songId } и действует только в тот день (ночью сама «сбрасывается»: чужой день — цели нет).
// Без цели главная кнопка — «Свободная практика»; с целью — «Начать «название»». Чистые функции, без DOM.
import { dayKey } from './time.js';

// Песня-цель на сейчас или null (день не тот, песни нет или удалена)
export const goalOf = (st, songs, now = Date.now()) => {
  const g = st && st.todayGoal;
  if (!g || g.day !== dayKey(now)) return null;
  return (songs || []).find((s) => s.id === g.songId && !s.deleted) || null;
};
export const setGoal = (st, songId, now = Date.now()) => { st.todayGoal = { day: dayKey(now), songId }; };
export const clearGoal = (st) => { delete st.todayGoal; };
// Цель выполнена: сегодня была практика с этой песней (хотя бы минута)
export const goalDone = (sessions, songId, now = Date.now()) => (sessions || []).some((s) => s.songId === songId && dayKey(s.start) === dayKey(now) && (s.dur || 0) >= 60);
