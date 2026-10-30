// Студия — своя вкладка внизу (не инструмент), по форме FL Studio Mobile: плейлист на весь экран (playlist.js —
// линейка тактов, колонка дорожек, клипы на таймлайне; жестами: перенос, длина, обрезка, меню), внизу полоса
// транспорта (проекты, микшер, настройки | в начало, играть, темп, клик | отмена, помощь).
// Касание клипа — редактор на всё окно: ударные — шаговый секвенсор (steps.js), ноты — пиано-ролл (roll.js),
// аккорды — такты с аккордами (chords.js), запись — выбор файла. В редакторе играет этот клип по кругу.
// Под редактором — живой ввод (live.js): клавиши и пэды, с записью (●) сыгранное ложится в кусок; MIDI-клавиатура — тоже.
// Микшер студии (mixer.js) — полоски дорожек: уровень, громкость, панорама, выкл, соло, эффекты. Петля на линейке,
// маркеры, отмена и повтор, буфер обмена клипов. Запись в дорожку (●): вход или звук приложения, отсчёт, поправка
// задержки — в клип-запись (capture.js); сведение — один проход песни в WAV в медиатеку.
// Проект — src/music/project.js, звук — src/audio/sequencer.js. Сохраняется после каждой правки (ctx.projects),
// отмена — по снимкам проекта. Экспорт — .mid (в медиатеку и для DAW), MusicXML, WAV.
import './studio.css';
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';
import { newProject, newTrack, newData, normalizeProject, normalizeData, INSTRUMENTS, COLORS, GRIDS, BARS_MAX, DRUMS, projectEvents, songBars, addClip, dupClip, removeClip, splitClip, clipById, trackOf, clipsOf, dataBeats, isEmptyProject, projectTracks, setRegion, setMark, removeMark, markAt, pasteClip, clipCopy, quantizeNotes, humanizeNotes, secPerBeat, joinClips, clipAt, fitPiece, setTake, notesFromTake } from '../../music/project.js';
import { stretchRender } from '../../audio/stretchrender.js';
import { addPlayedNote } from '../../music/project.js';
import { loadGM, gmReady, programName, kitName, FAMILIES, KITS } from '../../audio/gm.js';
import { createSequencer } from '../../audio/sequencer.js';
import { encodeWav, peaks as wavPeaks } from '../../audio/voicefx.js';
import { mixerHTML, mixerBind } from './mixer.js';
import { liveHTML, liveBind, OCT_LO, OCT_HI } from './live.js';
import { createRoll } from './roll.js';
import { createPlaylist } from './playlist.js';
import { chordsHTML, chordsAct, chordHold } from './chords.js';
import { padHTML, padBind } from './chordpad.js';
import { stepsHTML, stepsBar, stepsPos, stepsGestures } from './steps.js';
import { writeMidi, writeMidiTracks, takeDur, readMidi } from '../../music/midi.js';
import { projectXML } from '../../music/musicxml.js';
import { onHold, holdMenu } from '../../ui/hold.js';
import { keyLabel } from '../../music/transpose.js';
import { mName } from '../../music/notes.js';

import meta from './meta.js';
import { I } from './icons.js';
import { createRecording } from './record.js';
const UNDO_MAX = 40;

let host = null, ctx = null, size = 'full', seq = null, roll = null, pl = null, offs = [], raf = 0, offSteps = null, offLive = null, offMix = null, offPad = null;
// экран: { view: 'list' | 'song' | 'clip' | 'mix', pid, cid, bar, live (запись живого ввода) }; отмена и повтор: снимки проекта (JSON)
const V = { view: 'list', pid: null, cid: null, bar: 0, live: false, auto: null, clipPos: 0, cursor: 0, sel: [], tool: null }; // auto — { tr, kind }: правка огибающей дорожки; sel — выделенные клипы
const undo = { pid: null, last: '', stack: [], redo: [] };
let clipBuf = null; // буфер обмена: слепок клипа (clipCopy)
// общее для частей студии (record.js)
const S = { get ctx() { return ctx; }, get seq() { return seq; }, get pl() { return pl; }, get host() { return host; }, V, proj: () => proj(), save: () => save(), render: () => render(), trName: (tr) => trName(tr), st: () => st(), countIn: () => countIn(), recLat: () => recLat(),
  progress: (x) => { const el = host && host.querySelector('#stpos'); if (el) el.textContent = x == null ? '1.1' : Math.round(x * 100) + '%'; } }; // ход сведения — на месте такта
const rec = createRecording(S); // запись в дорожку, сведение, стемы, замер задержки
const st = () => ctx.store.all();
const m0 = () => { const v = +st().m0; return v >= OCT_LO && v <= OCT_HI ? v : 48; };
const countIn = () => (st().countIn == null ? 1 : Math.max(0, Math.min(2, +st().countIn || 0)));
// Поправка задержки записи, с: своя (мс) или по контексту (вход + выход)
const recLat = () => { const c = seq && seq.context; const auto = c ? ((c.baseLatency || 0) + (c.outputLatency || 0) + 0.02) : 0.06; return st().recLat == null ? auto : Math.max(0, +st().recLat || 0) / 1000; };
const grid = () => (GRIDS.includes(st().grid) ? st().grid : 0.5);
const proj = () => (V.pid ? ctx.projects.get(V.pid) : null);
const clip = () => { const p = proj(); return p && V.cid ? clipById(p, V.cid) : null; };
const ctrack = () => { const p = proj(), c = clip(); return p && c ? trackOf(p, c) : null; };
const snap = (p) => JSON.stringify(p, (k, v) => (k === 'updatedAt' ? undefined : v));
// Сохранить проект; прежнее состояние — в стопку отмены (новый проект — стопка с нуля)
function save() {
  const p = proj();
  if (!p) return;
  if (undo.pid !== p.id) { undo.pid = p.id; undo.stack = []; undo.last = ''; }
  const now = snap(p);
  if (undo.last && undo.last !== now) { undo.stack.push(undo.last); undo.redo = []; if (undo.stack.length > UNDO_MAX) undo.stack.shift(); }
  undo.last = now;
  ctx.projects.save(p);
  undoButtons();
}
const undoButtons = () => { if (!host) return; const u = host.querySelector('[data-x="undo"]'), r = host.querySelector('[data-x="redo"]'); if (u) u.disabled = !undo.stack.length; if (r) r.disabled = !undo.redo.length; };
// Отмена и повтор: снимок из одной стопки — в проект, текущий — в другую
function undoStep(redo = false) {
  const p = proj(), from = redo ? undo.redo : undo.stack, to = redo ? undo.stack : undo.redo;
  if (!p || undo.pid !== p.id || !from.length) return;
  const prev = JSON.parse(from.pop());
  to.push(undo.last);
  prev.createdAt = p.createdAt;
  undo.last = snap(prev);
  ctx.projects.save(normalizeProject(prev));
  if (V.cid && !clip()) { V.view = 'song'; V.cid = null; }
  render();
}
const trName = (tr) => tr.name || ctx.t('tr.' + tr.kind) + ' ' + (proj().tracks.filter((t) => t.kind === tr.kind).indexOf(tr) + 1);
const fileName = (id) => { const r = id && ctx.files.get(id); return r ? r.name : ctx.t('tr.noFile'); };
const filePeaks = (id) => { const r = id && ctx.files.get(id); if (!r || !r.peaks || !r.peaks.length) return null; const a = Float32Array.from(r.peaks); a.dur = r.dur || 1; return a; };
const instName = (id) => ctx.t('inst.' + id);
// Элемент-якорь для меню в точке касания холста (удаляется при следующей перерисовке)
function anchorAt(x, y) {
  const a = document.createElement('span');
  a.className = 'stanchor'; a.style.left = x + 'px'; a.style.top = y + 'px';
  document.body.appendChild(a);
  setTimeout(() => a.remove(), 60000);
  return a;
}

/* ---------- разметка ---------- */

