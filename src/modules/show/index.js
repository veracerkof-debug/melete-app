// Пульт выступления — часть медиатеки (DECISIONS 2026-11-15). Две страницы, между ними смахивание: «Программа» (выступления →
// номера: время, заметка, метки по времени, трек из медиатеки или без трека) и «Звуки» (банки падов: сбивки, мемы,
// «верно» и «неверно»; файлы — свои, сетка, цвета, режимы и громкость — свои). Данные и функции без DOM — src/music/show.js,
// звук падов — src/audio/showpads.js (шина медиатеки). Основной трек, фон и пульт с фейдерами — следующий этап (docs/show.md).
import './show.css';
import meta from './meta.js';
import { createShowPads } from '../../audio/showpads.js';
import { createShowDeck } from '../../audio/showdeck.js';
import { createShowBed } from '../../audio/showbed.js';
import { measureBlob, normGainDb } from '../../audio/loudness.js';
import { swipe } from '../../ui/gestures.js';
import { sortable, dragSort, buzz, onHold } from '../../ui/hold.js';
import { arrange, bindLayout } from '../../ui/layout.js';
import * as M from '../../music/show.js';
import { stemsOf } from '../../core/jobs.js';
import { holdScreen } from '../../core/screenon.js';

const I = {
  gear: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M5 19l1-4 9.5-9.5a2 2 0 0 1 3 3L9 18z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12"/></svg>',
};
const NOTE_M = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'], NOTE_m = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const keyName = (pc, minor) => (minor ? NOTE_m : NOTE_M)[((pc % 12) + 12) % 12] + (minor ? 'm' : '');

let host = null, ctx = null, size = 'full', S = null, eng = null, unsubEng = null, edit = false;
let meterNode = null, meterT = 0, duckOn = false, master = null, bed = null, unsubBed = null, deck = null, unsubDeck = null, deskT = 0, offs = [], tickT = 0, raf = 0, wake = null;
const PAGES = ['desk', 'pads']; // два экрана звукаря (слово автора 22.11.2026): «Эфир» и «Звуки»; программа и фон — шторками
let vsheet = null; // открытая шторка «Программа» / «Фон»: { kind, api }
const held = new Map(); // касание → пад «пока держат»

const t = (k, v) => ctx.t(k, v), esc = (s) => ctx.ui.esc(s);
const save = () => ctx.store.save();
const fileOf = (id) => (id ? ctx.files.get(id) : null);
const blobOf = (id) => { const f = fileOf(id); return f ? f.blob : null; };
const cur = () => M.eventOf(S);
// Дорожки разделённой записи: лучший набор (больше дорожек, улучшенный раньше) → { часть: Blob }; нет разделения — null
function partSet(fileId) {
  if (!ctx || !ctx.files) return [];
  const by = {}; stemsOf(ctx.files, fileId).forEach((r) => { (by[(r.stem.mode || '4') + (r.stem.hq ? 'hq' : '')] ??= []).push(r); });
  return Object.values(by).sort((a, b) => b.length - a.length || (b[0].stem.hq ? 1 : 0) - (a[0].stem.hq ? 1 : 0))[0] || [];
}
const partsOf = (fileId) => { const set = partSet(fileId).filter((r) => r.blob); if (!set.length) return null; const o = {}; set.forEach((r) => { o[r.stem.part] = r.blob; }); return o; };
// Номеру нужны дорожки, если у него задан свод или в программе есть события со сводом
const needParts = (n) => !!n && (Object.keys(n.mix || {}).length > 0 || (n.prog || []).some((e) => e.mix));
const allPads = () => S.banks.flatMap((b) => b.pads.filter(Boolean));

/* ---------- звук ---------- */

// Общая громкость пульта: узел между всем, что играет пульт (пады, трек, фон), и шиной медиатеки; шкала 0–100
function destNode() {
  if (!master) { const bus = ctx.audio.bus('media'); if (!bus) return null; master = bus.context.createGain(); master.gain.value = M.faderGain(S.master);
    // страховка от перегруза: когда играют трек, пэд, шум и пады сразу, сумма не должна упираться в потолок (быстрый лимитер у потолка −2 дБ)
    const lim = bus.context.createDynamicsCompressor(); lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.12;
    master.connect(lim); lim.connect(bus);
    try { meterNode = bus.context.createAnalyser(); meterNode.fftSize = 512; lim.connect(meterNode); } catch (e) { meterNode = null; } } // метр уровня — только слушает, на звук не влияет
  return master;
}
// Вывод на другое устройство (DEV, core/output.js): методы движков уходят туда, куда выбрано для категории; по умолчанию — у себя
function shareOut(cat, name, engine, methods, o) { try { if (ctx.output && ctx.output.enabled) ctx.output.share(cat, name, engine, methods, o); } catch (e) { ctx.logErr(e); } }
function ensureEng() {
  if (!ctx.audio.unlock()) { ctx.ui.toast(t('noAudio')); return null; }
  ctx.audio.release();
  if (!eng) {
    const bus = destNode();
    if (!bus) return null;
    eng = createShowPads({ dest: bus, getBlob: blobOf, getNorm: () => S.norm, known: (id) => { const f = fileOf(id); return f && Number.isFinite(f.lufs) ? { lufs: f.lufs, peak: f.pk } : null; }, onMeasure: (id, m) => saveLoud(id, m) });
    shareOut('sound', 'show.pads', eng, ['press', 'release', 'stop', 'stopAll', 'setLevel', 'setDuck'], { ret: { press: 'play' }, drop: () => eng.stopAll(0.4) });
  }
  if (!unsubEng) { unsubEng = eng.subscribe(kick); eng.setLevel(S.level); eng.setDuck(S.duckAmount, S.duckTime); }
  return eng;
}
function ensureDeck() {
  const en = ensureEng(); if (!en) return null;
  if (!deck) { deck = createShowDeck({ dest: en.duckNode, getBlob: blobOf, getParts: partsOf });
    shareOut('media', 'show.deck', deck, ['start', 'stop', 'pause', 'resume', 'seek', 'setLevel', 'setNorm', 'setShift', 'setTrim', 'setEq', 'setTempo'], { ret: { start: () => Promise.resolve(0), resume: () => Promise.resolve() }, drop: () => deck.stop(0.3) });
  }
  if (!unsubDeck) { unsubDeck = deck.subscribe(() => deskPaint(true)); deck.setTrim(S.deckLevel); }
  return deck;
}
function ensureBed() {
  if (!ctx.audio.unlock()) { ctx.ui.toast(t('noAudio')); return null; }
  ctx.audio.release();
  if (!bed) { const bus = destNode(); if (!bus) return null; bed = createShowBed({ dest: bus, getBlob: blobOf });
    shareOut('sound', 'show.bed', bed, ['padOn', 'padOff', 'padTonic', 'padLevel', 'padSound', 'setNoise', 'stopNoise', 'noiseTrim', 'setLevel'], { ret: { setNoise: () => Promise.resolve() }, drop: () => { bed.padOff(0.4); bed.stopNoise(0.4); } });
  }
  if (!unsubBed) { bed.setLevel(S.bedLevel); unsubBed = bed.subscribe(() => { if (vsheet && vsheet.kind === 'bed') vsheet.api.update(); }); }
  return bed;
}
/* ---------- громкость записей (нормализация) ---------- */

function saveLoud(id, m) { const f = fileOf(id); if (!f) return; f.lufs = Number.isFinite(m.lufs) ? Math.round(m.lufs * 10) / 10 : -200; f.pk = Number.isFinite(m.peak) ? Math.round(m.peak * 10) / 10 : -180; ctx.files.save(f); }
const loudOf = (id) => { const f = fileOf(id); return f && Number.isFinite(f.lufs) ? { lufs: f.lufs, peak: f.pk } : null; };
const loudJobs = new Map();
// Измерить громкость записи один раз и запомнить в записи медиатеки; повторные запросы ждут то же измерение
function ensureLoud(id) {
  if (!id || loudOf(id) || !fileOf(id)) return Promise.resolve(loudOf(id));
  if (!loudJobs.has(id)) loudJobs.set(id, measureBlob(blobOf(id)).then((m) => { saveLoud(id, m); return loudOf(id); }).catch((e) => { ctx.logErr(e); return null; }).finally(() => { loudJobs.delete(id); if (S && host && S.page === 'desk') render(); }));
  return loudJobs.get(id);
}
// Фоном, по одному и не при идущем треке: у всех номеров программы с треком измерить громкость заранее
let loudBusy = false;
async function queueLoud() {
  if (loudBusy || !S || !S.norm.on) return;
  loudBusy = true;
  try {
    for (const e of S.events.filter((x) => !x.deleted)) for (const n of e.numbers) {
      if (!host) return;
      if (n.kind === 'track' && n.file && !loudOf(n.file) && !(deck && deck.state.playing)) await ensureLoud(n.file);
    }
  } finally { loudBusy = false; }
}
// Тональность и темп записи — один раз, приблизительно (песня не меняется): чтобы пэд всегда совпадал, а переход был виден заранее.
// Только когда ничего не играет: разбор не должен мешать звуку; уже разобранное (медиатекой) не трогаем
const anaOk = (f) => !!(f && f.ana && f.ana.pc != null);
const anaJobs = new Map();
function ensureAna(id) {
  const f = fileOf(id);
  if (!f || anaOk(f) || f.anaTried || anaJobs.has(id)) return anaJobs.get(id) || Promise.resolve(null);
  const job = import('../../core/songanalyze.js').then((m) => m.analyzeAudio(f.blob)).then((a) => {
    const r = fileOf(id); if (!r) return null;
    r.ana = { ...(r.ana || {}), pc: a.key ? a.key.pc : null, minor: !!(a.key && a.key.minor), cents: a.tuning ? a.tuning.cents : null, bpm: a.tempo ? Math.round(a.tempo.bpm) : (r.ana && r.ana.bpm) || null, v: 1, at: Date.now() };
    ctx.files.save(r); return r.ana;
  }).catch((e) => { const r = fileOf(id); if (r) { r.anaTried = true; ctx.files.save(r); } ctx.logErr(e); return null; })
    .finally(() => { anaJobs.delete(id); if (S && host && S.page === 'desk' && !(deck && deck.state.playing)) render(); });
  anaJobs.set(id, job); return job;
}
let anaBusy = false;
async function queueAna() {
  if (anaBusy || !S) return;
  anaBusy = true;
  try {
    for (const e of S.events.filter((x) => !x.deleted)) for (const n of e.numbers) {
      if (!host) return;
      if (n.kind === 'track' && n.file && !anaOk(fileOf(n.file)) && !(deck && deck.state.playing)) await ensureAna(n.file);
    }
  } finally { anaBusy = false; }
}
// Тональность (со сдвигом номера) и темп номера — для списка и подсказки перехода
// Своя правка номера (тональность записи, темп) сильнее определённого автоматически
const effAna = (n) => {
  const f = n && n.kind === 'track' ? fileOf(n.file) : null, a = f && f.ana ? f.ana : null;
  const pc = n && n.keyPc != null ? n.keyPc : a && a.pc != null ? a.pc : null;
  if (pc == null && !(n && n.bpm) && !(a && a.bpm)) return null;
  return { ...(a || {}), pc, minor: n && n.keyPc != null ? !!n.minor : !!(a && a.minor), bpm: n && n.bpm ? n.bpm : a && a.bpm ? a.bpm : null };
};
const numKey = (n) => { const a = effAna(n); return a && a.pc != null ? keyName(a.pc + n.shift, a.minor) : ''; };
const numBpm = (n) => { const a = effAna(n); return a && a.bpm ? Math.round(a.bpm) : 0; };
// Поправка нормализации номера (дБ): до общей цели; нет измерения или выключено — 0
const normDb = (n) => { const m = n && n.kind === 'track' ? loudOf(n.file) : null; return S.norm.on && m ? normGainDb(m.lufs, m.peak, S.norm.target) : 0; };

const anaOf = (n) => effAna(n);
const bedTonic = (n) => M.tonicFor(S, n, anaOf(n), bed ? bed.state.tonic : 0);
const noiseRec = (id) => S.noises.find((x) => x.id === id) || null;
const nPadLevel = (n) => (n && n.bed && n.bed.padLevel != null ? n.bed.padLevel : S.bed.pad.level);
const nNoiseLevel = (n) => (n && n.bed && n.bed.noiseLevel != null ? n.bed.noiseLevel : S.bed.noise.level);
const noiseVol = (r, n = M.currentNumber(S)) => Math.round((r ? r.level : 100) * nNoiseLevel(n) / 100);
function padStart(n) { const b = ensureBed(); if (b) b.padOn({ pc: bedTonic(n), level: nPadLevel(n), sound: S.bed.pad.sound }); }
async function noiseTo(id, n = M.currentNumber(S)) {
  const b = ensureBed(); if (!b) return;
  const r = noiseRec(id);
  try { if (r) await b.setNoise(r.file, noiseVol(r, n), S.bed.noise.xfade); else b.stopNoise(S.bed.noise.xfade); S.bed.noise.cur = r ? r.id : null; save(); } catch (e) { ctx.logErr(e); ctx.ui.toast(t('bed.noiseErr')); }
  if (vsheet && vsheet.kind === 'bed') vsheet.api.update();
}
// Фон номера при его запуске: заданное в номере; тональность пэда следует за номером, если не задана вручную
async function applyBed(n) {
  if (n.bed) {
    if (n.bed.pad) { S.bed.pad.on = true; padStart(n); } else if (bed && bed.state.pad) { S.bed.pad.on = false; bed.padOff(S.goFade); }
    save();
    if ((n.bed.noise || '') !== (S.bed.noise.cur || '')) await noiseTo(n.bed.noise || null, n); else if (bed && noiseRec(S.bed.noise.cur)) bed.noiseTrim(noiseVol(noiseRec(S.bed.noise.cur), n));
    if (bed && bed.state.pad) bed.padLevel(nPadLevel(n));
  } else if (bed && bed.state.pad && S.bed.pad.tonic == null) bed.padTonic(bedTonic(n));
}
// Раскрыть файлы заранее: касание должно играть сразу. Сначала видимый банк и закреплённый ряд, потом остальное
function preload() {
  if (!eng) return;
  const b = M.bankOf(S), d = M.dockOf(S);
  eng.preload([...(d ? d.pads : []), ...b.pads, ...allPads()].filter(Boolean)).then(paint);
}

