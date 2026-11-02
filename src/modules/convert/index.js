// Конвертер (DECISIONS 2026-11-02): любые записи и видео из медиатеки и из памяти устройства → нужный формат.
// Рабочая поверхность — список файлов; под ним формат и качество одной строкой; внизу — добавить · обработка ·
// конвертировать. Обработка (разрез, объединение, каналы, частота, скорость, высота, громкость, края) — шторкой.
// Исходники не меняются: результат — новые файлы в медиатеке (поле conv: { src }), «Поделиться» — сразу.
// Из медиатеки: ctx.openIn('convert', { inbox: { ids, fmt, share } }) — файлы в список, share — сразу конвертировать
// и отдать через «Поделиться» (меню файла «Поделиться как…»). Движок — src/audio/convert/convert.js.
import './convert.css';
import meta from './meta.js';
import { FORMATS, canEncode } from '../../audio/convert/encode.js';
import { convert } from '../../audio/convert/convert.js';
import { ffAvailable, createFFmpeg } from '../../audio/convert/ffmpeg.js';

const MAIN = ['mp3', 'wav', 'flac', 'm4a', 'opus', 'aiff']; // без пакета — эти
const FF = ['alac', 'vorbis', 'wma', 'ac3']; // только с пакетом FFmpeg (AMR он читает, но не пишет)
const LABEL = { mp3: 'MP3', wav: 'WAV', flac: 'FLAC', m4a: 'M4A', opus: 'OPUS', aiff: 'AIFF', alac: 'ALAC', vorbis: 'OGG', wma: 'WMA', ac3: 'AC3', amr: 'AMR' };
const SHARE = '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 7.5 12 3.5l4 4M6 11v8.5h12V11"/></svg>';
const OPT_DEF = { fmt: 'mp3', kbps: 256, bits: 24, rate: 0, chan: 'keep', speed: 1, semi: 0, vol: { mode: 'keep', db: 0 }, trim: null, join: false, gap: 0, fadeMs: 0 };

let host = null, ctx = null, size = 'full', onClick = null, onChange = null;
// очередь: { key, id?, name, blob, size, dur?, video?, state: 'wait'|'run'|'done'|'err', p, out?: [{ id, name, blob }], err }
const S = { q: [], busy: false, abort: null, can: {}, stage: '', ffOk: false, ff: null, offPacks: null };
const st = () => { const s = ctx.store.all(); s.opt = { ...OPT_DEF, ...(s.opt || {}), vol: { ...OPT_DEF.vol, ...((s.opt || {}).vol || {}) } }; return s; };
const opt = () => st().opt;
const t = (k, v) => ctx.t(k, v), esc = (s) => ctx.ui.esc(s);
const big = () => size === 'full' || size === 'half';
const mb = (n) => (n / 1048576).toFixed(n < 10485760 ? 1 : 0).replace('.', ',') + ' ' + t('mb');
const dur = (s) => { if (!s) return ''; const m = Math.floor(s / 60), x = Math.round(s - m * 60); return m + ':' + String(x).padStart(2, '0'); };
const hasFF = () => S.ffOk;
const fileUrl = (rel) => (ctx.packs && ctx.packs.url ? ctx.packs.url(rel) : new URL(rel, document.baseURI).href);
// есть ли ядро FFmpeg (пакет скачан или файлы в сборке)
async function checkFF() { S.ffOk = await ffAvailable(fileUrl); if (S.ffOk && !S.ff) S.ff = createFFmpeg(fileUrl); if (!S.ffOk && S.ff) { S.ff.terminate(); S.ff = null; } render(); }

/* ---------- очередь ---------- */

