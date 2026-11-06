// Уведомления наглядно (слово автора 06.11.2026: «практичный графический вид», вид «день» и «неделя»).
// Неделя — дни без дат (Пн…Вс) по часам 6–24: занятие — метка, её можно вести пальцем вверх-вниз (шаг 15 минут,
// своё время для этого дня), напоминания — точки, тихие часы — затенены, дни отдыха — бледные; касание дня вверху —
// день практики или отдыха, касание метки — время дня точно. Сегодня — лента дня: напоминания, занятие, события календаря.
// Как у других (Re-Reminder, WeekForward, Routine Factory): правило на выбранные дни недели, окно времени, обзор дня.
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, toast } from '../../ui/index.js';
import { remindOf, setRemind, remindTimes, timeOn } from '../reminders.js';
import { weekday } from '../time.js';
import { liveEvents } from '../calendar.js';
import { weekdays } from './common.js';

const H0 = 6, H1 = 24, SPAN = (H1 - H0) * 60, DAY = 86400000;
const hm = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const minOf = (s) => { const [h, m] = String(s).split(':').map((x) => +x || 0); return h * 60 + m; };
const toHM = (min) => { min = Math.max(H0 * 60, Math.min(H1 * 60 - 15, Math.round(min / 15) * 15)); return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); };
const pct = (min) => ((Math.max(H0 * 60, Math.min(H1 * 60, min)) - H0 * 60) / SPAN) * 100;
// ближайшая полночь этого дня недели (для расчёта точек)
const dateOfWd = (wd, now = Date.now()) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime() + (((wd - weekday(d.getTime())) + 7) % 7) * DAY; };

let view = 'week';

// Подпись напоминания: «за 60 мин», «после», «точно»
export function slotLabel(x) {
  const s = x.slot || '';
  if (s.startsWith('lead:')) return t('rv.before', { m: s.slice(5) });
  if (s.startsWith('rel:')) { const m = +s.slice(4); return m < 0 ? t('rv.before', { m: -m }) : m > 0 ? t('rv.after', { m }) : t('rv.atStart'); }
  if (s === 'after') return t('rv.afterOne');
  if (s === 'abs') return t('rv.exact');
  return t('rv.day');
}

function weekHTML(st, r) {
  const WD = weekdays(), q = [r.quietFrom, r.quietTo];
  // тихие часы — полосы (через полночь — две)
  const band = (a, b) => (b > a ? '<i class="rvq" style="top:' + pct(a * 60) + '%;height:' + (pct(b * 60) - pct(a * 60)) + '%"></i>' : '');
  const quiet = q[0] > q[1] ? band(q[0], 24) + band(0, q[1]) : band(q[0], q[1]);
  const hours = [6, 9, 12, 15, 18, 21].map((h) => '<span class="rvh" style="top:' + pct(h * 60) + '%">' + h + '</span>').join('');
  const cols = WD.map((name, i) => {
    const on = !!st.days[i], tm = timeOn(r, dateOfWd(i)), own = !!r.dayTimes[i];
    const dots = on ? remindTimes(r, dateOfWd(i)).map((x) => '<i class="rvdot" style="top:' + pct(minOf(hm(x.ts))) + '%" title="' + esc(hm(x.ts) + ' · ' + slotLabel(x)) + '"></i>').join('') : '';
    return '<div class="rvcol' + (on ? '' : ' off') + '" data-rvcol="' + i + '">' + quiet + dots +
      (on ? '<button class="rvmark' + (own ? ' own' : '') + '" data-rvmark="' + i + '" style="top:' + pct(minOf(tm)) + '%" aria-label="' + esc(t('rv.markAria', { d: name, t: tm })) + '"><span class="num">' + tm + '</span></button>' : '') + '</div>';
  }).join('');
  return '<div class="rvweek"><div class="rvhead"><span></span>' + WD.map((n, i) => '<button class="rvday' + (st.days[i] ? ' on' : '') + '" data-rvday="' + i + '" aria-pressed="' + !!st.days[i] + '">' + esc(n) + '</button>').join('') + '</div>' +
    '<div class="rvbody"><div class="rvaxis">' + hours + '</div>' + cols + '</div></div>' +
    '<p class="ftr">' + t('rv.weekHint') + '</p>';
}