function paint() {
  if (!host) return;
  host.querySelectorAll('.shpad[data-pad]').forEach((el) => {
    const pl = eng ? eng.playing(el.dataset.pad) : null, p = M.padById(S, el.dataset.pad);
    el.classList.toggle('play', !!pl);
    el.classList.toggle('err', !!(p && p.file && eng && eng.failed(p.file)));
    if (pl) { const x = (eng.now() - pl.t0) / pl.len; el.style.setProperty('--p', Math.max(0, Math.min(1, pl.loop ? x % 1 : x)) * 100 + '%'); }
  });
}
function kick() { paint(); if (!raf && eng && eng.active) raf = requestAnimationFrame(loop); }
function loop() { paint(); raf = eng && eng.active ? requestAnimationFrame(loop) : 0; }

/* ---------- страницы ---------- */

function padHTML(p, dock) {
  const f = fileOf(p.file), pc = ' pc-' + p.color;
  if (p.synth) return '<button class="shpad' + pc + '" data-pad="' + p.id + '" aria-label="' + esc(p.name || t('synth.' + p.synth)) + '"><b>' + esc(p.name || t('synth.' + p.synth)) + '</b></button>';
  if (!p.file) return '<button class="shpad empty' + pc + '" data-pad="' + p.id + '" aria-label="' + esc(t('emptyPad')) + '"><b>' + esc(p.name || t('emptyPad')) + '</b></button>';
  const meta = S.ui.info && !dock ? [f && f.dur ? M.mmss(f.dur) : '', p.mode === 'loop' ? t('padLoop') : p.mode === 'hold' ? t('padHold') : ''].filter(Boolean).join(' · ') : '';
  return '<button class="shpad' + pc + '" data-pad="' + p.id + '" aria-label="' + esc(p.name || (f ? f.name : '')) + '"><b>' + esc(p.name || (f ? f.name : '')) + '</b>' + (meta ? '<span>' + esc(meta) + '</span>' : '') + '</button>';
}
// Фон — часть экрана «Звуки»: вкл/выкл, тональность, шум одной полосой; подробности — «⋯»
function bedBarHTML() {
  const b = S.bed, n = M.currentNumber(S), ton = bedTonic(n), tn = M.TONIC_NAMES, man = b.pad.tonic;
  const key = (v, l, on, cur) => '<button class="shdk' + (on ? ' on' : '') + (cur ? ' cur' : '') + '" data-tonic="' + v + '" aria-pressed="' + on + '">' + esc(l) + '</button>';
  // подпись у группы — маленькая: «Фон F♯» (вкл/выкл), «Авто», «⋯»; сами клавиши — крупные
  return '<div class="shbedbar"><div class="shbedrow"><button class="shcap' + (b.pad.on ? ' on' : '') + '" data-x="bedtoggle" aria-pressed="' + b.pad.on + '">' + esc(t('page.bed') + ' ' + tn[ton]) + '</button>' +
    '<button class="shcap' + (man == null ? ' on' : '') + '" data-tonic="" aria-pressed="' + (man == null) + '">' + esc(t('bed.tonicAuto')) + '</button>' +
    '<span class="grow"></span><button class="shcap" data-x="bedsheet" aria-label="' + esc(t('bed.more')) + '">⋯</button></div>' +
    '<div class="shbedkeys" role="group" aria-label="' + esc(t('bed.tonic')) + '">' + tn.map((x, i) => key(String(i), x, man === i, b.pad.on && ton === i)).join('') + '</div>' +
    (S.noises.length ? '<div class="shnoises hscroll">' + S.noises.map((r) => '<button class="shnoise' + (b.noise.cur === r.id ? ' on' : '') + '" data-noise="' + r.id + '" aria-pressed="' + (b.noise.cur === r.id) + '">' + esc(r.name || (fileOf(r.file) || {}).name || '') + '</button>').join('') + '</div>' : '') + '</div>';
}
// «Звуки»: фон (дрон), драм-пэды (готовый банк «Ударные» — компактно, как клавиши фона), свои звуки (банки с вкладками — всё остальное место), закреплённые, крутилки
const padCell = (p, i, dock) => (p ? padHTML(p, dock) : '<button class="shpad empty" data-cell="' + i + '"' + (dock ? ' data-dock="1"' : '') + ' aria-label="' + esc(t('emptyPad')) + '"><b>+</b></button>');
// Пустые ячейки не рисуются (слово автора 26.11.2026): только занятые и одна «+» следом; в правке видны все
const filled = (p) => !!(p && (p.file || p.synth));
const shownCells = (pads) => { if (edit) return pads.map((p, i) => [p, i]); let L = -1; pads.forEach((p, i) => { if (filled(p)) L = i; }); return pads.slice(0, Math.min(pads.length, L + 2)).map((p, i) => [p, i]); };
function padsBlocks() {
  const banks = S.banks.filter((x) => !x.pinned), drum = banks.find((x) => x.preset === 'drums'), sound = banks.filter((x) => x !== drum), d = S.ui.dock ? M.dockOf(S) : null;
  let b = M.bankOf(S); if (drum && b && b.id === drum.id) b = sound[0] || null;
  if (!b) b = sound[0] || drum || null;
  const blocks = [{ id: 'bed', html: bedBarHTML() }];
  if (drum && S.ui.drums) blocks.push({ id: 'drums', html: '<div class="shlbl">' + esc(t('pads.drums')) + '</div><div class="shpads drm" style="--c:' + drum.cols + ';--r:' + drum.rows + '">' + drum.pads.map((p, i) => padCell(p, i)).join('') + '</div>' });
  blocks.push({ id: 'sounds', html: '<div class="shbanks" role="tablist" aria-label="' + esc(t('bank.title')) + '">' + sound.map((x, i) => '<button role="tab" class="' + (b && x.id === b.id ? 'on' : '') + '" data-bank="' + x.id + '" aria-selected="' + (!!b && x.id === b.id) + '">' + esc(x.name || t('bank.untitled', { n: banks.indexOf(x) + 1 })) + ' <small>' + x.pads.filter(filled).length + '</small></button>').join('') +
    '<button class="add" data-x="bankadd" aria-label="' + esc(t('bank.new')) + '">' + I.plus + '</button></div>' +
    (b && b !== drum ? (() => { const cs = shownCells(b.pads); return '<div class="shpads" style="--c:' + b.cols + ';--r:' + Math.max(1, Math.ceil(cs.length / b.cols)) + '">' + cs.map(([p, i]) => padCell(p, i)).join('') + '</div>'; })() : '') });
  const foot = (h) => '<div class="shfoot">' + h + barHTML() + '</div>'; // закреплённые пэды и громкости всегда внизу, даже когда страница прокручивается
  // закреплённые пэды — только занятые (в правке — все); под ними «Ведущий» (пока держат, всё тише на 10 дБ) и «Стоп звуки»
  const dockCells = d ? (edit ? d.pads.map((p, i) => [p, i]) : d.pads.map((p, i) => [p, i]).filter(([p]) => filled(p))) : [];
  const duckRow = '<div class="shduckrow"><button class="shduck" data-duck aria-label="' + esc(t('duck.aria')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg><span>' + esc(t('duck.btn')) + '</span></button><button class="shstop" data-x="stopall">' + esc(t('stopAll')) + '</button></div>';
  blocks.push({ id: 'dock', html: foot((dockCells.length ? '<div class="shdock" style="--c:' + Math.max(1, Math.min(d.cols, dockCells.length)) + '">' + dockCells.map(([p, i]) => padCell(p, i, true)).join('') + '</div>' : '') + duckRow) });
  return blocks;
}
const layOf = (page) => { const L = (S.layout ||= {}); return (L[page] ||= { order: [], hidden: [], size: {} }); };
const padsHTML = () => arrange(padsBlocks(), layOf('pads'), { t, name: (id) => t('lay.b.' + id), grow: ['sounds'] });
function numHTML(n, i) {
  const f = fileOf(n.file), a = effAna(n);
  const meta = [
    n.kind === 'track' ? (f ? esc(f.name) : esc(t('num.noFile'))) : esc(t('num.noTrack')),
    n.kind === 'track' && a && a.pc != null ? '<i>' + esc(keyName(a.pc + n.shift, a.minor)) + (n.shift ? ' ' + (n.shift > 0 ? '+' : '−') + Math.abs(n.shift) : '') + '</i>' : '',
    n.dur ? M.mmss(n.dur) : '',
    tcOf(n).length ? esc(t('num.cuesN', { n: tcOf(n).length })) : '',
    n.note ? esc(t('num.hasNote')) : '',
  ].filter(Boolean).map((x) => '<span>' + x + '</span>').join('');
  return '<button class="shnum' + (n.done ? ' done' : '') + '" data-num="' + n.id + '"><span class="ntm">' + (n.at != null ? M.hhmm(n.at) : '') + '</span><span><span class="nnm">' + esc(n.title || t('num.untitled', { n: i + 1 })) + '</span><span class="nmt">' + meta + '</span></span></button>';
}
function evSub(e) {
  if (!e.start) return '';
  const d = new Date(e.start), p = (v) => String(v).padStart(2, '0');
  return p(d.getDate()) + '.' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function progHTML() {
  const e = cur();
  if (!e) return '<div class="shempty"><b>' + esc(t('event.empty')) + '</b>' + esc(t('event.emptyText')) + '</div><div class="shprog"><button class="shadd" data-x="evnew">+ ' + esc(t('event.new')) + '</button></div>';
  return '<div class="shprog"><div class="shev"><button class="evt" data-x="evpick">' + esc(e.title || t('event.untitled', { n: S.events.filter((x) => !x.deleted).indexOf(e) + 1 })) + '<small>' + esc(evSub(e)) + '</small></button>' +
    ctx.ui.icb('data-x="evedit"', I.pen, t('event')) + '</div>' +
    (e.numbers.length ? '<div class="shlist">' + e.numbers.map(numHTML).join('') + '</div>' : '<div class="shempty"><b>' + esc(t('prog.empty')) + '</b>' + esc(t('prog.emptyText')) + '</div>') +
    '<button class="shadd" data-x="numnew">+ ' + esc(t('num.add')) + '</button></div>';
}
function bedHTML() {
  const b = S.bed, n = M.currentNumber(S), ton = bedTonic(n), tn = M.TONIC_NAMES;
  return '<div class="shprog shbedp"><div class="hdr">' + esc(t('bed.pad')) + '</div>' +
    '<div class="group"><div class="cell"><span class="grow"><b class="shbk">' + esc(t('bed.keyNow', { k: tn[ton] })) + '</b><span class="st l2" style="display:block;font-size:13px">' + esc(t('bed.padOn')) + '</span></span>' + ctx.ui.sw('bpad', b.pad.on, t('bed.padOn')) + '</div></div><p class="ftr">' + esc(t('bed.padHint')) + '</p>' +
    '<div class="hdr">' + esc(t('bed.tonic')) + '</div><div class="shchips tight">' + [['', t('bed.tonicAuto')], ...tn.map((x, i) => [String(i), x])].map(([v, l]) => { const on = (b.pad.tonic == null ? '' : String(b.pad.tonic)) === v; return '<button class="shchip' + (on ? ' on' : '') + '" data-tonic="' + v + '" aria-pressed="' + on + '">' + esc(l) + '</button>'; }).join('') + '</div>' +
    '<div class="hdr">' + esc(t('bed.sound')) + '</div><div class="shchips">' + M.PAD_SOUNDS.map((k) => '<button class="shchip' + (b.pad.sound === k ? ' on' : '') + '" data-bsnd="' + k + '" aria-pressed="' + (b.pad.sound === k) + '">' + esc(t('bed.snd.' + k)) + '</button>').join('') + '</div>' +
    '<div class="group sgroup" style="margin-top:12px">' + slider('padlvl', t('bed.level'), b.pad.level, 0, 100, 1, lvTxt(b.pad.level)) + '</div>' +
    '<div class="hdr">' + esc(t('bed.noise')) + '</div>' +
    (S.noises.length ? '<div class="shnoises">' + S.noises.map((r) => '<button class="shnoise' + (b.noise.cur === r.id ? ' on' : '') + '" data-noise="' + r.id + '" aria-pressed="' + (b.noise.cur === r.id) + '">' + esc(r.name || (fileOf(r.file) || {}).name || '') + '</button>').join('') + '</div>' : '<p class="ftr">' + esc(t('bed.noiseEmpty')) + '</p>') +
    '<div class="group" style="margin-top:8px"><button class="cell act" data-x="noiseadd"><span class="grow">' + esc(t('bed.noiseAdd')) + '</span></button></div>' +
    '<div class="group sgroup" style="margin-top:12px">' + slider('noiselvl', t('bed.noiseLevel'), b.noise.level, 0, 100, 1, lvTxt(b.noise.level)) + slider('xfade', t('bed.xfade'), b.noise.xfade, 0.2, 20, 0.2, secTxt(b.noise.xfade)) + '</div><p class="ftr">' + esc(t('bed.noiseHint')) + '</p>' +
    '<div class="group" style="margin-top:12px"><button class="cell" data-x="bedoff" style="color:var(--red)"><span class="grow">' + esc(t('bed.off')) + '</span></button></div></div>';
}
const KNOBS = [['master', 'desk.master'], ['deck', 'desk.track'], ['bed', 'desk.bed'], ['pads', 'desk.sounds']];
// Крутилки громкости внизу каждой страницы, кроме «Пульта» (там фейдеры): общая, трек, фон, звуки — всегда под рукой
function knobHTML(k, lb) {
  const v = volOf(k); return '<div class="shkn"><div class="shknob" data-knob="' + k + '" role="slider" tabindex="0" aria-label="' + esc(t(lb)) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + v + '">' +
    '<svg viewBox="0 0 44 44" aria-hidden="true"><path class="kt" pathLength="100" stroke-dasharray="99 100" d="M9.98 34.02A17 17 0 1 1 34.02 34.02"/><path class="kv" pathLength="100" stroke-dasharray="' + v * 0.99 + ' 100" d="M9.98 34.02A17 17 0 1 1 34.02 34.02"/></svg><b>' + v + '</b></div><span class="shkl">' + esc(t(lb)) + '</span></div>';
}
// Нижняя полоса «Эфира»: одна кнопка пауза/играть и общие крутилки рядом («ГО» и «Дальше» убраны — переход смахиванием по номеру)
// Аварийный стоп: первое касание «заряжает» (кнопка меняется), второе в течение 1,5 с гасит всё — трек, звуки, фон. Одно касание ничего не делает
let panicAt = 0, panicT = 0;
function panic() {
  if (!panicAt) {
    panicAt = Date.now(); if (S.ui.buzz) buzz();
    clearTimeout(panicT); panicT = setTimeout(() => { panicAt = 0; if (host) host.querySelectorAll('.shpanic').forEach((b) => { b.classList.remove('armed'); b.textContent = '■'; }); }, 1500);
    if (host) host.querySelectorAll('.shpanic').forEach((b) => { b.classList.add('armed'); b.textContent = t('desk.panicAgain'); });
    return;
  }
  clearTimeout(panicT); panicAt = 0;
  try { if (deck) deck.stop(0.12); } catch (e) { ctx.logErr(e); }
  try { if (eng) eng.stopAll(0.1); } catch (e) { ctx.logErr(e); }
  try { if (bed) { bed.padOff(0.25); bed.stopNoise(0.25); } S.bed.pad.on = false; S.bed.noise.cur = null; save(); } catch (e) { ctx.logErr(e); }
  if (S.ui.buzz) buzz();
  render();
}
function barHTML() {
  const n = M.currentNumber(S), own = !!(deck && n && n.kind === 'track' && deck.state.file === n.file && deck.state.playing);
  const cells = Array.from({ length: METER_N }, () => '<i></i>').join('');
  return '<div class="shstrip shbar" role="group" aria-label="' + esc(t('desk.levels')) + '"><div class="shmeter" aria-hidden="true">' + cells + '</div><div class="shbrow">' +
    '<label class="shhf"><i data-vfill="master" style="width:' + S.master + '%"></i><span>' + esc(t('desk.master')) + '</span><em class="num" data-vols="master">' + S.master + '</em><input type="range" class="shmr" data-vol="master" min="0" max="100" value="' + S.master + '" aria-label="' + esc(t('desk.master')) + '"></label>' +
    '<button class="shsnd" data-x="levels" aria-label="' + esc(t('desk.levels')) + '">' + esc(t('desk.sound')) + '</button>' +
    '<button class="shpanic' + (panicAt ? ' armed' : '') + '" data-x="panic" aria-label="' + esc(t('desk.panic')) + '">' + esc(panicAt ? t('desk.panicAgain') : '■') + '</button>' +
    '<button class="shplay' + (own ? ' on' : '') + '" id="shpp" data-x="pp" aria-label="' + esc(t(own ? 'desk.pause' : 'desk.play')) + '">' + esc(own ? '❚❚' : '▶') + '</button></div></div>';
}
// Шторка «Звук» (слово автора 26.11.2026): на экране только общая громкость, остальные уровни — здесь; нажал, подправил, закрыл
function levelsSheet() {
  const row = ([k, lb]) => '<div class="sslider"><div class="ssl"><span>' + esc(t(lb)) + '</span><b class="num" data-vols="' + k + '">' + volOf(k) + '</b></div><input type="range" class="range" data-vol="' + k + '" min="0" max="100" value="' + volOf(k) + '" aria-label="' + esc(t(lb)) + '"></div>';
  ctx.ui.sheet(() => '<div class="shprog"><div class="hdr">' + esc(t('desk.levels')) + '</div><div class="group sgroup" style="margin-top:6px">' + KNOBS.slice(1).map(row).join('') + '</div></div>', (el) => {
    el.addEventListener('input', onInput);
    el.addEventListener('change', onChange);
  });
}
function stripHTML() {
  return '<div class="shstrip" role="group" aria-label="' + esc(t('desk.levels')) + '">' + KNOBS.map(([k, lb]) => knobHTML(k, lb)).join('') + '</div>';
}
// Громкости самого номера: трек, пэд, шум — крутилки прямо над фейдерами пульта
const fader = (k, label, v) => '<div class="shfd"><span class="shfn">' + esc(label) + '</span><b class="shfv" data-fv="' + k + '">' + v + '</b><div class="shtrack" data-fader="' + k + '" role="slider" tabindex="0" aria-label="' + esc(label) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + v + '" style="--v:' + v + '%">' +
  '<i class="tk" style="bottom:25%"></i><i class="tk" style="bottom:50%"></i><i class="tk" style="bottom:75%"></i><div class="shfill"></div><div class="shcap"></div></div><span class="shfo" data-fo="' + k + '">' + M.dbText(v) + ' ' + esc(t('db')) + '</span></div>';
// Тайм-коды номера (слово автора 22.11.2026): свои метки номера и метки самой записи из медиатеки — вместе, по времени
const tcOf = (n) => {
  const f = n && n.kind === 'track' ? fileOf(n.file) : null, own = (n && n.cues) || [];
  const fm = (f && Array.isArray(f.marks) ? f.marks : []).filter((m) => m && Number.isFinite(+m.t)).map((m, i) => ({ id: 'fm' + i, t: +m.t, text: String(m.name || '').slice(0, 200) || t('tc.mark', { n: i + 1 }), mark: true }));
  return own.concat(fm.filter((m) => !own.some((c) => Math.abs(c.t - m.t) < 0.6))).sort((a, b) => a.t - b.t);
};
// Перейти к тайм-коду: идёт этот трек — перемотать; нет — запустить номер с этого места
async function jumpTo(n, sec) {
  if (!n || n.kind !== 'track') return;
  if (deck && deck.state.file === n.file && (deck.state.playing || deck.state.time > 0)) { deck.seek(sec); if (!deck.state.playing) deck.resume(); deskPaint(); return; }
  S.cur = n.id; save(); await startNumber(n, sec);
}
// Единый список выступления — всегда на «Эфире»: номер, название, тональность, темп, заметка. Касание — выбрать (играет только ▶),
// смахнуть влево — плавно перейти к номеру, смахнуть вправо по проигранному — вернуть в программу, удержать — настройки номера
function pickHTML() {
  const e = cur(); if (!e) return '';
  const st = deck ? deck.state : null, nx = M.nextNumber(S);
  return '<div class="shpicks" role="list" aria-label="' + esc(t('pick.list')) + '">' + e.numbers.map((n, i) => {
    const k = numKey(n), b = numBpm(n), f = n.kind === 'track' ? fileOf(n.file) : null, on = !!(st && st.playing && n.kind === 'track' && st.file === n.file);
    // слово автора 26.11.2026: играющий и следующий номера выделены цветом, размер строк у всех один; под названием — тональность · темп · длина · заметка
    const note = n.note ? n.note.split('\n')[0] : '', dur = n.dur || (f && f.dur) || 0;
    const meta = [k, b ? String(b) : '', dur ? M.mmss(dur) : '', note || (n.kind === 'track' ? (f ? f.name : t('num.noFile')) : '')].filter(Boolean).join(' · ');
    const isNx = !!(nx && nx.id === n.id && n.id !== S.cur);
    return '<button class="shpick' + (n.id === S.cur ? ' cur' : '') + (isNx ? ' nx' : '') + (n.done ? ' done' : '') + (on ? ' playing' : '') + '" role="listitem" data-pick="' + n.id + '" aria-pressed="' + on + '"' + (n.id === S.cur ? ' aria-current="true"' : '') + '><i>' + (on ? '■' : i + 1) + '</i>' +
      '<span class="shpt"><b>' + esc(n.title || t('num.untitled', { n: i + 1 })) + '</b>' + (meta ? '<small>' + esc(meta) + '</small>' : '') + '</span>' +
      '<span class="shrt" data-at="' + esc(n.at != null ? M.hhmm(n.at) : '') + '">' + esc(n.at != null ? M.hhmm(n.at) : '') + '</span>' + (n.id === S.cur ? '<u class="shpg"></u>' : '') + '</button>';
  }).join('') + '<button class="shpick add" data-x="numnew">+ ' + esc(t('num.add')) + '</button></div>';
}
// Плавный переход к номеру: идущий затухает за время его выхода, выбранный входит со своим нарастанием; прежний — проигран, выбранный — снова в программе
async function glideTo(n) {
  const cn = M.currentNumber(S);
  if (cn && cn.id === n.id && deck && deck.state.playing) return;
  if (cn && cn.id !== n.id && deck && deck.state.playing) deck.stop(cn.fadeOut > 0 ? cn.fadeOut : S.goFade);
  if (cn && cn.id !== n.id) cn.done = true;
  n.done = false;
  const e = cur(); if (e) e.updatedAt = Date.now();
  if (S.ui.buzz) buzz();
  await startNumber(n);
}
let pickRow = null;
const pickById = (id) => { const e = cur(); return e ? e.numbers.find((x) => x.id === id) || null : null; };
// Тайм-коды под волной: касание — прыжок (метки номера и метки записи из медиатеки)
function tcHTML(n) {
  const L = n && n.kind === 'track' ? tcOf(n) : [];
  if (!L.length) return '';
  return '<div class="shtcs hscroll" role="group" aria-label="' + esc(t('tc.title')) + '">' + L.map((c) => '<button class="shtc" data-tc="' + c.t + '" aria-label="' + esc(M.mmss(c.t) + ' ' + c.text) + '"><i class="num">' + M.mmss(c.t) + '</i><span>' + esc(c.text) + '</span></button>').join('') + '</div>';
}
// Избранные пады справа от списка номеров: закреплённый ряд, до пяти штук; звучат вместе с треком номера. По умолчанию выключены (настройки)
function favsHTML() {
  if (!S.ui.deskPads) return '';
  const d = M.dockOf(S); if (!d) return '';
  return '<div class="shfavs" role="group" aria-label="' + esc(t('view.deskPads')) + '">' + d.pads.slice(0, 5).map((p, i) => padCell(p, i, true)).join('') + '</div>';
}
function deskHTML() {
  const e = cur(), n = M.currentNumber(S), nx = M.nextNumber(S), idx = e && n ? e.numbers.indexOf(n) + 1 : 0, f = n && fileOf(n.file), a = effAna(n);
  const sub = n ? [t('desk.of', { n: idx, m: e.numbers.length }), a && a.pc != null && n.kind === 'track' ? keyName(a.pc + n.shift, a.minor) + (n.shift ? ' ' + (n.shift > 0 ? '+' : '−') + Math.abs(n.shift) : '') : ''].filter(Boolean).join(' · ') : '';
  const evl = e ? '<button class="evt shevt" data-x="evpick">' + esc(e.title || t('event.untitled', { n: S.events.filter((x) => !x.deleted).indexOf(e) + 1 })) + '<small>' + esc(evSub(e)) + '</small></button>' : '<button class="shadd" data-x="evnew">+ ' + esc(t('event.new')) + '</button>';
  const blocks = [
    { id: 'event', html: evl },
    { id: 'picks', html: '<div class="shsplit">' + pickHTML() + favsHTML() + '</div>' },
    { id: 'wave', html: n && n.kind === 'track' ? '<canvas class="shwave" id="shwave" role="slider" tabindex="0" aria-label="' + esc(t('desk.wave')) + '"></canvas><div class="shtime" id="shtime"></div>' : '<div class="shnote" id="shnote">' + esc(n ? (n.note || t('desk.noTrack')) : t('desk.none')) + '</div>' },
    { id: 'cues', html: '<div class="shcueln" id="shcueln" aria-live="polite"></div>' + tcHTML(n) },
    { id: 'ctl', html: n && n.kind === 'track' ? '<div class="shctl"><button class="shbtn" data-x="fadeout">' + esc(t('desk.fade', { n: ctx.num(S.goFade, 1) })) + '</button><button class="shbtn" data-x="mark">+ ' + esc(t('desk.mark')) + '</button></div>' : '' },
    { id: 'knobs', html: barHTML() },
  ];
  return '<div class="shdesk">' + arrange(blocks, layOf('desk'), { t, name: (id) => t('lay.b.' + id), grow: ['picks'] }) + '</div>';
}
// Живое: время, метка, волна, кнопка паузы — без перерисовки страницы
// Метр уровня над громкостью: 24 деления, зелёный — рабочий, янтарный — близко к потолку, красный — перегруз; тишина — пусто
const METER_N = 24;
function meterPaint() {
  const m = host && host.querySelector('.shmeter'); if (!m) return;
  let lvl = 0;
  if (meterNode) { const buf = new Uint8Array(meterNode.fftSize); meterNode.getByteTimeDomainData(buf); let pk = 0; for (let i = 0; i < buf.length; i++) pk = Math.max(pk, Math.abs(buf[i] - 128) / 128); const db = pk > 0.0005 ? 20 * Math.log10(pk) : -90; lvl = Math.max(0, Math.min(METER_N, Math.round((db + 54) / 54 * METER_N))); }
  const cells = m.children;
  for (let i = 0; i < cells.length; i++) { const c = i < lvl ? (i < 16 ? 'g' : i < 21 ? 'a' : 'r') : ''; if (cells[i].className !== c) cells[i].className = c; }
}
// «Ведущий» (слово автора 26.11.2026): пока кнопку держат, всё приглушено на 10 дБ; отпустили — плавно вернулось
function duckStart() { if (duckOn || !master) return; duckOn = true; master.gain.setTargetAtTime(M.faderGain(S.master) * 0.316, master.context.currentTime, 0.08); if (S.ui.buzz) buzz(); }
function duckEnd() { if (!duckOn) return; duckOn = false; if (master) master.gain.setTargetAtTime(M.faderGain(S.master), master.context.currentTime, 0.2); }
function deskPaint(force) {
  if (!host || S.page !== 'desk') return;
  const n = M.currentNumber(S), e = cur();
  if (deck) deck.tick();
  const st = deck ? deck.state : null;
  if (force && st && n && n.kind === 'track' && st.ended && !st.playing) { /* дошёл до конца: ничего не делаем, номер остаётся перед глазами */ }
  const tm = host.querySelector('#shtime'), cn = host.querySelector('#shcueln'), pp = host.querySelector('#shpp');
  const crow = host.querySelector('.shpick.cur');
  if (crow) { const on = !!(deck && deck.state.playing && n && n.kind === 'track' && deck.state.file === n.file); if (crow.classList.contains('playing') !== on) { crow.classList.toggle('playing', on); crow.setAttribute('aria-pressed', String(on)); const i = crow.querySelector('i'); if (i) i.textContent = on ? '■' : String(e.numbers.indexOf(n) + 1); } }
  const own = n && n.kind === 'track' && st && st.file === n.file;
  const time = own ? st.time : 0, dur = own ? st.dur : (n && n.dur) || 0;
  if (tm) tm.textContent = M.mmss(time) + ' / ' + M.mmss(dur || (fileOf(n.file) || {}).dur || 0);
  if (pp) { const on = !!(own && st.playing); pp.textContent = on ? '❚❚' : '▶'; pp.classList.toggle('on', on); pp.setAttribute('aria-label', t(on ? 'desk.pause' : 'desk.play')); }
  if (cn && n) {
    const c = M.cueNow({ cues: tcOf(n) }, time);
    const live = c.prev && own && st.playing && time - c.prev.t < 5 ? c.prev : null;
    cn.className = 'shcueln' + (live ? ' now' : c.next && c.in < 10 && own ? ' soon' : '');
    cn.textContent = live ? t('desk.now') + ' · ' + live.text : c.next ? t('desk.in', { t: M.mmss(c.in) }) + ' · ' + c.next.text : '';
  }
  const pg = host.querySelector('.shpick.cur .shpg'), rt = host.querySelector('.shpick.cur .shrt');
  if (pg) pg.style.width = own && dur > 0 ? Math.min(100, time / dur * 100) + '%' : '0%';
  if (rt) rt.textContent = own && st.playing && dur > 0 ? t('desk.left', { t: M.mmss(Math.max(0, dur - time)) }) : rt.dataset.at || '';
  const cv = host.querySelector('#shwave'); if (cv && n) drawWave(cv, n, time, dur, own);
}
function drawWave(cv, n, time, dur, own) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'), cs = getComputedStyle(cv), ink = cs.getPropertyValue('--ink').trim() || '#111', tint = cs.getPropertyValue('--tint').trim() || '#a95e72', l3 = cs.getPropertyValue('--l3').trim() || '#aaa';
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const f = fileOf(n.file), pk = f && Array.isArray(f.peaks) && f.peaks.length ? f.peaks : null, d = dur || (f && f.dur) || 0, N = pk ? pk.length : Math.max(40, Math.floor(w / 4));
  const bw = w / N;
  for (let i = 0; i < N; i++) { const v = pk ? pk[i] : 0.15, hh = Math.max(2, v * (h * 0.9)), x = i * bw, played = d && own && (i / N) * d <= time; g.fillStyle = played ? tint : l3; g.globalAlpha = played ? 1 : 0.55; g.fillRect(x + 0.5, (h - hh) / 2, Math.max(1, bw - 1.5), hh); }
  g.globalAlpha = 1;
  if (d) { // метки
    g.fillStyle = ink; tcOf(n).forEach((c) => { const x = (c.t / d) * w; g.fillRect(x - 0.75, 0, 1.5, h); g.beginPath(); g.moveTo(x - 5, 0); g.lineTo(x + 5, 0); g.lineTo(x, 7); g.closePath(); g.fill(); });
    if (own) { const x = (time / d) * w; g.fillStyle = ink; g.fillRect(x - 1.5, 0, 3, h); }
  }
}
function timerText() {
  const e = cur(); if (!e || !S.ui.timer) return { s: '', over: false };
  const r = M.eventTimer(e, Date.now());
  if (r.state === 'none') return { s: '', over: false };
  const k = r.state === 'before' ? 'timer.before' : r.state === 'over' ? 'timer.over' : e.timer === 'length' ? 'timer.left' : 'timer.run';
  return { s: t(k, { t: M.clock(r.secs) }), over: r.state === 'over' };
}
function render() {
  if (!host) return;
  const tm = timerText();
  const oldPk = host.querySelector('.shpicks'), pkTop = oldPk ? oldPk.scrollTop : 0, pkCur = S.pickCur; S.pickCur = S.cur;
  host.innerHTML = '<div class="shw' + (edit ? ' editing' : '') + '"><div class="shtop"><div class="shtabs" role="tablist">' +
    PAGES.map((k) => '<button role="tab" data-page="' + k + '" class="' + (S.page === k ? 'on' : '') + '" aria-selected="' + (S.page === k) + '">' + esc(t('page.' + k)) + '</button>').join('') + '</div>' +
    (S.page === 'pads' ? '' : '<button class="shchip" data-x="progsheet">' + esc(t('page.prog')) + '</button>') +
    (ctx.output ? ctx.output.btn('shout') : '') + ctx.ui.icb('data-x="set"', I.gear, t('settings'), 'plain') + '</div>' + (tm.s ? '<div class="shtmrow"><span class="shtimer' + (tm.over ? ' over' : '') + '" id="shtm">' + esc(tm.s) + '</span></div>' : '') + '<div class="shbody">' + (S.page === 'pads' ? padsHTML() : deskHTML()) + '</div></div>';
  const list = host.querySelector('.shlist');
  if (list) sortable(list, '.shnum', 'data-num', (ids) => { const e = cur(); if (!e) return; const by = new Map(e.numbers.map((n) => [n.id, n])); e.numbers = ids.map((i) => by.get(i)).filter(Boolean); e.updatedAt = Date.now(); save(); render(); });
  const pk = host.querySelector('.shpicks');
  if (pk) { const cu = pk.querySelector('.cur'); pk.scrollTop = cu && pkCur !== S.cur ? cu.offsetTop - (pk.clientHeight - cu.offsetHeight) / 2 : pkTop; }
  if (ctx.output) ctx.output.refresh(host);
  if (vsheet) vsheet.api.update(); // открытая шторка «Программа» / «Фон» — в ногу со страницей
  paint();
  clearInterval(meterT); meterT = setInterval(meterPaint, 100);
  clearInterval(deskT); deskT = 0;
  if (S.page === 'desk') { deskPaint(); deskT = setInterval(() => deskPaint(), 100); }
}
// «Программа» и «Фон» — не вкладки, а шторки (раньше экраны): те же обработчики, что на странице
function viewSheet(kind) {
  ctx.ui.sheet(() => (kind === 'prog' ? progHTML() : bedHTML()), (el, sh) => {
    vsheet = { kind, api: sh };
    const later = (fn) => (e) => { fn(e); setTimeout(() => { if (vsheet && vsheet.api === sh) sh.update(); }, 40); };
    el.addEventListener('click', later(onClick));
    el.addEventListener('input', onInput);
    el.addEventListener('change', later(onChange));
    const list = el.querySelector('.shlist');
    if (list) sortable(list, '.shnum', 'data-num', (ids) => { const e = cur(); if (!e) return; const by = new Map(e.numbers.map((n) => [n.id, n])); e.numbers = ids.map((i) => by.get(i)).filter(Boolean); e.updatedAt = Date.now(); save(); sh.update(); render(); });
  }, { onClose: () => { vsheet = null; render(); } });
}
function go(page) { if (S.page === page) return; S.page = page; save(); render(); }

/* ---------- разбор касаний ---------- */

function onDown(e) {
  if (e.target.closest && e.target.closest('[data-duck]')) { try { e.target.closest('[data-duck]').setPointerCapture(e.pointerId); } catch { /* */ } duckStart(); return; }
  if (e.target.closest && e.target.closest('[data-fader]')) { onFaderDown(e); return; }
  if (e.target.closest && e.target.closest('[data-knob]')) { onKnobDown(e); return; }
  if (e.target.closest && e.target.closest('#shwave')) { onWaveDown(e); return; }
  const el = e.target.closest && e.target.closest('.shpad[data-pad]');
  if (!el || edit) return;
  const p = M.padById(S, el.dataset.pad);
  if (!p || !(p.file || p.synth)) return;
  const en = ensureEng(); if (!en) return;
  if (S.ui.buzz) buzz();
  const r = en.press(p);
  if (r === 'error') ctx.ui.toast(t('padErr'));
  if (p.mode === 'hold' && (r === 'play' || r === 'wait')) held.set(e.pointerId, p);
  kick();
}
function onUp(e) {
  if (duckOn && e.target.closest && e.target.closest('[data-duck]')) duckEnd();
  const p = held.get(e.pointerId);
  if (p && eng) { held.delete(e.pointerId); eng.release(p); }
}
function onClick(e) {
  const g = (s) => e.target.closest(s);
  let b;
  if ((b = g('[data-page]'))) { go(b.dataset.page); return; }
  if ((b = g('[data-bank]'))) { if (S.bank === b.dataset.bank && edit) { bankSheet(M.bankOf(S)); return; } S.bank = b.dataset.bank; save(); render(); preload(); return; }
  if ((b = g('.shpad[data-pad]'))) { const p = M.padById(S, b.dataset.pad); if (p && (edit || !(p.file || p.synth))) padSheet(p); return; }
  if ((b = g('[data-tonic]'))) { S.bed.pad.tonic = b.dataset.tonic === '' ? null : +b.dataset.tonic; save(); if (bed && bed.state.pad) bed.padTonic(bedTonic(M.currentNumber(S))); render(); return; }
  if ((b = g('[data-bsnd]'))) { S.bed.pad.sound = b.dataset.bsnd; save(); if (bed) bed.padSound(S.bed.pad.sound); render(); return; }
  if ((b = g('[data-noise]'))) { const r = noiseRec(b.dataset.noise); if (!r) return; if (edit) noiseSheet(r); else noiseTo(S.bed.noise.cur === r.id ? null : r.id); return; }
  if ((b = g('.shpad[data-cell]'))) { newPadAt(+b.dataset.cell, !!b.dataset.dock); return; }
  if ((b = g('[data-tc]'))) { jumpTo(M.currentNumber(S), +b.dataset.tc).catch((er) => ctx.logErr(er)); return; }
  if ((b = g('[data-pick]'))) { // касание названия: идёт — остановить, не идёт — включить (другой номер — плавный переход к нему)
    const n = pickById(b.dataset.pick); if (!n) return;
    const playing = n.kind === 'track' && deck && deck.state.playing && deck.state.file === n.file;
    if (playing) { deck.stop(n.fadeOut > 0 ? n.fadeOut : S.goFade); render(); return; }
    if (n.id === S.cur) { startNumber(n).catch((er) => ctx.logErr(er)); return; }
    glideTo(n).catch((er) => ctx.logErr(er)); return;
  }
  if ((b = g('[data-num]'))) { const n = cur() && cur().numbers.find((x) => x.id === b.dataset.num); if (n) numSheet(n); return; }
  const x = g('[data-x]'); if (!x) return;
  switch (x.dataset.x) {
    case 'edit': edit = !edit; render(); break;
    case 'progsheet': viewSheet('prog'); break;
    case 'bedsheet': viewSheet('bed'); break;
    case 'bedtoggle': S.bed.pad.on = !S.bed.pad.on; save(); if (S.bed.pad.on) padStart(M.currentNumber(S)); else if (bed) bed.padOff(S.goFade); render(); break;
    case 'set': settingsSheet(); break;
    case 'bankadd': addBank(); break;
    case 'stopall': stopAll(); break;
    case 'evpick': eventsSheet(); break;
    case 'evedit': eventSheet(cur()); break;
    case 'evnew': newEvent(); break;
    case 'numnew': newNumber(); break;
    case 'go': goNext(); break;
    case 'noiseadd': pickFile({ pad: true }, (id) => { const f = fileOf(id); S.noises.push({ id: 's' + Date.now().toString(36), name: f ? f.name : '', file: id, level: 100 }); save(); render(); }); break;
    case 'bedoff': S.bed.pad.on = false; S.bed.noise.cur = null; save(); if (bed) { bed.padOff(S.goFade); bed.stopNoise(S.goFade); } render(); break;
    case 'pp': playPause(); break;
    case 'panic': panic(); break;
    case 'levels': levelsSheet(); break;
    case 'fadeout': if (deck) deck.stop(S.goFade); break;
    case 'mark': addMark(); break;
    default: break;
  }
}
function stopAll() {
  const run = () => { if (eng) eng.stopAll(0.2); };
  if (S.ui.confirmStop) ctx.ui.confirm(t('stopAllAsk'), '', t('stopAll')).then((ok) => { if (ok) run(); }); else run();
}
function onChange(e) {
  if (e.target.dataset && e.target.dataset.vol) { save(); return; }
  if (e.target.dataset.sw === 'bpad') {
    S.bed.pad.on = e.target.checked; save();
    if (S.bed.pad.on) padStart(M.currentNumber(S)); else if (bed) bed.padOff(S.goFade);
  }
}
function onInput(e) {
  const vk = e.target.dataset && e.target.dataset.vol;
  if (vk) { fdSet(vk === 'deck' && songKnob() ? 'nlevel' : vk, +e.target.value); return; }
  const sk = e.target.dataset && e.target.dataset.s;
  if (sk && ['padlvl', 'noiselvl', 'xfade'].includes(sk)) {
    const v = +e.target.value, o = (e.target.closest('.shprog') || host).querySelector('[data-o="' + sk + '"]');
    if (sk === 'padlvl') { S.bed.pad.level = v; if (bed) bed.padLevel(v); if (o) o.textContent = lvTxt(v); }
    else if (sk === 'noiselvl') { S.bed.noise.level = v; const r = noiseRec(S.bed.noise.cur); if (bed && r) bed.noiseTrim(noiseVol(r)); if (o) o.textContent = lvTxt(v); }
    else { S.bed.noise.xfade = v; if (o) o.textContent = secTxt(v); }
    save(); return;
  }
}

/* ---------- основной трек ---------- */

async function startNumber(n, from = 0) {
  S.cur = n.id; save();
  applyBed(n).catch((e) => ctx.logErr(e));
  if (n.kind === 'track' && n.file) {
    const d = ensureDeck();
    if (!d) { render(); return; }
    if (S.norm.on && !loudOf(n.file)) await Promise.race([ensureLoud(n.file), new Promise((r) => setTimeout(r, 4000))]); // без измерения не задерживаем больше 4 с
    try { await d.start({ file: n.file, level: n.level, fadeIn: n.fadeIn, fadeOut: n.fadeOut, shift: n.shift, from, normDb: normDb(n), eq: n.eq, tempo: n.tempo, prog: n.prog, mix: n.mix, parts: needParts(n) && !!partsOf(n.file) }); } catch (e) { ctx.logErr(e); ctx.ui.toast(t('desk.trackErr')); }
    const nx = M.nextNumber(S); if (nx && nx.kind === 'track' && nx.file) d.prepare(nx.file, needParts(nx) && !!partsOf(nx.file), nx.mix); // следующий — заранее, «ГО» не ждёт
    if (nx && nx.kind === 'track' && nx.file) ensureLoud(nx.file);
  }
  render();
}
async function goNext() {
  const cn = M.currentNumber(S), nx = M.nextNumber(S);
  if (!nx) { ctx.ui.toast(t('desk.noNext')); return; }
  if (cn && deck && deck.state.playing) deck.stop(cn.fadeOut > 0 ? cn.fadeOut : S.goFade);
  if (cn) cn.done = true;
  if (S.ui.buzz) buzz();
  await startNumber(nx);
}
function playPause() {
  const n = M.currentNumber(S) || M.nextNumber(S); if (!n) return;
  if (n.kind !== 'track' || !n.file) { startNumber(n); return; } // без трека — включает фон номера (пэд, шум)
  if (deck && deck.state.file === n.file && deck.state.playing) deck.pause();
  else if (deck && deck.state.file === n.file) deck.resume();
  else startNumber(n);
}
function addMark() {
  const n = M.currentNumber(S), e = cur(); if (!n || !deck || deck.state.file !== n.file) return;
  const at = deck.state.time; M.addCue(n, at, ''); if (e) e.updatedAt = Date.now(); save();
  ctx.ui.toast(t('desk.markAdded', { t: M.mmss(at) })); render();
}
// фейдеры: перетаскивание по дорожке; двойное касание — на 0 и обратно
const fdPrev = {}; let fdTap = { k: '', t: 0 };
// своя громкость идущего номера: трек, пэд, шум (запоминается в номере, слышна сразу)
function numBed(n) { if (!n.bed) n.bed = { pad: S.bed.pad.on, noise: S.bed.noise.cur || '', padLevel: null, noiseLevel: null }; return n.bed; }
// Крутилка «Трек»: у выбранного номера с записью правит громкость самой песни (и показывает её, с учётом программы), удержание — общую громкость трека
const songKnob = () => { const n = M.currentNumber(S); return n && n.kind === 'track' && n.file ? n : null; };
const volOf = (k) => { const n = M.currentNumber(S); return k === 'deck' ? (songKnob() ? songKnob().level : S.deckLevel) : k === 'bed' ? S.bedLevel : k === 'master' ? S.master : k === 'nlevel' ? (n ? n.level : 0) : k === 'npad' ? nPadLevel(n) : k === 'nnoise' ? nNoiseLevel(n) : S.level; };
// Любая громкость пульта 0–100: в звук (если он уже есть — иначе применится при создании) и во все ручки и фейдеры на экране
function fdSet(k, v) {
  v = Math.max(0, Math.min(100, Math.round(v)));
  if (k === 'deck') { S.deckLevel = v; if (deck) deck.setTrim(v); }
  else if (k === 'bed') { S.bedLevel = v; if (bed) bed.setLevel(v); }
  else if (k === 'nlevel' || k === 'npad' || k === 'nnoise') {
    const n = M.currentNumber(S), e = cur(); if (!n) return;
    if (k === 'nlevel') { n.level = v; if (deck && deck.state.file === n.file) deck.setLevel(v); if (host) host.querySelectorAll('[data-knob="deck"]').forEach((kn) => { if (kn.dataset.glob) return; kn.setAttribute('aria-valuenow', v); kn.querySelector('.kv').setAttribute('stroke-dasharray', v * 0.99 + ' 100'); kn.querySelector('b').textContent = v; }); }
    else if (k === 'npad') { numBed(n).padLevel = v; if (bed) bed.padLevel(v); }
    else { numBed(n).noiseLevel = v; const r = noiseRec(S.bed.noise.cur); if (bed && r) bed.noiseTrim(noiseVol(r, n)); }
    if (e) e.updatedAt = Date.now();
  }
  else if (k === 'master') { S.master = v; if (master) master.gain.setTargetAtTime(M.faderGain(v), master.context.currentTime, 0.03); }
  else { S.level = v; if (eng) eng.setLevel(v); }
  if (!host) return;
  host.querySelectorAll('[data-fader="' + k + '"]').forEach((tr) => { tr.style.setProperty('--v', v + '%'); tr.setAttribute('aria-valuenow', v); });
  host.querySelectorAll('[data-knob="' + k + '"]').forEach((kn) => { kn.setAttribute('aria-valuenow', v); kn.querySelector('.kv').setAttribute('stroke-dasharray', v * 0.99 + ' 100'); kn.querySelector('b').textContent = v; });
  host.querySelectorAll('[data-fv="' + k + '"]').forEach((o) => { o.textContent = v; });
  document.querySelectorAll('input[data-vol="' + k + '"]').forEach((i) => { i.value = v; });
  document.querySelectorAll('[data-vols="' + k + '"]').forEach((o) => { o.textContent = v; });
  document.querySelectorAll('[data-vfill="' + k + '"]').forEach((f) => { f.style.width = v + '%'; });
  host.querySelectorAll('[data-fo="' + k + '"]').forEach((o) => { o.textContent = M.dbText(v) + ' ' + t('db'); });
}
// Крутилка: тянуть вверх-вниз (140 px — весь ход); двойное касание — на 0 и обратно; стрелки на клавиатуре — по единице
function onKnobDown(e) {
  const kn = e.target.closest && e.target.closest('[data-knob]'); if (!kn) return;
  const k = kn.dataset.knob, now = performance.now();
  if (fdTap.k === 'knob' + k && now - fdTap.t < 320) { const c0 = volOf(k); if (c0 > 0) { fdPrev[k] = c0; fdSet(k, 0); } else fdSet(k, fdPrev[k] || 85); fdTap = { k: '', t: 0 }; save(); return; }
  fdTap = { k: 'knob' + k, t: now };
  try { kn.setPointerCapture(e.pointerId); } catch { /* */ }
  let y0 = e.clientY, v0 = volOf(k), moved = false, glob = false, ht = 0;
  const target = () => (k === 'deck' && songKnob() && !glob ? 'nlevel' : k);
  // «Трек» песни: удержать без движения — крутилка переходит к общей громкости трека (песня остаётся как есть); отпустить — снова песня
  if (k === 'deck' && songKnob()) ht = setTimeout(() => { if (moved) return; glob = true; kn.dataset.glob = '1'; kn.classList.add('glob'); y0 = lastY; v0 = S.deckLevel; fdSet('deck', v0); if (S.ui.buzz) buzz(); }, 450);
  let lastY = e.clientY;
  const mv = (m) => { lastY = m.clientY; if (Math.abs(m.clientY - y0) > 3 && !glob) moved = true; fdSet(target(), v0 + (y0 - m.clientY) / 1.4); };
  const up = () => { clearTimeout(ht); kn.removeEventListener('pointermove', mv); kn.removeEventListener('pointerup', up); kn.removeEventListener('pointercancel', up); if (glob) { delete kn.dataset.glob; kn.classList.remove('glob'); const n = songKnob(); if (n) fdSet('nlevel', n.level); } save(); };
  kn.addEventListener('pointermove', mv); kn.addEventListener('pointerup', up); kn.addEventListener('pointercancel', up);
}
function onKey(e) {
  const kn = e.target.closest && e.target.closest('[data-knob]'); if (!kn || !['ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
  e.preventDefault(); const k = kn.dataset.knob; fdSet(k, volOf(k) + (e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1)); save();
}
function onFaderDown(e) {
  const tr = e.target.closest && e.target.closest('[data-fader]'); if (!tr) return;
  const k = tr.dataset.fader, r = () => tr.getBoundingClientRect();
  const now = performance.now();
  if (fdTap.k === k && now - fdTap.t < 320) { const cur0 = volOf(k); if (cur0 > 0) { fdPrev[k] = cur0; fdSet(k, 0); } else fdSet(k, fdPrev[k] || 85); fdTap = { k: '', t: 0 }; save(); return; }
  fdTap = { k, t: now };
  try { tr.setPointerCapture(e.pointerId); } catch { /* */ }
  const at = (y) => { const b = r(); fdSet(k, (1 - (y - b.top) / b.height) * 100); };
  at(e.clientY);
  const mv = (m) => at(m.clientY), up = () => { tr.removeEventListener('pointermove', mv); tr.removeEventListener('pointerup', up); tr.removeEventListener('pointercancel', up); save(); };
  tr.addEventListener('pointermove', mv); tr.addEventListener('pointerup', up); tr.addEventListener('pointercancel', up);
}
function onWaveDown(e) {
  const cv = e.target.closest && e.target.closest('#shwave'); if (!cv || !deck) return;
  const n = M.currentNumber(S); if (!n || deck.state.file !== n.file) return;
  const seek = (x) => { const b = cv.getBoundingClientRect(); deck.seek(Math.max(0, Math.min(1, (x - b.left) / b.width)) * deck.state.dur); deskPaint(); };
  try { cv.setPointerCapture(e.pointerId); } catch { /* */ }
  seek(e.clientX);
  const mv = (m) => seek(m.clientX), up = () => { cv.removeEventListener('pointermove', mv); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); };
  cv.addEventListener('pointermove', mv); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
}

// Нормализацию включили, выключили или сменили цель: идущий трек выравнивается сразу; измерение недостающего — фоном
function applyNorm() {
  const n = M.currentNumber(S);
  if (deck && n && deck.state.file === n.file) deck.setNorm(normDb(n));
  queueLoud();
}

/* ---------- создание ---------- */

function newPadAt(i, dock) {
  const b = dock ? M.dockOf(S) : M.bankOf(S);
  if (!b || b.pads[i]) return;
  const p = M.newPad({}); b.pads[i] = p; save(); padSheet(p);
}
function addBank() {
  const b = M.newBank('', { cols: 3, rows: 4 }); S.banks.push(b); S.bank = b.id; save(); render(); bankSheet(b);
}
function newEvent() {
  const e = M.newEvent({ title: '' }); S.events.push(e); S.event = e.id; S.page = 'desk'; save(); render(); eventSheet(e);
}
function newNumber() {
  const e = cur(); if (!e) return;
  const n = M.newNumber({}); e.numbers.push(n); e.updatedAt = Date.now(); save(); render(); numSheet(n);
}

/* ---------- шторки ---------- */

const row = (label, inner) => '<div class="cellcol"><span>' + esc(label) + '</span><div style="margin-top:8px">' + inner + '</div></div>';
const chips = (attr, list, curV, label) => '<div class="shchips" role="group">' + list.map((v) => '<button class="shchip' + (curV === v ? ' on' : '') + '" ' + attr + '="' + v + '" aria-pressed="' + (curV === v) + '">' + label(v) + '</button>').join('') + '</div>';
const slider = (k, label, v, min, max, step, txt) => '<div class="sslider"><div class="ssl"><span>' + esc(label) + '</span><b class="num" data-o="' + k + '">' + txt + '</b></div><input type="range" class="range" data-s="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" aria-label="' + esc(label) + '"></div>';
const lvTxt = (v) => v + ' · ' + M.dbText(v) + ' ' + t('db');
const secTxt = (v) => t('u.s', { n: ctx.num(+v, 1) });

const spdTxt = (v) => '×' + (+v).toFixed(2).replace(/0$/, '');
const semiTxt = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + ' ' + t('semi');
function padSheet(p) {
  const f = () => fileOf(p.file);
  const body = () => ctx.ui.snav(t('pad.title'), { right: '<button class="link b r" data-close>' + esc(t('editDone')) + '</button>' }) +
    '<div class="group"><div class="cellcol"><span>' + esc(t('pad.name')) + '</span><input class="shfield" data-f="name" maxlength="40" value="' + esc(p.name) + '" aria-label="' + esc(t('pad.name')) + '" placeholder="' + esc(f() ? f().name : '') + '"></div></div>' +
    '<div class="group"><button class="cell" data-x="pick"><span class="grow">' + esc(t('pad.sound')) + '<span class="st l2" style="display:block;font-size:13px">' + esc(f() ? f().name : t('pad.none')) + '</span></span><span class="val">' + esc(t('pad.pick')) + '</span></button>' +
      (p.file ? '<button class="cell" data-x="test"><span class="grow">' + esc(t('pad.test')) + '</span></button>' : '') + '</div>' +
    '<div class="hdr">' + esc(t('pad.color')) + '</div>' + '<div class="shchips">' + M.PAD_COLORS.map((c) => '<button class="shchip pc-' + c + (p.color === c ? ' on' : '') + '" data-color="' + c + '" aria-pressed="' + (p.color === c) + '"><i></i>' + esc(t('pad.color.' + c)) + '</button>').join('') + '</div>' +
    '<div class="hdr">' + esc(t('pad.mode')) + '</div>' + chips('data-mode', M.PAD_MODES, p.mode, (v) => esc(t('pad.mode.' + v))) +
    (p.mode === 'shot' ? '<div class="hdr">' + esc(t('pad.again')) + '</div>' + chips('data-again', M.PAD_AGAIN, p.again, (v) => esc(t('pad.again.' + v))) : '') +
    '<div class="group sgroup" style="margin-top:12px">' + slider('level', t('pad.level'), p.level, 0, 100, 1, lvTxt(p.level)) + slider('fadeIn', t('pad.fadeIn'), p.fadeIn, 0, 10, 0.1, secTxt(p.fadeIn)) + slider('fadeOut', t('pad.fadeOut'), p.fadeOut, 0, 10, 0.1, secTxt(p.fadeOut)) + '</div>' +
    '<div class="hdr">' + esc(t('pad.tone')) + '</div><div class="group sgroup">' + slider('speed', t('pad.speed'), p.speed, 0.5, 2, 0.05, spdTxt(p.speed)) + slider('shift', t('pad.shift'), p.shift, -12, 12, 1, semiTxt(p.shift)) + '</div><p class="ftr">' + esc(t('pad.toneHint')) + '</p>' +
    '<div class="hdr">' + esc(t('pad.eq')) + '</div>' + chips('data-eq', M.EQ_IDS, p.eq, (v) => esc(t('eq.' + (v || 'flat')))) +
    '<div class="hdr">' + esc(t('pad.group')) + '</div>' + chips('data-group', [0, 1, 2, 3, 4], p.group, (v) => v ? String(v) : esc(t('pad.group.0'))) + '<p class="ftr">' + esc(t('pad.groupHint')) + '</p>' +
    '<div class="group" style="margin-top:12px"><div class="cell"><span class="grow">' + esc(t('pad.duck')) + '</span>' + ctx.ui.sw('pduck', p.duck, t('pad.duck')) + '</div></div>' +
    '<div class="hdr">' + esc(t('pad.range')) + '</div><div class="group shtwo"><div class="cellcol"><span>' + esc(t('pad.from')) + '</span><input class="shfield" data-t="from" inputmode="decimal" value="' + (p.from ? M.mmss(p.from) : '') + '" placeholder="0:00" aria-label="' + esc(t('pad.from')) + '"></div>' +
      '<div class="cellcol"><span>' + esc(t('pad.to')) + '</span><input class="shfield" data-t="to" inputmode="decimal" value="' + (p.to ? M.mmss(p.to) : '') + '" placeholder="—" aria-label="' + esc(t('pad.to')) + '"></div></div><p class="ftr">' + esc(t('pad.rangeHint')) + '</p>' +
    '<div class="group" style="margin-top:16px"><button class="cell" data-x="clear" style="color:var(--red)"><span class="grow">' + esc(t('pad.clear')) + '</span></button></div>';
  ctx.ui.sheet(body, (el, sh) => {
    const done = () => { save(); if (eng && p.file) eng.preload([p]); };
    el.addEventListener('click', async (e) => {
      const g = (s) => e.target.closest(s); let b;
      if ((b = g('[data-color]'))) { p.color = b.dataset.color; done(); sh.update(); }
      else if ((b = g('[data-mode]'))) { p.mode = b.dataset.mode; done(); sh.update(); }
      else if ((b = g('[data-again]'))) { p.again = b.dataset.again; done(); sh.update(); }
      else if ((b = g('[data-group]'))) { p.group = +b.dataset.group; done(); sh.update(); }
      else if ((b = g('[data-eq]'))) { p.eq = b.dataset.eq; done(); sh.update(); }
      else if ((b = g('[data-x]'))) {
        if (b.dataset.x === 'pick') pickFile({ pad: true, cur: p.file }, (id) => { dropPadFile(p); p.file = id; if (eng) eng.forget(id); done(); sh.update(); });
        else if (b.dataset.x === 'test') { const en = ensureEng(); if (en) { en.press({ ...p, again: 'restart' }); kick(); } }
        else if (b.dataset.x === 'clear') { if (await ctx.ui.confirm(t('pad.clear'), '', t('pad.clear'))) { dropPadFile(p); clearPad(p); sh.close(); } }
      }
    });
    el.addEventListener('input', (e) => {
      const f = e.target.dataset.f, s = e.target.dataset.s;
      if (f === 'name') { p.name = e.target.value.slice(0, 40); save(); }
      if (s) {
        const v = +e.target.value; p[s] = v;
        const o = el.querySelector('[data-o="' + s + '"]'); if (o) o.textContent = s === 'level' ? lvTxt(v) : s === 'speed' ? spdTxt(v) : s === 'shift' ? semiTxt(v) : secTxt(v);
        save();
      }
    });
    el.addEventListener('change', (e) => {
      if (e.target.dataset.sw === 'pduck') { p.duck = e.target.checked; done(); }
      const k = e.target.dataset.t;
      if (k) {
        const v = e.target.value.trim() ? M.parseTime(e.target.value) : 0;
        p[k] = v == null ? p[k] : v;
        Object.assign(p, M.normalizePad(p)); done(); sh.update();
      }
    });
  }, { tall: true, onClose: render });
}
// Файл пада убирается, если он добавлялся для звуков и больше нигде не нужен
function dropPadFile(p) {
  const id = p.file; if (!id) return;
  p.file = null;
  const f = fileOf(id);
  if (f && f.show && !allPads().some((x) => x.file === id)) ctx.files.remove(id);
  if (eng) eng.forget(id);
}
function clearPad(p) {
  for (const b of S.banks) { const i = b.pads.findIndex((x) => x && x.id === p.id); if (i >= 0) { b.pads[i] = null; break; } }
  save(); render();
}

function bankSheet(b) {
  const body = () => ctx.ui.snav(t('bank.title'), { right: '<button class="link b r" data-close>' + esc(t('editDone')) + '</button>' }) +
    '<div class="group"><div class="cellcol"><span>' + esc(t('bank.name')) + '</span><input class="shfield" data-f="name" maxlength="24" value="' + esc(b.name) + '" aria-label="' + esc(t('bank.name')) + '"></div></div>' +
    '<div class="group" style="margin-top:12px">' + row(t('bank.cols'), ctx.ui.seg('bcols', [2, 3, 4, 5].map((v) => [String(v), String(v)]), String(b.cols), t('bank.cols'))) +
    (b.pinned ? '' : row(t('bank.rows'), ctx.ui.seg('brows', [1, 2, 3, 4, 5, 6].map((v) => [String(v), String(v)]), String(b.rows), t('bank.rows')))) + '</div>' +
    (b.pinned ? '<p class="ftr">' + esc(t('bank.dockHint')) + '</p>' : '<div class="group" style="margin-top:16px"><button class="cell" data-x="del" style="color:var(--red)"><span class="grow">' + esc(t('bank.del')) + '</span></button></div>');
  ctx.ui.sheet(body, (el, sh) => {
    el.addEventListener('click', async (e) => {
      const g = (s) => e.target.closest(s); let v;
      if ((v = g('[data-seg="bcols"] [data-v]'))) { Object.assign(b, M.resizeBank(b, +v.dataset.v, b.rows)); save(); sh.update(); }
      else if ((v = g('[data-seg="brows"] [data-v]'))) { Object.assign(b, M.resizeBank(b, b.cols, +v.dataset.v)); save(); sh.update(); }
      else if (g('[data-x="del"]')) {
        if (S.banks.filter((x) => !x.pinned).length < 2) return;
        if (await ctx.ui.confirm(t('bank.del'), t('bank.delAsk'), t('bank.del'))) { S.banks = S.banks.filter((x) => x.id !== b.id); S.bank = M.bankOf(S).id; save(); sh.close(); }
      }
    });
    el.addEventListener('input', (e) => { if (e.target.dataset.f === 'name') { b.name = e.target.value.slice(0, 24); save(); } });
  }, { onClose: render });
}

// «Вид и работа»: плитки-переключатели (значок, короткое имя, пояснение — включено залито), громкость с шагами, приглушение с живым рисунком
const TILES = [
  ['timer', '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2.5 2M9.5 3h5"/>'],
  ['strip', '<circle cx="12" cy="12" r="7"/><path d="M12 12l3-4"/>'],
  ['info', '<rect x="4" y="6" width="16" height="12" rx="1"/><path d="M8 14h5"/>'],
  ['deskPads', '<rect x="15" y="4" width="5" height="16" rx="1"/><path d="M4 8h8M4 12h8M4 16h8"/>'],
  ['drums', '<rect x="4" y="5" width="7" height="6" rx="1"/><rect x="13" y="5" width="7" height="6" rx="1"/><rect x="4" y="13" width="7" height="6" rx="1"/><rect x="13" y="13" width="7" height="6" rx="1"/>'],
  ['dock', '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 15h18"/>'],
  ['buzz', '<path d="M8 6v12M16 6v12M4 9v6M20 9v6"/>'],
  ['confirmStop', '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'],
];
const duckSvg = (amt, sec) => { const w = 220, h = 46, y = 6 + (h - 12) * (amt / 100), x1 = 70, x2 = Math.min(150, x1 + 14 + sec * 22); return '<svg class="shduck" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="M4 6H' + x1 + 'L' + (x1 + 12) + ' ' + y + 'H' + x2 + 'L' + (x2 + 12) + ' 6H' + (w - 4) + '"/></svg>'; };
function settingsSheet() {
  const tile = (k, ic) => { const on = !!S.ui[k]; return '<button class="shtile' + (on ? ' on' : '') + '" data-tg="' + k + '" aria-pressed="' + on + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ic + '</svg><b>' + esc(t('view.' + k)) + '</b><small>' + esc(t('view.h.' + k)) + '</small></button>'; };
  const body = () => ctx.ui.snav(t('settings'), { right: '<button class="link b r" data-close>' + esc(t('editDone')) + '</button>' }) +
    '<div class="shtiles">' + TILES.map(([k, ic]) => tile(k, ic)).join('') + '</div>' +
    (S.ui.dock && M.dockOf(S) ? '<div class="group" style="margin-top:10px"><button class="cell" data-x="dock"><span class="grow">' + esc(t('view.dockSet')) + '</span><span class="val">' + M.dockOf(S).cols + '×' + M.dockOf(S).rows + '</span></button></div>' : '') +
    '<div class="hdr">' + esc(t('view.g.level')) + '</div><div class="group"><div class="cell"><span class="grow">' + esc(t('view.norm')) + '<span class="st l2" style="display:block;font-size:13px">' + esc(t('view.normShort')) + '</span></span>' + ctx.ui.sw('v-normon', S.norm.on, t('view.norm')) + '</div>' +
      (S.norm.on ? row(t('view.normTarget'), ctx.ui.seg('ntarget', [-14, -16, -19, -23].map((v) => [String(v), String(v)]), String(S.norm.target), t('view.normTarget'))) + '<div class="cell"><span class="grow">' + esc(t('view.normPads')) + '</span>' + ctx.ui.sw('v-normpads', S.norm.pads, t('view.normPads')) + '</div>' : '') + '</div>' +
    '<div class="hdr">' + esc(t('view.duck')) + '</div><div class="group sgroup"><div class="shduckw" id="shduckw">' + duckSvg(S.duckAmount, S.duckTime) + '<span>' + esc(t('view.duckPic')) + '</span></div>' + slider('duckAmount', t('view.duckAmount'), S.duckAmount, 0, 100, 5, S.duckAmount + '%') + slider('duckTime', t('view.duckTime'), S.duckTime, 0.05, 3, 0.05, secTxt(S.duckTime)) + '</div>' +
    '<div class="hdr">' + esc(t('view.fade')) + '</div><div class="group sgroup">' + slider('goFade', t('view.fadeLen'), S.goFade, 0, 10, 0.5, secTxt(S.goFade)) + '</div><p class="ftr">' + esc(t('view.goFadeHint')) + '</p>';
  ctx.ui.sheet(body, (el, sh) => {
    el.addEventListener('change', (e) => {
      const k = e.target.dataset.sw; if (!k || !k.startsWith('v-')) return;
      if (k === 'v-normon' || k === 'v-normpads') { if (k === 'v-normon') S.norm.on = e.target.checked; else S.norm.pads = e.target.checked; save(); applyNorm(); sh.update(); }
    });
    el.addEventListener('click', (e) => {
      const tg = e.target.closest('[data-tg]');
      if (tg) { const k = tg.dataset.tg; S.ui[k] = !S.ui[k]; save(); sh.update(); return; }
      const sg = e.target.closest('[data-seg="ntarget"] [data-v]');
      if (sg) { S.norm.target = +sg.dataset.v; save(); applyNorm(); sh.update(); return; }
      if (e.target.closest('[data-x="dock"]')) bankSheet(M.dockOf(S));
    });
    el.addEventListener('input', (e) => {
      const s = e.target.dataset.s; if (!s) return;
      const v = +e.target.value; S[s] = v; save();
      const o = el.querySelector('[data-o="' + s + '"]'); if (o) o.textContent = s === 'duckAmount' ? v + '%' : secTxt(v);
      if (s === 'duckAmount' || s === 'duckTime') { const w = el.querySelector('#shduckw svg'); if (w) w.outerHTML = duckSvg(S.duckAmount, S.duckTime); if (eng) eng.setDuck(S.duckAmount, S.duckTime); }
    });
  }, { onClose: render });
}

function noiseSheet(r) {
  const body = () => ctx.ui.snav(t('bed.noise'), { right: '<button class="link b r" data-close>' + esc(t('editDone')) + '</button>' }) +
    '<div class="group"><div class="cellcol"><span>' + esc(t('bed.noiseName')) + '</span><input class="shfield" data-f="name" maxlength="40" value="' + esc(r.name) + '" aria-label="' + esc(t('bed.noiseName')) + '"></div></div>' +
    '<div class="group sgroup" style="margin-top:12px">' + slider('level', t('pad.level'), r.level, 0, 100, 1, lvTxt(r.level)) + '</div>' +
    '<div class="group" style="margin-top:16px"><button class="cell" data-x="del" style="color:var(--red)"><span class="grow">' + esc(t('bed.noiseDel')) + '</span></button></div>';
  ctx.ui.sheet(body, (el, sh) => {
    el.addEventListener('input', (e) => {
      if (e.target.dataset.f === 'name') { r.name = e.target.value.slice(0, 40); save(); }
      if (e.target.dataset.s === 'level') { r.level = +e.target.value; const o = el.querySelector('[data-o="level"]'); if (o) o.textContent = lvTxt(r.level); if (bed && S.bed.noise.cur === r.id) bed.noiseTrim(noiseVol(r)); save(); }
    });
    el.addEventListener('click', (e) => {
      if (!e.target.closest('[data-x="del"]')) return;
      if (S.bed.noise.cur === r.id) { S.bed.noise.cur = null; if (bed) bed.stopNoise(S.bed.noise.xfade); }
      const f = fileOf(r.file); S.noises = S.noises.filter((x) => x.id !== r.id);
      if (f && f.show && !S.noises.some((x) => x.file === r.file) && !allPads().some((x) => x.file === r.file)) ctx.files.remove(r.file);
      if (bed) bed.forget(r.file);
      save(); sh.close();
    });
  }, { onClose: render });
}

/* ---------- выбор файла ---------- */

// opts.pad — файл добавляется как звук (в списке медиатеки не показывается); cur — выбранный сейчас
function pickFile(opts, done) {
  let q = '', cat = 'all'; // cat — папка медиатеки (core/mediafolders.js): разное аудио не перемешивается
  const pool = () => ctx.files.list('audio').filter((x) => !x.stem);
  const catsHTML = () => { const cs = ctx.folders.cats(pool()); if (!cs.some((c) => c.id === cat)) cat = 'all'; return '<div class="shchips tight hscroll" style="margin-top:8px">' + cs.map((c) => '<button class="shchip' + (cat === c.id ? ' on' : '') + '" data-cat="' + c.id + '" aria-pressed="' + (cat === c.id) + '">' + esc(c.id === 'all' || c.auto ? t('cat.' + c.id) : c.name) + ' ' + c.n + '</button>').join('') + '</div>'; };
  const list = () => pool().filter((x) => (cat === 'all' ? !x.dict || ctx.folders.catOf(x) !== 'dict' : ctx.folders.inCat(x, cat))).sort((a, b) => (b.created || 0) - (a.created || 0)).filter((x) => !q || x.name.toLowerCase().includes(q.toLowerCase()));
  const body = () => ctx.ui.snav(t('pick.title'), { right: '<button class="link b r" data-close>' + esc(t('ui.cancel')) + '</button>' }) +
    '<div class="group"><input class="shfield" type="search" data-q placeholder="' + esc(t('pick.search')) + '" value="' + esc(q) + '" aria-label="' + esc(t('pick.search')) + '"><button class="cell act" data-x="addfile"><span class="grow">' + esc(t('pick.add')) + '</span></button></div>' +
    catsHTML() + '<div class="group shpick" style="margin-top:12px">' + (list().length ? list().map((x) => '<button class="row" data-file="' + x.id + '"><span>' + esc(x.name) + '</span><small>' + (x.dur ? M.mmss(x.dur) : '') + '</small></button>').join('') : '<p class="ftr" style="padding:14px">' + esc(t(q ? 'pick.noRes' : 'pick.empty')) + '</p>') + '</div>' +
    (opts.cur ? '<div class="group" style="margin-top:12px"><button class="cell" data-x="nofile" style="color:var(--red)"><span class="grow">' + esc(t('pick.remove')) + '</span></button></div>' : '');
  ctx.ui.sheet(body, (el, sh) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*,video/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac'; inp.hidden = true; el.appendChild(inp);
    el.addEventListener('click', (e) => {
      const g = (s) => e.target.closest(s); let b;
      if ((b = g('[data-cat]'))) { cat = b.dataset.cat; sh.update(); }
      else if ((b = g('[data-file]'))) { done(b.dataset.file); sh.close(); }
      else if (g('[data-x="addfile"]')) inp.click();
      else if (g('[data-x="nofile"]')) { done(null); sh.close(); }
    });
    el.addEventListener('input', (e) => { if (e.target.matches('[data-q]')) { q = e.target.value; const pos = e.target.selectionStart; sh.update(); const n = el.querySelector('[data-q]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } });
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0]; inp.value = '';
      if (!f) return;
      if (!/^(audio|video)\//.test(f.type) && !/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|mp4|webm|mkv|mov|m4v)$/i.test(f.name)) { ctx.ui.toast(t('pick.badFile')); return; }
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const rec = { id, name: f.name.replace(/\.[^.]+$/, ''), size: f.size, type: f.type, songs: [], created: Date.now(), blob: f, video: /^video\//.test(f.type), ...(opts.pad ? { show: true } : {}) };
      const dur = await probeDur(f); if (dur) rec.dur = dur;
      if (cat !== 'all' && ctx.folders.list().some((fd) => fd.id === cat)) rec.folder = cat;
      if (!(await ctx.files.add(rec))) { ctx.ui.toast(t('pick.noSave')); return; }
      done(id); sh.close();
    });
  });
}
function probeDur(f) {
  return new Promise((res) => {
    const a = document.createElement('audio'), url = URL.createObjectURL(f);
    const end = (r) => { clearTimeout(tm); URL.revokeObjectURL(url); a.removeAttribute('src'); res(r); };
    const tm = setTimeout(() => end(null), 5000);
    a.preload = 'metadata'; a.onloadedmetadata = () => end(Number.isFinite(a.duration) ? a.duration : null); a.onerror = () => end(null); a.src = url;
  });
}

/* ---------- выступления и номера ---------- */

function eventsSheet() {
  const list = () => S.events.filter((e) => !e.deleted);
  const body = () => ctx.ui.snav(t('event.list'), { right: '<button class="link b r" data-close>' + esc(t('editDone')) + '</button>' }) +
    '<div class="group shpick">' + list().map((e, i) => '<button class="row" data-ev="' + e.id + '"><span>' + esc(e.title || t('event.untitled', { n: i + 1 })) + (e.id === S.event ? ' ✓' : '') + '</span><small>' + esc(evSub(e)) + '</small></button>').join('') + '</div>' +
    '<div class="group" style="margin-top:12px"><button class="cell act" data-x="new"><span class="grow">' + esc(t('event.new')) + '</span></button></div>';
  ctx.ui.sheet(body, (el, sh) => el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ev]');
    if (b) { S.event = b.dataset.ev; save(); sh.close(); }
    else if (e.target.closest('[data-x="new"]')) { sh.close(); newEvent(); }
  }), { onClose: render });
}
const dtLocal = (ms) => { if (!ms) return ''; const d = new Date(ms), p = (v) => String(v).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); };

