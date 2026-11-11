// Конвертер (DECISIONS 2026-11-02, переделка 04.11): любые записи и видео из медиатеки и из памяти устройства → нужный
// формат. Рабочая поверхность — карточки файлов (длина, формат, размер; во время работы — ход в процентах; готово —
// «Поделиться»; смахнуть влево — убрать). Внизу — одна панель: плитки форматов, качество, обработка значками и большая
// кнопка «Конвертировать N → MP3». Обработка (разрез, громкость, темп и тон, каналы, частота, объединение, края) — по
// значку, своей короткой шторкой; она не запоминается между запусками: каждый раз — «как есть», пока не задано иначе
// (раньше заданный когда-то разрез тихо обрезал следующие файлы).
// Движок: есть FFmpeg (пакет на телефоне, встроен на компьютере) — «файл → файл» без раскрытия в память, длина не
// ограничена; нет — системные кодеки (src/audio/convert/convert.js). Исходники не меняются: результат — новые файлы в
// медиатеке (conv: { src, fmt }), «Поделиться» — сразу. Из медиатеки: ctx.openIn('convert', { inbox: { ids, fmt, share } }).
import './convert.css';
import meta from './meta.js';
import { FORMATS, canEncode } from '../../audio/convert/encode.js';
import { convert } from '../../audio/convert/convert.js';
import { ffAvailable, createFFmpeg } from '../../audio/convert/ffmpeg.js';

const MAIN = ['mp3', 'm4a', 'wav', 'flac', 'opus', 'aiff'];
const MORE = ['alac', 'vorbis', 'wma', 'ac3'];
const LABEL = { mp3: 'MP3', wav: 'WAV', flac: 'FLAC', m4a: 'M4A', opus: 'OPUS', aiff: 'AIFF', alac: 'ALAC', vorbis: 'OGG', wma: 'WMA', ac3: 'AC3' };
const I = {
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 7.5 12 3.5l4 4M6 11v8.5h12V11"/></svg>',
  wave: '<svg viewBox="0 0 24 24"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/></svg>',
  film: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M10 9.5v5l4-2.5z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  lib: '<svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>',
  ok: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  // обработка
  trim: '<svg viewBox="0 0 24 24"><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/><path d="M8.6 8 20 18M8.6 16 20 6"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>',
  speed: '<svg viewBox="0 0 24 24"><path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 16 4-5"/></svg>',
  chan: '<svg viewBox="0 0 24 24"><circle cx="8.5" cy="12" r="4.5"/><circle cx="15.5" cy="12" r="4.5"/></svg>',
  rate: '<svg viewBox="0 0 24 24"><path d="M3 12h2l2-6 3 12 3-9 2 5 2-2h4"/></svg>',
  join: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="7" height="8" rx="2"/><rect x="14" y="8" width="7" height="8" rx="2"/><path d="M10 12h4"/></svg>',
  fade: '<svg viewBox="0 0 24 24"><path d="M3 18 9 7h6l6 11"/></svg>',
};
const QDEF = { fmt: 'mp3', kbps: 256, bits: 24 }; // запоминается только формат и качество
const PDEF = () => ({ chan: 'keep', rate: 0, speed: 1, semi: 0, vol: { mode: 'keep', db: 0 }, trim: null, join: false, gap: 0, fadeMs: 0 });

