// Занятие новичка внутри экрана сессии (макеты «Н2 · Урок» и «Н9 · Занятие», слово автора 28.11.2026).
// Сессия, её часы, учёт бездействия и завершение — прежние (session.js, activity.js); здесь только содержимое экрана:
// этап «урок» (шаги из учебника, схема аккорда) и этап «занятие» (метроном, смена аккордов, тюнер, запись, ноты).
// План занятия — app.active.beg: время (10/20/30/45 мин с главной), урок, этап, шаг, счёт смен. Время вышло — тихий знак,
// занятие само не заканчивается (запись и звук не обрываем).
import { t, getLang } from '../../i18n/index.js';
import { esc, toast } from '../../ui/index.js';
import { fmtClock } from '../format.js';
import { elapsed, saveActive } from '../session.js';
import { isOn } from '../settings.js';
import { openToolView } from './tools.js';
import { TEMPLATES, notesOf } from '../../music/guitarchords.js';
import { loadBook, markLessonDone, begLog, lessonInst, lessonSteps, lessonChords, lessonBpm, drillPair, chordSVG, begLeft, begMin, pathOrder, nextLessonOf, bookDone } from '../beginner.js';

export const REPS = 8; // смен подряд в одном подходе
const shapeOf = (name) => (TEMPLATES.find((x) => x.name === name && x.common) || TEMPLATES.find((x) => x.name === name) || {}).frets || null;

const IC = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
};

