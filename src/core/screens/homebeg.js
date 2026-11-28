// Главная новичка (макет «Н1 · Сегодня», слово автора 28.11.2026): один следующий урок, выбор времени занятия,
// четыре быстрые кнопки и неделя. Всё остальное скрыто и открывается в «Функциях».
import { t, getLang } from '../../i18n/index.js';
import { esc } from '../../ui/index.js';
import { fmtDur } from '../format.js';
import { weekData, weekPlan } from '../stats.js';
import { weekday } from '../time.js';
import { begTile } from './begtools.js';
import { topbar, weekdays } from './common.js';
import { logoHTML } from '../../ui/logo.js';
import { BEG_MINUTES, begMin, pathOrder, nextLessonOf, loadBook, bookDone } from '../beginner.js';
import { dayTone } from './home.js';

const TILES = ['metro', 'tuner', 'notes', 'voice'];

export function homeBeginnerHTML(app) {
  const st = app.store.state.settings, min = begMin(st), w = weekData(app.store.sessions()), wp = weekPlan(st), goal = wp.goal;
  const today = weekday(Date.now()), plan = wp.days, WD = weekdays(), daily = goal / Math.max(1, plan.filter(Boolean).length);
  const p = Math.min(1, w.total / Math.max(1, goal));
  const dots = WD.map((d, i) => '<i class="bgd' + (w.per[i] > 0 ? ' on t' + dayTone(w.per[i], daily) : '') + (i === today ? ' today' : '') + '" title="' + esc(d) + '"></i>').join('');
  return topbar(logoHTML(), '') + '<div class="hlist bghome">' +
    '<section class="bgnext" data-bgnext><div class="bgey">' + esc(t('beg.next')) + '</div><div class="bgtt" data-bgtitle>' + esc(t('beg.nextLoading')) + '</div>' +
    '<div class="bgsub" data-bgsub></div><div class="bgbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i style="width:0"></i></div>' +
    '<button class="bgcta" data-act="begstart">' + esc(t('beg.start')) + '</button></section>' +
    '<section class="bgcard"><div class="bgey l">' + esc(t('beg.howLong')) + '</div><div class="bgseg" role="group" aria-label="' + esc(t('beg.howLong')) + '">' +
    BEG_MINUTES.map((m) => '<button data-act="begmin" data-v="' + m + '" aria-pressed="' + (m === min) + '"' + (m === min ? ' class="on"' : '') + '>' + m + '</button>').join('') + '</div>' +
    '<p class="bgplan">' + esc(t('beg.plan', { n: min })) + '</p></section>' +
    '<div class="bgey l bgqh">' + esc(t('beg.quick')) + '</div><div class="bggrid">' + TILES.map((x) => begTile(st, x)).join('') + '</div>' +
    '<button class="bgcard bgweek" data-pp="bweek" aria-label="' + esc(t('home.stats')) + '"><span class="bgwl"><span class="bgey l">' + esc(t('beg.week')) + '</span>' +
    '<span class="bgbig num">' + esc(fmtDur(w.total)) + ' <small>' + esc(t('home.of', { goal: fmtDur(goal) })) + '</small></span></span><span class="bgdots">' + dots + '</span></button>' +
    '<i hidden data-bgp="' + p + '"></i></div>';
}

// После показа: подставить название и прогресс урока (учебник грузится по требованию)
export function mountHomeBeginner(app, root) {
  const box = root.querySelector('[data-bgnext]');
  if (!box) return;
  loadBook(getLang()).then((b) => {
    if (!b || !box.isConnected) return;
    const done = bookDone(app);
    const nx = nextLessonOf(b.PATHS, pathOrder(app.store.state.settings.profile), done);
    const ttl = box.querySelector('[data-bgtitle]'), sub = box.querySelector('[data-bgsub]'), bar = box.querySelector('.bgbar');
    if (!nx) { ttl.textContent = t('beg.allDone'); sub.textContent = ''; return; }
    ttl.textContent = b.S['ls.' + nx.id] || t('beg.lesson', { n: nx.n });
    sub.textContent = t('beg.of', { n: nx.n, m: nx.total });
    const pc = Math.round((nx.done / nx.total) * 100);
    bar.setAttribute('aria-valuenow', pc); bar.firstChild.style.width = pc + '%';
  });
}
