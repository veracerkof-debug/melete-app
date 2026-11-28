// Итог занятия новичка (макет «Н10 · Итог», слово автора 28.11.2026): «Занятие закончено», время, что нового, «Дальше», «Готово».
// Заменяет шторку с метками и разбором только при a.beg (занятие по плану с главной); запись занятия — та же (session.js: finish).
import { t, getLang } from '../../i18n/index.js';
import { esc, sheet } from '../../ui/index.js';
import { fmtDur } from '../format.js';
import { weekData } from '../stats.js';
import { loadBook, pathOrder, nextLessonOf, bookDone, lessonChords, lessonInst } from '../beginner.js';
import { REPS } from './begsess.js';

export function begDoneSheet(app, a, sum, onSave) {
  const b = a.beg, st = app.store.state.settings, week = weekData(app.store.sessions()).total + sum.dur, reps = (b.rounds || 0) * REPS + (b.reps || 0);
  const stat = (v, l, attr = '') => '<div class="grow"' + attr + '><div class="bgsv num">' + esc(v) + '</div><div class="bgsl">' + esc(l) + '</div></div>';
  const api = sheet(() => '<div class="bgdone"><div class="bgdt"><div class="bgey l">' + esc(t('beg.doneT')) + '</div><div class="bgdbig num">' + esc(fmtDur(sum.dur)) + '</div>' +
    '<div class="bgmut">' + esc(t(sum.dur >= b.min * 60 ? 'beg.donePlan' : 'beg.doneGood')) + '</div></div>' +
    '<section class="bgcard"><div class="bgr stats">' +
    (b.done.length ? stat(String(b.done.length), t('beg.statLessons'), ' data-bgnew') : stat(String(reps), t('beg.statChanges'))) +
    stat(sum.best ? String(sum.best) : '—', t('beg.statTempo')) + stat(fmtDur(week), t('beg.statWeek')) + '</div></section>' +
    '<section class="bgcard" data-bgafter hidden><div class="bgey l">' + esc(t('beg.after')) + '</div><div class="bgb2" data-bgat style="margin-top:4px"></div><div class="bgmut">' + esc(t('beg.afterSub')) + '</div></section>' +
    '<button class="bgb wide" data-k="save">' + esc(t('ui.done')) + '</button>' +
    '<button class="bgb ghost wide" data-k="back">' + esc(t('fin.continue')) + '</button></div>', (el, sh) => {
    el.addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]');
      if (!k) return;
      sh.close();
      if (k.dataset.k === 'save') onSave();
    });
    // название нового аккорда и следующий урок — когда учебник загружен (он уже грузился на экране занятия)
    loadBook(getLang()).then((bk) => {
      if (!bk || !el.isConnected) return;
      const last = b.done[b.done.length - 1], def = last && bk.lessonById(last), ch = def ? lessonChords(def, lessonInst(last, st.profile)) : [];
      const cell = el.querySelector('[data-bgnew]');
      if (cell && ch.length) { cell.querySelector('.bgsv').textContent = ch.slice(0, 2).join(' '); cell.querySelector('.bgsl').textContent = t('beg.statChord'); }
      const nx = nextLessonOf(bk.PATHS, pathOrder(st.profile), bookDone(app));
      const box = el.querySelector('[data-bgafter]');
      if (nx && box) { box.hidden = false; box.querySelector('[data-bgat]').textContent = t('beg.lessonN', { n: nx.n, title: bk.S['ls.' + nx.id] || '' }); }
    });
  });
  return api;
}
