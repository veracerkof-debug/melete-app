// Отчёт для педагога (слово автора 13.11.2026): неделя занятий картинкой — часы по дням, песни и темпы (было → стало),
// по желанию — разборы и заметки и записи недели. Без сервера: картинка уходит через «Поделиться» (Telegram, почта).
// weekReport — данные (чистая функция, тесты); reportPNG — рисунок на холсте (screens/teacher.js).
import { weekStart, weekday, DAY } from './time.js';
import { weekPlan } from './stats.js';

// sessions, songs, settings, now → { ws, per[7], total, goal, songs: [{ title, sec, from, to }], notes: [{ ts, title, text }], plans: [{ title, n }] }
export function weekReport(sessions, songs, settings, now = Date.now()) {
  const ws = weekStart(now), we = ws + 7 * DAY, per = Array(7).fill(0), by = new Map(), notes = [], plans = new Map();
  let total = 0;
  const name = (id) => (songs.find((s) => s.id === id) || {}).title || '';
  sessions.filter((x) => x.start >= ws && x.start < we).sort((a, b) => a.start - b.start).forEach((x) => {
    per[weekday(x.start)] += x.dur; total += x.dur;
    if (x.songId) {
      let r = by.get(x.songId);
      if (!r) by.set(x.songId, (r = { title: name(x.songId), sec: 0, from: null, to: null }));
      r.sec += x.dur;
      if (x.bpm) { if (r.from == null) r.from = x.bpm; r.to = x.bpm; }
    }
    if (x.note) notes.push({ ts: x.start, title: x.songId ? name(x.songId) : '', text: x.note });
    if (x.plan && x.plan.title) plans.set(x.plan.title, (plans.get(x.plan.title) || 0) + 1);
  });
  return {
    ws, per, total, goal: weekPlan(settings, now).goal,
    songs: [...by.values()].filter((r) => r.title).sort((a, b) => b.sec - a.sec),
    notes, plans: [...plans].map(([title, n]) => ({ title, n })),
  };
}