function listHTML() {
  const { t, ui } = ctx, L = ctx.projects.list().filter((p) => !p.looper).sort((a, b) => b.updatedAt - a.updatedAt); // петли лупера (вид «Партии») — в лупере
  return '<div class="stlist"><div class="sthdr"><h2>' + ui.esc(t('name')) + '</h2>' + ui.icb('data-x="help"', I.help, t('help.open'), 'sm') + '</div>' +
    (L.length ? '<div class="group">' + L.map((p) => '<button class="cell stproj" data-open="' + p.id + '"><span class="grow"><b>' + ui.esc(p.name || t('untitled')) + '</b><span class="bksub">' +
      ui.esc(p.bpm + ' bpm · ' + keyLabel(p.key) + ' · ' + ctx.tn('tracks', p.tracks.length) + ' · ' + ctx.tn('bars', songBars(p))) + '</span></span>' + ui.icons.chev + '</button>').join('') + '</div>' : '<div class="stempty"><b>' + ui.esc(t('empty')) + '</b><span class="l2">' + ui.esc(t('emptySub')) + '</span></div>') +
    '<button class="btn fill block" style="margin-top:14px" data-x="new">' + ui.esc(t('new')) + '</button></div>'; // главное действие экрана — залитая кнопка
}
// Полоса транспорта внизу (как в FL Studio Mobile): проекты, микшер, настройки | в начало, играть, темп, клик | отмена, помощь
function transportHTML(p) {
  const { t, ui } = ctx, playing = seq && seq.playing;
  return '<div class="sttop">' +
    '<div class="stgrp">' + ui.icb('data-x="back"', I.list, t('toList'), 'sm plain') + ui.icb('data-x="mixer"', I.mixer, t('mixer'), 'sm plain') + ui.icb('data-x="settings"', I.gear, t('settings'), 'sm plain') + '</div>' +
    '<div class="stgrp mid">' + ui.icb('data-x="rewind"', I.rewind, t('rewind'), 'sm plain') +
    ui.icb('data-x="rec"', I.rec, t(rec.busy ? 'rec.stop' : 'rec.title'), 'sm plain strec' + (rec.busy ? ' on' : '')) +
    '<button class="stplay' + (playing ? ' on' : '') + '" data-x="play" aria-label="' + ui.esc(t(playing ? 'stop' : 'play')) + '">' + (playing ? I.stop : I.play) + '</button>' +
    '<button class="stinfo" data-x="settings" aria-label="' + ui.esc(t('settings')) + '"><b class="num">' + p.bpm + '</b><span>' + ui.esc(keyLabel(p.key) + ' · ' + p.num + '/' + p.den) + '</span><i class="num" id="stpos">1.1</i><em class="stld" id="stld" hidden></em></button>' +
    ui.icb('data-x="click"', I.click, t('click'), 'sm plain' + (seq && seq.click ? ' on' : '')) + '</div>' +
    '<div class="stgrp">' + ui.icb('data-x="undo"' + (undo.pid === p.id && undo.stack.length ? '' : ' disabled'), I.undo, t('undo'), 'sm plain') + ui.icb('data-x="redo"' + (undo.pid === p.id && undo.redo.length ? '' : ' disabled'), I.redo, t('redo'), 'sm plain') + '</div></div>';
}
// Шапка редактора клипа: назад, дорожка · такты куска (−/+), сетка (ноты), файл (запись)
function clipHeadHTML(p, c, tr) {
  const { t, ui } = ctx, d = c.data;
  const stepper = tr.kind === 'audio' || tr.kind === 'chords' ? '' : '<span class="stepper" role="group" aria-label="' + ui.esc(t('clip.bars')) + '"><button type="button" data-cb="-1" aria-label="' + ui.esc(t('clip.bars') + ' −') + '">−</button><b class="num stv">' + d.bars + '</b><button type="button" data-cb="1" aria-label="' + ui.esc(t('clip.bars') + ' +') + '">+</button></span>';
  return '<div class="sthead" style="--c:' + tr.color + '">' + ui.icb('data-x="toSong"', I.back, t('toSong'), 'sm plain') + '<i class="sttrdot"></i><button class="grow sttitle" data-x="trackMenu"><b>' + ui.esc(trName(tr)) + '</b><span>' + ui.esc((tr.kind === 'audio' ? fileName(d.fileId) + ' · ' : tr.kind === 'drums' ? '' : (tr.inst === 'gm' && gmReady() ? programName(tr.gm || 0) : instName(tr.inst)) + ' · ') + ctx.tn('bars', Math.round(c.len / p.num * 10) / 10)) + '</span></button>' +
    stepper + (tr.kind === 'notes' ? ui.seg('stgrid', [['1', '♩'], ['0.5', '♪'], ['0.25', '♬']], String(grid()), t('grid')) : '') +
    (tr.kind === 'notes' ? ui.icb('data-x="tool"', I.keys, t('tool.pick'), 'sm plain' + (V.tool ? ' on' : '')) : '') +
    (tr.kind !== 'audio' ? ui.icb('data-x="live"', I.rec, t(V.live ? 'live.off' : 'live.on'), 'sm plain strec' + (V.live ? ' on' : '')) : '') +
    (tr.kind === 'audio' ? ui.icb('data-x="pickFile"', I.file, t('tr.pickFile'), 'sm plain') : '') + '</div>';
}
function view() {
  const p = proj();
  if (!p || V.view === 'list') return listHTML();
  const c = V.view === 'clip' && clip(), tr = c && ctrack();
  if (c && tr) {
    const body = tr.kind === 'drums' ? stepsHTML(ctx, p, c.data, V.bar, tr.color) : tr.kind === 'chords' ? chordsHTML(ctx, p, tr, c.data) : tr.kind === 'notes' ? '<div class="stroll" id="stroll"></div>' :
      '<div class="staudio"><div class="group"><button class="cell" data-x="pickFile"><span class="grow">' + ctx.ui.esc(fileName(c.data.fileId)) + '<span class="bksub">' + ctx.ui.esc(ctx.t('tr.pickFile')) + '</span></span>' + ctx.ui.icons.chev + '</button>' +
      '<button class="cell" data-x="clipSheet"><span class="grow">' + ctx.ui.esc(ctx.t('clip.gain')) + '<span class="bksub">' + ctx.ui.esc(Math.round((c.gain == null ? 1 : c.gain) * 100) + '% · ' + ctx.t('clip.fades') + ' ' + (c.data.fadeIn || 0) + ' / ' + (c.data.fadeOut || 0)) + '</span></span>' + ctx.ui.icons.chev + '</button></div><p class="ftr">' + ctx.ui.esc(ctx.t('tr.audioHint')) + '</p></div>';
    const pad = tr.kind === 'chords' ? padHTML(ctx, p, tr, { bars: c.data.bars, grid: cpGrid(p), rec: V.live && seq && seq.playing }) : '';
    const strip = tr.kind === 'notes' && V.tool ? '<div class="sttool" id="sttool"></div>' : liveHTML(ctx, tr, m0()); // свой инструмент — вместо клавиш
    return '<div class="stwrap' + (V.embed ? ' embed' : '') + '">' + clipHeadHTML(p, c, tr) + body + strip + pad + (V.embed ? '' : transportHTML(p)) + '</div>';
  }
  if (V.view === 'mix') return '<div class="stwrap side">' + mixerHTML(ctx, p, trName) + transportHTML(p) + '</div>';
  return '<div class="stwrap side"><div class="stpl" id="stpl"><div class="stselbar" id="stsel" hidden></div></div>' + transportHTML(p) + '</div>';
}

function render() {
  if (!host) return;
  if (roll) { roll.destroy(); roll = null; }
  if (pl) { pl.destroy(); pl = null; }
  if (offSteps) { offSteps(); offSteps = null; }
  if (offLive) { offLive(); offLive = null; }
  if (offMix) { offMix(); offMix = null; }
  if (offPad) { offPad(); offPad = null; }
  document.querySelectorAll('.stanchor').forEach((a) => a.remove());
  host.innerHTML = view();
  toolPlace();
  const p = proj();
  if (seq && !rec.busy && !V.embed) seq.focus = V.view === 'clip' && clip() ? V.cid : null; // в лупере играет вся петля
  if (V.view === 'clip' && clip()) {
    offLive = liveBind(host, () => { const c = clip(); return { p, tr: ctrack(), d: c.data, total: dataBeats(p, c.data), grid: ctrack().kind === 'drums' ? 0.25 : grid(), rec: V.live && seq.playing, pos: () => { const b = seq.pos(); const per = dataBeats(p, c.data); return b >= 0 && per ? b % per : -1; } }; },
      { audition: (m, hold) => seq.audition(ctrack(), m, { hold }), release: (k) => seq.release(k), change: () => { save(); if (roll) roll.draw(); const rk = host.querySelector('.rack'); if (rk && ctrack().kind === 'drums') { const b = V.bar; host.querySelector('.rack').outerHTML = stepsHTML(ctx, p, clip().data, b, ctrack().color).replace(/^<div class="rack"/, '<div class="rack"'); if (offSteps) offSteps(); offSteps = stepsGestures(host.querySelector('.rack'), () => clip().data, { change: () => save(), audition: (lane) => seq.audition(ctrack(), lane) }); } },
        toggleOct: (d) => { st().m0 = Math.max(OCT_LO, Math.min(OCT_HI, m0() + 12 * d)); ctx.store.save(); render(); } });
  }
  if (V.view === 'clip' && clip() && ctrack().kind === 'chords') {
    offPad = padBind(host, () => { const c = clip(); return { p, tr: ctrack(), d: c.data, total: dataBeats(p, c.data), grid: cpGrid(p), rec: V.live && seq.playing, pos: () => { const b = seq.pos(), per = dataBeats(p, c.data); return b >= 0 && per ? b % per : -1; } }; },
      { notesOn: (m) => seq.audition(ctrack(), m, { hold: true }), notesOff: (k) => seq.release(k), change: () => { save(); chordsRefresh(); },
        recDone: () => { V.live = false; if (V.clickWas != null) { seq.click = V.clickWas; V.clickWas = null; } save(); render(); ctx.ui.toast(ctx.t('cp.done')); } });
  }
  if (V.view === 'mix') offMix = mixerBind(host, p, seq, { vol: (tr, v) => { seq.setTrackVol(tr, v); p.updatedAt = Date.now(); }, pan: (tr, v) => seq.setTrackPan(tr, v), save: () => save(),
    mute: (tr) => { seq.setTrackMute(tr, !tr.mute); save(); render(); }, solo: (tr) => { seq.setTrackSolo(tr, !tr.solo); save(); render(); }, fx: (tr) => trackSheet(tr), sound: (tr) => trackSheet(tr), master: () => { if (ctx.openMixer) ctx.openMixer(); } });
  const rh = host.querySelector('#stroll');
  if (rh) {
    roll = createRoll(rh, () => { const c = clip(); return { p: proj(), total: dataBeats(proj(), c.data), tr: ctrack(), d: c.data, grid: grid() }; }, { change: () => save(), audition: (m) => seq.audition(ctrack(), m) });
    rh.addEventListener('contextmenu', (e) => e.preventDefault());
    if (V.bar) roll.follow(V.bar * p.num);
  }
  const rk = host.querySelector('.rack');
  if (rk) offSteps = stepsGestures(rk, () => clip().data, { change: () => save(), audition: (lane) => seq.audition(ctrack(), lane) });
  const ph = host.querySelector('#stpl');
  if (ph) {
    pl = createPlaylist(ph, () => ({ p: proj(), names: trName, fileName, peaks: filePeaks, auto: V.auto }), {
      autoChange: () => { save(); seq.autoChanged(); },
      autoExit: () => { V.auto = null; render(); },
      open: (c) => { pl.selection = [c.id]; selBar([c.id]); clipEditSheet(c); }, // удержание клипа — его шторка
      split: (c, beat, g) => { const n = splitClip(proj(), c, beat, g); if (n) { buzz2(); save(); seq.audioChanged(); pl.selection = [c.id, n.id]; selBar(pl.selection); pl.draw(); } },
      sel: (ids) => selBar(ids),
      track: (tr, x, y) => trackMenu(anchorAt(x, y), tr),
      addTrack: (x, y) => addTrackMenu(anchorAt(x, y)),
      create: (tr, beat) => createClip(tr, beat),
      empty: (tr, beat, x, y) => emptyMenu(anchorAt(x, y), tr, beat),
      ruler: (beat, x, y) => rulerMenu(anchorAt(x, y), beat),
      region: () => { save(); if (seq.playing && !rec.busy) seq.start(pl.cursor); },
      seek: (beat) => { V.cursor = beat; if (seq.playing && !rec.busy) seq.start(beat); },
      change: () => { save(); seq.audioChanged(); selBar(pl.selection); },
    });
    pl.selection = (V.sel || []).filter((id) => clipById(p, id));
    selBar(pl.selection);
    pl.cursor = V.cursor || 0; // плейлист создаётся заново при каждой перерисовке — курсор живёт в V (пауза продолжает с места)
  }
  tickPos();
}
// Ход: такт.доля в транспорте; плейлист — линия; секвенсор ударных — такт идёт сам, шаг подсвечен; ролл — линия
function tickPos() {
  cancelAnimationFrame(raf);
  if (!host || !seq) return;
  const p = proj(), el = host.querySelector('#stpos'), b = seq.playing ? seq.pos() : (V.view === 'song' ? V.cursor : V.clipPos) || 0; // на паузе — место, откуда продолжится
  if (p && el) el.textContent = b < 0 ? '−' + Math.ceil(-b) : (Math.floor(b / p.num) + 1) + '.' + (Math.floor(b % p.num) + 1); // отсчёт — обратный
  if (pl) { pl.pos(b); if (b >= 0) pl.follow(b); }
  if (V.view === 'clip' && clip()) {
    const per = dataBeats(p, clip().data), inData = b >= 0 && per ? b % per : -1;
    if (roll) { roll.pos(inData); if (inData >= 0) roll.follow(inData); }
    if (host.querySelector('.rack')) {
      if (inData >= 0) { V.bar = Math.floor(inData / p.num); stepsBar(host, V.bar); }
      stepsPos(host, inData >= 0 ? Math.floor(inData * 4) : -1);
    }
  }
  if (offPad && offPad.tick) offPad.tick();
  loadDot();
  if (seq.playing) raf = requestAnimationFrame(tickPos);
}
// Свой инструмент под редактором нот (пианино, глайдер, терменвокс — ctx.mountTool): играет своим звуком, при ● и
// проигрывании клипа сыгранное ложится в кусок, как с клавиш студии (начало — к сетке, длина — сколько держали;
// скольжение — нота, с которой начали). Окно инструмента живёт между перерисовками студии (переносится, не
// пересоздаётся: камера терменвокса и настройки не сбрасываются); закрывается — выбором «Клавиши студии» или уходом
const TOOLS = ['piano', 'glider', 'theremin'];
let toolBox = null; // { id, el, h, off, held }
function toolPlace() {
  const ph = host && host.querySelector('#sttool');
  if (!ph) { toolDrop(); return; }
  if (toolBox && toolBox.id === V.tool) { ph.appendChild(toolBox.el); return; }
  toolDrop();
  const el = document.createElement('div');
  el.className = 'sttoolin';
  ph.appendChild(el);
  const h = ctx.mountTool(V.tool, el, 'half');
  if (!h) { V.tool = null; el.remove(); setTimeout(render, 0); return; }
  toolBox = { id: V.tool, el, h, held: new Map(), off: ctx.onPlay(toolPlay) };
}
function toolDrop() {
  if (!toolBox) return;
  const b = toolBox; toolBox = null;
  try { b.off(); } catch { /* */ }
  try { b.h.unmount(); } catch (e) { ctx.logErr(e); }
  b.el.remove();
}
function toolPlay(id, e) {
  const b = toolBox, c = clip(), tr = ctrack(), p = proj();
  if (!b || id !== b.id || !c || !tr || tr.kind !== 'notes' || V.view !== 'clip') return;
  const total = dataBeats(p, c.data), pos = () => { const x = seq.playing ? seq.pos() : -1; return x >= 0 && total ? x % total : -1; };
  if (e.k === 'on' && e.m != null) b.held.set(e.id, { m: Math.round(e.m), v: e.v == null ? 0.8 : e.v, t0: pos() });
  else if (e.k === 'off') {
    const h = b.held.get(e.id); b.held.delete(e.id);
    if (!h || !V.live || h.t0 < 0) return;
    const now = pos(); if (now < 0) return;
    let dur = now - h.t0; if (dur < 0) dur += total; // через границу круга
    addPlayedNote(c.data, total, h.t0, Math.max(grid(), dur), h.m, h.v, grid());
    save(); if (roll) roll.draw();
  }
}
function toolMenu(anchor) {
  const { t } = ctx, items = TOOLS.filter((id) => ctx.hasTool(id)).map((id) => { const x = ctx.midi.tool(id); return { icon: x.icon, label: x.name, run: () => { V.tool = id; render(); } }; });
  holdMenu(anchor, [{ icon: I.keys, label: t('tool.keys'), run: () => { V.tool = null; render(); } }, ...items], t('tool.pick'));
}
// Нагрузка звука — точка на темпе, только когда высокая (жёлтая — от 70 %, красная — от 90 %): подсказка снять
// эффекты или дорожки, пока не затрещало. Раз в полсекунды, пока играет; на паузе не видна
let ldAt = 0;
function loadDot() {
  const el = host && host.querySelector('#stld'), now = performance.now();
  if (!el || (now - ldAt < 500 && seq.playing)) return;
  ldAt = now;
  const m = seq.playing && ctx.audio && ctx.audio.load, lvl = m && m.ready ? m.level : 'ok';
  el.hidden = lvl === 'ok';
  if (lvl !== 'ok') { el.dataset.lvl = lvl; el.title = ctx.t('load', { p: Math.round(m.value * 100) }); }
}
// Сетка аккордовой панели (долей): доля, половина такта, такт
const cpGrid = (p) => { const g = +st().cpGrid; return [1, 2, p.num].includes(g) ? g : 1; };
// Такты аккордов над панелью — перерисовать на месте (панель и её касания не трогаются)
function chordsRefresh() {
  const el = host && host.querySelector('.scwrap'), p = proj(), c = clip(), tr = ctrack();
  if (!el || !c || !tr) return;
  const tmp = document.createElement('div'); tmp.innerHTML = chordsHTML(ctx, p, tr, c.data);
  const sc = el.querySelector('.scbars'), nw = tmp.querySelector('.scbars');
  if (sc && nw) { const y = sc.scrollTop; sc.replaceWith(nw); nw.scrollTop = y; }
}

