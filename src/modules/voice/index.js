// Диктофон: запись с выбранного входа (микрофон телефона, гарнитура, Bluetooth, USB — и приёмники петличек
// Hollyland, DJI и других; в браузере и на компьютере — и звук экрана или вкладки), воспроизведение на выбранный выход,
// обработка режимами (src/audio/vocal.js: «Как есть», «Музыка», «Речь», «Вокал», «Эфир», «Репетиция»; цепочка
// срез → экспандер → де-эссер → тембр → компрессор → эффекты → лимитер, громкость файла по EBU R128; любая правка —
// «Свой»), общая цепочка эффектов приложения (ctx.fxPanel), обрезка. Готовая запись — в медиатеку (WAV 16/24/32).
// Надёжность: исходник пишется как есть и хранится отдельно (после сохранения — ещё 14 дней), обработка — отдельно;
// не удалась обработка — можно сохранить исходник; вход пропал — запись продолжается со встроенного микрофона или
// бережно заканчивается.
// До записи: вход слушается сразу — мини-окно спектра и уровня, цепочка эффектов и усиление звучат вживую в наушниках
// теми же узлами, что и при обработке записи; в файл пишется исходник, обработка с теми же настройками применяется
// при сохранении. Кнопка записи — внизу, под рукой.
// Звук не покидает устройство. Движок — src/audio/voiceengine.js, обработка — src/audio/voicefx.js и livefx.js.
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';
import './voice.css';
import { engine, isLav, KIND } from '../../audio/voiceengine.js';
import { decodeWav, encodeWav, processVoice, peaks, spectrumDb, migrateVoiceFx } from '../../audio/voicefx.js';
import { MODE_IDS, LEVELS, normalizeVoiceSet, editVoiceSet, modeParams, modeLevel } from '../../audio/vocal.js';
import { normalizeFx } from '../../audio/fx.js';
import { createLiveFx, openInput, setOutput, levelOf } from '../../audio/livefx.js';

import meta, { ICON } from './meta.js';
const I = {
  rec: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.2" height="14" rx="1.4" fill="currentColor" stroke="none"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.4" fill="currentColor" stroke="none"/></svg>',
  tune: '<svg viewBox="0 0 24 24"><path d="M5 4v6M5 14v6M12 4v2M12 10v10M19 4v10M19 18v2"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="19" cy="16" r="2"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.8v14.4c0 .8.9 1.3 1.6.9l11.3-7.2c.6-.4.6-1.4 0-1.8L8.6 3.9C7.9 3.5 7 4 7 4.8z" fill="currentColor" stroke="none"/></svg>',
  ear: '<svg viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13.5" width="4.5" height="7" rx="1.8"/><rect x="16.5" y="13.5" width="4.5" height="7" rx="1.8"/></svg>',
  wave: '<svg viewBox="0 0 24 24"><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/></svg>',
};
const FX_DEF = { denoise: 0, gate: -90, gain: 0, normalize: true }; // своё у диктофона; остальное — общая цепочка (s.chain)
const RAW_KEEP_DAYS = 14, RAW_KEEP_MIN = 10; // исходники сохранённых записей: не меньше 10 последних и не старше 14 дней
// Окно уровня: что показывать (настраивается — шестерёнка в окне)
const METER_DEF = { spec: true, style: 'bars', mode: 'both', clip: -0.3, hold: 2, range: 60, smooth: 'mid' };

let host = null, ctx = null, size = 'full', offs = [], onClick = null, onChange = null, onPtr = null, onInput = null, pm = null, pmb = null;
const S = { gr: null, phase: 'idle', sec: 0, peak: 0, rms: 0, paused: false, clip: 0, take: null, sel: [0, 1], playing: false, pos: 0, mode: 'proc', busy: false, devs: { inputs: [], outputs: [] }, err: null, proc: null, kept: [] };

const st = () => {
  const s = ctx.store.all();
  s.fx = { ...FX_DEF, ...(s.fx || {}) };
  if (!s.chain) { s.chain = normalizeFx(migrateVoiceFx(s.fx)); ['lowcut', 'eq', 'comp', 'reverb'].forEach((k) => delete s.fx[k]); ctx.store.save(); } // настройки до 2026-10 — перенос один раз
  if (!s.voice) { s.voice = migrateVoice(s.fx); ctx.store.save(); } // режимы обработки (2026-11) — из прежних настроек один раз
  s.voice = normalizeVoiceSet(s.voice);
  s.meter = { ...METER_DEF, ...(s.meter || {}) }; s.in ??= null; s.out ??= null; s.stereo ??= false; s.raw ??= true; s.live ??= true; s.hear ??= false;
  s.bits ??= 24; s.keepRaw ??= false; s.pick ??= 'mix'; s.savedRaw ??= []; return s; };
// Прежние ручки (шумоподавление, гейт, нормализация) → режим: не трогали — «Музыка», трогали — «Свой» с ними
function migrateVoice(fx = {}) {
  const custom = fx.denoise > 0 || (fx.gate != null && fx.gate > -90) || fx.normalize === false;
  if (!custom) return { mode: 'music' };
  const p = { ...modeParams('music'), denoise: +fx.denoise || 0 };
  if (fx.gate > -90) Object.assign(p, { expThr: fx.gate, expRatio: 4, expRange: 40 });
  return { mode: 'own', base: 'music', p, level: fx.normalize === false ? 'off' : 'peak' };
}
const big = () => size === 'full' || size === 'half';
const esc = (s) => ctx.ui.esc(s);
const t = (k, v) => ctx.t(k, v);
const fmt = (sec) => { sec = Math.max(0, sec || 0); const m = Math.floor(sec / 60), s = sec - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };

/* ---------- устройства ---------- */

function devName(d) {
  if (d.type === 'display') return t('dev.display');
  const k = KIND[d.type] || 'other', nm = d.name && d.name !== 'null' ? d.name : '';
  const base = t('dev.' + k);
  if (k === 'phone' || k === 'speaker' || k === 'earpiece') return base + (S.devs.inputs.filter((x) => x.type === d.type).length > 1 && nm ? ' · ' + nm : '');
  return base + (nm ? ': ' + nm : '');
}
async function loadDevices() {
  try { S.devs = await engine().devices(); } catch { S.devs = { inputs: [], outputs: [] }; }
  // одинаковые встроенные микрофоны (низ/верх/камера) — оставить первый: выбирать между ними на практике нечего
  const seen = new Set();
  S.devs.inputs = S.devs.inputs.filter((d) => { const k = d.type === 'builtin_mic' ? 'b' : d.id; if (seen.has(k)) return false; seen.add(k); return true; });
  render();
}
const curIn = () => S.devs.inputs.find((d) => String(d.id) === String(st().in)) || null;

