// Основной трек пульта выступления (расширение медиатеки): два места — идущий трек и следующий, загруженный заранее,
// чтобы «ГО» не ждало раскодирования. Плеер — тот же движок, что у медиатеки (stretchplayer: сдвиг тональности без смены
// темпа; запасной bufferplayer — без тональности). Узлы создаются один раз: у каждого места своя огибающая (плавный вход и
// выход, громкость номера), общий «фейдер трека» и выход в узел приглушения падов (showpads.js → шина медиатеки).
// Правки — только параметрами и плавно.
import { holdAt } from './param.js';
import { faderGain } from '../music/show.js';
import { dbGain } from './loudness.js';
import { createStretchPlayer, stretchAvailable } from './stretchplayer.js';
import { createBufferPlayer } from './bufferplayer.js';

const CLICK = 0.012;
const realPlayer = (c, dest) => (stretchAvailable() ? createStretchPlayer(c, dest) : createBufferPlayer(c, dest));

export function createShowDeck({ dest, getBlob, makePlayer = realPlayer, now = () => dest.context.currentTime }) {
  const c = dest.context;
  const trim = c.createGain(); trim.gain.value = 1; trim.connect(dest);
  const subs = new Set();
  // огибающая (вход, выход, громкость номера) → поправка нормализации → общий фейдер трека
  const mkSlot = () => { const env = c.createGain(), norm = c.createGain(); env.gain.value = 0; norm.gain.value = 1; env.connect(norm); norm.connect(trim); return { env, norm, player: null, file: null, ready: null, loadedFile: null, opts: null, fading: false }; };
  const slots = [mkSlot(), mkSlot()];
  let active = null;
  const emit = () => subs.forEach((fn) => { try { fn(); } catch (e) { (globalThis.reportError || console.error)(e); } });

  // загрузить файл в место (один раз; тот же файл повторно не грузится)
  function loadInto(slot, fileId) {
    if (slot.file === fileId && slot.ready) return slot.ready;
    slot.file = fileId; slot.fading = false;
    slot.ready = (async () => {
      const blob = getBlob(fileId);
      if (!blob) throw new Error('нет файла');
      if (!slot.player) slot.player = await makePlayer(c, slot.env);
      await slot.player.load(blob);
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
    prepare(fileId) { if (!fileId) return Promise.resolve(null); const s = slotFor(fileId); return loadInto(s, fileId).catch(() => null); },
    isReady: (fileId) => slots.some((s) => s.file === fileId && s.loadedFile === fileId),
    // opts: { file, level 0…100, fadeIn, fadeOut, shift, from } — запустить; → длительность
    async start(opts) {
      const s = slotFor(opts.file), pl = await loadInto(s, opts.file);
      if (!pl) return 0;
      const t = now(), lvl = faderGain(opts.level == null ? 100 : opts.level), fin = Math.max(CLICK, opts.fadeIn || 0);
      try { pl.setPitch && pl.setPitch(opts.shift || 0, 0, false); } catch { /* запасной движок без тональности */ }
      pl.currentTime = opts.from || 0;
      holdAt(s.env.gain, t); s.env.gain.setValueAtTime(0, t); s.env.gain.linearRampToValueAtTime(lvl, t + fin);
      s.norm.gain.setValueAtTime(dbGain(opts.normDb || 0), t); // выравнивание громкости записей до одной цели
      s.opts = { ...opts, lvl, fading: false }; s.fading = false;
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
      setTimeout(() => { if (s.fading && s.player) { try { s.player.pause(); } catch { /* уже */ } s.fading = false; emit(); } }, f * 1000 + 60);
      emit();
    },
    pause() { const s = active; if (!s || !s.player || s.player.paused) return; const t = now(); holdAt(s.env.gain, t); s.env.gain.linearRampToValueAtTime(0, t + 0.04); setTimeout(() => { try { s.player.pause(); } catch { /* */ } emit(); }, 60); },
    resume() { const s = active; if (!s || !s.player || !s.opts) return Promise.resolve(); const t = now(); holdAt(s.env.gain, t); s.env.gain.linearRampToValueAtTime(s.opts.lvl, t + 0.04); s.fading = false; return s.player.play().then(emit); },
    seek(sec) { const s = active; if (s && s.player) s.player.currentTime = Math.max(0, sec); },
    // номер поменял громкость на ходу
    setLevel(v) { const s = active; if (!s || !s.opts) return; s.opts.lvl = faderGain(v); if (!s.fading) s.env.gain.setTargetAtTime(s.opts.lvl, now(), 0.03); },
    // поправка нормализации идущего трека (дБ): настройку цели сменили на ходу
    setNorm(db) { const s = active; if (s) s.norm.gain.setTargetAtTime(dbGain(db || 0), now(), 0.05); },
    setShift(semi) { const s = active; if (s && s.player && s.player.setPitch) { try { s.player.setPitch(semi, 0, false); } catch { /* */ } } },
    setTrim(v) { trim.gain.setTargetAtTime(faderGain(v), now(), 0.03); },
    // вызывается часто (UI): плавный уход в конце трека по fadeOut номера
    tick() {
      const s = active; if (!s || !s.player || !s.opts || s.fading || s.player.paused) return;
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
