// Запись студии (вынесено из index.js 28.10.2026): запись в дорожку (вход или звук приложения), сведение песни и
// стемы, замер задержки. Захват — capture.js по часам контекста, файл — WAV в медиатеку (исходник как есть, третий
// принцип), клип — с доли старта, первые lat секунд файла — пропуск (поправка задержки).
// Петля включена — запись по кругу: такт предпрокрутки до петли, запись ровно с её начала (punch-in), каждый круг —
// дубль; ■ — стоп. Файл один, дубли — места кругов в нём (clip.data.takes), выбор — в шторке клипа; на дорожке
// отрезок петли освобождается под новый клип (прежнее режется по краям, не стирается).
import { newTrack, isEmptyProject, loopOf, secPerBeat, addClip, punchClip, takesOf, normalizeProject } from '../../music/project.js';
import { renderProject } from '../../audio/render.js';
import { createCapture, openInput } from '../../audio/capture.js';
import { encodeWav, peaks as wavPeaks } from '../../audio/voicefx.js';
import { engine as audioEngine } from '../../audio/voiceengine.js';
import { clickVoice, clickNoise } from '../../audio/metronome.js';
import { after } from '../../audio/clock.js';
import { holdMenu } from '../../ui/hold.js';
import { I } from './icons.js';

// Задержка по щелчкам: место первого громкого отсчёта после каждого щелчка → медиана, с (или null — не услышали)
export function latencyOf(ch, sr, rel, { win = 0.6, floor = 0.02 } = {}) {
  const out = [];
  rel.forEach((t) => {
    const i0 = Math.max(0, Math.round(t * sr)), i1 = Math.min(ch.length, i0 + Math.round(win * sr));
    let mx = 0;
    for (let i = i0; i < i1; i++) { const v = Math.abs(ch[i]); if (v > mx) mx = v; }
    if (mx < floor) return;
    const th = mx * 0.35;
    for (let i = i0; i < i1; i++) if (Math.abs(ch[i]) >= th) { out.push((i - i0) / sr); break; }
  });
  if (out.length < Math.ceil(rel.length / 2)) return null;
  out.sort((a, b) => a - b);
  return out[Math.floor(out.length / 2)];
}