function devHTML() {
  const s = st(), sel = (k, list, cur, def) => '<select class="sortsel" data-v="' + k + '" aria-label="' + esc(t(k === 'in' ? 'in' : 'out')) + '"><option value="">' + esc(def) + '</option>' +
    list.map((d) => '<option value="' + esc(d.id) + '"' + (String(d.id) === String(cur) ? ' selected' : '') + '>' + esc(devName(d)) + (isLav(d) ? ' · ' + esc(t('lav')) : '') + '</option>').join('') + '</select>';
  const lav = curIn() && isLav(curIn());
  return '<div class="group vc-dev"><label class="cell"><span class="vc-lbl">' + t('in') + '</span>' + sel('in', S.devs.inputs, s.in, t('auto')) + '</label>' +
    '<label class="cell"><span class="vc-lbl">' + t('out') + '</span>' + (S.devs.outputs.length ? sel('out', S.devs.outputs, s.out, t('auto')) : '<span class="l2 vc-note">' + t('outAuto') + '</span>') + '</label>' +
    (big() ? '<div class="cell"><span class="grow">' + t('stereo') + '</span>' + sw('stereo', s.stereo) + '</div>' +
      (!s.stereo ? '<div class="cellcol"><span class="vc-lbl">' + t('pick') + '</span>' + ctx.ui.seg('vpick', [['mix', t('pick.mix')], ['l', t('pick.l')], ['r', t('pick.r')]], s.pick, t('pick')) + '</div>' : '') +
      '<div class="cell"><span class="grow"><span>' + t('raw') + '</span><span class="st l2">' + t('rawHint') + '</span></span>' + sw('raw', s.raw) + '</div>' : '') + '</div>' +
    (lav ? '<p class="ftr">' + t('lavHint') + '</p>' : curIn() && KIND[curIn().type] === 'bt' ? '<p class="ftr">' + t('btHint') + '</p>' : '');
}
const sw = (k, on) => '<label class="sw"><input type="checkbox" data-v="' + k + '"' + (on ? ' checked' : '') + '><i></i></label>';

/* ---------- запись ---------- */

// Вход до записи: слушать и обрабатывать вживую (livefx) — мини-окно спектра и уровня после обработки,
// в наушниках (если включено) — звук с обработкой. Ничего не пишется. Android: вход направляется маршрутом.
let L = null; // { c, inp, fx, an, mon, raf, buf }
async function liveStart() {
  if (L || !host || !big() || S.phase !== 'idle') return;
  const s = st(), dev = curIn(), E = engine();
  if (dev && dev.type === 'display') return; // звук экрана — окно выбора только при записи
  L = { pending: true };
  try {
    const C = window.AudioContext || window.webkitAudioContext, c = new C({ latencyHint: 'interactive' });
    if (E.native) await E.route(dev ? dev.id : -1);
    const inp = await openInput(c, !E.native && dev ? dev.id : null);
    const fx = await createLiveFx(c, { chain: s.chain, gain: s.fx.gain, voice: s.voice });
    if (!L || !L.pending) { fx.disconnect(); inp.stop(); c.close(); if (E.native) E.unroute(); return; } // успели закрыть
    const an = c.createAnalyser(), mon = c.createGain();
    an.fftSize = 2048;
    inp.src.connect(fx.input); fx.output.connect(an); fx.output.connect(mon).connect(c.destination);
    mon.gain.value = s.hear ? 1 : 0;
    if (!E.native && s.out) setOutput(c, s.out);
    L = { c, inp, fx, an, mon, buf: new Float32Array(an.fftSize), raf: 0 };
    Object.assign(M, { hold: -120, clipAt: 0, spec: null, rate: c.sampleRate });
    S.err = null;
    const loop = () => { if (!L || !L.an) return; L.raf = requestAnimationFrame(loop); meterUpdate(levelOf(L.an, L.buf)); grUpdate(L.fx.gr()); };
    loop();
  } catch (e) { L = null; S.err = e && e.reason === 'denied' ? 'denied' : 'unavailable'; if (E.native) E.unroute(); }
  render();
}
async function liveStop() {
  const l = L; L = null;
  if (!l || l.pending) return;
  cancelAnimationFrame(l.raf);
  l.fx.disconnect(); l.inp.stop();
  try { await l.c.close(); } catch { /* уже */ }
  if (engine().native) await engine().unroute();
}
const liveFx = () => { if (L && L.fx) L.fx.update({ chain: st().chain, gain: st().fx.gain, voice: st().voice }); };
const liveHear = () => { if (L && L.mon) L.mon.gain.setTargetAtTime(st().hear ? 1 : 0, L.c.currentTime, 0.03); };
const liveRestart = async () => { await liveStop(); if (st().live) liveStart(); };
async function startRec() {
  await liveStop();
  if (S.take && !S.take.saved && !(await ctx.ui.confirm(t('discardTitle'), t('discardText'), t('discardYes')))) return;
  await dropTake();
  const s = st(), dev = curIn();
  try {
    const r = await engine().start({ deviceId: dev ? dev.id : -1, stereo: s.stereo || s.pick !== 'mix', raw: s.raw });
    Object.assign(S, { phase: 'rec', sec: 0, peak: 0, rms: 0, paused: false, clip: 0, err: null, rate: r.rate, bt: r.bt });
    Object.assign(M, { hold: -120, clipAt: 0, spec: null, rate: r.rate || 48000 });
    ctx.log('запись: вход ' + (dev ? dev.type : 'авто') + ', ' + r.rate + ' Гц, каналов ' + r.channels);
  } catch (e) {
    const m = String(e && e.message);
    S.err = m === 'denied' || m === 'space' || m === 'noaudio' ? m : 'unavailable';
    ctx.log('запись не началась: ' + S.err, 'w');
  }
  render();
}
async function stopRec() {
  try {
    const r = await engine().stop();
    S.take = await loadTake(r.path);
    Object.assign(S, { phase: 'take', sel: [0, 1], pos: 0, mode: 'proc', proc: null });
    ctx.log('записано ' + S.take.sec.toFixed(1) + ' с' + (r.reason ? ' (остановлено: ' + r.reason + ')' : ''));
  } catch (e) { ctx.logErr(e); S.phase = 'idle'; ctx.ui.toast(t('recFail')); loadKept(); }
  render();
}
// Исходник → дубль: каналы, волна. Вход с двумя каналами, а нужен один (петличка в канале 1 звуковой карты) —
// взять его; в файле исходника остаются оба
async function loadTake(path) {
  const u8 = await engine().read(path), w = u8 && decodeWav(u8);
  if (!w || !w.ch[0].length) throw new Error('empty');
  const pk = st().pick, ch = w.ch.length === 2 && !st().stereo ? (pk === 'l' ? [w.ch[0]] : pk === 'r' ? [w.ch[1]] : [w.ch[0].map((v, i) => (v + w.ch[1][i]) / 2)]) : w.ch;
  return { path, ch, sr: w.sr, sec: ch[0].length / w.sr, peaks: peaks(ch, 600), saved: false };
}
// Исходники прошлых записей в памяти диктофона: после сбоя, закрытия или неудачного чтения запись не теряется —
// её можно открыть снова и сохранить. Исходники сохранённых записей хранятся RAW_KEEP_DAYS дней (не меньше
// RAW_KEEP_MIN последних) — можно обработать заново; несохранённые сами не удаляются никогда
async function loadKept() {
  const fs = engine().list ? await engine().list() : [], s = st(), now = Date.now();
  const saved = new Map(s.savedRaw.map((x) => [x.path, x.at]));
  const old = fs.filter((f) => saved.has(f.path)).sort((a, b) => b.at - a.at).slice(RAW_KEEP_MIN).filter((f) => now - saved.get(f.path) > RAW_KEEP_DAYS * 864e5);
  old.forEach((f) => engine().remove(f.path));
  const gone = new Set(old.map((f) => f.path)), have = new Set(fs.map((f) => f.path));
  const keep = s.savedRaw.filter((x) => !gone.has(x.path) && have.has(x.path));
  if (keep.length !== s.savedRaw.length) { s.savedRaw = keep; ctx.store.save(); }
  S.kept = fs.filter((f) => !gone.has(f.path) && (!S.take || f.path !== S.take.path)).map((f) => ({ ...f, saved: saved.has(f.path) })).sort((a, b) => b.at - a.at);
  render();
}
async function openKept(path) {
  if (S.phase !== 'idle') return;
  try {
    await liveStop();
    S.take = await loadTake(path);
    Object.assign(S, { phase: 'take', sel: [0, 1], pos: 0, mode: 'proc', proc: null, kept: S.kept.filter((f) => f.path !== path) });
    ctx.log('открыта запись из памяти: ' + S.take.sec.toFixed(1) + ' с');
  } catch (e) { ctx.logErr(e); ctx.ui.toast(t('recFail')); }
  render();
}
// Убрать дубль с экрана: несохранённый — удалить (после подтверждения), сохранённый — исходник остаётся в памяти
async function dropTake() {
  await stopPlay();
  if (S.take) { if (!S.take.saved) engine().remove(S.take.path); if (S.proc) engine().remove(S.proc.path); }
  S.take = null; S.proc = null; S.phase = 'idle';
  loadKept();
}