function eventSheet(ev) {
  if (!ev) return;
  const touch = () => { ev.updatedAt = Date.now(); save(); };
  const body = () => ctx.ui.snav(t('event'), { right: '<button class="link b r" data-close>' + esc(t('editDone')) + '</button>' }) +
    '<div class="group"><div class="cellcol"><span>' + esc(t('event.title')) + '</span><input class="shfield" data-f="title" maxlength="80" value="' + esc(ev.title) + '" aria-label="' + esc(t('event.title')) + '"></div>' +
    '<div class="cellcol"><span>' + esc(t('event.start')) + '</span><input class="shfield" type="datetime-local" data-f="start" value="' + dtLocal(ev.start) + '" aria-label="' + esc(t('event.start')) + '"></div></div><p class="ftr">' + esc(t('event.startHint')) + '</p>' +
    '<div class="group">' + row(t('event.timer'), ctx.ui.seg('etimer', ['none', 'start', 'length'].map((v) => [v, t('event.timer.' + v)]), ev.timer, t('event.timer'))) +
    (ev.timer === 'length' ? '<div class="cellcol"><span>' + esc(t('event.length')) + '</span><input class="shfield" data-f="length" inputmode="numeric" value="' + (ev.length ? Math.round(ev.length / 60) : '') + '" aria-label="' + esc(t('event.length')) + '"></div>' : '') + '</div>' +
    (ev.timer === 'length' ? '<p class="ftr">' + esc(t('event.lengthHint')) + '</p>' : '') +
    '<div class="group" style="margin-top:12px"><div class="cellcol"><span>' + esc(t('event.note')) + '</span><textarea class="shfield area" data-f="note" maxlength="4000" aria-label="' + esc(t('event.note')) + '">' + esc(ev.note) + '</textarea></div></div>' +
    '<div class="group" style="margin-top:16px"><button class="cell" data-x="del" style="color:var(--red)"><span class="grow">' + esc(t('event.del')) + '</span></button></div>';
  ctx.ui.sheet(body, (el, sh) => {
    el.addEventListener('click', async (e) => {
      const v = e.target.closest('[data-seg="etimer"] [data-v]');
      if (v) { ev.timer = v.dataset.v; touch(); sh.update(); return; }
      if (e.target.closest('[data-x="del"]') && await ctx.ui.confirm(t('event.del'), t('event.delAsk'), t('event.del'))) {
        ev.deleted = true; ev.updatedAt = Date.now(); S.event = (S.events.find((x) => !x.deleted) || {}).id || null; save(); sh.close();
      }
    });
    el.addEventListener('input', (e) => {
      const f = e.target.dataset.f; if (!f) return;
      if (f === 'title') ev.title = e.target.value.slice(0, 80);
      else if (f === 'note') ev.note = e.target.value.slice(0, 4000);
      else if (f === 'start') { const ms = e.target.value ? new Date(e.target.value).getTime() : 0; ev.start = Number.isFinite(ms) ? ms : 0; }
      else if (f === 'length') { const m = parseInt(e.target.value, 10); ev.length = m > 0 ? m * 60 : 0; }
      touch();
    });
  }, { onClose: render });
}

