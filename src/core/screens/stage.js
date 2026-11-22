// Сет-лист и сцена (логика — src/core/stage.js).
// setlistSheet — настройка сет-листа: порядок песен (↑ ↓) и у каждой песни свои настройки: темп и клик, отсчёт такта
// перед минусовкой, пэд в тональности, минусовка, сдвиг тональности, текст.
// openStage — сцена: весь экран, крупный текст с аккордами, внизу три большие кнопки: ← песня, ▶ / ■, песня →.
// ▶ включает всё, что задано у песни: клик, пэд, минусовку (после отсчёта); переход к следующей — клик и минусовка
// останавливаются, пэд плавно меняет тональность и звучит дальше (связка между песнями). Устойчивость: каждый звук
// включается отдельно и ошибка одного не останавливает остальные; место на сцене запоминается — после сбоя или
// перезапуска приложение предлагает вернуться; экран не гаснет; выход — с подтверждением.
import '../../ui/stage.css';
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, sw, toast, confirm, icons } from '../../ui/index.js';
import { lyricsHTML } from '../../music/lyrics.js';
import { keyLabel, shiftKey, parseNote } from '../../music/transpose.js';
import { itemOf, setItem, moveSong, setSongs, tracksOf, barSec, resumeOk, chordsAbove, TR_MAX, capoClamp, WORK, workEvent, toggleWorkSong, tapTempo } from '../stage.js';
import { getContext } from '../../audio/context.js';
import { createShowPads } from '../../audio/showpads.js';
import * as SM from '../../music/show.js';
import { DIRS, SENS } from '../../audio/drone.js';
import { saveEvent, liveEvents } from '../calendar.js';
import { setlistsOf } from '../metrosets.js';
import { metroForSession } from '../session.js';
import { logErr } from '../log.js';
import { swipe, pinch } from '../../ui/gestures.js';
import { onHold, holdMenu } from '../../ui/hold.js';
import { outBtnHTML, bindOutput, outRefresh } from './outputsheet.js';
const fmtDur = (sec) => Math.floor(sec / 60) + ':' + String(Math.round(sec % 60)).padStart(2, '0');

const RESUME = 'melete.stage';
const I = {
  moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" stroke="none"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M15.5 5.5 8.5 12l7 6.5"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M8.5 5.5 15.5 12l-7 6.5"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 14.5l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9.5l6 6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  pads: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
};
const songKeyOf = (s) => (s.key ? { pc: (parseNote(String(s.key)) || { pc: 0 }).pc, minor: /m$/.test(s.key), sharp: null } : null);
const evOf = (app, id) => (id === WORK ? workEvent(app.store.state.settings) : liveEvents(app.store.state).find((e) => e.id === id) || null);
// Сохранить пункт: событие — в календарь, рабочая сцена — в настройки
const persist = (app, ev) => { if (ev.id === WORK) app.store.save(); else saveEvent(app.store, ev); };
const audioFiles = (app) => (app.files ? app.files.list('audio').filter((r) => !r.stem) : []); // без дорожек разделения
const safe = (what, fn) => { try { return fn(); } catch (e) { logErr('stage', e); toast(t('stage.err', { what: t('stage.' + what) })); return null; } };

/* ---------- настройка сет-листа ---------- */

function itemSub(app, it) {
  const tr = it.track ? (audioFiles(app).find((r) => r.id === it.track) || {}).name : '';
  return [it.bpm ? it.bpm + ' bpm' + (it.click ? '' : ' · ' + t('stage.noClick')) : '', it.key ? keyLabel(it.key) : '', it.pad ? t('stage.pad') : '', tr ? '♪ ' + tr : ''].filter(Boolean).join(' · ');
}

export function setlistSheet(app, evId, onChange = () => {}) {
  const body = () => {
    const ev = evOf(app, evId);
    if (!ev) return snav(t('stage.setlist'));
    const songs = setSongs(ev, app.store.songById), files = audioFiles(app);
    return snav(t('stage.setlist')) + '<p class="ftr" style="margin-top:0">' + esc(t('stage.setHint')) + '</p>' +
      (songs.length ? '<div class="group">' + songs.map((s, i) => '<div class="cell sgrow"><span class="num sgn">' + (i + 1) + '</span><button class="grow sgitem" data-sgi="' + s.id + '"><b>' + esc(s.title) + '</b><span class="bksub">' +
        esc(itemSub(app, itemOf(ev, s, files)) || t('stage.nothing')) + '</span></button>' +
        '<button class="ic sm plain" data-sgmv="' + i + '" data-d="-1"' + (i ? '' : ' disabled') + ' aria-label="' + esc(t('stage.up')) + '">' + I.up + '</button>' +
        '<button class="ic sm plain" data-sgmv="' + i + '" data-d="1"' + (i < songs.length - 1 ? '' : ' disabled') + ' aria-label="' + esc(t('stage.down')) + '">' + I.down + '</button></div>').join('') + '</div>' +
        '<div class="group" style="margin-top:16px"><button class="cell act center b" data-sgopen>' + esc(t('stage.go')) + '</button></div>'
        : '<p class="ftr">' + esc(t('stage.empty')) + '</p>');
  };
  sheet(body, (el, sh) => el.addEventListener('click', (e) => {
    const ev = evOf(app, evId);
    if (!ev) return;
    let b;
    if ((b = e.target.closest('[data-sgmv]'))) { moveSong(ev, +b.dataset.sgmv, +b.dataset.d); persist(app, ev); sh.update(); onChange(); }
    else if ((b = e.target.closest('[data-sgi]'))) itemSheet(app, evId, b.dataset.sgi, () => { sh.update(); onChange(); });
    else if (e.target.closest('[data-sgopen]')) { sh.close(); openStage(app, evId, 0); }
  }));
}