/* ---------- обработка и воспроизведение ---------- */

const selSec = () => [S.sel[0] * S.take.sec, S.sel[1] * S.take.sec];
const fxKey = () => JSON.stringify([st().fx.gain, st().voice, st().chain, S.sel]);
async function processed() {
  if (S.proc && S.proc.key === fxKey()) return S.proc;
  S.busy = true; render();
  await new Promise((r) => setTimeout(r, 30)); // дать экрану обновиться
  let out;
  try { out = await processVoice(S.take.ch, S.take.sr, { gain: st().fx.gain, voice: st().voice, chain: st().chain, trim: selSec() }); }
  finally { S.busy = false; }
  const path = 'proc-' + Date.now() + '.wav';
  if (S.proc) engine().remove(S.proc.path);
  await engine().write(path, encodeWav(out, S.take.sr));
  S.proc = { path, key: fxKey(), ch: out, sec: out[0].length / S.take.sr };
  return S.proc;
}
async function play() {
  if (S.playing) { await stopPlay(); render(); return; }
  try {
    const out = st().out ? (S.devs.outputs.find((d) => String(d.id) === String(st().out)) || {}).id : -1;
    if (S.mode === 'proc') { const p = await processed(); S.offset = selSec()[0]; await engine().play(p.path, out, 0); }
    else { S.offset = 0; await engine().play(S.take.path, out, selSec()[0]); }
    S.playing = true;
  } catch (e) { ctx.logErr(e); S.busy = false; ctx.ui.toast(t('playFail')); }
  render();
}
async function stopPlay() { if (S.playing) { S.playing = false; try { await engine().stopPlay(); } catch { /* уже */ } } }

