// «Сегодня» — центр управления на компьютере (слово автора 28.11.2026, макет DToday): ближайшее служение (событие с песнями),
// выбор времени занятия 10/20/30/45 и «Начать» с планом на это время, «Продолжить», репетиция сегодня, что подтянуть,
// неделя, помощник. Только html.dpro (deskshell.js); прежняя главная — по кнопке внизу (shell.js: view.classic).
// Модель (todayModel, planFor) — чистые функции, без DOM; план занятия — обычный план (routine.js, id «desk-today»).
import { t, tn, getLang } from '../../i18n/index.js';
import { esc } from '../../ui/index.js';
import { liveEvents, upcoming, ensureCal, kindOf } from '../calendar.js';
import { dayKey, dayStart, pad2, DAY } from '../time.js';
import { chordsIn } from '../../music/lyrics.js';
import { weekData, weekPlan } from '../stats.js';
import { fmtDur } from '../format.js';
import { saveRoutine, routineById } from '../routine.js';
import { isOn } from '../settings.js';

export const PLAN_ID = 'desk-today';
export const MINUTES = [10, 20, 30, 45];

// Песня в сет-листе: готова — есть аккорды и темп дошёл до цели
export function songInfo(s) {
  const chords = chordsIn(s.notes).length > 0, cur = +s.currentBpm || 0, goal = +s.targetBpm || 0, gap = goal > 0 && cur < goal;
  return { s, chords, gap, ready: chords && !gap, cur, goal };
}

// План на min минут: разминка с метрономом, одна-две песни «подтянуть» с их темпом, остальное — свободная игра. Сумма — ровно min
export function planFor(min, polish, tr = t) {
  const items = [], warm = Math.max(2, Math.round(min * 0.2)), pick = polish.slice(0, min >= 30 ? 2 : 1);
  const per = pick.length ? Math.max(2, Math.round(((min - warm) * 0.35))) : 0;
  const first = pick[0] && (+pick[0].currentBpm || +pick[0].targetBpm);
  items.push({ title: tr('desk.plan.warm'), min: warm, tool: 'metro', ...(first ? { bpm: first } : {}) });
  pick.forEach((s) => { const b = +s.currentBpm || +s.targetBpm; items.push({ title: s.title, songId: s.id, min: per, tool: 'metro', ...(b ? { bpm: b } : {}) }); });
  const rest = min - items.reduce((a, x) => a + x.min, 0);
  if (rest >= 1) items.push({ title: tr('desk.plan.free'), min: rest });
  else if (items.length > 1) items[items.length - 1].min += rest; // не хватило — убавить последний пункт
  return { id: PLAN_ID, title: tr('desk.plan.title', { n: min }), items };
}
// Строка «План на 30 минут: разминка, «Песня» до 84, свободная игра»
export function planText(plan, songs, tr = t) {
  const by = new Map(songs.map((s) => [s.id, s]));
  const list = plan.items.map((x) => {
    const s = x.songId && by.get(x.songId);
    if (!s) return String(x.title).toLowerCase();
    return s.targetBpm > (s.currentBpm || 0) ? tr('desk.plan.upTo', { title: s.title, bpm: s.targetBpm }) : tr('desk.plan.song', { title: s.title });
  });
  return tr('desk.plan.sum', { n: plan.items.reduce((a, x) => a + x.min, 0), list: list.join(', ') });
}

