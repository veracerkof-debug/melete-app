// Редактор нот и табов (слово автора 22.11.2026: «прям как у открытых проектов, или функциональнее»).
// Образцы (открытые): MuseScore 4 — ввод «поверх» с шагом по долям, палитра длительностей, выделение тактов; TuxGuitar и Guitar Pro —
// лад на струне, техники у ноты, повторы и размер на такте; Flat.io — компактная панель ввода под станом. Учтено: стан занимает почти всё окно,
// ввод — одна полоса снизу (сворачивается), жесты вместо лишних кнопок (касание — курсор, удержание — выбор тактов, смахнуть пэд вбок/вверх).
// Модель — src/music/scoreedit.js (документ alphaTab, правки чистыми функциями), стан рисует alphaTab модуля (AT.api), файл — Guitar Pro (.gp)
// + точный снимок JSON (rec.ed): правка чужого файла идёт в копии, оригинал не трогается.
import * as E from '../../music/scoreedit.js';
import { pianoKeys, shiftBase } from '../../music/noteinput.js';
import { pinch } from '../../ui/gestures.js';
import { buzz } from '../../ui/hold.js';
import { scorePdfBytes } from './scorepdf.js';

const ic = (p) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>';
const IC = {
  close: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
  undo: ic('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  redo: ic('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  play: ic('<path d="M7 4.8v14.4c0 .8.9 1.3 1.6.9l11.3-7.2c.6-.4.6-1.4 0-1.8L8.6 3.9C7.9 3.5 7 4 7 4.8z" fill="currentColor" stroke="none"/>'),
  pause: ic('<rect x="6" y="5" width="4.2" height="14" rx="1.4" fill="currentColor" stroke="none"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.4" fill="currentColor" stroke="none"/>'),
  more: ic('<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>'),
  left: ic('<path d="M15 6l-6 6 6 6"/>'),
  right: ic('<path d="M9 6l6 6-6 6"/>'),
  del: ic('<path d="M20 6H9l-6 6 6 6h11z"/><path d="M13 10l4 4M17 10l-4 4"/>'),
  rest: ic('<path d="M9 4h6l-4 5 4 4-5 6" />'),
  tie: ic('<path d="M4 9c2 8 14 8 16 0"/>'),
  chord: ic('<circle cx="8" cy="7" r="2.4"/><circle cx="14" cy="12" r="2.4"/><circle cx="8" cy="17" r="2.4"/><path d="M14 9.6V3M8 9.4v5.2" />'),
  tech: ic('<path d="M12 3l2.2 5.6L20 9l-4.4 3.8L17 19l-5-3.2L7 19l1.4-6.2L4 9l5.8-.4z"/>'),
  down: ic('<path d="M6 9l6 6 6-6"/>'),
  up: ic('<path d="M6 15l6-6 6 6"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  trash: ic('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'),
  copy: ic('<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
  paste: ic('<rect x="6" y="5" width="12" height="15" rx="2"/><path d="M9 5V3.5h6V5"/>'),
  cut: ic('<circle cx="7" cy="17" r="2.6"/><circle cx="17" cy="17" r="2.6"/><path d="M8.6 14.8L17 4M15.4 14.8L7 4"/>'),
};
// Значки длительностей: целая, половинная, четверть, восьмая, шестнадцатая, тридцать вторая
const NOTE = (d) => {
  const hollow = d <= 2, stem = d >= 2, flags = d >= 8 ? Math.log2(d) - 2 : 0;
  const head = d === 1 ? '<ellipse cx="12" cy="12" rx="6.2" ry="4.2" fill="none" stroke-width="2"/><ellipse cx="12" cy="12" rx="2.2" ry="3.6" transform="rotate(-25 12 12)" fill="none" stroke-width="1.6"/>'
    : '<ellipse cx="9.4" cy="17.4" rx="4.3" ry="3.2" transform="rotate(-22 9.4 17.4)" ' + (hollow ? 'fill="none" stroke-width="1.9"' : 'fill="currentColor" stroke="none"') + '/>';
  const st = stem ? '<path d="M13.4 16.2V3.8" stroke-width="1.9"/>' : '';
  const fl = Array.from({ length: flags }, (_, k) => '<path d="M13.4 ' + (3.8 + k * 3.6) + 'c0 3.4 5.2 4 5.2 8.2" stroke-width="1.9"/>').join('');
  return ic(head + st + fl);
};
const DUR_LABEL = { 1: '1', 2: '1/2', 4: '1/4', 8: '1/8', 16: '1/16', 32: '1/32' };
const DURS = [1, 2, 4, 8, 16, 32];
const NAMES_SH = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FRET_DOTS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
// Техники: ключ из scoreedit.NOTE_TECH → подпись i18n; группы — в панели «техники»
const TECH = [['hp', 'ed.t.hp'], ['slide', 'ed.t.slide'], ['slideShift', 'ed.t.slideShift'], ['bend', 'ed.t.bend'], ['bendRel', 'ed.t.bendRel'], ['vib', 'ed.t.vib'],
  ['dead', 'ed.t.dead'], ['ghost', 'ed.t.ghost'], ['pm', 'ed.t.pm'], ['lr', 'ed.t.lr'], ['harm', 'ed.t.harm'], ['acc', 'ed.t.acc'], ['hac', 'ed.t.hac'], ['stac', 'ed.t.stac'],
  ['slideIn', 'ed.t.slideIn'], ['slideUp', 'ed.t.slideUp'], ['slideDown', 'ed.t.slideDown']];

export function createEditor(env) {
  const S = { on: false, doc: null, rec: null, loc: { t: 0, b: 0, v: 0, i: 0 }, rng: null, undo: [], redo: [], dur: 4, dots: 0, tup: 0, stack: false, mode: 'pad', clip: null,
    score: null, f0: 0, base: 60, saveT: 0, drawQ: 0, sw: 0, ov: null, hold: 0, playing: false };
  const C = () => env.ctx;
  const t = (k, o) => C().t(k, o);
  const esc = (s) => env.esc(s);
  const cfg = () => (env.st().ed ??= {});
  const AT = env.AT;
  const isTab = () => E.trackIsTab(S.doc, S.loc.t);
  const tun = () => E.tuningOf(S.doc, S.loc.t);

  /* ---------- правка: снимок для отмены, пересчёт, сохранение ---------- */

  function commit(fn, o = {}) {
    S.undo.push({ s: E.snap(S.doc), loc: { ...S.loc } });
    if (S.undo.length > 100) S.undo.shift();
    S.redo = [];
    const r = fn(S.doc);
    if (r && r.t != null) S.loc = r;
    S.loc = E.clampLoc(S.doc, S.loc);
    if (S.rng) S.rng.b1 = Math.min(S.rng.b1, E.nBars(S.doc) - 1), S.rng.b0 = Math.min(S.rng.b0, S.rng.b1);
    draw(); save(); dock();
    void o;
  }
  function undo() {
    const u = S.undo.pop();
    if (!u) return;
    S.redo.push({ s: E.snap(S.doc), loc: { ...S.loc } });
    S.doc = E.unsnap(u.s); S.loc = E.clampLoc(S.doc, u.loc);
    draw(); save(); dock();
  }
  function redo() {
    const u = S.redo.pop();
    if (!u) return;
    S.undo.push({ s: E.snap(S.doc), loc: { ...S.loc } });
    S.doc = E.unsnap(u.s); S.loc = E.clampLoc(S.doc, u.loc);
    draw(); save(); dock();
  }

  /* ---------- файл: «партия» в Табах; сохраняется сразу после каждой правки ---------- */

  const stamp = () => { const d = new Date(), z = (n) => String(n).padStart(2, '0'); return z(d.getDate()) + '.' + z(d.getMonth() + 1) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); };
  function save(now = false) {
    clearTimeout(S.saveT);
    const go = async () => {
      if (!S.doc || !C()) return;
      try {
        const bytes = E.toGp(S.doc), blob = new Blob([bytes], { type: 'application/x-guitar-pro' });
        const fresh = !S.saved;
        Object.assign(S.rec, { blob, size: blob.size, type: blob.type, ed: E.snap(S.doc), det: 'gp7', fmt: 'score', ext: 'gp' });
        if (fresh) {
          const song = C().song();
          S.rec.songs = S.rec.songs || (song ? [song.id] : []);
          S.saved = true;
          env.st().lastTab = S.rec.id;
          const ok = await C().files.add(S.rec);
          if (!ok) { S.saved = false; C().ui.toast(t('notSaved')); return; }
          C().store.save();
        } else C().files.save(S.rec);
        S.dirty = false; badge();
      } catch (e) { C().logErr(e); C().ui.toast(t('notSaved')); }
    };
    S.dirty = true; badge();
    if (now) return go();
    S.saveT = setTimeout(go, 700);
  }

  /* ---------- открыть / закрыть ---------- */

  async function lib() { const at = await env.loadLib(); E.useAlphaTab(at); env.ensureApi(at); return at; }
  const recBase = (name) => ({ id: 'ed' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), kind: 'tab', fmt: 'score', det: 'gp7', ext: 'gp', name, created: Date.now(), songs: [] });

  // Новая партитура: выбор инструмента листом, дальше — сразу ввод
  async function openNew() {
    await lib();
    const c = cfg();
    const pick = (inst) => {
      const keyName = '';
      const song = C().song(), sk = song && song.key && /^([A-G][#♯b♭]?m?)/.exec(String(song.key));
      const d = E.newDoc({ inst, bars: 4, bpm: c.bpm || 90, key: keyName || (sk ? sk[1].replace('♯', '#').replace('♭', 'b') : ''), title: '' });
      begin(d, { ...recBase(t('ed.name', { d: stamp() })) }, true);
    };
    C().ui.sheet(() => C().ui.snav(t('ed.instr')) + '<div class="group">' + Object.entries(E.INSTRUMENTS).map(([k, v]) => '<button class="cell act" data-k="' + k + '"><span class="grow" style="text-align:left">' + esc(t('ed.i.' + k)) + '</span><span class="st l2">' +
      esc(v.tab ? t('ed.i.tab', { n: v.tuning.split(' ').length }) : t('ed.i.staff')) + '</span></button>').join('') + '</div>',
    (el, sh) => el.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; sh.close(); pick(b.dataset.k); }));
  }
  // Открыть файл на правку: сохранённый здесь — как есть; чужой — копией (оригинал не трогаем)
  async function openRec(rec) {
    try {
      await lib();
      let d;
      if (rec.ed) d = E.unsnap(rec.ed); else d = E.fromBytes(new Uint8Array(await rec.blob.arrayBuffer()));
      const own = !!rec.ed;
      begin(d, own ? rec : { ...recBase(t('ed.copyName', { name: rec.name.replace(/\.[a-z0-9]+$/i, '') })), songs: (rec.songs || []).slice() }, false);
      S.saved = own;
      if (!own) { save(true); C().ui.toast(t('ed.copyMade')); }
    } catch (e) { C().logErr(e); C().ui.toast(t('ed.openFail')); }
  }
  function begin(d, rec, fresh) {
    S.doc = d; S.rec = rec; S.undo = []; S.redo = []; S.rng = null; S.mode = 'pad';
    S.loc = { t: 0, b: 0, v: 0, i: 0 };
    const c = cfg();
    S.dur = c.dur || 4; S.dots = 0; S.tup = 0; S.stack = false;
    S.f0 = 0; S.base = c.base || 60;
    AT.cur = rec; AT.ed = api; S.on = true;
    mountUI();
    S.saved = false;
    if (fresh) save(true);
    const cl = { ...S.loc }; S.loc = cl;
    draw(true);
  }
  function close() {
    if (!S.on) return;
    save(true);
    if (AT.api && S.playing) try { AT.api.stop(); } catch { /* */ }
    S.on = false; AT.ed = null;
    if (S.offPinch) { S.offPinch(); S.offPinch = null; }
    document.removeEventListener('keydown', onKey);
    const ov = S.ov; S.ov = null;
    if (ov) { ov.classList.add('leaving'); setTimeout(() => ov.remove(), 180); }
    if (AT.el && AT.el.parentNode && ov && ov.contains(AT.el)) AT.el.remove();
    // стан модуля — снова обычным видом (как у просмотра файла)
    AT.cur = S.rec; AT.state = 'ready';
    env.restyle();
    env.openTab ? env.openTab(S.rec) : env.render();
    env.render();
  }

  /* ---------- стан: отрисовка и курсор ---------- */

  // Отрисовки идут по одной: пока alphaTab рисует прежнюю партитуру, новая ждёт (накладка отрисовок роняет раскладку); ждёт только последняя
  function draw(first = false) {
    S.again = true;
    if (S.drawQ || S.busy) return;
    S.drawQ = requestAnimationFrame(async () => {
      S.drawQ = 0;
      if (!S.on || !AT.api || !S.again) return;
      S.again = false; S.busy = true;
      clearTimeout(S.busyT); S.busyT = setTimeout(() => { S.busy = false; if (S.again) draw(); }, 4000); // отрисовка не вернулась — не застреваем
      try {
        const at = await lib();
        S.score = E.toScore(S.doc);
        const s = AT.api.settings;
        s.display.staveProfile = at.StaveProfile.Default;
        s.notation.elements.set(at.NotationElement.GuitarTuning, true);
        if (first || s.display.scale !== scale()) { s.display.scale = scale(); AT.api.updateSettings(); }
        AT.api.renderScore(S.score, [Math.min(S.loc.t, S.score.tracks.length - 1)]);
      } catch (e) { S.busy = false; C().logErr(e); }
    });
  }
  // alphaTab закончил рисовать: следующая отрисовка, если правка пришла за это время
  function rendered() { S.busy = false; clearTimeout(S.busyT); if (S.again) draw(); }
  const scale = () => (+env.st().edScale > 0 ? +env.st().edScale : 0.9);
  const curBeat = () => {
    const sc = S.score; if (!sc) return null;
    const tr = sc.tracks[S.loc.t], br = tr && tr.staves[0].bars[S.loc.b], v = br && br.voices[S.loc.v];
    return (v && v.beats[S.loc.i]) || null;
  };
  // Курсор и выделенные такты — поверх стана (после каждой отрисовки)
  function marks() {
    if (!S.on || !AT.api || !AT.el || !S.score) return;
    const lk = AT.api.renderer && AT.api.renderer.boundsLookup;
    AT.el.querySelectorAll('.edcur,.edbar').forEach((x) => x.remove());
    if (!lk) return;
    // такты выбора
    if (S.rng) {
      for (let b = S.rng.b0; b <= S.rng.b1; b++) {
        const mb = lk.findMasterBarByIndex && lk.findMasterBarByIndex(b);
        if (!mb) continue;
        const r = mb.visualBounds, el = document.createElement('i');
        el.className = 'edbar'; el.style.cssText = 'left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px';
        AT.el.appendChild(el);
      }
    }
    const beat = curBeat();
    if (!beat || S.rng) return;
    const all = (lk.findBeats && lk.findBeats(beat)) || [lk.findBeat(beat)].filter(Boolean);
    if (!all.length) return;
    const a = all[0], z = all[all.length - 1], br = a.barBounds.visualBounds;
    const x = (a.onNotesX || a.visualBounds.x + a.visualBounds.w / 2) - 11, top = br.y, bot = z.barBounds.visualBounds.y + z.barBounds.visualBounds.h;
    const el = document.createElement('i');
    el.className = 'edcur';
    el.style.cssText = 'left:' + x + 'px;top:' + (top - 4) + 'px;width:22px;height:' + (bot - top + 8) + 'px';
    AT.el.appendChild(el);
    reveal(el, x, top, bot - top);
  }
  // Курсор всегда в поле зрения (над панелью ввода)
  function reveal(el, x, y, h) {
    const sc = S.ov && S.ov.querySelector('.nedscore');
    if (!sc) return;
    const r = AT.el.getBoundingClientRect(), s0 = sc.getBoundingClientRect(), top = y + (r.top - s0.top), bot = top + h;
    if (top < 8) sc.scrollBy({ top: top - 24, behavior: 'smooth' });
    else if (bot > sc.clientHeight - 8) sc.scrollBy({ top: bot - sc.clientHeight + 40, behavior: 'smooth' });
  }

  // Касание стана → удар (по ширине — ближайший в такте)
  function hit(x, y) {
    const lk = AT.api && AT.api.renderer && AT.api.renderer.boundsLookup;
    if (!lk || !S.score) return null;
    let b = lk.getBeatAtPos && lk.getBeatAtPos(x, y);
    if (b) return { t: b.voice.bar.staff.track.index, b: b.voice.bar.index, v: b.voice.index, i: b.index };
    const mb = lk.getMasterBarAtPos && lk.getMasterBarAtPos(x, y);
    if (!mb) return null;
    const bi = mb.index, v = Math.min(S.loc.v, S.score.tracks[S.loc.t].staves[0].bars[bi].voices.length - 1), bs = S.score.tracks[S.loc.t].staves[0].bars[bi].voices[v].beats;
    let best = null, bd = 1e9;
    bs.forEach((be) => { const bb = lk.findBeat(be); if (!bb) return; const d = Math.abs((bb.onNotesX || bb.visualBounds.x + bb.visualBounds.w / 2) - x); if (d < bd) { bd = d; best = be; } });
    return best ? { t: S.loc.t, b: bi, v, i: best.index } : { t: S.loc.t, b: bi, v, i: 0 };
  }

  /* ---------- ввод ---------- */

  function blip(midi) {
    try {
      const syn = C().audio.synth;
      if (!syn || !C().audio.unlock()) return;
      const id = 'ed' + ++S.sw;
      syn.on(Math.round(midi), id, { bus: 'piano', vel: 0.7 });
      setTimeout(() => { try { syn.off(id); } catch { /* */ } }, 380);
    } catch { /* звук необязателен */ }
  }
  const nearString = () => {
    const b = E.beatAt(S.doc, S.loc), n = b && b.notes[0];
    return n && n.string > 0 ? n.string : 0;
  };
  function enter(note) {
    const m = E.midiOf(S.doc, S.loc.t, note);
    blip(m);
    commit((d) => {
      const loc = S.loc, b = E.beatAt(d, loc);
      if (S.stack && b && !E.isRest(b)) { E.toggleNote(d, loc, note); return null; } // аккорд: к тому же удару
      const r = E.put(d, loc, { dur: S.dur, dots: S.dots, tup: S.tup, notes: [note] });
      if (!r.beat) { C().ui.toast(t('ed.noRoom')); return null; }
      return S.stack ? null : E.next(d, loc);
    });
  }
  function enterPitch(midi) {
    const n = E.noteFor(S.doc, S.loc.t, midi, nearString());
    if (!n) { C().ui.toast(t('ed.outOfRange')); return; }
    enter(n);
  }
  function setDur(d) {
    S.dur = d; cfg().dur = d; C().store.save();
    if (S.mode === 'bars') return dock();
    const b = E.beatAt(S.doc, S.loc);
    if (b) commit((x) => { E.resize(x, S.loc, S.dur, S.dots, S.tup); return null; }); else dock();
  }
  function toggleDot() { S.dots = S.dots ? 0 : 1; const b = E.beatAt(S.doc, S.loc); if (b) commit((x) => { E.resize(x, S.loc, S.dur, S.dots, S.tup); return null; }); else dock(); }
  function toggleTriplet() { S.tup = S.tup ? 0 : 3; const b = E.beatAt(S.doc, S.loc); if (b && S.tup) commit((x) => { E.resize(x, S.loc, S.dur, S.dots, S.tup); return null; }); else dock(); }
  function addRest() { commit((d) => { E.put(d, S.loc, { dur: S.dur, dots: S.dots, tup: S.tup, notes: [] }); return E.next(d, S.loc); }); }
  function backspace() {
    const b = E.beatAt(S.doc, S.loc);
    if (!b) return;
    if (!E.isRest(b)) commit((d) => { E.clearBeat(d, S.loc); return null; });
    else commit((d) => { const p = E.prev(d, S.loc); E.clearBeat(d, p); return p; });
  }
  function step(dir) { const l = dir > 0 ? E.next(S.doc, S.loc, false) : E.prev(S.doc, S.loc); S.loc = l; S.rng = null; marks(); dock(); }
  function addTie() {
    commit((d) => { const wasRest = E.isRest(E.beatAt(d, S.loc)); const ok = E.tie(d, S.loc, S.dur, S.dots); if (!ok) C().ui.toast(t('ed.tieNone')); return wasRest && ok ? E.next(d, S.loc) : null; });
  }
  function tech(key) {
    const b = E.beatAt(S.doc, S.loc);
    if (!b || E.isRest(b)) { C().ui.toast(t('ed.needNote')); return; }
    commit((d) => { E.toggleTech(d, S.loc, key); return null; });
  }
  function semitone(dd) { const b = E.beatAt(S.doc, S.loc); if (!b || E.isRest(b)) return; commit((d) => { if (!E.transpose(d, S.loc, dd)) C().ui.toast(t('ed.outOfRange')); return null; }); blipCur(); }
  function blipCur() { const b = E.beatAt(S.doc, S.loc); if (b && b.notes[0]) blip(E.midiOf(S.doc, S.loc.t, b.notes[0])); }

  /* ---------- такты (выбор удержанием) ---------- */

  function selectBars(b0, b1 = b0) { S.rng = { b0: Math.min(b0, b1), b1: Math.max(b0, b1), anchor: b0 }; S.mode = 'bars'; marks(); dock(); }
  function endBars() { S.rng = null; S.mode = 'pad'; marks(); dock(); }
  function barAct(a) {
    const r = S.rng; if (!r) return;
    switch (a) {
      case 'copy': S.clip = E.copyBars(S.doc, r.b0, r.b1, S.loc.t); C().ui.toast(t('ed.copied', { n: S.clip.n })); dock(); break;
      case 'cut': S.clip = E.copyBars(S.doc, r.b0, r.b1, S.loc.t); commit((d) => { E.clearBars(d, r.b0, r.b1, S.loc.t); return { ...S.loc, b: r.b0, i: 0 }; }); break;
      case 'paste': if (!S.clip) return; commit((d) => { E.pasteBars(d, r.b1 + 1, S.clip, true); return { ...S.loc, b: r.b1 + 1, i: 0 }; }); selectBars(r.b1 + 1, r.b1 + S.clip.n); break;
      case 'over': if (!S.clip) return; commit((d) => { E.pasteBars(d, r.b0, S.clip, false); return { ...S.loc, b: r.b0, i: 0 }; }); break;
      case 'del': commit((d) => ({ ...S.loc, b: E.delBars(d, r.b0, r.b1), i: 0 })); endBars(); break;
      case 'clear': commit((d) => { E.clearBars(d, r.b0, r.b1, S.loc.t); return { ...S.loc, b: r.b0, i: 0 }; }); break;
      case 'ins': commit((d) => { E.insertBar(d, r.b0, false); return { ...S.loc, b: r.b0, i: 0 }; }); selectBars(r.b0); break;
      case 'add': commit((d) => { E.insertBar(d, r.b1, true); return { ...S.loc, b: r.b1 + 1, i: 0 }; }); selectBars(r.b1 + 1); break;
      case 'ro': commit((d) => { E.toggleRepeatStart(d, r.b0); return null; }); break;
      case 're': commit((d) => { E.setRepeatEnd(d, r.b1, d.masterbars[r.b1].repeatcount ? 0 : 2); return null; }); break;
      case 'v1': commit((d) => { E.setVolta(d, r.b0, d.masterbars[r.b0].alternateendings === 1 ? 0 : 1); return null; }); break;
      case 'v2': commit((d) => { E.setVolta(d, r.b0, d.masterbars[r.b0].alternateendings === 2 ? 0 : 2); return null; }); break;
      case 'ts': timeSheet(r.b0); break;
      case 'key': keySheet(r.b0); break;
      case 'tempo': tempoSheet(r.b0); break;
      case 'sec': sectionSheet(r.b0); break;
      case 'done': endBars(); break;
    }
  }
  function numSheet(title, cur, min, max, apply, unit = '') {
    let v = cur;
    C().ui.sheet(() => C().ui.snav(title) + '<div class="vrow" style="justify-content:center;gap:14px;padding:18px 0"><button class="ic" data-n="-10" aria-label="−10">−10</button><button class="ic" data-n="-1" aria-label="−1">−</button><b class="num" style="font-size:34px;min-width:3ch;text-align:center">' + v + '</b><button class="ic" data-n="1" aria-label="+1">+</button><button class="ic" data-n="10" aria-label="+10">+10</button></div>' +
      '<div class="vrow" style="justify-content:center"><button class="btn fill" data-ok="1">' + esc(t('ed.ok')) + (unit ? ' · ' + esc(unit) : '') + '</button></div>',
    (el, sh) => el.addEventListener('click', (e) => {
      const n = e.target.closest('[data-n]'), ok = e.target.closest('[data-ok]');
      if (n) { v = Math.max(min, Math.min(max, v + +n.dataset.n)); sh.update(); }
      else if (ok) { sh.close(); apply(v); }
    }));
  }
  function tempoSheet(b) { numSheet(t('ed.tempo'), E.tempoAt(S.doc, b), 30, 300, (v) => commit((d) => { E.setTempo(d, b, v); return null; }), '♩ = BPM'); }
  function timeSheet(b) {
    const mb = S.doc.masterbars[b], opts = [[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [3, 8], [6, 8], [7, 8], [9, 8], [12, 8], [2, 2], [3, 2]];
    C().ui.sheet(() => C().ui.snav(t('ed.timeSig')) + '<div class="trgrid">' + opts.map(([n, d]) => '<button class="pill' + (n === mb.timesignaturenumerator && d === mb.timesignaturedenominator ? ' on' : '') + '" data-n="' + n + '" data-d="' + d + '"><b>' + n + '/' + d + '</b></button>').join('') + '</div><p class="ftr">' + esc(t('ed.timeFtr')) + '</p>',
    (el, sh) => el.addEventListener('click', (e) => { const x = e.target.closest('[data-n]'); if (!x) return; sh.close(); commit((d) => { E.setTimeSig(d, b, +x.dataset.n, +x.dataset.d); return null; }); }));
  }
  const KEYS_MAJ = ['C♭', 'G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯'], KEYS_MIN = ['A♭m', 'E♭m', 'B♭m', 'Fm', 'Cm', 'Gm', 'Dm', 'Am', 'Em', 'Bm', 'F♯m', 'C♯m', 'G♯m', 'D♯m', 'A♯m'];
  function keySheet(b) {
    const cur = E.keyOf(S.doc, b);
    const cell = (name, f, minor) => '<button class="pill' + (cur.fifths === f && cur.minor === minor ? ' on' : '') + '" data-f="' + f + '" data-m="' + (minor ? 1 : 0) + '"><b>' + name + '</b><small>' + (f === 0 ? '' : Math.abs(f) + (f > 0 ? '♯' : '♭')) + '</small></button>';
    C().ui.sheet(() => C().ui.snav(t('ed.key')) + '<div class="hdr">' + esc(t('ed.major')) + '</div><div class="trgrid">' + KEYS_MAJ.map((n, i) => cell(n, i - 7, false)).join('') + '</div><div class="hdr">' + esc(t('ed.minor')) + '</div><div class="trgrid">' + KEYS_MIN.map((n, i) => cell(n, i - 7, true)).join('') + '</div>',
    (el, sh) => el.addEventListener('click', (e) => { const x = e.target.closest('[data-f]'); if (!x) return; sh.close(); commit((d) => { E.setKey(d, b, +x.dataset.f, x.dataset.m === '1'); return null; }); }));
  }
  function textSheet(title, cur, apply, ph = '') {
    C().ui.sheet(() => C().ui.snav(title) + '<div style="padding:8px 0"><input class="inp" id="edtxt" type="text" maxlength="40" value="' + esc(cur || '') + '" placeholder="' + esc(ph) + '" style="width:100%"></div><div class="vrow" style="justify-content:center;gap:8px"><button class="btn" data-clr="1">' + esc(t('ed.clear')) + '</button><button class="btn fill" data-ok="1">' + esc(t('ed.ok')) + '</button></div>',
    (el, sh) => {
      const inp = el.querySelector('#edtxt');
      el.addEventListener('click', (e) => { if (e.target.closest('[data-ok]')) { sh.close(); apply(inp.value.trim()); } else if (e.target.closest('[data-clr]')) { sh.close(); apply(''); } });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { sh.close(); apply(inp.value.trim()); } });
      setTimeout(() => inp.focus(), 120);
    });
  }
  const sectionSheet = (b) => textSheet(t('ed.section'), (S.doc.masterbars[b].section || {}).text, (v) => commit((d) => { E.setSection(d, b, v); return null; }), t('ed.sectionPh'));
  const chordSheet = () => textSheet(t('ed.chord'), (E.beatAt(S.doc, S.loc) || {}).text, (v) => commit((d) => { E.setText(d, S.loc, v); return null; }), 'Am7');

  /* ---------- дорожки и «Ещё» ---------- */

  function trackSheet() {
    const sh = C().ui.sheet(() => {
      const d = S.doc, cur = S.loc.t;
      return C().ui.snav(t('ed.tracks')) + '<div class="group">' + d.tracks.map((tr, i) => '<div class="cell"><button class="grow" data-k="go" data-i="' + i + '" style="text-align:left"><span class="ttl">' + esc(tr.name || t('trackN', { n: i + 1 })) + (i === cur ? ' ✓' : '') + '</span><span class="st l2" style="display:block">' +
        esc(E.trackIsTab(d, i) ? t('ed.i.tab', { n: E.tuningOf(d, i).length }) : t('ed.i.staff')) + '</span></button>' +
        '<button class="ic sm" data-k="set" data-i="' + i + '" aria-label="' + esc(t('ed.trackSet')) + '">' + IC.more + '</button></div>').join('') + '</div>' +
        '<div class="hdr">' + esc(t('ed.addTrack')) + '</div><div class="vrow" style="flex-wrap:wrap;gap:6px">' + Object.keys(E.INSTRUMENTS).map((k) => '<button class="chip" data-k="add" data-i="' + k + '">' + esc(t('ed.i.' + k)) + '</button>').join('') + '</div>';
    }, (el, s) => el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const i = b.dataset.i;
      if (b.dataset.k === 'go') { s.close(); S.rng = null; S.mode = 'pad'; commit0(() => ({ t: +i, b: S.loc.b, v: 0, i: 0 })); }
      else if (b.dataset.k === 'add') { s.close(); commit((d) => { const n = E.addTrack(d, i); return { t: n, b: S.loc.b, v: 0, i: 0 }; }); }
      else if (b.dataset.k === 'set') { s.close(); trackSet(+i); }
    }));
    return sh;
  }
  function commit0(f) { S.loc = f(); draw(); dock(); badge(); }
  function trackSet(i) {
    const tr = S.doc.tracks[i], tab = E.trackIsTab(S.doc, i), stf = tr.staves[0];
    C().ui.sheet(() => C().ui.snav(tr.name) + '<div class="group"><button class="cell act" data-k="name"><span class="grow" style="text-align:left">' + esc(t('ed.rename')) + '</span></button>' +
      (tab ? '<button class="cell act" data-k="view"><span class="grow" style="text-align:left">' + esc(t('ed.view')) + '</span><span class="st l2">' + esc(t(stf.showtablature && stf.showstandardnotation ? 'ed.view.both' : stf.showtablature ? 'ed.view.tab' : 'ed.view.staff')) + '</span></button>' +
        '<button class="cell act" data-k="capo"><span class="grow" style="text-align:left">' + esc(t('capo.title')) + '</span><span class="st l2">' + (stf.capo || 0) + '</span></button>' +
        '<button class="cell act" data-k="tun"><span class="grow" style="text-align:left">' + esc(t('ed.tuning')) + '</span></button>' : '') +
      '<button class="cell act" data-k="mute"><span class="grow" style="text-align:left">' + esc(t('ed.mute')) + '</span><span class="st l2">' + (tr.playbackinfo.ismute ? '✓' : '') + '</span></button>' +
      (S.doc.tracks.length > 1 ? '<button class="cell act" data-k="del" style="color:var(--red)"><span class="grow" style="text-align:left">' + esc(t('ed.delTrack')) + '</span></button>' : '') + '</div>',
    (el, sh) => el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return; sh.close();
      switch (b.dataset.k) {
        case 'name': textSheet(t('ed.rename'), tr.name, (v) => v && commit((d) => { E.setTrackName(d, i, v); return null; })); break;
        case 'view': commit((d) => { const s = d.tracks[i].staves[0], both = s.showtablature && s.showstandardnotation, tabOnly = s.showtablature && !s.showstandardnotation; // оба → таб → ноты → оба
          if (both) s.showstandardnotation = false; else if (tabOnly) { s.showtablature = false; s.showstandardnotation = true; } else { s.showtablature = true; s.showstandardnotation = true; } return null; }); break;
        case 'capo': numSheet(t('capo.title'), stf.capo || 0, 0, 12, (v) => commit((d) => { E.setCapo(d, i, v); return null; })); break;
        case 'tun': tuningSheet(i); break;
        case 'mute': commit((d) => { E.setMute(d, i, !d.tracks[i].playbackinfo.ismute); return null; }); break;
        case 'del': C().ui.confirm(t('ed.delTrackQ', { name: tr.name }), t('ed.delTrackText'), t('delete')).then((ok) => { if (ok) commit((d) => { E.delTrack(d, i); return { t: 0, b: 0, v: 0, i: 0 }; }); }); break;
      }
    }));
  }
  function tuningSheet(i) {
    const tn0 = E.tuningOf(S.doc, i), inst = tn0.length === 4 ? (tn0[0] > 60 ? 'ukulele' : 'bass') : 'guitar';
    const all = [...(E.TUNINGS[inst] || []), ...(inst === 'guitar' ? ['E4 B3 G3 D3 A2 E2 B1'] : [])];
    C().ui.sheet(() => C().ui.snav(t('ed.tuning')) + '<div class="group">' + all.map((x, k) => '<button class="cell act" data-k="' + k + '"><span class="grow num" style="text-align:left">' + esc(x) + '</span></button>').join('') + '</div><p class="ftr">' + esc(t('ed.tuningFtr')) + '</p>',
    (el, sh) => el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return; sh.close();
      const parse = (s) => s.split(' ').map((n) => { const m = /^([A-G])([♯♭#b]?)(-?\d)$/.exec(n); const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (/[♯#]/.test(m[2]) ? 1 : /[♭b]/.test(m[2]) ? -1 : 0); return base + (+m[3] + 1) * 12; });
      const tn = parse(all[+b.dataset.k]);
      commit((d) => { E.setTuning(d, i, tn); return null; });
    }));
  }
  function moreSheet() {
    const d = S.doc;
    C().ui.sheet(() => C().ui.snav(t('ed.more')) + '<div class="group">' +
      '<button class="cell act" data-k="name"><span class="grow" style="text-align:left">' + esc(t('ed.title')) + '</span><span class="st l2">' + esc(S.rec.name) + '</span></button>' +
      '<button class="cell act" data-k="tempo"><span class="grow" style="text-align:left">' + esc(t('ed.tempo')) + '</span><span class="st l2">♩ = ' + E.tempoAt(d, S.loc.b) + '</span></button>' +
      '<button class="cell act" data-k="ts"><span class="grow" style="text-align:left">' + esc(t('ed.timeSig')) + '</span><span class="st l2">' + d.masterbars[S.loc.b].timesignaturenumerator + '/' + d.masterbars[S.loc.b].timesignaturedenominator + '</span></button>' +
      '<button class="cell act" data-k="key"><span class="grow" style="text-align:left">' + esc(t('ed.key')) + '</span></button>' +
      '<button class="cell act" data-k="chord"><span class="grow" style="text-align:left">' + esc(t('ed.chord')) + '</span><span class="st l2">' + esc((E.beatAt(d, S.loc) || {}).text || '') + '</span></button>' +
      '<button class="cell act" data-k="sec"><span class="grow" style="text-align:left">' + esc(t('ed.section')) + '</span></button>' +
      '<button class="cell act" data-k="tracks"><span class="grow" style="text-align:left">' + esc(t('ed.tracks')) + '</span><span class="st l2">' + d.tracks.length + '</span></button>' +
      '<button class="cell act" data-k="voice"><span class="grow" style="text-align:left">' + esc(t('ed.voice')) + '</span><span class="st l2">' + (S.loc.v + 1) + '</span></button>' +
      '<button class="cell act" data-k="x"><span class="grow" style="text-align:left">' + esc(t('live.export')) + '</span></button></div>',
    (el, sh) => el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return; sh.close();
      switch (b.dataset.k) {
        case 'name': textSheet(t('ed.title'), S.rec.name, (v) => { if (v) { S.rec.name = v; E.setMeta(S.doc, { title: v }); save(); badge(); } }); break;
        case 'tempo': tempoSheet(S.loc.b); break;
        case 'ts': timeSheet(S.loc.b); break;
        case 'key': keySheet(S.loc.b); break;
        case 'chord': chordSheet(); break;
        case 'sec': sectionSheet(S.loc.b); break;
        case 'tracks': trackSheet(); break;
        case 'voice': commit((x) => { const nv = (S.loc.v + 1) % 2; E.ensureVoice(x, S.loc.t, S.loc.b, nv); return { ...S.loc, v: nv, i: 0 }; }); break;
        case 'x': exportSheet(); break;
      }
    }));
  }
  function exportSheet() {
    C().ui.sheet(() => C().ui.snav(t('live.export')) + '<div class="group"><button class="cell act" data-k="gp">Guitar Pro (.gp)</button><button class="cell act" data-k="pdf">PDF</button><button class="cell act" data-k="mid">MIDI (.mid)</button></div><p class="ftr">' + esc(t('ed.exportFtr')) + '</p>',
    (el, sh) => el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return; sh.close();
      const fn = S.rec.name.replace(/[\\/:*?"<>|]/g, '-');
      try {
        if (b.dataset.k === 'gp') C().sendFile(E.toGp(S.doc), fn + '.gp', fn, 'application/x-guitar-pro');
        else if (b.dataset.k === 'pdf') C().sendFile(await scorePdfBytes(AT.el, env.fontUrl), fn + '.pdf', fn, 'application/pdf'); // показанная дорожка
        else { const at = await lib(); const mf = new at.midi.MidiFile(); new at.midi.MidiFileGenerator(E.toScore(S.doc), at.Settings ? new at.Settings() : null, new at.midi.AlphaSynthMidiFileHandler(mf)).generate(); C().sendFile(mf.toBinary(), fn + '.mid', fn, 'audio/midi'); }
      } catch (er) { C().logErr(er); C().ui.toast(t(b.dataset.k === 'pdf' ? 'live.pdfFail' : 'live.gpFail')); }
    }));
  }

  /* ---------- воспроизведение ---------- */

  function play() {
    if (S.mode === 'bars') endBars();
    env.togglePlay();
    setTimeout(badge, 120);
  }

  /* ---------- интерфейс ---------- */

  const b = (x, cls, label, inner, extra = '') => '<button class="edb ' + cls + '" data-e="' + x + '" aria-label="' + esc(label) + '"' + extra + '>' + inner + '</button>';
  function topHTML() {
    const d = S.doc, tr = d.tracks[S.loc.t];
    return '<div class="nedtop">' + b('close', 'ico', t('ed.close'), IC.close) +
      '<button class="edttl" data-e="more" aria-label="' + esc(t('ed.more')) + '"><span class="edname">' + esc(S.rec.name) + '</span><span class="edsave" id="edsave"></span></button>' +
      '<button class="edtr" data-e="tracks" aria-label="' + esc(t('ed.tracks')) + '">' + esc(tr.name || t('trackN', { n: S.loc.t + 1 })) + (d.tracks.length > 1 ? ' ▾' : '') + '</button>' +
      b('undo', 'ico', t('ed.undo'), IC.undo, S.undo.length ? '' : ' disabled') + b('redo', 'ico', t('ed.redo'), IC.redo, S.redo.length ? '' : ' disabled') +
      b('play', 'ico on', t('playTab'), S.playing ? IC.pause : IC.play, ' id="edplay"') + b('more', 'ico', t('ed.more'), IC.more) + '</div>';
  }
  const posText = () => {
    const p = E.posLabel(S.doc, S.loc);
    return t('ed.pos', { b: p.bar, n: p.beat }) + (S.doc.tracks[S.loc.t].staves[0].bars[S.loc.b].voices.length > 1 ? ' · ' + t('ed.voiceN', { n: S.loc.v + 1 }) : '');
  };
  const durRow = () => '<div class="edrow durs" role="group" aria-label="' + esc(t('live.dur')) + '">' + DURS.map((d) => '<button class="edb dur' + (S.dur === d ? ' on' : '') + '" data-e="dur" data-d="' + d + '" aria-label="' + esc(t('live.dur') + ' ' + DUR_LABEL[d]) + '" aria-pressed="' + (S.dur === d) + '">' + NOTE(d) + '</button>').join('') +
    '<button class="edb dur' + (S.dots ? ' on' : '') + '" data-e="dot" aria-label="' + esc(t('ed.dot')) + '" aria-pressed="' + !!S.dots + '"><b>•</b></button>' +
    '<button class="edb dur' + (S.tup ? ' on' : '') + '" data-e="tup" aria-label="' + esc(t('ed.triplet')) + '" aria-pressed="' + !!S.tup + '"><b>3</b></button></div>';
  const actRow = () => '<div class="edrow acts">' + b('prev', 'ico', t('ed.prev'), IC.left) + b('next', 'ico', t('ed.next'), IC.right) + b('rest', 'ico', t('ed.rest'), IC.rest) + b('tie', 'ico', t('ed.tie'), IC.tie) +
    '<button class="edb chp' + (S.stack ? ' on' : '') + '" data-e="stack" aria-pressed="' + S.stack + '" aria-label="' + esc(t('ed.chordStack')) + '">' + IC.chord + '</button>' +
    b('back', 'ico', t('ed.del'), IC.del) +
    '<button class="edb chp' + (S.mode === 'tech' ? ' on' : '') + '" data-e="techp" aria-pressed="' + (S.mode === 'tech') + '" aria-label="' + esc(t('ed.tech')) + '">' + IC.tech + '</button>' +
    b('fold', 'ico', t(S.mode === 'hide' ? 'ed.show' : 'ed.hide'), S.mode === 'hide' ? IC.up : IC.down) + '</div>';
  function techPanel() {
    const bt = E.beatAt(S.doc, S.loc), has = bt && !E.isRest(bt), tab = isTab();
    const list = TECH.filter(([k]) => tab || !['hp', 'slide', 'slideShift', 'bend', 'bendRel', 'dead', 'pm', 'lr', 'harm', 'slideIn', 'slideUp', 'slideDown', 'ghost'].includes(k) || k === 'ghost');
    return '<div class="edtech" role="group" aria-label="' + esc(t('ed.tech')) + '">' + list.map(([k, tk]) => '<button class="edb tc' + (has && E.techOn(S.doc, S.loc, k) ? ' on' : '') + '" data-e="tech" data-k="' + k + '"' + (has ? '' : ' disabled') + ' aria-pressed="' + (has && E.techOn(S.doc, S.loc, k)) + '">' + esc(t(tk)) + '</button>').join('') +
      '<button class="edb tc" data-e="semi" data-d="1"' + (has ? '' : ' disabled') + '>+½</button><button class="edb tc" data-e="semi" data-d="-1"' + (has ? '' : ' disabled') + '>−½</button><button class="edb tc" data-e="semi" data-d="12"' + (has ? '' : ' disabled') + '>+8</button><button class="edb tc" data-e="semi" data-d="-12"' + (has ? '' : ' disabled') + '>−8</button>' +
      '<button class="edb tc" data-e="txt">' + esc(t('ed.chord')) + '</button></div>';
  }
  function fretGrid() {
    const n = tun().length, cap = E.capoOf(S.doc, S.loc.t), cur = E.beatAt(S.doc, S.loc), on = new Set((cur ? cur.notes : []).filter((x) => x.string > 0).map((x) => x.string + ':' + x.fret));
    const w = (S.ov && S.ov.clientWidth) || 390, cols = Math.max(5, Math.min(12, Math.floor((w - 40) / 44)));
    S.f0 = Math.max(0, Math.min(S.f0, 24 - cols + 1));
    const fs = Array.from({ length: cols }, (_, j) => S.f0 + j);
    let h = '<div class="lvfret edfret" style="--n:' + n + ';grid-template-columns:30px repeat(' + cols + ',1fr)" role="group" aria-label="' + esc(t('live.in.fretboard')) + '"><span class="lvfh"></span>' +
      fs.map((f) => '<button class="lvfh' + (FRET_DOTS.includes(f) ? ' dot' : '') + '" data-e="f0" data-f="' + f + '" aria-label="' + esc(t('live.in.fret', { f })) + '">' + f + '</button>').join('');
    for (let s = n; s >= 1; s--) { // сверху — тонкая струна (номер у alphaTab: 1 — нижняя)
      const open = tun()[n - s] + cap;
      h += '<span class="lvfs">' + NAMES_SH[((open % 12) + 12) % 12] + '</span>' + fs.map((f) => '<button class="lvfc' + (on.has(s + ':' + f) ? ' on' : '') + (f === 0 ? ' op' : '') + '" data-s="' + s + '" data-f="' + f + '" aria-label="' + esc(t('live.sf', { s: n - s + 1, f })) + '"' + (on.has(s + ':' + f) ? ' aria-pressed="true"' : '') + '><i></i><b>' + f + '</b></button>').join('');
    }
    return h + '</div>';
  }
  function keysPad() {
    const ks = pianoKeys({}, S.base, 8, { blacks: true }), W = 8, pc = (x) => (x / W * 100).toFixed(3) + '%';
    return '<div class="edkbtop"><span class="edbase" data-e="base">' + NAMES_SH[S.base % 12] + Math.floor(S.base / 12 - 1) + ' – ' + NAMES_SH[(S.base + 12) % 12] + Math.floor((S.base + 12) / 12 - 1) + '</span></div>' +
      '<div class="lvpiano piano edpiano" role="group" aria-label="' + esc(t('live.in.keys')) + '">' + ks.sort((a, c) => a.black - c.black).map((x) => '<button class="lvpk' + (x.black ? ' bk' : '') + '" data-m="' + x.m + '" style="left:' + pc(Math.max(0, x.x)) + ';width:' + pc(Math.min(W, x.x + x.w) - Math.max(0, x.x)) + '" aria-label="' + esc(x.label + x.oct) + '">' +
        (x.black ? '' : '<b>' + esc(x.label) + (x.c ? '<sub>' + x.oct + '</sub>' : '') + '</b>') + '</button>').join('') + '</div>';
  }
  function barsPanel() {
    const r = S.rng, n = r ? r.b1 - r.b0 + 1 : 0, mb = r ? S.doc.masterbars[r.b0] : null;
    const bt = (k, ico, label, on) => '<button class="edb tc big' + (on ? ' on' : '') + '" data-e="bar" data-k="' + k + '" aria-label="' + esc(label) + '">' + (ico || '') + '<span>' + esc(label) + '</span></button>';
    return '<div class="edtech bars" role="group" aria-label="' + esc(t('ed.bars')) + '"><div class="edbh">' + esc(r ? (n === 1 ? t('ed.barN', { n: r.b0 + 1 }) : t('ed.barsN', { a: r.b0 + 1, b: r.b1 + 1 })) : '') + '<small>' + esc(t('ed.barsHint')) + '</small></div>' +
      '<button class="edb tc big fill" data-e="bar" data-k="done">' + IC.check + '<span>' + esc(t('ed.done')) + '</span></button>' +
      bt('copy', IC.copy, t('ed.copy')) + bt('cut', IC.cut, t('ed.cut')) + (S.clip ? bt('paste', IC.paste, t('ed.paste')) + bt('over', IC.paste, t('ed.pasteOver')) : '') + bt('del', IC.trash, t('ed.delBars')) + bt('clear', '', t('ed.clearBars')) +
      bt('ins', IC.plus, t('ed.insBefore')) + bt('add', IC.plus, t('ed.insAfter')) +
      bt('ro', '', '𝄆 ' + t('ed.repStart'), mb && mb.isrepeatstart) + bt('re', '', t('ed.repEnd') + ' 𝄇', r && S.doc.masterbars[r.b1].repeatcount > 0) + bt('v1', '', '1.', mb && mb.alternateendings === 1) + bt('v2', '', '2.', mb && mb.alternateendings === 2) +
      bt('ts', '', t('ed.timeSig') + ' ' + (mb ? mb.timesignaturenumerator + '/' + mb.timesignaturedenominator : '')) + bt('key', '', t('ed.key')) + bt('tempo', '', t('ed.tempo') + ' ♩' + (r ? E.tempoAt(S.doc, r.b0) : '')) + bt('sec', '', t('ed.section')) + '</div>';
  }
  function dockHTML() {
    if (S.mode === 'bars') return barsPanel();
    const tabs = isTab(), pad = S.mode === 'hide' ? '' : S.mode === 'tech' ? techPanel() : tabs ? fretGrid() : keysPad();
    return durRow() + actRow() + pad;
  }
  function mountUI() {
    if (S.ov) S.ov.remove();
    const ov = document.createElement('div');
    ov.className = 'ned';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', S.rec.name);
    ov.innerHTML = '<div id="edTop"></div><div class="nedscore" id="edSlot"></div><div class="nedpos" id="edPos"></div><div class="neddock" id="edDock"></div>';
    document.body.appendChild(ov);
    S.ov = ov;
    ov.querySelector('#edSlot').appendChild(AT.el || (AT.el = Object.assign(document.createElement('div'), { className: 'atsurf' })));
    wire(ov);
    document.addEventListener('keydown', onKey);
    top(); dock();
  }
  function top() { const el = S.ov && S.ov.querySelector('#edTop'); if (el) el.innerHTML = topHTML(); badge(); }
  function dock() {
    if (!S.ov) return;
    const el = S.ov.querySelector('#edDock');
    el.innerHTML = dockHTML();
    el.classList.toggle('hid', S.mode === 'hide');
    const p = S.ov.querySelector('#edPos'); if (p) p.textContent = posText();
    S.ov.style.setProperty('--edock', el.offsetHeight + 'px'); // надпись «такт · доля» — над панелью
    top();
  }
  function badge() {
    const el = S.ov && S.ov.querySelector('#edsave');
    if (el) { el.textContent = S.dirty ? '●' : '✓'; el.className = 'edsave' + (S.dirty ? ' dirty' : ''); el.title = t(S.dirty ? 'ed.saving' : 'ed.saved'); }
    const pb = S.ov && S.ov.querySelector('#edplay');
    if (pb) pb.innerHTML = S.playing ? IC.pause : IC.play;
  }

  /* ---------- события ---------- */

  function onKey(e) {
    if (!S.on || e.target.closest && e.target.closest('input,textarea,.sheet')) return;
    const k = e.key;
    if (k === 'ArrowRight') { step(1); e.preventDefault(); }
    else if (k === 'ArrowLeft') { step(-1); e.preventDefault(); }
    else if (k === 'Backspace' || k === 'Delete') { backspace(); e.preventDefault(); }
    else if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') { (e.shiftKey ? redo : undo)(); e.preventDefault(); }
    else if (k === 'r') addRest();
    else if (k === ' ') { play(); e.preventDefault(); }
    else if (/^[1-6]$/.test(k) && S.mode !== 'bars') { S.dur = DURS[+k - 1]; dock(); } // 1…6 — длительность (как в MuseScore: 5 = четверть там, у нас — по порядку значков)
    else if (isTab() && /^\d$/.test(k)) { const n = tun().length, s = nearString() || Math.ceil(n / 2); enter({ string: s, fret: +k }); }
  }
  function wire(ov) {
    ov.addEventListener('click', (e) => {
      const x = e.target.closest('[data-e]');
      if (!x) return;
      const k = x.dataset.e;
      switch (k) {
        case 'close': close(); break;
        case 'undo': undo(); break;
        case 'redo': redo(); break;
        case 'play': play(); break;
        case 'more': moreSheet(); break;
        case 'tracks': trackSheet(); break;
        case 'dur': setDur(+x.dataset.d); break;
        case 'dot': toggleDot(); break;
        case 'tup': toggleTriplet(); break;
        case 'prev': step(-1); break;
        case 'next': step(1); break;
        case 'rest': addRest(); break;
        case 'tie': addTie(); break;
        case 'stack': S.stack = !S.stack; dock(); break;
        case 'back': backspace(); break;
        case 'techp': S.mode = S.mode === 'tech' ? 'pad' : 'tech'; dock(); break;
        case 'fold': S.mode = S.mode === 'hide' ? 'pad' : 'hide'; dock(); break;
        case 'tech': tech(x.dataset.k); break;
        case 'semi': semitone(+x.dataset.d); break;
        case 'txt': chordSheet(); break;
        case 'f0': S.f0 = +x.dataset.f; dock(); break;
        case 'bar': barAct(x.dataset.k); break;
        case 'base': break;
      }
    });
    // Гриф и клавиши: касание — нота; клавиши: вверх/вниз — октава, вправо — диез, влево — бемоль; гриф: вбок — другие лады
    let g = null;
    ov.addEventListener('pointerdown', (e) => {
      const cell = e.target.closest && e.target.closest('.lvfc, .lvpk'), area = e.target.closest && e.target.closest('.edfret, .edpiano, .edkbtop');
      if (!area) return;
      g = { id: e.pointerId, x: e.clientX, y: e.clientY, cell, area: area.classList.contains('edfret') ? 'fret' : area.classList.contains('edkbtop') ? 'top' : 'keys', ax: e.clientX, moved: false };
      if (cell) cell.classList.add('dn');
    });
    ov.addEventListener('pointermove', (e) => {
      if (!g || e.pointerId !== g.id) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (g.area === 'top') { const st = Math.trunc((e.clientX - g.ax) / 18); if (st) { g.ax += st * 18; g.moved = true; shiftBase(S, -st); dock(); } return; }
      if (g.area === 'fret' && Math.abs(dx) > 40) { // тянуть вбок: окно ладов
        const cols = Math.max(5, Math.min(12, Math.floor(((S.ov.clientWidth || 390) - 40) / 44)));
        const st = Math.trunc((g.x - e.clientX) / 44);
        if (st) { g.x -= st * 44; g.moved = true; S.f0 = Math.max(0, Math.min(24 - cols + 1, S.f0 + st)); dock(); g.cell = null; }
        return;
      }
      if (g.cell && g.area === 'keys') g.cell.dataset.sw = Math.abs(dy) > 26 && Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? '↑' : '↓') : dx > 26 ? '♯' : dx < -26 ? '♭' : '';
    });
    const up = (e) => {
      if (!g || e.pointerId !== g.id) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y, cell = g.cell, area = g.area, moved = g.moved;
      g = null;
      ov.querySelectorAll('.dn').forEach((c) => c.classList.remove('dn'));
      if (!cell || moved) return;
      if (area === 'fret') { if (Math.abs(dx) < 30 && Math.abs(dy) < 30) enter({ string: +cell.dataset.s, fret: +cell.dataset.f }); return; }
      let m = +cell.dataset.m;
      if (Math.abs(dy) > 26 && Math.abs(dy) > Math.abs(dx)) { m += dy < 0 ? 12 : -12; buzz(); } // вверх — октава выше
      else if (dx > 26) { m += 1; buzz(); } else if (dx < -26) { m -= 1; buzz(); }
      enterPitch(m);
    };
    ov.addEventListener('pointerup', up);
    ov.addEventListener('pointercancel', () => { g = null; ov.querySelectorAll('.dn').forEach((c) => c.classList.remove('dn')); });
    // Стан: касание — курсор; удержание — выбор такта (дальше касанием другого такта — диапазон); щипок — масштаб
    const slot = ov.querySelector('#edSlot');
    let p = null;
    slot.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || !e.isPrimary) return;
      p = { x: e.clientX, y: e.clientY, t: Date.now(), done: false };
      clearTimeout(S.hold);
      S.hold = setTimeout(() => {
        if (!p || p.done) return; p.done = true; buzz();
        const r = AT.el.getBoundingClientRect(), h = hit(p.x - r.left, p.y - r.top);
        if (h) { S.loc = E.clampLoc(S.doc, { ...S.loc, b: h.b, i: 0 }); selectBars(h.b); }
      }, 480);
    });
    slot.addEventListener('pointermove', (e) => { if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 9) { clearTimeout(S.hold); p.done = true; } });
    slot.addEventListener('pointerup', (e) => {
      clearTimeout(S.hold);
      if (!p || p.done) { p = null; return; }
      const dt = Date.now() - p.t; p = null;
      if (dt > 450) return;
      const r = AT.el.getBoundingClientRect(), h = hit(e.clientX - r.left, e.clientY - r.top);
      if (!h) return;
      if (S.mode === 'bars' && S.rng) { // в режиме тактов касание другого такта растягивает выбор
        const a = S.rng.anchor; selectBars(a, h.b); S.rng.anchor = a; return;
      }
      S.loc = E.clampLoc(S.doc, h); S.rng = null;
      if (S.mode === 'bars') S.mode = 'pad';
      const bt = E.beatAt(S.doc, S.loc); if (bt && bt.notes[0]) blipCur();
      marks(); dock();
    });
    slot.addEventListener('pointercancel', () => { clearTimeout(S.hold); p = null; });
    // Масштаб стана — щипком двумя пальцами (как в просмотре); тап по пустому — снять выбор
    const off = pinch(ov, { min: 5, max: 20, ok: (e) => !!e.target.closest('.nedscore'), get: () => Math.round(scale() * 10), set: (v, live) => { if (live) return; env.st().edScale = v / 10; C().store.save(); draw(true); } });
    S.offPinch = off;
  }

  // alphaTab → редактор (из index.js): отрисовка закончена — курсор и выбранные такты на место
  const api = {
    get on() { return S.on; },
    marks() { if (S.on) { marks(); } },
    rendered,
    played(on) { S.playing = on; badge(); },
    closeTop() { if (S.mode === 'bars') { endBars(); return true; } if (S.mode === 'tech') { S.mode = 'pad'; dock(); return true; } close(); return true; },
  };
  return { openNew, openRec, close, api, get on() { return S.on; } };
}
