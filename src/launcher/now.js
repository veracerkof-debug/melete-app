// «Сейчас» — главный блок варианта «Фокус» (предложение Claude, DECISIONS 2026-11-02): вместо отдельных Melete
// и кошелька — до трёх строк о том, что важно в эту минуту, каждая ведёт к делу одним касанием:
//   идёт занятие → вернуться в него; сегодня ещё не играли → начать; сыграно → сколько за день и неделю;
//   чтение дня (церковный режим) → открыть; кошелёк → траты за сегодня или общий баланс.
// Порядок — по важности: занятие и практика первыми (четвёртый принцип: приложение ведёт к инструменту).
import { prefs } from './data.js';
import { trackerData, fmtDur } from './tracker.js';
import { readJSON } from './data.js';
import { MONEY_KEY, walletBalance } from './wallet.js';
import { hasLock } from './lock.js';
import { t } from './i18n.js';
import { h } from './ui.js';

const money = (n) => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('ru-RU').replace(/ /g, ' ');

// траты сегодня (расходы с начала дня)
function spentToday() {
  const db = readJSON(MONEY_KEY);
  if (!db || !Array.isArray(db.recs)) return null;
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  return db.recs.filter((r) => r.k === 'e' && (r.t || 0) >= d0.getTime()).reduce((a, r) => a + r.a, 0);
}

export function renderNow(handlers) {
  const go = (fn) => (e) => { if (!e.currentTarget.dataset.suppress) fn(); };
  const row = (cls, k, v, act, fn, label) => h('button', { class: 'l-now-r ' + cls, onclick: go(fn), 'aria-label': label || `${k}: ${v}` },
    h('span', { class: 'l-now-k' }, k), h('span', { class: 'l-now-v' }, v), act ? h('span', { class: 'l-now-a' }, act) : null);
  const rows = [];
  const d = prefs.tracker ? trackerData() : null;
  const lv = d?.live, p = d?.practice, rd = d?.reading;
  if (lv) {
    const min = lv.start ? Math.max(0, Math.floor((Date.now() - lv.start) / 60e3)) : null;
    rows.push(row('live', lv.session ? t('tr.live') : t('tr.playing'), min != null ? t('dur.m', { m: min }) : '', '›', () => handlers.onMelete(lv.session ? 'session' : 'free')));
  } else if (p) {
    const today = p.per?.[(new Date().getDay() + 6) % 7] || 0;
    if (!today) rows.push(row('start', t('now.practice'), t('now.notYet'), t('now.start'), () => handlers.onMelete('free')));
    else rows.push(row('', t('now.practice'), `${fmtDur(today, t)} · ${t('now.week')} ${Math.round(Math.min(1, p.progress) * 100)}%`, '›', () => handlers.onMelete('free')));
  }
  if (rd?.ref) rows.push(row(rd.done >= rd.total ? 'done' : '', t('tr.reading'), rd.ref, rd.done >= rd.total ? '✓' : '›', () => handlers.onMelete('bible')));
  const bal = walletBalance();
  if (bal != null) {
    const sp = spentToday();
    rows.push(hasLock()
      ? row('', t('bal.title'), '•••', '›', handlers.onWallet)
      : sp ? row('', t('now.spent'), `${money(sp)} ${t('bal.cur')}`, '›', handlers.onWallet)
        : row('', t('bal.title'), `${money(bal)} ${t('bal.cur')}`, '›', handlers.onWallet));
  }
  if (!rows.length) return h('div', { class: 'l-now', hidden: true });
  const el = h('div', { class: 'l-now', role: 'group', 'aria-label': t('blk.now') }, ...rows.slice(0, 3));
  el.longPress = () => handlers.onBlockHold('now');
  rows.forEach((r) => { r.longPress = el.longPress; });
  return el;
}