// Метка дня: «Сегодня», «Завтра», иначе день недели (дальше недели — с числом)
export function dayLabel(ts, now = Date.now(), lang = getLang()) {
  const d = Math.round((dayStart(ts) - dayStart(now)) / DAY), loc = lang === 'uz' ? 'uz-Latn' : lang;
  if (d <= 0) return t('desk.tab.today');
  if (d === 1) return t('desk.tomorrow');
  const o = d > 6 ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'long' };
  const s = new Date(ts).toLocaleDateString(loc, o);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const hm = (ts) => { const d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
const inText = (ms) => { const m = Math.max(1, Math.round(ms / 60000)); return m < 90 ? t('desk.in.min', { n: m }) : t('desk.in.h', { n: Math.round(m / 60) }); };

// Всё, что нужно экрану; now — для тестов
export function todayModel(app, now = Date.now()) {
  const state = app.store.state, st = state.settings, songs = (app.store.songs() || []).filter((s) => !s.deleted), byId = new Map(songs.map((s) => [s.id, s]));
  const occ = upcoming(liveEvents(state), now, 14).filter((o) => !o.ev.allDay || o.end > now);
  const withSongs = (o) => (o.ev.songs || []).some((id) => byId.has(id));
  const next = occ.find(withSongs) || null;
  const nextSongs = next ? next.ev.songs.map((id) => byId.get(id)).filter(Boolean).map(songInfo) : [];
  const rehearsal = occ.find((o) => o !== next && !o.ev.allDay && o.ev.kind === 'rehearsal' && dayKey(o.start) === dayKey(now) && o.start > now) || null;
  // что подтянуть: песни ближайшего сета, не готовые; нет сета — песни, где темп ещё не дошёл до цели
  const pool = next ? nextSongs.filter((x) => !x.ready) : songs.map(songInfo).filter((x) => x.gap);
  const polish = pool.slice(0, 3);
  const last = new Map();
  (app.store.sessions() || []).forEach((x) => { if (x.songId && (x.start || 0) > (last.get(x.songId) || 0)) last.set(x.songId, x.start || 0); });
  const lastSong = songs.filter((s) => last.has(s.id)).sort((a, b) => last.get(b.id) - last.get(a.id))[0] || null;
  const w = weekData(app.store.sessions() || [], now), goal = weekPlan(st, now).goal;
  return { next, nextSongs, rehearsal, polish, lastSong, week: { total: w.total, goal }, songs, cal: ensureCal(state, t) };
}

const dev = (app) => (app.device.deskToday ||= { min: 30 });
export const minOf = (app) => (MINUTES.includes(+dev(app).min) ? +dev(app).min : 30);

const chip = (cls, txt) => '<span class="dch ' + cls + '">' + esc(txt) + '</span>';
const songRow = (x, act) => {
  const s = x.s, meta = [s.currentBpm ? s.currentBpm + ' bpm' : '', x.chords ? t('desk.chordsOk') : t('desk.chordsNo')].filter(Boolean).join(' · ');
  const tempo = x.gap ? t('desk.tempoTo', { cur: x.cur, goal: x.goal }) : '';
  const right = act ? (!x.chords ? '<button class="dch wn" data-song="' + esc(s.id) + '">' + esc(t('desk.chip.chords')) + '</button>' : '<button class="dch wn" data-play="' + esc(s.id) + '">' + esc(t('desk.chip.play')) + '</button>')
    : x.ready ? chip('ok', t('desk.chip.ready')) : chip('wn', t('desk.chip.polish'));
  return '<div class="drw"><span class="dk4">' + esc((s.key || '·').slice(0, 2)) + '</span><div class="dg1"><b>' + esc(s.title || '') + '</b><div class="dm2 num">' + esc(tempo || meta) + '</div></div>' + right + '</div>';
};

export function deskTodayHTML(app, now = Date.now()) {
  const st = app.store.state.settings, M = todayModel(app, now), min = minOf(app), church = !!st.church;
  const plan = planFor(min, M.polish.map((x) => x.s));
  // ближайшее служение
  let nx;
  if (M.next) {
    const o = M.next, n = M.nextSongs.length, ready = M.nextSongs.filter((x) => x.ready).length, kind = kindOf(M.cal, o.ev.kind), keys = [...new Set(M.nextSongs.map((x) => x.s.key).filter(Boolean))].join(' ');
    const first = M.nextSongs.find((x) => !x.ready) || M.nextSongs[0];
    nx = '<section class="dcd ac"><div class="drow"><div class="dg1"><div class="dlb">' + esc(t(church ? 'desk.next.service' : 'desk.next.event')) + '</div>' +
      '<div class="dbig">' + esc(dayLabel(o.start, now) + ', ' + hm(o.start)) + '</div><div class="dsub">' + esc([o.ev.title || (kind && kind.name) || '', tn('desk.songsN', n), keys].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div class="dcnt"><div class="dnum num">' + ready + '/' + n + '</div><div class="dsub">' + esc(t('desk.ready')) + '</div></div></div>' +
      '<div class="drow dbts"><button class="dbt inv" data-play="' + esc(first.s.id) + '">' + esc(t('desk.btn.rehearse')) + '</button><button class="dbt ghost" data-go="calendar">' + esc(t('desk.btn.setlist')) + '</button><button class="dbt ghost" data-act="stage">' + esc(t('desk.btn.stage')) + '</button></div></section>';
  } else {
    nx = '<section class="dcd"><div class="dlb">' + esc(t(church ? 'desk.next.service' : 'desk.next.event')) + '</div><div class="dbig">' + esc(t('desk.next.none')) + '</div>' +
      '<div class="drow dbts"><button class="dbt sec" data-go="calendar">' + esc(t('desk.next.add')) + '</button></div></section>';
  }
  // выбор времени и начало
  const active = !!app.active;
  const sess = '<section class="dcd"><div class="drow"><div class="dg1"><div class="dlb">' + esc(t('desk.sess.lb')) + '</div><b class="dq">' + esc(t('desk.sess.q')) + '</b></div>' +
    '<div class="dsg" role="group" aria-label="' + esc(t('desk.sess.q')) + '">' + MINUTES.map((m) => '<button data-act="deskmin" data-min="' + m + '" aria-pressed="' + (m === min) + '">' + m + '</button>').join('') + '<span>' + esc(t('desk.min')) + '</span></div></div>' +
    '<div class="dm2 dplan">' + esc(planText(plan, M.songs)) + '</div>' +
    '<div class="drow"><button class="dbt" data-act="deskstart">' + esc(t(active ? 'desk.back' : 'desk.start')) + '<kbd>' + esc(t('palette.space')) + '</kbd></button><button class="dbt sec" data-act="deskplan">' + esc(t('desk.editPlan')) + '</button><button class="dbt sec" data-act="free">' + esc(t('desk.free')) + '</button></div></section>';
  // продолжить
  const L = M.lastSong, conts = [];
  if (L) conts.push('<button class="dcd dcont" data-play="' + esc(L.id) + '"><b>' + esc(L.title) + '</b><div class="dm2 num">' + esc([L.currentBpm ? L.currentBpm + ' bpm' : '', t('desk.cont.song')].filter(Boolean).join(' · ')) + '</div></button>');
  conts.push('<button class="dcd dcont" data-act="deskwork"><b>' + esc(t('desk.work.title')) + '</b><div class="dm2">' + esc(t('desk.cont.workSub')) + '</div></button>');
  if (isOn(st, 'audio')) conts.push('<button class="dcd dcont" data-act="deskmedia"><b>' + esc(t('desk.cont.media')) + '</b><div class="dm2">' + esc(t('desk.cont.mediaSub')) + '</div></button>');
  // правая колонка
  let rh = '';
  if (M.rehearsal) {
    const o = M.rehearsal, kind = kindOf(M.cal, o.ev.kind), n = (o.ev.songs || []).length;
    rh = '<section class="dcd"><div class="dlb">' + esc(t('desk.tab.today') + ', ' + hm(o.start)) + '</div><b class="dq">' + esc(o.ev.title || (kind && kind.name) || '') + '</b><div class="dm2">' + esc([inText(o.start - now), n ? tn('desk.songsN', n) : ''].filter(Boolean).join(' · ')) + '</div></section>';
  }
  const pol = '<section class="dcd dlist"><div class="dlb">' + esc(t('desk.polish')) + '</div>' + (M.polish.length ? M.polish.map((x) => songRow(x, true)).join('') : '<div class="dm2 dnone">' + esc(t('desk.polish.none')) + '</div>') + '</section>';
  const wk = M.week, p = wk.goal ? Math.min(100, Math.round((wk.total / wk.goal) * 100)) : 0;
  const week = '<section class="dcd"><div class="drow"><div class="dg1"><div class="dlb">' + esc(t('week.title')) + '</div><div class="dnum num">' + esc(fmtDur(wk.total)) + (wk.goal ? ' <span class="dm2">' + esc(t('desk.weekOf', { goal: fmtDur(wk.goal) })) + '</span>' : '') + '</div></div>' +
    '<button class="dch ac" data-pp="stats">' + esc(t('desk.tab.stats')) + '</button></div>' + (wk.goal ? '<div class="dpr" role="img" aria-label="' + p + '%"><i style="width:' + p + '%"></i></div>' : '') + '</section>';
  const ready = !!(app.ai && app.ai.ready && app.ai.ready()), nochord = M.polish.find((x) => !x.chords);
  const ai = '<section class="dcd"><div class="drow"><b class="dg1">' + esc(t('desk.assist')) + '</b>' + chip(ready ? 'ok' : 'wn', t(ready ? 'desk.ai.on' : 'desk.ai.off')) + '</div>' +
    '<button class="dinp" data-act="aichat">' + esc(nochord ? t('desk.ai.askChords', { title: nochord.s.title }) : t('desk.ai.ask')) + '</button></section>';
  return '<div class="dday"><div class="dcol dmainc">' + nx + sess + '<div class="dlb">' + esc(t('desk.cont')) + '</div><div class="drow dconts">' + conts.join('') + '</div></div>' +
    '<div class="dcol dsidec">' + rh + pol + week + ai + '</div></div>' +
    '<button class="dclassic" data-act="deskclassic">' + esc(t('desk.classic')) + '</button>';
}

// Действия экрана; true — обработано. render — перерисовать каркас
export function deskAct(app, d, render) {
  const st = app.store.state.settings;
  if (d.act === 'deskmin') { dev(app).min = +d.min; app.saveDevice(); render(); return true; }
  if (d.act === 'deskstart' || d.act === 'deskplan') {
    if (d.act === 'deskstart' && app.active) { app.session.open(); return true; }
    const M = todayModel(app), plan = planFor(minOf(app), M.polish.map((x) => x.s));
    const r = saveRoutine(st, plan);
    if (!r) { app.startSession('free', null, null, { routine: null }); return true; }
    app.store.settingsChanged();
    if (d.act === 'deskstart') app.startSession('free', null, null, { routine: routineById(st, PLAN_ID) ? PLAN_ID : null });
    else import('./routine.js').then((m) => m.routineEditor(app, PLAN_ID, render));
    return true;
  }
  if (d.act === 'deskmedia') { app.showTool('audio'); return true; }
  if (d.act === 'deskwork') { import('./deskwork.js').then((m) => m.openStation(app)); return true; }
  return false;
}
