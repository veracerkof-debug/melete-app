// Повторение репертуара с интервалами (слово автора 13.11.2026): выученная песня (уровень «Выучена») «просит
// повторения» через растущий интервал — 2 дня → 4 → 8 → 16 → 32 → 64. Сыграли вовремя — интервал растёт; долго
// не играли (дольше полутора интервалов) — снова с двух дней. Без красного, без счётчиков пропусков: только
// «Повторить: …» на главной и пометка в списке песен. Логика без DOM; считается по истории занятий.
import { getPct, masteryLevel } from './library.js';
import { dayStart } from './time.js';

const DAY = 86400000;
export const FIRST = 2, MAX = 64;
export const inRepertoire = (s) => masteryLevel(getPct(s)) >= 4;

// Дни занятий песней (полночи по возрастанию) → { iv (дней), last (полночь) } | null
export function intervalOf(days) {
  if (!days.length) return null;
  let iv = FIRST;
  for (let i = 1; i < days.length; i++) {
    const gap = Math.round((days[i] - days[i - 1]) / DAY);
    if (gap < 1) continue;
    iv = gap <= iv * 1.5 ? Math.min(MAX, gap >= iv ? iv * 2 : iv) : FIRST;
  }
  return { iv, last: days[days.length - 1] };
}

// Песни репертуара к повторению сегодня → [{ s, iv, days (дней с прошлого раза), k (во сколько раз просрочено) }],
// самые «просящие» первыми. Песни без занятий в приложении — с даты добавления
export function dueSongs(songs, sessions, now = Date.now()) {
  const by = new Map();
  for (const x of sessions) { if (!x.songId) continue; const d = dayStart(x.start); let a = by.get(x.songId); if (!a) by.set(x.songId, (a = new Set())); a.add(d); }
  const today = dayStart(now), out = [];
  for (const s of songs) {
    if (!inRepertoire(s)) continue;
    const ds = [...(by.get(s.id) || [])].sort((a, b) => a - b);
    const r = intervalOf(ds.length ? ds : [dayStart(s.createdAt || now)]);
    const days = Math.round((today - r.last) / DAY);
    if (days >= r.iv) out.push({ s, iv: r.iv, days, k: days / r.iv });
  }
  return out.sort((a, b) => b.k - a.k || b.days - a.days);
}
