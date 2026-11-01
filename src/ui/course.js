// Уроки тренажёров — общий вид (слух и ритм): путь по главам, итог урока, шапка идущего урока. Логика — src/music/course.js.
// Строки — общие ядра (crs.*), названия глав и уроков — у модуля: title(id), chTitle(id). Действия — data-x:
// lgo (открыть урок data-v), lbook (глава учебника data-v), lplace (проверка уровня), lskip (начать с начала),
// lnext / lagain / lhome (после урока), lrev (повторение).
import './course.css';
import { PASS, passed, nextLesson, dueReviews, progressOf, chapterProgress } from '../music/course.js';

const pct = (x) => Math.round(x * 100) + '%';
const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5"/></svg>';
const BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20"/></svg>';

export function courseHTML({ course, p, t, esc, title, chTitle, now, book = true }) {
  const nx = nextLesson(course, p), pr = progressOf(course, p), due = dueReviews(course, p, now);
  let s = '<div class="crs">';
  if (!p.pl && !pr.done) {
    s += '<div class="crsplace"><b>' + t('crs.start') + '</b><span>' + t('crs.placeHint') + '</span><div class="crsrow"><button class="btn fill" data-x="lplace">' + t('crs.place') +
      '</button><button class="btn" data-x="lskip">' + t('crs.fromStart') + '</button></div></div>';
  }
  s += '<div class="crshead"><div class="crsbar" role="progressbar" aria-valuemin="0" aria-valuemax="' + pr.total + '" aria-valuenow="' + pr.done + '"><i style="width:' + (pr.total ? (pr.done / pr.total) * 100 : 0) + '%"></i></div>' +
    '<span class="num">' + t('crs.passed', { n: pr.done, m: pr.total }) + '</span></div>';
  if (nx) s += '<button class="crsgo" data-x="lgo" data-v="' + nx.id + '"><small>' + t(pr.done ? 'crs.continue' : 'crs.begin') + '</small><b>' + esc(title(nx.id)) + '</b><span class="crsch">' + esc(chTitle(nx.ch)) + '</span></button>';
  else s += '<div class="crsgo all"><b>' + t('crs.allDone') + '</b></div>';
  if (due.length) s += '<button class="crsrev" data-x="lrev"><b>' + t('crs.review') + '</b><span>' + t('crs.reviewN', { n: due.length }) + '</span></button>';
  course.forEach((ch, ci) => {
    const cp = chapterProgress(ch, p);
    s += '<div class="crschap"><div class="crschh"><span class="crsnum num">' + (ci + 1) + '</span><b>' + esc(chTitle(ch.id)) + '</b><span class="num l2">' + cp.done + '/' + cp.total + '</span>' +
      (book && ch.book ? '<button class="ic sm crsbook" data-x="lbook" data-v="' + ch.book + '" aria-label="' + t('crs.read') + '" title="' + t('crs.read') + '">' + BOOK + '</button>' : '') + '</div>';
    ch.lessons.forEach((l, li) => {
      const d = p.done[l.id], ok = passed(p, l.id), cur = nx && nx.id === l.id;
      s += '<button class="crsl' + (ok ? ' ok' : '') + (cur ? ' cur' : '') + '" data-x="lgo" data-v="' + l.id + '"><span class="crsmk">' + (ok ? CHECK : '<i class="num">' + (li + 1) + '</i>') + '</span>' +
        '<span class="crst">' + esc(title(l.id)) + '</span><span class="crsp num">' + (d && d.n ? pct(d.best) : d && d.pl ? t('crs.byTest') : '') + '</span></button>';
    });
    s += '</div>';
  });
  return s + '</div>';
}

// Шапка идущего урока: название, вопрос i из n, полоса
export function lessonBarHTML({ t, esc, name, i, n, review }) {
  return '<div class="crslb"><span class="crslbn">' + (review ? t('crs.reviewQ') : esc(name)) + '</span><span class="num">' + Math.min(i + 1, n) + '/' + n + '</span>' +
    '<button class="ic sm crsx" data-x="lhome" aria-label="' + t('crs.stop') + '" title="' + t('crs.stop') + '"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
    '<i class="crslbbar" style="--p:' + (n ? i / n : 0) + '"></i></div>';
}

// Итог урока
export function resultHTML({ t, esc, name, score, next, nextName, book, placement }) {
  const ok = score >= PASS;
  if (placement) {
    return '<div class="crsres ok"><div class="crsbig">' + CHECK + '</div><b>' + t('crs.placeDone') + '</b><span>' + t('crs.placeN', { n: placement.n }) + '</span>' +
      (next ? '<button class="btn fill block" data-x="lgo" data-v="' + next + '">' + t('crs.nextIs', { name: esc(nextName) }) + '</button>' : '') +
      '<button class="btn block" data-x="lhome">' + t('crs.toList') + '</button></div>';
  }
  return '<div class="crsres ' + (ok ? 'ok' : 'bad') + '"><div class="crsbig num">' + pct(score) + '</div><b>' + esc(name) + '</b><span>' + t(ok ? 'crs.pass' : 'crs.notYet', { p: pct(PASS) }) + '</span>' +
    (ok && next ? '<button class="btn fill block" data-x="lgo" data-v="' + next + '">' + t('crs.nextIs', { name: esc(nextName) }) + '</button>' : '') +
    '<button class="btn block' + (ok ? '' : ' fill') + '" data-x="lagain">' + t('crs.again') + '</button>' +
    (book ? '<button class="btn block" data-x="lbook" data-v="' + book + '">' + BOOK + t('crs.read') + '</button>' : '') +
    '<button class="link" data-x="lhome">' + t('crs.toList') + '</button></div>';
}

// Переключатель режимов модуля: «Тренажёр» / «Уроки»
export const modeSeg = (t, cur) => '<div class="seg crsmode" role="group" data-seg="xmode" aria-label="' + t('crs.mode') + '"><button type="button" data-v="free" aria-pressed="' + (cur !== 'course') + '">' +
  t('crs.free') + '</button><button type="button" data-v="course" aria-pressed="' + (cur === 'course') + '">' + t('crs.lessons') + '</button></div>';