// Настройки одной песни в сет-листе
function itemSheet(app, evId, songId, back) {
  const body = () => {
    const ev = evOf(app, evId), s = app.store.songById(songId);
    if (!ev || !s) return snav('');
    const it = itemOf(ev, s, audioFiles(app)), tracks = tracksOf(audioFiles(app), s.id);
    const step = (k, v, lab) => '<span class="stepper"><button type="button" data-sgst="' + k + '" data-d="-1" aria-label="' + esc(lab + ' −') + '">−</button><b class="num sgv">' + v + '</b>' +
      '<button type="button" data-sgst="' + k + '" data-d="1" aria-label="' + esc(lab + ' +') + '">+</button></span>';
    const row = (lab, right, sub = '') => '<div class="cell"><span class="grow">' + esc(lab) + (sub ? '<span class="bksub">' + esc(sub) + '</span>' : '') + '</span>' + right + '</div>';
    return snav(s.title) +
      '<div class="hdr">' + esc(t('stage.tempo')) + '</div><div class="group">' +
      row(t('stage.bpm'), step('bpm', it.bpm || '—', t('stage.bpm'))) +
      row(t('stage.click'), sw('sg:click', it.click, t('stage.click'))) +
      row(t('stage.count'), sw('sg:count', it.count, t('stage.count')), t('stage.countSub')) + '</div>' +
      '<div class="hdr">' + esc(t('stage.keyHdr')) + '</div><div class="group">' +
      row(t('stage.tr'), step('tr', (it.tr > 0 ? '+' : '') + it.tr, t('stage.tr')), it.key ? keyLabel(it.key) : t('stage.noKey')) +
      row(t('stage.capo'), step('capo', it.capo || '0', t('stage.capo')), it.capo && it.key ? t('stage.capoSub', { k: keyLabel(shiftKey(it.key, -it.capo)) }) : t('stage.capoHint')) +
      (it.key ? row(t('stage.pad'), sw('sg:pad', it.pad, t('stage.pad')), t('stage.padSub', { key: keyLabel(it.key) })) : '') + '</div>' +
      '<div class="hdr">' + esc(t('stage.track')) + '</div><div class="group">' +
      (tracks.length ? [['', t('stage.noTrack')], ...tracks.map((r) => [r.id, r.name])].map(([id, name]) => '<button class="cell" data-sgtr="' + esc(id) + '"><span class="grow">' + esc(name) + '</span>' +
        (it.track === id ? icons.check : '') + '</button>').join('') : '<div class="cell l2">' + esc(t('stage.noTracks')) + '</div>') + '</div>' +
      '<div class="hdr">' + esc(t('stage.noteHdr')) + '</div><div class="group"><label class="cell"><input class="inp left" data-sgnote maxlength="300" placeholder="' + esc(t('stage.notePh')) + '" aria-label="' + esc(t('stage.noteHdr')) + '" value="' + esc(it.note) + '"></label></div>' +
      '<div class="hdr">' + esc(t('stage.screen')) + '</div><div class="group">' + row(t('stage.text'), sw('sg:text', it.text, t('stage.text')), s.notes ? '' : t('stage.noText')) +
      row(t('stage.scroll'), sw('sg:scroll', it.scroll, t('stage.scroll')), it.track ? t('stage.scrollTrack') : t('stage.scrollDur')) +
      (it.track ? '' : row(t('stage.dur'), step('dur', fmtDur(it.dur), t('stage.dur')), t('stage.durSub'))) + '</div>';
  };
  const save = (patch) => { const ev = evOf(app, evId); if (!ev) return; setItem(ev, songId, patch); persist(app, ev); };
  sheet(body, (el, sh) => {
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-sgnote]')) { save({ note: e.target.value.trim() || null }); return; }
      const k = e.target.dataset.sw;
      if (k && k.startsWith('sg:')) { save({ [k.slice(3)]: e.target.checked }); sh.update(); }
    });
    el.addEventListener('click', (e) => {
      const ev = evOf(app, evId), s = app.store.songById(songId);
      if (!ev || !s) return;
      let b;
      const it = itemOf(ev, s, audioFiles(app));
      if ((b = e.target.closest('[data-sgst]'))) {
        const d = +b.dataset.d;
        if (b.dataset.sgst === 'bpm') save({ bpm: (it.bpm || 90) + d * (e.shiftKey ? 10 : 1) });
        else if (b.dataset.sgst === 'capo') save({ capo: capoClamp(it.capo + d) });
        else if (b.dataset.sgst === 'dur') save({ dur: Math.max(0, it.dur + d * (e.shiftKey ? 60 : 15)) });
        else save({ tr: Math.max(-TR_MAX, Math.min(TR_MAX, it.tr + d)) });
        sh.update();
      } else if ((b = e.target.closest('[data-sgtr]'))) { save({ track: b.dataset.sgtr }); sh.update(); }
    });
  }, { onClose: back });
}

/* ---------- сцена ---------- */

let cur = null; // открытая сцена

