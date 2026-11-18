// Слой вывода (DEV): играть на телефоне, а звук делать на другом устройстве (docs/link.md, раздел «Вывод»).
// Для каждой категории — своя цель: 'local' (этот телефон) | 'remote' (сопряжённое устройство) | 'both' (оба).
// Категории: sound (ноты и звук инструментов, пэды, звуки пульта), click (метроном, сигналы), media (плеер, трек пульта),
// control (параметры: громкости шин). Умолчание везде 'local' — без выбора приложение работает как раньше.
//
// Транспорт — не здесь (src/core/link.js): слой пишется против интерфейса
//   { send(frame), onFrame(fn) → off, connected, now(), state?, rtt?, jitter?, onState?(fn) → off,
//     clock?: { toRemote(t), toLocal(t) } }
// frame — объект { c: категория, e: событие, s: номер, … }; lossy: 1 — кадр можно терять («последний побеждает»).
// Передающая сторона — output-hooks.js (обёртки поверх synth / drone / metro / mixer, движки не переписаны);
// принимающая — здесь: события применяются к общему звуку приложения (через оригинальные методы, мимо обёрток).
// Надёжность: ошибка в обработчике одного события не роняет остальные; при обрыве канала удалённые голоса и пэды
// отпускаются сразу, а у передающего пэды и метроном продолжаются у себя (запасной ход: тишина на сцене дороже).
import { after } from '../audio/clock.js';
import { mixKey, MIX_MAX } from '../audio/mixer.js';
import { installHooks } from './output-hooks.js';

export const CATS = ['sound', 'click', 'media', 'control'];
export const TARGETS = ['local', 'remote', 'both'];
// шина → категория (остальные шины — looper, notes — всегда у себя)
export const BUS_CAT = { piano: 'sound', glider: 'sound', drone: 'sound', theory: 'sound', vocal: 'sound', metro: 'click', media: 'media' };
export const MAX_REMOTE_VOICES = 32; // предел голосов от удалённого устройства: лишние вытесняют старые
const STALE = 0.6; // нота, опоздавшая больше чем на столько секунд, не играется (а её отпускание — выполняется всегда)

/* ---------- чистые функции (тесты) ---------- */

// Буфер дрожания (с) по замеру дрожания в мс: двойное дрожание и запас 20 мс, в пределах 20…250 мс
export const jitterBuffer = (jitterMs) => Math.min(0.25, Math.max(0.02, 2 * (+jitterMs || 0) / 1000 + 0.02));

// Линейка компенсации: на сколько секунд сдвинуть местную копию при 'both', чтобы она совпала с удалённой.
// Часы синхронизированы (synced) — удалённый играет в метку отправителя + буфер, иначе — по приходу (полпути + буфер)
export function bothDelay({ rtt = 0, jitter = 0 } = {}, synced = false) {
  const buf = jitterBuffer(jitter);
  return synced ? buf : Math.max(0, +rtt || 0) / 2000 + buf;
}