// Свод дорожек в строке программы: «vocals 0, drums 50» (проценты) ↔ { vocals: 0, drums: 0.5 }
const mixText = (m) => (m ? Object.entries(m).map(([k, v]) => k + ' ' + Math.round(v * 100)).join(', ') : '');
const mixParse = (str) => { const o = {}; String(str || '').split(/[,;]+/).forEach((x) => { const [k, v] = x.trim().split(/[\s=:]+/); if (M.PARTS.includes(k) && v !== undefined && Number.isFinite(+v)) o[k] = +v / 100; }); return o; };
function numSheet(n) {
  const e = cur(), touch = () => { if (e) e.updatedAt = Date.now(); save(); };
  const f = () => fileOf(n.file), a = () => (f() && f().ana) || null;
  const loudLine = () => { const m = loudOf(n.file); return !n.file ? '' : !S.norm.on ? t('num.loud') + ': ' + t('num.loudOff') : m ? t('num.loud') + ': ' + (m.lufs > -150 ? ctx.num(m.lufs, 1) + ' LUFS · ' + t('num.loudFix', { g: (normDb(n) > 0 ? '+' : '') + ctx.num(normDb(n), 1) }) : t('num.loudNone')) : t('num.loud') + ': ' + t('num.loudWait'); };
  const keyLine = () => (a() && a().pc != null ? t('num.keyIs', { k: keyName(a().pc, a().minor) }) + (n.shift ? ' → ' + keyName(a().pc + n.shift, a().minor) : '') : t('num.keyUnknown'));
  const body = () => ctx.ui.snav(t('num.title'), { right: '<button class="link b r" data-close>' + esc(t('editDone')) + '</button>' }) +
    '<div class="group"><div class="cellcol"><span>' + esc(t('num.name')) + '</span><input class="shfield" data-f="title" maxlength="80" value="' + esc(n.title) + '" aria-label="' + esc(t('num.name')) + '"></div></div>' +
    '<div class="group shtwo" style="margin-top:12px"><div class="cellcol"><span>' + esc(t('num.at')) + '</span><input class="shfield" data-f="at" inputmode="numeric" placeholder="19:30" value="' + M.hhmm(n.at) + '" aria-label="' + esc(t('num.at')) + '"></div>' +
      '<div class="cellcol"><span>' + esc(t('num.dur')) + '</span><input class="shfield" data-f="dur" inputmode="decimal" placeholder="3:30" value="' + (n.dur ? M.mmss(n.dur) : '') + '" aria-label="' + esc(t('num.dur')) + '"></div></div>' +
    '<div class="group" style="margin-top:12px">' + row(t('num.kind'), ctx.ui.seg('nkind', M.NUM_KINDS.map((v) => [v, t('num.kind.' + v)]), n.kind, t('num.kind'))) +
      (n.kind === 'track' ? '<button class="cell" data-x="pick"><span class="grow">' + esc(t('num.file')) + '<span class="st l2" style="display:block;font-size:13px">' + esc(f() ? f().name : t('num.noFile')) + '</span></span><span class="val">' + esc(t('pad.pick')) + '</span></button>' : '') + '</div>' +
    (n.kind === 'track' ? '<div class="hdr">' + esc(t('num.keyHdr')) + '</div><div class="group"><div class="cellcol"><span>' + esc(t('num.keyOf')) + '<span class="st l2" style="display:block;font-size:13px">' + esc(a() && a().pc != null ? t('num.keyIs', { k: keyName(a().pc, a().minor) }) : t('num.keyUnknown')) + '</span></span>' +
        '<div class="shchips tight hscroll" style="margin-top:8px"><button class="shchip' + (n.keyPc == null ? ' on' : '') + '" data-nkey="">' + esc(t('bed.tonicAuto')) + '</button>' + M.TONIC_NAMES.map((x, i) => '<button class="shchip' + (n.keyPc === i ? ' on' : '') + '" data-nkey="' + i + '" aria-pressed="' + (n.keyPc === i) + '">' + esc(x) + '</button>').join('') + '</div></div>' +
        (n.keyPc != null ? row(t('num.mode'), ctx.ui.seg('nminor', [['maj', t('num.maj')], ['min', t('num.min')]], n.minor ? 'min' : 'maj', t('num.mode'))) : '') +
        '<div class="cellcol"><span>' + esc(t('num.bpm')) + '<span class="st l2" style="display:block;font-size:13px">' + esc(a() && a().bpm ? t('num.bpmIs', { n: Math.round(a().bpm) }) : t('num.bpmUnknown')) + '</span></span><input class="shfield" data-f="bpm" inputmode="numeric" placeholder="' + esc(t('bed.tonicAuto')) + '" value="' + (n.bpm || '') + '" aria-label="' + esc(t('num.bpm')) + '"></div></div>' : '') +
    (n.kind === 'track' ? '<p class="ftr keep" id="shloud" style="margin-top:12px">' + esc(loudLine()) + '</p>' : '') +
    (n.kind === 'track' ? '<div class="group sgroup" style="margin-top:12px">' + slider('shift', t('num.shift'), n.shift, -12, 12, 1, (n.shift > 0 ? '+' : n.shift < 0 ? '−' : '') + Math.abs(n.shift)) + slider('level', t('num.level'), n.level, 0, 100, 1, lvTxt(n.level)) + slider('fadeIn', t('num.fadeIn'), n.fadeIn, 0, 30, 0.5, secTxt(n.fadeIn)) + slider('fadeOut', t('num.fadeOut'), n.fadeOut, 0, 30, 0.5, secTxt(n.fadeOut)) + '</div><p class="ftr" id="shkey">' + esc(keyLine()) + '</p>' : '') +
    (n.kind === 'track' ? '<div class="hdr">' + esc(t('num.sound')) + '</div>' + chips('data-neq', M.EQ_IDS, n.eq, (v) => esc(t('eq.' + (v || 'flat')))) + '<div class="group sgroup" style="margin-top:8px">' + slider('tempo', t('num.tempo'), n.tempo, 0.5, 1.5, 0.05, spdTxt(n.tempo)) + '</div>' : '') +
    (n.kind === 'track' && partSet(n.file).length ? '<div class="hdr">' + esc(t('num.parts')) + '</div><div class="group sgroup">' + partSet(n.file).map((r) => r.stem.part).filter((k, i, a) => M.PARTS.includes(k) && a.indexOf(k) === i).map((k) => slider('mix_' + k, t('part.' + k), Math.round((n.mix[k] == null ? 1 : n.mix[k]) * 100), 0, 150, 5, (Math.round((n.mix[k] == null ? 1 : n.mix[k]) * 100)) + '%')).join('') + '</div><p class="ftr">' + esc(t('num.partsHint')) + '</p>' : '') +
    (n.kind === 'track' ? '<div class="hdr">' + esc(t('num.prog')) + '</div><div class="group shprog2">' + n.prog.map((ev) => '<div class="shev2" data-ev="' + ev.id + '"><input class="tt" data-pf="t" inputmode="decimal" value="' + M.mmss(ev.t) + '" aria-label="' + esc(t('prog.t')) + '">' +
      [['key', 'prog.key', ev.key], ['tempo', 'prog.tempo', ev.tempo], ['level', 'prog.level', ev.level], ['mix', 'prog.mix', mixText(ev.mix)], ['ramp', 'prog.ramp', ev.ramp || '']].map(([k, lb, v]) => '<input data-pf="' + k + '" inputmode="decimal" value="' + (v == null ? '' : v) + '" placeholder="' + esc(t(lb)) + '" aria-label="' + esc(t(lb)) + '">').join('') + '<button data-x="evdel" aria-label="' + esc(t('num.cueDel')) + '">×</button></div>').join('') +
      '<button class="cell act" data-x="evadd"><span class="grow">' + esc(t('prog.add')) + '</span></button></div><p class="ftr">' + esc(t('prog.hint')) + '</p>' : '') +
    '<div class="hdr">' + esc(t('num.bed')) + '</div><div class="group">' + row(t('num.bed'), ctx.ui.seg('nbed', [['keep', t('num.bed.keep')], ['set', t('num.bed.set')]], n.bed ? 'set' : 'keep', t('num.bed'))) +
      (n.bed ? '<div class="cell"><span class="grow">' + esc(t('num.bed.pad')) + '</span>' + ctx.ui.sw('nbpad', n.bed.pad, t('num.bed.pad')) + '</div>' +
        '<div class="group sgroup">' + slider('padLevel', t('num.bed.padLevel'), n.bed.padLevel == null ? S.bed.pad.level : n.bed.padLevel, 0, 100, 1, lvTxt(n.bed.padLevel == null ? S.bed.pad.level : n.bed.padLevel)) + slider('noiseLevel', t('num.bed.noiseLevel'), n.bed.noiseLevel == null ? S.bed.noise.level : n.bed.noiseLevel, 0, 100, 1, lvTxt(n.bed.noiseLevel == null ? S.bed.noise.level : n.bed.noiseLevel)) + '</div>' +
        '<div class="cellcol"><span>' + esc(t('num.bed.noise')) + '</span><div class="shchips" style="margin-top:8px"><button class="shchip' + (!n.bed.noise ? ' on' : '') + '" data-nnoise="">' + esc(t('num.bed.none')) + '</button>' + S.noises.map((r) => '<button class="shchip' + (n.bed.noise === r.id ? ' on' : '') + '" data-nnoise="' + r.id + '">' + esc(r.name || (fileOf(r.file) || {}).name || '') + '</button>').join('') + '</div></div>' : '') + '</div>' +
    '<div class="hdr">' + esc(t('num.note')) + '</div><div class="group"><textarea class="shfield area" data-f="note" maxlength="4000" placeholder="' + esc(t('num.noteHint')) + '" aria-label="' + esc(t('num.note')) + '">' + esc(n.note) + '</textarea></div>' +
    '<div class="hdr">' + esc(t('num.cues')) + '</div><div class="group">' + n.cues.map((c) => '<div class="shcue" data-cue="' + c.id + '"><input class="tt" data-ct inputmode="decimal" value="' + M.mmss(c.t) + '" aria-label="' + esc(t('num.cueTime')) + '"><input data-cx maxlength="200" value="' + esc(c.text) + '" placeholder="' + esc(t('num.cueText')) + '" aria-label="' + esc(t('num.cueText')) + '"><button data-x="cuedel" aria-label="' + esc(t('num.del')) + '">' + I.trash + '</button></div>').join('') +
      '<button class="cell act" data-x="cueadd"><span class="grow">' + esc(t('num.cueAdd')) + '</span></button></div><p class="ftr">' + esc(t('num.cuesHint')) + '</p>' +
    '<div class="group" style="margin-top:12px"><div class="cell"><span class="grow">' + esc(t('num.done')) + '</span>' + ctx.ui.sw('ndone', n.done, t('num.done')) + '</div></div>' +
    '<div class="group" style="margin-top:16px"><button class="cell act" data-x="run"><span class="grow">' + esc(t('num.run')) + '</span></button><button class="cell" data-x="del" style="color:var(--red)"><span class="grow">' + esc(t('num.del')) + '</span></button></div>';
  ctx.ui.sheet(body, (el, sh) => {
    el.addEventListener('click', async (ev) => {
      const g = (s) => ev.target.closest(s); let b;
      if ((b = g('[data-seg="nbed"] [data-v]'))) { n.bed = b.dataset.v === 'set' ? { pad: S.bed.pad.on, noise: S.bed.noise.cur || '' } : null; touch(); sh.update(); return; }
      if ((b = g('[data-neq]'))) { n.eq = b.dataset.neq; touch(); if (S.cur === n.id && deck) deck.setEq(n.eq); sh.update(); return; }
      if (g('[data-x="evadd"]')) { const st = deck ? deck.state : null; const tt = st && st.file === n.file ? Math.round(st.time * 10) / 10 : 0; n.prog = M.normalizeProg([...n.prog, { t: tt, level: n.level, ramp: 0 }]); touch(); if (deck && deck.state.file === n.file) deck.setProg(n.prog); sh.update(); return; }
      if ((b = g('[data-x="evdel"]'))) { const id = b.closest('[data-ev]').dataset.ev; n.prog = n.prog.filter((x) => x.id !== id); touch(); if (deck && deck.state.file === n.file) deck.setProg(n.prog); sh.update(); return; }
      if ((b = g('[data-nkey]'))) { n.keyPc = b.dataset.nkey === '' ? null : +b.dataset.nkey; touch(); if (S.cur === n.id && bed && bed.state.pad && S.bed.pad.tonic == null) bed.padTonic(bedTonic(n)); sh.update(); return; }
      if ((b = g('[data-seg="nminor"] [data-v]'))) { n.minor = b.dataset.v === 'min'; touch(); sh.update(); return; }
      if ((b = g('[data-nnoise]'))) { if (n.bed) n.bed.noise = b.dataset.nnoise; touch(); sh.update(); return; }
      if (g('[data-x="run"]')) { sh.close(); S.page = 'desk'; save(); await startNumber(n); return; }
      if ((b = g('[data-seg="nkind"] [data-v]'))) { n.kind = b.dataset.v; Object.assign(n, M.normalizeNumber(n)); touch(); sh.update(); }
      else if (g('[data-x="pick"]')) pickFile({ cur: n.file }, (id) => { n.file = id; if (id && !n.title) n.title = (fileOf(id) || {}).name || ''; const r = fileOf(id); if (r && r.dur && !n.dur) n.dur = Math.round(r.dur); touch(); sh.update(); ensureLoud(id).then(() => { const o = el.querySelector('#shloud'); if (o) o.textContent = loudLine(); }); });
      else if (g('[data-x="cueadd"]')) { M.addCue(n, 0, ''); touch(); sh.update(); }
      else if ((b = g('[data-x="cuedel"]'))) { const id = b.closest('[data-cue]').dataset.cue; n.cues = n.cues.filter((c) => c.id !== id); touch(); sh.update(); }
      else if (g('[data-x="del"]') && await ctx.ui.confirm(t('num.del'), t('num.delAsk'), t('num.del'))) { if (e) e.numbers = e.numbers.filter((x) => x.id !== n.id); touch(); sh.close(); }
    });
    el.addEventListener('input', (ev) => {
      const f = ev.target.dataset.f, s = ev.target.dataset.s;
      if (f === 'title') n.title = ev.target.value.slice(0, 80);
      else if (f === 'note') n.note = ev.target.value.slice(0, 4000);
      else if (s && s.startsWith('mix_')) {
        const k = s.slice(4), v = +ev.target.value / 100; n.mix = M.normalizeMix({ ...n.mix, [k]: v });
        const o = el.querySelector('[data-o="' + s + '"]'); if (o) o.textContent = Math.round(v * 100) + '%';
        if (S.cur === n.id && deck && deck.state.file === n.file) deck.setMix && deck.setMix(n.mix);
      }
      else if (s) {
        const v = +ev.target.value; n[s] = v;
        const o = el.querySelector('[data-o="' + s + '"]');
        if (o) o.textContent = s === 'level' || s === 'padLevel' || s === 'noiseLevel' ? lvTxt(v) : s === 'shift' ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) : s === 'tempo' ? spdTxt(v) : secTxt(v);
        if (s === 'shift') { const k = el.querySelector('#shkey'); if (k) k.textContent = keyLine(); if (S.cur === n.id) { if (deck) deck.setShift(v); if (bed && bed.state.pad && S.bed.pad.tonic == null) bed.padTonic(bedTonic(n)); } }
        if (s === 'level' && S.cur === n.id && deck) deck.setLevel(v);
        if (s === 'tempo' && S.cur === n.id && deck && !(n.prog && n.prog.length)) deck.setTempo(v);
        if (s === 'padLevel' && n.bed) { n.bed.padLevel = v; if (S.cur === n.id && bed) bed.padLevel(v); }
        if (s === 'noiseLevel' && n.bed) { n.bed.noiseLevel = v; const r = noiseRec(S.bed.noise.cur); if (S.cur === n.id && bed && r) bed.noiseTrim(noiseVol(r, n)); }
      }
      touch();
    });
    el.addEventListener('change', (ev) => {
      const f = ev.target.dataset.f;
      if (ev.target.dataset.sw === 'ndone') { n.done = ev.target.checked; touch(); return; }
      if (ev.target.dataset.sw === 'nbpad') { if (n.bed) n.bed.pad = ev.target.checked; touch(); return; }
      if (ev.target.dataset.pf) {
        const row = ev.target.closest('[data-ev]'), pe = n.prog.find((x) => x.id === row.dataset.ev), k = ev.target.dataset.pf, raw = ev.target.value.trim().replace(',', '.');
        if (pe) { if (k === 't') { const v = M.parseTime(ev.target.value); if (v != null) pe.t = v; } else if (k === 'mix') { const mx = mixParse(ev.target.value); if (Object.keys(mx).length) pe.mix = mx; else delete pe.mix; } else if (raw === '') delete pe[k]; else pe[k] = +raw; n.prog = M.normalizeProg(n.prog); }
        touch(); if (deck && deck.state.file === n.file) deck.setProg(n.prog); sh.update(); return;
      }
      if (f === 'bpm') { const v = Math.round(+ev.target.value.replace(',', '.')); n.bpm = Number.isFinite(v) && v >= 20 && v <= 300 ? v : null; touch(); sh.update(); return; }
      if (f === 'at') { const v = ev.target.value.trim() ? M.parseHhmm(ev.target.value) : null; n.at = v; sh.update(); touch(); }
      else if (f === 'dur') { const v = ev.target.value.trim() ? M.parseTime(ev.target.value) : 0; n.dur = v == null ? n.dur : v; sh.update(); touch(); }
      else if (ev.target.matches('[data-ct]')) { const c = n.cues.find((x) => x.id === ev.target.closest('[data-cue]').dataset.cue), v = M.parseTime(ev.target.value); if (c && v != null) { c.t = v; n.cues.sort((x, y) => x.t - y.t); } sh.update(); touch(); }
      else if (ev.target.matches('[data-cx]')) { const c = n.cues.find((x) => x.id === ev.target.closest('[data-cue]').dataset.cue); if (c) c.text = ev.target.value.slice(0, 200); touch(); }
    });
  }, { tall: true, onClose: () => { render(); setTimeout(queueAna, 500); } });
}