const stamp = () => { const d = new Date(), pad = (n) => String(n).padStart(2, '0'); return { d: pad(d.getDate()) + '.' + pad(d.getMonth() + 1), t: pad(d.getHours()) + '-' + pad(d.getMinutes()) }; };
async function addFile(name, wav, dur) {
  const song = ctx.session && ctx.session.songId;
  await ctx.files.add({ id: 'vc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, size: wav.length, type: 'audio/wav', kind: 'audio', songs: song ? [song] : [], created: Date.now(), blob: new Blob([wav], { type: 'audio/wav' }), dur });
}
// Исходник в медиатеку как есть (байт в байт)
async function saveRaw() {
  const u8 = await engine().read(S.take.path);
  await addFile(t('fileName', stamp()) + ' · ' + t('rawSfx') + '.wav', u8, S.take.sec);
}
function markSaved() {
  const s = st();
  S.take.saved = true;
  if (!s.savedRaw.some((x) => x.path === S.take.path)) { s.savedRaw.push({ path: S.take.path, at: Date.now() }); ctx.store.save(); }
}
async function save() {
  let p;
  try { p = await processed(); } catch (e) {
    // обработка не удалась (не хватило памяти на длинной записи и т. п.) — запись не теряется: сохранить исходник
    ctx.logErr(e); render();
    if (await ctx.ui.confirm(t('procFail'), t('procFailText'), t('saveRaw'))) {
      try { await saveRaw(); markSaved(); ctx.ui.toast(t('saved')); } catch (e2) { ctx.logErr(e2); ctx.ui.toast(t('saveFail')); }
    }
    render(); return;
  }
  try {
    const wav = encodeWav(p.ch, S.take.sr, st().bits);
    await addFile(t('fileName', stamp()) + '.wav', wav, p.sec);
    if (st().keepRaw) await saveRaw();
    markSaved();
    ctx.ui.toast(t('saved'));
    ctx.log('сохранено в медиатеку: ' + p.sec.toFixed(1) + ' с, ' + st().bits + ' бит, режим ' + st().voice.mode);
  } catch (e) { ctx.logErr(e); ctx.ui.toast(t('saveFail')); }
  render();
}

/* ---------- экран ---------- */

// Окно уровня: дБ (пик и/или RMS), шкала с удержанием пика, лампочка перегруза, спектр
const M = { hold: -120, holdAt: 0, clipAt: 0, spec: null, rate: 48000 };
function meterHTML(live = false) {
  const m = st().meter, ticks = [-60, -40, -30, -20, -12, -6, -3, 0].filter((d) => d >= -m.range), s = st();
  return '<div class="vc-mon' + (live ? ' mini' : '') + '"><div class="vc-monh">' +
    '<span class="vc-dbs"><b class="num" id="vc-db">−∞</b><span class="vc-dbu">' + t(m.mode === 'rms' ? 'm.rmsU' : 'm.peakU') + '</span>' +
    (m.mode === 'both' ? '<span class="num l2" id="vc-db2"></span>' : '') + '</span>' +
    '<button class="vc-clip" id="vc-clip" data-x="clipreset" aria-label="' + esc(t('m.clipAria')) + '"><i></i>CLIP</button>' +
    // до записи: слушать вход и слышать себя в наушниках (с обработкой)
    (live ? '<button class="ic sm' + (s.live ? ' on' : '') + '" data-x="live" aria-pressed="' + !!s.live + '" aria-label="' + esc(t('live.on')) + '">' + I.wave + '</button>' +
      '<button class="ic sm' + (s.hear ? ' on' : '') + '" data-x="hear" aria-pressed="' + !!s.hear + '" aria-label="' + esc(t('live.hear')) + '"' + (s.live ? '' : ' disabled') + '>' + I.ear + '</button>' : '') +
    '<button class="ic sm" data-x="mset" aria-label="' + esc(t('m.set')) + '">' + GEAR + '</button></div>' +
    '<div class="vc-bar vcled" aria-hidden="true"><i id="vc-barr"></i><i id="vc-barp"></i><b id="vc-hold"></b></div>' +
    '<div class="vc-ticks num" aria-hidden="true">' + ticks.map((d) => '<span style="left:' + ((d + m.range) / m.range) * 100 + '%">' + (d ? d : '0') + '</span>').join('') + '</div>' +
    (m.spec && big() ? '<canvas id="vc-spec" class="vc-spec" aria-hidden="true"></canvas>' : '') +
    (live && s.live && L && L.fx && L.fx.live ? grHTML() : '') +
    (live && !s.live ? '<p class="l2 vc-off">' + t('live.off') + '</p>' : '') + '</div>';
}
const GEAR = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>';
const pctOf = (db) => Math.max(0, Math.min(100, ((db + st().meter.range) / st().meter.range) * 100));
const dbOf = (x) => (x > 1e-6 ? 20 * Math.log10(x) : -120);
function meterUpdate(e) {
  if (!host) return;
  const m = st().meter, now = performance.now(), q = (s) => host.querySelector(s);
  const pk = dbOf(e.peak), rm = dbOf(e.rms);
  if (pk >= m.clip) M.clipAt = now;
  if (pk > M.hold || (m.hold > 0 && now - M.holdAt > m.hold * 1000) || m.hold === 0) { M.hold = pk; M.holdAt = now; }
  const shown = m.mode === 'rms' ? rm : pk, fmtDb = (d) => (d <= -90 ? '−∞' : (d > -0.05 ? '0.0' : d.toFixed(1)).replace('-', '−'));
  const a = q('#vc-db'); if (a) { a.textContent = fmtDb(shown); a.classList.toggle('hot', pk >= m.clip); }
  const b = q('#vc-db2'); if (b) b.textContent = 'RMS ' + fmtDb(rm);
  // полоса из «огоньков»: заливка во всю ширину, видна до уровня (цвета зелёный → жёлтый → красный стоят на месте)
  const cut = (x) => 'inset(0 ' + (100 - x).toFixed(1) + '% 0 0)';
  const r = q('#vc-barr'); if (r) r.style.clipPath = cut(m.mode === 'peak' ? 0 : pctOf(rm));
  const p = q('#vc-barp'); if (p) p.style.clipPath = cut(m.mode === 'rms' ? 0 : pctOf(pk));
  const bar = q('.vc-bar'); if (bar) bar.classList.toggle('hot', pk > -6);
  const h = q('#vc-hold'); if (h) h.style.left = pctOf(M.hold) + '%';
  const c = q('#vc-clip'); if (c) c.classList.toggle('on', !!M.clipAt && (m.hold === -1 || now - M.clipAt < Math.max(1, m.hold || 1) * 1000));
  if (e.samples && m.spec) drawSpec(e.samples, e.rate || M.rate);
}
// Спектр: логарифмическая шкала 40 Гц…16 кГц, столбики или линия, сглаживание по времени
function drawSpec(x, rate) {
  const cv = host && host.querySelector('#vc-spec');
  if (!cv) return;
  const m = st().meter, dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const s = spectrumDb(x, 1024), NB = m.style === 'bars' ? 40 : 96, lo = Math.log10(40), hi = Math.log10(Math.min(16000, rate / 2));
  const bands = new Float32Array(NB);
  for (let b = 0; b < NB; b++) {
    const f0 = Math.pow(10, lo + ((hi - lo) * b) / NB), f1 = Math.pow(10, lo + ((hi - lo) * (b + 1)) / NB);
    let k0 = Math.floor((f0 * 1024) / rate), k1 = Math.max(k0 + 1, Math.ceil((f1 * 1024) / rate)), v = -120;
    for (let k = k0; k < k1 && k < s.length; k++) v = Math.max(v, s[k]);
    bands[b] = v;
  }
  const a = { fast: 0.7, mid: 0.4, slow: 0.18 }[m.smooth] || 0.4;
  if (!M.spec || M.spec.length !== NB) M.spec = bands; else for (let b = 0; b < NB; b++) M.spec[b] = bands[b] > M.spec[b] ? bands[b] : M.spec[b] + (bands[b] - M.spec[b]) * a;
  const g = cv.getContext('2d'), cs = getComputedStyle(host), tint = cs.getPropertyValue('--tint').trim() || '#9C7242', l3 = cs.getPropertyValue('--l3').trim() || '#ccc';
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const y = (d) => H - (Math.max(0, Math.min(1, (d + 90) / 90)) * (H - 2));
  // сетка: 100 Гц, 1 кГц, 10 кГц
  g.fillStyle = l3; [100, 1000, 10000].forEach((f) => { const xx = ((Math.log10(f) - lo) / (hi - lo)) * W; if (xx > 0 && xx < W) g.fillRect(xx, 0, 1, H); });
  if (m.style === 'bars') {
    const bw = W / NB;
    for (let b = 0; b < NB; b++) { const yy = y(M.spec[b]); g.fillStyle = M.spec[b] > -6 ? '#D2463F' : tint; g.fillRect(b * bw + 1, yy, Math.max(1, bw - 2), H - yy); }
  } else {
    g.beginPath(); for (let b = 0; b < NB; b++) { const xx = (b + 0.5) * (W / NB); b ? g.lineTo(xx, y(M.spec[b])) : g.moveTo(xx, y(M.spec[b])); }
    g.strokeStyle = tint; g.lineWidth = 1.8; g.stroke(); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.globalAlpha = 0.18; g.fillStyle = tint; g.fill(); g.globalAlpha = 1;
  }
}
// Настройки окна уровня
function meterSheet() {
  const { ui } = ctx, m = () => st().meter;
  const row = (k, opts, label) => '<div class="hdr">' + label + '</div><div class="group"><div class="cellcol">' + ui.seg('m-' + k, opts, String(m()[k]), label) + '</div></div>';
  ui.sheet(() => ui.snav(t('m.set')) +
    row('mode', [['both', t('m.both')], ['peak', t('m.peak')], ['rms', 'RMS']], t('m.mode')) +
    row('spec', [['true', t('m.on')], ['false', t('m.off')]], t('m.spec')) +
    row('style', [['bars', t('m.bars')], ['line', t('m.line')]], t('m.style')) +
    row('smooth', [['fast', t('m.fast')], ['mid', t('m.mid')], ['slow', t('m.slow')]], t('m.smooth')) +
    row('clip', [['-0.3', '−0,3'], ['-1', '−1'], ['-3', '−3'], ['-6', '−6']], t('m.clip')) +
    row('hold', [['0', t('m.off')], ['1', '1 ' + t('m.s')], ['2', '2 ' + t('m.s')], ['5', '5 ' + t('m.s')], ['-1', '∞']], t('m.hold')) +
    row('range', [['48', '48'], ['60', '60'], ['90', '90']], t('m.range')) +
    '<p class="ftr">' + t('m.hint') + '</p>',
  (el, sh) => el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-seg] [data-v]');
    if (!b) return;
    const k = b.closest('[data-seg]').dataset.seg.slice(2), v = b.dataset.v;
    st().meter[k] = k === 'style' || k === 'mode' || k === 'smooth' ? v : v === 'true' ? true : v === 'false' ? false : +v;
    ctx.store.save(); sh.update(); render();
  }));
}
/* ---------- режимы и настройка обработки ---------- */

