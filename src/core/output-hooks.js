// Передающая сторона вывода (DEV): тонкие обёртки поверх app.audio (synth, drone, metro, mixer, chime) — движки не
// переписаны. Цель категории 'local' — прямой вызов оригинала (быстрый путь, поведение прежнее); 'remote' — событие
// уходит в канал, у себя не играется; 'both' — и туда, и сюда, местная копия сдвинута на оценку задержки канала.
// Любая ошибка отправки гасится здесь: звук у себя от неё не страдает (третий принцип).
import { BUS_CAT } from './output.js';
import { mixKey } from '../audio/mixer.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

export function installHooks(out, audio) {
  const { synth, drone, metro, mixer } = audio;
  const safe = out.safe;
  const nowT = () => out.now();

  /* ---------- ноты: synth ---------- */
  if (synth && synth.on && synth.off) {
    const on0 = synth.on.bind(synth), off0 = synth.off.bind(synth), all0 = synth.all ? synth.all.bind(synth) : null, rel0 = synth.release ? synth.release.bind(synth) : null;
    let inner = 0; // оригинал сам зовёт synth.off через общий объект — эти вызовы не пересылаются
    const run = (fn) => { inner++; try { return fn(); } finally { inner--; } };
    const fwd = out.sh.held; // ключ → { i, m, v, pt, mode }; в снимок идёт без mode
    synth.on = (m, key, opts = {}) => {
      if (inner || out.inRaw()) return on0(m, key, opts);
      const bus = opts.bus || 'piano';
      // с узлом назначения (арпеджиатор пэдов) — только у себя: на том конце арпеджиатор играет сам по настройкам пэда
      const t = BUS_CAT[bus] === 'sound' && !opts.out ? out.effective('sound') : 'local';
      if (t === 'local') return run(() => on0(m, key, opts));
      const at = opts.at != null ? opts.at : nowT();
      const rec = { i: bus, m, v: opts.vel, pt: opts.patch ? safe(() => clone(opts.patch)) : undefined };
      fwd.set(key, { ...rec, mode: t });
      safe(() => out.emit('sound', { e: 'on', k: key, i: bus, m, v: opts.vel, pt: rec.pt, at }));
      if (t === 'both') return run(() => on0(m, key, { ...opts, at: at + out.delay() }));
      return undefined;
    };
    synth.off = (key, fast = false, at = 0) => {
      if (inner || out.inRaw()) return off0(key, fast, at);
      const base = key, r = fwd.get(base);
      if (!r) return run(() => off0(key, fast, at));
      fwd.delete(base);
      safe(() => out.emit('sound', { e: 'off', k: base, at: at || nowT(), fast: fast ? 1 : undefined }));
      if (r.mode === 'both') return run(() => off0(key, fast, (at || nowT()) + out.delay()));
      return undefined;
    };
    if (rel0) synth.release = (key) => {
      const r = fwd.get(key);
      if (!r) return rel0(key);
      safe(() => out.emit('sound', { e: 'rel', k: key }));
      return r.mode === 'both' ? rel0(key) : undefined;
    };
    if (all0) synth.all = () => {
      if (fwd.size || out.effective('sound') !== 'local') { fwd.clear(); safe(() => out.emit('sound', { e: 'all' })); }
      return all0();
    };
  }

  /* ---------- пэды: drone ---------- */
  if (drone && drone.start && drone.stop) {
    const d0 = {};
    ['start', 'stop', 'swap', 'retune', 'tonic', 'keyOn', 'keyOff', 'keysOff', 'vol', 'setReverb', 'setHall'].forEach((f) => { if (typeof drone[f] === 'function') d0[f] = drone[f].bind(drone); });
    const gt = (n) => { const ds = Object.getOwnPropertyDescriptor(drone, n); return ds && ds.get ? ds.get.bind(drone) : () => drone[n]; };
    const realOn = gt('on'), realSounding = gt('sounding'), realChord = gt('chord'), realHeld = gt('held');
    const sh = out.sh;
    const settings = () => safe(() => clone(out.device.drone));
    const push = () => out.emit('sound', { e: 'pad+', set: settings(), over: sh.pad && sh.pad.over });
    const notify = () => { if (drone.notify) safe(() => drone.notify()); };
    // состояние для интерфейса и арпеджиатора: тень «у них» считается звучащим пэдом; арпеджиатор смотрит на drone.local
    Object.defineProperty(drone, 'local', { value: { get on() { return realOn(); } }, configurable: true });
    Object.defineProperty(drone, 'on', { get: () => realOn() || !!sh.pad, configurable: true });
    Object.defineProperty(drone, 'sounding', { get: () => realSounding() || !!sh.pad || sh.keys.size > 0, configurable: true });
    Object.defineProperty(drone, 'chord', { get: () => (sh.pad && sh.pad.over && sh.pad.over.chord) || realChord(), configurable: true });
    Object.defineProperty(drone, 'held', { get: () => new Set([...realHeld(), ...sh.keys]), configurable: true });

    const mode = () => out.effective('sound');
    // оригиналы зовут друг друга через общий объект (swap → stop, start): внутри оригинала обёртки не вмешиваются
    let dIn = 0;
    const byp = () => dIn > 0 || out.inRaw();
    const D = (f, ...a) => { dIn++; try { return d0[f](...a); } finally { dIn--; } };
    const later = (fn) => { const ms = out.delay() * 1000; if (ms > 0) out.later(ms, () => safe(fn)); else fn(); };
    const padStart = (o) => {
      const t = mode();
      if (t === 'local') return D('start', o);
      sh.pad = { over: o ? { ...o } : undefined };
      safe(push);
      if (t === 'both') later(() => D('start', o)); else notify();
      return undefined;
    };
    out.hooks = { padStart };
    drone.start = (o) => (byp() ? D('start', o) : padStart(o));
    drone.swap = (o) => {
      const t = mode();
      if (byp() || t === 'local') return D('swap', o);
      sh.pad = { over: o ? { ...o } : undefined };
      safe(push);
      if (t === 'both') later(() => D('swap', o)); else notify();
      return undefined;
    };
    drone.retune = () => {
      if (byp() || !sh.pad) return D('retune');
      safe(push);
      if (mode() === 'both') later(() => D('retune'));
      return undefined;
    };
    drone.stop = (fade = 1.2) => {
      if (byp() || !sh.pad) return D('stop', fade);
      const t = mode();
      sh.pad = null;
      safe(() => out.emit('sound', { e: 'pad-', fade }));
      if (t === 'both') later(() => D('stop', fade)); else D('stop', fade);
      notify();
      return undefined;
    };
    ['vol', 'setReverb', 'setHall'].forEach((f) => {
      if (!d0[f]) return;
      drone[f] = (...a) => {
        if (!byp() && (sh.pad || sh.keys.size)) safe(() => out.emit('sound', { e: 'padx', f, a, set: settings() }));
        return !byp() && mode() === 'remote' ? undefined : D(f, ...a);
      };
    });
    if (d0.keyOn) {
      drone.keyOn = (pc, att) => {
        const t = byp() ? 'local' : mode();
        if (t === 'local') return D('keyOn', pc, att);
        sh.keys.add(pc);
        safe(() => out.emit('sound', { e: 'pk+', pc, att, set: settings() }));
        if (t === 'both') later(() => D('keyOn', pc, att)); else notify();
        return undefined;
      };
      drone.keyOff = (pc, fade) => {
        if (byp() || !sh.keys.has(pc)) return D('keyOff', pc, fade);
        const t = mode();
        sh.keys.delete(pc);
        safe(() => out.emit('sound', { e: 'pk-', pc, fade }));
        if (t === 'both') later(() => D('keyOff', pc, fade)); else D('keyOff', pc, fade);
        notify();
        return undefined;
      };
      drone.keysOff = (fade) => { if (!byp()) [...sh.keys].forEach((pc) => drone.keyOff(pc, fade)); return D('keysOff', fade); };
    }
  }

  /* ---------- метроном: клик ---------- */
  if (metro && metro.start && metro.stop) {
    const m0 = { start: metro.start.bind(metro), stop: metro.stop.bind(metro), setBpm: metro.setBpm ? metro.setBpm.bind(metro) : null };
    // Клик «только там»: узел шины, куда пишет метроном, — тупиковый (создаётся раз, не подключён): расписание, вспышка,
    // вибрация и счёт темпа идут у себя, звука у себя нет. Подмена на лету узлов не переподключает (правило звука 2)
    if (mixer && mixer.bus) {
      const bus0 = mixer.bus.bind(mixer);
      let dead = null;
      mixer.bus = (name) => {
        const real = bus0(name);
        if (name !== 'metro' || !real || out.effective('click') !== 'remote') return real;
        return dead || (dead = real.context.createGain());
      };
    }
    metro.start = (...a) => {
      const t = out.inRaw() ? 'local' : out.effective('click');
      if (t === 'local') return m0.start(...a);
      const at = nowT() + 0.08;
      out.sh.metro = {};
      safe(() => out.emit('click', { e: 'm+', cfg: clone(metro.cfg), at }));
      return t === 'both' ? m0.start(at + out.delay()) : m0.start(at);
    };
    metro.stop = (...a) => {
      if (!out.inRaw() && out.sh.metro) { out.sh.metro = null; safe(() => out.emit('click', { e: 'm-' })); }
      return m0.stop(...a);
    };
    if (m0.setBpm) metro.setBpm = (v) => {
      const r = m0.setBpm(v);
      if (!out.inRaw() && out.sh.metro) safe(() => out.emit('click', { e: 'mb', bpm: metro.cfg.bpm }));
      return r;
    };
    if (metro.save) {
      const s0 = metro.save.bind(metro);
      metro.save = () => { if (out.sh.metro) safe(() => out.emit('click', { e: 'm+', cfg: clone(metro.cfg), at: nowT() })); return s0(); };
    }
  }

  /* ---------- сигналы: chime ---------- */
  if (typeof audio.chime === 'function') {
    const c0 = audio.chime.bind(audio);
    audio.chime = () => {
      const t = out.effective('click');
      if (t !== 'local') safe(() => out.emit('click', { e: 'chime' }));
      return t === 'remote' ? undefined : c0();
    };
  }

  /* ---------- микшер: параметры ---------- */
  if (mixer && mixer.set && mixer.toggleMute) {
    const set0 = mixer.set.bind(mixer), tg0 = mixer.toggleMute.bind(mixer);
    const send = (bus) => {
      if (out.effective('control') === 'local' || !BUS_CAT[bus]) return;
      const mx = mixer.state, k = mixKey(bus);
      safe(() => out.emit('control', { e: 'mix', b: bus, v: mx[k] == null ? 1 : mx[k], m: !!(mx.mute && mx.mute[k]) }));
    };
    mixer.set = (bus, v) => { const r = set0(bus, v); send(bus); return r; };
    mixer.toggleMute = (bus) => { const r = tg0(bus); send(bus); return r; };
  }
}