export function openStage(app, evId, i = 0) {
  if (cur) cur.close(true);
  const ev0 = evOf(app, evId);
  if (!ev0 || (evId !== WORK && !setSongs(ev0, app.store.songById).length)) { toast(t('stage.empty')); return; }
  const audio = app.audio, drone0 = { pc: app.device.drone.pc, chord: app.device.drone.chord }, metro0 = audio.metro.cfg;
  const S = { i, playing: false, padOn: false, el: null, timers: [], track: null, url: '', offBeat: null, fs: +(sessionStorage.getItem('melete.stage.fs') || 0) || 26,
    night: sessionStorage.getItem('melete.stage.night') === '1', scrollRaf: 0, scrollPaused: false, userScrollAt: 0, startedAt: 0, lastTop: -1 };
  // барабанные пэды с залом и эхом, темп по касанию, блокировка (слово автора 22.11.2026: один экран, управляющий всем)
  const ss = (k, d) => { try { const v = sessionStorage.getItem('melete.stage.' + k); return v == null ? d : v; } catch { return d; } };
  const sset = (k, v) => { try { sessionStorage.setItem('melete.stage.' + k, v); } catch { /* */ } };
  Object.assign(S, { eng: null, held: new Map(), freeBpm: +ss('freeBpm', 0) || 0, freeKey: null, view: ss('view', 'text'), showPads: ss('pads', '1') === '1', space: +ss('space', 0.6), echo: +ss('echo', 0.4), taps: [], locked: false, hushed: false, fade: 0 });
  const pedalMode = () => (app.store.state.settings.stagePedal === 'song' ? 'song' : 'page'); // педаль листает страницу или песню
  const list = () => { const ev = evOf(app, evId); return ev ? setSongs(ev, app.store.songById) : []; };
  const item = () => { const ev = evOf(app, evId), s = list()[S.i]; return ev && s ? { s, it: itemOf(ev, s, audioFiles(app)) } : null; };
  const remember = () => { try { localStorage.setItem(RESUME, JSON.stringify({ ev: evId, i: S.i, at: Date.now() })); } catch { /* приватный режим */ } };

  const clearTimers = () => { S.timers.forEach(clearTimeout); S.timers = []; };
  const stopTrack = () => { if (S.track) { try { S.track.pause(); } catch { /* */ } S.track = null; } if (S.url) { URL.revokeObjectURL(S.url); S.url = ''; } };
  const stopClick = () => safe('click', () => { if (audio.metro.running) audio.metro.stop(); });
  const stopPad = (fade) => safe('pad', () => { audio.drone.stop(fade); S.padOn = false; });
  // темп: идёт метроном — его; иначе темп пункта сет-листа (метроном выключен — его настройка к песне не относится)
  const curBpm = () => (audio.metro.running && audio.metro.cfg && audio.metro.cfg.bpm) || (item() && item().it.bpm) || S.freeBpm || (audio.metro.cfg && audio.metro.cfg.bpm) || 90;
  // «Звуки» (раздел пульта, слово автора 22.11.2026): банки и пады те же, что в инструменте «Звуки»; ударные — готовый банк.
  // Движок создаётся при первом касании, узлы — один раз (ошибка не ломает остальное)
  const sd = () => { const o = app.device.show || (app.device.show = {}); if (!o.banks || !o.drumsSeeded) Object.assign(o, SM.normalizeShow(o)); return o; };
  const bank = () => SM.bankOf(sd(), S.bank || undefined);
  const ensureEng = () => {
    if (S.eng) return S.eng;
    if (!audio.unlock()) { toast(t('stage.noAudio')); return null; }
    return safe('pads', () => {
      const c = getContext(audio.mixer.state.mode), out = audio.mixer.bus('drone');
      if (!c || !out) return null;
      S.eng = createShowPads({ dest: out, getBlob: (id) => { const f = app.files && app.files.get(id); return f ? f.blob : null; }, drumFx: () => ({ bpm: curBpm, space: S.space, echo: S.echo }) });
      return S.eng;
    });
  };
  const hitPad = (p, pid) => {
    const en = ensureEng();
    if (!en) return;
    if (S.hushed) { en.unhush(); S.hushed = false; }
    const r = en.press(p);
    if (r === 'error') toast(t('stage.padErr'));
    if (p.mode === 'hold' && (r === 'play' || r === 'wait')) S.held.set(pid, p);
  };
  // Темп на ходу: метроном (если идёт), пункт сет-листа (без песни — общий темп сцены), эхо ударных — под тот же темп
  const clampB = (v) => Math.max(20, Math.min(300, Math.round(v)));
  const applyBpm = (v, { save = true, paint = true } = {}) => {
    const bpm = clampB(v), x = item();
    safe('click', () => { if (audio.metro.running) audio.metro.setBpm(bpm); });
    if (x) { if (save) { const ev = evOf(app, evId); if (ev) { setItem(ev, x.s.id, { bpm }); persist(app, ev); } } }
    else { S.freeBpm = bpm; if (save) sset('freeBpm', bpm); }
    if (S.eng) S.eng.setBpm(bpm);
    if (paint) render();
    return bpm;
  };
  const setBpm = (v) => applyBpm(v);
  const tap = () => { const r = tapTempo(S.taps, performance.now()); S.taps = r.times; if (r.bpm) setBpm(r.bpm); else render(); };
  // «Стоп всё»: удержание кнопки ■ — всё затухает за ~1,2 с (минусовка, пэд, эхо), клик останавливается сразу
  const panic = () => {
    clearTimers();
    if (S.scrollRaf) { cancelAnimationFrame(S.scrollRaf); S.scrollRaf = 0; }
    S.playing = false;
    stopClick();
    safe('pad', () => { audio.drone.stop(1.5); S.padOn = false; });
    if (S.eng) { S.eng.stopAll(0.2); S.eng.hush(1.2); S.hushed = true; }
    const tr = S.track;
    if (tr) {
      const v0 = tr.volume; let k = 0;
      clearInterval(S.fade);
      S.fade = setInterval(() => { k++; try { tr.volume = Math.max(0, v0 * (1 - k / 12)); } catch { /* */ } if (k >= 12) { clearInterval(S.fade); S.fade = 0; if (S.track === tr) stopTrack(); } }, 100);
    }
    toast(t('stage.panicDone'));
    render();
  };
  // пэд в тональности песни: если уже звучит — плавный переход
  const startPad = (it) => safe('pad', () => {
    if (!it.key) return;
    const d = app.device.drone;
    d.pc = it.key.pc; d.chord = 'fifth';
    if (S.padOn) audio.drone.swap(); else audio.drone.start();
    S.padOn = true;
  });
  const startClick = (it, s) => safe('click', () => {
    if (!it.bpm) return;
    audio.metro.cfg = { ...(s ? metroForSession(s, app.store.state.settings.metro) : { ...app.store.state.settings.metro }), bpm: it.bpm, trainer: { on: false }, gap: { on: false } };
    if (!audio.metro.running) audio.metro.start();
  });
  // Метроном одним касанием по цифрам темпа: вкл/выкл; идёт — не трогаем остальное
  const toggleMetro = () => {
    if (!audio.unlock()) { toast(t('stage.noAudio')); return; }
    if (audio.metro.running) stopClick(); else { const x = item(); startClick({ bpm: curBpm() }, x ? x.s : null); }
    render();
  };
  // Пэд-подложка по тональности: те же жесты, что в инструменте «Пэды / дрон» (касание — вкл/выкл, ведение по клавише — созвучие)
  const NOTES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'], CSUF = { maj: '', min: 'm', dim: '°', sus42: 'sus', hmin: '♭' };
  const droneOn = () => !!audio.drone.on;
  const keyPc = () => { const x = item(); return droneOn() ? app.device.drone.pc : x && x.it.key ? x.it.key.pc : S.freeKey != null ? S.freeKey : 0; };
  const gestDir = (dx, dy) => { const d = app.device.drone; return d.gest === false || Math.hypot(dx, dy) < (SENS[d.sens] || SENS.mid) ? null : Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'up' : 'down') : dx < 0 ? 'left' : 'right'; };
  const keyDown = (e, b) => {
    const pc = +b.dataset.sgk, d = app.device.drone, was = droneOn() && d.pc === pc;
    try { b.setPointerCapture(e.pointerId); } catch { /* */ }
    S.kd = { pc, x: e.clientX, y: e.clientY, was, moved: false, ch: was ? audio.drone.chord : d.chord, id: e.pointerId };
    if (was || !audio.unlock()) return;
    d.pc = pc; S.freeKey = pc;
    safe('pad', () => { if (droneOn()) audio.drone.swap(); else audio.drone.start(); S.padOn = true; });
    markKeys();
  };
  const keyMove = (e) => {
    const g = S.kd; if (!g || e.pointerId !== g.id) return;
    const dir = gestDir(e.clientX - g.x, e.clientY - g.y); if (!dir) return;
    g.moved = true;
    const ch = DIRS[dir], d = app.device.drone;
    if (ch === g.ch && droneOn() && d.pc === g.pc) return;
    if (!audio.unlock()) return;
    g.ch = ch; d.pc = g.pc; S.freeKey = g.pc;
    safe('pad', () => { if (droneOn()) audio.drone.swap({ chord: ch }); else audio.drone.start({ chord: ch }); S.padOn = true; });
    markKeys();
  };
  const keyUp = (e) => {
    const g = S.kd; if (!g || e.pointerId !== g.id) return;
    S.kd = null;
    if (g.was && !g.moved) { stopPad(); }
    S.padOn = droneOn();
    render();
  };
  const markKeys = () => {
    const on = droneOn(), d = app.device.drone;
    S.el && S.el.querySelectorAll('[data-sgk]').forEach((k) => {
      const pc = +k.dataset.sgk, a = on && d.pc === pc;
      k.classList.toggle('on', a); k.setAttribute('aria-pressed', a);
      k.textContent = NOTES[pc] + (a ? CSUF[audio.drone.chord] || '' : '');
    });
  };
  const startTrack = (it) => safe('track', () => {
    const r = app.files && app.files.get(it.track);
    if (!r || !r.blob) return;
    S.url = URL.createObjectURL(r.blob);
    const el = new Audio(S.url);
    const v = audio.mixer && audio.mixer.elementVolume ? audio.mixer.elementVolume('media') : 1;
    el.volume = Number.isFinite(v) ? v : 1;
    el.onended = () => { if (S.track === el) { S.playing = false; stopClick(); render(); } };
    el.onerror = () => { logErr('stage', 'track ' + (r.name || '')); toast(t('stage.err', { what: t('stage.track') })); };
    S.track = el;
    const p = el.play();
    if (p && p.catch) p.catch((e) => logErr('stage', e));
  });

  // Автопрокрутка текста: позиция = доля прошедшего времени (минусовка — её currentTime, иначе — часы от старта и длительность);
  // касание текста — пауза; своя прокрутка пальцем — автопрокрутка догоняет через 3 с
  const scrollTick = () => {
    S.scrollRaf = 0;
    if (!S.playing) return;
    const x = item(), tx = S.el && S.el.querySelector('.sgtext'), bar = S.el && S.el.querySelector('.sgprog i');
    if (!x || !tx) return;
    const { it } = x, dur = S.track && S.track.duration > 0 ? S.track.duration : it.dur, pos = S.track ? S.track.currentTime : (performance.now() - S.startedAt) / 1000;
    const sk = S.el.querySelector('.sgseek i'), tm = S.el.querySelector('.sgtime');
    if (sk && S.track && S.track.duration > 0) { sk.style.width = Math.round((S.track.currentTime / S.track.duration) * 1000) / 10 + '%'; if (tm) tm.textContent = fmtDur(S.track.currentTime) + ' / ' + fmtDur(S.track.duration); }
    if (it.scroll && dur > 0) {
      const fr = Math.max(0, Math.min(1, pos / dur)), max = tx.scrollHeight - tx.clientHeight;
      if (bar) bar.style.height = Math.round(fr * 100) + '%';
      if (!S.scrollPaused && max > 0 && performance.now() - S.userScrollAt > 3000) { const top = Math.round(fr * max); if (Math.abs(tx.scrollTop - top) > 1) { S.lastTop = top; tx.scrollTop = top; } }
    }
    S.scrollRaf = requestAnimationFrame(scrollTick);
  };
  const scrollStart = () => { S.startedAt = performance.now(); S.scrollPaused = false; if (!S.scrollRaf) S.scrollRaf = requestAnimationFrame(scrollTick); };
  const onUserScroll = (e) => { const tx = e.target; if (!tx.classList || !tx.classList.contains('sgtext')) return; if (Math.abs(tx.scrollTop - S.lastTop) > 1) S.userScrollAt = performance.now(); };

  const stop = ({ keepPad = false } = {}) => {
    clearTimers();
    if (S.fade) { clearInterval(S.fade); S.fade = 0; }
    if (S.scrollRaf) { cancelAnimationFrame(S.scrollRaf); S.scrollRaf = 0; }
    stopTrack();
    stopClick();
    if (!keepPad) stopPad();
    S.playing = false;
  };
  const play = () => {
    const x = item();
    if (!x || !audio.unlock()) { toast(t('stage.noAudio')); return; }
    const { s, it } = x;
    S.playing = true;
    if (it.pad) startPad(it); else if (S.padOn) stopPad();
    const wait = it.track && it.count && it.bpm ? barSec(it.bpm, (s.metro && s.metro.num) || 4) : 0;
    if (it.click || wait) startClick(it, s);
    if (it.track) {
      if (wait) S.timers.push(setTimeout(() => { if (!S.playing) return; startTrack(it); if (!it.click) stopClick(); }, wait * 1000));
      else startTrack(it);
    }
    scrollStart();
    render();
  };
  // Педаль или клавиатура: страница вниз/вверх (в конце страницы — следующая песня) или сразу песня; пробел — старт/стоп
  const page = (d) => {
    const tx = S.el && S.el.querySelector('.sgtext');
    if (!tx || pedalMode() === 'song') { go(d); return; }
    const max = tx.scrollHeight - tx.clientHeight;
    if (d > 0 && tx.scrollTop >= max - 2) { go(1); return; }
    if (d < 0 && tx.scrollTop <= 2) { go(-1); return; }
    S.userScrollAt = performance.now();
    tx.scrollBy({ top: d * tx.clientHeight * 0.85, behavior: 'smooth' });
  };
  const onKey = (e) => {
    if (!S.el || S.locked || e.target.matches('input, textarea, select')) return;
    const k = e.key;
    // педали-перелистыватели шлют стрелки, PageUp/PageDown или (в медиа-режиме) «следующий/предыдущий трек»
    if (k === 'PageDown' || k === 'ArrowRight' || k === 'ArrowDown' || k === 'MediaTrackNext') { e.preventDefault(); page(1); }
    else if (k === 'PageUp' || k === 'ArrowLeft' || k === 'ArrowUp' || k === 'MediaTrackPrevious') { e.preventDefault(); page(-1); }
    else if (k === ' ' || k === 'Enter') { e.preventDefault(); if (S.playing) { stop(); render(); } else play(); }
  };
  // Удержание названия — меню сцены: ночь, педаль, автопрокрутка этой песни
  const stageMenu = (anchor) => {
    const x = item(); if (!x) return;
    const ev = evOf(app, evId);
    holdMenu(anchor, [
      { icon: I.moon, label: t(S.night ? 'stage.nightOff' : 'stage.night'), run: () => { S.night = !S.night; try { sessionStorage.setItem('melete.stage.night', S.night ? '1' : '0'); } catch { /* */ } render(); } },
      { icon: I.next, label: t('stage.pedal') + ': ' + t(pedalMode() === 'song' ? 'stage.pedalSong' : 'stage.pedalPage'), run: () => { app.store.state.settings.stagePedal = pedalMode() === 'song' ? 'page' : 'song'; app.store.save(); toast(t('stage.pedal') + ': ' + t(pedalMode() === 'song' ? 'stage.pedalSong' : 'stage.pedalPage')); } },
      { icon: I.next, label: t('stage.tapReact') + ': ' + t('stage.tap.' + tapAct()), run: () => { app.store.state.settings.stageTap = TAPS[(TAPS.indexOf(tapAct()) + 1) % TAPS.length]; app.store.save(); toast(t('stage.tapReact') + ': ' + t('stage.tap.' + tapAct())); } },
      { icon: I.play, label: t(x.it.scroll ? 'stage.scrollOff' : 'stage.scrollOn'), run: () => { if (ev) { setItem(ev, x.s.id, { scroll: !x.it.scroll }); persist(app, ev); } render(); } },
    ], x.s.title);
  };
  const go = (d) => {
    const n = list().length, j = Math.max(0, Math.min(n - 1, S.i + d));
    if (j === S.i) return;
    const wasPad = S.padOn;
    stop({ keepPad: wasPad });
    S.i = j;
    remember();
    const x = item();
    if (wasPad) { if (x && x.it.pad) startPad(x.it); else stopPad(); } // пэд — связка между песнями
    if (S.eng && x && x.it.bpm) S.eng.setBpm(x.it.bpm);
    render();
    const tx = S.el && S.el.querySelector('.sgtext');
    if (tx) tx.scrollTop = 0;
  };
  const goTo = (j) => { go(j - S.i); };
  // живые переключатели на сцене: клик, пэд, минусовка — без остановки остального
  const toggle = (k) => {
    const x = item();
    if (k === 'pad') {
      if (droneOn()) stopPad();
      else if (audio.unlock()) { if (x && x.it.key) startPad(x.it); else { const d = app.device.drone; d.pc = keyPc(); safe('pad', () => { audio.drone.start(); S.padOn = true; }); } }
      else toast(t('stage.noAudio'));
    }
    else if (k === 'track') { if (!x) return; if (S.track) stopTrack(); else if (x.it.track) startTrack(x.it); }
    else if (k === 'pads') { S.showPads = !S.showPads; sset('pads', S.showPads ? '1' : '0'); }
    else if (k === 'view') { S.view = S.view === 'list' ? 'text' : 'list'; sset('view', S.view); }
    render();
  };

  // Список песен как экран музыканта: номер, название, тональность, темп, заметка автора; касание — по настройке «реакция»
  const TAPS = ['open', 'play', 'mark', 'sheet'];
  const tapAct = () => { const v = app.store.state.settings.stageTap; return TAPS.includes(v) ? v : 'open'; };
  const listHTML = (L) => {
    const ev = evOf(app, evId);
    if (!L.length) return '<div class="sgbig free"><button class="btn fill" data-sg="list">' + esc(t('stage.pickSongs')) + '</button></div>';
    return '<div class="sglist" role="list">' + L.map((sg, i) => {
      const it = itemOf(ev, sg, audioFiles(app));
      return '<button class="sgrow' + (i === S.i ? ' cur' : '') + '" role="listitem" data-sgrow="' + i + '"><span class="num sgn">' + (i + 1) + '</span><span class="grow"><b>' + esc(sg.title) + '</b>' +
        (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</span><span class="sgm">' + esc([it.key ? keyLabel(it.key) : '', it.bpm ? it.bpm : ''].filter(Boolean).join(' · ')) + '</span></button>';
    }).join('') + '</div>';
  };
  const padsHTML = () => {
    const sdo = sd(), banks = sdo.banks.filter((b) => !b.pinned), b = bank();
    const nm = (x, i) => x.name || (x.preset === 'drums' ? t('stage.drums') : t('stage.bankN', { n: i + 1 }));
    const cell = (p) => {
      if (!p || !(p.file || p.synth)) return '<i class="sgpad off" aria-hidden="true"></i>';
      const f = p.file && app.files ? app.files.get(p.file) : null, name = p.name || (p.synth ? t('stage.p.' + p.synth) : f ? f.name : '');
      return '<button class="sgpad ' + (p.synth ? 'p-' + p.synth : 'pc-' + p.color) + '" data-pad="' + esc(p.id) + '" aria-label="' + esc(name) + '"><b>' + esc(name) + '</b></button>';
    };
    return '<div class="sgpads">' + (banks.length > 1 ? '<div class="sgbanks hscroll" role="tablist">' + banks.map((x, i) => '<button class="sgchip' + (x.id === b.id ? ' on' : '') + '" role="tab" data-sgbank="' + esc(x.id) + '" aria-selected="' + (x.id === b.id) + '">' + esc(nm(x, i)) + '</button>').join('') + '</div>' : '') +
      '<div class="sgpgrid" style="--c:' + b.cols + '" role="group" aria-label="' + esc(t('stage.sounds')) + '">' + b.pads.map(cell).join('') + '</div>' +
      (b.pads.some((p) => p && p.synth) ? '<div class="sgfx"><label><span>' + esc(t('stage.space')) + '</span><input type="range" class="sgrng" data-fx="space" min="0" max="100" value="' + Math.round(S.space * 100) + '" aria-label="' + esc(t('stage.space')) + '"></label>' +
        '<label><span>' + esc(t('stage.echo')) + '</span><input type="range" class="sgrng" data-fx="echo" min="0" max="100" value="' + Math.round(S.echo * 100) + '" aria-label="' + esc(t('stage.echo')) + '"></label></div>' : '') + '</div>';
  };
  const render = () => {
    if (!S.el) return;
    const L = list(), x = item();
    if (!x && evId !== WORK) { close(true); return; }
    const s = x && x.s, it = x && x.it, next = x ? L[S.i + 1] : null, free = !x;
    if (x && app.guest) app.guest.hostAt(s.id, it.tr); // раздача: пункт сцены — у гостей, что следуют (guest.js)
    const chip = (k, on, label, avail = true) => avail ? '<button class="sgchip' + (on ? ' on' : '') + '" data-sgt="' + k + '" aria-pressed="' + on + '">' + esc(label) + '</button>' : '';
    const trName = it && it.track ? (audioFiles(app).find((r) => r.id === it.track) || {}).name || '' : '';
    const bpm = Math.round(curBpm()), run = !!audio.metro.running, pad = droneOn(), pc = keyPc();
    S.el.classList.toggle('night', !!S.night);
    S.el.innerHTML = '<div class="sgtop"><button class="sgic" data-sg="exit" aria-label="' + esc(t('stage.exit')) + '">' + I.x + '</button>' +
      '<div class="sghead" data-sg="list" role="button" tabindex="0" aria-label="' + esc(t('stage.list')) + '"><b>' + esc(free ? t('stage.title') : s.title) + '</b><span>' + esc(free ? t('stage.freeSub') : [S.i + 1 + ' / ' + L.length, it.key ? keyLabel(it.key) : '', it.capo ? t('stage.capoN', { n: it.capo }) : '', it.bpm ? it.bpm + ' bpm' : ''].filter(Boolean).join(' · ')) + '</span></div>' +
      '<i class="sgbeat" aria-hidden="true"></i>' + outBtnHTML(app, 'sgout') +
      '<button class="sgic" data-sg="lock" aria-label="' + esc(t('stage.lock')) + '">' + I.lock + '</button>' +
      '<button class="sgic txt" data-sgfs="-2" aria-label="' + esc(t('stage.smaller')) + '">A−</button><button class="sgic txt" data-sgfs="2" aria-label="' + esc(t('stage.bigger')) + '">A+</button></div>' +
      (S.view === 'list' || free ? (free && S.view !== 'list' ? '<div class="sgtext"><div class="sgbig free">' + esc(t('stage.freeHint')) + '<br><button class="btn" data-sg="list">' + esc(t('stage.pickSongs')) + '</button></div></div>' : '<div class="sgtext">' + listHTML(L) + '</div>') :
        '<div class="sgtext" style="font-size:' + S.fs + 'px">' + (it.text && s.notes ? (it.scroll ? '<i class="sgprog" aria-hidden="true"><i></i></i>' : '') + '<div class="lyr">' + lyricsHTML(chordsAbove(s.notes), it.tr - it.capo, it.srcKey) + '</div>' :
          '<div class="sgbig">' + esc(s.title) + (s.artist ? '<small>' + esc(s.artist) + '</small>' : '') + '</div>') + '</div>') +
      (it && it.track ? '<div class="sgseek" data-sgseek role="slider" aria-label="' + esc(t('stage.seek')) + '"><i style="width:' + (S.track && S.track.duration > 0 ? Math.round((S.track.currentTime / S.track.duration) * 1000) / 10 : 0) + '%"></i><span class="sgtime num">' + (S.track && S.track.duration > 0 ? fmtDur(S.track.currentTime) + ' / ' + fmtDur(S.track.duration) : '') + '</span></div>' : '') +
      // метроном одной полосой: цифры темпа — кнопка вкл/выкл; тянуть по ним вверх-вниз — темп
      '<div class="sgtempo" role="group" aria-label="' + esc(t('stage.tempo')) + '">' +
        '<button class="sgic txt" data-sgbpm="-1" aria-label="' + esc(t('stage.bpm') + ' −1') + '">−</button>' +
        '<button class="sgbpm' + (run ? ' on' : '') + '" data-sgmetro aria-pressed="' + run + '" aria-label="' + esc(t('stage.metroBtn')) + '"><b class="num">' + bpm + '</b><small>bpm</small></button>' +
        '<button class="sgic txt" data-sgbpm="1" aria-label="' + esc(t('stage.bpm') + ' +1') + '">+</button>' +
        '<button class="sgic txt tapb" data-sg="tap" aria-label="' + esc(t('stage.tapTempo')) + '">TAP</button></div>' +
      '<div class="sgchips">' + chip('pad', pad, t('stage.pad') + (pad || free ? ' ' + NOTES[pc] : it && it.key ? ' ' + keyLabel(it.key) : '')) +
        chip('track', !!S.track, '♪ ' + (trName || t('stage.track')), !!(it && it.track)) + chip('pads', S.showPads, t('stage.sounds')) + chip('view', S.view === 'list', t('stage.listView')) +
        (next ? '<span class="sgnext">' + esc(t('stage.next', { title: next.title })) + '</span>' : '') + '</div>' +
      (pad || free ? '<div class="sgkeys" role="group" aria-label="' + esc(t('stage.keys')) + '">' + NOTES.map((n, k) => '<button class="sgkey' + (pad && app.device.drone.pc === k ? ' on' : '') + '" data-sgk="' + k + '" aria-pressed="' + (pad && app.device.drone.pc === k) + '">' + n + (pad && app.device.drone.pc === k ? CSUF[audio.drone.chord] || '' : '') + '</button>').join('') + '</div>' : '') +
      (S.showPads ? padsHTML() : '') +
      '<div class="sgbar">' + (free ? '<button class="sgbtn main on" data-sg="panic" aria-label="' + esc(t('stage.panic')) + '">' + I.stop + '</button>' :
        '<button class="sgbtn" data-sg="prev"' + (S.i ? '' : ' disabled') + ' aria-label="' + esc(t('stage.prev')) + '">' + I.prev + '</button>' +
        '<button class="sgbtn main' + (S.playing ? ' on' : '') + '" data-sg="play" aria-label="' + esc(t(S.playing ? 'stage.stop' : 'stage.play')) + '">' + (S.playing ? I.stop : I.play) + '</button>' +
        '<button class="sgbtn" data-sg="next"' + (S.i < L.length - 1 ? '' : ' disabled') + ' aria-label="' + esc(t('stage.nextBtn')) + '">' + I.next + '</button>') + '</div>' +
      (S.locked ? '<div class="sglock"><button class="sgunlock" data-sgunlock aria-label="' + esc(t('stage.unlockHold')) + '">' + I.lock + '<span>' + esc(t('stage.unlockHold')) + '</span></button></div>' : '');
    S.el.classList.toggle('pads', !!S.showPads);
    outRefresh(app, S.el);
    fit();
  };

  // Сет-лист на экране: касание песни — перейти к ней (не выходя со сцены); у рабочей сцены — ещё и состав
  const listSheet = () => {
    sheet(() => {
      const L = list();
      return snav(t('stage.list')) + '<div class="group">' + L.map((s, i) => '<button class="cell" data-sgj="' + i + '"' + (i === S.i ? ' aria-current="true"' : '') + '><span class="num sgn">' + (i + 1) + '</span><span class="grow" style="text-align:left"><b>' + esc(s.title) + '</b>' +
        '<span class="bksub">' + esc([s.key ? keyLabel(songKeyOf(s)) : '', s.targetBpm ? s.targetBpm + ' bpm' : ''].filter(Boolean).join(' · ')) + '</span></span>' + (i === S.i ? icons.check : '') + '</button>').join('') + '</div>' +
        (evId === WORK ? '<div class="group" style="margin-top:12px"><button class="cell act center b" data-sgwork>' + esc(t('stage.workSet')) + '</button></div>' : '');
    }, (el, sh) => el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sgj]');
      if (b) { sh.close(); goTo(+b.dataset.sgj); return; }
      if (e.target.closest('[data-sgwork]')) { sh.close(); workSheet(app, () => { S.i = Math.min(S.i, Math.max(0, list().length - 1)); if (!list().length) close(true); else render(); }); }
    }));
  };
  // Касание песни в списке — по настройке «реакция» (меню названия): перейти · перейти и играть · только отметить · настройки
  const rowTap = (j) => {
    const act = tapAct(), L = list(), sg = L[j];
    if (!sg) return;
    if (act === 'sheet') { itemSheet(app, evId, sg.id, () => render()); return; }
    if (j !== S.i) goTo(j);
    if (act === 'mark') return;
    S.view = 'text'; sset('view', 'text');
    render();
    if (act === 'play') play();
  };
  const onClick = (e) => {
    let b;
    if (S.locked) return; // блокировка: касания игнорируются, снимается удержанием замка
    if ((b = e.target.closest('[data-sg]'))) {
      const a = b.dataset.sg;
      if (a === 'play') { if (S.playing) { stop({ keepPad: false }); render(); } else play(); }
      else if (a === 'prev') go(-1);
      else if (a === 'next') go(1);
      else if (a === 'list') listSheet();
      else if (a === 'lock') { S.locked = true; render(); }
      else if (a === 'tap') tap();
      else if (a === 'panic') panic();
      else if (a === 'exit') confirm(t('stage.exitTitle'), t('stage.exitText'), t('stage.exitYes')).then((ok) => ok && close());
    } else if ((b = e.target.closest('[data-sgt]'))) toggle(b.dataset.sgt);
    else if ((b = e.target.closest('[data-sgbank]'))) { sd().bank = b.dataset.sgbank; S.bank = b.dataset.sgbank; app.saveDevice(); render(); }
    else if ((b = e.target.closest('[data-sgrow]'))) rowTap(+b.dataset.sgrow);
    else if ((b = e.target.closest('[data-sgbpm]'))) setBpm(curBpm() + +b.dataset.sgbpm);
    else if ((b = e.target.closest('[data-sgseek]'))) { // перемотка минусовки касанием полосы
      const r = b.getBoundingClientRect();
      if (S.track && S.track.duration > 0) { S.track.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * S.track.duration; S.startedAt = performance.now() - S.track.currentTime * 1000; render(); }
    }
    else if (e.target.closest('.sgtext') && S.playing && item() && item().it.scroll && !String(document.getSelection && document.getSelection()).length) {
      S.scrollPaused = !S.scrollPaused; S.userScrollAt = 0;
      toast(t(S.scrollPaused ? 'stage.scrollPaused' : 'stage.scrollResumed'));
    }
    else if ((b = e.target.closest('[data-sgfs]'))) {
      S.fs = Math.max(14, Math.min(64, S.fs + +b.dataset.sgfs));
      try { sessionStorage.setItem('melete.stage.fs', S.fs); } catch { /* */ }
      fit();
    }
  };
  // строки не переносятся (аккорд — над своим слогом): шрифт уменьшается, пока самая длинная строка не поместится,
  // и так, чтобы самый длинный куплет (блок между пустыми строками) был виден целиком — без прокрутки посреди куплета;
  // по высоте не мельче 16 px (песня без пустых строк — один «куплет»). A− / A+ и щипок задают наибольший размер
  const fit = () => {
    const tx = S.el && S.el.querySelector('.sgtext'), ly = tx && tx.querySelector('.lyr');
    if (!tx) return;
    if (!ly) { tx.style.fontSize = S.fs + 'px'; return; }
    const fs = stageFont(ly.textContent, tx.clientWidth - 36, tx.clientHeight - 24, S.fs, lineK(ly));
    tx.style.fontSize = fs + 'px';
  };
  const lineK = (el) => { const cs = getComputedStyle(el), lh = parseFloat(cs.lineHeight), f = parseFloat(cs.fontSize); return lh > 0 && f > 0 ? lh / f : 1.45; };
  const onResize = () => fit();
  // вспышка доли (видно без звука в наушниках)
  const beat = ({ level, ms }) => S.timers.push(setTimeout(() => {
    const d = S.el && S.el.querySelector('.sgbeat');
    if (!d) return;
    d.classList.remove('on', 'acc'); void d.offsetWidth; d.classList.add('on'); if (level >= 3) d.classList.add('acc');
  }, Math.max(0, ms)));

  const close = (silent = false) => {
    stop();
    if (S.eng) { S.eng.dispose(); S.eng = null; }
    if (S.offBeat) S.offBeat();
    // всё, что сцена меняла, — как было
    audio.metro.cfg = metro0;
    Object.assign(app.device.drone, drone0);
    removeEventListener('resize', onResize);
    removeEventListener('keydown', onKey);
    S.el && S.el.removeEventListener('scroll', onUserScroll, true);
    if (S.scrollRaf) cancelAnimationFrame(S.scrollRaf);
    offG.forEach((f) => f());
    if (S.unOut) S.unOut();
    if (S.el) { S.el.removeEventListener('click', onClick); S.el.remove(); S.el = null; }
    try { localStorage.removeItem(RESUME); } catch { /* */ }
    document.documentElement.classList.remove('onstage');
    cur = null;
    if (!silent) toast(t('stage.closed'));
  };

  S.el = document.createElement('div');
  S.el.className = 'stage';
  S.el.setAttribute('role', 'dialog');
  S.el.setAttribute('aria-label', t('stage.title'));
  S.el.addEventListener('click', onClick);
  // Звуки и клавиши — по касанию (pointerdown, без ожидания click): минимальная задержка, несколько пальцев — несколько звуков
  S.el.addEventListener('pointerdown', (e) => {
    if (S.locked) return;
    const tg = e.target.closest && e.target;
    let b;
    if ((b = tg && tg.closest('[data-pad]'))) {
      e.preventDefault();
      const p = SM.padById(sd(), b.dataset.pad);
      if (p) hitPad(p, e.pointerId);
      b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
    } else if ((b = tg && tg.closest('[data-sgk]'))) { e.preventDefault(); keyDown(e, b); }
    else if ((b = tg && tg.closest('[data-sgmetro]'))) { try { b.setPointerCapture(e.pointerId); } catch { /* */ } S.md = { y: e.clientY, b0: curBpm(), moved: false, id: e.pointerId, el: b }; }
  });
  S.el.addEventListener('pointermove', (e) => {
    keyMove(e);
    const g = S.md;
    if (!g || e.pointerId !== g.id) return;
    const d = Math.round((g.y - e.clientY) / 9); // вверх — быстрее: 9 px на 1 bpm
    if (!g.moved && Math.abs(g.y - e.clientY) < 10) return;
    g.moved = true;
    const v = applyBpm(g.b0 + d, { save: false, paint: false });
    const n = g.el.querySelector('b'); if (n) n.textContent = v;
    g.v = v;
  });
  const padUp = (e) => {
    const p = S.held.get(e.pointerId);
    if (p && S.eng) { S.held.delete(e.pointerId); S.eng.release(p); }
    keyUp(e);
    const g = S.md;
    if (g && e.pointerId === g.id) { S.md = null; if (g.moved) applyBpm(g.v != null ? g.v : g.b0); else if (!S.locked) toggleMetro(); }
  };
  S.el.addEventListener('pointerup', padUp);
  S.el.addEventListener('pointercancel', (e) => { const g = S.md; if (g && e.pointerId === g.id) { S.md = null; } padUp(e); });
  S.el.addEventListener('input', (e) => {
    const r = e.target.closest && e.target.closest('[data-fx]');
    if (!r) return;
    const v = +r.value / 100;
    if (r.dataset.fx === 'space') { S.space = v; sset('space', v); if (S.eng) S.eng.setSpace(v); } else { S.echo = v; sset('echo', v); if (S.eng) S.eng.setEcho(v); }
  });
  S.unOut = bindOutput(app, S.el); // вывод на другое устройство (dev): та же шторка, что в сессии
  document.body.appendChild(S.el);
  document.documentElement.classList.add('onstage');
  S.offBeat = audio.metro.onBeat(beat);
  addEventListener('resize', onResize);
  addEventListener('keydown', onKey);
  S.el.addEventListener('scroll', onUserScroll, true);
  onHold(S.el, '.sghead', (el) => stageMenu(el));
  onHold(S.el, '.sgrow', (el) => { const j = +el.dataset.sgrow, sg = list()[j]; if (sg) holdMenu(el, [
    { icon: I.play, label: t('stage.tap.play'), run: () => { if (j !== S.i) goTo(j); S.view = 'text'; sset('view', 'text'); render(); play(); } },
    { icon: I.next, label: t('stage.tap.open'), run: () => { if (j !== S.i) goTo(j); S.view = 'text'; sset('view', 'text'); render(); } },
    { icon: I.next, label: t('stage.noteHdr') + ' · ' + t('stage.tap.sheet'), run: () => itemSheet(app, evId, sg.id, () => render()) },
  ], sg.title); });
  onHold(S.el, '.sgbtn.main.on', () => panic(), 800); // удержать ■ — всё затухает
  onHold(S.el, '[data-sgunlock]', () => { S.locked = false; render(); }, 700); // блокировка снимается удержанием замка
  // жесты: смахнуть влево — следующая песня, вправо — прошлая (длинное уверенное движение — случайно не сработает);
  // щипок по тексту — размер шрифта (как A− и A+)
  const offG = [swipe(S.el, { min: 110, left: () => go(1), right: () => go(-1), ok: (e) => !S.locked && !e.target.closest('.sgbar, .sgchips, .sgtop, .sgpads, .sgtempo, .sgseek, .sgkeys') }),
    pinch(S.el, { min: 14, max: 64, ok: (e) => !!e.target.closest('.sgtext'), get: () => S.fs,
      set: (v, live) => { S.fs = v; fit(); if (!live) try { sessionStorage.setItem('melete.stage.fs', v); } catch { /* */ } } })];
  S.i = Math.max(0, Math.min(list().length - 1, i));
  remember();
  render();
  cur = { close, render };
  return cur;
}

