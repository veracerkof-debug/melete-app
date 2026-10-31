// «Табы, ноты и текст» → «С игры»: ноты и табы прямо во время игры и их правка (решение автора 29.10.2026).
// Источник — микрофон (одноголосно, src/audio/notein.js) или MIDI: клавиатура и инструменты приложения в сессии
// (ctx.onPlay). Ритм — под свой щелчок с отсчётом; без метронома темп угадывается по игре. Ноты на стане — alphaTab
// того же модуля (ноты и табы вместе, касание ноты — правка). Партия — src/music/livescore.js: сыгранное хранится
// как есть, сетка и правки — над ним. Запись не теряется: после «Стоп» партия сразу сохраняется файлом в «Табах»
// (к песне занятия, если она есть), каждая правка — тоже.
// Как у других (ScoreCloud, MuseScore, Guitar Pro, Songsterr): касание ноты — правка снизу одной полосой, выделение
// тактов — удалить или переписать с отсчётом, ввод нот касанием паузы, отмена.
import { getContext } from '../../audio/context.js';
import { clickVoice, clickNoise } from '../../audio/metronome.js';
import { createMicNotes } from '../../audio/notein.js';
import { every, cancel } from '../../audio/clock.js';
import { newPart, quantize, gridOf, GRIDS, INSTS, guessTempo, autoGrid, partXML, partEvents, partSong, tabOf, barsOf,
  setPitch, setLen, setFret, delNote, addNote, delBars, cutFrom, insertAt, setTempo } from '../../music/livescore.js';
import { writeMidi } from '../../music/midi.js';
import { projectFromSong } from '../../music/project.js';
import { parseN, mName } from '../../music/notes.js';

