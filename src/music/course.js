// Уроки тренажёров (слух, ритм): путь из глав и уроков, сдача, повторение пройденного, проверка уровня. Без DOM.
// Курс — [{ id, book?, lessons: [{ id, n?, …настройки упражнения }] }]; прогресс — { done: { [id]: запись урока }, pl? }.
// Запись урока: { best, last, n — сколько раз пройден, at — когда сдан или повторён (мс), k — шаг повторения, pl — по проверке уровня }.
// Закрытых уроков нет: путь подсказывает следующий, но открыть можно любой.

export const PASS = 0.8;
export const DAY = 86400000;
// Повторение: через 1, 3, 7, 14 и 30 дней после сдачи (каждое удачное повторение — шаг дальше, ошибка — снова через день)
export const REVIEW_DAYS = [1, 3, 7, 14, 30];

export const lessonsOf = (course) => course.flatMap((ch) => ch.lessons.map((l) => ({ ...l, ch: ch.id })));
export const findLesson = (course, id) => lessonsOf(course).find((l) => l.id === id) || null;
export const chapterOf = (course, id) => course.find((ch) => ch.lessons.some((l) => l.id === id)) || null;

export function normalizeProg(p) {
  if (!p.done || typeof p.done !== 'object') p.done = {};
  return p;
}
export const passed = (p, id) => !!(p.done && p.done[id] && p.done[id].best >= PASS);

// Итог урока: score — доля верного (0…1)
export function recordLesson(p, id, score, now) {
  normalizeProg(p);
  const d = p.done[id] || (p.done[id] = { best: 0, last: 0, n: 0, at: 0, k: 0 });
  const was = d.best >= PASS;
  d.last = Math.round(score * 100) / 100;
  d.best = Math.max(d.best, d.last);
  d.n++;
  if (d.last >= PASS) { d.k = was ? Math.min(d.k + 1, REVIEW_DAYS.length - 1) : 0; d.at = now; delete d.pl; }
  return d;
}

// Ответ на вопрос повторения из урока id
export function recordReview(p, id, ok, now) {
  const d = p.done && p.done[id];
  if (!d) return;
  if (ok) { d.k = Math.min((d.k || 0) + 1, REVIEW_DAYS.length - 1); d.at = now; }
  else { d.k = 0; d.at = now - REVIEW_DAYS[0] * DAY; } // снова на повторение сразу
}

// Следующий урок пути: первый несданный по порядку (всё сдано — null)
export function nextLesson(course, p) {
  return lessonsOf(course).find((l) => !passed(p, l.id)) || null;
}

// Уроки, которые пора повторить (кроме except): сданы и срок подошёл; самые давние — первыми
export function dueReviews(course, p, now, except = null) {
  return lessonsOf(course)
    .filter((l) => l.id !== except && passed(p, l.id))
    .map((l) => { const d = p.done[l.id]; return { l, over: now - (d.at || 0) - REVIEW_DAYS[d.k || 0] * DAY }; })
    .filter((x) => x.over >= 0)
    .sort((a, b) => b.over - a.over)
    .map((x) => x.l);
}

export function progressOf(course, p) {
  const all = lessonsOf(course);
  return { done: all.filter((l) => passed(p, l.id)).length, total: all.length };
}
export function chapterProgress(ch, p) {
  return { done: ch.lessons.filter((l) => passed(p, l.id)).length, total: ch.lessons.length };
}

// Проверка уровня: из каждой главы — первый, средний и последний урок, по per вопросов
export function placementPlan(course, per = 2) {
  const out = [];
  course.forEach((ch) => {
    const n = ch.lessons.length, idx = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
    idx.forEach((i) => { for (let q = 0; q < per; q++) out.push({ id: ch.lessons[i].id, ch: ch.id, i }); });
  });
  return out;
}
// Итог проверки: res — { [id урока]: [ok, ok, …] }. В главе: пока пробы верны все — уроки до пробы включительно сданы
// (pl: true — по проверке, повторение как у сданных); первая неверная проба — дальше в главе нет.
export function applyPlacement(course, p, res, now) {
  normalizeProg(p);
  const marked = [];
  course.forEach((ch) => {
    const n = ch.lessons.length, idx = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
    let upto = -1;
    for (const i of idx) { const r = res[ch.lessons[i].id]; if (r && r.length && r.every(Boolean)) upto = i; else break; }
    for (let i = 0; i <= upto; i++) {
      const id = ch.lessons[i].id;
      if (passed(p, id)) continue;
      p.done[id] = { best: PASS, last: PASS, n: 0, at: now, k: 0, pl: true };
      marked.push(id);
    }
  });
  p.pl = now;
  return marked;
}
