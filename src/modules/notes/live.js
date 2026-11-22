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
import { jpegsToPdf } from '../../music/pdfwriter.js';
import { every, cancel } from '../../audio/clock.js';
import { copyBars, pasteBars, newPart, quantize, gridOf, GRIDS, INSTS, guessTempo, autoGrid, partXML, partEvents, partSong, tabOf, barsOf,
  setPitch, setLen, setFret, delNote, addNote, delBars, cutFrom, insertAt, setTempo } from '../../music/livescore.js';
import { writeMidi } from '../../music/midi.js';
import { projectFromSong } from '../../music/project.js';
import { parseN, mName, SH, FL } from '../../music/notes.js';
import { newInput, enterPitch as inEnter, enterFret as inFret, atCursor as inAt, pianoKeys, shiftBase, baseAtPc, shiftFret, FRET_WIN, KB_VIEWS,
  rest as inRest, tie as inTie, back as inBack, moveTo as inMove, posOf as inPos, durBeats, scaleKeys, startBase, octaveOf } from '../../music/noteinput.js';

const TUNS = {
  guitar: ['E2 A2 D3 G3 B3 E4', 'D2 A2 D3 G3 B3 E4', 'E♭2 A♭2 D♭3 G♭3 B♭3 E♭4', 'D2 G2 C3 F3 A3 D4', 'D2 A2 D3 G3 A3 D4', 'D2 G2 D3 G3 B3 D4', 'B1 E2 A2 D3 G3 B3 E4'],
  bass: ['E1 A1 D2 G2', 'D1 A1 D2 G2', 'B0 E1 A1 D2 G2'],
  ukulele: ['G4 C4 E4 A4', 'G3 C4 E4 A4'],
};
const DURS = [[4, '1'], [2, '1/2'], [1, '1/4'], [0.5, '1/8'], [0.25, '1/16']]; // длительность в долях-четвертях
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
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M20 6H9l-6 6 6 6h11z"/><path d="M13 10l4 4M17 10l-4 4"/></svg>',
};
const FIFTHSFLAT = (k) => [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5][k.minor ? (k.pc + 3) % 12 : k.pc] < 0; // тональность с бемолями — названия бемолями
const FR = (b) => { // доли → доля целой: 1/8, 3/8, 1/4…
  const x = b / 4, den = [1, 2, 4, 8, 16, 32, 3, 6, 12, 24, 48].find((d) => Math.abs(x * d - Math.round(x * d)) < 1e-6) || 48, n = Math.round(x * den);
  const g = (a, c) => (c ? g(c, a % c) : a), k = g(n, den);
  return n / k + (den / k === 1 ? '' : '/' + den / k);
};