function todayHTML(app, st, r, now = Date.now()) {
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  const d0 = d.getTime(), wd = weekday(d0), rows = [];
  if (st.days[wd]) {
    remindTimes(r, d0).forEach((x) => rows.push({ ts: x.ts, kind: 'rem', text: slotLabel(x) }));
    rows.push({ ts: d0 + minOf(timeOn(r, d0)) * 60000, kind: 'play', text: t('rv.practice') });
  }
  liveEvents(app.store.state).filter((e) => +e.start >= d0 && +e.start < d0 + DAY).forEach((e) => rows.push({ ts: +e.start, kind: 'ev', text: e.title || t('rv.event') }));
  rows.sort((a, b) => a.ts - b.ts);
  if (!rows.length) return '<p class="ftr" style="margin-top:4px">' + t(st.days[wd] ? 'rv.todayNone' : 'rv.todayRest') + '</p>';
  return '<div class="group rvlist">' + rows.map((x) => '<div class="cell rvrow ' + x.kind + (x.ts < now ? ' past' : '') + '"><span class="num rvt">' + hm(x.ts) + '</span><i class="rvk"></i><span class="grow">' + esc(x.text) + '</span></div>').join('') + '</div>';
}

// Блок наверху «Уведомлений»: переключатель «Неделя / Сегодня» и сам вид
export function remindViewHTML(app) {
  const st = app.store.state.settings, r = remindOf(st);
  if (r.mode === 'quiet') return '';
  return '<div class="seg rvseg" role="group" aria-label="' + esc(t('rv.view')) + '">' + [['week', t('rv.week')], ['today', t('rv.today')]].map(([k, n]) =>
    '<button data-rvview="' + k + '" aria-pressed="' + (view === k) + '">' + n + '</button>').join('') + '</div>' +
    (view === 'week' ? weekHTML(st, r) : todayHTML(app, st, r));
}

// Обработчики: el — страница; save() — сохранить и перерисовать
export function bindRemindView(el, app, save) {
  const st = () => app.store.state.settings;
  el.addEventListener('click', (e) => {
    const v = e.target.closest('[data-rvview]');
    if (v) { view = v.dataset.rvview; save(false); return; }
    const d = e.target.closest('[data-rvday]');
    if (d) { const i = +d.dataset.rvday; st().days[i] = !st().days[i]; save(true); return; }
    const m = e.target.closest('[data-rvmark]');
    if (m && !drag.moved) dayTimeSheet(app, +m.dataset.rvmark, () => save(true));
  });
  // вести метку пальцем: своё время этого дня, шаг 15 минут
  const drag = { moved: false };
  el.addEventListener('pointerdown', (e) => {
    const m = e.target.closest('[data-rvmark]');
    if (!m) return;
    const col = m.parentElement, box = col.getBoundingClientRect(), y0 = e.clientY, i = +m.dataset.rvmark;
    drag.moved = false;
    const move = (ev) => {
      if (Math.abs(ev.clientY - y0) < 6 && !drag.moved) return;
      drag.moved = true; ev.preventDefault();
      const tm = toHM(H0 * 60 + ((ev.clientY - box.top) / box.height) * SPAN);
      m.style.top = pct(minOf(tm)) + '%'; m.querySelector('.num').textContent = tm; m.dataset.tm = tm;
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      if (drag.moved && m.dataset.tm) { setDayTime(st(), i, m.dataset.tm); save(true); toast(t('rv.moved', { d: weekdays()[i], t: m.dataset.tm })); }
      setTimeout(() => { drag.moved = false; }, 50);
    };
    addEventListener('pointermove', move, { passive: false }); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  });
}

// Своё время дня (как общее — общее и остаётся)
export function setDayTime(settings, i, tm) {
  const r = remindOf(settings), dt = { ...r.dayTimes };
  if (!tm || tm === r.time) delete dt[i]; else dt[i] = tm;
  setRemind(settings, { dayTimes: dt });
}

function dayTimeSheet(app, i, done) {
  const st = app.store.state.settings, r = remindOf(st), name = weekdays()[i];
  const api = sheet(() => snav(t('rv.dayTitle', { d: name })) + '<div class="group"><label class="cell"><span class="grow">' + t('rem.time') + '</span><input type="time" class="inp" data-rvtime value="' + esc(timeOn(r, dateOfWd(i))) + '" aria-label="' + esc(t('rem.time')) + '"></label>' +
    (r.dayTimes[i] ? '<button class="cell act" data-rvsame>' + t('rv.same', { t: r.time }) + '</button>' : '') +
    '<button class="cell act" data-rvall>' + t('rv.allDays') + '</button>' +
    '<button class="cell act danger" data-rvrest>' + t('rv.rest') + '</button></div>', (el) => {
    el.addEventListener('change', (e) => { if (e.target.matches('[data-rvtime]') && e.target.value) { setDayTime(st, i, e.target.value); done(); } });
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-rvsame]')) { setDayTime(st, i, null); api.close(); done(); }
      else if (e.target.closest('[data-rvall]')) { const v = el.querySelector('[data-rvtime]').value; if (v) setRemind(st, { time: v, dayTimes: {} }); api.close(); done(); }
      else if (e.target.closest('[data-rvrest]')) { st.days[i] = false; api.close(); done(); }
    });
  });
}