/* ---------- настройки проекта, меню клипа и дорожки ---------- */

function settingsSheet() {
  const { t, ui } = ctx, p = proj();
  const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const row = (lab, right) => '<div class="cell"><span class="grow">' + ui.esc(lab) + '</span>' + right + '</div>';
  const rowSeg = (lab, seg) => '<div class="cellcol"><span>' + ui.esc(lab) + '</span>' + seg + '</div>'; // переключатель на всю ширину — под подписью, не поверх неё
  const step = (k, v, lab) => '<span class="stepper"><button type="button" data-st="' + k + '" data-d="-1" aria-label="' + ui.esc(lab + ' −') + '">−</button><b class="num stv">' + v + '</b><button type="button" data-st="' + k + '" data-d="1" aria-label="' + ui.esc(lab + ' +') + '">+</button></span>';
  const body = () => ui.snav(t('settings')) +
    '<div class="group"><label class="cell"><input class="inp left" data-name maxlength="40" placeholder="' + ui.esc(t('nameHint')) + '" value="' + ui.esc(p.name) + '" aria-label="' + ui.esc(t('pname')) + '"></label></div>' +
    '<div class="hdr">' + ui.esc(t('tempo')) + '</div><div class="group">' + row(t('bpm'), step('bpm', p.bpm, t('bpm'))) + rowSeg(t('meter'), ui.seg('stnum', [['3', '3/4'], ['4', '4/4'], ['6', '6/8']], String(p.num), t('meter'))) +
    '<label class="cell"><span class="grow">' + ui.esc(t('swing')) + '<span class="bksub">' + ui.esc(t('swingHint')) + '</span></span><b class="num" style="min-width:4ch;text-align:right">' + Math.round(p.swing * 100) + '%</b></label><div class="cell"><input type="range" class="strange" min="0" max="1" step="0.05" value="' + p.swing + '" data-swing aria-label="' + ui.esc(t('swing')) + '"></div></div>' +
    '<div class="hdr">' + ui.esc(t('key')) + '</div><div class="hscroll" style="padding:0 4px">' + NAMES.map((n, pc) => '<button class="pill sm" data-key="' + pc + '" aria-pressed="' + (pc === p.key.pc) + '">' + n + '</button>').join('') + '</div>' +
    '<div class="group" style="margin-top:8px"><div class="cellcol">' + ui.seg('stmin', [['0', t('maj')], ['1', t('min')]], p.key.minor ? '1' : '0', t('key')) + '</div></div>' +
    '<div class="hdr">' + ui.esc(t('rec.title')) + '</div><div class="group">' + rowSeg(t('rec.countIn'), ui.seg('stcnt', [['0', '0'], ['1', '1'], ['2', '2']], String(countIn()), t('rec.countIn'))) +
    row(t('rec.lat'), step('lat', Math.round(recLat() * 1000) + ' ms', t('rec.lat'))) + '<button class="cell act" data-latm>' + ui.esc(t('rec.measure')) + '</button></div><p class="ftr">' + ui.esc(t('rec.latHint')) + ' ' + ui.esc(t('rec.measureHint')) + '</p>' +
    '<div class="group" style="margin-top:16px"><button class="cell" data-x2="export"><span class="grow">' + ui.esc(t('export')) + '</span>' + ui.icons.chev + '</button><button class="cell danger center" data-delproj>' + ui.esc(t('delete')) + '</button></div>';
  ui.sheet(body, (el, sh) => {
    el.addEventListener('input', (e) => { if (e.target.matches('[data-name]')) { p.name = e.target.value; save(); } else if (e.target.matches('[data-swing]')) { p.swing = +e.target.value; p.updatedAt = Date.now(); } });
    el.addEventListener('change', (e) => { if (e.target.matches('[data-swing]')) { save(); sh.update(); } });
    el.addEventListener('click', (e) => {
      let b;
      if ((b = e.target.closest('[data-latm]'))) { b.disabled = true; b.textContent = t('rec.measuring'); rec.measure().then((ms) => { if (ms == null) ctx.ui.toast(t('rec.measureFail')); else { st().recLat = Math.min(500, ms); ctx.store.save(); ctx.ui.toast(t('rec.measured', { ms })); } sh.update(); }); }
      else if ((b = e.target.closest('[data-st="lat"]'))) { st().recLat = Math.max(0, Math.min(500, Math.round(recLat() * 1000) + 5 * +b.dataset.d)); ctx.store.save(); sh.update(); }
      else if ((b = e.target.closest('[data-st]'))) { p.bpm = Math.max(20, Math.min(300, p.bpm + +b.dataset.d * (e.shiftKey ? 10 : 1))); save(); sh.update(); }
      else if ((b = e.target.closest('[data-seg="stcnt"] [data-v]'))) { st().countIn = +b.dataset.v; ctx.store.save(); sh.update(); }
      else if ((b = e.target.closest('[data-seg="stnum"] [data-v]'))) { p.num = +b.dataset.v; p.den = p.num === 6 ? 8 : 4; normalizeProject(p); save(); sh.update(); }
      else if ((b = e.target.closest('[data-key]'))) { p.key.pc = +b.dataset.key; save(); sh.update(); }
      else if ((b = e.target.closest('[data-seg="stmin"] [data-v]'))) { p.key.minor = b.dataset.v === '1'; save(); sh.update(); }
      else if ((b = e.target.closest('[data-x2="export"]'))) { sh.close(); setTimeout(() => exportMenu(host.querySelector('.stinfo') || host), 200); }
      else if (e.target.closest('[data-delproj]')) ui.confirm(t('delTitle'), t('delText'), t('delete')).then((ok) => { if (!ok) return; seq.stop(); ctx.projects.remove(p.id); V.view = 'list'; V.pid = null; sh.close(); render(); });
    });
  }, { onClose: render });
}
// Меню клипа: править, повторить (копия следом), разрезать по курсору, запись — другой файл, убрать
function clipMenu(anchor, c) {
  const { t } = ctx, p = proj(), tr = trackOf(p, c), cur = pl ? pl.cursor : 0;
  holdMenu(anchor, [
    { icon: I.pen, label: t('clip.edit'), run: () => openClip(c) },
    { icon: I.copy, label: t('clip.dup'), run: () => { if (dupClip(p, c)) { save(); render(); } } },
    { icon: I.paste, label: t('clip.copy'), run: () => { clipBuf = clipCopy(p, c); ctx.ui.toast(t('clip.copied')); } },
    ...(cur > c.at && cur < c.at + c.len ? [{ icon: I.cut, label: t('clip.split'), run: () => { if (splitClip(p, c, cur, 1)) { save(); render(); } } }] : []),
    { icon: I.loop, label: t('clip.loopHere'), run: () => { setRegion(p, c.at, c.at + c.len, 0.25); save(); render(); } },
    { icon: I.mutec, label: t(c.mute ? 'clip.unmute' : 'clip.mute'), run: () => { c.mute = !c.mute; save(); seq.audioChanged(); render(); } },
    { icon: I.vol, label: t('clip.gain'), run: () => clipSheet(c) },
    ...(tr.kind === 'notes' ? [{ icon: I.tune, label: t('clip.quantize'), run: () => quantSheet(c) }] : []),
    ...(tr.kind !== 'audio' && clipAt(p, tr, c.at + c.len) ? [{ icon: I.copy, label: t('clip.join'), run: () => { if (joinClips(p, c, clipAt(p, tr, c.at + c.len))) { save(); render(); } else ctx.ui.toast(t('clip.max')); } }] : []),
    ...(tr.kind === 'audio' ? [{ icon: I.file, label: t('tr.pickFile'), run: () => filePicker(c) }, ...(c.data.fileId ? [{ icon: I.wave, label: t('clip.normalize'), run: () => processClip(c, 'normalize') }, { icon: I.wave, label: t('clip.reverse'), run: () => processClip(c, 'reverse') }] : [])] : []),
    { icon: I.del, label: t('clip.delete'), danger: true, run: () => { removeClip(p, c); if (V.cid === c.id) V.cid = null; save(); render(); } },
  ], trName(tr) + ' · ' + (Math.floor(c.at / p.num) + 1));
}
// Удержание пустого места: новый клип или вставка из буфера (только на дорожку того же рода)
function emptyMenu(anchor, tr, beat) {
  const { t } = ctx, p = proj();
  holdMenu(anchor, [
    { icon: I.plus, label: t('clip.new'), run: () => createClip(tr, beat) },
    ...(tr.kind === 'notes' ? [{ icon: I.file, label: t('take.from'), run: () => takePicker(tr, beat) }] : []),
    ...(clipBuf && clipBuf.kind === tr.kind ? [{ icon: I.paste, label: t('clip.paste'), run: () => { if (pasteClip(p, clipBuf, tr, beat, 1)) { save(); render(); } else ctx.ui.toast(t('clip.max')); } }] : []),
  ], trName(tr) + ' · ' + (Math.floor(beat / p.num) + 1));
}
// Удержание линейки: маркер здесь (или убрать), снять петлю
function rulerMenu(anchor, beat) {
  const { t, ui } = ctx, p = proj(), m = markAt(p, beat, 0.5);
  holdMenu(anchor, [
    m ? { icon: I.del, label: t('mark.remove'), danger: true, run: () => { removeMark(p, m); save(); render(); } }
      : { icon: I.flag, label: t('mark.add'), run: () => ui.sheet(() => ui.snav(t('mark.add')) + '<div class="group"><label class="cell"><input class="inp left" data-mk maxlength="30" placeholder="' + ui.esc(t('mark.name')) + '" aria-label="' + ui.esc(t('mark.name')) + '"></label></div>', (el, sh) => { const inp = el.querySelector('[data-mk]'); setTimeout(() => inp.focus(), 80); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') sh.close(); }); sh.onClose = () => {}; el.addEventListener('focusout', () => {}); inp.addEventListener('change', () => { setMark(p, beat, inp.value); save(); }); setMark(p, beat, ''); save(); }, { onClose: render }) },
    ...(p.region ? [{ icon: I.loop, label: t('loop.clear'), run: () => { p.region = null; save(); render(); } }] : [{ icon: I.loop, label: t('loop.bar'), run: () => { const b0 = Math.floor(beat / p.num) * p.num; setRegion(p, b0, b0 + p.num, 1); save(); render(); } }]),
  ], (Math.floor(beat / p.num) + 1) + '.' + (Math.floor(beat % p.num) + 1));
}
// Громкость клипа и затухания записи (в долях)
// Квантизация с силой (0…100 %) и «живость» (сдвиг времени и громкости) — шторка из меню клипа
function quantSheet(c) {
  const { t, ui } = ctx, p = proj(), total = dataBeats(p, c.data);
  let strength = 100, time = 5, vel = 10;
  const rng = (k, v, min, max, lab, unit) => '<div class="cellcol"><span>' + ui.esc(lab) + ' · <b class="num" id="qv-' + k + '">' + v + unit + '</b></span><input type="range" min="' + min + '" max="' + max + '" step="5" value="' + v + '" data-q="' + k + '" aria-label="' + ui.esc(lab) + '"></div>';
  ui.sheet(() => ui.snav(t('clip.quantize')) +
    '<div class="group">' + rng('str', strength, 0, 100, t('q.strength'), ' %') + '<button class="cell act" data-qgo="q">' + ui.esc(t('q.apply')) + '</button></div><p class="ftr">' + ui.esc(t('q.strengthHint')) + '</p>' +
    '<div class="hdr">' + ui.esc(t('q.human')) + '</div><div class="group">' + rng('time', time, 0, 25, t('q.time'), ' %') + rng('vel', vel, 0, 40, t('q.vel'), ' %') + '<button class="cell act" data-qgo="h">' + ui.esc(t('q.applyHuman')) + '</button></div><p class="ftr">' + ui.esc(t('q.humanHint')) + '</p>',
  (el, sh) => {
    el.addEventListener('input', (e) => { const k = e.target.dataset.q; if (!k) return; const v = +e.target.value; if (k === 'str') strength = v; else if (k === 'time') time = v; else vel = v; el.querySelector('#qv-' + k).textContent = v + ' %'; });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-qgo]'); if (!b) return;
      if (b.dataset.qgo === 'q') quantizeNotes(c.data, grid(), total, strength / 100); else humanizeNotes(c.data, total, { time: time / 100, vel: vel / 100 });
      save(); seq.audioChanged(); ctx.ui.toast(t('q.done')); sh.close(); render();
    });
  }, { onClose: render });
}
function clipSheet(c) {
  const { t, ui } = ctx, p = proj(), tr = trackOf(p, c), audio = tr.kind === 'audio';
  const stepF = (k, v) => '<span class="stepper"><button type="button" data-fd="' + k + '" data-d="-1" aria-label="' + ui.esc(t('clip.' + k) + ' −') + '">−</button><b class="num stv">' + v + '</b><button type="button" data-fd="' + k + '" data-d="1" aria-label="' + ui.esc(t('clip.' + k) + ' +') + '">+</button></span>';
  ui.sheet(() => ui.snav(t('clip.gain')) +
    '<div class="group"><label class="cell"><span class="grow">' + ui.esc(t('vol')) + '</span><b class="num" style="min-width:4ch;text-align:right">' + Math.round((c.gain == null ? 1 : c.gain) * 100) + '%</b></label><div class="cell"><input type="range" class="strange" style="accent-color:' + tr.color + '" min="0" max="2" step="0.01" value="' + (c.gain == null ? 1 : c.gain) + '" data-cg aria-label="' + ui.esc(t('vol')) + '"></div></div>' +
    (audio ? '<div class="hdr">' + ui.esc(t('clip.fades')) + '</div><div class="group"><div class="cell"><span class="grow">' + ui.esc(t('clip.fadeIn')) + '</span>' + stepF('fadeIn', c.data.fadeIn || 0) + '</div><div class="cell"><span class="grow">' + ui.esc(t('clip.fadeOut')) + '</span>' + stepF('fadeOut', c.data.fadeOut || 0) + '</div></div><p class="ftr">' + ui.esc(t('clip.fadesHint')) + '</p>' : ''),
  (el, sh) => {
    el.addEventListener('input', (e) => { if (e.target.matches('[data-cg]')) { c.gain = +e.target.value; p.updatedAt = Date.now(); el.querySelector('label b').textContent = Math.round(c.gain * 100) + '%'; } });
    el.addEventListener('change', (e) => { if (e.target.matches('[data-cg]')) { save(); seq.audioChanged(); } });
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-fd]'); if (!b) return; const k = b.dataset.fd; c.data[k] = Math.max(0, Math.min(c.len, (c.data[k] || 0) + +b.dataset.d * 0.5)); save(); seq.audioChanged(); sh.update(); });
  }, { onClose: render });
}
// Звук, октава, громкость, цвет и эффекты дорожки — одной шторкой
function trackSheet(tr) {
  const { t, ui } = ctx;
  // эффекты дорожки — общая панель приложения; правка слышна сразу (цепочка дорожки в секвенсоре), сохраняется при закрытии
  const pm = ctx.fxPanel({ get: () => tr.fx, set: (fx) => { if (seq) seq.setTrackFx(tr, fx); else tr.fx = fx; proj().updatedAt = Date.now(); return fx; } });
  let pmb = null;
  ui.sheet(() => ui.snav(trName(tr)) +
    '<div class="group"><label class="cell"><span class="grow">' + ui.esc(t('vol')) + '</span><b class="num" style="min-width:4ch;text-align:right">' + Math.round(tr.vol * 100) + '%</b></label><div class="cell"><input type="range" class="strange" style="accent-color:' + tr.color + '" min="0" max="1.5" step="0.01" value="' + tr.vol + '" data-vol aria-label="' + ui.esc(t('vol')) + '"></div>' +
    '<label class="cell"><span class="grow">' + ui.esc(t('mix.pan')) + '</span><b class="num" style="min-width:4ch;text-align:right" data-panv>' + panLabel(tr.pan) + '</b></label><div class="cell"><input type="range" class="strange" style="accent-color:' + tr.color + '" min="-1" max="1" step="0.02" value="' + (tr.pan || 0) + '" data-pan aria-label="' + ui.esc(t('mix.pan')) + '"></div></div>' +
    (tr.kind === 'drums' ? '<div class="hdr">' + ui.esc(t('gm.kit')) + '</div><div class="group"><div class="cellcol">' + ui.seg('stgmkit', [['', t('gm.synth')], ...KITS.map((k) => [String(k), gmReady() ? kitName(k) : String(k)])], tr.gmKit == null ? '' : String(tr.gmKit), t('gm.kit')) + '</div></div>' : '') +
    (tr.kind === 'drums' ? '<div class="hdr">' + ui.esc(t('tr.kit')) + '</div><div class="group">' + DRUMS.map((l) => '<button class="cell" data-kit="' + l + '"><span class="grow">' + ui.esc(t('drum.' + l)) + '<span class="bksub">' + ui.esc(tr.kit && tr.kit[l] ? fileName(tr.kit[l]) : t('tr.kitSynth')) + '</span></span>' + ui.icons.chev + '</button>').join('') + '</div><p class="ftr">' + ui.esc(t('tr.kitHint')) + '</p>' : '') +
    (tr.kind === 'drums' || tr.kind === 'audio' ? '' : '<div class="hdr">' + ui.esc(t('tr.inst')) + '</div><div class="group">' + INSTRUMENTS.map((id) => '<button class="cell" data-inst="' + id + '"><span class="grow">' + ui.esc(instName(id)) + '</span>' + (tr.inst === id ? ui.icons.check : '') + '</button>').join('') + '</div>' +
      (tr.inst === 'gm' ? '<div class="hdr">' + ui.esc(t('inst.gm')) + '</div><div class="group"><button class="cell" data-gmpick><span class="grow">' + ui.esc(gmReady() ? programName(tr.gm || 0) : t('gm.loading')) + '<span class="bksub">' + ui.esc(t('gm.fam.' + FAMILIES[Math.floor((tr.gm || 0) / 8)]) + ' · ' + ((tr.gm || 0) + 1)) + '</span></span>' + ui.icons.chev + '</button></div><p class="ftr">' + ui.esc(t('gm.hint')) + '</p>' : '') +
      (tr.inst === 'sample' ? '<div class="hdr">' + ui.esc(t('inst.sample')) + '</div><div class="group"><button class="cell" data-sfile><span class="grow">' + ui.esc(fileName(tr.sample && tr.sample.fileId)) + '<span class="bksub">' + ui.esc(t('tr.pickFile')) + '</span></span>' + ui.icons.chev + '</button>' +
        '<div class="cell"><span class="grow">' + ui.esc(t('tr.root')) + '</span><span class="stepper"><button type="button" data-root="-1" aria-label="' + ui.esc(t('tr.root') + ' −') + '">−</button><b class="num stv">' + mName((tr.sample && tr.sample.root) || 60) + '</b><button type="button" data-root="1" aria-label="' + ui.esc(t('tr.root') + ' +') + '">+</button></span></div></div><p class="ftr">' + ui.esc(t('tr.rootHint')) + '</p>' : '') +
      '<div class="hdr">' + ui.esc(t('tr.oct')) + '</div><div class="group"><div class="cellcol">' + ui.seg('stoct', [['-1', '−1'], ['0', '0'], ['1', '+1']], String(tr.oct || 0), t('tr.oct')) + '</div></div>') +
    '<div class="hdr">' + ui.esc(t('tr.color')) + '</div><div class="stcolors">' + COLORS.map((c) => '<button class="stcol' + (tr.color === c ? ' on' : '') + '" data-col="' + c + '" style="--c:' + c + '" aria-label="' + c + '"></button>').join('') + '</div>' +
    '<div class="hdr">' + ui.esc(t('tr.fx')) + '</div>' + pm.html(),
  (el, sh) => {
    pmb = pm.bind(el, sh);
    el.addEventListener('input', (e) => {
      if (e.target.matches('[data-vol]')) { tr.vol = +e.target.value; proj().updatedAt = Date.now(); const b = el.querySelector('label b'); if (b) b.textContent = Math.round(tr.vol * 100) + '%'; }
      else if (e.target.matches('[data-pan]')) { let v = +e.target.value; if (Math.abs(v) < 0.06) v = 0; seq.setTrackPan(tr, v); proj().updatedAt = Date.now(); const b = el.querySelector('[data-panv]'); if (b) b.textContent = panLabel(v); }
    });
    el.addEventListener('change', (e) => { if (e.target.matches('[data-vol],[data-pan]')) save(); });
    el.addEventListener('click', (e) => {
      let b;
      if ((b = e.target.closest('[data-inst]'))) { tr.inst = b.dataset.inst; if (tr.inst === 'gm') { if (tr.gm == null) tr.gm = 0; loadGM().then(() => sh.update()).catch(() => ctx.ui.toast(t('err.fail'))); } if (tr.inst === 'sample') { tr.sample = tr.sample || { fileId: null, root: 60 }; if (!tr.sample.fileId) { sh.close(); setTimeout(() => samplePicker(tr), 200); return; } } seq.audition(tr, 60); }
      else if ((b = e.target.closest('[data-sfile]'))) { sh.close(); setTimeout(() => samplePicker(tr), 200); return; }
      else if ((b = e.target.closest('[data-gmpick]'))) { sh.close(); setTimeout(() => gmPicker(tr), 200); return; }
      else if ((b = e.target.closest('[data-seg="stgmkit"] [data-v]'))) { if (b.dataset.v === '') delete tr.gmKit; else tr.gmKit = +b.dataset.v; seq.audition(tr, 'kick'); setTimeout(() => seq.audition(tr, 'snare'), 220); }
      else if ((b = e.target.closest('[data-kit]'))) { const lane = b.dataset.kit; sh.close(); setTimeout(() => samplePicker(tr, { title: t('drum.' + lane), cur: tr.kit && tr.kit[lane], none: true, set: (id) => { tr.kit = tr.kit || {}; if (id) tr.kit[lane] = id; else delete tr.kit[lane]; if (!Object.keys(tr.kit).length) delete tr.kit; seq.audition(tr, lane); } }), 200); return; }
      else if ((b = e.target.closest('[data-root]'))) { tr.sample.root = Math.max(24, Math.min(96, tr.sample.root + +b.dataset.root)); seq.audition(tr, tr.sample.root); }
      else if ((b = e.target.closest('[data-seg="stoct"] [data-v]'))) tr.oct = +b.dataset.v;
      else if ((b = e.target.closest('[data-col]'))) tr.color = b.dataset.col;
      else return;
      save(); sh.update(); pmb && pmb.mount();
    });
  }, { onClose: () => { save(); render(); } });
}
const panLabel = (v) => (!v ? 'C' : (v < 0 ? 'L' : 'R') + Math.round(Math.abs(v) * 100));
function trackMenu(anchor, tr) {
  const { t, ui } = ctx, p = proj(), i = p.tracks.indexOf(tr);
  const move = (d) => { const j = i + d; if (j < 0 || j >= p.tracks.length) return; p.tracks.splice(i, 1); p.tracks.splice(j, 0, tr); save(); render(); };
  holdMenu(anchor, [
    { icon: I.mute, label: t(tr.mute ? 'unmute' : 'mute'), run: () => { seq.setTrackMute(tr, !tr.mute); save(); render(); } },
    { icon: I.solo, label: t(tr.solo ? 'soloOff' : 'solo'), run: () => { seq.setTrackSolo(tr, !tr.solo); save(); render(); } },
    { icon: I.vol, label: t('tr.sound'), run: () => trackSheet(tr) },
    { icon: I.mix, label: t('auto.vol'), run: () => { V.auto = { tr: tr.id, kind: 'vol' }; V.view = 'song'; render(); ctx.ui.toast(t('auto.hint')); } },
    { icon: I.mix, label: t('auto.pan'), run: () => { V.auto = { tr: tr.id, kind: 'pan' }; V.view = 'song'; render(); ctx.ui.toast(t('auto.hint')); } },
    { icon: I.pen, label: t('tr.rename'), run: () => ui.sheet(() => ui.snav(t('tr.rename')) + '<div class="group"><label class="cell"><input class="inp left" data-trn maxlength="30" value="' + ui.esc(tr.name) + '" placeholder="' + ui.esc(trName(tr)) + '" aria-label="' + ui.esc(t('tr.rename')) + '"></label></div>', (el) => { const inp = el.querySelector('[data-trn]'); setTimeout(() => inp.focus(), 80); inp.addEventListener('input', () => { tr.name = inp.value; save(); }); }, { onClose: render }) },
    ...(i > 0 ? [{ icon: I.up, label: t('tr.up'), run: () => move(-1) }] : []),
    ...(i < p.tracks.length - 1 ? [{ icon: I.down, label: t('tr.down'), run: () => move(1) }] : []),
    { icon: I.copy, label: t('tr.dup'), run: () => { const c = JSON.parse(JSON.stringify(tr)); c.id = newTrack().id; c.name = trName(tr) + ' 2'; p.tracks.splice(i + 1, 0, c); clipsOf(p, tr).forEach((cl) => { p.clips.push({ ...cl, id: newTrack().id.replace('tr', 'cl'), tr: c.id, data: JSON.parse(JSON.stringify(cl.data)) }); }); save(); render(); } },
    { icon: I.del, label: t('tr.delete'), danger: true, run: () => { p.tracks.splice(i, 1); p.clips = p.clips.filter((cl) => cl.tr !== tr.id); if (V.cid && !clip()) { V.view = 'song'; V.cid = null; } save(); render(); } },
  ], trName(tr));
}
function addTrackMenu(anchor) {
  const { t } = ctx, p = proj();
  holdMenu(anchor, ['drums', 'notes', 'chords', 'audio'].map((k) => ({ icon: I.plus, label: t('tr.' + k), run: () => { const tr = newTrack(k, p.tracks.length); p.tracks.push(tr); save(); render(); } })), t('tr.add'));
}