const MODE_ORDER = ['raw', 'music', 'speech', 'vocal', 'radio', 'band'];
const levelTxt = (l) => (l === 'off' ? t('lvl.off') : l === 'peak' ? t('lvl.peak') : String(l).replace('-', '−') + ' LUFS');
function modesHTML() {
  const v = st().voice, ids = MODE_ORDER.filter((k) => MODE_IDS.includes(k)).concat(v.mode === 'own' ? ['own'] : []);
  return '<div class="vc-eqp" role="group" aria-label="' + esc(t('mode.title')) + '">' + ids.map((k) =>
    '<button type="button" data-vmode="' + k + '"' + (v.mode === k ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + t('mode.' + k) + '</button>').join('') + '</div>' +
    '<p class="ftr vc-modeh">' + t('modeh.' + v.mode) + '</p>';
}
function fxHTML(pre = false) {
  const f = st().fx, s = st(), rng = (k, min, max, step, val, label, txt) => '<label class="cellcol vc-fx"><span class="vc-fxh"><span>' + label + '</span><b class="num" id="vfx-' + k + '">' + txt + '</b></span>' +
    '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" data-fx="' + k + '" aria-label="' + esc(label) + '"></label>';
  return '<div class="hdr">' + t(pre ? 'live.title' : 'fx') + '</div>' + modesHTML() +
    '<div class="group"><button class="cell act" data-x="vset"><span class="vc-ico">' + I.tune + '</span><span class="grow">' + t('vs.title') + '</span><span class="val">' + levelTxt(s.voice.level) + '</span></button></div>' +
    '<div class="hdr">' + t('fx.more') + '</div>' + (pm ? pm.html() : '') +
    '<div class="hdr">' + t('fx.file') + '</div><div class="group">' +
    rng('gain', -12, 18, 1, f.gain, t('fx.gain'), fxTxt('gain', f.gain)) +
    '<div class="cellcol"><span class="vc-lbl">' + t('bits') + '</span>' + ctx.ui.seg('vbits', [['16', '16 ' + t('bit')], ['24', '24 ' + t('bit')], ['32', '32 float']], String(s.bits), t('bits')) + '</div>' +
    '<div class="cell"><span class="grow"><span>' + t('keepRaw') + '</span><span class="st l2">' + t('keepRawHint') + '</span></span>' + sw('keepRaw', s.keepRaw) + '</div></div>' +
    '<p class="ftr">' + t(pre ? 'live.hint' : 'fxHint') + '</p>';
}
function fxTxt(k, v) {
  if (k === 'gate') return v <= -90 ? t('off') : v + ' ' + t('db');
  if (k === 'gain') return (v > 0 ? '+' : '') + v + ' ' + t('db');
  return v > 0 ? Math.round(v * 100) + '%' : t('off');
}
// Подписи значений настройки
const num = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('-', '−').replace('.', ',');
const VS = {
  hp: (v) => (v > 0 ? num(v) + ' ' + t('hz') : t('off')),
  expThr: (v) => (v <= -90 ? t('off') : num(v) + ' ' + t('db')), expRatio: (v) => '1:' + num(v, 1), expRange: (v) => num(v) + ' ' + t('db'),
  dsAmt: (v) => (v > 0 ? Math.round(v * 100) + '%' : t('off')), dsFreq: (v) => num(v / 1000, 1) + ' ' + t('khz'),
  eqLow: (v) => (v > 0 ? '+' : '') + num(v, 1) + ' ' + t('db'), compRatio: (v) => (v <= 1 ? t('off') : num(v, 1) + ':1'), compThr: (v) => num(v) + ' ' + t('db'),
  compAtt: (v) => num(v, v < 10 ? 1 : 0) + ' ' + t('ms'), compRel: (v) => num(v) + ' ' + t('ms'), lim: (v) => num(v, 1) + ' ' + t('db'),
  denoise: (v) => (v > 0 ? Math.round(v * 100) + '%' : t('off')),
};
VS.eqMud = VS.eqPres = VS.eqAir = VS.eqLow;
// Шторка «Настройка обработки»: все ступени цепочки по порядку, правка звучит сразу (вход слушается)
function voiceSheet() {
  const { ui } = ctx, v = () => st().voice;
  const sl = (k, min, max, step, label) => '<label class="cellcol vc-fx"><span class="vc-fxh"><span>' + label + '</span><b class="num" id="vs-' + k + '">' + VS[k](v().p[k]) + '</b></span>' +
    '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v().p[k] + '" data-vp="' + k + '" aria-label="' + esc(label) + '"></label>';
  const grp = (title, hint, body) => '<div class="hdr">' + title + '</div><div class="group">' + body + '</div>' + (hint ? '<p class="ftr">' + hint + '</p>' : '');
  ui.sheet(() => ui.snav(t('vs.title')) + '<div class="vcs">' + modesHTML() +
    grp(t('vs.hp'), t('vsh.hp'), sl('hp', 0, 300, 5, t('vs.freq')) + '<div class="cellcol"><span class="vc-lbl">' + t('vs.slope') + '</span>' + ui.seg('vslope', [['12', '12 ' + t('dbo')], ['24', '24 ' + t('dbo')]], String(v().p.hpSlope), t('vs.slope')) + '</div>') +
    grp(t('vs.exp'), t('vsh.exp'), sl('expThr', -90, -20, 1, t('vs.thr')) + sl('expRatio', 1, 8, 0.1, t('vs.ratio')) + sl('expRange', 0, 60, 1, t('vs.range'))) +
    grp(t('vs.ds'), t('vsh.ds'), sl('dsAmt', 0, 1, 0.05, t('vs.amt')) + sl('dsFreq', 3000, 10000, 100, t('vs.freq'))) +
    grp(t('vs.tone'), t('vsh.tone'), sl('eqLow', -12, 12, 0.5, t('vs.low')) + sl('eqMud', -12, 12, 0.5, t('vs.mud')) + sl('eqPres', -12, 12, 0.5, t('vs.pres')) + sl('eqAir', -12, 12, 0.5, t('vs.air'))) +
    grp(t('vs.comp'), t('vsh.comp'), sl('compRatio', 1, 10, 0.1, t('vs.ratio')) + sl('compThr', -50, 0, 1, t('vs.thr')) + sl('compAtt', 0.5, 80, 0.5, t('vs.att')) + sl('compRel', 20, 800, 10, t('vs.rel'))) +
    grp(t('vs.lim'), t('vsh.lim'), '<div class="cell"><span class="grow">' + t('vs.limOn') + '</span><label class="sw"><input type="checkbox" data-vp="limOn"' + (v().p.limOn ? ' checked' : '') + '><i></i></label></div>' + sl('lim', -12, 0, 0.1, t('vs.ceil'))) +
    grp(t('vs.level'), t('vsh.level'), '<div class="cellcol">' + ui.seg('vlevel', LEVELS.map((l) => [String(l), l === 'off' ? t('lvl.off') : l === 'peak' ? t('lvl.peak') : String(l).replace('-', '−')]), String(v().level), t('vs.level')) + '</div>') +
    grp(t('vs.dn'), t('vsh.dn'), sl('denoise', 0, 1, 0.05, t('vs.amt'))) +
    (v().mode === 'own' && v().base ? '<div class="group"><button class="cell act" data-vreset="1">' + t('vs.reset', { m: t('mode.' + v().base) }) + '</button></div>' : '') + '</div>',
  (el, sh) => {
    const apply = (k, val, redraw) => {
      st().voice = editVoiceSet(st().voice, k, val); ctx.store.save(); liveFx(); S.proc = null;
      const b = el.querySelector('#vs-' + k); if (b && VS[k]) b.textContent = VS[k](st().voice.p[k]);
      if (redraw) { sh.update(); render(); } else syncModes(el);
    };
    el.addEventListener('input', (e) => { const k = e.target.dataset.vp; if (k && e.target.type === 'range') apply(k, +e.target.value, false); });
    el.addEventListener('change', (e) => { const k = e.target.dataset.vp; if (!k) return; apply(k, e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : +e.target.value, true); });
    el.addEventListener('click', (e) => {
      const m = e.target.closest('[data-vmode]');
      if (m) { setMode(m.dataset.vmode); sh.update(); return; }
      if (e.target.closest('[data-vreset]')) { setMode(st().voice.base); sh.update(); return; }
      const b = e.target.closest('[data-seg] [data-v]');
      if (!b) return;
      const k = b.closest('[data-seg]').dataset.seg;
      if (k === 'vslope') apply('hpSlope', +b.dataset.v, true);
      else if (k === 'vlevel') apply('level', b.dataset.v === 'off' || b.dataset.v === 'peak' ? b.dataset.v : +b.dataset.v, true);
    });
  });
}
// Ряд режимов в шторке и на экране — без перерисовки ползунков (их тянут)
function syncModes(el) {
  const v = st().voice;
  [el, host].forEach((root) => root && root.querySelectorAll('.vc-eqp').forEach((row) => { const tmp = document.createElement('div'); tmp.innerHTML = modesHTML(); row.replaceWith(tmp.firstChild); }));
  [el, host].forEach((root) => root && root.querySelectorAll('.vc-modeh').forEach((h) => { h.textContent = t('modeh.' + v.mode); }));
}
function setMode(id) {
  if (id === 'own') return;
  st().voice = normalizeVoiceSet({ mode: id }); ctx.store.save(); liveFx(); S.proc = null;
  render();
}
// Сокращение усиления ступенями (живой вход): экспандер, де-эссер, компрессор, лимитер
function grHTML() {
  return '<div class="vc-gr" id="vc-gr" aria-hidden="true">' + ['exp', 'ds', 'comp', 'lim'].map((k) =>
    '<span data-g="' + k + '"><em>' + t('gr.' + k) + '</em><i><b></b></i><s class="num">0</s></span>').join('') + '</div>';
}
function grUpdate(g) {
  const box = host && host.querySelector('#vc-gr');
  if (!box || !g) return;
  ['exp', 'ds', 'comp', 'lim'].forEach((k) => {
    const el = box.querySelector('[data-g="' + k + '"]'), v = Math.max(0, g[k] || 0);
    if (!el) return;
    el.querySelector('b').style.width = Math.min(100, (v / 12) * 100) + '%';
    el.querySelector('s').textContent = v >= 0.5 ? '−' + Math.round(v) : '0';
    el.classList.toggle('on', v >= 0.5);
  });
}

// Нижняя полоса — главная кнопка под большим пальцем: запись, стоп, пауза, прослушать, сохранить
const bottom = (inner) => '<div class="vc-bot">' + inner + '</div>';
function html() {
  const err = S.err ? '<p class="ftr" style="color:var(--red)">' + t({ denied: 'micDenied', space: 'noSpace', noaudio: 'noAudio' }[S.err] || 'micNone') + '</p>' : '';
  if (S.phase === 'rec') {
    if (!big()) return '<div class="vc-rec ' + size + '"><div class="vc-time num" id="vc-time">' + fmt(S.sec) + '</div><div class="vc-bar vcled mini" aria-hidden="true"><i id="vc-barr"></i><i id="vc-barp"></i><b id="vc-hold"></b></div>' +
      '<div class="vc-btns"><button class="vc-btn sec" data-x="pause" aria-label="' + t(S.paused ? 'resume' : 'pause') + '">' + (S.paused ? I.rec : I.pause) + '</button>' +
      '<button class="vc-btn main stop" data-x="stop" aria-label="' + t('stop') + '">' + I.stop + '</button></div></div>';
    return '<div class="vc-top">' + meterHTML() + '</div><div class="vc-mid vc-center"><div class="vc-time num" id="vc-time">' + fmt(S.sec) + '</div>' +
      '<p class="l2 vc-state">' + (S.paused ? t('paused') : esc(curIn() ? devName(curIn()) : t('auto'))) + '</p></div>' +
      bottom('<button class="vc-btn sec" data-x="pause" aria-label="' + t(S.paused ? 'resume' : 'pause') + '">' + (S.paused ? I.rec : I.pause) + '</button>' +
        '<button class="vc-btn main stop" data-x="stop" aria-label="' + t('stop') + '">' + I.stop + '</button><span class="vc-btn ghost"></span>');
  }
  if (S.phase === 'take' && S.take) {
    const [a, b] = selSec();
    if (!big()) return '<div class="vc-rec ' + size + '"><div class="vc-time num">' + fmt(b - a) + '</div><div class="vc-btns"><button class="vc-btn sec" data-x="play" aria-label="' + t(S.playing ? 'stop' : 'play') + '">' + (S.playing ? I.stop : I.play) + '</button><button class="vc-btn main" data-x="rec" aria-label="' + t('record') + '">' + I.rec + '</button></div></div>';
    return '<div class="vc-mid"><div class="vc-take"><canvas id="vc-wave" class="vc-wave" aria-label="' + esc(t('waveAria')) + '"></canvas>' +
      '<div class="vc-sel num"><span>' + fmt(a) + '</span><b>' + fmt(b - a) + '</b><span>' + fmt(b) + '</span></div>' +
      '<div class="vc-tools">' + ctx.ui.seg('vmode', [['orig', t('orig')], ['proc', t('proc')]], S.mode, t('listen')) + '</div>' +
      fxHTML() +
      '<div class="group"><button class="cell act danger" data-x="drop">' + t('drop') + '</button></div>' +
      '<div class="hdr">' + t('devices') + '</div>' + devHTML() + '</div></div>' +
      bottom('<button class="vc-btn sec" data-x="play" aria-label="' + t(S.playing ? 'stop' : 'play') + '">' + (S.busy ? '…' : S.playing ? I.stop : I.play) + '</button>' +
        '<button class="vc-btn main" data-x="rec" aria-label="' + t('newRec') + '">' + I.rec + '</button>' +
        '<button class="vc-btn sec' + (S.take.saved ? ' done' : '') + '" data-x="save"' + (S.busy ? ' disabled' : '') + ' aria-label="' + t(S.take.saved ? 'savedAgain' : 'save') + '">' + I.save + '</button>');
  }
  // ожидание
  if (!big()) return '<div class="vc-rec ' + size + '"><div class="vc-btns"><button class="vc-btn main" data-x="rec" aria-label="' + t('record') + '">' + I.rec + '</button></div>' + err + '</div>';
  // сверху — мини-окно (спектр и уровень), посередине — звук до записи и устройства, внизу — кнопка записи
  return '<div class="vc-top">' + meterHTML(true) + '</div>' +
    '<div class="vc-mid">' + err + keptHTML() + fxHTML(true) + '<div class="hdr">' + t('devices') + '</div>' + devHTML() + '<p class="ftr">' + t(engine().native ? 'devHint' : 'devHintWeb') + '</p></div>' +
    bottom('<span class="vc-btn ghost"></span><button class="vc-btn main" data-x="rec" aria-label="' + t('record') + '">' + I.rec + '</button><span class="vc-btn ghost"></span>');
}

function keptHTML() {
  if (!S.kept.length) return '';
  const d = (ms) => { const x = new Date(ms), p = (n) => String(n).padStart(2, '0'); return p(x.getDate()) + '.' + p(x.getMonth() + 1) + ' ' + p(x.getHours()) + ':' + p(x.getMinutes()); };
  return '<div class="hdr">' + t('kept.title') + '</div><div class="group">' + S.kept.slice(0, 8).map((f) =>
    '<div class="cell"><span class="grow"><span class="num">' + d(f.at) + ' · ' + (f.size / 1048576).toFixed(1) + ' ' + t('mb') + '</span>' + (f.saved ? '<span class="st l2">' + t('kept.saved') + '</span>' : f.cut ? '<span class="st l2">' + t('kept.cut') + '</span>' : '') + '</span>' +
    '<button class="link" data-kopen="' + esc(f.path) + '">' + t('kept.open') + '</button>' +
    '<button class="link danger" data-kdel="' + esc(f.path) + '" aria-label="' + esc(t('kept.del')) + '">' + t('kept.del') + '</button></div>').join('') +
    '</div><p class="ftr">' + t('kept.hint') + '</p>';
}

function render() {
  if (!host) return;
  host.innerHTML = '<div class="voice ' + size + (big() ? ' big' : '') + '">' + html() + '</div>';
  // вход до записи слушается только в ожидании и в большом окне (ошибка — до явного нажатия)
  if (S.phase === 'idle' && big() && st().live && !L && !S.err) liveStart();
  else if (L && (S.phase !== 'idle' || !big())) liveStop();
  drawWave();
  if (pmb) pmb.mount(); // полотно эквалайзера общей панели — на новом холсте
}

function drawWave() {
  const cv = host && host.querySelector('#vc-wave');
  if (!cv || !S.take) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const g = cv.getContext('2d'), cs = getComputedStyle(host), tint = cs.getPropertyValue('--tint').trim() || '#9C7242', l3 = cs.getPropertyValue('--l3').trim() || '#ccc';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const p = S.take.peaks, n = p.length, bw = W / n, [a, b] = S.sel;
  for (let i = 0; i < n; i++) {
    const x = i * bw, f = i / n, h = Math.max(1, p[i] * (H - 8));
    g.fillStyle = f >= a && f <= b ? tint : l3;
    g.fillRect(x, (H - h) / 2, Math.max(1, bw - 0.6), h);
  }
  // ручки обрезки
  g.fillStyle = tint;
  [a, b].forEach((f) => { const x = f * W; g.fillRect(x - 1.5, 0, 3, H); g.beginPath(); g.arc(x, H / 2, 7, 0, 2 * Math.PI); g.fill(); });
  // где играет
  if (S.playing) { const x = ((S.offset + S.pos) / S.take.sec) * W; g.fillStyle = cs.getPropertyValue('--ink').trim(); g.fillRect(x - 1, 0, 2, H); }
}

// Обновление без перерисовки: время и уровень при записи, позиция при воспроизведении
function onLevel(e) {
  if (e.rate) M.rate = e.rate;
  if (S.phase !== 'rec' || !host) return;
  meterUpdate(e);
  S.sec = e.sec; S.paused = !!e.paused;
  if (e.peak > 0.98) S.clip = performance.now();
  const q = (s) => host.querySelector(s), db = (x) => Math.max(0, Math.min(100, ((20 * Math.log10(Math.max(1e-5, x)) + 60) / 60) * 100));
  const tm = q('#vc-time'); if (tm) tm.textContent = fmt(e.sec);
}
function onPos(e) {
  if (!S.playing || !S.take) return;
  S.pos = S.mode === 'orig' ? e.sec - S.offset : e.sec;
  if (S.mode === 'orig' && e.sec >= selSec()[1]) { stopPlay().then(render); return; }
  drawWave();
}
function onEnd() { if (S.playing) { S.playing = false; render(); } }
// Вход пропал во время записи: Android переключился на встроенный микрофон — запись идёт дальше; иначе (или кончилось
// место) — бережно остановить, всё записанное остаётся
function onLost(e) {
  if (S.phase !== 'rec') return;
  ctx.log('запись: вход пропал (' + (e && e.reason) + (e && e.switched ? ', дальше со встроенного микрофона' : ', остановлено') + ')', 'w');
  if (e && e.switched) { ctx.ui.toast(t('lost.switch')); return; }
  ctx.ui.toast(t(e && e.reason === 'space' ? 'lost.space' : 'lost.stop'));
  stopRec();
}

/* ---------- модуль ---------- */

export default {
  ...meta,
  status: (c) => c.t(S.phase === 'rec' ? 'st.rec' : S.take && !S.take.saved ? 'st.take' : 'st.idle'),
  mount(el, c, sz = 'full') {
    host = el; ctx = c; size = sz;
    S.mode = c.store.get('vmode', S.mode);
    const E = engine();
    offs = [E.on('level', onLevel), E.on('pos', onPos), E.on('end', onEnd), E.on('devices', loadDevices), E.on('lost', onLost)];
    onClick = (e) => {
      // нажатие на окно уровня (не на его кнопки) — полное окно спектра и шумомера
      if (S.phase === 'idle' && e.target.closest('.vc-mon') && !e.target.closest('button, input, select, [data-x]')) { stopPlay(); ctx.openTool('spectrum'); return; }
      const sg = e.target.closest('[data-seg] [data-v]');
      if (sg) {
        const k = sg.closest('[data-seg]').dataset.seg;
        if (k === 'vmode') { stopPlay(); S.mode = sg.dataset.v; ctx.store.set('vmode', S.mode); render(); } // как слушать — помнится
        else if (k === 'vbits') { st().bits = +sg.dataset.v; ctx.store.save(); render(); }
        else if (k === 'vpick') { st().pick = sg.dataset.v; ctx.store.save(); S.proc = null; render(); }
        return;
      }
      const vm = e.target.closest('[data-vmode]');
      if (vm) { setMode(vm.dataset.vmode); return; }
      const ko = e.target.closest('[data-kopen]'), kd = e.target.closest('[data-kdel]');
      if (ko) { openKept(ko.dataset.kopen); return; }
      if (kd) { ctx.ui.confirm(t('kept.delTitle'), '', t('discardYes')).then((ok) => { if (!ok) return; engine().remove(kd.dataset.kdel); S.kept = S.kept.filter((f) => f.path !== kd.dataset.kdel); render(); }); return; }
      const x = e.target.closest('[data-x]');
      if (!x || S.busy) return;
      const a = x.dataset.x;
      if (a === 'rec') startRec();
      else if (a === 'stop') stopRec();
      else if (a === 'pause') { S.paused = !S.paused; engine().pause(S.paused); render(); }
      else if (a === 'play') play();
      else if (a === 'save') save();
      else if (a === 'live') { const s = st(); s.live = !s.live; ctx.store.save(); if (s.live) liveStart(); else liveStop().then(render); }
      else if (a === 'hear') { const s = st(); s.hear = !s.hear; ctx.store.save(); liveHear(); x.classList.toggle('on', s.hear); x.setAttribute('aria-pressed', String(s.hear)); }
      else if (a === 'mset') meterSheet();
      else if (a === 'vset') voiceSheet();
      else if (a === 'clipreset') { M.clipAt = 0; M.hold = -120; const c = host.querySelector('#vc-clip'); if (c) c.classList.remove('on'); }
      else if (a === 'drop') ctx.ui.confirm(t('discardTitle'), t('discardText'), t('discardYes')).then((ok) => ok && dropTake().then(render));
    };
    onChange = (e) => {
      const d = e.target.dataset, s = st();
      if (d.v === 'in' || d.v === 'out') { s[d.v] = e.target.value || null; ctx.store.save(); render(); if (S.phase === 'idle') { S.err = null; liveRestart(); } }
      else if (d.v === 'stereo' || d.v === 'raw' || d.v === 'keepRaw') { s[d.v] = e.target.checked; ctx.store.save(); if (d.v === 'stereo') render(); }
      else if (d.fx) {
        const v = e.target.type === 'checkbox' ? e.target.checked : +e.target.value;
        s.fx[d.fx] = v; ctx.store.save(); liveFx();
        const lb = host.querySelector('#vfx-' + d.fx); if (lb) lb.textContent = fxTxt(d.fx, v);
      }
    };
    // ручки обрезки: перетаскивание ближайшей
    onPtr = (e) => {
      const cv = e.target.closest('#vc-wave');
      if (!cv || !S.take) return;
      stopPlay();
      const r = cv.getBoundingClientRect(), f = (ev) => Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      const k = Math.abs(f(e) - S.sel[0]) < Math.abs(f(e) - S.sel[1]) ? 0 : 1;
      const move = (ev) => { const v = f(ev); S.sel[k] = k ? Math.max(v, S.sel[0] + 0.01) : Math.min(v, S.sel[1] - 0.01); drawWave(); const sel = host.querySelector('.vc-sel'); if (sel) { const [a, b] = selSec(); sel.innerHTML = '<span>' + fmt(a) + '</span><b>' + fmt(b - a) + '</b><span>' + fmt(b) + '</span>'; } };
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
      move(e);
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    };
    host.addEventListener('click', onClick);
    host.addEventListener('change', onChange);
    host.addEventListener('pointerdown', onPtr);
    // ползунки обработки: подпись и звук до записи — пока тянут
    onInput = (e) => {
      const d = e.target.dataset;
      if (d.fx && e.target.type === 'range') { st().fx[d.fx] = +e.target.value; liveFx(); const lb = host.querySelector('#vfx-' + d.fx); if (lb) lb.textContent = fxTxt(d.fx, +e.target.value); }
    };
    host.addEventListener('input', onInput);
    // общая панель эффектов: правка применяется к живому входу сразу и к записи при обработке; слушатели — на окне один раз
    pm = ctx.fxPanel({ get: () => st().chain, set: (fx) => { st().chain = normalizeFx(fx); ctx.store.save(); liveFx(); S.proc = null; return st().chain; } });
    pmb = pm.bind(host, { update: render });
    render();
    loadDevices();
    loadKept();
  },
  resize(sz) { size = sz; render(); },
  unmount() {
    offs.forEach((f) => f()); offs = [];
    if (host) { host.removeEventListener('click', onClick); host.removeEventListener('change', onChange); host.removeEventListener('pointerdown', onPtr); host.removeEventListener('input', onInput); }
    pm = null; pmb = null;
    liveStop();
    stopPlay();
    // запись не прерывается молча: остановить и оставить дубль до следующего открытия
    if (S.phase === 'rec') stopRec();
    host = null;
  },
};
