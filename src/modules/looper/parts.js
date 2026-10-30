// Лупер, вид «Партии» (решение автора 30.10.2026: студия — часть лупера, вместо вида «Дорожки»). Одна петля на
// 4/8/16/32 такта (или по первой записи): в ней партии — ударные, ноты, аккорды (проект студии, src/music/project.js,
// играет секвенсор студии точно в такт петле) — и слои: записи с микрофона и куски записей из медиатеки.
// Касание строки — вкл/выкл с начала следующего такта; удержание — меню; «+» — новая партия или запись.
// Правка партии — тот же редактор студии в шторке (studio/index.js: embedPart), петля при этом играет.
// У каждой петли (слота) — свой проект; в хранилище лупера — parts: [id проекта × 4].
import { newProject, newTrack, newClip, newData, normalizeProject, clipsOf, dataBeats, clipNotes, BARS_MAX, diatonicChords, setChord, addPlayedNote } from '../../music/project.js';
import { after, cancel } from '../../audio/clock.js';
import { createSequencer } from '../../audio/sequencer.js';

export const BARS = [4, 8, 16, 32];
const KINDS = ['drums', 'notes', 'chords'];
export const PIECES = ['loop', 'bar', 'beat', 'whole']; // кусок записи: длиной в петлю, такт, долю или весь звук
export const PLACES = ['repeat', 'once']; // кусок — повторять по петле или звучит один раз с начала

// Кусок записи (моно) → слой длиной петли: повтор куска или один раз; на краях куска — мягкие 4 мс (без щелчков)
export function layOut(piece, len, { repeat = true, sr = 48000 } = {}) {
  const out = new Float32Array(len), n = piece.length;
  if (!n) return out;
  const f = Math.min(Math.floor(n / 4), Math.round(sr * 0.004));
  const env = (i) => (i < f ? i / f : i >= n - f ? (n - 1 - i) / f : 1);
  for (let at = 0; at < len; at += n) {
    for (let i = 0; i < n && at + i < len; i++) out[at + i] = piece[i] * env(i);
    if (!repeat) break;
  }
  return out;
}

// Умолчания, с которыми сразу можно играть (автор: «из коробки всё должно прекрасно работать»): ударные — простой
// ровный бит (бочка на сильные, малый на слабые доли, хэт восьмыми); аккорды — I–V–vi–IV тональности по такту;
// ноты — пусто (мелодию пишут сами)
export function starter(kind, d, num, key) {
  if (kind === 'drums') {
    const per = num * 4, steps = { kick: [], snare: [], hat: [] };
    for (let b = 0; b < d.bars; b++) for (let i = 0; i < per; i += 2) {
      const at = b * per + i, beat = i / 4;
      steps.hat.push(at);
      if (i % 4) continue;
      if (beat === 0 || (num >= 4 && beat === Math.floor(num / 2))) steps.kick.push(at); else steps.snare.push(at);
    }
    d.steps = steps;
  } else if (kind === 'chords') {
    const dc = diatonicChords(key || { pc: 0, minor: false }), deg = (key && key.minor) ? [0, 5, 2, 6] : [0, 4, 5, 3];
    for (let b = 0; b < d.bars; b++) { const c = dc[deg[b % 4]]; setChord(d, b * num, num, c.pc, c.type); }
  }
  return d;
}