// host — контейнер внутри .sin сессии; возвращает { tick, destroy }
export function mountBeg(app, host) {
  const a = app.active, b = a.beg, st = () => app.store.state.settings, M = () => app.audio.metro;
  let BK = null, cur = 0, gone = false;
  const save = () => saveActive(a);

  // данные урока и аккордов; книга грузится по требованию (один раз), до этого рисуется заготовка
  const lessonOf = (id) => {
    if (!BK || !id) return null;
    const def = BK.lessonById(id); if (!def) return null;
    const inst = lessonInst(id, st().profile), chords = lessonChords(def, inst);
    return { id, def, inst, chords, steps: lessonSteps(BK.S, id, inst), title: BK.S['ls.' + id] || id, easy: BK.S['lx.' + id + '.easy'] || '', bpm: lessonBpm(def) };
  };
  // аккорды, которые уже встречались: пройденные уроки (по времени) и текущий
  const pool = () => {
    const log = begLog(app), ids = Object.keys(log).sort((x, y) => log[x] - log[y]);
    if (b.lesson && !ids.includes(b.lesson)) ids.push(b.lesson);
    const out = [];
    ids.forEach((id) => { const L = lessonOf(id); if (L) L.chords.forEach((c) => { if (!out.includes(c)) out.push(c); }); });
    return out;
  };
  const toolBtn = (id, key) => (isOn(st(), id) ? '<button class="bgb sec grow" data-bg="tool" data-id="' + id + '">' + esc(t(key)) + '</button>' : '');

  /* ---------- «Н2 · Урок» ---------- */
  function lessonHTML() {
    const L = lessonOf(b.lesson);
    if (!L) return '<div class="bghd"><button class="ic sm plain" data-s="hide" aria-label="' + esc(t('ses.hide')) + '">' + IC.back + '</button><div class="bgttl"><h1>' + esc(t('beg.nextLoading')) + '</h1></div>' + clk() + '</div>';
    const steps = L.steps.length ? L.steps : [t('beg.stepRead')], n = Math.min(b.step, steps.length - 1), ch = L.chords[Math.min(cur, L.chords.length - 1)], fr = ch ? shapeOf(ch) : null;
    const scheme = fr
      ? '<section class="bgcard c"><div class="bgey l">' + esc(t('beg.scheme')) + ' · ' + esc(ch) + '</div><div class="bgdia">' + chordSVG(fr) + '</div>' +
        (L.chords.length > 1 ? '<div class="bgchips" role="group" aria-label="' + esc(t('beg.scheme')) + '">' + L.chords.map((c, i) => '<button data-bg="chord" data-i="' + i + '" aria-pressed="' + (i === cur) + '">' + esc(c) + '</button>').join('') + '</div>' : '') +
        (L.easy ? '<p class="bgmut">' + esc(L.easy) + '</p>' : '') + '</section>'
      : L.easy ? '<section class="bgcard"><div class="bgey l">' + esc(t('beg.brief')) + '</div><p class="bgmut" style="margin:6px 0 0">' + esc(L.easy) + '</p></section>' : '';
    return '<div class="bghd"><button class="ic sm plain" data-s="hide" aria-label="' + esc(t('ses.hide')) + '">' + IC.back + '</button>' +
      '<div class="bgttl"><h1>' + esc(L.title) + '</h1><div class="bgsub num">' + esc(t('beg.stepOf', { n: n + 1, m: steps.length })) + '</div></div>' + clk() + '</div>' +
      '<div class="bgprog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(((n + 1) / steps.length) * 100) + '"><i style="width:' + ((n + 1) / steps.length) * 100 + '%"></i></div>' +
      scheme +
      '<section class="bgcard"><div class="bgr"><span class="bgstep n">' + (n + 1) + '</span><div class="grow"><div class="bgb2">' + esc(steps[n]) + '</div></div></div></section>' +
      '<div class="grow"></div><div class="bgr">' + (fr ? '<button class="bgb sec" data-bg="listen">' + esc(t('beg.listen')) + '</button>' : '') +
      '<button class="bgb sec" data-bg="metro" aria-pressed="' + !!M().running + '">' + esc(t('beg.metro')) + '</button><button class="bgb grow" data-bg="ok">' + esc(t('beg.ok')) + '</button></div>';
  }

  /* ---------- «Н9 · Занятие» ---------- */
  function playHTML() {
    const ch = pool(), pr = drillPair(ch, b.rounds), min = b.min;
    const sub = pr ? t('beg.subChords', { a: pr[0], b: pr[1], n: min }) : t('beg.subMin', { n: min });
    const drill = pr
      ? '<div class="grow"><div class="bgb2">' + esc(t('beg.change', { a: pr[0], b: pr[1] })) + '</div><div class="bgmut">' + esc(t('beg.changeSub', { n: REPS })) + '</div></div>' +
        '<button class="bgchip ok num" data-bg="rep" aria-label="' + esc(t('beg.repAria')) + '">' + esc(t('beg.reps', { k: b.reps, n: REPS })) + '</button>'
      : '<div class="grow"><div class="bgb2">' + esc(t('beg.free')) + '</div><div class="bgmut">' + esc(t('beg.freeSub')) + '</div></div>';
    return '<div class="bghd"><div class="bgttl l"><h1>' + esc(t('beg.session')) + '</h1><div class="bgsub num">' + esc(sub) + '</div></div>' + clk('ac') + '</div>' +
      '<button class="vh" data-s="hide" aria-label="' + esc(t('ses.hide')) + '"></button>' +
      '<section class="bgcard c"><div class="bgey l">' + esc(t('beg.metro')) + '</div><div class="bgbpm num" data-bgbpm>' + Math.round(M().cfg.bpm) + '</div>' +
      '<div class="bgr c"><button class="bgb sec" data-bg="bpm" data-d="-5" aria-label="' + esc(t('beg.slower')) + '">− 5</button>' +
      '<button class="bgb" data-bg="mtog" data-bgm style="min-width:100px">' + esc(t(M().running ? 'beg.stop' : 'beg.go')) + '</button>' +
      '<button class="bgb sec" data-bg="bpm" data-d="5" aria-label="' + esc(t('beg.faster')) + '">+ 5</button></div></section>' +
      '<section class="bgcard"><div class="bgr">' + drill + '</div></section>' +
      '<div class="bgr">' + toolBtn('tuner', 'beg.tTuner') + toolBtn('voice', 'beg.tRec') + toolBtn('notes', 'beg.tNotes') + '</div>' +
      '<div class="grow"></div><button class="bgb sec wide" data-s="finish">' + esc(t('beg.end')) + '</button>';
  }

  // оставшееся время — в углу; идёт от плана (10/20/30/45), а не от целого дня
  function clk(extra = '') {
    const left = begLeft(a, elapsed(a));
    return '<span class="bgchip num ' + extra + (left <= 0 ? ' over' : '') + '" data-bgclk role="timer" aria-label="' + esc(t('beg.left')) + '">' + fmtClock(left) + '</span>';
  }

  function paint() {
    if (gone) return;
    host.innerHTML = '<div class="bgs">' + (b.stage === 'lesson' && b.lesson ? lessonHTML() : playHTML()) + '</div>';
  }

  /* ---------- действия ---------- */
  const setBpm = (v) => { const m = M(); m.setBpm(v); m.save(); };
  function listen() {
    const L = lessonOf(b.lesson), ch = L && L.chords[Math.min(cur, L.chords.length - 1)], fr = ch && shapeOf(ch);
    if (!fr) return;
    const A = app.audio;
    if (A.unlock && A.unlock()) A.playChord(notesOf(fr).filter((m) => m != null), { dur: 1.8 });
  }
  function toggleMetro(L) {
    const m = M();
    if (!m.running && L && L.bpm) setBpm(L.bpm);
    m.toggle();
    a.last = Date.now(); save();
  }
  function lessonOk() {
    const L = lessonOf(b.lesson), steps = L && L.steps.length ? L.steps : [''];
    b.step++;
    if (b.step >= steps.length) { // урок пройден: в учебнике отмечен, занятие переходит к смене аккордов
      markLessonDone(app, b.lesson); b.done.push(b.lesson);
      b.stage = 'play'; b.step = 0; b.rounds = 0; b.reps = 0;
      toast(t('beg.lessonDone'));
    }
    save(); paint();
  }
  function rep() {
    b.reps++;
    if (b.reps >= REPS) { b.reps = 0; b.rounds++; toast(t('beg.changeDone')); try { navigator.vibrate && navigator.vibrate(40); } catch { /* нет вибрации */ } }
    save(); paint();
  }
  const onClick = (e) => {
    const x = e.target.closest('[data-bg]');
    if (!x) return;
    const k = x.dataset.bg;
    if (k === 'listen') listen();
    else if (k === 'chord') { cur = +x.dataset.i; paint(); }
    else if (k === 'metro') { toggleMetro(lessonOf(b.lesson)); x.setAttribute('aria-pressed', !!M().running); }
    else if (k === 'ok') lessonOk();
    else if (k === 'mtog') { M().toggle(); a.last = Date.now(); save(); paint(); }
    else if (k === 'bpm') { setBpm(M().cfg.bpm + (+x.dataset.d)); const el = host.querySelector('[data-bgbpm]'); if (el) el.textContent = Math.round(M().cfg.bpm); }
    else if (k === 'rep') rep();
    else if (k === 'tool') openToolView(app, x.dataset.id, () => { a.last = Date.now(); save(); paint(); });
  };
  host.addEventListener('click', onClick);

  // книга грузится по требованию; не вышло — занятие без урока (метроном и инструменты работают)
  loadBook(getLang()).then((bk) => {
    if (gone) return;
    BK = bk;
    if (!BK && b.stage === 'lesson') { b.stage = 'play'; save(); }
    paint();
  });
  paint();

  // раз в полсекунды (tickNow сессии): остаток времени; «время вышло» — один раз тихо
  function tick() {
    const el = host.querySelector('[data-bgclk]');
    if (!el) return;
    const left = begLeft(a, elapsed(a)), s = fmtClock(left);
    if (el.textContent !== s) el.textContent = s;
    el.classList.toggle('over', left <= 0);
    if (left <= 0 && !b.over && !a.pausedAt) {
      b.over = true; save();
      try { navigator.vibrate && navigator.vibrate(60); } catch { /* нет вибрации */ }
      toast(t('beg.timeUp'));
    }
    const m = host.querySelector('[data-bgm]');
    if (m) { const w = t(M().running ? 'beg.stop' : 'beg.go'); if (m.textContent !== w) m.textContent = w; }
  }
  return { tick, destroy() { gone = true; host.removeEventListener('click', onClick); } };
}

// Начать занятие новичка с главной: «Играть» — без урока (свободная игра), «Начать урок» — со следующим уроком учебника.
// Время (10/20/30/45) — settings.begMin. Занятие уже идёт — просто открыть его.
export function startBeg(app, withLesson) {
  const st = app.store.state.settings, min = begMin(st);
  if (app.active) { app.startSession('free'); return; }
  const go = (lesson) => app.startSession('free', null, null, { routine: null, beg: { min, lesson } });
  if (!withLesson) { go(null); return; }
  loadBook(getLang()).then((bk) => { const nx = bk ? nextLessonOf(bk.PATHS, pathOrder(st.profile), bookDone(app)) : null; go(nx ? nx.id : null); });
}