let host = null, ctx = null, size = 'full', onClick = null, off = [];
// очередь: { key, id?, name, blob, size, dur?, video?, ext, state: 'wait'|'run'|'done'|'err', p, stage, out?: [...], err }
const S = { q: [], busy: false, abort: null, can: {}, ffOk: null, ff: null, offPacks: null, p: PDEF() };
const st = () => { const s = ctx.store.all(); s.opt = { ...QDEF, ...(s.opt || {}) }; return s; };
const q = () => st().opt;
const t = (k, v) => ctx.t(k, v), esc = (s) => ctx.ui.esc(s);
const big = () => size === 'full' || size === 'half';
const mb = (n) => (n >= 1073741824 ? (n / 1073741824).toFixed(1).replace('.', ',') + ' ' + t('gb') : (n / 1048576).toFixed(n < 10485760 ? 1 : 0).replace('.', ',') + ' ' + t('mb'));
const hms = (s) => { if (!s || !isFinite(s)) return ''; s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
// «1:30» → 90, «1:02:30» → 3750, «95.5» → 95,5; не разобрать — null
const parseTime = (x) => { const a = String(x).split(':').map((v) => +v); if (a.some((v) => !isFinite(v) || v < 0)) return null; return a.reduce((s, v) => s * 60 + v, 0); };
const extOf = (nm) => ((/\.([a-z0-9]{1,5})$/i.exec(nm || '') || [0, ''])[1]).toUpperCase();
const hasFF = () => !!S.ffOk;
const fileUrl = (rel) => (ctx.packs && ctx.packs.url ? ctx.packs.url(rel) : new URL(rel, document.baseURI).href);
const packable = () => !!(ctx.packs && ctx.packs.meta && ctx.packs.meta('ffmpeg'));
// без FFmpeg формат недоступен: только им пишется, или система его не пишет
const needsFF = (k) => !!(FORMATS[k].ffmpeg || S.can[k] === false);
async function checkFF() { S.ffOk = await ffAvailable(fileUrl); if (S.ffOk && !S.ff) S.ff = createFFmpeg(fileUrl); if (!S.ffOk && S.ff) { S.ff.terminate(); S.ff = null; if (S.ff2) { S.ff2.terminate(); S.ff2 = null; } } render(); }

/* ---------- очередь ---------- */

let keyN = 0;
// длительность — по метаданным (элемент audio/video), без чтения файла целиком
function probeDur(j) {
  if (j.dur) return;
  const el = document.createElement(j.video ? 'video' : 'audio'), url = URL.createObjectURL(j.blob);
  let done = false;
  const fin = (d) => { if (done) return; done = true; URL.revokeObjectURL(url); el.removeAttribute('src'); if (d && isFinite(d)) { j.dur = d; paintRow(j); } };
  el.preload = 'metadata';
  el.onloadedmetadata = () => fin(el.duration);
  el.onerror = () => fin(0);
  setTimeout(() => fin(0), 6000);
  el.src = url;
}
function addRecords(recs) {
  recs.forEach((r) => {
    if (!r || !r.blob || (r.id && S.q.some((x) => x.id === r.id))) return;
    const j = { key: ++keyN, id: r.id, name: r.name || 'audio', blob: r.blob, size: r.size || r.blob.size, dur: r.dur, video: /^video\//.test(r.type || r.blob.type || ''), state: 'wait', p: 0 };
    j.ext = extOf(j.name);
    S.q.push(j);
    probeDur(j);
  });
  render();
}
function pickFiles() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = true; inp.accept = 'audio/*,video/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.aif,.aiff,.wma,.ac3,.amr,.mp4,.mov,.mkv,.webm,.3gp,.caf,.ape,.wv,.mka';
  inp.onchange = () => { addRecords([...inp.files].map((f) => ({ name: f.name, blob: f, size: f.size, type: f.type }))); };
  inp.click();
}
function libSheet() {
  const { ui } = ctx, picked = new Set();
  const list = () => ctx.files.list('audio').filter((r) => r.blob && !S.q.some((x) => x.id === r.id)).sort((a, b) => (b.created || 0) - (a.created || 0));
  ui.sheet(() => {
    const L = list();
    return ui.snav(t('libTitle'), { right: '<button class="link b r" data-lpick' + (picked.size ? '' : ' disabled') + '>' + t('libPick', { n: picked.size }) + '</button>' }) +
      (L.length ? '<div class="group">' + L.map((r) => '<button class="cell act cvl' + (picked.has(r.id) ? ' on' : '') + '" data-lid="' + esc(r.id) + '" aria-pressed="' + picked.has(r.id) + '"><span class="cvlic' + (picked.has(r.id) ? ' on' : '') + '" aria-hidden="true">' + (picked.has(r.id) ? I.ok : /^video\//.test(r.type || '') ? I.film : I.wave) + '</span><span class="grow">' + esc(r.name) + '<span class="st l2">' + [hms(r.dur), extOf(r.name), mb(r.size || r.blob.size)].filter(Boolean).join(' · ') + '</span></span></button>').join('') + '</div>'
        : '<p class="ftr">' + t('libEmpty') + '</p>');
  }, (el, sh) => el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lid]');
    if (b) { const id = b.dataset.lid; if (picked.has(id)) picked.delete(id); else picked.add(id); sh.update(); return; }
    if (e.target.closest('[data-lpick]')) { addRecords([...picked].map((id) => ctx.files.get(id))); sh.close(); }
  }));
}

/* ---------- конвертация ---------- */