/* ---------- жизнь окна ---------- */

async function awake() {
  try {
    if (wake) { await wake.release(); wake = null; }
    if (navigator.wakeLock && document.visibilityState === 'visible') wake = await navigator.wakeLock.request('screen');
  } catch { wake = null; /* нет разрешения — экран гаснет как обычно */ }
}

export default {
  ...meta,
  mount(el, c, sz = 'full') {
    host = el; ctx = c; size = sz;
    const ns = ctx.store.all(); // хранилище модуля — device.show: данные лежат прямо в нём
    S = Object.assign(ns, M.normalizeShow(ns));
    if (!PAGES.includes(S.page)) S.page = S.page === 'bed' ? 'pads' : 'desk';
    host.addEventListener('click', onClick);
    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);
    host.addEventListener('input', onInput);
    host.addEventListener('change', onChange);
    host.addEventListener('keydown', onKey);
    if (ctx.output) offs.push(ctx.output.bind(host, { cat: 'media' })); // вывод на другое устройство — та же шторка, что в сессии
    // раскладка: удержать блок — выше / ниже, мельче / крупнее, скрыть (src/ui/layout.js)
    bindLayout(host, () => ({ lay: layOf(S.page), ids: S.page === 'pads' ? ['bed', 'drums', 'sounds', 'dock'] : ['event', 'picks', 'wave', 'cues', 'ctl', 'knobs'], name: (id) => t('lay.b.' + id), save, render, t, busy: () => !!(ctx.sounding && ctx.sounding()) }), '.shpad, [data-knob], [data-fader], #shwave, [data-pick], [data-tc], input, textarea, [role="slider"]');
    // список выступления: влево — плавно перейти к номеру, вправо по проигранному — вернуть; удержать — настройки номера
    offs.push(swipe(host, { min: 50, ok: (e) => { const r = e.target.closest && e.target.closest('[data-pick]'); pickRow = r ? r.dataset.pick : null; return !!r; },
      left: () => { const n = pickRow && pickById(pickRow); if (n) glideTo(n).catch((er) => ctx.logErr(er)); },
      right: () => { const n = pickRow && pickById(pickRow); if (n && n.done) { n.done = false; const e = cur(); if (e) e.updatedAt = Date.now(); save(); ctx.ui.toast(t('pick.restored')); render(); } } }));
    offs.push(onHold(host, '[data-bank]', (el) => { const b = S.banks.find((x) => x.id === el.dataset.bank); if (b) bankSheet(b); }) || (() => {}));
    // удержать обложку (значок слева) — вести номер по списку; удержать в другом месте строки — настройки номера
    offs.push(onHold(host, '[data-pick]', (el, e) => { if (e && e.target && e.target.closest && e.target.closest('.shpick > i')) return; const n = pickById(el.dataset.pick); if (n) numSheet(n); }) || (() => {}));
    offs.push(dragSort(host, '[data-pick]', 'data-pick', { skip: (e) => !(e.target && e.target.closest && e.target.closest('.shpick > i')), onDrop: (ids) => { const e = cur(); if (!e) return; const by = new Map(e.numbers.map((n) => [n.id, n])); const ord = ids.map((i) => by.get(i)).filter(Boolean); if (ord.length !== e.numbers.length) { render(); return; } e.numbers = ord; e.updatedAt = Date.now(); save(); render(); } }) || (() => {}));
    const bankStep = (d) => { const bs = S.banks.filter((x) => !x.pinned && x.preset !== 'drums'); const i = bs.findIndex((x) => x.id === S.bank); const nb = bs[i + d]; if (nb) { S.bank = nb.id; save(); render(); preload(); } };
    offs.push(swipe(host, { min: 40, ok: (e) => !!(e.target.closest && e.target.closest('.shbanks')), left: () => bankStep(1), right: () => bankStep(-1) }));
    offs.push(swipe(host, { ok: (e) => !(e.target.closest && e.target.closest('[data-pick], .shbanks')), left: () => { const i = PAGES.indexOf(S.page); if (i < PAGES.length - 1) go(PAGES[i + 1]); }, right: () => { const i = PAGES.indexOf(S.page); if (i > 0) go(PAGES[i - 1]); } }));
    const vis = () => { if (document.visibilityState === 'visible') awake(); };
    document.addEventListener('visibilitychange', vis);
    offs.push(() => document.removeEventListener('visibilitychange', vis));
    tickT = setInterval(() => { if (!host) return; const o = host.querySelector('#shtm'), r = timerText(); if (!!o !== !!r.s) { render(); return; } if (o) { o.textContent = r.s; o.classList.toggle('over', r.over); } }, 1000);
    awake(); holdScreen('show', true);
    render();
    setTimeout(queueLoud, 1500);
    setTimeout(queueAna, 2500);
    if ((S.page === 'pads' || S.ui.deskPads) && ctx.audio.ready()) { if (ensureEng()) preload(); }
  },
  resize(sz) { size = sz; render(); },
  unmount() {
    holdScreen('show', false);
    clearInterval(tickT); clearInterval(deskT); deskT = 0; clearInterval(meterT); meterT = 0; duckEnd(); cancelAnimationFrame(raf); raf = 0;
    offs.splice(0).forEach((f) => f());
    if (host) { host.removeEventListener('click', onClick); host.removeEventListener('pointerdown', onDown); host.removeEventListener('pointerup', onUp); host.removeEventListener('pointercancel', onUp); host.removeEventListener('input', onInput); host.removeEventListener('change', onChange); host.removeEventListener('keydown', onKey); }
    held.clear();
    if (bed) { bed.padOff(0.5); bed.stopNoise(0.5); if (unsubBed) { unsubBed(); unsubBed = null; } }
    if (deck) { deck.stop(0.3); if (unsubDeck) { unsubDeck(); unsubDeck = null; } }
    if (eng) { eng.stopAll(0.3); if (unsubEng) { unsubEng(); unsubEng = null; } }
    try { if (wake) wake.release(); } catch { /* уже */ }
    wake = null; host = null; ctx = null; edit = false;
  },
};