/* ---------- выделение и шторка клипа (переделка 28.10.2026) ---------- */

const buzz2 = () => { try { navigator.vibrate && navigator.vibrate(12); } catch { /* */ } };
// Полоса над выделенными клипами (низ плейлиста, не перекрывает транспорт): править (один), разрезать по курсору,
// повторить следом, по кругу/сплошной, выключить, копировать, убрать, снять выделение
function selBar(ids) {
  V.sel = ids || [];
  const el = host && host.querySelector('#stsel'), p = proj();
  if (!el || !p) return;
  const cs = V.sel.map((id) => clipById(p, id)).filter(Boolean);
  if (!cs.length) { el.hidden = true; el.innerHTML = ''; return; }
  const { t, ui } = ctx, one = cs.length === 1, pieces = cs.filter((c) => trackOf(p, c).kind !== 'audio'), loopOn = cs.every((c) => c.loop);
  el.hidden = false;
  el.innerHTML = '<span class="stseln num">' + cs.length + '</span>' +
    (one ? ui.icb('data-sb="edit"', I.pen, t('clip.edit'), 'sm plain') : '') +
    ui.icb('data-sb="split"', I.cut, t('clip.split'), 'sm plain') +
    ui.icb('data-sb="dup"', I.copy, t('clip.dup'), 'sm plain') +
    ui.icb('data-sb="loop"', I.loop, t(loopOn ? 'clip.toOnce' : 'clip.toLoop'), 'sm plain' + (loopOn ? ' on' : '')) +
    ui.icb('data-sb="mute"', I.mutec, t(cs.every((c) => c.mute) ? 'clip.unmute' : 'clip.mute'), 'sm plain') +
    (one ? ui.icb('data-sb="copy"', I.paste, t('clip.copy'), 'sm plain') : '') +
    ui.icb('data-sb="del"', I.del, t('clip.delete'), 'sm plain danger') +
    ui.icb('data-sb="none"', '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>', t('sel.clear'), 'sm plain');
  void pieces;
}
function selAct(k) {
  const p = proj(), { t } = ctx, cs = (V.sel || []).map((id) => clipById(p, id)).filter(Boolean);
  if (!cs.length) return;
  const done = (ids = V.sel) => { save(); seq.audioChanged(); if (pl) { pl.selection = ids; pl.draw(); } selBar(ids); };
  if (k === 'edit') { clipEditSheet(cs[0]); return; }
  if (k === 'none') { done([]); return; }
  if (k === 'split') { // по курсору (линия на линейке); не попал ни в один — подсказка про двойное касание
    const cur = pl ? pl.cursor : 0, made = cs.filter((c) => cur > c.at && cur < c.at + c.len).map((c) => splitClip(p, c, cur, 0)).filter(Boolean);
    if (!made.length) { ctx.ui.toast(t('sel.splitHint')); return; }
    done([...V.sel, ...made.map((c) => c.id)]); return;
  }
  if (k === 'dup') { const made = cs.slice().sort((a, b) => a.at - b.at).map((c) => dupClip(p, c)).filter(Boolean); if (made.length < cs.length) ctx.ui.toast(t('clip.max')); done(made.map((c) => c.id)); return; }
  if (k === 'loop') { const on = !cs.every((c) => c.loop); cs.forEach((c) => { c.loop = on; fitPiece(p, trackOf(p, c), c); }); ctx.ui.toast(t(on ? 'clip.loopOn' : 'clip.onceOn')); done(); return; }
  if (k === 'mute') { const m = !cs.every((c) => c.mute); cs.forEach((c) => { c.mute = m; }); done(); return; }
  if (k === 'copy') { clipBuf = clipCopy(p, cs[0]); ctx.ui.toast(t('clip.copied')); return; }
  if (k === 'del') { cs.forEach((c) => { removeClip(p, c); if (V.cid === c.id) V.cid = null; }); done([]); return; }
}
// Шторка клипа (удержание клипа): править; по кругу или сплошной; тональность и скорость (запись — новым файлом рядом,
// исходник не трогается); громкость и затухания; ещё — копировать, повторить, квантовать, склеить, обработка, убрать
function clipEditSheet(c) {
  const { t, ui } = ctx, p = proj(), tr = trackOf(p, c), audio = tr.kind === 'audio', drums = tr.kind === 'drums';
  let semi = audio ? 0 : c.semi || 0, rate = audio ? 1 : c.rate || 1;
  const rates = [[0.5, '½'], [0.75, '¾'], [1, '1'], [1.25, '1¼'], [1.5, '1½'], [2, '2']];
  const stepper = (k, v, lab) => '<span class="stepper"><button type="button" data-cs="' + k + '" data-d="-1" aria-label="' + ui.esc(lab + ' −') + '">−</button><b class="num stv">' + v + '</b><button type="button" data-cs="' + k + '" data-d="1" aria-label="' + ui.esc(lab + ' +') + '">+</button></span>';
  const semiTxt = (v) => (v > 0 ? '+' : '') + v;
  const takeIx = () => c.data.take || 0; // какой дубль звучит
  const fileBpm = () => { const r = audio && ctx.files.get(c.data.fileId); return r && r.ana && r.ana.bpm > 20 ? r.ana.bpm : 0; }; // темп записи — из разбора (плеер медиатеки)
  const body = () => ui.snav(trName(tr) + ' · ' + (Math.floor(c.at / p.num) + 1) + '.' + (Math.floor(c.at % p.num) + 1)) +
    '<div class="group"><button class="cell act center b" data-ce="edit">' + ui.esc(t(audio ? 'tr.pickFile' : 'clip.edit')) + '</button></div>' +
    (audio && c.data.takes ? '<div class="group" style="margin-top:12px"><div class="cell"><span class="grow">' + ui.esc(t('clip.take')) + '</span>' + stepper('take', (takeIx() + 1) + ' / ' + c.data.takes.length, t('clip.take')) + '</div></div><p class="ftr">' + ui.esc(t('clip.takesHint')) + '</p>' : '') +
    '<div class="group" style="margin-top:12px"><div class="cellcol">' + ui.seg('celoop', [['1', t('clip.loop')], ['0', t(audio ? 'clip.audioOnce' : 'clip.once')]], c.loop ? '1' : '0', t('clip.mode')) + '</div></div>' +
    '<p class="ftr">' + ui.esc(t(audio ? 'clip.audioLoopHint' : 'clip.loopHint')) + '</p>' +
    (drums ? '' : '<div class="group"><div class="cell"><span class="grow">' + ui.esc(t('clip.semi')) + '</span>' + stepper('semi', semiTxt(semi), t('clip.semi')) + '</div>') +
    (drums ? '<div class="group">' : '') +
    '<div class="cellcol"><span>' + ui.esc(t('clip.rate')) + '</span>' + ui.seg('cerate', rates.map(([v, l]) => [String(v), l]), String(rate), t('clip.rate')) + '</div>' +
    (audio ? '<button class="cell act center" data-ce="apply"' + (semi === 0 && rate === 1 ? ' disabled' : '') + '>' + ui.esc(t('clip.apply')) + '</button>' : '') +
    (audio && fileBpm() && Math.abs(fileBpm() - p.bpm) >= 0.5 ? '<button class="cell act center" data-ce="fit">' + ui.esc(t('clip.fitTempo', { a: Math.round(fileBpm()), b: p.bpm })) + '</button>' : '') + '</div>' +
    '<p class="ftr">' + ui.esc(t(audio ? 'clip.stretchAudioHint' : 'clip.stretchHint')) + '</p>' +
    '<div class="group"><label class="cell"><span class="grow">' + ui.esc(t('clip.gain')) + '</span><b class="num" data-cgv style="min-width:4ch;text-align:right">' + Math.round((c.gain == null ? 1 : c.gain) * 100) + '%</b></label><div class="cell"><input type="range" class="strange" style="accent-color:' + tr.color + '" min="0" max="2" step="0.01" value="' + (c.gain == null ? 1 : c.gain) + '" data-cg aria-label="' + ui.esc(t('vol')) + '"></div>' +
    (audio ? '<div class="cell"><span class="grow">' + ui.esc(t('clip.fadeIn')) + '</span>' + stepper('fadeIn', c.data.fadeIn || 0, t('clip.fadeIn')) + '</div><div class="cell"><span class="grow">' + ui.esc(t('clip.fadeOut')) + '</span>' + stepper('fadeOut', c.data.fadeOut || 0, t('clip.fadeOut')) + '</div>' : '') + '</div>' +
    '<div class="group" style="margin-top:12px"><button class="cell" data-ce="more"><span class="grow">' + ui.esc(t('clip.more')) + '</span>' + ui.icons.chev + '</button></div>';
  ui.sheet(body, (el, sh) => {
    el.addEventListener('input', (e) => { if (e.target.matches('[data-cg]')) { c.gain = +e.target.value; p.updatedAt = Date.now(); el.querySelector('[data-cgv]').textContent = Math.round(c.gain * 100) + '%'; } });
    el.addEventListener('change', (e) => { if (e.target.matches('[data-cg]')) { save(); seq.audioChanged(); } });
    el.addEventListener('click', async (e) => {
      let b;
      if ((b = e.target.closest('[data-ce="edit"]'))) { sh.close(); if (audio) filePicker(c); else openClip(c); }
      else if ((b = e.target.closest('[data-ce="more"]'))) { sh.close(); setTimeout(() => clipMenu(host.querySelector('#stsel') || host, c), 220); }
      else if ((b = e.target.closest('[data-seg="celoop"] [data-v]'))) { c.loop = b.dataset.v === '1'; fitPiece(p, tr, c); save(); seq.audioChanged(); sh.update(); if (pl) pl.draw(); selBar(V.sel); }
      else if ((b = e.target.closest('[data-cs]'))) {
        const k = b.dataset.cs, d = +b.dataset.d;
        if (k === 'take') { setTake(c, takeIx() + d); save(); seq.audioChanged(); sh.update(); if (pl) pl.draw(); return; } // дубль — по кругу
        if (k === 'semi') { semi = Math.max(-12, Math.min(12, semi + d)); if (!audio) { c.semi = semi; save(); } }
        else { c.data[k] = Math.max(0, Math.min(c.len, (c.data[k] || 0) + d * 0.5)); save(); seq.audioChanged(); }
        sh.update(); if (pl) pl.draw();
      } else if ((b = e.target.closest('[data-seg="cerate"] [data-v]'))) { rate = +b.dataset.v; if (!audio) { c.rate = rate; fitPiece(p, tr, c); save(); } sh.update(); if (pl) pl.draw(); }
      else if ((b = e.target.closest('[data-ce="apply"]'))) { b.disabled = true; await stretchClip(c, rate, semi); sh.close(); }
      else if ((b = e.target.closest('[data-ce="fit"]'))) { b.disabled = true; await stretchClip(c, p.bpm / fileBpm(), semi); sh.close(); } // под темп проекта: скорость = темп проекта / темп записи
    });
  }, { onClose: () => { if (pl) pl.draw(); } });
}
// Разбор записи после растяжения: времена — короче в rate раз, темп — выше, тональность — на semi
function anaScaled(a, rate, semi) {
  const T = (x) => Math.round((x / rate) * 1000) / 1000;
  return { ...a, bpm: a.bpm ? Math.round(a.bpm * rate * 10) / 10 : a.bpm, pc: a.pc != null ? (((a.pc + semi) % 12) + 12) % 12 : a.pc,
    beats: Array.isArray(a.beats) ? a.beats.map(T) : a.beats, downbeats: Array.isArray(a.downbeats) ? a.downbeats.map(T) : a.downbeats,
    chords: Array.isArray(a.chords) && !semi ? a.chords.map((ch) => ({ ...ch, t: T(ch.t), d: T(ch.d) })) : undefined }; // аккорды при сдвиге высоты — заново разбором
}
// Запись клипа → новая скорость и/или тональность: новый файл в медиатеке рядом с исходным, клип — на него;
// длина клипа — под новую скорость (место в файле тоже)
async function stretchClip(c, rate, semi) {
  const { t } = ctx, p = proj(), r = ctx.files.get(c.data.fileId);
  if (!r || !r.blob) return;
  ctx.ui.toast(t('clip.processing'));
  try {
    const ac = seq.context || ctx.audio.tap().ctx, src = await ac.decodeAudioData(await r.blob.arrayBuffer());
    const out = await stretchRender(src, { rate, semi });
    const ch = [out.getChannelData(0), out.getChannelData(1)], wav = encodeWav(ch, out.sampleRate), pk = wavPeaks(ch, 600), mx = Math.max(1e-6, ...pk);
    const tag = [rate !== 1 ? '×' + rate : '', semi ? (semi > 0 ? '+' : '') + semi : ''].filter(Boolean).join(' ');
    const file = { id: 'sp' + Date.now().toString(36), name: r.name.replace(/\.[a-z0-9]+$/i, '') + ' — ' + tag + '.wav', size: wav.length, type: 'audio/wav', kind: 'audio', songs: r.songs || [], created: Date.now(),
      blob: new Blob([wav], { type: 'audio/wav' }), dur: out.duration, peaks: Array.from(pk, (v) => Math.round((v / mx) * 100) / 100), from: r.id, ...(r.ana ? { ana: anaScaled(r.ana, rate, semi) } : {}) };
    await ctx.files.add(file);
    c.data.fileId = file.id; c.data.off = (c.data.off || 0) / rate; c.len = Math.max(1 / 960, c.len / rate);
    save(); seq.audioChanged(); render();
    ctx.ui.toast(t('clip.stretched'));
  } catch (e) { ctx.logErr(e); ctx.ui.toast(t('err.fail')); }
}

