// Основной трек пульта выступления (расширение медиатеки): два места — идущий трек и следующий, загруженный заранее,
// чтобы «ГО» не ждало раскодирования. Плеер — тот же движок, что у медиатеки (stretchplayer: сдвиг тональности без смены
// темпа; запасной bufferplayer — без тональности). Узлы создаются один раз: у каждого места своя огибающая (плавный вход и
// выход, громкость номера), общий «фейдер трека» и выход в узел приглушения падов (showpads.js → шина медиатеки).
// Правки — только параметрами и плавно.
import { after } from './clock.js'; // таймеры на часах звука: в свёрнутом окне setTimeout замедляется
import { holdAt } from './param.js';
import { faderGain, eqGains } from '../music/show.js';
import { dbGain } from './loudness.js';
import { createStretchPlayer, stretchAvailable } from './stretchplayer.js';
import { createBufferPlayer } from './bufferplayer.js';

const CLICK = 0.012;
const realPlayer = (c, dest) => (stretchAvailable() ? createStretchPlayer(c, dest) : createBufferPlayer(c, dest));

export function createShowDeck({ dest, getBlob, getParts = () => null, makePlayer = realPlayer, now = () => dest.context.currentTime }) {
  const c = dest.context;
  // фейдер трека → эквалайзер номера (три полосы, создаются один раз; пресет меняет только усиление, плавно) → выход
  const trim = c.createGain(); trim.gain.value = 1;
  const mkEq = (type, f, q) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.gain.value = 0; if (q) b.Q.value = q; return b; };
  const eq = [mkEq('lowshelf', 120), mkEq('peaking', 1000, 0.9), mkEq('highshelf', 6000)];
  trim.connect(eq[0]); eq[0].connect(eq[1]); eq[1].connect(eq[2]); eq[2].connect(dest);
  const setEq = (id, snap) => { const g = eqGains(id), t = now(); eq.forEach((b, i) => { if (snap) b.gain.setValueAtTime(g[i], t); else b.gain.setTargetAtTime(g[i], t, 0.05); }); };
  const subs = new Set();
  // огибающая (вход, выход, громкость номера) → поправка нормализации → общий фейдер трека
  const mkSlot = () => { const env = c.createGain(), norm = c.createGain(); env.gain.value = 0; norm.gain.value = 1; env.connect(norm); norm.connect(trim); return { env, norm, player: null, file: null, ready: null, loadedFile: null, opts: null, fading: false }; };
  const slots = [mkSlot(), mkSlot()];
  let active = null;
  const emit = () => subs.forEach((fn) => { try { fn(); } catch (e) { (globalThis.reportError || console.error)(e); } });

  // загрузить файл в место (один раз; тот же файл повторно не грузится)
  // parts — собрать звук из дорожек записи (программа номера меняет их громкость на ходу); mix — начальные усиления
  function loadInto(slot, fileId, parts = false, mix = {}) {
    if (slot.file === fileId && slot.ready && !!slot.withParts === !!parts) return slot.ready;
    slot.file = fileId; slot.fading = false; slot.withParts = false;
    slot.ready = (async () => {
      const blob = getBlob(fileId);
      if (!blob) throw new Error('нет файла');
      if (!slot.player) slot.player = await makePlayer(c, slot.env);
      const pb = parts && slot.player.loadParts ? getParts(fileId) : null;
      if (pb && Object.keys(pb).length) { await slot.player.loadParts(pb, mix); slot.withParts = true; } else await slot.player.load(blob);
      if (slot.file !== fileId) return null;
      slot.loadedFile = fileId;
      slot.player.addEventListener && slot.player.addEventListener('ended', () => { if (slot === active) { slot.opts = slot.opts && { ...slot.opts, ended: true }; emit(); } });
      return slot.player;
    })().catch((e) => { if (slot.file === fileId) { slot.file = null; slot.ready = null; } throw e; });
    return slot.ready;
  }
  const playing = (s) => !!(s.player && !s.player.paused);
  // место для файла: уже загруженный; иначе то, что не звучит и не идущее
  const slotFor = (fileId) => slots.find((s) => s.file === fileId) || slots.find((s) => s !== active && !playing(s)) || slots.find((s) => !playing(s)) || slots[0];

  const api = {
    trim,
    // загрузить следующий трек заранее, пока идёт текущий
    prepare(fileId, parts = false, mix = {}) { if (!fileId) return Promise.resolve(null); const s = slotFor(fileId); return loadInto(s, fileId, parts, mix).catch(() => null); },
    isReady: (fileId) => slots.some((s) => s.file === fileId && s.loadedFile === fileId),
    // opts: { file, level 0…100, fadeIn, fadeOut, shift, from } — запустить; → длительность
    async start(opts) {
      const wantParts = !!(opts.parts), s = slotFor(opts.file), pl = await loadInto(s, opts.file, wantParts, opts.mix || {});
      if (!pl) return 0;
      const t = now(), lvl = faderGain(opts.level == null ? 100 : opts.level), fin = Math.max(CLICK, opts.fadeIn || 0);
      try { pl.setPitch && pl.setPitch(opts.shift || 0, 0, false); } catch { /* запасной движок без тональности */ }
      try { pl.playbackRate = opts.tempo || 1; } catch { /* */ }
      setEq(opts.eq || '', false);
      pl.currentTime = opts.from || 0;
      holdAt(s.env.gain, t); s.env.gain.setValueAtTime(0, t); s.env.gain.linearRampToValueAtTime(lvl, t + fin);
      s.norm.gain.setValueAtTime(dbGain(opts.normDb || 0), t); // выравнивание громкости записей до одной цели
      s.opts = { ...opts, lvl, fading: false }; s.fading = false; s.progI = -1; s.ramp = null; s.base = { shift: opts.shift || 0, tempo: opts.tempo || 1, mix: { ...(opts.mix || {}) } }; s.curMix = { ...s.base.mix };
      if (s.withParts && pl.setMix) { try { pl.setMix(s.base.mix); } catch { /* */ } }
      await pl.play();
      active = s;
      emit();
      return pl.duration || 0;
    },
    // плавно убрать идущий трек за fade с, затем пауза
    stop(fade = 0.5) {
      const s = active; if (!s || !s.player) return;
      const t = now(), f = Math.max(CLICK, fade);
      holdAt(s.env.gain, t); s.env.gain.linearRampToValueAtTime(0, t + f);
      s.fading = true;
      after(f * 1000 + 60, () => { if (s.fading && s.player) { try { s.player.pause(); } catch { /* уже */ } s.fading = false; emit(); } });
      emit();
    },
    pause() { const s = active; if (!s || !s.player || s.player.paused) return; const t = now(); holdAt(s.env.gain, t); s.env.gain.linearRampToValueAtTime(0, t + 0.04); after(60, () => { try { s.player.pause(); } catch { /* */ } emit(); }); },
    resume() { const s = active; if (!s || !s.player || !s.opts) return Promise.resolve(); const t = now(); holdAt(s.env.gain, t); s.env.gain.linearRampToValueAtTime(s.opts.lvl, t + 0.04); s.fading = false; return s.player.play().then(emit); },
    seek(sec) { const s = active; if (s && s.player) s.player.currentTime = Math.max(0, sec); },
    // номер поменял громкость на ходу
    setLevel(v) { const s = active; if (!s || !s.opts) return; s.opts.lvl = faderGain(v); if (!s.fading) s.env.gain.setTargetAtTime(s.opts.lvl, now(), 0.03); },
    // поправка нормализации идущего трека (дБ): настройку цели сменили на ходу
    setNorm(db) { const s = active; if (s) s.norm.gain.setTargetAtTime(dbGain(db || 0), now(), 0.05); },
    setShift(semi) { const s = active; if (s && s.player && s.player.setPitch) { try { s.player.setPitch(semi, 0, false); } catch { /* */ } } },
    setEq(id) { setEq(id, false); },
    // свод дорожек идущего номера (если звук собран из дорожек)
    setMix(m) { const s = active; if (s && s.withParts && s.player && s.player.setMix && s.base) { s.base.mix = { ...m }; s.curMix = { ...m }; try { s.player.setMix(m); } catch { /* */ } } },
    // программа идущего номера обновлена в редакторе: подхватывается сразу
    setProg(list) { const s = active; if (s && s.opts) { s.opts.prog = list || []; s.progI = -2; } },
    setTempo(r) { const s = active; if (s && s.player) { try { s.player.playbackRate = r; } catch { /* */ } } },
    // программа номера: события по времени записи (key — полутоны, tempo, level; ramp — плавно за сколько секунд)
    applyProg(s, time) {
      const L = s.opts && s.opts.prog; if (!L || (!L.length && s.progI === -1)) return;
      let i = -1; while (i + 1 < L.length && L[i + 1].t <= time + 0.02) i++;
      if (i === s.progI) return;
      const back = i < s.progI; s.progI = i;
      // итог — по всем событиям до i (их немного): так и перемотка, и прыжок дают верное состояние
      const st = { shift: s.base.shift, tempo: s.base.tempo, level: s.opts.level == null ? 100 : s.opts.level, mix: { ...s.base.mix } };
      L.slice(0, i + 1).forEach((e) => { if (e.key != null) st.shift = e.key; if (e.tempo != null) st.tempo = e.tempo; if (e.level != null) st.level = e.level; if (e.mix) Object.assign(st.mix, e.mix); });
      const ramp = back || i < 0 ? 0 : L[i].ramp || 0, t = now();
      if (s.player && s.player.setPitch) { try { s.player.setPitch(st.shift, 0, false); } catch { /* */ } }
      if (!s.fading) { const g = faderGain(st.level); s.opts.lvl = g; holdAt(s.env.gain, t); if (ramp > 0.05) s.env.gain.linearRampToValueAtTime(g, t + ramp); else s.env.gain.setTargetAtTime(g, t, 0.03); }
      const cur = (s.player && s.player.playbackRate) || 1;
      if (ramp > 0.05 && st.tempo !== cur) s.ramp = { from: cur, to: st.tempo, t0: t, dur: ramp };
      else { s.ramp = null; if (s.player) { try { s.player.playbackRate = st.tempo; } catch { /* */ } } }
      // дорожки: плавно (шаги в tick) или сразу
      if (s.withParts && s.player && s.player.setMix) {
        if (ramp > 0.05) s.mixRamp = { from: { ...s.curMix }, to: st.mix, t0: t, dur: ramp };
        else { s.mixRamp = null; s.curMix = { ...st.mix }; try { s.player.setMix(s.curMix); } catch { /* */ } }
      }
    },
    setTrim(v) { trim.gain.setTargetAtTime(faderGain(v), now(), 0.03); },
    // вызывается часто (UI): плавный уход в конце трека по fadeOut номера
    tick() {
      const s = active; if (!s || !s.player || !s.opts || s.fading || s.player.paused) return;
      if (s.opts.prog && (s.opts.prog.length || s.progI !== -1)) api.applyProg(s, s.player.currentTime || 0);
      if (s.ramp) { const k = Math.min(1, (now() - s.ramp.t0) / s.ramp.dur); try { s.player.playbackRate = s.ramp.from + (s.ramp.to - s.ramp.from) * k; } catch { /* */ } if (k >= 1) s.ramp = null; }
      if (s.mixRamp && s.player.setMix) {
        const r = s.mixRamp, k = Math.min(1, (now() - r.t0) / r.dur), m = {};
        for (const p of new Set([...Object.keys(r.from), ...Object.keys(r.to)])) { const a = r.from[p] == null ? 1 : r.from[p], b = r.to[p] == null ? 1 : r.to[p]; m[p] = a + (b - a) * k; }
        s.curMix = m; try { s.player.setMix(m); } catch { /* */ } if (k >= 1) s.mixRamp = null;
      }
      const fo = s.opts.fadeOut, d = s.player.duration;
      if (fo > 0 && d && s.player.currentTime >= d - fo) { const t = now(), left = Math.max(CLICK, d - s.player.currentTime); holdAt(s.env.gain, t); s.env.gain.linearRampToValueAtTime(0, t + left); s.fading = true; }
    },
    get state() {
      const s = active;
      if (!s || !s.player) return { file: null, playing: false, time: 0, dur: 0 };
      return { file: s.file, playing: playing(s) && !s.fading, fading: s.fading, time: s.player.currentTime || 0, dur: s.player.duration || 0, ended: !!s.player.ended };
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    dispose() { api.stop(0.2); setTimeout(() => { slots.forEach((s) => { try { s.player && s.player.destroy && s.player.destroy(); s.env.disconnect(); s.norm.disconnect(); } catch { /* */ } }); try { trim.disconnect(); } catch { /* */ } subs.clear(); }, 400); },
  };
  return api;
}