// S — общее студии: { ctx, seq, pl, host, V, proj(), save(), render(), trName(tr), st(), countIn(), recLat() }
export function createRecording(S) {
  let R = null; // идущая запись: { kind: 'track' | 'mix', cap, input, off, tr, from, lat, p, loop, stem }

  // WAV в медиатеку (с волной): имя — проект и что это (сведение, дорожка, дубль) со временем
  async function saveWav(p, ch, sr, what) {
    const { ctx } = S, { t } = ctx;
    const dur = ch[0].length / sr, wav = encodeWav(ch, sr), pk = wavPeaks(ch, 600), mx = Math.max(1e-6, ...pk);
    const d = new Date(), pad = (n) => String(n).padStart(2, '0'), name = (p.name || t('untitled')) + ' — ' + what + ' ' + pad(d.getHours()) + '.' + pad(d.getMinutes()) + '.wav';
    const file = { id: 'sr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, size: wav.length, type: 'audio/wav', kind: 'audio', songs: p.songId ? [p.songId] : [], created: Date.now(), blob: new Blob([wav], { type: 'audio/wav' }), dur, peaks: Array.from(pk, (v) => Math.round((v / mx) * 100) / 100) };
    await ctx.files.add(file);
    return file;
  }
  // Сведение «на бумаге»: песня считается быстрее реального времени тем же звуком (render.js); solo — id дорожки
  // (стем) или null — вся песня. Без OfflineAudioContext или при сбое — null (тогда сводится вживую, как раньше)
  let bouncing = false;
  async function bounce(p, solo = null, onProgress = null) {
    if (typeof OfflineAudioContext === 'undefined') return null;
    const { ctx } = S, q = normalizeProject(JSON.parse(JSON.stringify(p)));
    if (solo) q.tracks.forEach((tr) => { tr.solo = tr.id === solo; });
    const t0 = performance.now();
    const buf = await renderProject(q, { live: ctx.audio.mixer, getFile: (id) => ctx.files.get(id), a4: ctx.audio.mf ? ctx.audio.mf(69) : 440, onProgress });
    if (ctx.diag) { ctx.diag.time('render', performance.now() - t0); ctx.diag.gauge('render.x', (performance.now() - t0) / 1000 / Math.max(0.1, buf.duration)); } // сведение: во сколько раз быстрее реального времени
    return [buf.getChannelData(0), buf.getChannelData(1)].map((x) => new Float32Array(x));
  }
  // Сведение песни: на бумаге; не вышло — вживую одним проходом
  async function mixdown() {
    const { ctx, host } = S, { t } = ctx, p = S.proj();
    if (R || bouncing || !p) return;
    if (isEmptyProject(p)) { ctx.ui.toast(t('err.empty')); return; }
    bouncing = true;
    ctx.ui.toast(t('bounce.run'));
    try {
      const ch = await bounce(p, null, (x) => S.progress && S.progress(x));
      if (!ch) { bouncing = false; start({ kind: 'mix' }); return; }
      const file = await saveWav(p, ch, 44100, t('mixdownName'));
      ctx.ui.toast(t('mixdownDone'));
      holdMenu(host.querySelector('.stinfo') || host, [{ icon: I.share, label: t('share'), run: () => ctx.midi.share(file) }], file.name);
    } catch (e) { ctx.logErr(e); ctx.ui.toast(t('bounce.fail')); start({ kind: 'mix' }); }
    finally { bouncing = false; if (S.progress) S.progress(null); }
  }
  // Стемы: каждая дорожка с клипами — отдельный WAV; на бумаге — все подряд быстрее реального времени
  async function stemsBounce() {
    const { ctx } = S, { t } = ctx, p = S.proj();
    if (R || bouncing || !p) return false;
    const list = p.tracks.filter((tr) => !tr.mute && p.clips.some((c) => c.tr === tr.id && !c.mute));
    if (!list.length) { ctx.ui.toast(t('err.empty')); return true; }
    if (typeof OfflineAudioContext === 'undefined') return false;
    bouncing = true;
    try {
      for (let i = 0; i < list.length; i++) {
        ctx.ui.toast(t('stemsStep', { i: i + 1, n: list.length, name: S.trName(list[i]) }));
        const ch = await bounce(p, list[i].id, (x) => S.progress && S.progress((i + x) / list.length));
        if (!ch) return false;
        await saveWav(p, ch, 44100, S.trName(list[i]));
      }
      ctx.ui.toast(t('stemsDone', { n: list.length }));
      return true;
    } catch (e) { ctx.logErr(e); ctx.ui.toast(t('bounce.fail')); return false; } // не вышло — вживую
    finally { bouncing = false; if (S.progress) S.progress(null); }
  }

  // Стемы вживую (запасной путь): соло по очереди, проход за проходом; ■ — прервать
  async function stems() {
    if (await stemsBounce()) return;
    const { ctx } = S, { t } = ctx, p = S.proj();
    if (R || !p) return;
    const list = p.tracks.filter((tr) => !tr.mute && p.clips.some((c) => c.tr === tr.id && !c.mute));
    if (!list.length) { ctx.ui.toast(t('err.empty')); return; }
    const solo = p.tracks.map((tr) => [tr.id, tr.solo]);
    const restore = () => { solo.forEach(([id, v]) => { const tr = p.tracks.find((x) => x.id === id); if (tr) tr.solo = v; }); p.updatedAt = Date.now(); };
    const next = (i) => {
      if (i >= list.length) { restore(); S.render(); ctx.ui.toast(t('stemsDone', { n: list.length })); return; }
      p.tracks.forEach((tr) => { tr.solo = tr === list[i]; });
      p.updatedAt = Date.now();
      ctx.ui.toast(t('stemsStep', { i: i + 1, n: list.length, name: S.trName(list[i]) }));
      start({ kind: 'mix', stem: { name: S.trName(list[i]), next: () => next(i + 1), restore } });
    };
    next(0);
  }

  // Лист записи: куда (дорожка записи или новая), откуда (вход или звук приложения), мониторинг; отсчёт и поправка — в настройках
  function sheet() {
    const { ctx } = S, { t, ui } = ctx, p = S.proj(), auds = p.tracks.filter((tr) => tr.kind === 'audio'), st = S.st(), o = st.rec || (st.rec = { src: 'in', mon: false });
    let trId = auds.length ? auds[auds.length - 1].id : 'new', inputs = null;
    audioEngine().devices().then((d) => { inputs = d.inputs || []; if (!inputs.some((x) => x.id === o.in)) o.in = null; const sh = document.querySelector('.sheet'); if (sh && sh.__update) sh.__update(); }).catch(() => { inputs = []; });
    ui.sheet(() => ui.snav(t('rec.title')) +
      '<div class="hdr">' + ui.esc(t('rec.to')) + '</div><div class="group">' + auds.map((tr) => '<button class="cell" data-rt="' + tr.id + '"><span class="grow">' + ui.esc(S.trName(tr)) + '</span>' + (trId === tr.id ? ui.icons.check : '') + '</button>').join('') +
      '<button class="cell" data-rt="new"><span class="grow">' + ui.esc(t('rec.newTrack')) + '</span>' + (trId === 'new' ? ui.icons.check : '') + '</button></div>' +
      '<div class="hdr">' + ui.esc(t('rec.src')) + '</div><div class="group"><div class="cellcol">' + ui.seg('rsrc', [['in', t('rec.in')], ['app', t('rec.app')]], o.src, t('rec.src')) + '</div>' +
      (o.src === 'in' ? '<label class="cell"><span class="grow">' + ui.esc(t('rec.mon')) + '<span class="bksub">' + ui.esc(t('rec.monHint')) + '</span></span>' + ui.sw('rmon', o.mon, t('rec.mon')) + '</label>' : '') + '</div>' +
      (o.src === 'in' && inputs && inputs.length > 1 ? '<div class="hdr">' + ui.esc(t('rec.input')) + '</div><div class="group">' + inputs.map((d) => '<button class="cell" data-rin="' + ui.esc(d.id) + '"><span class="grow">' + ui.esc(d.name) + '</span>' + ((o.in || inputs[0].id) === d.id ? ui.icons.check : '') + '</button>').join('') + '</div>' : '') +
      '<p class="ftr">' + ui.esc(t(p.region ? 'rec.hintLoop' : 'rec.hint', { n: S.countIn() })) + '</p>' +
      '<div class="group" style="margin-top:14px"><button class="cell act center b" data-go>' + ui.esc(t('rec.go')) + '</button></div>',
    (el, sh) => {
      el.__update = () => sh.update();
      el.addEventListener('click', (e) => {
        let b;
        if ((b = e.target.closest('[data-rt]'))) { trId = b.dataset.rt; sh.update(); }
        else if ((b = e.target.closest('[data-rin]'))) { o.in = b.dataset.rin; ctx.store.save(); sh.update(); }
        else if ((b = e.target.closest('[data-seg="rsrc"] [data-v]'))) { o.src = b.dataset.v; ctx.store.save(); sh.update(); }
        else if (e.target.closest('[data-go]')) { sh.close(); setTimeout(() => start({ kind: 'track', trId, src: o.src, mon: o.mon }), 150); }
      });
      el.addEventListener('change', (e) => { if (e.target.matches('[data-sw="rmon"]')) { o.mon = e.target.checked; ctx.store.save(); } });
    });
  }

  // Начать: вход или отвод приложения → захват по часам контекста. Без петли — с курсора до ■; петля — такт
  // предпрокрутки, запись с её начала кругами (дубли) до ■; сведение — вся песня одним проходом, без отсчёта
  async function start({ kind, trId = null, src = 'app', mon = false, stem = null }) {
    const { ctx, seq, pl, V } = S, { t } = ctx, p = S.proj();
    if (R || !p) return;
    if (!ctx.audio.unlock()) { ctx.ui.toast(t('err.sound')); return; }
    if (kind === 'mix' && isEmptyProject(p)) { ctx.ui.toast(t('err.empty')); return; }
    const tap = ctx.audio.tap();
    if (!tap) { ctx.ui.toast(t('err.sound')); return; }
    const c = tap.ctx, rec = { kind, p, src, cap: null, input: null, off: null, tr: null, lat: 0, stem, loop: null };
    try {
      if (kind === 'track' && src === 'in') {
        rec.input = await openInput({ in: (S.st().rec && S.st().rec.in) || null });
        const node = c.createMediaStreamSource(rec.input.stream);
        rec.cap = createCapture(c, node, { channels: rec.input.channels, onFull: () => stop() });
        if (mon) { const g = c.createGain(); g.gain.value = 0.9; node.connect(g).connect(ctx.audio.mixer.bus('media')); rec.monNode = g; }
        rec.lat = S.recLat();
      } else {
        const node = c.createGain();
        rec.off = tap.into(node);
        rec.cap = createCapture(c, node, { channels: 2, onFull: () => stop() });
      }
    } catch (e) { ctx.ui.toast(t(e && e.reason === 'denied' ? 'rec.denied' : 'rec.noMic')); cleanup(rec); return; }
    if (kind === 'track') {
      rec.tr = trId !== 'new' && p.tracks.find((x) => x.id === trId) || null;
      if (!rec.tr) { rec.tr = newTrack('audio', p.tracks.length); p.tracks.push(rec.tr); S.save(); }
    }
    const spb = secPerBeat(p), loop = loopOf(p);
    let from = 0, play = 0, once = kind === 'mix';
    if (kind === 'track' && p.region) { rec.loop = loop; from = loop.a; play = Math.max(0, loop.a - p.num); } // предпрокрутка — такт до петли
    else if (kind === 'track') { from = play = pl ? pl.cursor : V.cursor || 0; }
    if (rec.tr) { // прежнее на дорожке, куда пишем, не звучит (с места записи); вернётся при стопе, место займёт новый клип
      const end = rec.loop ? rec.loop.b : Infinity;
      rec.hidden = p.clips.filter((x) => x.tr === rec.tr.id && !x.mute && x.at < end && x.at + x.len > from);
      rec.hidden.forEach((x) => { x.mute = true; });
    }
    V.view = 'song'; V.cid = null;
    R = rec;
    seq.focus = null;
    seq.start(play, { countIn: kind === 'mix' ? 0 : S.countIn(), once, whole: kind === 'mix', onEnd: () => stop() });
    rec.from = from;
    rec.cap.start(seq.t0 + from * spb);
    S.render();
  }
  function cleanup(rec) {
    if (rec.cap) rec.cap.dispose();
    if (rec.off) rec.off();
    if (rec.monNode) { try { rec.monNode.disconnect(); } catch { /* */ } }
    if (rec.input) rec.input.close();
    if (rec.hidden) { rec.hidden.forEach((x) => { x.mute = false; }); rec.hidden = null; }
  }
  // Стоп: буфер → WAV в медиатеку (с волной); запись в дорожку — клип с доли старта (поправка задержки — off клипа)
  async function stop(user = false) {
    const rec = R; if (!rec) return;
    R = null;
    if (user) rec.stopped = true;
    const { ctx, seq, host } = S, data = rec.cap.stop();
    seq.stop();
    cleanup(rec);
    S.render();
    const { t } = ctx, p = rec.p;
    if (rec.stem && rec.stopped) { rec.stem.restore(); S.render(); return; } // стемы прерваны (■)
    if (!data || data.ch[0].length < data.sr * 0.3) { ctx.ui.toast(t('rec.short')); if (rec.stem) rec.stem.next(); return; }
    let ch = data.ch;
    if (rec.kind === 'track' && ch.length === 2) { let same = true; for (let i = 0; i < ch[0].length; i += 997) if (ch[0][i] !== ch[1][i]) { same = false; break; } if (same) ch = [ch[0]]; } // моно-вход — одна дорожка
    const dur = ch[0].length / data.sr, wav = encodeWav(ch, data.sr), pk = wavPeaks(ch, 600), mx = Math.max(1e-6, ...pk);
    const d = new Date(), pad = (n) => String(n).padStart(2, '0'), name = (p.name || t('untitled')) + (rec.stem ? ' — ' + rec.stem.name : rec.kind === 'mix' ? ' — ' + t('mixdownName') : ' — ' + t('rec.takeName')) + ' ' + pad(d.getHours()) + '.' + pad(d.getMinutes()) + '.wav';
    const file = { id: 'sr' + Date.now().toString(36), name, size: wav.length, type: 'audio/wav', kind: 'audio', songs: p.songId ? [p.songId] : [], created: Date.now(), blob: new Blob([wav], { type: 'audio/wav' }), dur, peaks: Array.from(pk, (v) => Math.round((v / mx) * 100) / 100) };
    try { await ctx.files.add(file); } catch (e) { ctx.logErr(e); ctx.ui.toast(t('err.fail')); if (rec.stem) rec.stem.restore(); return; }
    if (rec.stem) { rec.stem.next(); return; }
    if (rec.kind === 'mix') { ctx.ui.toast(t('mixdownDone')); holdMenu(host.querySelector('.stinfo') || host, [{ icon: I.share, label: t('share'), run: () => ctx.midi.share(file) }], name); return; }
    const spb = secPerBeat(p);
    let cl;
    if (rec.loop) { // петля: дубли — места полных кругов; клип — на петле, последний дубль
      const L = rec.loop.b - rec.loop.a, takes = takesOf(dur, rec.lat, L * spb);
      cl = punchClip(p, rec.tr, rec.loop.a, rec.loop.b, { fileId: file.id, off: takes[takes.length - 1], ...(takes.length > 1 ? { takes, take: takes.length - 1 } : {}) });
      if (cl) cl.loop = false;
      if (cl && takes.length > 1) { S.save(); S.render(); ctx.ui.toast(t('rec.takesDone', { n: takes.length })); return; }
    } else { // без петли: от доли старта, длиной по записи (целыми долями)
      const beats = Math.max(1, Math.round((dur - rec.lat) / spb));
      cl = punchClip(p, rec.tr, rec.from, rec.from + beats, { fileId: file.id, off: rec.lat }) || addClip(p, rec.tr, rec.from, beats, { fileId: file.id, off: rec.lat });
    }
    if (!cl) { ctx.ui.toast(t('clip.max')); return; }
    S.save(); S.render();
    ctx.ui.toast(t('rec.done'));
  }

  // Замер задержки: шесть щелчков в выход, вход их слышит; запаздывание (выход + вход) — поправка записи, мс.
  // Телефон — динамиком (не в наушниках), в тишине. → мс или null
  async function measure() {
    const { ctx } = S, { t } = ctx;
    if (R) return null;
    if (!ctx.audio.unlock()) { ctx.ui.toast(t('err.sound')); return null; }
    const tap = ctx.audio.tap();
    if (!tap) { ctx.ui.toast(t('err.sound')); return null; }
    const c = tap.ctx;
    let input = null, cap = null;
    try {
      input = await openInput({ in: (S.st().rec && S.st().rec.in) || null });
      const node = c.createMediaStreamSource(input.stream);
      cap = createCapture(c, node, { channels: 1 });
      const t0 = c.currentTime + 0.4, gap = 0.5, n = 6, noise = clickNoise(c), bus = ctx.audio.mixer.bus('metro');
      cap.start(t0);
      for (let i = 0; i < n; i++) clickVoice(c, bus, t0 + i * gap, 3, 'click', noise);
      await new Promise((res) => after((0.4 + n * gap + 0.5) * 1000, res));
      const data = cap.stop();
      if (!data) return null;
      const lat = latencyOf(data.ch[0], data.sr, Array.from({ length: n }, (_, i) => i * gap + (t0 - data.t0)));
      return lat == null ? null : Math.round(lat * 1000);
    } catch (e) { ctx.ui.toast(t(e && e.reason === 'denied' ? 'rec.denied' : 'rec.noMic')); return null; }
    finally { if (cap) cap.dispose(); if (input) input.close(); }
  }

  return {
    get busy() { return !!R || bouncing; },
    get kind() { return R ? R.kind : null; },
    sheet, start, stop, stems, measure, mixdown,
  };
}