/* ---------- действия ---------- */

// Новый клип на дорожке в такте: кусок в 1 такт на 1 такт; запись — выбор файла; дальше — редактор
function createClip(tr, beat) {
  const p = proj(), c = addClip(p, tr, beat, p.num, newData(tr.kind, 1));
  if (!c) { ctx.ui.toast(ctx.t('clip.max')); return; }
  save();
  if (tr.kind === 'audio') { V.cid = c.id; render(); filePicker(c); } else openClip(c);
}
function openClip(c) { V.cid = c.id; V.view = 'clip'; V.bar = 0; render(); }
// Инструмент General MIDI дорожки: 16 семейств по 8 программ (названия — из банка SONiVOX); касание — звук сразу,
// шторка остаётся открытой (подобрать на слух), «Готово» — обратно к дорожке
function gmPicker(tr) {
  const { t, ui } = ctx;
  let fam = Math.floor((tr.gm || 0) / 8);
  const body = () => ui.snav(t('inst.gm')) + (gmReady() ? '<div class="hscroll" style="padding:0 4px">' + FAMILIES.map((f, i) => '<button class="pill sm" data-gmf="' + i + '" aria-pressed="' + (i === fam) + '">' + ui.esc(t('gm.fam.' + f)) + '</button>').join('') + '</div>' +
    '<div class="group" style="margin-top:8px">' + Array.from({ length: 8 }, (_, k) => fam * 8 + k).map((pr) => '<button class="cell" data-gmp="' + pr + '"><span class="grow">' + ui.esc(programName(pr)) + '<span class="bksub">' + (pr + 1) + '</span></span>' + (tr.gm === pr ? ui.icons.check : '') + '</button>').join('') + '</div>'
    : '<p class="ftr">' + ui.esc(t('gm.loading')) + '</p>') + '<p class="ftr">' + ui.esc(t('gm.hint')) + '</p>';
  ui.sheet(body, (el, sh) => {
    if (!gmReady()) loadGM().then(() => sh.update()).catch(() => ui.toast(t('err.fail')));
    el.addEventListener('click', (e) => {
      let b;
      if ((b = e.target.closest('[data-gmf]'))) { fam = +b.dataset.gmf; sh.update(); }
      else if ((b = e.target.closest('[data-gmp]'))) { tr.inst = 'gm'; tr.gm = +b.dataset.gmp; save(); seq.audition(tr, 60 + 12 * (tr.oct || 0)); sh.update(); }
    });
  }, { onClose: () => { render(); setTimeout(() => trackSheet(tr), 200); } });
}
// Запись для сэмплера дорожки (или ряда ударных — opts.set): любая запись медиатеки; после выбора — снова шторка дорожки
function samplePicker(tr, opts = null) {
  const { t, ui } = ctx, L = ctx.files.list('audio').filter((r) => !r.stem).sort((a, b) => (b.created || 0) - (a.created || 0)); // дорожки разделения — не отдельные записи
  const cur = opts ? opts.cur : tr.sample.fileId;
  let picked = false;
  ui.sheet(() => ui.snav(opts ? opts.title : t('inst.sample')) + '<div class="group">' + (opts && opts.none ? '<button class="cell" data-file=""><span class="grow">' + ui.esc(t('tr.kitSynth')) + '</span>' + (!cur ? ui.icons.check : '') + '</button>' : '') +
    L.map((r) => '<button class="cell" data-file="' + r.id + '"><span class="grow">' + ui.esc(r.name) + '<span class="bksub">' + (r.dur ? Math.round(r.dur) + ' s' : '') + '</span></span>' + (cur === r.id ? ui.icons.check : '') + '</button>').join('') + '</div>' +
    (L.length ? '' : '<p class="ftr">' + ui.esc(t('tr.noAudio')) + '</p>') + '<p class="ftr">' + ui.esc(t(opts ? 'tr.kitHint' : 'tr.sampleHint')) + '</p>',
  (el, sh) => el.addEventListener('click', (e) => { const b = e.target.closest('[data-file]'); if (!b) return; const id = b.dataset.file || null; if (opts) opts.set(id); else { tr.sample.fileId = id; seq.audition(tr, tr.sample.root); } picked = true; save(); sh.close(); }),
  { onClose: () => { render(); if (picked) setTimeout(() => trackSheet(tr), 200); } });
}
// Партия из записи игры: MIDI из медиатеки (пианино, глайдер, терменвокс, MIDI-клавиатура; записи — «●» в инструменте)
// → клип нот с доли beat; звук — дорожки. Темп — проекта: сыгранное ложится как играли, выровнять — «Квантовать»
function takePicker(tr, beat) {
  const { t, ui } = ctx, p = proj(), L = ctx.files.list('midi').sort((a, b) => (b.created || 0) - (a.created || 0));
  const sub = (r) => [ctx.midi && ctx.midi.tool ? (ctx.midi.tool(r.tool) || {}).name : '', r.dur ? Math.round(r.dur) + ' s' : ''].filter(Boolean).join(' · ');
  ui.sheet(() => ui.snav(t('take.from')) + (L.length ? '<div class="group">' + L.map((r) => '<button class="cell" data-take="' + r.id + '"><span class="grow">' + ui.esc(r.name.replace(/\.midi?$/i, '')) + '<span class="bksub">' + ui.esc(sub(r)) + '</span></span>' + ui.icons.chev + '</button>').join('') + '</div>'
    : '<p class="ftr">' + ui.esc(t('take.none')) + '</p>') + '<p class="ftr">' + ui.esc(t('take.hint')) + '</p>',
  (el, sh) => el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-take]'); if (!b) return;
    const r = ctx.files.get(b.dataset.take);
    let ev = r && r.take && r.take.ev;
    try { if (!ev && r && r.blob) ev = readMidi(new Uint8Array(await r.blob.arrayBuffer())).ev; } catch { ev = null; }
    const d = ev && notesFromTake(p, ev);
    if (!d) { ui.toast(t('take.empty')); return; }
    const c = addClip(p, tr, beat, d.bars * p.num, normalizeData(p, tr, d));
    if (!c) { ui.toast(t('clip.max')); return; }
    sh.close(); save(); seq.audioChanged(); render();
    if (pl) { pl.selection = [c.id]; selBar([c.id]); }
    ui.toast(t('take.done', { n: d.notes.length }));
  }));
}
// Запись для клипа: аудио из медиатеки (сведение лупера — первым); длина клипа — по записи
function filePicker(c) {
  const { t, ui } = ctx, p = proj(), L = ctx.files.list('audio').filter((r) => !r.stem).sort((a, b) => (b.created || 0) - (a.created || 0));
  ui.sheet(() => ui.snav(t('tr.pickFile')) + (L.length ? '<div class="group">' + L.map((r) => '<button class="cell" data-file="' + r.id + '"><span class="grow">' + ui.esc(r.name) + '<span class="bksub">' + (r.dur ? Math.round(r.dur) + ' s' : '') + '</span></span>' + (c.data.fileId === r.id ? ui.icons.check : '') + '</button>').join('') + '</div>'
    : '<p class="ftr">' + ui.esc(t('tr.noAudio')) + '</p>') + '<p class="ftr">' + ui.esc(t('tr.audioHint')) + '</p>',
  (el, sh) => el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-file]'); if (!b) return;
    const r = ctx.files.get(b.dataset.file);
    c.data.fileId = b.dataset.file; c.data.off = 0;
    if (r && r.dur) c.len = Math.max(p.num, Math.ceil(r.dur / (60 / p.bpm) / p.num - 1e-6) * p.num);
    save(); sh.close();
  }), { onClose: render });
}
// Обработка записи клипа: нормализовать (пик к −1 дБ) или развернуть — новый файл в медиатеке, клип переключается на него
async function processClip(c, what) {
  const { t } = ctx, p = proj(), r = ctx.files.get(c.data.fileId);
  if (!r || !r.blob) return;
  ctx.ui.toast(t('clip.processing'));
  try {
    const ac = seq.context || ctx.audio.tap().ctx, buf = await ac.decodeAudioData(await r.blob.arrayBuffer());
    const ch = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, k) => new Float32Array(buf.getChannelData(k)));
    if (what === 'reverse') ch.forEach((d) => d.reverse());
    else { let mx = 0; ch.forEach((d) => { for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > mx) mx = v; } }); const k = mx > 1e-6 ? 0.89 / mx : 1; ch.forEach((d) => { for (let i = 0; i < d.length; i++) d[i] *= k; }); }
    const wav = encodeWav(ch, buf.sampleRate), pk = wavPeaks(ch, 600), mx2 = Math.max(1e-6, ...pk);
    const base = r.name.replace(/\.[a-z0-9]+$/i, ''), name = base + ' — ' + t(what === 'reverse' ? 'clip.reversed' : 'clip.normalized') + '.wav';
    const file = { id: 'sp' + Date.now().toString(36), name, size: wav.length, type: 'audio/wav', kind: 'audio', songs: r.songs || [], created: Date.now(), blob: new Blob([wav], { type: 'audio/wav' }), dur: buf.duration, peaks: Array.from(pk, (v) => Math.round((v / mx2) * 100) / 100) };
    await ctx.files.add(file);
    if (what === 'reverse') c.data.off = Math.max(0, buf.duration - (c.data.off || 0) - c.len * secPerBeat(p));
    c.data.fileId = file.id;
    save(); render();
  } catch (e) { ctx.logErr(e); ctx.ui.toast(t('err.fail')); }
}
// Экспорт песни целиком: для DAW, .mid в медиатеку, MusicXML в «Табы»
function exportMenu(anchor) {
  const { t } = ctx;
  holdMenu(anchor, [{ icon: I.wave, label: t('mixdown'), run: () => rec.mixdown() }, { icon: I.wave, label: t('stems'), run: rec.stems }, { icon: I.share, label: t('exportDaw'), run: exportDaw }, { icon: I.share, label: t('exportMidi'), run: exportMidi }, { icon: I.share, label: t('exportXml'), run: exportXml }], t('export'));
}