const TUNS = {
  guitar: ['E2 A2 D3 G3 B3 E4', 'D2 A2 D3 G3 B3 E4', 'E♭2 A♭2 D♭3 G♭3 B♭3 E♭4', 'D2 G2 C3 F3 A3 D4', 'D2 A2 D3 G3 A3 D4', 'D2 G2 D3 G3 B3 D4', 'B1 E2 A2 D3 G3 B3 E4'],
  bass: ['E1 A1 D2 G2', 'D1 A1 D2 G2', 'B0 E1 A1 D2 G2'],
  ukulele: ['G4 C4 E4 A4', 'G3 C4 E4 A4'],
};
const ICON = {
  rec: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" stroke="none"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
  bars: '<svg viewBox="0 0 24 24"><path d="M4 6v12M10 6v12M16 6v12M20 6v12"/><rect x="10" y="8" width="6" height="8" rx="1" fill="currentColor" stroke="none" opacity=".35"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 8.5L12 4l4.5 4.5"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
const FR = (b) => { // доли → доля целой: 1/8, 3/8, 1/4…
  const x = b / 4, den = [1, 2, 4, 8, 16, 32, 3, 6, 12, 24, 48].find((d) => Math.abs(x * d - Math.round(x * d)) < 1e-6) || 48, n = Math.round(x * den);
  const g = (a, c) => (c ? g(c, a % c) : a), k = g(n, den);
  return n / k + (den / k === 1 ? '' : '/' + den / k);
};

export function createLive(env) {
  const L = { part: null, rec: null, phase: 'idle', sel: null, bars: null, undo: [], live: null, pitch: null, pend: null, saveT: 0 };
  const C = () => env.ctx;
  const cfg = () => { const s = env.st(); return (s.live ??= {}); };
  const esc = (s) => env.esc(s);
  const t = (k, o) => C().t(k, o);

  /* ---------- партия и файл ---------- */

  function defaults() {
    const c = cfg(), prof = (C().profile && C().profile.instruments) || [];
    if (!c.inst) c.inst = prof.includes('bass') ? 'bass' : prof.includes('uke') ? 'ukulele' : prof.includes('guitar') || prof.includes('egtr') ? 'guitar' : prof.includes('vocal') ? 'voice' : prof.includes('piano') ? 'keys' : 'guitar';
    if (!c.src) c.src = c.inst === 'keys' ? 'midi' : 'mic';
    if (c.metro == null) c.metro = true;
    if (!c.bpm) c.bpm = 90;
    if (!c.num) c.num = 4;
    if (c.cnt == null) c.cnt = 1;
    if (c.capo == null) c.capo = 0;
    if (!c.tun || !TUNS[c.inst] || !TUNS[c.inst].includes(c.tun)) c.tun = TUNS[c.inst] ? TUNS[c.inst][0] : null;
    return c;
  }
  function fresh() {
    const c = defaults(), song = C().song();
    const key = song && song.key ? keyOfSong(song.key) : null;
    return newPart({ bpm: c.bpm, num: c.num, inst: c.inst, tuning: c.tun ? c.tun.split(' ').map(parseN) : INSTS[c.inst].tuning, capo: c.capo, mono: c.src === 'mic', ...(key ? { key } : {}) });
  }
  const keyOfSong = (k) => { const m = /^([A-G])([#♯b♭]?)(m?)/.exec(String(k)); if (!m) return null; const pc = (({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[m[1]] + (/[#♯]/.test(m[2]) ? 1 : /[b♭]/.test(m[2]) ? -1 : 0) + 12) % 12; return { pc, minor: !!m[3] }; };
  const stamp = () => { const d = new Date(), z = (n) => String(n).padStart(2, '0'); return z(d.getDate()) + '.' + z(d.getMonth() + 1) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); };

  function xml() { return partXML(L.part, { title: L.rec ? L.rec.name : t('live.title') }); }
  // Сохранить: первый раз — новый файл в «Табах» (к песне занятия), дальше — тот же
  async function save(now = false) {
    clearTimeout(L.saveT);
    const go = async () => {
      if (!L.part || !C()) return;
      const fresh = !L.rec || L.rec.tmp;
      if (fresh) L.rec = { id: 'lv' + Date.now().toString(36), kind: 'tab', fmt: 'live', det: 'musicxml', name: t('live.name', { d: stamp() }), ext: 'musicxml', created: Date.now() };
      const body = new TextEncoder().encode(xml()), blob = new Blob([body], { type: 'application/vnd.recordare.musicxml+xml' });
      if (fresh) {
        const song = C().song();
        Object.assign(L.rec, { type: blob.type, size: blob.size, songs: song ? [song.id] : [], blob, live: L.part });
        env.AT.cur = L.rec;
        const ok = await C().files.add(L.rec);
        if (!ok) C().ui.toast(t('notSaved'));
        env.st().lastTab = L.rec.id; C().store.save();
        return;
      }
      Object.assign(L.rec, { blob, size: blob.size, live: L.part });
      C().files.save(L.rec);
    };
    if (now) return go();
    L.saveT = setTimeout(go, 600);
  }
  // Ноты на стан: MusicXML партии → alphaTab (с записью — не чаще раза в 0,7 с)
  let drawT = 0, drawAt = 0;
  function draw(part = L.part) {
    const run = async () => {
      drawAt = performance.now();
      const at = await env.loadLib();
      if (!C()) return;
      env.ensureApi(at);
      env.setProf(at);
      // на экране — без заголовка и подписи партии: место — нотам
      // как «MIDI и DAW»: разбор здесь же, отрисовка — renderScore (повторные load подряд теряли отрисовку)
      try { env.AT.api.renderScore(at.importer.ScoreLoader.loadScoreFromBytes(new TextEncoder().encode(partXML(part, { title: '' })), env.AT.api.settings)); } catch (e) { C().logErr(e); }
    };
    clearTimeout(drawT);
    const wait = Math.max(0, 700 - (performance.now() - drawAt));
    if (L.phase === 'rec' && wait) drawT = setTimeout(run, wait); else run();
  }
  // Правка: снимок для отмены, пересчёт, сохранение
  function edit(fn) {
    L.undo.push(JSON.stringify(L.part.raw));
    if (L.undo.length > 40) L.undo.shift();
    fn(L.part);
    draw();
    save();
    env.render();
  }
  function undo() {
    const s = L.undo.pop();
    if (!s) return;
    const sel = L.sel ? L.part.raw.indexOf(L.sel) : -1;
    L.part.raw = JSON.parse(s);
    L.sel = sel >= 0 ? L.part.raw[sel] || null : null;
    draw(); save(); env.render();
  }

  /* ---------- запись ---------- */

  let clickT = 0, noise = null, offPlay = null, mic = null, tickT = 0;
  const ctxA = () => getContext(C().audio.mixer.state.mode);
  const lat = (c) => c.outputLatency || c.baseLatency || 0;

  // Свой щелчок: ровно по долям от t0 (отсчёт — до t0), сильная доля громче
  function clicks(c, t0, bpm, num, from, on) {
    const spb = 60 / bpm;
    noise = noise || clickNoise(c);
    let k = from;
    const run = () => {
      while (t0 + k * spb < c.currentTime + 0.25) {
        const at = t0 + k * spb;
        if (at >= c.currentTime - 0.01 && (k < 0 || on())) clickVoice(c, C().audio.mixer.bus('metro'), at, ((k % num) + num) % num === 0 ? 3 : 1, 'click', noise);
        k++;
      }
    };
    run();
    clickT = every(25, run);
  }

  // ● — запись; fromBar — перезапись с такта (отсчёт и щелчок обязательно: темп известен)
  async function start(fromBar = null) {
    if (!C().audio.unlock()) { C().ui.toast(t('noAudio')); return; }
    const c = ctxA();
    if (!c) return;
    const cf = defaults();
    if (fromBar == null) { L.part = fresh(); L.rec = { tmp: true, id: 'live-tmp', kind: 'tab', fmt: 'live', name: t('live.title') }; env.AT.cur = L.rec; L.undo = []; }
    const p = L.part, punch = fromBar != null, metro = punch || cf.metro, spb = 60 / p.bpm, cnt = metro ? Math.max(punch ? 1 : 0, cf.cnt) : 0;
    const t0 = c.currentTime + 0.15 + cnt * p.num * spb;
    L.sel = null; L.bars = null;
    L.live = { t0, from: fromBar || 0, punch, metro, open: new Map(), raw: [], free: !metro, src: cf.src };
    L.phase = cnt ? 'count' : 'rec';
    if (metro) clicks(c, t0, p.bpm, p.num, -cnt * p.num, () => cf.metro || punch);
    // время события → секунды от первой доли записи (с поправкой: игра — под слышимый щелчок)
    const rel = (at) => at - L.live.t0 - lat(c);
    const on = (id, m, v, at) => { if (L.phase === 'count' && at < L.live.t0 - 0.12) return; L.live.open.set(id, { t: rel(at), m: Math.round(m), v: v == null ? 0.8 : v }); changed(); };
    const off = (id, at) => { const o = L.live.open.get(id); if (!o) return; L.live.open.delete(id); L.live.raw.push({ ...o, d: Math.max(0.04, rel(at) - o.t) }); changed(); };
    L.live.on = on; L.live.off = off;
    if (cf.src === 'mic') {
      let n = 0;
      try {
        mic = await createMicNotes({ mode: C().audio.mixer.state.mode, open: () => C().mic.request(), a4: C().a4 ? C().a4() : 440,
          onEv: (e) => { if (e.k === 'on') on('m' + ++n, e.m, e.v, e.t + lat(c)); else off('m' + n, e.t + lat(c)); },
          onPitch: (m) => { if (m !== L.pitch) { L.pitch = m; const el = env.host() && env.host().querySelector('#lvpitch'); if (el) el.textContent = m == null ? '' : mName(m); } } });
      } catch (e) {
        stopClicks(); L.phase = L.part.raw.length ? 'edit' : 'idle'; L.live = null; env.render();
        C().ui.toast(t(e && e.reason === 'denied' ? 'live.micDenied' : 'live.micNA'));
        return;
      }
    } else {
      offPlay = C().onPlay((mod, e) => { if (e.k === 'on' && e.m != null) on(mod + e.id, e.m, e.v, c.currentTime); else if (e.k === 'off') off(mod + e.id, c.currentTime); });
    }
    tickT = every(100, tick);
    env.render();
  }
  // Ход записи: отсчёт → запись; номер такта; живые ноты на стан
  function tick() {
    const c = ctxA(), lv = L.live;
    if (!c || !lv) return;
    const spb = 60 / L.part.bpm, b = (c.currentTime - lv.t0) / spb;
    if (L.phase === 'count' && b >= -0.05) { L.phase = 'rec'; env.render(); }
    const el = env.host() && env.host().querySelector('#lvpos');
    if (el) el.textContent = b < 0 ? String(Math.ceil(-b)) : String(lv.from + Math.floor(b / L.part.num) + 1);
  }
  let chT = 0;
  function changed() {
    clearTimeout(chT);
    chT = setTimeout(() => {
      const lv = L.live;
      if (!lv) return;
      const c = ctxA(), now = c ? c.currentTime - lv.t0 - lat(c) : 0;
      const part = { ...L.part, raw: L.part.raw.slice() };
      let raw = [...lv.raw, ...[...lv.open.values()].map((o) => ({ ...o, d: Math.max(0.05, now - o.t) }))].sort((a, b) => a.t - b.t);
      if (!raw.length) return;
      if (lv.free) { // без метронома — темп пока на глаз: по сыгранному (от четырёх нот), первая нота — первая доля
        const g = raw.length >= 4 ? guessTempo(raw.map((r) => r.t)) : { bpm: part.bpm, t0: raw[0].t };
        part.bpm = g.bpm;
        raw = raw.map((r) => ({ ...r, t: Math.max(0, r.t - g.t0) }));
      }
      if (lv.punch) cutFrom(part, lv.from);
      insertAt(part, lv.from, raw);
      draw(part);
    }, 120);
  }
  function stopClicks() { cancel(clickT); clickT = 0; }
  // ■ — конец записи: ноты в партию, темп и сетка (без метронома — по игре), сразу в файл
  async function stop() {
    const lv = L.live, c = ctxA();
    if (!lv) return;
    stopClicks(); cancel(tickT);
    if (mic) { const m = mic; mic = null; m.stop(); }
    if (offPlay) { offPlay(); offPlay = null; }
    const end = c ? c.currentTime : 0;
    [...lv.open.keys()].forEach((id) => lv.off(id, end));
    L.live = null; L.pitch = null;
    let raw = lv.raw.filter((r) => r.t > -0.25).map((r) => ({ ...r, t: Math.max(0, r.t) })).sort((a, b) => a.t - b.t);
    if (!raw.length) {
      L.phase = L.part.raw.length ? 'edit' : 'idle';
      if (!L.part.raw.length) { env.AT.cur = null; env.AT.state = 'idle'; }
      env.render(); C().ui.toast(t('live.empty'));
      return;
    }
    const p = L.part;
    L.undo.push(JSON.stringify(p.raw));
    if (lv.free) { // темп по игре: первая нота — на первой доле
      const g = guessTempo(raw.map((r) => r.t));
      raw = raw.map((r) => ({ ...r, t: Math.max(0, r.t - g.t0) }));
      p.bpm = g.bpm;
    }
    if (lv.punch) cutFrom(p, lv.from);
    insertAt(p, lv.from, raw);
    if (p.grid === 'auto') p.gridSeen = autoGrid(p.raw, p.bpm);
    L.phase = 'edit';
    await save(true);
    draw();
    env.render();
  }

  // MIDI-клавиатура прямо в окно «Табов» (окно — последнее открытое): звучит пианино, в запись — тоже
  function midiIn(e) {
    const syn = C().audio.synth, c = ctxA();
    if (e.k === 'on' && e.m != null) { syn.on(Math.round(e.m), 'lv' + e.id, { bus: 'piano', vel: e.v }); if (L.live && L.live.src === 'midi' && c) L.live.on('k' + e.id, e.m, e.v, c.currentTime); }
    else if (e.k === 'off') { syn.off('lv' + e.id); if (L.live && c) L.live.off('k' + e.id, c.currentTime); }
  }

  /* ---------- выбор: нота или такты (касание по стану alphaTab) ---------- */

  // удар alphaTab → нота партии: по времени (доли) и высоте
  function pick(beat, note) {
    if (!L.part || L.phase === 'rec' || L.phase === 'count') return;
    const x = beat.absolutePlaybackStart / 960 * (L.part.den / 4), bar = beat.voice.bar.index;
    if (L.bars) { // выбор тактов: второе касание — последний такт
      if (L.bars.b1 == null) { const a = L.bars.b0; L.bars = { b0: Math.min(a, bar), b1: Math.max(a, bar) }; } else L.bars = { b0: bar, b1: null };
      markBars(); env.render();
      return;
    }
    const ns = quantize(L.part).filter((n) => n.t <= x + 1e-6 && x < n.t + n.d - 1e-6);
    if (!ns.length) { L.sel = null; L.restAt = x; env.render(); return; } // пауза — сюда можно поставить ноту
    const pc = note ? ((note.realValue % 12) + 12) % 12 : null;
    const n = (pc != null && ns.find((q) => q.m % 12 === pc)) || ns[ns.length - 1];
    L.sel = L.part.raw[n.i]; L.restAt = null;
    env.render();
  }
  function onBeat(beat) { setTimeout(() => { pick(beat, L.pend); L.pend = null; }, 0); }
  function onNote(note) { L.pend = note; }

  // такты на стане: полупрозрачные прямоугольники поверх выбранных
  function markBars() {
    const AT = env.AT, el = AT.el;
    if (!el) return;
    el.querySelectorAll('.lvbar').forEach((x) => x.remove());
    const lk = AT.api && AT.api.renderer && AT.api.renderer.boundsLookup;
    if (!L.bars || !lk) return;
    const b1 = L.bars.b1 == null ? L.bars.b0 : L.bars.b1;
    (lk.staffSystems || []).forEach((sys) => (sys.bars || []).forEach((mb) => {
      if (mb.index < L.bars.b0 || mb.index > b1) return;
      const r = mb.realBounds || mb.visualBounds, d = document.createElement('i');
      d.className = 'lvbar';
      Object.assign(d.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      el.appendChild(d);
    }));
  }

  /* ---------- разметка ---------- */

  const icb = (a, ic, label, cls = 'sm') => env.icb(a, ic, label, cls);
  function noteBar() {
    const p = L.part, i = p.raw.indexOf(L.sel);
    if (i < 0) { L.sel = null; return ''; }
    L.lastM = L.sel.m;
    const ns = quantize(p), k = ns.findIndex((n) => n.i === i), n = ns[k], tf = n ? tabOf(p, ns)[k] : null;
    return '<div class="lvbar2" role="toolbar" aria-label="' + esc(t('live.note')) + '">' + icb('data-x="lvdesel"', ICON.close, t('live.done')) +
      '<div class="vrow tight">' + icb('data-x="lvpitch" data-d="-1"', ICON.down, t('live.lower')) + '<b class="num lvv">' + esc(mName(L.sel.m)) + '</b>' + icb('data-x="lvpitch" data-d="1"', ICON.up, t('live.higher')) + '</div>' +
      '<div class="vrow tight">' + icb('data-x="lvlen" data-d="-1"', ICON.left, t('live.shorter')) + '<b class="num lvv">' + (n ? FR(n.d) : '') + '</b>' + icb('data-x="lvlen" data-d="1"', ICON.right, t('live.longer')) + '</div>' +
      (p.tuning && tf ? '<div class="vrow tight">' + icb('data-x="lvstr" data-d="1"', ICON.up, t('live.strUp')) + '<b class="num lvv">' + esc(t('live.sf', { s: tf.s, f: tf.f })) + '</b>' + icb('data-x="lvstr" data-d="-1"', ICON.down, t('live.strDown')) + '</div>' : '') +
      icb('data-x="lvdel"', ICON.trash, t('delete')) + icb('data-x="lvundo"', ICON.undo, t('live.undo')) + '</div>';
  }
  function barsBar() {
    const b = L.bars, b1 = b.b1 == null ? b.b0 : b.b1;
    return '<div class="lvbar2" role="toolbar">' + icb('data-x="lvbars0"', ICON.close, t('live.done')) +
      '<span class="lvv grow">' + esc(b.b0 === b1 ? t('live.bar1', { a: b.b0 + 1 }) : t('live.barsN', { a: b.b0 + 1, b: b1 + 1 })) + '</span>' +
      '<button class="btn sm" data-x="lvbdel">' + esc(t('delete')) + '</button><button class="btn sm fill" data-x="lvrerec">' + esc(t('live.rerec', { n: b.b0 + 1 })) + '</button>' + icb('data-x="lvundo"', ICON.undo, t('live.undo')) + '</div>';
  }
  function mainBar() {
    const cf = defaults(), p = L.part, rec = L.phase === 'rec' || L.phase === 'count';
    const big = '<button class="bigplay lvrec' + (rec ? ' on' : '') + '" data-x="' + (rec ? 'lvstop' : 'lvrec') + '" aria-label="' + esc(t(rec ? 'live.stop' : 'live.rec')) + '">' + (rec ? ICON.stop : ICON.rec) + '</button>';
    if (rec) {
      return '<div class="lvbar2 rec">' + big + '<span class="num lvpos" id="lvpos" aria-live="off"></span><span class="lvpitch num" id="lvpitch"></span>' +
        '<span class="l2 lvhint">' + esc(t(L.phase === 'count' ? 'live.count' : L.live && L.live.src === 'midi' ? 'live.listenMidi' : 'live.listen')) + '</span></div>';
    }
    if (L.restAt != null && p) return '<div class="lvbar2">' + icb('data-x="lvdesel"', ICON.close, t('live.done')) + '<span class="lvv grow">' + esc(t('live.restHint')) + '</span><button class="btn sm fill" data-x="lvadd">' + ICON.plus.replace('<svg', '<svg style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.4"') + ' ' + esc(t('live.add')) + '</button></div>';
    const bpm = p ? Math.round(p.bpm) : cf.bpm, has = p && p.raw.length;
    return '<div class="lvbar2">' + big + (has ? env.playBtns() : '') +
      '<button class="chip lvchip" data-x="lvset" aria-label="' + esc(t('live.settings')) + '">' + (cf.metro || has ? '♩ ' + bpm : esc(t('live.free'))) + '</button>' +
      (has ? '<span class="sgrow"></span>' + icb('data-x="lvbars"', ICON.bars, t('live.bars')) + icb('data-x="lvundo"', ICON.undo, t('live.undo')) + icb('data-x="lvshare"', ICON.share, t('live.export')) : '<span class="l2 lvhint">' + esc(t('live.src.' + cf.src)) + '</span>') + '</div>';
  }

  function body() {
    const p = L.part, AT = env.AT, g = p ? gridOf(p) : null;
    const head = '<div class="ntools">' + icb('data-x="tlist"', env.I.list, t('tabFiles')) + '<span class="sgrow aname" style="text-align:left">' + esc(L.rec && !L.rec.tmp ? L.rec.name : t('live.title')) + '</span>' +
      (p && p.raw.length ? '<button class="chip lvchip" data-x="lvgrid" aria-label="' + esc(t('live.grid')) + '">' + esc(p.grid === 'auto' ? t('grid.autoN', { g: t('grid.' + g) }) : t('grid.' + g)) + '</button>' : '') +
      (p && p.tuning ? '<button class="ic txt sm' + (env.st().liveProf !== 'score' ? ' act' : '') + '" data-x="lvprof" aria-label="' + esc(t('scoreTab')) + '">' + esc(env.st().liveProf === 'score' ? '♪' : env.st().liveProf === 'tab' ? 'T' : '♪+T') + '</button>' : '') +
      icb('data-x="lvset"', ICON.gear, t('live.settings')) + '</div>';
    const empty = !p || (!p.raw.length && L.phase !== 'rec' && L.phase !== 'count');
    const surf = empty ? '<div class="lvempty"><p>' + esc(t(defaults().src === 'mic' ? 'live.emptyMic' : 'live.emptyMidi')) + '</p></div>'
      : '<div class="atwrap" id="atSlot">' + (AT.state === 'loading' ? '<div class="atload">' + C().ui.loader('beat', '') + '</div>' : '') + '</div>';
    const bar = L.sel && L.phase === 'edit' ? noteBar() : L.bars && L.phase === 'edit' ? barsBar() : mainBar();
    return '<div class="lvwrap">' + head + surf + bar + '</div>';
  }

  /* ---------- настройки и выгрузка ---------- */

  function setSheet() {
    const { ui } = C(), cf = defaults(), p = L.part, locked = p && p.raw.length;
    const row = (label, html) => '<div class="cell"><span class="grow">' + esc(label) + '</span>' + html + '</div>';
    const body = () => {
      const tuns = TUNS[cf.inst];
      return ui.snav(t('live.settings')) +
        '<div class="group">' + '<div class="cellcol">' + ui.seg('lvsrc', [['mic', t('live.src.mic')], ['midi', t('live.src.midi')]], cf.src, t('live.src')) + '</div></div>' +
        '<div class="hdr">' + esc(t('live.inst')) + '</div><div class="group"><div class="cellcol">' + ui.seg('lvinst', Object.keys(INSTS).map((k) => [k, t('live.inst.' + k)]), cf.inst, t('live.inst')) + '</div>' +
        (tuns ? '<div class="cellcol">' + ui.seg('lvtun', tuns.map((x) => [x, x.replace(/\d/g, '')]), cf.tun, t('live.tuning')) + '</div>' +
          row(t('live.capo'), '<div class="vrow tight">' + icb('data-x="lvcapo" data-d="-1"', env.I.minus, t('live.capo')) + '<b class="num lvv">' + cf.capo + '</b>' + icb('data-x="lvcapo" data-d="1"', env.I.plus, t('live.capo')) + '</div>') : '') + '</div>' +
        '<div class="hdr">' + esc(t('live.rhythm')) + '</div><div class="group">' + row(t('live.metro'), ui.sw('lvmet', cf.metro, t('live.metro'))) +
        row(t('live.bpm'), '<div class="vrow tight">' + icb('data-x="lvbpm" data-d="-1"', env.I.minus, t('live.bpm')) + '<b class="num lvv">' + (locked ? Math.round(p.bpm) : cf.bpm) + '</b>' + icb('data-x="lvbpm" data-d="1"', env.I.plus, t('live.bpm')) + '</div>') +
        '<div class="cellcol">' + ui.seg('lvnum', [['2', '2/4'], ['3', '3/4'], ['4', '4/4']], String(locked ? p.num : cf.num), t('live.size')) + '</div>' +
        row(t('live.countIn'), ui.seg('lvcnt', [['0', '0'], ['1', '1'], ['2', '2']], String(cf.cnt), t('live.countIn'))) + '</div>' +
        '<p class="ftr">' + esc(t(cf.metro ? 'live.metroFtr' : 'live.freeFtr')) + '</p>';
    };
    ui.sheet(body, (el, sh) => {
      const upd = () => { C().store.save(); sh.update(); env.render(); };
      el.addEventListener('click', (e) => {
        let b;
        if ((b = e.target.closest('[data-seg="lvsrc"] [data-v]'))) { cf.src = b.dataset.v; if (p && !p.raw.length) p.mono = cf.src === 'mic'; upd(); }
        else if ((b = e.target.closest('[data-seg="lvinst"] [data-v]'))) { cf.inst = b.dataset.v; cf.tun = null; defaults(); if (p) applyInst(); upd(); }
        else if ((b = e.target.closest('[data-seg="lvtun"] [data-v]'))) { cf.tun = b.dataset.v; if (p) applyInst(); upd(); }
        else if ((b = e.target.closest('[data-seg="lvnum"] [data-v]'))) { cf.num = +b.dataset.v; if (p) { p.num = cf.num; draw(); save(); } upd(); }
        else if ((b = e.target.closest('[data-seg="lvcnt"] [data-v]'))) { cf.cnt = +b.dataset.v; upd(); }
        else if ((b = e.target.closest('[data-x="lvcapo"]'))) { cf.capo = Math.max(0, Math.min(12, cf.capo + +b.dataset.d)); if (p) { p.capo = cf.capo; draw(); save(); } upd(); }
        else if ((b = e.target.closest('[data-x="lvbpm"]'))) {
          const v = Math.max(30, Math.min(300, Math.round((locked ? p.bpm : cf.bpm) + +b.dataset.d)));
          if (locked) { edit((q) => setTempo(q, v)); } else cf.bpm = v;
          upd();
        }
      });
      el.addEventListener('change', (e) => { if (e.target.dataset.sw === 'lvmet') { cf.metro = e.target.checked; upd(); } });
    });
  }
  function applyInst() {
    const cf = defaults(), p = L.part;
    p.inst = cf.inst; p.tuning = cf.tun ? cf.tun.split(' ').map(parseN) : INSTS[cf.inst].tuning; p.capo = cf.capo;
    p.raw.forEach((r) => { delete r.s; delete r.f; });
    draw(); save();
  }
  function gridSheet() {
    const { ui } = C(), p = L.part;
    ui.sheet(() => ui.snav(t('live.grid')) + '<div class="group"><div class="cellcol">' + ui.seg('lvg', [['auto', t('grid.auto')], ...Object.keys(GRIDS).map((k) => [k, t('grid.' + k)])], p.grid, t('live.grid')) + '</div></div>' +
      '<div class="hdr">' + esc(t('live.str')) + '</div><div class="group sgroup"><div class="sslider"><div class="ssl"><span>' + esc(t('live.str')) + '</span><b class="num" id="lvstrv">' + Math.round(p.str * 100) + '%</b></div>' +
      '<input type="range" class="range" id="lvstr" min="0" max="1" step="0.05" value="' + p.str + '" aria-label="' + esc(t('live.str')) + '"></div></div><p class="ftr">' + esc(t('live.strFtr')) + '</p>',
    (el, sh) => {
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-seg="lvg"] [data-v]'); if (b) { edit((q) => { q.grid = b.dataset.v; }); sh.update(); } });
      el.addEventListener('input', (e) => { if (e.target.id === 'lvstr') { p.str = +e.target.value; el.querySelector('#lvstrv').textContent = Math.round(p.str * 100) + '%'; save(); } });
    });
  }
  function shareSheet() {
    const { ui } = C(), p = L.part, name = (L.rec && L.rec.name) || t('live.title');
    ui.sheet(() => ui.snav(t('live.export')) + '<div class="group"><button class="cell act" data-k="xml">MusicXML</button><button class="cell act" data-k="mid">MIDI</button>' +
      (C().hasTool('looper') ? '<button class="cell act" data-k="studio">' + esc(t('toStudio')) + '</button>' : '') + '</div><p class="ftr">' + esc(t('live.exportFtr')) + '</p>',
    (el, sh) => el.addEventListener('click', async (e) => {
      const k = e.target.closest('[data-k]');
      if (!k) return;
      sh.close();
      const fn = name.replace(/[\\/:*?"<>|]/g, '-');
      if (k.dataset.k === 'xml') C().sendFile(new TextEncoder().encode(xml()), fn + '.musicxml', fn, 'application/vnd.recordare.musicxml+xml');
      else if (k.dataset.k === 'mid') C().sendFile(writeMidi(partEvents(p), { name: fn }), fn + '.mid', fn, 'audio/midi');
      else { const pj = projectFromSong(partSong(p, name)); C().projects.save(pj); C().ui.toast(t('dawOpened')); C().openIn('looper', { inbox: { kind: 'proj', pid: pj.id, temp: true } }); } // в лупер: партией в свободную петлю
    }));
  }

  /* ---------- действия ---------- */

  function nudgeLen(d) {
    const p = L.part, i = p.raw.indexOf(L.sel), n = quantize(p).find((q) => q.i === i);
    if (!n) return;
    const step = 1 / GRIDS[gridOf(p)];
    edit((q) => setLen(q, i, Math.max(step, n.d + d * step)));
  }
  function nudgeStr(d) {
    const p = L.part, i = p.raw.indexOf(L.sel), ns = quantize(p), k = ns.findIndex((q) => q.i === i), tf = k >= 0 ? tabOf(p, ns)[k] : null;
    if (!tf) return;
    const s = tf.s + d, idx = p.tuning.length - s;
    if (idx < 0 || idx >= p.tuning.length) return;
    const f = L.sel.m - p.tuning[idx] - (p.capo || 0);
    if (f < 0 || f > 24) { C().ui.toast(t('live.noFret')); return; }
    edit((q) => setFret(q, i, s, f));
  }
  function nudgePitch(d) {
    const p = L.part, i = p.raw.indexOf(L.sel), r = L.sel;
    if (r.s && r.f != null && r.f + d >= 0 && r.f + d <= 24) edit((q) => setFret(q, i, r.s, r.f + d)); // на той же струне
    else edit((q) => setPitch(q, i, r.m + d));
  }

  function act(a, el) {
    const p = L.part;
    switch (a) {
      case 'lvnew': L.part = null; L.rec = { tmp: true, id: 'live-tmp', kind: 'tab', fmt: 'live', name: t('live.title') }; env.AT.cur = L.rec; env.AT.state = 'idle'; L.phase = 'idle'; L.sel = null; L.bars = null; env.render(); return true;
      case 'lvrec': start(); return true;
      case 'lvstop': stop(); return true;
      case 'lvset': setSheet(); return true;
      case 'lvgrid': gridSheet(); return true;
      case 'lvshare': shareSheet(); return true;
      case 'lvprof': { const s = env.st(); s.liveProf = s.liveProf === 'score' ? 'both' : s.liveProf === 'tab' ? 'score' : 'tab'; C().store.save(); draw(); env.render(); return true; }
      case 'lvundo': undo(); return true;
      case 'lvdesel': L.sel = null; L.restAt = null; env.render(); return true;
      case 'lvpitch': nudgePitch(+el.dataset.d); return true;
      case 'lvlen': nudgeLen(+el.dataset.d); return true;
      case 'lvstr': nudgeStr(+el.dataset.d); return true;
      case 'lvdel': { const i = p.raw.indexOf(L.sel); L.sel = null; edit((q) => delNote(q, i)); return true; }
      case 'lvadd': { // нота на месте паузы: высота — прошлой правки или середина инструмента, длина — деление сетки
        const step = 1 / GRIDS[gridOf(p)], m = L.lastM || (p.tuning ? p.tuning[Math.floor(p.tuning.length / 2)] + 2 : 60), at = Math.round(L.restAt * GRIDS[gridOf(p)]) / GRIDS[gridOf(p)];
        L.restAt = null;
        edit((q) => addNote(q, at, m, step));
        L.sel = p.raw.find((r) => Math.abs(r.t - at * 60 / p.bpm) < 1e-6 && r.m === m) || null;
        env.render();
        return true;
      }
      case 'lvbars': L.sel = null; L.restAt = null; L.bars = { b0: 0, b1: null }; markBars(); env.render(); C().ui.toast(t('live.barsPick')); return true;
      case 'lvbars0': L.bars = null; markBars(); env.render(); return true;
      case 'lvbdel': { const b = L.bars, b1 = (b.b1 == null ? b.b0 : b.b1) + 1; L.bars = null; markBars(); edit((q) => delBars(q, b.b0, b1)); return true; }
      case 'lvrerec': { const b0 = L.bars.b0; L.bars = null; markBars(); start(b0); return true; }
    }
    return false;
  }

  return {
    get active() { return !!(env.AT.cur && env.AT.cur.fmt === 'live'); },
    get busy() { return L.phase === 'rec' || L.phase === 'count'; },
    get part() { return L.part; },
    body, act, midiIn, onBeat, onNote, markBars,
    // файл партии из «Табов» — в правку
    open(rec) {
      if (L.live) return;
      L.rec = rec; L.part = rec.live ? JSON.parse(JSON.stringify(rec.live)) : fresh(); L.phase = 'edit'; L.sel = null; L.bars = null; L.undo = [];
      env.AT.cur = rec; env.AT.state = 'loading';
      env.render();
      draw();
    },
    // окно закрыто или файл сменили: запись останавливается и сохраняется
    close() { if (L.live) stop(); },
    barsOf: () => (L.part ? barsOf(L.part) : 0),
  };
}