// Сцена одной кнопкой (слово автора 06.11.2026: на главной и в рабочей сессии): один сет-лист на сегодня — сразу
// на сцену; иначе короткий выбор — ближайшие впереди первыми; сет-листов нет — новое событие с песнями
export function stagePick(app) {
  const L = setlistsOf(app.store.state).filter((x) => x.n > 0), now = Date.now(), today = L.filter((x) => Math.abs(x.start - now) < 12 * 3600000);
  if (!L.length) { workStage(app); return; } // событий с песнями нет — рабочая сцена (без события; песен нет — пустая сцена)
  if (today.length === 1) { openStage(app, today[0].id, 0); return; }
  const day = (ts) => (ts ? new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
  sheet(() => snav(t('stage.pick')) + '<div class="group"><button class="cell" data-stgw><span class="grow" style="text-align:left"><b>' + esc(t('stage.work')) + '</b><span class="bksub">' + esc(t('stage.workSub')) + '</span></span>' + icons.chev + '</button>' +
    L.slice(0, 30).map((x) => '<button class="cell" data-stg="' + x.id + '"><span class="grow">' + esc(x.title || t('stage.untitled')) +
    '<span class="bksub">' + esc(day(x.start) + ' · ' + t('stage.nSongs', { n: x.n })) + '</span></span>' + icons.chev + '</button>').join('') + '</div>',
  (el, sh) => el.addEventListener('click', (e) => { const b = e.target.closest('[data-stg]'); if (b) { sh.close(); openStage(app, b.dataset.stg, 0); } else if (e.target.closest('[data-stgw]')) { sh.close(); workStage(app); } }));
}

// Рабочая сцена (без события): свой сет-лист в настройках; нет песен — сначала выбор состава
export function workStage(app) {
  const w = workEvent(app.store.state.settings).songs.filter((id) => app.store.songById(id));
  if (w.length || !app.store.songs().length) openStage(app, WORK, 0); // песен нет вовсе — сцена открывается пустой: метроном, пэд, звуки
  else workSheet(app, () => openStage(app, WORK, 0)); // песни есть — сначала состав; закрыли шторку — сцена и с пустым составом
}
// Состав рабочего сет-листа: все песни галочками, порядок — как выбирали
export function workSheet(app, done = () => {}) {
  const songs = () => app.store.songs();
  sheet(() => {
    const w = workEvent(app.store.state.settings);
    return snav(t('stage.workSet')) + (songs().length ? '<p class="ftr" style="margin-top:0">' + esc(t('stage.workHint')) + '</p><div class="group">' + songs().map((s) => {
      const i = w.songs.indexOf(s.id);
      return '<button class="cell" data-sgw="' + esc(s.id) + '" aria-pressed="' + (i >= 0) + '"><span class="num sgn">' + (i >= 0 ? i + 1 : '') + '</span><span class="grow" style="text-align:left"><b>' + esc(s.title) + '</b></span>' + (i >= 0 ? icons.check : '') + '</button>';
    }).join('') + '</div><div class="group" style="margin-top:12px"><button class="cell act center b" data-sgwgo>' + esc(t('stage.go')) + '</button></div>' : '<p class="ftr">' + esc(t('stage.noSongs')) + '</p>');
  }, (el, sh) => el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sgw]');
    if (b) { toggleWorkSong(workEvent(app.store.state.settings), b.dataset.sgw, app.store.songById); app.store.save(); sh.update(); return; }
    if (e.target.closest('[data-sgwgo]')) sh.close();
  }), { onClose: done });
}

// После сбоя или перезапуска: была открыта сцена — предложить вернуться на ту же песню
export function resumeStage(app) {
  let r = null;
  try { r = JSON.parse(localStorage.getItem(RESUME) || 'null'); } catch { r = null; }
  if (!resumeOk(r) || !evOf(app, r.ev)) { try { localStorage.removeItem(RESUME); } catch { /* */ } return; }
  openStage(app, r.ev, r.i);
}

// Размер шрифта сцены: самая длинная строка — в ширину w, самый длинный куплет — в высоту h (не мельче 16 px по высоте),
// не больше max (A− / A+). k — высота строки в долях шрифта. Чистая функция — tests/stage.test.js
export function stageFont(text, w, h, max, k = 1.45) {
  const lines = String(text || '').split('\n');
  const cols = Math.max(1, ...lines.map((l) => l.length));
  let block = 0, cur = 0;
  lines.forEach((l) => { if (l.trim()) { cur++; block = Math.max(block, cur); } else cur = 0; });
  const byW = Math.floor(w / (cols * 0.61));
  const byH = h > 0 && block ? Math.max(16, Math.floor(h / (block * k))) : max;
  return Math.max(12, Math.min(max, byW, byH));
}