async function exportDaw() {
  const { t } = ctx, p = proj();
  if (isEmptyProject(p)) { ctx.ui.toast(t('err.empty')); return; }
  let ch = 0;
  const tracks = projectTracks(p).map((tr) => ({ name: tr.name, ch: tr.drums ? 9 : (ch === 9 ? ch += 2 : ch++) % 16, program: tr.program, notes: tr.notes }));
  const name = (p.name || t('untitled')) + ' (DAW).mid', u8 = writeMidiTracks({ bpm: p.bpm, num: p.num, den: p.den, key: p.key, name: p.name || '', tracks });
  const ev = projectEvents(p), rec = { id: 'sd' + Date.now().toString(36), name, size: u8.length, type: 'audio/midi', songs: p.songId ? [p.songId] : [], created: Date.now(), blob: new Blob([u8], { type: 'audio/midi' }), kind: 'midi', tool: 'piano', take: { v: 1, ev }, dur: takeDur(ev) };
  try { await ctx.files.add(rec); } catch (e) { ctx.logErr(e); ctx.ui.toast(t('err.fail')); return; }
  const loops = p.clips.some((c) => c.data.fileId);
  ctx.ui.toast(t(loops ? 'exportedDawLoops' : 'exportedDaw'));
  try { await ctx.midi.share(rec); } catch { /* отменили */ }
}
async function exportXml() {
  const { t } = ctx, p = proj();
  if (isEmptyProject(p)) { ctx.ui.toast(t('err.empty')); return; }
  const xml = projectXML(p, { title: p.name || t('untitled'), trackName: trName }), name = p.name || t('untitled'), u8 = new TextEncoder().encode(xml);
  const rec = { id: 'sx' + Date.now().toString(36), kind: 'tab', name, ext: 'musicxml', size: u8.length, type: 'application/vnd.recordare.musicxml+xml', fmt: 'score', songs: p.songId ? [p.songId] : [], created: Date.now(), blob: new Blob([u8], { type: 'application/vnd.recordare.musicxml+xml' }) };
  try { await ctx.files.add(rec); ctx.ui.toast(t('exportedXml')); } catch (e) { ctx.logErr(e); ctx.ui.toast(t('err.fail')); }
}
async function exportMidi() {
  const { t } = ctx, p = proj(), ev = projectEvents(p);
  if (!ev.length) { ctx.ui.toast(t('err.empty')); return; }
  const name = (p.name || t('untitled')) + '.mid', u8 = writeMidi(ev, { name: p.name || '' }), blob = new Blob([u8], { type: 'audio/midi' });
  const rec = { id: 'st' + Date.now().toString(36), name, size: u8.length, type: 'audio/midi', songs: p.songId ? [p.songId] : [], created: Date.now(), blob, kind: 'midi', tool: 'piano', take: { v: 1, ev }, dur: takeDur(ev) };
  try { await ctx.files.add(rec); ctx.ui.toast(t('exported')); } catch (e) { ctx.logErr(e); ctx.ui.toast(t('err.fail')); }
  holdMenu(host.querySelector('.stinfo') || host, [{ icon: I.share, label: t('share'), run: () => ctx.midi.share(rec) }], name);
}

