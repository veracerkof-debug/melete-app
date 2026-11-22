// Совместное чтение (слово автора 22.11.2026): протокол и модель — из Tandem (veracerkof-debug/Bible.vidget, GPL-3.0), общий репозиторий данных
// с ним: приложения читают и пишут одни и те же файлы. Только данные; сети и DOM здесь нет.
// Модель: из набора документов репозитория (путь → JSON) строится всё, что показывает приложение.
// Правило записи: каждый пишет ТОЛЬКО в свою папку u/<логин>/ — чужие файлы не трогает, поэтому конфликтов нет.
//   couple.json                 — создаётся один раз (id пары, ключ VAPID для уведомлений)
//   u/<логин>/profile.json      — имя, язык, аватар, напоминание
//   u/<логин>/c/<дата>.json     — отчёт дня: проход, рефлексия, фото
//   u/<логин>/a/<ключ>.json     — «подтверждаю» отчёт или заметку партнёра
//   u/<логин>/e/<время>.json    — события: сообщение, «прочти», стих, молитва, заметка, памятный день
//   u/<логин>/hl.json           — выделенные стихи
//   u/<логин>/push.json         — подписки на уведомления этого человека
// Ссылка прохода: { b:'JOH', c:3, c2?:5 } → главы ['JOH.3', …]; коды книг — как в Melete (eBible), формат — как у Tandem
export function refChapters(ref) {
  if (!ref || !ref.b) return [];
  const to = ref.c2 && ref.c2 > ref.c ? ref.c2 : ref.c, out = [];
  for (let k = ref.c; k <= to; k++) out.push(ref.b + '.' + k);
  return out;
}
import { both, streakEnding, weekStats, longestStreak } from './streak.js';

export const P = {
  couple: 'couple.json',
  profile: (u) => `u/${u}/profile.json`,
  avatar: (u) => `u/${u}/avatar.jpg`,
  checkin: (u, d) => `u/${u}/c/${d}.json`,
  photo: (u, d) => `u/${u}/p/${d}.jpg`,
  ack: (u, key) => `u/${u}/a/${key}.json`,
  event: (u, id) => `u/${u}/e/${id}.json`,
  hl: (u) => `u/${u}/hl.json`,
  push: (u) => `u/${u}/push.json`,
};
export const ckey = (d) => 'c-' + d;
export const ekey = (id) => 'e-' + id;
export const newId = (now = Date.now(), rnd = Math.random()) => now.toString(36).padStart(9, '0') + rnd.toString(36).slice(2, 6);

export function buildModel(docs, me, today, opts = {}) {
  const first = opts.weekFirst ?? 1, goal = opts.weekGoal ?? 5;
  const members = {}, checkins = {}, events = [], acks = new Set(), highlights = {}, annivDel = new Set();
  let couple = null;
  for (const [path, data] of docs) {
    if (!data) continue;
    if (path === P.couple) { couple = data; continue; }
    const m = /^u\/([^/]+)\/(.+)$/.exec(path);
    if (!m) continue;
    const [, u, rest] = m;
    if (rest === 'profile.json') members[u] = { ...data, login: u };
    else if (rest === 'hl.json') highlights[u] = data;
    else if (rest.startsWith('c/')) (checkins[u] ??= {})[rest.slice(2, -5)] = { ...data, by: u };
    else if (rest.startsWith('a/')) { if (data.of) acks.add(`${data.of}|${rest.slice(2, -5)}`); }
    else if (rest.startsWith('e/')) events.push({ ...data, id: rest.slice(2, -5), by: u });
  }
  events.forEach((e) => { if (e.type === 'anniv-del' && e.of) annivDel.add(e.of); });
  events.sort((a, b) => (a.at || a.id).localeCompare(b.at || b.id));
  const logins = Object.keys(members).sort((a, b) => (members[a].joined || '').localeCompare(members[b].joined || '') || a.localeCompare(b));
  const partner = logins.find((l) => l !== me) || null;
  const isAcked = (author, key) => acks.has(`${author}|${key}`);
  // день участника: 'none' | 'posted' (отчёт есть, подтверждения нет) | 'done'
  const dayState = (u, d) => {
    const c = checkins[u]?.[d];
    if (!c) return 'none';
    return isAcked(u, ckey(d)) ? 'done' : 'posted';
  };
  const kept = (u) => new Set(Object.keys(checkins[u] || {}).filter((d) => isAcked(u, ckey(d))));
  const mine = kept(me), theirs = partner ? kept(partner) : new Set();
  const together = both(mine, theirs);
  const ws = weekStats(together, today, first, goal);
  // главы и книги, прочитанные вдвоём
  const chapters = new Set();
  Object.values(checkins).forEach((byDay) => Object.values(byDay).forEach((c) => refChapters(c.ref).forEach((k) => chapters.add(k))));
  const books = new Set([...chapters].map((k) => k.split('.')[0]));
  const anniversaries = events.filter((e) => e.type === 'anniv' && !annivDel.has(e.id));
  const since = Object.values(members).map((p) => p.joined).filter(Boolean).sort()[0] || null;
  return {
    couple, members, logins, partner, checkins, events, highlights, anniversaries, since,
    isAcked, dayState, kept,
    streak: { together: streakEnding(together, today), me: streakEnding(mine, today), best: longestStreak(together), weeks: ws.kept, weekStreak: ws.streak },
    stats: { books: books.size, chapters: chapters.size },
    togetherDays: together,
  };
}