export function createLive(env) {
  const L = { part: null, rec: null, phase: 'idle', sel: null, bars: null, undo: [], live: null, pitch: null, pend: null, saveT: 0, inp: null, pingN: 0, drawQ: 0 };
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
    if (L.inp) { const ns = quantize(L.part); L.inp.beat = ns.reduce((a, n) => Math.max(a, n.t + n.d), 0); L.inp.prev = ns.length ? ns[ns.length - 1].m : null; } // ввод: курсор — за последней нотой
    draw(); save(); env.render(); markBars();
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
        mic = await createMicNotes({ mode: C().audio.mixer.state.mode, open: () => C().mic.request(cf.micDev || ''), a4: C().a4 ? C().a4() : 440,
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
    if (L.inp) { inMove(L.part, L.inp, x); markBars(); env.render(); return; } // ввод нот: касание по стану — курсор сюда
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
    el.querySelectorAll('.lvbar,.lvcur').forEach((x) => x.remove());
    const lk = AT.api && AT.api.renderer && AT.api.renderer.boundsLookup;
    if (!lk) return;
    if (L.inp && L.part && L.phase === 'edit') markCursor(el, lk);
    if (!L.bars) return;
    const b1 = L.bars.b1 == null ? L.bars.b0 : L.bars.b1;
    (lk.staffSystems || []).forEach((sys) => (sys.bars || []).forEach((mb) => {
      if (mb.index < L.bars.b0 || mb.index > b1) return;
      const r = mb.realBounds || mb.visualBounds, d = document.createElement('i');
      d.className = 'lvbar';
      Object.assign(d.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      el.appendChild(d);
    }));
  }
  // Ввод нот: курсор — линия у места следующей ноты и лёгкая подсветка такта; стан доскролливается до него
  function markCursor(el, lk) {
    try {
      const p = L.part, bar = Math.floor(L.inp.beat / p.num + 1e-6), tick = L.inp.beat * 960 * (4 / p.den);
      (lk.staffSystems || []).forEach((sys) => (sys.bars || []).forEach((mb) => {
        if (mb.index !== bar) return;
        const r = mb.realBounds || mb.visualBounds, bb = (mb.bars || [])[0], bts = bb ? bb.beats || [] : [];
        const f = bts.find((q) => Math.abs(q.beat.absolutePlaybackStart - tick) < 2) || bts.find((q) => q.beat.absolutePlaybackStart > tick);
        const soft = document.createElement('i'); soft.className = 'lvbar lvsoft';
        Object.assign(soft.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
        const cur = document.createElement('i'); cur.className = 'lvcur';
        const x = f ? (f.realBounds || f.visualBounds).x : r.x + r.w - 3;
        Object.assign(cur.style, { left: x - 1 + 'px', top: r.y + 'px', height: r.h + 'px' });
        el.appendChild(soft); el.appendChild(cur);
        if (cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }));
    } catch (e) { /* курсор — подсказка, стан и без него работает */ }
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
      icb('data-x="lvdel"', ICON.trash, t('delete')) + icb('data-x="lvundo"', ICON.undo, t('live.undo')) +
      '<button class="chip lvchip' + (L.sel.tech === 'b' ? ' on' : '') + '" data-x="lvbend" aria-pressed="' + (L.sel.tech === 'b') + '" aria-label="' + esc(t('live.bend')) + '">' + esc(t('live.bend')) + '</button>' +
      '<div class="vrow tight lvdurs" role="group" aria-label="' + esc(t('live.dur')) + '">' + DURS.map(([b, l]) => '<button class="chip lvchip' + (n && Math.abs(n.d - b) < 1e-6 ? ' on' : '') + '" data-x="lvdur" data-b="' + b + '" aria-label="' + esc(t('live.dur') + ' ' + l) + '">' + l + '</button>').join('') + '</div></div>';
  }
  // Ввод нот (под станом, две полосы жестов): длительности значками · пауза, лига, шаг назад · клавиши только из нот тональности
  // (смахнуть вверх — диез, вниз — бемоль, вбок по полосе — октава); ♭ ♯ и ‹ › — для тех, кто жест не знает
  const GL = { // значки длительностей: целая, половинная, четверть, восьмая, шестнадцатая
    4: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="6" ry="4.2" fill="none"/></svg>',
    2: '<svg viewBox="0 0 24 24"><ellipse cx="10" cy="17" rx="4.6" ry="3.4" fill="none"/><path d="M14.4 16.2V4"/></svg>',
    1: '<svg viewBox="0 0 24 24"><ellipse cx="10" cy="17" rx="4.6" ry="3.4" fill="currentColor"/><path d="M14.4 16.2V4"/></svg>',
    0.5: '<svg viewBox="0 0 24 24"><ellipse cx="9" cy="17.5" rx="4.4" ry="3.2" fill="currentColor"/><path d="M13.2 16.8V4c0 4 5 4.5 5 9"/></svg>',
    0.25: '<svg viewBox="0 0 24 24"><ellipse cx="9" cy="18" rx="4.4" ry="3.2" fill="currentColor"/><path d="M13.2 17.3V3.5M13.2 4c0 4 5 4.5 5 8M13.2 9c0 4 5 4.5 5 8"/></svg>',
  };
  const IC = { next: '<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg>', rest: '<svg viewBox="0 0 24 24"><path d="M9 4l5 5-4 4 5 5-3 2"/></svg>', tie: '<svg viewBox="0 0 24 24"><path d="M4 9c3 9 13 9 16 0"/></svg>', ok: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' };
  const FRET_DOTS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
  // Новый ввод: вид клавиш, режим (гриф у струнных) и «аккорд» — как выбрано в прошлый раз
  const mkInput = (beat) => { const c = cfg(), p = L.part; return newInput(beat, p, { kb: c.inKb, mode: c.inMode || (p && p.tuning ? 'fret' : 'keys'), stack: c.inStack }); };
  function inpBar() {
    const p = L.part, I = L.inp, pos = inPos(p, I), dl = DURS.find(([b]) => b === I.dur)[1] + (I.dot ? '.' : ''), fret = I.mode === 'fret' && !!p.tuning;
    const k = (a, label, aria, cls = '', extra = '') => '<button class="lvk ' + cls + '" data-x="' + a + '"' + extra + ' aria-label="' + esc(aria) + '">' + label + '</button>';
    const chip = (a, label, aria, on, extra = '') => '<button class="chip lvchip" data-x="' + a + '"' + extra + ' aria-label="' + esc(aria) + '"' + (on == null ? '' : ' aria-pressed="' + on + '"') + (on ? ' style="--on:1"' : '') + '>' + label + '</button>';
    const accTxt = I.acc === 1 ? ' ♯' : I.acc === -1 ? ' ♭' : '';
    const names = (p.key && FIFTHSFLAT(p.key)) ? FL : SH;
    // верх: где курсор · вид (клавиши / гриф) · вид клавиш · аккорд · с какой ноты окно
    const top = '<div class="lvst"><b>' + esc(t('live.in.state', { d: dl, b: pos.bar, n: pos.beat })) + accTxt + '</b><span class="lvch">' +
      (p.tuning ? chip('lvinmode', esc(t('live.in.mode.' + (fret ? 'fret' : 'keys'))), t('live.in.mode'), null) : '') +
      (fret ? '' : chip('lvinkb', esc(t('live.in.kb.' + I.kb)), t('live.in.kb'), null)) +
      chip('lvinstack', esc(t('live.in.stack')), t('live.in.stackHint'), !!I.stack) +
      (fret || I.kb === 'deg' ? '' : chip('lvinpick', esc(names[I.base % 12] + octaveOf(I.base)), t('live.in.start'), !!I.pick)) +
      '<button class="chip lvchip lvdone" data-x="lvinend" aria-label="' + esc(t('live.done')) + '">' + IC.ok + '</button></span></div>';
    const pick = !fret && I.pick && I.kb !== 'deg' ? '<div class="lvkr lvpick" role="group" aria-label="' + esc(t('live.in.start')) + '">' + names.map((n, pc) => '<button class="lvk sm' + (I.base % 12 === pc ? ' on' : '') + '" data-x="lvinpc" data-pc="' + pc + '" aria-label="' + esc(n) + '">' + esc(n) + '</button>').join('') + '</div>' : '';
    const durs = '<div class="lvkr">' + DURS.map(([b]) => k('lvindur', GL[b], t('live.in.dur') + ' ' + FR(b), 'dr' + (I.dur === b ? ' on' : ''), ' data-b="' + b + '" aria-pressed="' + (I.dur === b) + '"')).join('') +
      k('lvindot', '•', t('live.in.dot'), 'dr' + (I.dot ? ' on' : ''), ' aria-pressed="' + I.dot + '"') + '</div>';
    const acts = '<div class="lvkr">' + (fret ? '' : k('lvinacc', '♭', t('live.in.flat'), 'sm' + (I.acc === -1 ? ' on' : ''), ' data-a="-1" aria-pressed="' + (I.acc === -1) + '"') + k('lvinacc', '♯', t('live.in.sharp'), 'sm' + (I.acc === 1 ? ' on' : ''), ' data-a="1" aria-pressed="' + (I.acc === 1) + '"')) +
      k('lvinrest', IC.rest, t('live.in.rest'), 'ico') + (I.stack ? k('lvinnext', IC.next, t('live.in.next'), 'ico') : k('lvintie', IC.tie, t('live.in.tie'), 'ico')) + k('lvinback', ICON.back, t('live.in.back'), 'ico') + '</div>';
    return '<div class="lvkp" role="group" aria-label="' + esc(t('live.in')) + '">' + top + pick + durs + (fret ? fretGrid() : keyStrip(names)) + acts + '</div>';
  }
  // Клавиши: пианино (белые и чёрные, подпись октавы у «до»), ступени тональности или только буквы; окно — с любой ноты
  function keyStrip(names) {
    const p = L.part, I = L.inp;
    if (I.kb === 'deg') {
      const base = startBase(p, I.base);
      return '<div class="lvkeys" role="group" aria-label="' + esc(t('live.in.keys')) + '">' + scaleKeys(p, base).map((x) => '<button class="lvkey' + (x.tonic ? ' tn' : '') + '" data-m="' + x.m + '" aria-label="' + esc(x.label + octaveOf(x.m)) + '"><b>' + esc(x.label) + (x.tonic && x.m % 12 === (p.key ? p.key.pc : 0) && x.deg === 1 ? '<sub>' + octaveOf(x.m) + '</sub>' : '') + '</b><small>' + x.deg + '</small></button>').join('') + '</div>';
    }
    const ks = pianoKeys(p, I.base, 8, { blacks: I.kb === 'piano' });
    const W = 8, pc = (x) => (x / W * 100).toFixed(3) + '%';
    return '<div class="lvpiano ' + I.kb + '" role="group" aria-label="' + esc(t('live.in.keys')) + '">' + ks.sort((a, b) => a.black - b.black).map((x) =>
      '<button class="lvpk' + (x.black ? ' bk' : '') + (x.tonic ? ' tn' : '') + '" data-m="' + x.m + '" style="left:' + pc(Math.max(0, x.x)) + ';width:' + pc(Math.min(W, x.x + x.w) - Math.max(0, x.x)) + '" aria-label="' + esc(x.label + x.oct) + '">' +
      (x.black ? '' : '<b>' + esc(x.label) + (x.c ? '<sub>' + x.oct + '</sub>' : '') + '</b>') + '</button>').join('') + '</div>';
  }
  // Гриф: струны сверху вниз (тонкая — вверху, как в табах) × лады окна; касание ставит ноту, смахнуть вбок — другие лады
  function fretGrid() {
    const p = L.part, I = L.inp, n = p.tuning.length, cap = p.capo || 0, at = inAt(p, I), names = (p.key && FIFTHSFLAT(p.key)) ? FL : SH;
    const cols = Array.from({ length: FRET_WIN }, (_, j) => I.f0 + j);
    let h = '<div class="lvfret" style="--n:' + n + '" role="group" aria-label="' + esc(t('live.in.fretboard')) + '"><span class="lvfh"></span>' +
      cols.map((f) => '<button class="lvfh' + (FRET_DOTS.includes(f) ? ' dot' : '') + '" data-x="lvinf0" data-f="' + f + '" aria-label="' + esc(t('live.in.fret', { f })) + '">' + f + '</button>').join('');
    for (let s = 1; s <= n; s++) {
      const open = p.tuning[n - s] + cap;
      h += '<span class="lvfs">' + esc(names[((open % 12) + 12) % 12]) + '</span>' + cols.map((f) => {
        const on = at.some((x) => x.s === s && x.f === f);
        return '<button class="lvfc' + (on ? ' on' : '') + (f === 0 ? ' op' : '') + '" data-s="' + s + '" data-f="' + f + '" aria-label="' + esc(t('live.sf', { s, f })) + '"' + (on ? ' aria-pressed="true"' : '') + '><i></i><b>' + f + '</b></button>';
      }).join('');
    }
    return h + '</div>';
  }
  // Жесты клавиш: касание — нота; вверх/вниз — октава (окно сдвигается, надпись у «до»); вправо — диез, влево — бемоль (на эту ноту).
  // Гриф: касание — нота; вбок — другие лады. Верхняя строка: вбок — окно клавиш по полутону
  let keysHost = null;
  function bindKeys() {
    const h = env.host && env.host();
    if (!h || h === keysHost) return;
    keysHost = h;
    let g = null;
    const buzz = () => { try { navigator.vibrate && navigator.vibrate(8); } catch { /* */ } };
    h.addEventListener('pointerdown', (e) => {
      if (!L.inp) return;
      const tg = e.target.closest && e.target.closest('.lvpk, .lvkey, .lvfc, .lvfret, .lvst');
      if (!tg) return;
      const cell = e.target.closest('.lvpk, .lvkey, .lvfc');
      g = { id: e.pointerId, x: e.clientX, y: e.clientY, el: cell, area: tg.classList.contains('lvst') ? 'st' : tg.closest('.lvfret') ? 'fret' : 'keys', ax: e.clientX, sh: 0, moved: false };
      if (cell) cell.classList.add('dn');
    });
    h.addEventListener('pointermove', (e) => {
      if (!g || e.pointerId !== g.id) return;
      const dy = e.clientY - g.y, dx = e.clientX - g.x;
      if (g.area === 'st' && L.inp) { // строка состояния: тянуть вбок — окно клавиш по полутону
        const stp = Math.trunc((e.clientX - g.ax) / 18);
        if (stp) { g.ax += stp * 18; g.moved = true; shiftBase(L.inp, -stp); env.render(); }
        return;
      }
      if (!g.el) return;
      if (g.area === 'fret') { g.el.dataset.sw = Math.abs(dx) > 26 ? '↔' : ''; return; }
      g.el.dataset.sw = Math.abs(dy) > 26 && Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? '↑' : '↓') : Math.abs(dx) > 26 ? (dx > 0 ? '♯' : '♭') : '';
    });
    const end = (e, ok) => {
      if (!g || e.pointerId !== g.id) return;
      const s = g; g = null;
      if (s.el) { s.el.classList.remove('dn'); delete s.el.dataset.sw; }
      if (!ok || !L.inp || !L.part || s.moved || s.area === 'st') return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y, I = L.inp;
      if (s.area === 'fret') {
        if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) { shiftFret(I, dx < 0 ? 3 : -3); env.render(); buzz(); return; }
        if (!s.el || !s.el.dataset.s) return;
        const m = inEdit((q, X) => inFret(q, X, +s.el.dataset.s, +s.el.dataset.f));
        ping(m, durBeats(I) || 1); return;
      }
      if (!s.el) return;
      if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx) * 1.2) { shiftBase(I, dy < 0 ? 12 : -12); env.render(); buzz(); return; } // вверх — октава выше
      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.2) I.acc = dx > 0 ? 1 : -1; // вправо — диез, влево — бемоль
      const m = inEdit((q, X) => inEnter(q, X, +s.el.dataset.m));
      ping(m, durBeats(L.inp) || 1);
    };
    h.addEventListener('pointerup', (e) => end(e, true));
    h.addEventListener('pointercancel', (e) => end(e, false));
  }
  function barsBar() {
    const b = L.bars, b1 = b.b1 == null ? b.b0 : b.b1;
    return '<div class="lvbar2" role="toolbar">' + icb('data-x="lvbars0"', ICON.close, t('live.done')) +
      '<span class="lvv grow">' + esc(b.b0 === b1 ? t('live.bar1', { a: b.b0 + 1 }) : t('live.barsN', { a: b.b0 + 1, b: b1 + 1 })) + '</span>' +
      '<button class="btn sm" data-x="lvbcopy">' + esc(t('live.copy')) + '</button>' + (L.clip ? '<button class="btn sm" data-x="lvbpaste">' + esc(t('live.paste')) + '</button>' : '') + '<button class="btn sm" data-x="lvbdel">' + esc(t('delete')) + '</button><button class="btn sm fill" data-x="lvrerec">' + esc(t('live.rerec', { n: b.b0 + 1 })) + '</button>' + icb('data-x="lvundo"', ICON.undo, t('live.undo')) + '</div>';
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
      (has || (p && p.minBars) ? '<span class="sgrow"></span>' + icb('data-x="lvinput"', ICON.pen, t('live.in')) + '<button class="btn sm" data-x="lvbaradd">' + esc(t('live.barAdd')) + '</button>' + icb('data-x="lvbars"', ICON.bars, t('live.bars')) + icb('data-x="lvundo"', ICON.undo, t('live.undo')) + icb('data-x="lvshare"', ICON.share, t('live.export')) : '<span class="l2 lvhint">' + esc(t('live.src.' + cf.src)) + '</span>') + '</div>';
  }

  function body() {
    const p = L.part, AT = env.AT, g = p ? gridOf(p) : null;
    const head = '<div class="ntools">' + icb('data-x="tlist"', env.I.list, t('tabFiles')) + '<span class="sgrow aname" style="text-align:left">' + esc(L.rec && !L.rec.tmp ? L.rec.name : t('live.title')) + '</span>' +
      (p && p.raw.length ? '<button class="chip lvchip" data-x="lvgrid" aria-label="' + esc(t('live.grid')) + '">' + esc(p.grid === 'auto' ? t('grid.autoN', { g: t('grid.' + g) }) : t('grid.' + g)) + '</button>' : '') +
      (p && p.tuning ? '<button class="ic txt sm' + (env.st().liveProf !== 'score' ? ' act' : '') + '" data-x="lvprof" aria-label="' + esc(t('scoreTab')) + '">' + esc(env.st().liveProf === 'score' ? '♪' : env.st().liveProf === 'tab' ? 'T' : '♪+T') + '</button>' : '') +
      icb('data-x="lvset"', ICON.gear, t('live.settings')) + '</div>';
    const empty = !p || (!p.raw.length && !p.minBars && L.phase !== 'rec' && L.phase !== 'count');
    const surf = empty ? '<div class="lvempty"><p>' + esc(t(defaults().src === 'mic' ? 'live.emptyMic' : 'live.emptyMidi')) + '</p><button class="btn" data-x="lvblank" style="margin-top:14px;min-height:48px">' + esc(t('live.blank')) + '</button></div>'
      : '<div class="atwrap" id="atSlot">' + (AT.state === 'loading' ? '<div class="atload">' + C().ui.loader('beat', '') + '</div>' : '') + '</div>';
    const bar = L.inp && L.phase === 'edit' ? (setTimeout(bindKeys, 0), inpBar()) : L.sel && L.phase === 'edit' ? noteBar() : L.bars && L.phase === 'edit' ? barsBar() : mainBar();
    return '<div class="lvwrap">' + head + surf + bar + '</div>';
  }

  /* ---------- настройки и выгрузка ---------- */

  function setSheet() {
    const { ui } = C(), cf = defaults(), p = L.part, locked = p && p.raw.length;
    let devs = [];
    C().mic.devices().then((d) => { devs = d; });
    const row = (label, html) => '<div class="cell"><span class="grow">' + esc(label) + '</span>' + html + '</div>';
    const body = () => {
      const tuns = TUNS[cf.inst];
      return ui.snav(t('live.settings')) +
        '<div class="group">' + '<div class="cellcol">' + ui.seg('lvsrc', [['mic', t('live.src.mic')], ['midi', t('live.src.midi')]], cf.src, t('live.src')) + '</div></div>' +
        (cf.src === 'midi' ? '<div class="group"><button class="cell act" data-x="lvmidev"><span class="grow">' + esc(t('live.midev')) + '</span><span class="val l2">' + esc(C().midi.only || t('live.midAll')) + '</span></button></div>' : '') +
        (cf.src === 'mic' ? '<div class="group"><button class="cell act" data-x="lvindev"><span class="grow">' + esc(t('live.indev')) + '</span><span class="val l2">' + esc(devs.find((d) => d.id === cf.micDev)?.label || t('live.devAuto')) + '</span></button></div>' : '') +
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
        if ((b = e.target.closest('[data-x="lvmidev"]'))) { midDevSheet(upd); }
        else if ((b = e.target.closest('[data-x="lvindev"]'))) { inDevSheet(cf, devs, upd); }
        else if ((b = e.target.closest('[data-seg="lvsrc"] [data-v]'))) { cf.src = b.dataset.v; if (p && !p.raw.length) p.mono = cf.src === 'mic'; upd(); }
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
  // Вход для записи с микрофона: «Авто» или любое устройство (встроенный микрофон, USB-интерфейс, гарнитура)
  async function inDevSheet(cf, devs, done) {
    const { ui } = C();
    if (!devs.length || devs.every((d) => /^#\d+$/.test(d.label))) { try { const m = await C().mic.request(''); m.stop(); devs = await C().mic.devices(); } catch { /* без разрешения — только «Авто» */ } }
    const row = (id, name) => '<button class="cell act' + ((cf.micDev || '') === id ? ' on' : '') + '" data-dev="' + esc(id) + '" aria-pressed="' + ((cf.micDev || '') === id) + '"><span class="grow">' + esc(name) + '</span>' + ((cf.micDev || '') === id ? '<span class="l2">✓</span>' : '') + '</button>';
    ui.sheet(() => ui.snav(t('live.indev')) + '<div class="group">' + row('', t('live.devAuto')) + devs.map((d) => row(d.id, d.label)).join('') + '</div><p class="ftr">' + esc(t('live.indevFtr')) + '</p>', (el, sh) => {
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-dev]'); if (!b) return; cf.micDev = b.dataset.dev; C().store.save(); sh.close(); done(); });
    });
  }
  // MIDI-устройство для записи: «Все» или одно из подключённых (клавиатура, MIDI-гитара)
  function midDevSheet(done) {
    const { ui } = C(), M = C().midi;
    const row = (name, label) => '<button class="cell act" data-md="' + esc(name) + '" aria-pressed="' + (M.only === name) + '"><span class="grow">' + esc(label) + '</span>' + (M.only === name ? '<span class="l2">✓</span>' : '') + '</button>';
    ui.sheet(() => ui.snav(t('live.midev')) + '<div class="group">' + row('', t('live.midAll')) + M.devices().map((n) => row(n, n)).join('') + '</div><p class="ftr">' + esc(t(M.devices().length ? 'live.midevFtr' : 'live.midNone')) + '</p>', (el, sh) => {
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-md]'); if (!b) return; M.setOnly(b.dataset.md); sh.close(); done(); });
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
  // PDF для печати: страницы A4 из SVG alphaTab (шрифт нот вшивается в картинку), системы целиком, без разрезов посередине
  async function pdfBytes() {
    const root = env.AT.el && env.AT.el.querySelector('.at-surface'), svgs = root ? [...root.querySelectorAll('svg')] : [];
    if (!svgs.length) throw new Error('нет отрисованных нот');
    let font = '';
    try { const b = await (await fetch(env.fontUrl)).blob(); font = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.readAsDataURL(b); }); } catch { /* без шрифта ноты не нарисуются — ошибка ниже */ }
    const W = 1240, H = 1754, M = 70; // A4 при 150 dpi
    const items = svgs.map((el) => ({ el, r: el.getBoundingClientRect() })).sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
    const k = (W - 2 * M) / Math.max(1, ...items.map((x) => x.r.width));
    const pages = []; let cv = null, g = null, y = M;
    const fresh2 = () => { cv = document.createElement('canvas'); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); y = M; };
    const flush = async () => { const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.92)); pages.push({ w: W, h: H, u8: new Uint8Array(await blob.arrayBuffer()) }); };
    const toImg = (el, r) => new Promise((res, rej) => {
      const c = el.cloneNode(true); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', Math.ceil(r.width)); c.setAttribute('height', Math.ceil(r.height));
      // ноты — глифы шрифта по правилу страницы «.at-surface.at .at»: клону правило не достаётся, переносим вычисленный стиль (семья, размер)
      // на каждый .at и встраиваем сам шрифт (картинка из SVG своих шрифтов не видит)
      const live = [...el.querySelectorAll('.at')];
      [...c.querySelectorAll('.at')].forEach((n, i) => { const cs = live[i] && getComputedStyle(live[i]); n.setAttribute('style', (n.getAttribute('style') || '') + ';font-family:alphaTab;font-style:normal;font-weight:normal;line-height:1' + (cs ? ';font-size:' + cs.fontSize : '')); });
      if (font) { const st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = '@font-face{font-family:"alphaTab";src:url(data:font/woff2;base64,' + font + ') format("woff2")}'; c.insertBefore(st, c.firstChild); }
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)], { type: 'image/svg+xml;charset=utf-8' }));
      const im = new Image(); im.onload = () => { URL.revokeObjectURL(url); res(im); }; im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('svg')); }; im.src = url;
    });
    for (const it of items) {
      const h = it.r.height * k;
      if (!cv) fresh2(); else if (y + h > H - M) { await flush(); fresh2(); }
      g.drawImage(await toImg(it.el, it.r), M, y, it.r.width * k, h); y += h;
    }
    await flush();
    return jpegsToPdf(pages);
  }
  function shareSheet() {
    const { ui } = C(), p = L.part, name = (L.rec && L.rec.name) || t('live.title');
    ui.sheet(() => ui.snav(t('live.export')) + '<div class="group"><button class="cell act" data-k="gp">Guitar Pro (.gp)</button><button class="cell act" data-k="pdf">PDF</button><button class="cell act" data-k="xml">MusicXML</button><button class="cell act" data-k="mid">MIDI</button>' +
      (C().hasTool('looper') ? '<button class="cell act" data-k="studio">' + esc(t('toStudio')) + '</button>' : '') + '</div><p class="ftr">' + esc(t('live.exportFtr')) + '</p>',
    (el, sh) => el.addEventListener('click', async (e) => {
      const k = e.target.closest('[data-k]');
      if (!k) return;
      sh.close();
      const fn = name.replace(/[\\/:*?"<>|]/g, '-');
      if (k.dataset.k === 'pdf') {
        try { C().sendFile(await pdfBytes(), fn + '.pdf', fn, 'application/pdf'); } catch (er) { C().logErr(er); C().ui.toast(t('live.pdfFail')); }
      } else if (k.dataset.k === 'gp') {
        // Guitar Pro 7 (.gp): партия → MusicXML → партитура alphaTab → экспортёр alphaTab (читается в Guitar Pro, TuxGuitar и др.)
        try {
          const at = await env.loadLib(), st0 = new at.Settings();
          const sc = at.importer.ScoreLoader.loadScoreFromBytes(new TextEncoder().encode(xml()), st0);
          C().sendFile(new at.exporter.Gp7Exporter().export(sc, st0), fn + '.gp', fn, 'application/x-guitar-pro');
        } catch (er) { C().logErr(er); C().ui.toast(t('live.gpFail')); }
      } else if (k.dataset.k === 'xml') C().sendFile(new TextEncoder().encode(xml()), fn + '.musicxml', fn, 'application/vnd.recordare.musicxml+xml');
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

  // Ввод нот: правка модели сразу, отрисовка стана — с короткой задержкой (быстрый набор не перерисовывает стан на каждую ноту)
  function inEdit(fn) {
    L.undo.push(JSON.stringify(L.part.raw));
    if (L.undo.length > 40) L.undo.shift();
    const r = fn(L.part, L.inp);
    clearTimeout(L.drawQ); L.drawQ = setTimeout(() => draw(), 220);
    save();
    env.render(); markBars();
    return r;
  }
  function ping(m, beats) { // слышно, что поставили
    if (m == null) return;
    try {
      const syn = C().audio.synth, id = 'lvin' + (++L.pingN);
      if (C().audio.unlock) C().audio.unlock();
      syn.on(Math.round(m), id, { bus: 'piano', vel: 0.8 });
      setTimeout(() => syn.off(id), Math.max(160, Math.min(700, beats * 60 / L.part.bpm * 1000)));
    } catch (e) { /* без звука — нота всё равно на стане */ }
  }

  function act(a, el) {
    const p = L.part;
    switch (a) {
      case 'lvnew': L.inp = null; L.part = null; L.rec = { tmp: true, id: 'live-tmp', kind: 'tab', fmt: 'live', name: t('live.title') }; env.AT.cur = L.rec; env.AT.state = 'idle'; L.phase = 'idle'; L.sel = null; L.bars = null; env.render(); return true;
      case 'lvblank': { // писать с нуля: пустая партия на 4 такта — нота ставится касанием паузы
        L.part = fresh(); L.part.minBars = 4; L.phase = 'edit'; L.sel = null; L.bars = null; L.restAt = null; L.undo = []; L.inp = mkInput(0); // с нуля — сразу клавиатура ввода
        L.rec = { tmp: true, id: 'live-tmp', kind: 'tab', fmt: 'live', name: t('live.title') }; env.AT.cur = L.rec; env.AT.state = 'loading';
        draw(); env.render(); return true;
      }
      case 'lvbaradd': { const q = L.part; if (q) edit((x) => { x.minBars = Math.min(200, barsOf(x) + 1); }); return true; }
      case 'lvbend': { const i = p.raw.indexOf(L.sel); if (i >= 0) edit((q) => { if (q.raw[i].tech === 'b') delete q.raw[i].tech; else q.raw[i].tech = 'b'; }); return true; } // бенд на тон (MusicXML → alphaTab)
      case 'lvdur': { const i = L.part.raw.indexOf(L.sel); if (i >= 0) edit((q) => setLen(q, i, +el.dataset.b)); return true; }
      case 'lvrec': start(); return true;
      case 'lvstop': stop(); return true;
      case 'lvset': setSheet(); return true;
      case 'lvgrid': gridSheet(); return true;
      case 'lvshare': shareSheet(); return true;
      case 'lvprof': { const s = env.st(); s.liveProf = s.liveProf === 'score' ? 'both' : s.liveProf === 'tab' ? 'score' : 'tab'; C().store.save(); draw(); env.render(); return true; }
      case 'lvundo': undo(); return true;
      case 'lvinput': { // ввод нот: курсор — за последней нотой
        const ns = quantize(p);
        L.sel = null; L.bars = null; L.restAt = null; L.inp = mkInput(ns.reduce((a, n) => Math.max(a, n.t + n.d), 0)); L.inp.prev = ns.length ? ns[ns.length - 1].m : null; if (L.inp.prev != null) L.inp.base = startBase(p, L.inp.prev);
        env.render(); markBars(); C().ui.toast(t('live.in.hint')); return true;
      }
      case 'lvinend': L.inp = null; markBars(); env.render(); return true;
      case 'lvinrest': inEdit((q, I) => inRest(q, I)); return true;
      case 'lvintie': inEdit((q, I) => inTie(q, I)); return true;
      case 'lvinback': inEdit((q, I) => inBack(q, I)); return true;
      case 'lvindur': L.inp.dur = +el.dataset.b; env.render(); return true;
      case 'lvindot': L.inp.dot = !L.inp.dot; env.render(); return true;
      case 'lvinacc': L.inp.acc = L.inp.acc === +el.dataset.a ? null : +el.dataset.a; env.render(); return true;
      case 'lvinmode': { const c = cfg(); L.inp.mode = c.inMode = L.inp.mode === 'fret' ? 'keys' : 'fret'; C().store.save(); env.render(); return true; }
      case 'lvinkb': { const c = cfg(); L.inp.kb = c.inKb = KB_VIEWS[(KB_VIEWS.indexOf(L.inp.kb) + 1) % KB_VIEWS.length]; C().store.save(); env.render(); return true; }
      case 'lvinstack': { const c = cfg(); L.inp.stack = c.inStack = !L.inp.stack; C().store.save(); env.render(); if (L.inp.stack) C().ui.toast(t('live.in.stackHint')); return true; }
      case 'lvinnext': inEdit((q, I) => inRest(q, I)); return true;
      case 'lvinpick': L.inp.pick = !L.inp.pick; env.render(); return true;
      case 'lvinpc': baseAtPc(L.inp, +el.dataset.pc); L.inp.pick = false; env.render(); return true;
      case 'lvinf0': L.inp.f0 = Math.max(0, Math.min(24 - FRET_WIN + 1, +el.dataset.f)); env.render(); return true;
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
      case 'lvbcopy': { const b = L.bars, b1 = b.b1 == null ? b.b0 : b.b1; L.clip = copyBars(p, b.b0, b1); C().ui.toast(t('live.copied', { n: L.clip.bars })); env.render(); return true; }
      case 'lvbpaste': { const b = L.bars, b1 = b.b1 == null ? b.b0 : b.b1, clip = L.clip; if (!clip) return true; L.bars = null; markBars(); edit((q) => pasteBars(q, b1 + 1, clip)); return true; } // вставить после выбранных тактов
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
      L.rec = rec; L.part = rec.live ? JSON.parse(JSON.stringify(rec.live)) : fresh(); L.phase = 'edit'; L.inp = null; L.sel = null; L.bars = null; L.undo = [];
      env.AT.cur = rec; env.AT.state = 'loading';
      env.render();
      draw();
    },
    // окно закрыто или файл сменили: запись останавливается и сохраняется
    close() { if (L.live) stop(); },
    barsOf: () => (L.part ? barsOf(L.part) : 0),
  };
}