function act(x, el) {
  const p = proj();
  switch (x) {
    case 'new': { const np = newProject({ songId: ctx.session && ctx.session.songId || null }); ctx.projects.save(np); V.pid = np.id; V.view = 'song'; V.cid = null; V.bar = 0; render(); break; }
    case 'back': if (rec.busy) rec.stop(true); seq.stop(); V.view = 'list'; V.pid = null; V.cid = null; render(); break;
    case 'toSong': if (V.embed) { V.embed.close(); break; } V.view = 'song'; V.auto = null; render(); break;
    case 'play': { // пауза: стоп запоминает место, следующий старт — оттуда (в начало — кнопкой перемотки)
      if (rec.busy) { rec.stop(true); break; }
      if (!ctx.audio.unlock()) { ctx.ui.toast(ctx.t('err.sound')); return; }
      if (seq.playing) { const b = seq.pos(); if (b >= 0) { if (V.view === 'song') { V.cursor = b; if (pl) pl.cursor = b; } else V.clipPos = b; } seq.stop(); }
      else seq.start(V.view === 'song' ? (pl ? pl.cursor : V.cursor || 0) : V.clipPos || 0);
      render(); break;
    }
    case 'rewind': if (rec.busy) break; V.clipPos = 0; V.cursor = 0; if (seq.playing) seq.start(0); else if (pl) { pl.cursor = 0; } tickPos(); break;
    case 'click': seq.click = !seq.click; render(); break;
    case 'undo': undoStep(); break;
    case 'redo': undoStep(true); break;
    case 'rec': if (rec.busy) rec.stop(true); else rec.sheet(); break;
    case 'live': {
      if (V.embed) { // в лупере: запись идёт по кругу петли — петля сама задаёт время
        V.live = !V.live;
        if (V.live && !seq.playing) V.embed.play();
        render(); break;
      }
      V.live = !V.live;
      const chords = ctrack() && ctrack().kind === 'chords';
      if (V.live && (chords || !seq.playing)) { // аккорды: всегда с начала куска, клик и отсчёт такта (раз-два-три-четыре)
        if (!ctx.audio.unlock()) { ctx.ui.toast(ctx.t('err.sound')); V.live = false; return; }
        if (chords) { V.clickWas = seq.click; seq.click = true; }
        seq.start(0, { countIn: chords ? Math.max(1, countIn()) : countIn() });
      }
      if (!V.live && V.clickWas != null) { seq.click = V.clickWas; V.clickWas = null; }
      render(); break;
    }
    case 'clipSheet': { const c = clip(); if (c) clipSheet(c); break; }
    case 'settings': settingsSheet(); break;
    case 'mixer': V.view = V.view === 'mix' ? 'song' : 'mix'; V.auto = null; render(); break;
    case 'help': if (ctx.help) ctx.help(); break;
    case 'trackMenu': if (V.embed) trackSheet(ctrack()); else trackMenu(el, ctrack()); break;
    case 'tool': toolMenu(el); break;
    case 'pickFile': { const c = clip(); if (c) filePicker(c); break; }
  }
}
function onClick(e) {
  const p = proj(), g = (s) => e.target.closest(s);
  let b;
  if ((b = g('[data-x]'))) { act(b.dataset.x, b); return; }
  if ((b = g('[data-sb]'))) { selAct(b.dataset.sb); return; }
  if ((b = g('[data-open]'))) { V.pid = b.dataset.open; V.view = 'song'; V.cid = null; V.bar = 0; render(); return; }
  if (!p) return;
  if ((b = g('[data-rkbar]'))) { V.bar = +b.dataset.rkbar; stepsBar(host, V.bar); return; }
  if ((b = g('.rkname[data-lane]'))) { seq.audition(ctrack(), b.dataset.lane); return; }
  if ((b = g('[data-cb]'))) { // такты куска: длина клипа — не короче куска
    const c = clip(); if (!c) return;
    c.data.bars = Math.max(1, Math.min(BARS_MAX, c.data.bars + +b.dataset.cb)); c.data = normalizeData(p, ctrack(), c.data);
    const per = dataBeats(p, c.data); if (c.len < per) c.len = per;
    V.bar = Math.min(V.bar, c.data.bars - 1); save(); render(); return;
  }
  if ((b = g('[data-seg="stgrid"] [data-v]'))) { st().grid = +b.dataset.v; ctx.store.save(); render(); return; }
  if ((b = g('[data-seg="cpgrid"] [data-v]'))) { st().cpGrid = +b.dataset.v; ctx.store.save(); render(); return; }
  if ((b = g('[data-seg="cpbars"] [data-v]'))) { // длина куска аккордов: 4–32 такта, клип — той же длины
    const c = clip(); if (!c) return;
    const n = +b.dataset.v; c.data.bars = n; c.data = normalizeData(p, ctrack(), c.data); c.len = n * p.num;
    save(); render(); return;
  }
  const c = clip(), tr = ctrack();
  if (c && tr && tr.kind === 'chords' && chordsAct(ctx, p, tr, c.data, e, () => { save(); render(); })) return;
}