function errText(e) {
  const r = e && e.reason;
  if (r === 'decode') return t(hasFF() ? 'err.decodeFF' : 'err.decode', { type: String(e.type || '?').toUpperCase() });
  if (r === 'noaudio' || r === 'ffmpeg' || r === 'cancel' || r === 'ffmpeg-run') return t('err.' + r);
  return t('err.other', { msg: String((e && e.message) || e) });
}
async function run({ share = false } = {}) {
  if (S.busy) return;
  const o = { ...q(), ...S.p, vol: { ...S.p.vol } }, jobs = S.q.filter((x) => x.state !== 'done');
  if (!jobs.length) return;
  if (needsFF(o.fmt) && !hasFF()) { needFF(); return; }
  S.busy = true; S.abort = new AbortController(); S.run = jobs; render();
  const results = [], taken = new Set(ctx.files.list('audio').map((x) => x.name));
  const groups = o.join && jobs.length > 1 ? [jobs] : jobs.map((j) => [j]);
  // M4A и Opus — системными кодировщиками (на телефоне — аппаратные, в разы быстрее FFmpeg), если звук помещается
  // в память целиком (≈ до 17 мин стерео); длиннее — FFmpeg «файл → файл»
  const sysOk = (g) => (o.fmt === 'm4a' || o.fmt === 'opus') && S.can[o.fmt] !== false && g.every((j) => j.dur || /\.wav$/i.test(j.name)) &&
    g.reduce((a, j) => a + (j.dur ? j.dur * 48000 * 2 * 4 : j.size * 2), 0) < 400 * 1048576;
  // несколько файлов — по два сразу (у телефона много ядер, FFmpeg занимает одно); второй FFmpeg — свой
  // только небольшие (до 120 МБ): большие записи по два сразу делят память и чтение — каждая идёт медленнее, чем по
  // одной (отчёт автора 05.11: второй и четвёртый файл «еле тащились»)
  const small = groups.every((g) => g.reduce((a, j) => a + (j.size || 0), 0) <= 120 * 1048576);
  const lanes = hasFF() && small && groups.length > 1 && (navigator.hardwareConcurrency || 2) >= 4 ? 2 : 1;
  if (lanes > 1 && !S.ff2) S.ff2 = createFFmpeg(fileUrl);
  const one = async (g, ff) => {
    g.forEach((j) => { j.state = 'run'; j.p = 0; j.err = ''; j.stage = 'read'; });
    paint();
    const t0 = performance.now(), sys = !!ff && sysOk(g);
    try {
      const out = await convert(g.map((j) => ({ blob: j.blob, name: j.name })), o, {
        ffmpeg: ff, viaJs: sys || !ff, join: g.length > 1, signal: S.abort.signal,
        onStep: (s) => {
          const p = s.stage === 'encode' ? (ff && !sys ? s.p || 0 : 0.3 + 0.7 * (s.p || 0)) : s.stage === 'read' ? 0.02 : s.stage === 'scan' ? 0 : 0.2;
          g.forEach((j) => { j.stage = s.stage; j.p = Math.max(j.stage === s.stage ? j.p : 0, p); });
          paint();
        },
      });
      for (const r of out) {
        // имя занято (повторная конвертация) — «имя (2).mp3»
        for (let k = 2, b = r.name.replace(/(\.[^.]+)$/, ''), ext = r.name.slice(b.length); taken.has(r.name); k++) r.name = b + ' (' + k + ')' + ext;
        taken.add(r.name);
        const id = 'cv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        await ctx.files.add({ id, name: r.name, size: r.size, type: r.blob.type, kind: 'audio', created: Date.now(), blob: r.blob, dur: r.dur, conv: { src: g.map((j) => j.id).filter(Boolean), fmt: r.fmt } });
        const rec = { id, name: r.name, blob: r.blob, size: r.size, fmt: r.fmt };
        results.push(rec);
        g.forEach((j, k) => { if (k === 0) (j.out = j.out || []).push(rec); });
      }
      g.forEach((j, k) => { j.state = 'done'; j.p = 1; if (k > 0) { j.out = []; j.joined = true; } });
      const ms = performance.now() - t0, d = out.reduce((a, r) => a + (r.dur || 0), 0);
      // в журнал — скорость (× к длине записи): по отчётам видно, где медленно
      ctx.log('конвертер: ' + g.length + ' → ' + o.fmt.toUpperCase() + (ff && !sys ? ' (FFmpeg)' : ' (система)') + ', ' + Math.round(ms) + ' мс, ' + Math.round(d) + ' с звука, ×' + (d / Math.max(0.001, ms / 1000)).toFixed(1));
      if (ctx.diag && ctx.diag.time) ctx.diag.time('convert', ms);
    } catch (e) {
      const cancel = e && e.reason === 'cancel';
      g.forEach((j) => { j.state = cancel ? 'wait' : 'err'; j.err = errText(e); j.p = 0; });
      if (!cancel) ctx.log('конвертер: ошибка ' + (e && (e.reason || e.message)) + (e && e.log ? ' | ' + String(e.log).slice(-300) : ''), 'w');
      if (e && (e.reason === 'ffmpeg' || e.reason === 'decode') && !hasFF()) needFF(errText(e));
    }
    paint();
  };
  let next = 0;
  const lane = async (ff) => { while (next < groups.length && !S.abort.signal.aborted) { const g = groups[next++]; g.forEach((j) => (j.out = null)); await one(g, ff); } };
  await Promise.all(Array.from({ length: lanes }, (_, i) => lane(hasFF() ? (i ? S.ff2 : S.ff) : null)));
  S.busy = false; S.abort = null; S.run = null;
  render();
  if (results.length) {
    ctx.ui.toast(t('doneLib'));
    if (share) shareFiles(results);
  }
}
async function shareFiles(list) {
  for (const r of list) {
    try { await ctx.sendFile(new Uint8Array(await r.blob.arrayBuffer()), r.name, r.name, r.blob.type || 'application/octet-stream'); } catch (e) { if (ctx.logErr) ctx.logErr(e); ctx.ui.toast(ctx.t('shareFail')); }
  }
}
// Нужен FFmpeg: на телефоне — предложить скачать пакет; где пакета не бывает (веб) — сказать
function needFF(text) {
  if (packable()) { if (text) ctx.ui.toast(text); ctx.packs.ask('ffmpeg'); return; }
  ctx.ui.toast(text || t('noFF'));
}