// Когда играть событие, пришедшее с меткой at (время отправителя, с): → время по часам звука или null (опоздало)
// now — часы звука сейчас; mapped — метка, переведённая в местные часы (или undefined, если часы не сведены)
export function playAt({ mapped, now, buf, stale = STALE }) {
  let t = mapped == null ? now + buf : mapped + buf;
  if (t < now) { if (now - t > stale) return null; t = now; }
  return t;
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
// слить присланные настройки в свои; ключи прототипа отбрасываются (кадр приходит снаружи)
const merge = (dst, src) => { Object.keys(src).forEach((k) => { if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') dst[k] = src[k]; }); return dst; };

/* ---------- слой вывода ---------- */

// device — настройки устройства (device.output — цели, не синхронизируются); audio — app.audio; save — сохранить device
// opts: enabled — включён ли (DEV); later(ms, fn) — таймер (по умолчанию звуковой clock.after); report(e) — куда писать ошибки
export function createOutput({ device, audio, save = () => {}, enabled = true, later = after, report = (e) => (globalThis.reportError || console.error)(e), now = () => (audio && audio.now ? audio.now() : 0) } = {}) {
  const cfg = (device.output ??= {});
  CATS.forEach((c) => { if (!TARGETS.includes(cfg[c])) cfg[c] = 'local'; });
  if (cfg.failover == null) cfg.failover = true;
  const subs = new Set();
  const notify = () => subs.forEach((fn) => { try { fn(out); } catch (e) { report(e); } });
  let tr = null, offFrame = null, offState = null, poll = 0, seq = 0, linkState = 'off';
  const safe = (fn, what) => { try { return fn(); } catch (e) { try { report(e); } catch { /* */ } return undefined; } };

  // оригинальные методы звука — до обёрток: ими применяются события с другого устройства (без петли и без перенаправления)
  // вызовы оригиналов — под флагом: обёртки передающей стороны в это время не вмешиваются (оригинал зовёт соседей через объект)
  let rin = 0;
  const bnd = (o, f) => (o && typeof o[f] === 'function' ? (...a) => { rin++; try { return o[f](...a); } finally { rin--; } } : null);
  const raw = {
    synth: { on: bnd(audio.synth, 'on'), off: bnd(audio.synth, 'off'), all: bnd(audio.synth, 'all'), release: bnd(audio.synth, 'release') },
    drone: ['start', 'stop', 'swap', 'keyOn', 'keyOff', 'keysOff', 'vol', 'setReverb', 'setHall'].reduce((r, f) => { r[f] = bnd(audio.drone, f); return r; }, {}),
    metro: { start: bnd(audio.metro, 'start'), stop: bnd(audio.metro, 'stop'), setBpm: bnd(audio.metro, 'setBpm') },
    chime: bnd(audio, 'chime'),
  };
  const dronePad = () => !!(audio.drone && (audio.drone.local ? audio.drone.local.on : audio.drone.on));

  /* --- состояние связи --- */
  const readLink = () => {
    if (!tr || !tr.connected) return 'off';
    return tr.state === 'connecting' ? 'connecting' : 'on';
  };
  const linkOn = () => linkState === 'on';
  const stateObj = () => ({ link: linkState, rtt: num(tr && tr.rtt), jitter: num(tr && tr.jitter) });
  const synced = () => !!(tr && tr.clock);
  const delay = () => bothDelay(stateObj(), synced());

  // Действующая цель категории: выбранная, а при потере связи — 'local' (запасной ход)
  const eff = (cat) => {
    if (!enabled) return 'local';
    const w = cfg[cat];
    if (w === 'local' || !w) return 'local';
    return cfg.failover ? (linkOn() ? w : 'local') : w;
  };

  /* --- отправка --- */
  function emit(cat, ev, { lossy = false } = {}) {
    if (!tr || !linkOn()) return false;
    const f = { c: cat, ...ev, s: ++seq };
    if (lossy) f.lossy = 1;
    try { tr.send(f); return true; } catch (e) { report(e); return false; }
  }

  /* --- тень передающей стороны: что сейчас «звучит у них» (для снимка и запасного хода) --- */
  const sh = { held: new Map(), pad: null, keys: new Set(), metro: null };

  /* --- принимающая сторона --- */
  const rx = { voices: new Map(), pad: null, keys: new Set(), metro: false, saved: { drone: null, metro: null, mix: null }, served: new Map() };
  const gh = new Set(); // обработчики кадров glide
  const lastG = new Map();

  const bufNow = () => jitterBuffer(tr && tr.jitter);
  const when = (at, stale) => {
    const mapped = at != null && tr && tr.clock ? safe(() => tr.clock.toLocal(at)) : undefined;
    return playAt({ mapped: Number.isFinite(mapped) ? mapped : undefined, now: now(), buf: bufNow(), stale });
  };

  function rxNoteOff(k, at, fast) {
    const rk = '~' + k;
    if (!rx.voices.has(rk)) return;
    rx.voices.delete(rk);
    raw.synth.off && raw.synth.off(rk, !!fast, at == null ? 0 : at);
  }
  function rxNoteOn(e) {
    if (BUS_CAT[e.i] !== 'sound' || !raw.synth.on) return;
    const m = num(e.m, -1);
    if (m < 0 || m > 127) return;
    const t = when(e.at, STALE);
    if (t == null) return;
    const rk = '~' + e.k;
    rx.voices.delete(rk);
    while (rx.voices.size >= MAX_REMOTE_VOICES) { const old = rx.voices.keys().next().value; rx.voices.delete(old); raw.synth.off(old, true); }
    rx.voices.set(rk, e.i);
    const o = { bus: e.i, vel: Math.min(1, Math.max(0, num(e.v, 0.8))), at: t };
    if (e.pt && typeof e.pt === 'object') o.patch = e.pt;
    raw.synth.on(m, rk, o);
  }

  // Настройки пэдов с другого устройства: применяются в память (не на диск); свои — вернутся при отпускании
  function rxPadSettings(set) {
    if (!set || typeof set !== 'object') return;
    if (!rx.saved.drone) rx.saved.drone = clone(device.drone);
    merge(device.drone, set);
  }
  function rxPad(e) {
    rxPadSettings(e.set);
    if (!raw.drone.start) return;
    const over = e.over && typeof e.over === 'object' ? e.over : undefined;
    rx.pad = true;
    if (dronePad() && raw.drone.swap) raw.drone.swap(over); else raw.drone.start(over);
  }
  function rxPadOff(fade = 1.2) {
    if (!rx.pad && !rx.keys.size) return;
    rx.pad = false;
    raw.drone.stop && raw.drone.stop(fade);
    if (rx.keys.size) { raw.drone.keysOff && raw.drone.keysOff(0.4); rx.keys.clear(); }
    if (rx.saved.drone) { const s = rx.saved.drone; rx.saved.drone = null; Object.keys(device.drone).forEach((k) => delete device.drone[k]); Object.assign(device.drone, s); }
  }
  function rxMetroOn(e) {
    if (!raw.metro.start || !audio.metro) return;
    const m = audio.metro;
    if (!rx.saved.metro) rx.saved.metro = clone(m.cfg);
    if (e.cfg && typeof e.cfg === 'object') merge(m.cfg, e.cfg);
    if (m.running) raw.metro.stop();
    rx.metro = true;
    raw.metro.start(when(e.at, 1e9));
  }
  function rxMetroOff() {
    if (!rx.metro) return;
    rx.metro = false;
    raw.metro.stop && raw.metro.stop();
    if (rx.saved.metro && audio.metro) { const s = rx.saved.metro; rx.saved.metro = null; Object.keys(audio.metro.cfg).forEach((k) => delete audio.metro.cfg[k]); Object.assign(audio.metro.cfg, s); }
  }
  function rxMix(e) {
    const mx = audio.mixer && audio.mixer.state;
    if (!mx || !BUS_CAT[e.b]) return;
    const k = mixKey(e.b);
    (rx.saved.mix ??= {});
    if (!(k in rx.saved.mix)) rx.saved.mix[k] = [mx[k], !!(mx.mute && mx.mute[k])];
    mx[k] = Math.min(MIX_MAX, Math.max(0, num(e.v, 1)));
    (mx.mute ??= {})[k] = !!e.m;
    audio.mixer.apply && audio.mixer.apply();
  }
  function rxMixRestore() {
    const mx = audio.mixer && audio.mixer.state, s = rx.saved.mix;
    rx.saved.mix = null;
    if (!mx || !s) return;
    Object.entries(s).forEach(([k, [v, m]]) => { mx[k] = v; (mx.mute ??= {})[k] = m; });
    audio.mixer.apply && audio.mixer.apply();
  }
  function rxEngine(e) {
    const r = rx.served.get(e.n);
    if (!r || !r.methods.includes(e.f)) return;
    const fn = r.origs[e.f];
    if (typeof fn === 'function') fn(...(Array.isArray(e.a) ? e.a : []));
  }
  function rxHalt(cat) { rx.served.forEach((r) => { if (r.cat === cat) safe(() => r.drop && r.drop()); }); }

  // Снимок: привести удалённое состояние к присланному (после подключения и после обрыва — ничего не «зависает»)
  function rxSync(e) {
    const s = e.sound;
    if (s) {
      const want = new Set((s.notes || []).map((n) => '~' + n.k));
      [...rx.voices.keys()].forEach((rk) => { if (!want.has(rk)) { rx.voices.delete(rk); raw.synth.off && raw.synth.off(rk, true); } });
      (s.notes || []).forEach((n) => { if (!rx.voices.has('~' + n.k)) rxNoteOn({ ...n, at: undefined }); });
      if (s.pad) rxPad(s.pad); else rxPadOff(0.6);
      const keys = new Set(s.pk || []);
      [...rx.keys].forEach((pc) => { if (!keys.has(pc)) { rx.keys.delete(pc); raw.drone.keyOff && raw.drone.keyOff(pc); } });
      keys.forEach((pc) => { if (!rx.keys.has(pc) && raw.drone.keyOn) { rx.keys.add(pc); raw.drone.keyOn(pc); } });
    }
    const c = e.click;
    if (c) { if (c.metro) { if (!rx.metro) rxMetroOn({ cfg: c.metro, at: undefined }); else merge(audio.metro.cfg, c.metro); } else rxMetroOff(); }
    if (e.control) Object.entries(e.control).forEach(([b, v]) => rxMix({ b, v: v[0], m: v[1] }));
  }

  // Отпустить всё, что пришло с удалённого устройства (обрыв канала, «bye», смена цели): плавно, ничего не остаётся
  function dropRemote() {
    safe(() => { [...rx.voices.keys()].forEach((rk) => raw.synth.off && raw.synth.off(rk, true)); rx.voices.clear(); }, 'voices');
    safe(() => rxPadOff(0.8), 'pad');
    safe(() => rxMetroOff(), 'metro');
    safe(() => rxMixRestore(), 'mix');
    safe(() => { rx.served.forEach((r) => { try { r.drop && r.drop(); } catch (e) { report(e); } }); }, 'engines');
    lastG.clear();
    gh.forEach((fn) => safe(() => fn(null, null, true)));
  }

  function receive(f) {
    if (!enabled || !f || typeof f !== 'object') return;
    const h = () => {
      switch (f.c + ':' + f.e) {
        case 'sound:on': return rxNoteOn(f);
        case 'sound:off': return rxNoteOff(f.k, f.at == null ? null : when(f.at, 1e9), !!f.fast);
        case 'sound:rel': return raw.synth.release && raw.synth.release('~' + f.k);
        case 'sound:all': [...rx.voices.keys()].forEach((rk) => raw.synth.off && raw.synth.off(rk, true)); rx.voices.clear(); rxPadOff(0.6); return undefined;
        case 'sound:pad+': return rxPad(f);
        case 'sound:pad-': return rxPadOff(num(f.fade, 1.2));
        case 'sound:padv': rxPadSettings(f.set); return raw.drone.vol && raw.drone.vol();
        case 'sound:padx': return ['vol', 'setReverb', 'setHall'].includes(f.f) && raw.drone[f.f] && raw.drone[f.f](...(Array.isArray(f.a) ? f.a : []));
        case 'sound:pk+': rxPadSettings(f.set); rx.keys.add(f.pc); return raw.drone.keyOn && raw.drone.keyOn(f.pc, f.att);
        case 'sound:pk-': rx.keys.delete(f.pc); return raw.drone.keyOff && raw.drone.keyOff(f.pc, f.fade);
        case 'sound:g': {
          const last = lastG.get(f.i) || 0;
          if (f.s < last) return undefined; // «последний побеждает»: опоздавший кадр отбрасывается
          lastG.set(f.i, f.s);
          return gh.forEach((fn) => safe(() => fn(f.i, f.p, false)));
        }
        case 'sound:g-': lastG.delete(f.i); return gh.forEach((fn) => safe(() => fn(f.i, null, true)));
        case 'click:m+': return rxMetroOn(f);
        case 'click:m-': return rxMetroOff();
        case 'click:mb': return audio.metro && raw.metro.setBpm && rx.metro && raw.metro.setBpm(num(f.bpm, 100));
        case 'click:chime': return raw.chime && raw.chime();
        case 'control:mix': return rxMix(f);
        case 'media:x': case 'sound:x': return rxEngine(f);
        case 'media:halt': case 'sound:halt': return rxHalt(f.c);
        case 'sync:sync': return rxSync(f);
        case 'bye:bye': return dropRemote();
        default: return undefined;
      }
    };
    safe(h);
  }

  /* --- снимок (передающая сторона) --- */
  const mixSnap = () => {
    const mx = audio.mixer && audio.mixer.state, r = {};
    if (!mx) return r;
    Object.keys(BUS_CAT).forEach((b) => { const k = mixKey(b); r[b] = [mx[k] == null ? 1 : mx[k], !!(mx.mute && mx.mute[k])]; });
    return r;
  };
  const padSnap = (over) => ({ set: clone(device.drone), over: over || undefined });
  function snapshot() {
    const f = { c: 'sync', e: 'sync' };
    if (eff('sound') !== 'local') f.sound = { notes: [...sh.held].map(([k, v]) => ({ k, ...v })), pad: sh.pad ? padSnap(sh.pad.over) : null, pk: [...sh.keys] };
    if (eff('click') !== 'local') f.click = { metro: sh.metro ? { ...clone(audio.metro.cfg) } : null };
    if (eff('control') !== 'local') f.control = mixSnap();
    return f;
  }
  function sendSnapshot() {
    const f = snapshot();
    if (f.sound || f.click || f.control) emit('sync', f);
  }

  /* --- смена состояния связи --- */
  function onLink() {
    const was = linkState;
    linkState = readLink();
    if (was === linkState) return;
    if (linkState === 'on') sendSnapshot();
    else if (was === 'on') {
      dropRemote();
      failover();
    }
    notify();
  }
  // Связь оборвалась: пэды и метроном, что играли «у них», продолжаются у себя — не оставлять музыканта в тишине
  function failover() {
    if (!cfg.failover) return;
    const pad = sh.pad, metro = sh.metro;
    sh.pad = null; sh.keys.clear(); sh.held.clear();
    safe(() => {
      if (pad && !dronePad() && raw.drone.start) raw.drone.start(pad.over);
      if (audio.drone && audio.drone.notify) audio.drone.notify();
    });
    sh.metro = null;
    safe(() => { if (metro && audio.metro && !audio.metro.running && raw.metro.start) raw.metro.start(); });
  }

  // Смена цели категории на ходу: звучащее переезжает или уходит, ничего не зависает
  function migrate(cat, prev, next) {
    if (!linkOn()) return;
    const was = prev !== 'local', now_ = next !== 'local';
    if (cat === 'sound') {
      if (was && !now_) {
        emit('sound', { e: 'all' });
        sh.held.clear(); sh.keys.clear();
        if (sh.pad) { const p = sh.pad; sh.pad = null; safe(() => { raw.drone.start && !dronePad() && raw.drone.start(p.over); audio.drone.notify && audio.drone.notify(); }); }
      } else if (!was && now_) {
        if (dronePad() && out.hooks) { const o = { chord: audio.drone.chord }; raw.drone.stop(0.3); out.hooks.padStart(o); }
        if (next === 'both' && dronePad() && !sh.pad) { sh.pad = { over: { chord: audio.drone.chord } }; emit('sound', { e: 'pad+', ...padSnap(sh.pad.over) }); }
      } else if (now_) {
        // 'both' → 'remote': своя копия пэда уходит; 'remote' → 'both': своя копия включается
        if (next === 'remote' && dronePad()) { raw.drone.stop(0.3); audio.drone.notify && audio.drone.notify(); }
        if (next === 'both' && sh.pad && !dronePad()) raw.drone.start(sh.pad.over);
        sendSnapshot();
      }
    } else if (cat === 'click') {
      if (was && !now_) { emit('click', { e: 'm-' }); sh.metro = null; }
      else if (now_ && audio.metro && audio.metro.running && !sh.metro) { sh.metro = {}; emit('click', { e: 'm+', cfg: clone(audio.metro.cfg), at: now() }); }
    } else if (cat === 'media') {
      if (was && !now_) emit('media', { e: 'halt' });
    } else if (cat === 'control' && now_) sendSnapshot();
  }

  const out = {
    enabled, device,
    CATS, TARGETS,
    get: (cat) => (enabled && CATS.includes(cat) ? cfg[cat] || 'local' : 'local'),
    // Цель категории; устройство-цель общее для всех категорий (output.target)
    set(cat, target) {
      if (!enabled || !CATS.includes(cat) || !TARGETS.includes(target) || cfg[cat] === target) return;
      const prev = cfg[cat];
      cfg[cat] = target;
      safe(save);
      safe(() => migrate(cat, prev, target));
      notify();
    },
    // Действующая цель с учётом связи (при обрыве — 'local')
    effective: eff,
    get target() { return cfg.target || null; },
    set target(t) { cfg.target = t && t.key ? { key: String(t.key), name: String(t.name || '') } : null; safe(save); notify(); },
    get state() { return stateObj(); },
    get failover() { return cfg.failover; },
    set failover(v) { cfg.failover = !!v; safe(save); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },

    // Подключить транспорт (null — отключить): слой сразу знает состояние и шлёт снимок
    attach(transport) {
      if (offFrame) { offFrame(); offFrame = null; }
      if (offState) { offState(); offState = null; }
      if (poll) { clearInterval(poll); poll = 0; }
      if (linkOn()) { dropRemote(); failover(); } // прежняя связь больше не наша: удалённое отпущено, своё продолжается
      linkState = 'off';
      tr = transport || null;
      if (tr) {
        offFrame = tr.onFrame((f) => receive(f)) || null;
        if (tr.onState) offState = tr.onState(onLink) || null;
        poll = setInterval(onLink, 1000); // страховка: транспорт мог не сообщить об обрыве
        if (poll && poll.unref) poll.unref();
      }
      onLink();
    },
    detach() { out.attach(null); },
    check: onLink, // перечитать состояние транспорта (тесты, периодическая проверка)
    inRaw: () => rin > 0,
    receive, snapshot, sendSnapshot, emit, delay, synced, later: (ms, fn) => later(ms, fn),
    now, raw, sh, rx, safe, report, dronePad, hooks: null,
    // Глайд: непрерывное управление (высота, эффект) — частые кадры, «последний побеждает»; true — ушло на удалённое
    // (вызывающий не играет локально, если цель 'remote'). Не чаще кадра в 16 мс, можно терять
    glide(id, params) {
      const t = eff('sound');
      if (t === 'local') return false;
      out._g ??= { pend: new Map(), tm: 0 };
      out._g.pend.set(id, params);
      if (!out._g.tm) out._g.tm = later(16, () => { const g = out._g; g.tm = 0; g.pend.forEach((p, i) => emit('sound', { e: 'g', i, p }, { lossy: true })); g.pend.clear(); });
      return t === 'remote';
    },
    glideEnd(id) {
      const t = eff('sound');
      if (t === 'local') return;
      if (out._g) out._g.pend.delete(id);
      emit('sound', { e: 'g-', i: id });
    },
    onGlide(fn) { gh.add(fn); return () => gh.delete(fn); }, // fn(id, params, end)

    // Общий движок (пады и фон пульта, трек, плеер медиатеки): методы уходят на удалённое устройство, а там вызываются
    // оригиналы. ret — что вернуть, если играет только удалённое (значение или функция); drop — глушение при обрыве
    share(cat, name, engine, methods, { ret = {}, drop } = {}) {
      const origs = {};
      methods.forEach((f) => {
        const orig = engine[f];
        if (typeof orig !== 'function') return;
        origs[f] = orig.bind(engine);
        engine[f] = (...a) => {
          const t = eff(cat);
          if (t === 'local') return origs[f](...a);
          let args;
          try { args = clone(a); } catch { return origs[f](...a); } // не сериализуется — только у себя
          emit(cat, { e: 'x', n: name, f, a: args });
          if (t === 'both') { const d = delay() * 1000; if (d > 0) { later(d, () => safe(() => origs[f](...a))); return undefined; } return origs[f](...a); }
          const r = ret[f];
          return typeof r === 'function' ? r() : r;
        };
      });
      rx.served.set(name, { cat, methods, origs, drop });
      return () => { rx.served.delete(name); methods.forEach((f) => { if (origs[f]) engine[f] = origs[f]; }); };
    },
  };

  if (enabled) installHooks(out, audio);
  return out;
}

// Переходник к src/core/link.js: прикладные кадры 0x80 (обычный) и 0x81 (можно терять); состояние 'open' → связь есть.
// Часы не передаются: у output.js время — часы звука, у link.js — эпоха; пока кадры играются по прибытии с буфером дрожания.
export const OUT_FRAME = 0x80, OUT_FRAME_LOSSY = 0x81;
export function linkTransport(link) {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const inf = () => { try { return link.info(); } catch { return {}; } };
  return {
    send: (f) => link.send(f.lossy ? OUT_FRAME_LOSSY : OUT_FRAME, enc.encode(JSON.stringify(f))),
    onFrame: (fn) => link.onFrame((type, bytes) => { if (type !== OUT_FRAME && type !== OUT_FRAME_LOSSY) return; try { fn(JSON.parse(dec.decode(bytes))); } catch { /* битый кадр — пропуск */ } }),
    get connected() { return link.state === 'open' || link.state === 'connecting'; },
    get state() { return link.state; },
    get rtt() { return inf().rtt; },
    get jitter() { const j = inf().jitter; return j && j.jitter; },
    onState: (fn) => link.subscribe(fn),
  };
}
