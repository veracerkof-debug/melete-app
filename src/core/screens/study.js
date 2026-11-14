// Блок «Учёба» на главной и шторки программы (src/core/study.js): строка на инструмент — сколько за неделю из цели,
// полоска; касание — открыть на своём месте; ⋯ у заголовка — часы в неделю (добавить, изменить, убрать). После урока — «Добавить на главную?»
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, toast } from '../../ui/index.js';
import { moduleById } from '../../modules/index.js';
import { moduleName } from '../modules.js';
import { fmtDur } from '../format.js';
import { studyRows, setGoal, setShow, shouldOffer, markAsked, STUDY_PRESETS, STUDY_IDS, studyOf } from '../study.js';
import { weekdays } from './common.js';

const nameOf = (id) => { const m = moduleById(id); return m ? moduleName(m) : id; };
const iconOf = (id) => (moduleById(id) || {}).icon || '';
const hours = (min) => (min % 60 ? t('time.m', { n: min }) : t('time.h', { n: min / 60 }));

// Строка расписания: сегодня ли, во сколько, сделано ли; иначе — ближайший день и дни недели
function schedText(r) {
  const S = r.sched, WD = weekdays();
  if (S.today && r.today > 0) return t('study.doneToday');
  if (S.today && !S.today.past) return t('study.todayAt', { t: S.today.from });
  if (S.next) return t('study.nextAt', { d: WD[S.next.wd], t: S.next.from });
  if (S.today) return t('study.todayPast', { t: S.today.from });
  return r.today > 0 ? t('study.todayMin', { m: fmtDur(r.today) }) : '';
}
const dayDots = (r) => { const WD = weekdays(); return r.sched.days.length ? '<span class="hsdays" aria-hidden="true">' + WD.map((d, i) => '<i class="' + (r.sched.days.includes(i) ? 'on' : '') + '">' + esc(d) + '</i>').join('') + '</span>' : ''; };

export function studyCard(app) {
  const st = app.store.state.settings, sessions = app.store.sessions(), rows = studyRows(st, sessions);
  if (!rows.length) {
    // ничего не выбрано: после первого занятия слуха, ритма, вокала или учебника — предложение собрать свой блок
    const used = sessions.some((s) => s.type === 'tool' && STUDY_IDS.includes(s.tool === 'train' ? 'ear' : s.tool));
    return used ? '<div class="hstudy"><div class="hhdr"><span>' + t('study.title') + '</span></div><button class="hsrow" data-act="studyset"><span class="grow"><b>' + esc(t('study.add')) + '</b><span class="hsub">' + esc(t('study.addSub')) + '</span></span></button></div>' : '';
  }
  return '<div class="hstudy"><div class="hhdr"><span>' + t('study.title') + '</span><button class="hsset" data-act="studyset" aria-label="' + esc(t('study.hours')) + '">⋯</button></div>' + rows.map((r) => {
    const p = r.goal ? Math.min(1, r.sec / (r.goal * 60)) : 0, sc = schedText(r);
    return '<button class="hsrow' + (p >= 1 ? ' met' : '') + '" data-act="study" data-k="' + r.id + '"><span class="hsic" aria-hidden="true">' + iconOf(r.id) + '</span><span class="grow"><b>' + esc(nameOf(r.id)) + '</b>' +
      (r.goal ? '<span class="hsbar"><i style="width:' + (p * 100).toFixed(1) + '%"></i></span>' : '') + (sc ? '<span class="hsub">' + esc(sc) + '</span>' : '') + dayDots(r) + '</span>' +
      '<span class="num hsv">' + esc(r.goal ? t('study.of', { done: fmtDur(r.sec), goal: hours(r.goal) }) : t('study.week', { done: fmtDur(r.sec) })) + '</span></button>';
  }).join('') + '</div>';
}

// Открыть строку: учебник, «Слух», «Ритм» — каждый своим инструментом
export function openStudy(app, id, openToolView, done) { openToolView(app, id, done); }

// Часы в неделю: готовые и своё; 0 — убрать с главной
export function goalSheet(app, id, onDone = () => {}) {
  const st = app.store.state.settings, cur = studyOf(st).goals[id] || 0;
  const api = sheet(() => snav(nameOf(id)) + '<p class="sub" style="margin:2px 4px 12px">' + t('study.ask') + '</p><div class="group">' +
    STUDY_PRESETS.map((m) => '<button class="cell act' + (cur === m ? ' on' : '') + '" data-sg="' + m + '">' + esc(t('study.perWeek', { h: hours(m) })) + (cur === m ? ' ✓' : '') + '</button>').join('') +
    '<button class="cell act' + (!cur && studyOf(st).show[id] ? ' on' : '') + '" data-sg="-1">' + esc(t('study.noGoal')) + (!cur && studyOf(st).show[id] ? ' ✓' : '') + '</button>' +
    '<label class="cell"><span class="grow">' + t('study.own') + '</span><input class="inp num" type="number" inputmode="numeric" min="10" max="1200" step="10" data-sgown value="' + (cur && !STUDY_PRESETS.includes(cur) ? cur : '') + '" placeholder="' + t('study.min') + '" style="width:90px"></label></div>' +
    '<div class="group" style="margin-top:12px"><button class="cell act' + (cur ? ' danger' : '') + '" data-sg="0">' + t(cur ? 'study.remove' : 'study.later') + '</button></div><p class="ftr">' + t('study.hint') + '</p>', (el) => {
    const pick = (m) => { if (m < 0) { setGoal(st, id, 0); setShow(st, id, true); } else setGoal(st, id, m); app.store.settingsChanged(); api.close(); onDone(); if (m > 0) toast(t('study.added', { name: nameOf(id), h: hours(m) })); else if (m < 0) toast(t('study.addedNoGoal', { name: nameOf(id) })); };
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-sg]'); if (b) pick(+b.dataset.sg); });
    el.addEventListener('change', (e) => { if (e.target.matches('[data-sgown]') && +e.target.value >= 10) pick(Math.min(1200, +e.target.value)); });
  }, { onClose: () => { markAsked(st, id); app.store.settingsChanged(); } });
}

// После пройденного урока: предложить один раз
export function studyOffer(app, id, onDone) {
  if (!shouldOffer(app.store.state.settings, id)) return;
  setTimeout(() => goalSheet(app, id, onDone), 900); // сначала — итог урока
}

// Все строки программы: часы каждой, добавить новую
export function studySetSheet(app, onDone = () => {}) {
  const st = app.store.state.settings;
  const api = sheet(() => { const so = studyOf(st), g = so.goals; return snav(t('study.hours')) + '<div class="group">' + STUDY_IDS.filter((id) => moduleById(id)).map((id) =>
    '<button class="cell" data-sgid="' + id + '"><span class="hsic" aria-hidden="true">' + iconOf(id) + '</span><span class="grow">' + esc(nameOf(id)) + '</span><span class="val">' + (g[id] ? esc(t('study.perWeek', { h: hours(g[id]) })) : so.show[id] ? esc(t('study.noGoalShort')) : '—') + '</span></button>').join('') + '</div><p class="ftr">' + t('study.hint') + '</p>'; }, (el) => {
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-sgid]'); if (b) { api.close(); goalSheet(app, b.dataset.sgid, onDone); } });
  });
}