/* ---------- обработка: значки и короткие шторки ---------- */

const PROC = ['trim', 'vol', 'speed', 'chan', 'rate', 'join', 'fade'];
const dash = (x) => String(x).replace('-', '−').replace('.', ',');
// значение обработки строкой (или '' — не задано)
function procVal(k) {
  const p = S.p;
  if (k === 'trim') return p.trim ? hms(p.trim[0]) + '–' + (p.trim[1] != null ? hms(p.trim[1]) : '∞') : '';
  if (k === 'vol') return p.vol.mode === 'keep' ? '' : p.vol.mode === 'gain' ? (p.vol.db > 0 ? '+' : '') + dash(p.vol.db) + ' ' + t('db') : p.vol.mode === 'peak' ? t('p.peak') : dash(p.vol.mode) + ' LUFS';
  if (k === 'speed') return [p.speed !== 1 ? '×' + dash(p.speed) : '', p.semi ? (p.semi > 0 ? '+' : '−') + Math.abs(p.semi) + ' ' + t('p.st') : ''].filter(Boolean).join(' ');
  if (k === 'chan') return p.chan === 'keep' ? '' : t('p.' + p.chan);
  if (k === 'rate') return p.rate ? dash(p.rate / 1000) + ' ' + t('hz') : '';
  if (k === 'join') return p.join && S.q.length > 1 ? t('p.on') + (p.gap ? ', ' + dash(p.gap) + ' ' + t('sec') : '') : '';
  if (k === 'fade') return p.fadeMs ? t('p.on') : '';
  return '';
}
function chipsHTML() {
  return '<div class="cvchips hscroll" role="group" aria-label="' + esc(t('proc')) + '">' + PROC.filter((k) => k !== 'join' || S.q.length > 1).map((k) => {
    const v = procVal(k);
    return '<button type="button" class="cvchip' + (v ? ' on' : '') + '" data-proc="' + k + '"' + (S.busy ? ' disabled' : '') + ' aria-label="' + esc(t('p.' + k) + (v ? ': ' + v : '')) + '">' + I[k] + '<span>' + esc(v || t('p.' + k)) + '</span></button>';
  }).join('') + (PROC.some((k) => procVal(k)) && !S.busy ? '<button type="button" class="cvchip cvreset" data-preset-reset aria-label="' + esc(t('p.reset')) + '">×</button>' : '') + '</div>';
}
function procSheet(k) {
  const { ui } = ctx;
  const num = (n, val, ph, step = '0.1') => '<input class="inp num" type="number" inputmode="decimal" min="0" step="' + step + '" data-n="' + n + '" value="' + (val == null || val === '' ? '' : val) + '" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '">';
  const range = (r, min, max, step, val, show) => '<label class="cellcol"><span class="cvh"><span class="l2">' + esc(t('p.' + r)) + '</span><b class="num" data-show="' + r + '">' + esc(show) + '</b></span><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" data-r="' + r + '" aria-label="' + esc(t('p.' + r)) + '"></label>';
  // выбор одного из списка — строки с пояснением и галочкой (полоса из шести вариантов на телефоне не читается)
  const pick = (key, opts, cur) => '<div class="group" role="radiogroup">' + opts.map(([v, a, b]) => '<button class="cell act cvpick" data-pick="' + key + '" data-v="' + v + '" role="radio" aria-checked="' + (String(cur) === v) + '"><span class="grow"><span>' + esc(a) + '</span>' + (b ? '<span class="st l2">' + esc(b) + '</span>' : '') + '</span>' + (String(cur) === v ? '<span class="cvchk">' + I.ok + '</span>' : '') + '</button>').join('') + '</div>';
  const body = () => {
    const p = S.p;
    // время — «1:30», «90» или «1:02:30»
    const tin = (n, val, ph) => '<input class="inp num" type="text" autocomplete="off" spellcheck="false" data-n="' + n + '" value="' + (val ? hms(val) : '') + '" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '">';
    if (k === 'trim') return '<div class="group"><div class="cell cvtrim"><label><span class="l2">' + t('p.from') + '</span>' + tin('t0', p.trim ? p.trim[0] : 0, '0:00') + '</label><label><span class="l2">' + t('p.to') + '</span>' + tin('t1', p.trim && p.trim[1] != null ? p.trim[1] : 0, t('p.end')) + '</label></div></div><p class="ftr">' + t('p.trimHint') + '</p>';
    if (k === 'vol') return pick('vol', [['keep', t('p.keep'), t('p.keepVol')], ['peak', t('p.peak'), t('p.peakSub')], ['-14', '−14 LUFS', t('p.l14')], ['-16', '−16 LUFS', t('p.l16')], ['-23', '−23 LUFS', t('p.l23')], ['gain', t('p.gain'), t('p.gainSub')]], String(p.vol.mode)) +
      (p.vol.mode === 'gain' ? '<div class="group">' + range('gain', -24, 24, 0.5, p.vol.db, (p.vol.db > 0 ? '+' : '') + dash(p.vol.db) + ' ' + t('db')) + '</div>' : '') + '<p class="ftr">' + t('p.volHint') + '</p>';
    if (k === 'speed') return '<div class="group">' + range('tempo', 0.5, 2, 0.05, p.speed, '×' + dash(p.speed)) + range('semi', -12, 12, 1, p.semi, (p.semi > 0 ? '+' : '') + dash(p.semi)) + '</div><p class="ftr">' + t('p.speedHint') + '</p>';
    if (k === 'chan') return pick('chan', [['keep', t('p.keep'), ''], ['mono', t('p.mono'), t('p.monoSub')], ['stereo', t('p.stereo'), t('p.stereoSub')], ['left', t('p.left'), t('p.leftSub')], ['right', t('p.right'), t('p.rightSub')]], p.chan);
    if (k === 'rate') return '<div class="group"><div class="cellcol">' + ui.seg('rate', [['0', t('p.keep')], ['44100', '44,1'], ['48000', '48'], ['96000', '96']], String(p.rate), t('p.rate')) + '</div></div><p class="ftr">' + t('p.rateHint') + '</p>';
    if (k === 'join') return '<div class="group"><div class="cell"><span class="grow"><span>' + t('p.joinOn') + '</span><span class="st l2">' + t('p.joinHint') + '</span></span>' + ui.sw('join', p.join, t('p.join')) + '</div>' + (p.join ? '<label class="cell"><span class="grow">' + t('p.gap') + '</span>' + num('gap', p.gap || '', '0') + '</label>' : '') + '</div>';
    if (k === 'fade') return '<div class="group"><div class="cell"><span class="grow"><span>' + t('p.fade') + '</span><span class="st l2">' + t('p.fadeHint') + '</span></span>' + ui.sw('fade', !!p.fadeMs, t('p.fade')) + '</div></div>';
    return '';
  };
  ui.sheet(() => ui.snav(t('p.' + k)) + '<div class="cvp">' + body() + '</div>', (el, sh) => {
    const upd = () => render();
    el.addEventListener('input', (e) => {
      const r = e.target.dataset.r, p = S.p;
      if (!r) return;
      const v = +e.target.value, show = el.querySelector('[data-show="' + r + '"]');
      if (r === 'tempo') { p.speed = v; show.textContent = '×' + dash(v); }
      else if (r === 'semi') { p.semi = v; show.textContent = (v > 0 ? '+' : '') + dash(v); }
      else if (r === 'gain') { p.vol.db = v; show.textContent = (v > 0 ? '+' : '') + dash(v) + ' ' + t('db'); }
      upd();
    });
    el.addEventListener('change', (e) => {
      const p = S.p, d = e.target.dataset;
      if (d.n) {
        const raw = String(e.target.value).trim().replace(',', '.');
        const v = raw === '' ? null : d.n === 'gap' ? Math.max(0, +raw || 0) : parseTime(raw);
        if (d.n === 'gap') p.gap = v || 0;
        else {
          const a = d.n === 't0' ? v : p.trim ? p.trim[0] : null, b = d.n === 't1' ? v : p.trim ? p.trim[1] : null;
          p.trim = !a && b == null ? null : [a || 0, b == null ? null : Math.max(b, (a || 0) + 0.1)];
        }
        upd(); return;
      }
      if (e.target.type === 'checkbox') { if (d.sw === 'join') p.join = e.target.checked; else if (d.sw === 'fade') p.fadeMs = e.target.checked ? 20 : 0; sh.update(); upd(); }
    });
    el.addEventListener('click', (e) => {
      const pk = e.target.closest('[data-pick]');
      const b = pk || e.target.closest('[data-seg] [data-v]');
      if (!b) return;
      const sg = pk ? pk.dataset.pick : b.closest('[data-seg]').dataset.seg, v = b.dataset.v, p = S.p;
      if (sg === 'chan') p.chan = v;
      else if (sg === 'rate') p.rate = +v;
      else if (sg === 'vol') p.vol.mode = v === 'keep' || v === 'gain' || v === 'peak' ? v : +v;
      sh.update(); upd();
    });
  });
}