// st — хранилище лупера; lp — движок; hooks: { render, barSec (метроном), play (запустить петлю) }
export function createParts(ctx, lp, hooks) {
  const st = () => ctx.store.all();
  const slot = () => lp.state.slot;
  const pidOf = (i = slot()) => (st().parts || [])[i] || null;
  const proj = () => { const id = pidOf(); return id ? ctx.projects.get(id) : null; };
  const seq = createSequencer({ mixer: ctx.audio.mixer, synth: ctx.audio.synth, getProject: proj, getFile: (id) => ctx.files.get(id),
    onLate: (s) => { if (ctx.diag) { ctx.diag.count('late'); ctx.diag.gauge('lateMs', s * 1000); } } });
  const metro = () => ctx.audio.metro.cfg;
  const loopBars = () => (BARS.includes(+st().bars) ? +st().bars : 4);
  const byRec = () => st().lenMode === 'rec';

  // Проект петли: создаётся при первой партии
  function ensure() {
    let p = proj();
    if (p) return p;
    const m = metro();
    p = newProject({ name: ctx.t('loopN', { n: slot() + 1 }), looper: true, tracks: [], bpm: m.bpm, num: m.num, den: m.den });
    ctx.projects.save(p);
    const L = (st().parts || [null, null, null, null]).slice(); L[slot()] = p.id; st().parts = L; ctx.store.save();
    return p;
  }
  // Длина петли, с: есть петля — её; нет — такты по метроному
  const planSec = () => { const m = metro(); return loopBars() * m.num * 60 / m.bpm; }; // такты по метроному
  const lenSec = () => { const c = lp.clock; return c ? c.len : planSec(); };
  // Проект под петлю: доля — точно в длину петли (такт по метроному, тактов — сколько поместилось), клипы — на всю петлю
  function fit(p = proj()) {
    if (!p) return null;
    const m = metro(), L = lenSec(), bar = m.num * 60 / m.bpm, bars = Math.max(1, Math.min(BARS_MAX, Math.round(L / bar))), beats = bars * m.num, spb = L / beats;
    let ch = false;
    const set = (o, k, v) => { if (o[k] !== v) { o[k] = v; ch = true; } };
    set(p, 'num', m.num); set(p, 'den', m.den);
    if (Math.abs((p.spb || 0) - spb) > 1e-9) { p.spb = spb; ch = true; }
    set(p, 'bpm', Math.max(20, Math.min(300, Math.round(60 / spb))));
    if (!p.region || p.region.a !== 0 || p.region.b !== beats) { p.region = { a: 0, b: beats }; ch = true; }
    p.clips.forEach((c) => { set(c, 'at', 0); set(c, 'len', beats); set(c, 'loop', true); });
    if (ch) ctx.projects.save(p);
    return p;
  }

  // Звук партий за петлёй: петля играет — секвенсор с начала её круга; встала — стоп
  let key = '';
  function follow() {
    const S = lp.state, on = S.state === 'play' || S.state === 'dub', c = lp.clock, p = proj();
    if (!on || !c || !p || !p.tracks.length) { if (seq.playing) seq.stop(); key = ''; return; }
    fit(p);
    const k = p.id + ':' + c.t0.toFixed(4) + ':' + c.len.toFixed(5);
    if (seq.playing && k === key) return;
    key = k;
    seq.start(0, { t0: c.t0 });
  }

  // Доля петли: длина, с, и долей в такте (партии — точная доля проекта; без них — по метроному в длину петли)
  function beat() {
    const c = lp.clock, m = metro(), p = proj();
    if (!c) return null;
    if (p && p.spb) return { spb: p.spb, num: p.num, t0: c.t0, now: c.ctx.currentTime };
    const bar = m.num * 60 / m.bpm, bars = Math.max(1, Math.round(c.len / bar));
    return { spb: c.len / (bars * m.num), num: m.num, t0: c.t0, now: c.ctx.currentTime };
  }
  // Начало следующего такта по часам петли (не играет — сейчас: 0)
  function nextBar() {
    const c = lp.clock, S = lp.state;
    if (!c || !(S.state === 'play' || S.state === 'dub')) return 0;
    const p = proj(), bar = p ? p.spb * p.num : c.len / Math.max(1, Math.round(c.len / hooks.barSec()));
    const now = c.ctx.currentTime, k = Math.ceil((now - c.t0) / bar + 0.02);
    return c.t0 + k * bar;
  }
  // Вкл/выкл партии с начала такта; состояние сохраняется, когда переключение случилось
  function toggleTrack(id) {
    const p = proj(), tr = p && p.tracks.find((x) => x.id === id);
    if (!tr) return;
    const at = nextBar(), want = !tr.mute;
    seq.setTrackMute(tr, want, at);
    if (!at || !seq.playing) { tr.mute = want; ctx.projects.save(p); return; }
    setTimeout(() => { const q = proj(); if (q) ctx.projects.save(q); hooks.render(); }, Math.max(0, (at - lp.clock.ctx.currentTime) * 1000) + 120);
  }
  function toggleLayer(i) { const L = lp.state.layers[i]; if (L) lp.setMute(i, !L.mute, nextBar()); setTimeout(hooks.render, Math.max(0, ((nextBar() || 0) - (lp.clock ? lp.clock.ctx.currentTime : 0)) * 1000) + 120); }
  const pending = (id) => seq.pending(id);

  // Новая партия: кусок — такт у ударных, вся петля у нот и аккордов (повторяется по петле, если короче)
  function addPart(kind) {
    const p = ensure();
    fit(p);
    const tr = newTrack(kind, p.tracks.length), beats = p.region.b, bars = Math.min(BARS_MAX, Math.max(1, Math.round(beats / p.num)));
    p.tracks.push(tr);
    const c = newClip(p, tr, 0, beats, starter(kind, newData(kind, kind === 'drums' ? 1 : bars), p.num, p.key));
    c.loop = true;
    p.clips.push(c);
    normalizeProject(p);
    ctx.projects.save(p);
    return tr;
  }
  function removePart(id) {
    const p = proj(); if (!p) return;
    p.tracks = p.tracks.filter((x) => x.id !== id); p.clips = p.clips.filter((c) => c.tr !== id);
    ctx.projects.save(p);
    key = ''; follow();
  }
  function dupPart(id) {
    const p = proj(), tr = p && p.tracks.find((x) => x.id === id); if (!tr) return;
    const n = { ...JSON.parse(JSON.stringify(tr)), id: newTrack().id, name: (tr.name || name(tr)) + ' 2' };
    p.tracks.splice(p.tracks.indexOf(tr) + 1, 0, n);
    clipsOf(p, tr).forEach((c) => p.clips.push({ ...JSON.parse(JSON.stringify(c)), id: 'cl' + n.id.slice(2), tr: n.id }));
    ctx.projects.save(p);
  }
  const clipOf = (tr) => { const p = proj(); return p ? clipsOf(p, tr)[0] || null : null; };
  const name = (tr) => { const p = proj(); return tr.name || ctx.t('part.' + tr.kind) + ' ' + (p.tracks.filter((t) => t.kind === tr.kind).indexOf(tr) + 1); };
  // Ноты партии в долях петли (для рисунка в строке)
  const notesOf = (tr) => { const p = proj(), c = clipOf(tr); return p && c ? clipNotes(p, tr, c) : []; };

  // Редактор партии — редактор клипа студии в шторке; петля играет
  async function edit(id) {
    const p = proj(), tr = p && p.tracks.find((x) => x.id === id), c = tr && clipOf(tr);
    if (!c) return;
    const sctx = ctx.ctxOf && ctx.ctxOf('studio');
    if (!sctx) { ctx.ui.toast(ctx.t('err.fail')); return; }
    let mod;
    try { mod = await import('../studio/index.js'); } catch (e) { ctx.logErr(e); ctx.ui.toast(ctx.t('err.fail')); return; }
    let emb = null;
    ctx.ui.sheet(() => '<div class="lpped"></div>', (el, sh) => {
      emb = mod.embedPart(el.querySelector('.lpped'), sctx, { pid: p.id, cid: c.id, seq, play: () => hooks.play(), close: () => sh.close() });
      sheetEmb = emb;
    }, { onClose: () => { if (emb) emb.close(); sheetEmb = null; fit(); key = ''; follow(); hooks.render(); }, tall: true });
  }
  let sheetEmb = null;

  // Партия с игры (ответ автора 30.10: любой инструмент): с начала следующего круга всё, что сыграно на пианино, пэдах,
  // глайдере, терменвоксе или MIDI-клавиатуре, ложится нотами в новую партию (по сетке шестнадцатых); один круг или до
  // «стоп». Время — по тому, что музыкант слышит: момент игры минус задержка выхода. Звук партии — по инструменту
  const INST = { piano: 'piano', drone: 'wair', glider: 'wflute', theremin: 'sine', midi: 'piano' };
  let cap = null;
  function capArm() {
    if (cap) { capDone(); return; }
    const c0 = lp.clock;
    if (!c0 || !(lp.state.state === 'play' || lp.state.state === 'dub')) { hooks.play(); }
    const c = lp.clock;
    if (!c) return false;
    const now = c.ctx.currentTime, k = Math.ceil((now - c.t0) / c.len - 1e-3);
    cap = { start: c.t0 + k * c.len, len: c.len, held: new Map(), notes: [], tool: null, off: ctx.onPlay(capEv), tm: 0 };
    cap.tm = after((cap.start + cap.len - now) * 1000 + 30, capDone);
    after(Math.max(0, (cap.start - now) * 1000 + 20), () => hooks.render()); // «ждёт круга» → «пишет игру»
    hooks.render();
    return true;
  }
  const capNow = () => { const c = lp.clock; return c ? c.ctx.currentTime - (c.ctx.outputLatency || 0) : 0; };
  function capEv(id, e) {
    if (!cap) return;
    const t = capNow() - cap.start;
    if (e.k === 'on' && e.m != null) { if (t < -0.12) return; cap.tool = cap.tool || id; cap.held.set(e.id, { m: Math.round(e.m), v: e.v == null ? 0.8 : e.v, t: Math.max(0, t) }); }
    else if (e.k === 'off') { const h = cap.held.get(e.id); if (!h) return; cap.held.delete(e.id); cap.notes.push({ ...h, d: Math.max(0.05, Math.min(cap.len, t) - h.t) }); }
  }
  function capDone() {
    if (!cap) return;
    const k = cap; cap = null;
    cancel(k.tm); try { k.off(); } catch { /* */ }
    const end = Math.min(k.len, capNow() - k.start);
    k.held.forEach((h) => k.notes.push({ ...h, d: Math.max(0.05, end - h.t) }));
    if (!k.notes.length) { ctx.ui.toast(ctx.t('capNone')); hooks.render(); return; }
    const p = ensure(); fit(p);
    const spb = p.spb, beats = p.region.b, bars = Math.max(1, Math.round(beats / p.num));
    const tr = newTrack('notes', p.tracks.length, { inst: INST[k.tool] || 'piano', name: ctx.t('capName') });
    const d = newData('notes', bars), total = bars * p.num;
    k.notes.forEach((n) => { if (n.t < k.len) addPlayedNote(d, total, n.t / spb, n.d / spb, n.m, n.v, 0.25); });
    p.tracks.push(tr);
    const c = newClip(p, tr, 0, beats, d); c.loop = true; p.clips.push(c);
    normalizeProject(p); ctx.projects.save(p);
    key = ''; follow(); hooks.render();
    ctx.ui.toast(ctx.t('capDone', { n: k.notes.length }));
  }
  // MIDI-клавиатура прямо в лупере: звук пианино и запись в партию с игры
  function midi(e) {
    const syn = ctx.audio.synth;
    if (e.k === 'on' && e.m != null) syn.on(e.m, 'lpm' + e.id, { bus: 'piano', vel: e.v == null ? 0.8 : e.v });
    else if (e.k === 'off') { if (e.id === '*') { (cap ? [...cap.held.keys()] : []).forEach((id) => syn.off('lpm' + id)); } else syn.off('lpm' + e.id); }
    capEv('midi', e);
  }

  // Кусок записи из медиатеки → слой
  async function addFile(rec, { start = 0, piece = 'loop', place = 'repeat' } = {}) {
    if (!rec || !rec.blob) throw new Error('nofile');
    const ab = await rec.blob.arrayBuffer(), buf = await lp.decode(ab), sr = buf.sampleRate;
    if (!lp.state.len) { // петли ещё нет: длина — тактами
      if (!lp.setLoop(planSec())) throw new Error('loop');
    }
    const len = Math.round(lp.state.len * sr), m = metro(), spb = (proj() && proj().spb) || 60 / m.bpm;
    const pieceSec = piece === 'loop' ? lp.state.len : piece === 'bar' ? spb * m.num : piece === 'beat' ? spb : buf.duration - start;
    const a = Math.max(0, Math.min(buf.length - 1, Math.round(start * sr))), n = Math.max(1, Math.min(buf.length - a, Math.round(pieceSec * sr)));
    const mono = new Float32Array(n), chs = buf.numberOfChannels;
    for (let ch = 0; ch < chs; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) mono[i] += d[a + i] / chs; }
    const out = layOut(mono, len, { repeat: place === 'repeat', sr });
    return lp.addLayer(out, { name: rec.name || '', src: 'file' });
  }

  // Партии одним кругом петли (сведение «на бумаге», render.js): хвосты нот за краем петли — в её начало, как в живой
  // петле по кругу. → [L, R] длиной len отсчётов или null (партий не слышно)
  async function renderLoop(len, sr) {
    const p = proj();
    if (!p || !p.tracks.some((tr) => !tr.mute) || !len) return null;
    fit(p);
    const { renderProject } = await import('../../audio/render.js');
    const buf = await renderProject(JSON.parse(JSON.stringify(p)), { getFile: (id) => ctx.files.get(id), sampleRate: sr, tail: 2.5, live: ctx.audio.mixer });
    const out = [new Float32Array(len), new Float32Array(len)];
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(Math.min(ch, buf.numberOfChannels - 1)), o = out[ch]; for (let i = 0; i < d.length; i++) o[i % len] += d[i]; }
    return out;
  }

  return {
    renderLoop, beat, capArm, capDone, midi,
    get cap() { return cap ? { wait: (lp.clock ? lp.clock.ctx.currentTime : 0) < cap.start } : null; },
    seq, proj, fit, follow, ensure, toggleTrack, toggleLayer, pending, addPart, removePart, dupPart, edit, addFile, name, notesOf, clipOf, nextBar,
    loopBars, byRec, lenSec, planSec,
    get kinds() { return KINDS; },
    get editor() { return sheetEmb; },
    stop() { seq.stop(); key = ''; },
    dispose() { seq.dispose(); },
    dataBeats: (tr) => { const p = proj(), c = clipOf(tr); return p && c ? dataBeats(p, c.data) : 0; },
  };
}
