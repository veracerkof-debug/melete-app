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

// Предложение цели, когда на сегодня её нет (слово автора 27.11.2026: «цель по умолчанию»): песня, которую играли последней;
// нет игравших — первая из «Учу сейчас»/«Работа», иначе первая в списке. Только предлагает, сама цель не ставится
export const suggestGoal = (songs, sessions) => {
  const live = (songs || []).filter((s) => !s.deleted);
  if (!live.length) return null;
  const last = new Map();
  (sessions || []).forEach((x) => { if (x.songId && (x.start || 0) > (last.get(x.songId) || 0)) last.set(x.songId, x.start || 0); });
  const played = live.filter((s) => last.has(s.id)).sort((a, b) => last.get(b.id) - last.get(a.id));
  return played[0] || live[0];
};