/* ---------- экран ---------- */

function subHTML(j) {
  if (j.state === 'err') return '<span class="cverr">' + esc(j.err) + '</span>';
  if (j.state === 'done') {
    if (j.joined) return '<span class="cvok">' + esc(t('joined')) + '</span>';
    const r = (j.out || [])[0];
    return '<span class="cvok">' + I.ok + esc(r ? [LABEL[r.fmt] || '', mb(r.size)].join(' · ') : t('doneLib')) + '</span>';
  }
  if (j.state === 'run') return '<span class="cvrun num">' + esc(t('stage.' + (j.stage || 'read'))) + (j.stage === 'encode' || j.stage === 'scan' ? ' · ' + Math.round(j.p * 100) + ' %' : '') + '</span>';
  return '<span class="l2">' + [hms(j.dur), j.ext, mb(j.size)].filter(Boolean).join(' · ') + '</span>';
}
function rowHTML(j) {
  return '<div class="cvc ' + j.state + '" data-key="' + j.key + '" data-out="' + !!(j.out && j.out.length) + '">' +
    '<span class="cvic" aria-hidden="true">' + (j.video ? I.film : I.wave) + '</span>' +
    '<div class="cvn"><b>' + esc(j.name) + '</b>' + subHTML(j) + '</div>' +
    (j.state === 'done' && j.out && j.out.length ? '<button class="cvbtn" data-share="' + j.key + '" aria-label="' + esc(t('share')) + '">' + I.share + '</button>' : '') +
    (S.busy ? '' : '<button class="cvbtn cvx" data-rm="' + j.key + '" aria-label="' + esc(t('remove')) + '">×</button>') +
    (j.state === 'run' ? '<i class="cvbar" style="--p:' + j.p + '"></i>' : '') + '</div>';
}
function fmtHTML() {
  const o = q(), f = FORMATS[o.fmt], ff = hasFF();
  const list = MAIN.concat(MAIN.includes(o.fmt) ? [] : [o.fmt]);
  const tile = (k) => { const lock = needsFF(k) && !ff; return '<button type="button" class="cvt' + (o.fmt === k ? ' on' : '') + (lock ? ' lock' : '') + '" data-fmt="' + k + '" aria-pressed="' + (o.fmt === k) + '" aria-label="' + esc(LABEL[k] + ', ' + t('cap.' + k) + (lock ? ', ' + t('needFF') : '')) + '"><b>' + LABEL[k] + '</b><span>' + t('cap.' + k) + '</span></button>'; };
  const qs = f.lossless ? (f.bits || []).map((b) => ['b' + b, b === 32 ? '32 float' : b + ' ' + t('bit')]) : (f.kbps || []).map((k) => ['k' + k, String(k)]);
  const cur = f.lossless ? 'b' + (f.bits && f.bits.includes(o.bits) ? o.bits : (f.bits || [16])[0]) : 'k' + (f.kbps && f.kbps.includes(o.kbps) ? o.kbps : (f.kbps || [192]).at(-2) || 192);
  return '<div class="cvfmts hscroll" role="group" aria-label="' + esc(t('fmt')) + '">' + list.map(tile).join('') +
    '<button type="button" class="cvt more" data-x="more" aria-label="' + esc(t('more')) + '"><b>···</b><span>' + t('more') + '</span></button></div>' +
    (qs.length ? '<div class="cvq"><span class="l2">' + (f.lossless ? t('depth') : t('kbps')) + '</span>' + ctx.ui.seg('cvq', qs, cur, t('quality')) + '</div>' : '<div class="cvq"><span class="l2">' + t('lossless') + '</span></div>');
}
function moreSheet() {
  const { ui } = ctx;
  ui.sheet(() => ui.snav(t('more')) + '<div class="group">' + MORE.map((k) => '<button class="cell act" data-mf="' + k + '"><span class="grow"><b>' + LABEL[k] + '</b><span class="st l2">' + t('cap.' + k) + '</span></span>' + (needsFF(k) && !hasFF() ? '<span class="l2">' + t('needFF') + '</span>' : q().fmt === k ? '<span class="cvchk">' + I.ok + '</span>' : '') + '</button>').join('') + '</div>',
    (el, sh) => el.addEventListener('click', (e) => { const b = e.target.closest('[data-mf]'); if (!b) return; sh.close(); pickFmt(b.dataset.mf); }));
}
function pickFmt(k) {
  if (needsFF(k) && !hasFF()) { needFF(); return; }
  q().fmt = k; ctx.store.save(); render();
}
function goLabel() {
  const n = S.q.filter((j) => j.state !== 'done').length, o = q();
  // общий ход всех файлов этого запуска (а не одного текущего): «Остановить · 3 из 7 · 41 %»
  if (S.busy) {
    const js = S.run || [], tot = js.length, done = js.filter((j) => j.state === 'done' || j.state === 'err').length;
    const p = tot ? js.reduce((a, j) => a + (j.state === 'done' || j.state === 'err' ? 1 : j.state === 'run' ? j.p || 0 : 0), 0) / tot : 0;
    return t('cancel') + (tot > 1 ? ' · ' + t('ofN', { n: Math.min(tot, done + 1), total: tot }) : '') + (p ? ' · ' + Math.round(p * 100) + ' %' : '');
  }
  if (!n) return t('go') + ' → ' + LABEL[o.fmt];
  return (S.p.join && n > 1 ? t('goJoin', { n }) : ctx.tn('goN', n)) + ' → ' + LABEL[o.fmt];
}
function emptyHTML() {
  return '<div class="cvempty"><span class="cvhero" aria-hidden="true">' + meta.icon + '</span><b>' + t('emptyTitle') + '</b><p class="l2">' + t('empty') + '</p>' +
    '<div class="cvadd"><button class="cvbig" data-x="lib">' + I.lib + '<span>' + t('fromLib') + '</span></button><button class="cvbig" data-x="files">' + I.folder + '<span>' + t('fromFiles') + '</span></button></div>' +
    (S.ffOk === false && packable() ? '<button class="cvpack" data-x="pack">' + t('packHint') + '</button>' : '') + '</div>';
}
function html() {
  const n = S.q.length;
  if (!big()) {
    return '<div class="cvs ' + size + '"><span class="num l2">' + (n ? ctx.tn('st.n', n) : t('st.idle')) + '</span>' +
      '<button class="cvgo" data-x="' + (S.busy ? 'stop' : n ? 'go' : 'files') + '">' + esc(n || S.busy ? goLabel() : t('add')) + '</button></div>';
  }
  return '<div class="cvlist" data-noswipe-root>' + (n ? S.q.map(rowHTML).join('') +
    (S.busy ? '' : '<button class="cvaddrow" data-x="addmenu">' + I.plus + '<span>' + t('addMore') + '</span></button>') : emptyHTML()) + '</div>' +
    '<div class="cvpanel">' + fmtHTML() + chipsHTML() +
    '<div class="cvbot">' + '<button class="cvgo' + (S.busy ? ' stop' : '') + '" data-x="' + (S.busy ? 'stop' : 'go') + '"' + (n || S.busy ? '' : ' disabled') + '>' + esc(goLabel()) + '</button>' +
    (S.q.some((j) => j.state === 'done' && j.out && j.out.length) && !S.busy ? '<button class="cvround" data-x="shareall" aria-label="' + esc(t('shareAll')) + '">' + I.share + '</button>' : '') + '</div></div>';
}
// Перерисовка не сбрасывает прокрутку списка (раньше список прыгал наверх — «моргал» при прокрутке)
function render() {
  if (!host) return;
  const l = host.querySelector('.cvlist'), top = l ? l.scrollTop : 0;
  host.innerHTML = '<div class="cvm ' + size + '">' + html() + '</div>';
  const l2 = host.querySelector('.cvlist');
  if (l2 && top) l2.scrollTop = top;
}
// Строка во время работы: меняется только то, что изменилось. Ход — ширина полосы и подпись на месте; строка целиком
// заменяется, только когда сменилось её состояние (ждёт → идёт → готово). Раньше каждая строка заменялась на каждом шаге
// хода — весь список перерисовывался под пальцем, и прокрутка мигала
function paintRow(j) {
  if (!host) return;
  const row = host.querySelector('.cvc[data-key="' + j.key + '"]');
  if (!row) return;
  if (row.classList.contains(j.state) && row.dataset.out === String(!!(j.out && j.out.length))) {
    const bar = row.querySelector('.cvbar'), sub = row.querySelector('.cvn'), sh = subHTML(j);
    if (bar) bar.style.setProperty('--p', j.p);
    if (sub && sub.dataset.sub !== sh) { sub.dataset.sub = sh; const b = sub.querySelector(':scope > b'); sub.innerHTML = ''; if (b) sub.appendChild(b); sub.insertAdjacentHTML('beforeend', sh); }
    return;
  }
  const tmp = document.createElement('div'); tmp.innerHTML = rowHTML(j); row.replaceWith(tmp.firstChild);
}
// во время работы — перерисовать только строки и надпись кнопки (кнопки под пальцем не прыгают)
function paint() {
  if (!host) return;
  if (!big()) { render(); return; }
  S.q.forEach(paintRow);
  const go = host.querySelector('.cvgo');
  if (go) go.textContent = goLabel();
}
function addMenu() {
  const { ui } = ctx;
  ui.sheet(() => ui.snav(t('add')) + '<div class="group"><button class="cell act" data-a="lib">' + t('fromLib') + '</button><button class="cell act" data-a="files">' + t('fromFiles') + '</button>' +
    (S.q.length && !S.busy ? '<button class="cell act danger" data-a="clear">' + t('clear') + '</button>' : '') + '</div>', (el, sh) => el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]');
    if (!a) return;
    sh.close();
    if (a.dataset.a === 'lib') libSheet(); else if (a.dataset.a === 'files') pickFiles(); else { S.q = []; S.p = PDEF(); render(); }
  }));
}
function removeKey(key) { S.q = S.q.filter((j) => String(j.key) !== String(key)); if (S.q.length < 2) S.p.join = false; render(); }

