// Страницы настроек новичка по макетам «Н11 · Неделя» и «Н12 · Ещё» (слово автора 28.11.2026).
// «Ещё» — короткий список вместо длинной панели (полный список — «Настройки»); «Неделя» — цель, дни, уроки и аккорды, без серий.
import { t, getLang } from '../../i18n/index.js';
import { esc } from '../../ui/index.js';
import { fmtDur } from '../format.js';
import { weekData, weekPlan } from '../stats.js';
import { weekday, DAY } from '../time.js';
import { weekdays } from './common.js';
import { loadBook, begLog, lessonsSince, lessonChords, lessonInst } from '../beginner.js';

// Новичок на телефоне, не «Только инструменты» и не «Минимал»: короткие страницы вместо длинной панели
export const begPanelOn = (st, desk = false) => ((st.profile || {}).level) === 'beginner' && !st.toolsOnly && st.uiStyle !== 'mono' && !desk;

const CH = '<span class="bgmut" aria-hidden="true">›</span>';

// Даты недели: «24 – 30 ноября»
function rangeLabel(ws) {
  const a = new Date(ws), b = new Date(ws + 6 * DAY + 12 * 3600000), loc = getLang() === 'uz' ? 'uz' : getLang();
  try { return new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).formatRange(a, b); } catch { return a.getDate() + ' – ' + b.getDate(); }
}

export function begWeekHTML(app) {
  const st = app.store.state.settings, w = weekData(app.store.sessions()), goal = weekPlan(st).goal, WD = weekdays(), p = Math.min(1, w.total / Math.max(1, goal));
  const max = Math.max(1, ...w.per), today = weekday(Date.now());
  const bars = w.per.map((v, i) => '<i class="bgbar2' + (v > 0 ? ' on' : '') + (i === today ? ' today' : '') + '" style="height:' + Math.max(6, Math.round((v / max) * 100)) + '%" title="' + esc(WD[i] + ': ' + fmtDur(v)) + '"></i>').join('');
  const les = lessonsSince(begLog(app), w.ws).length;
  return '<div class="bgp"><div class="bghd"><div class="bgttl l"><h1>' + esc(t('beg.week')) + '</h1><div class="bgsub">' + esc(rangeLabel(w.ws)) + '</div></div></div>' +
    '<section class="bgcard"><div class="bgey l">' + esc(t('beg.wGoal')) + '</div><div class="bgbig num" style="margin-top:2px">' + esc(fmtDur(w.total)) + ' <small>' + esc(t('home.of', { goal: fmtDur(goal) })) + '</small></div>' +
    '<div class="bgprog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(p * 100) + '" style="margin-top:12px"><i style="width:' + Math.round(p * 100) + '%"></i></div></section>' +
    '<section class="bgcard"><div class="bgbars">' + bars + '</div><div class="bgdays">' + WD.map((d) => '<span>' + esc(d) + '</span>').join('') + '</div></section>' +
    '<section class="bgcard tight"><div class="bgcell"><b>' + esc(t('beg.wLessons')) + '</b><span class="num bgmut" data-bgnl>' + les + '</span></div>' +
    '<div class="bgcell"><b>' + esc(t('beg.wChords')) + '</b><span class="num bgmut" data-bgnc>—</span></div></section>' +
    '<p class="bgmut c">' + esc(t('beg.wNoStreak')) + '</p></div>';
}

// Аккорды недели — из пройденных уроков (учебник грузится по требованию)
export function mountBegWeek(app, root) {
  const el = root.querySelector('[data-bgnc]');
  if (!el) return;
  const ids = lessonsSince(begLog(app), weekData(app.store.sessions()).ws);
  if (!ids.length) return;
  loadBook(getLang()).then((bk) => {
    if (!bk || !el.isConnected) return;
    const out = [];
    ids.forEach((id) => { const def = bk.lessonById(id); if (def) lessonChords(def, lessonInst(id, app.store.state.settings.profile)).forEach((c) => { if (!out.includes(c)) out.push(c); }); });
    el.textContent = out.length ? out.join(', ') : '—';
  });
}

export function begMoreHTML(app) {
  const st = app.store.state.settings, goal = weekPlan(st).goal, lvl = (st.profile || {}).level || 'beginner';
  const cell = (pp, name, right) => '<button class="bgcell" data-pp="' + pp + '"><b>' + esc(name) + '</b>' + right + '</button>';
  return '<div class="bgp"><div class="bghd"><div class="bgttl l"><h1>' + esc(t('beg.tabMore')) + '</h1></div></div>' +
    '<section class="bgcard tight">' + cell('bweek', t('beg.week'), CH) + cell('week', t('beg.wGoal'), '<span class="bgchip ac num">' + esc(fmtDur(goal)) + '</span>') + cell('me', t('beg.mProfile'), '<span class="bgchip">' + esc(t('level.' + lvl)) + '</span>') + '</section>' +
    '<section class="bgcard tight"><button class="bgcell" data-act="begall"><b>' + esc(t('beg.mSettings')) + '</b>' + CH + '</button>' + cell('data', t('beg.mCopy'), CH) + '</section>' +
    '<section class="bgcard soft"><b>' + esc(t('beg.mMoreT')) + '</b><p class="bgmut">' + esc(t('beg.mMoreS')) + '</p><button class="bgb sec" data-pp="feat">' + esc(t('beg.mMoreB')) + '</button></section></div>';
}
