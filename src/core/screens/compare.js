// Сравнение дублей «неделю назад и сейчас» (слово автора 13.11.2026): у песни — «Сравнить» → две записи (по умолчанию
// самая ранняя и последняя) → касание А/Б переключает на той же позиции. Громкость выровнена (тихая запись не кажется
// хуже), рядом — дата, длительность и темп занятия того дня. Звук — шина медиатеки (те же узлы, что у плеера);
// два узла громкости создаются один раз на шторку, переключение — плавно параметром.
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, toast } from '../../ui/index.js';
import { fileSongs } from '../files.js';
import { fmtClock } from '../format.js';

const DAY = 86400000;
export const takesOf = (app, songId) => (app.files ? app.files.list('audio').filter((r) => fileSongs(r).includes(songId) && r.blob) : []).sort((a, b) => (a.created || 0) - (b.created || 0));

// Выравнивание: коэффициент, приводящий среднюю громкость (RMS) записи к общей цели; не больше ×4
export function levelGain(buf, target = 0.1) {
  let s = 0, n = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i += 16) { s += d[i] * d[i]; n++; } }
  const rms = Math.sqrt(s / Math.max(1, n));
  return rms > 1e-5 ? Math.min(4, target / rms) : 1;
}

export function compareSheet(app, songId) {
  const takes = takesOf(app, songId);
  if (takes.length < 2) { toast(t('cmp.need2')); return; }
  const mx = app.audio.mixer, out = mx.bus('media');
  if (!out) { toast(t('cmp.noSound')); return; }
  const c = out.context, bufs = new Map(), lvl = new Map();
  const g = { A: c.createGain(), B: c.createGain() };
  g.A.gain.value = 0; g.B.gain.value = 0; g.A.connect(out); g.B.connect(out);
  const S = { A: takes[0].id, B: takes[takes.length - 1].id, side: 'A', playing: false, pos: 0, t0: 0, src: [], loading: false };
  const take = (id) => takes.find((x) => x.id === id);
  const dur = () => Math.max(...['A', 'B'].map((k) => (bufs.get(S[k]) || { duration: 0 }).duration));
  const now = () => (S.playing ? S.pos + c.currentTime - S.t0 : S.pos);
  const bpmOn = (ts) => { const ss = app.store.sessions().filter((x) => x.songId === songId && x.bpm && Math.abs(x.start - ts) < DAY); return ss.length ? ss[ss.length - 1].bpm : null; };
  const loc = () => (app.store.state.settings.lang === 'uz' ? 'uz-Latn' : app.store.state.settings.lang || 'ru');
  const info = (r) => { const b = bufs.get(r.id), bpm = bpmOn(r.created || 0); return [new Date(r.created || 0).toLocaleDateString(loc(), { day: 'numeric', month: 'short' }), b ? fmtClock(Math.round(b.duration)) : '', bpm ? bpm + ' bpm' : ''].filter(Boolean).join(' · '); };
  const setGains = () => { const k = c.currentTime; ['A', 'B'].forEach((x) => g[x].gain.setTargetAtTime(S.side === x ? lvl.get(S[x]) || 1 : 0, k, 0.015)); };
  async function load() {
    S.loading = true;
    for (const k of ['A', 'B']) {
      const id = S[k];
      if (bufs.has(id)) continue;
      try { const b = await c.decodeAudioData(await take(id).blob.arrayBuffer()); bufs.set(id, b); lvl.set(id, levelGain(b)); } catch { bufs.set(id, null); toast(t('cmp.bad')); }
    }
    S.loading = false;
  }
  function stopSrc() { S.src.forEach((s) => { try { s.onended = null; s.stop(); s.disconnect(); } catch { /* уже */ } }); S.src = []; }
  async function play(from = now()) {
    await load();
    stopSrc();
    S.pos = Math.max(0, Math.min(from, dur() - 0.05)); S.t0 = c.currentTime + 0.03;
    ['A', 'B'].forEach((k) => {
      const b = bufs.get(S[k]);
      if (!b || S.pos >= b.duration) return;
      const s = c.createBufferSource(); s.buffer = b; s.connect(g[k]); s.start(S.t0, S.pos); S.src.push(s);
    });
    S.playing = true; setGains();
    if (S.src.length) S.src.forEach((s) => { s.onended = () => { if (S.playing && now() >= dur() - 0.1) { pause(); S.pos = 0; api.update(); } }; });
    api.update();
  }
  function pause() { if (!S.playing) return; S.pos = now(); S.playing = false; stopSrc(); api.update(); }
  const opts = (cur) => takes.map((r) => '<option value="' + esc(r.id) + '"' + (r.id === cur ? ' selected' : '') + '>' + esc(new Date(r.created || 0).toLocaleDateString(loc(), { day: 'numeric', month: 'short' }) + ' · ' + (r.name || '')) + '</option>').join('');
  let tm = 0;
  const api = sheet(() => snav(t('cmp.title')) +
    '<div class="cmpab">' + ['A', 'B'].map((k) => '<button class="cmpk' + (S.side === k ? ' on' : '') + '" data-ab="' + k + '" aria-pressed="' + (S.side === k) + '"><b>' + k + '</b><span>' + esc(info(take(S[k]))) + '</span></button>').join('') + '</div>' +
    '<div class="cmpctl"><button class="btn fill cmpplay" data-cp aria-label="' + esc(t(S.playing ? 'cmp.pause' : 'cmp.play')) + '">' + (S.playing ? '❚❚' : '▶') + '</button>' +
    '<input type="range" class="cmpseek" data-seek min="0" max="' + Math.max(1, dur()).toFixed(1) + '" step="0.1" value="' + now().toFixed(1) + '" aria-label="' + esc(t('cmp.pos')) + '"><span class="num cmpt">' + fmtClock(Math.round(now())) + '</span></div>' +
    '<div class="group">' + ['A', 'B'].map((k) => '<label class="cell"><span class="cmpl">' + k + '</span><select class="sortsel grow" data-pick="' + k + '" aria-label="' + esc(t('cmp.take') + ' ' + k) + '">' + opts(S[k]) + '</select></label>').join('') + '</div>' +
    '<p class="ftr">' + t('cmp.hint') + '</p>',
  (el) => {
    el.addEventListener('click', (e) => {
      const ab = e.target.closest('[data-ab]');
      if (ab) { S.side = ab.dataset.ab; setGains(); if (!S.playing) play(); else api.update(); return; }
      if (e.target.closest('[data-cp]')) { if (S.playing) pause(); else play(); }
    });
    el.addEventListener('change', (e) => {
      const p = e.target.closest('[data-pick]');
      if (p) { S[p.dataset.pick] = p.value; const was = S.playing; pause(); load().then(() => (was ? play(S.pos) : api.update())); return; }
      if (e.target.matches('[data-seek]')) { const v = +e.target.value; if (S.playing) play(v); else { S.pos = v; api.update(); } }
    });
    tm = setInterval(() => { if (!S.playing) return; const s = el.querySelector('[data-seek]'), x = el.querySelector('.cmpt'); if (s && document.activeElement !== s) s.value = now().toFixed(1); if (x) x.textContent = fmtClock(Math.round(now())); }, 250);
    load().then(() => api.update());
  }, { onClose: () => { clearInterval(tm); stopSrc(); S.playing = false; try { g.A.disconnect(); g.B.disconnect(); } catch { /* уже */ } } });
}