// какие форматы система пишет сама (M4A и Opus — WebCodecs; без них — пакет FFmpeg)
async function probe() {
  for (const k of ['m4a', 'opus']) { try { S.can[k] = (await canEncode(k, { rate: k === 'opus' ? 48000 : 44100 })).ok; } catch { S.can[k] = false; } }
  render();
}
function takeInbox() {
  const s = st(), box = s.inbox;
  if (!box) return;
  delete s.inbox;
  if (box.fmt && FORMATS[box.fmt]) s.opt.fmt = box.fmt;
  ctx.store.save();
  addRecords((box.ids || []).map((id) => ctx.files.get(id)).filter(Boolean));
  if (box.share) run({ share: true });
}

// Смахнуть карточку влево — убрать из списка (кнопка «×» остаётся)
function swipeRows(el) {
  let s = null;
  const down = (e) => {
    const c = e.target.closest('.cvc');
    if (!c || S.busy || e.pointerType === 'mouse' || e.target.closest('button')) { s = null; return; }
    s = { c, x: e.clientX, y: e.clientY, id: e.pointerId, on: false };
  };
  const move = (e) => {
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.on && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5 && dx < 0) s.on = true;
    if (s.on) { s.c.style.transform = 'translateX(' + Math.min(0, dx) + 'px)'; s.c.style.opacity = String(Math.max(0.3, 1 + dx / 300)); }
  };
  const up = (e) => {
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x, c = s.c, was = s.on;
    s = null;
    if (was && dx < -90) { c.style.transition = 'transform .15s, opacity .15s'; c.style.transform = 'translateX(-110%)'; c.style.opacity = '0'; setTimeout(() => removeKey(c.dataset.key), 150); }
    else if (was) { c.style.transition = 'transform .2s'; c.style.transform = ''; c.style.opacity = ''; }
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
}