// Редактор партии внутри лупера (вид «Партии», src/modules/looper/parts.js): тот же редактор клипа, но играет вся
// петля лупера (её секвенсор), без транспорта студии. → { close, render }
export function embedPart(el, c, { pid, cid, seq: extSeq, play = () => {}, close = () => {} }) {
  const was = { host, ctx, size, seq, V: { ...V } };
  host = el; ctx = c; size = 'full'; seq = extSeq;
  Object.assign(V, { view: 'clip', pid, cid, bar: 0, live: false, tool: null, auto: null, sel: [], embed: { play, close } });
  const offE = [], on = (t, ev, fn) => { t.addEventListener(ev, fn); offE.push(() => t.removeEventListener(ev, fn)); };
  on(el, 'click', onClick);
  onHold(el, '.rkname[data-lane]', (el2) => { const cl = clip(); if (!cl) return; const lane = el2.dataset.lane; if (!cl.data.steps[lane]) return; holdMenu(el2, [{ icon: I.del, label: c.t('drum.clear'), danger: true, run: () => { delete cl.data.steps[lane]; save(); render(); } }], c.t('drum.' + lane)); });
  onHold(el, '.scch', (el2) => { const p = proj(), cl = clip(); if (cl) chordHold(ctx, p, cl.data, el2, () => { save(); render(); }); });
  render();
  let open = true;
  return {
    render: () => { if (open && host === el) render(); },
    close() {
      if (!open) return; open = false;
      cancelAnimationFrame(raf);
      if (roll) { roll.destroy(); roll = null; }
      if (offSteps) { offSteps(); offSteps = null; }
      if (offLive) { offLive(); offLive = null; }
      if (offPad) { offPad(); offPad = null; }
      toolDrop();
      offE.forEach((f) => f());
      if (host === el) { host = was.host; ctx = was.ctx || ctx; size = was.size; seq = was.seq; Object.assign(V, was.V); delete V.embed; if (!was.V.embed) delete V.embed; }
    },
  };
}

export default {
  ...meta,
  status(c) { const n = (c.projects ? c.projects.list() : []).length; return c.tn('projects', n); },
  mount(el, c, sz = 'full') {
    host = el; ctx = c; size = sz;
    if (!seq) seq = createSequencer({ mixer: c.audio.mixer, synth: c.audio.synth, getProject: proj, getFile: (id) => c.files.get(id), onLate: (s) => { if (c.diag) { c.diag.count('late'); c.diag.gauge('lateMs', s * 1000); } } });
    (c.projects.list() || []).forEach(normalizeProject);
    if (V.pid && !proj()) { V.view = 'list'; V.pid = null; }
    if (V.view === 'clip' && !clip()) V.view = 'song';
    const on = (t, ev, fn) => { t.addEventListener(ev, fn); offs.push(() => t.removeEventListener(ev, fn)); };
    on(host, 'click', onClick);
    // удержания: название ряда ударных — очистить ряд; аккорд — убрать; проект в списке — удалить
    onHold(host, '.rkname[data-lane]', (el2) => { const cl = clip(); if (!cl) return; const lane = el2.dataset.lane; if (!cl.data.steps[lane]) return; holdMenu(el2, [{ icon: I.del, label: c.t('drum.clear'), danger: true, run: () => { delete cl.data.steps[lane]; save(); render(); } }], c.t('drum.' + lane)); });
    onHold(host, '.scch', (el2) => { const p = proj(), cl = clip(); if (cl) chordHold(ctx, p, cl.data, el2, () => { save(); render(); }); });
    onHold(host, '.stproj', (b) => { const id = b.dataset.open; holdMenu(b, [{ icon: I.del, label: c.t('delete'), danger: true, run: () => c.ui.confirm(c.t('delTitle'), c.t('delText'), c.t('delete')).then((ok) => { if (ok) { c.projects.remove(id); render(); } }) }], (c.projects.get(id) || {}).name || c.t('untitled')); });
    render();
  },
  resize(sz) { size = sz; render(); },
  // Вкладка закрыта: проигрывание останавливается (черновик — не фон для занятия)
  // MIDI-клавиатура: в редакторе клипа нот — играть и записывать живым вводом
  midiIn(e) { if (offLive && offLive.midi && V.view === 'clip') offLive.midi(e); },
  midiStop() { if (offLive && offLive.midi) offLive.midi({ k: 'off', id: '*' }); },
  unmount() {
    cancelAnimationFrame(raf);
    if (rec.busy) rec.stop(true);
    if (seq) seq.stop();
    if (roll) { roll.destroy(); roll = null; }
    if (pl) { pl.destroy(); pl = null; }
    if (offSteps) { offSteps(); offSteps = null; }
    if (offLive) { offLive(); offLive = null; }
    if (offMix) { offMix(); offMix = null; }
    if (offPad) { offPad(); offPad = null; }
    toolDrop();
    offs.splice(0).forEach((f) => f());
    document.querySelectorAll('.stanchor').forEach((a) => a.remove());
    host = null;
  },
};