let keyN = 0;
function addRecords(recs) {
  recs.forEach((r) => {
    if (!r || !r.blob || S.q.some((x) => x.id && x.id === r.id)) return;
    S.q.push({ key: ++keyN, id: r.id, name: r.name || 'audio', blob: r.blob, size: r.size || r.blob.size, dur: r.dur, video: /^video\//.test(r.type || ''), state: 'wait', p: 0 });
  });
  render();
}
function pickFiles() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = true; inp.accept = 'audio/*,video/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.aif,.aiff,.wma,.ac3,.amr,.mp4,.mov,.mkv,.webm,.3gp,.caf';
  inp.onchange = () => { addRecords([...inp.files].map((f) => ({ name: f.name, blob: f, size: f.size, type: f.type }))); };
  inp.click();
}
function libSheet() {
  const { ui } = ctx, picked = new Set();
  const list = () => ctx.files.list('audio').filter((r) => r.blob && !(S.q.some((x) => x.id === r.id))).sort((a, b) => (b.created || 0) - (a.created || 0));
  ui.sheet(() => {
    const L = list();
    return ui.snav(t('libTitle'), { right: '<button class="link b r" data-lpick' + (picked.size ? '' : ' disabled') + '>' + t('libPick', { n: picked.size }) + '</button>' }) +
      (L.length ? '<div class="group">' + L.map((r) => '<button class="cell act cvl' + (picked.has(r.id) ? ' on' : '') + '" data-lid="' + esc(r.id) + '" aria-pressed="' + picked.has(r.id) + '"><span class="grow">' + esc(r.name) + '<span class="st l2">' + [dur(r.dur), mb(r.size || r.blob.size), /^video\//.test(r.type || '') ? t('video') : ''].filter(Boolean).join(' · ') + '</span></span>' + (picked.has(r.id) ? '<span class="cvchk" aria-hidden="true">✓</span>' : '') + '</button>').join('') + '</div>'
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
  if (r === 'decode') return t('err.decode', { type: String(e.type || '?').toUpperCase() });
  if (r === 'memory' || r === 'ffmpeg' || r === 'cancel' || r === 'ffmpeg-run') return t('err.' + r);
  return t('err.other', { msg: String((e && e.message) || e) });
}
async function run({ share = false } = {}) {
  if (S.busy) return;
  const o = { ...opt() }, jobs = S.q.filter((x) => x.state !== 'done');
  if (!jobs.length) return;
  if (FORMATS[o.fmt].ffmpeg && !hasFF()) { needFF(); return; }
  S.busy = true; S.abort = new AbortController(); render();
  const ff = hasFF() ? S.ff : null, results = [];
  const groups = o.join && jobs.length > 1 ? [jobs] : jobs.map((j) => [j]);
  for (const g of groups) {
    if (S.abort.signal.aborted) break;
    g.forEach((j) => { j.state = 'run'; j.p = 0; j.err = ''; });
    paint();
    const t0 = performance.now();
    try {
      const out = await convert(g.map((j) => ({ blob: j.blob, name: j.name })), o, {
        ffmpeg: ff, join: g.length > 1, signal: S.abort.signal,
        onStep: (s) => { S.stage = s.stage; const j = g[Math.min(s.i, g.length - 1)]; j.p = s.stage === 'encode' ? 0.3 + 0.7 * (s.p || 0) : s.stage === 'read' ? 0.05 : 0.2; paint(); },
      });
      const taken = new Set(ctx.files.list('audio').map((x) => x.name));
      for (const r of out) {
        // имя занято (MP3 → MP3, повторная конвертация) — «имя (2).mp3»
        for (let k = 2, b = r.name.replace(/(\.[^.]+)$/, ''), ext = r.name.slice(b.length); taken.has(r.name); k++) r.name = b + ' (' + k + ')' + ext;
        taken.add(r.name);
        const id = 'cv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        await ctx.files.add({ id, name: r.name, size: r.size, type: r.blob.type, kind: 'audio', created: Date.now(), blob: r.blob, dur: r.dur, conv: { src: g.map((j) => j.id).filter(Boolean), fmt: r.fmt } });
        results.push({ id, name: r.name, blob: r.blob });
      }
      g.forEach((j, k) => { j.state = 'done'; j.p = 1; j.out = k === 0 ? out.map((r, i) => results[results.length - out.length + i]) : []; });
      ctx.log('конвертер: ' + g.length + ' → ' + o.fmt.toUpperCase() + ', ' + Math.round(performance.now() - t0) + ' мс');
      if (ctx.diag) ctx.diag.time && ctx.diag.time('convert', performance.now() - t0);
    } catch (e) {
      g.forEach((j) => { j.state = e && e.reason === 'cancel' ? 'wait' : 'err'; j.err = errText(e); j.p = 0; });
      if (!(e && e.reason === 'cancel')) ctx.log('конвертер: ошибка ' + (e && (e.reason || e.message)), 'w');
      if (e && (e.reason === 'ffmpeg' || e.reason === 'decode' || e.reason === 'memory') && !hasFF()) needFF(errText(e));
    }
    paint();
  }
  S.busy = false; S.abort = null; S.stage = '';
  render();
  if (results.length) {
    ctx.ui.toast(t('doneLib'));
    if (share) shareFiles(results);
  }
}
async function shareFiles(list) {
  for (const r of list) {
    try { await ctx.sendFile(new Uint8Array(await r.blob.arrayBuffer()), r.name, r.name, r.blob.type); } catch (e) { ctx.logErr && ctx.logErr(e); }
  }
}
// Нужен FFmpeg: на телефоне — предложить скачать пакет; там, где пакета не бывает (веб), — сказать
function needFF(text) {
  if (ctx.packs && ctx.packs.meta && ctx.packs.meta('ffmpeg')) { if (text) ctx.ui.toast(text); ctx.packs.ask('ffmpeg'); return; }
  ctx.ui.toast(text || t('noFF'));
}

/* ---------- обработка ---------- */

function procSummary() {
  const o = opt(), parts = [];
  if (o.trim) parts.push(t('p.trim'));
  if (o.join && S.q.length > 1) parts.push(t('p.join'));
  if (o.chan !== 'keep') parts.push(t('p.' + o.chan));
  if (o.rate) parts.push((o.rate / 1000).toString().replace('.', ',') + ' ' + t('hz'));
  if (o.speed !== 1) parts.push('×' + String(o.speed).replace('.', ','));
  if (o.semi) parts.push((o.semi > 0 ? '+' : '') + o.semi + ' ♮');
  if (o.vol.mode !== 'keep') parts.push(o.vol.mode === 'gain' ? (o.vol.db > 0 ? '+' : '') + o.vol.db + ' дБ' : o.vol.mode === 'peak' ? t('p.peak') : String(o.vol.mode).replace('-', '−') + ' LUFS');
  if (o.fadeMs) parts.push(t('p.fade'));
  return parts;
}
function procSheet() {
  const { ui } = ctx;
  ui.sheet(() => {
    const o = opt(), n = S.q.length;
    const num = (k, val, ph, step = '0.1') => '<input class="inp num" type="number" inputmode="decimal" min="0" step="' + step + '" data-n="' + k + '" value="' + (val == null || val === '' ? '' : val) + '" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '">';
    return ui.snav(t('proc')) + '<div class="cvp">' +
      '<div class="hdr">' + t('p.trim') + '</div><div class="group"><div class="cell cvtrim"><label><span class="l2">' + t('p.from') + '</span>' + num('t0', o.trim ? o.trim[0] : '', '0') + '</label><label><span class="l2">' + t('p.to') + '</span>' + num('t1', o.trim && o.trim[1] !== Infinity ? o.trim[1] : '', '∞') + '</label></div></div><p class="ftr">' + t('p.trimHint') + '</p>' +
      (n > 1 ? '<div class="group"><div class="cell"><span class="grow"><span>' + t('p.join') + '</span><span class="st l2">' + t('p.joinHint') + '</span></span>' + ui.sw('join', o.join, t('p.join')) + '</div>' + (o.join ? '<label class="cell"><span class="grow">' + t('p.gap') + '</span>' + num('gap', o.gap || '', '0') + '</label>' : '') + '</div>' : '') +
      '<div class="hdr">' + t('p.chan') + '</div><div class="group"><div class="cellcol">' + ui.seg('chan', [['keep', t('p.keep')], ['mono', t('p.mono')], ['stereo', t('p.stereo')], ['left', t('p.left')], ['right', t('p.right')]], o.chan, t('p.chan')) + '</div></div>' +
      '<div class="hdr">' + t('p.rate') + '</div><div class="group"><div class="cellcol">' + ui.seg('rate', [['0', t('p.keep')], ['44100', '44,1'], ['48000', '48'], ['96000', '96']], String(o.rate), t('p.rate')) + '</div></div>' +
      '<div class="hdr">' + t('p.speed') + '</div><div class="group"><label class="cellcol"><span class="cvh"><span>×</span><b class="num" id="cv-speed">' + String(o.speed).replace('.', ',') + '</b></span><input type="range" min="0.5" max="2" step="0.05" value="' + o.speed + '" data-r="speed" aria-label="' + esc(t('p.speed')) + '"></label></div>' +
      '<div class="hdr">' + t('p.semi') + '</div><div class="group"><label class="cellcol"><span class="cvh"><span></span><b class="num" id="cv-semi">' + (o.semi > 0 ? '+' : '') + o.semi + '</b></span><input type="range" min="-12" max="12" step="1" value="' + o.semi + '" data-r="semi" aria-label="' + esc(t('p.semi')) + '"></label></div>' +
      '<div class="hdr">' + t('p.vol') + '</div><div class="group"><div class="cellcol">' + ui.seg('vol', [['keep', t('p.keep')], ['gain', '±' + ' дБ'], ['peak', t('p.peak')], ['-14', '−14 LUFS'], ['-16', '−16'], ['-23', '−23']], String(o.vol.mode), t('p.vol')) + '</div>' +
      (o.vol.mode === 'gain' ? '<label class="cellcol"><span class="cvh"><span>' + t('p.gain') + '</span><b class="num" id="cv-db">' + (o.vol.db > 0 ? '+' : '') + o.vol.db + '</b></span><input type="range" min="-24" max="24" step="0.5" value="' + o.vol.db + '" data-r="db" aria-label="' + esc(t('p.gain')) + '"></label>' : '') + '</div>' +
      '<div class="group"><div class="cell"><span class="grow"><span>' + t('p.fade') + '</span><span class="st l2">' + t('p.fadeHint') + '</span></span>' + ui.sw('fade', !!o.fadeMs, t('p.fade')) + '</div></div>' +
      '<div class="group"><button class="cell act" data-preset-reset>' + t('p.reset') + '</button></div></div>';
  }, (el, sh) => {
    const save = (redraw) => { ctx.store.save(); if (redraw) sh.update(); render(); };
    el.addEventListener('input', (e) => {
      const r = e.target.dataset.r, o = opt();
      if (!r) return;
      const v = +e.target.value;
      if (r === 'speed') { o.speed = v; el.querySelector('#cv-speed').textContent = String(v).replace('.', ','); }
      else if (r === 'semi') { o.semi = v; el.querySelector('#cv-semi').textContent = (v > 0 ? '+' : '') + v; }
      else if (r === 'db') { o.vol.db = v; el.querySelector('#cv-db').textContent = (v > 0 ? '+' : '') + v; }
      ctx.store.save();
    });
    el.addEventListener('change', (e) => {
      const o = opt(), d = e.target.dataset;
      if (d.n) {
        const v = e.target.value === '' ? null : Math.max(0, +e.target.value);
        if (d.n === 'gap') o.gap = v || 0;
        else {
          const a = d.n === 't0' ? v : o.trim ? o.trim[0] : null, b = d.n === 't1' ? v : o.trim && o.trim[1] !== Infinity ? o.trim[1] : null;
          o.trim = a == null && b == null ? null : [a || 0, b == null ? Infinity : Math.max(b, (a || 0) + 0.1)];
        }
        save(false); return;
      }
      if (e.target.matches('input[type=range]')) { render(); return; }
      if (e.target.type === 'checkbox') { if (e.target.dataset.sw === 'join') o.join = e.target.checked; else if (e.target.dataset.sw === 'fade') o.fadeMs = e.target.checked ? 20 : 0; save(true); }
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-preset-reset]')) { const o = opt(); Object.assign(o, { chan: 'keep', rate: 0, speed: 1, semi: 0, vol: { mode: 'keep', db: 0 }, trim: null, join: false, gap: 0, fadeMs: 0 }); save(true); return; }
      const b = e.target.closest('[data-seg] [data-v]');
      if (!b) return;
      const k = b.closest('[data-seg]').dataset.seg, v = b.dataset.v, o = opt();
      if (k === 'chan') o.chan = v;
      else if (k === 'rate') o.rate = +v;
      else if (k === 'vol') o.vol.mode = v === 'keep' || v === 'gain' || v === 'peak' ? v : +v;
      save(true);
    });
  });
}

/* ---------- экран ---------- */

function rowHTML(j) {
  const sub = j.state === 'err' ? '<span class="cverr">' + esc(j.err) + '</span>'
    : j.state === 'done' ? '<span class="cvok">✓ ' + esc((j.out || []).map((r) => r.name).join(', ') || t('doneLib')) + '</span>'
      : '<span class="l2">' + [dur(j.dur), mb(j.size), j.video ? t('video') : ''].filter(Boolean).join(' · ') + '</span>';
  return '<div class="cvrow ' + j.state + '" data-key="' + j.key + '">' +
    '<div class="cvn"><b>' + esc(j.name) + '</b>' + sub + (j.state === 'run' ? '<i class="cvbar"><b style="width:' + Math.round(j.p * 100) + '%"></b></i>' : '') + '</div>' +
    (j.state === 'done' && j.out && j.out.length ? '<button class="ic sm" data-share="' + j.key + '" aria-label="' + esc(t('share')) + '">' + SHARE + '</button>' : '') +
    (S.busy ? '' : '<button class="ic sm cvx" data-rm="' + j.key + '" aria-label="' + esc(t('remove')) + '">×</button>') + '</div>';
}
function fmtHTML() {
  const o = opt(), f = FORMATS[o.fmt], ff = hasFF();
  const chip = (k) => { const off = (FORMATS[k].ffmpeg || S.can[k] === false) && !ff; return '<button type="button" class="cvf' + (o.fmt === k ? ' on' : '') + (off ? ' ff' : '') + '" data-fmt="' + k + '" aria-pressed="' + (o.fmt === k) + '"' + (off ? ' aria-label="' + esc(LABEL[k] + ', ' + t('needFF')) + '"' : '') + '>' + LABEL[k] + '</button>'; };
  const q = f.lossless ? (f.bits || []).map((b) => ['b' + b, b === 32 ? '32 float' : b + ' ' + t('bit')]) : (f.kbps || []).map((k) => ['k' + k, String(k)]);
  const cur = f.lossless ? 'b' + (f.bits && f.bits.includes(o.bits) ? o.bits : (f.bits || [16])[0]) : 'k' + (f.kbps && f.kbps.includes(o.kbps) ? o.kbps : (f.kbps || [192]).at(-2) || 192);
  return '<div class="cvfmts" role="group" aria-label="' + esc(t('fmt')) + '">' + MAIN.map(chip).join('') + FF.map(chip).join('') + '</div>' +
    (q.length ? '<div class="cvq"><span class="l2">' + (f.lossless ? t('lossless') : t('kbps')) + '</span>' + ctx.ui.seg('cvq', q, cur, t('quality')) + '</div>' : '');
}
function html() {
  const n = S.q.length, proc = procSummary();
  if (!big()) {
    return '<div class="cvs ' + size + '"><b class="num">' + (n ? ctx.tn('st.n', n) : t('st.idle')) + '</b>' +
      '<button class="cvgo" data-x="' + (S.busy ? 'stop' : 'go') + '"' + (n || S.busy ? '' : ' disabled') + '>' + t(S.busy ? 'cancel' : 'go') + ' · ' + LABEL[opt().fmt] + '</button></div>';
  }
  return '<div class="cvlist">' + (n ? S.q.map(rowHTML).join('') :
    '<div class="cvempty"><p class="l2">' + t('empty') + '</p><div class="cvadd"><button class="cvbig" data-x="lib">' + t('fromLib') + '</button><button class="cvbig" data-x="files">' + t('fromFiles') + '</button></div></div>') + '</div>' +
    '<div class="cvopts">' + fmtHTML() + (proc.length ? '<button class="cvproc l2" data-x="proc">' + esc(t('procOn', { list: proc.join(', ') })) + '</button>' : '') + '</div>' +
    '<div class="cvbot">' +
    '<button class="vc-like" data-x="addmenu" aria-label="' + esc(t('add')) + '"' + (S.busy ? ' disabled' : '') + '><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>' +
    '<button class="vc-like" data-x="proc" aria-label="' + esc(t('proc')) + '"' + (S.busy ? ' disabled' : '') + '><svg viewBox="0 0 24 24"><path d="M5 4v6M5 14v6M12 4v2M12 10v10M19 4v10M19 18v2"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="19" cy="16" r="2"/></svg></button>' +
    '<button class="cvgo" data-x="' + (S.busy ? 'stop' : 'go') + '"' + (n || S.busy ? '' : ' disabled') + '>' + (S.busy ? t('cancel') : t('go') + ' → ' + LABEL[opt().fmt]) + '</button>' +
    (S.q.some((j) => j.state === 'done') && !S.busy ? '<button class="vc-like" data-x="shareall" aria-label="' + esc(t('shareAll')) + '">' + SHARE + '</button>' : '') + '</div>';
}
function render() { if (host) host.innerHTML = '<div class="cvm ' + size + '">' + html() + '</div>'; }
// во время работы — перерисовать только строки (кнопки под пальцем не прыгают)
function paint() {
  if (!host) return;
  S.q.forEach((j) => { const row = host.querySelector('.cvrow[data-key="' + j.key + '"]'); if (row) { const tmp = document.createElement('div'); tmp.innerHTML = rowHTML(j); row.replaceWith(tmp.firstChild); } });
  if (!big()) render();
}
function addMenu() {
  const { ui } = ctx;
  ui.sheet(() => ui.snav(t('add')) + '<div class="group"><button class="cell act" data-a="lib">' + t('fromLib') + '</button><button class="cell act" data-a="files">' + t('fromFiles') + '</button>' +
    (S.q.length && !S.busy ? '<button class="cell act danger" data-a="clear">' + t('clear') + '</button>' : '') + '</div>', (el, sh) => el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]');
    if (!a) return;
    sh.close();
    if (a.dataset.a === 'lib') libSheet(); else if (a.dataset.a === 'files') pickFiles(); else { S.q = []; render(); }
  }));
}

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

export default {
  ...meta,
  status: (c) => (S.busy ? c.t('st.busy') : S.q.length ? c.tn('st.n', S.q.length) : c.t('st.idle')),
  mount(el, c, sz) {
    host = el; ctx = c; size = sz;
    onClick = (e) => {
      const f = e.target.closest('[data-fmt]');
      if (f && !S.busy) {
        const k = f.dataset.fmt;
        if ((FORMATS[k].ffmpeg || S.can[k] === false) && !hasFF()) { needFF(); return; }
        opt().fmt = k; ctx.store.save(); render(); return;
      }
      const sg = e.target.closest('[data-seg="cvq"] [data-v]');
      if (sg) { const v = sg.dataset.v; if (v[0] === 'b') opt().bits = +v.slice(1); else opt().kbps = +v.slice(1); ctx.store.save(); render(); return; }
      const rm = e.target.closest('[data-rm]');
      if (rm) { S.q = S.q.filter((j) => String(j.key) !== rm.dataset.rm); render(); return; }
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
      else if (a === 'proc') procSheet();
      else if (a === 'shareall') shareFiles(S.q.flatMap((j) => j.out || []));
    };
    host.addEventListener('click', onClick);
    render();
    probe();
    checkFF();
    if (c.packs && c.packs.onChange && !S.offPacks) S.offPacks = c.packs.onChange(() => checkFF());
    takeInbox();
  },
  resize(sz) { size = sz; render(); },
  unmount() { if (host) host.removeEventListener('click', onClick); host = null; }, // работа идёт и дальше: результат — в медиатеку
};