export default {
  ...meta,
  status: (c) => (S.busy ? c.t('st.busy') : S.q.length ? c.tn('st.n', S.q.length) : c.t('st.idle')),
  mount(el, c, sz) {
    host = el; ctx = c; size = sz;
    onClick = (e) => {
      const f = e.target.closest('[data-fmt]');
      if (f) { if (!S.busy) pickFmt(f.dataset.fmt); return; }
      const sg = e.target.closest('[data-seg="cvq"] [data-v]');
      if (sg) { const v = sg.dataset.v; if (v[0] === 'b') q().bits = +v.slice(1); else q().kbps = +v.slice(1); ctx.store.save(); render(); return; }
      const pr = e.target.closest('[data-proc]');
      if (pr) { procSheet(pr.dataset.proc); return; }
      if (e.target.closest('[data-preset-reset]')) { S.p = PDEF(); render(); return; }
      const rm = e.target.closest('[data-rm]');
      if (rm) { removeKey(rm.dataset.rm); return; }
      const sh = e.target.closest('[data-share]');
      if (sh) { const j = S.q.find((x) => String(x.key) === sh.dataset.share); if (j && j.out) shareFiles(j.out); return; }
      const x = e.target.closest('[data-x]');
      if (!x) return;
      const a = x.dataset.x;
      if (a === 'go') run();
      else if (a === 'stop') { if (S.abort) S.abort.abort(); }
      else if (a === 'lib') libSheet();
      else if (a === 'files') pickFiles();
      else if (a === 'addmenu') addMenu();
      else if (a === 'more') moreSheet();
      else if (a === 'pack') needFF();
      else if (a === 'shareall') shareFiles(S.q.flatMap((j) => j.out || []));
    };
    host.addEventListener('click', onClick);
    off = [swipeRows(host)];
    render();
    probe();
    checkFF();
    if (c.packs && c.packs.onChange && !S.offPacks) S.offPacks = c.packs.onChange(() => checkFF());
    takeInbox();
  },
  resize(sz) { size = sz; render(); },
  unmount() { if (host) host.removeEventListener('click', onClick); off.forEach((f) => f()); off = []; host = null; }, // работа идёт и дальше: результат — в медиатеку
};
