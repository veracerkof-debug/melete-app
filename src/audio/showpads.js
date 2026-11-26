// Звуки пульта выступления (расширение медиатеки): пады играют файлы медиатеки — один раз, петлёй или пока держат,
// с плавным входом и выходом, группами (один звук глушит другой) и приглушением основного трека на время звука.
// Узлы: у каждого звука свой голос (источник → громкость) → общий «выход звуков» → шина медиатеки. Выход звуков и узел
// приглушения создаются один раз, правятся только параметрами и плавно (правило звука: ничего не переподключается на ходу).
// Файл раскрывается в память заранее (preload) — касание играет сразу; раскрытое хранится не больше MAX_CACHE штук.
import { holdAt } from './param.js';
import { faderGain, eqGains } from '../music/show.js';
import { createStagePads, PADS } from './stagepads.js';
import { measureLoudness, normGainDb, dbGain } from './loudness.js';

const MAX_CACHE = 24, MAX_VOICES = 24, CLICK = 0.012; // CLICK — минимальный вход/выход, без щелчка

// getNorm() → { on, target, pads } — нормализация громкости; known(fileId) → { lufs, peak } уже измеренное; onMeasure(fileId, m) — новое измерение
export function createShowPads({ dest, getBlob, drumFx = () => ({}), now = () => dest.context.currentTime, getNorm = () => ({ on: false }), known = () => null, onMeasure = () => {} }) {
  const c = dest.context;
  const out = c.createGain(); out.gain.value = 1; out.connect(dest);
  const duckNode = c.createGain(); duckNode.gain.value = 1; duckNode.connect(dest); // сюда подключается основной трек (showdeck.js): пока звучит пад с «приглушать» — тише
  const cache = new Map(), pending = new Map(), loud = new Map(); // loud — измеренная громкость файла           // файл → буфер / обещание раскрытия
  const voices = new Set(), subs = new Set();
  // Ударные (pad.synth): синтез с залом и эхом; создаётся один раз при первом ударе, дальше правятся только параметры
  let dr = null;
  const drums = () => (dr ||= createStagePads(c, out, drumFx()));
  let duckAmount = 0.4, duckTime = 0.25, errs = new Set();
  const emit = () => subs.forEach((fn) => { try { fn(); } catch (e) { (globalThis.reportError || console.error)(e); } });

  // раскрыть файл в буфер (один раз, повторные запросы ждут то же обещание)
  function load(fileId) {
    if (!fileId) return Promise.resolve(null);
    if (cache.has(fileId)) { const b = cache.get(fileId); cache.delete(fileId); cache.set(fileId, b); return Promise.resolve(b); } // свежее — в конец
    if (pending.has(fileId)) return pending.get(fileId);
    const p = (async () => {
      const blob = getBlob(fileId);
      if (!blob) throw new Error('нет файла');
      const buf = await c.decodeAudioData(await blob.arrayBuffer());
      cache.set(fileId, buf);
      // громкость — для нормализации; уже измеренная берётся из записи медиатеки
      try {
        let m = known(fileId);
        if (!m) { m = await measureLoudness(Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, i) => buf.getChannelData(i)), buf.sampleRate); onMeasure(fileId, m); }
        loud.set(fileId, m);
      } catch { /* без измерения — без поправки */ }
      while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
      errs.delete(fileId);
      return buf;
    })().catch((e) => { errs.add(fileId); emit(); throw e; }).finally(() => pending.delete(fileId));
    pending.set(fileId, p);
    return p;
  }
  const ready = (fileId) => cache.has(fileId);
  async function preload(pads) {
    for (const p of pads) { if (p && p.file && !cache.has(p.file)) { try { await load(p.file); } catch { /* пад покажет, что файла нет */ } } }
  }

  function applyDuck() {
    const n = [...voices].filter((v) => v.duck).length, t = now();
    duckNode.gain.cancelScheduledValues(t);
    duckNode.gain.setTargetAtTime(n ? 1 - duckAmount : 1, t, n ? duckTime / 3 : 0.3);
  }

  function stopVoice(v, fade) {
    if (v.ending) return;
    v.ending = true;
    const t = now(), f = Math.max(CLICK, fade);
    try { holdAt(v.g.gain, t); v.g.gain.linearRampToValueAtTime(0, t + f); v.src.stop(t + f + 0.02); } catch { /* уже закончился */ }
  }
  function drop(v) {
    if (!voices.delete(v)) return;
    try { v.src.disconnect(); v.g.disconnect(); (v.fx || []).forEach((f) => f.disconnect()); } catch { /* уже */ }
    applyDuck(); emit();
  }

  function start(pad, buf) {
    const t = now(), g = c.createGain(), src = c.createBufferSource();
    const nm = getNorm(), m = loud.get(pad.file), nd = nm && nm.on && nm.pads && m ? normGainDb(m.lufs, m.peak, nm.target) : 0;
    const lvl = faderGain(pad.level) * dbGain(nd), from = Math.min(pad.from || 0, Math.max(0, buf.duration - 0.05));
    const end = pad.to && pad.to > from ? Math.min(pad.to, buf.duration) : buf.duration;
    // скорость и тональность пада — как у семплера (вместе): темп = скорость × 2^(полутонов/12); длительность на часах — с поправкой
    const rate = Math.max(0.25, Math.min(4, (pad.speed || 1) * Math.pow(2, (pad.shift || 0) / 12))), span = end - from, len = span / rate;
    src.buffer = buf; src.playbackRate.value = rate;
    if (pad.mode === 'loop') { src.loop = true; src.loopStart = from; src.loopEnd = end; }
    const fin = Math.max(CLICK, pad.fadeIn || 0);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + fin);
    // эквалайзер-пресет: три фильтра на голос (создаются вместе с голосом и уходят вместе с ним)
    let fx = [];
    if (pad.eq) { const [lo, mi, hi] = eqGains(pad.eq), mk = (type, f, gain, q) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.gain.value = gain; if (q) b.Q.value = q; return b; }; fx = [mk('lowshelf', 120, lo), mk('peaking', 1000, mi, 0.9), mk('highshelf', 6000, hi)]; }
    let node = src; for (const f of fx) { node.connect(f); node = f; }
    node.connect(g); g.connect(out);
    const v = { id: pad.id, pad, src, g, fx, t0: t, len, loop: pad.mode === 'loop', duck: !!pad.duck, group: pad.group || 0, ending: false };
    // хвост: нота-однократка плавно уходит в конце, если задан выход
    if (pad.mode !== 'loop' && pad.fadeOut > CLICK) { const te = t + len - pad.fadeOut; if (te > t + fin) { g.gain.setValueAtTime(lvl, te); g.gain.linearRampToValueAtTime(0, t + len); } }
    src.onended = () => drop(v);
    voices.add(v);
    if (voices.size > MAX_VOICES) { const old = [...voices].find((x) => !x.ending); if (old) stopVoice(old, 0.05); }
    if (pad.mode === 'loop') src.start(t, from); else src.start(t, from, span);
    applyDuck(); emit();
    return v;
  }

  const of = (padId) => [...voices].filter((v) => v.id === padId && !v.ending);
  const api = {
    out, duckNode,
    drums: () => dr, // созданные ударные (или null)
    setSpace(v) { if (dr) dr.setSpace(v); }, setEcho(v) { if (dr) dr.setEcho(v); }, setBpm(b) { if (dr) dr.setBpm(b); },
    setKit(k) { if (dr) dr.setKit(k); }, setVel(v) { if (dr) dr.setVel(v); },
    // «стоп всё» со сценой: хвосты ударных гасятся, потом возвращаются
    hush(sec) { if (dr) dr.hush(sec); }, unhush() { if (dr) dr.unhush(); },
    load, preload, ready, failed: (fileId) => errs.has(fileId),
    // касание пада; → 'play' | 'stop' | 'wait' (файл ещё раскрывается) | 'empty' (файла нет) | 'error'
    press(pad) {
      if (pad && pad.synth) { const i = PADS.findIndex((x) => x.id === pad.synth); if (i < 0) return 'empty'; try { return drums().hit(i) ? 'play' : 'error'; } catch { return 'error'; } }
      if (!pad || !pad.file) return 'empty';
      const live = of(pad.id);
      if (live.length && pad.again !== 'layer') {
        if (pad.again === 'stop' || pad.mode === 'loop') { live.forEach((v) => stopVoice(v, pad.fadeOut)); return 'stop'; }
        live.forEach((v) => stopVoice(v, 0.03)); // с начала: старый уходит за 30 мс
      }
      if (pad.group) [...voices].filter((v) => v.group === pad.group && v.id !== pad.id && !v.ending).forEach((v) => stopVoice(v, 0.05));
      const buf = cache.get(pad.file);
      if (buf) { start(pad, buf); return 'play'; }
      if (errs.has(pad.file)) return 'error';
      load(pad.file).then((b) => { if (b) start(pad, b); }).catch(() => {});
      return 'wait';
    },
    release(pad) { of(pad.id).forEach((v) => stopVoice(v, pad.fadeOut)); }, // «пока держат»: отпустили
    stop(padId, fade = 0.15) { of(padId).forEach((v) => stopVoice(v, fade)); },
    stopAll(fade = 0.15) { [...voices].forEach((v) => stopVoice(v, fade)); },
    playing: (padId) => { const v = of(padId)[0]; return v ? { t0: v.t0, len: v.len, loop: v.loop } : null; },
    get active() { return [...voices].filter((v) => !v.ending).length; },
    now,
    setLevel(v) { out.gain.setTargetAtTime(faderGain(v), now(), 0.03); },
    setDuck(amountPct, time) { duckAmount = Math.max(0, Math.min(1, amountPct / 100)); if (time) duckTime = time; applyDuck(); },
    forget(fileId) { cache.delete(fileId); loud.delete(fileId); errs.delete(fileId); },
    normOf: (fileId) => { const nm = getNorm(), m = loud.get(fileId); return nm && nm.on && nm.pads && m ? normGainDb(m.lufs, m.peak, nm.target) : 0; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    dispose() { api.stopAll(0.1); setTimeout(() => { try { if (dr) dr.dispose(); out.disconnect(); duckNode.disconnect(); } catch { /* уже */ } cache.clear(); subs.clear(); }, 400); },
  };
  return api;
}
