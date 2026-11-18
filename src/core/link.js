// Канал событий в реальном времени (Melete DEV): постоянное двустороннее соединение телефон ↔ компьютер поверх
// того же закреплённого TLS, что и синхронизация (docs/link.md, docs/tech/connect.md «Канал событий»).
// Здесь — логика связи без платформы: рукопожатие, пинг, часы, буфер дрожания, автопереподключение. Платформа
// (Android: LinkPlugin.java, компьютер: src-tauri/src/link.rs) подаётся «транспортом»; он отдаёт и принимает
// уже разобранные кадры. Платформенные транспорты и общий узел — linkhub.js; формат кадров — linkframe.js.
//
// Транспорт: { send(type, payload: Uint8Array): void, close(): void, auth?(ok: boolean): void }.
// Кадры от него в связь подаёт тот, кто его создал, через обработчики, которые выдают connect(h) / accept(tr):
// h.frame(type, payload), h.close(reason).
import { T, VERSION, isApp, isEvent, packJson, unpackJson, packPing, unpackPing, packPong, unpackPong, packEvent, unpackEvent } from './linkframe.js';
import { createClock } from './linkclock.js';
import { createJitter } from './linkjitter.js';

export const PING_EVERY = 2000;     // пинг каждые 2 с
export const DEAD_AFTER = 7000;     // тишина дольше — соединение мёртвое (три пропущенных пинга)
export const HANDSHAKE_MS = 5000;
export const BURST = 16, BURST_GAP = 60; // при открытии — 16 быстрых обменов: часы сверены с первой секунды
export const FATAL = new Set(['key', 'version', 'pin', 'busy']); // повторять бесполезно: нужно сопряжение заново

export const defaultNow = () => (typeof performance !== 'undefined' ? performance.timeOrigin + performance.now() : Date.now());
// Пауза перед n-й повторной попыткой: 0,25 → 0,5 → 1 → 2 → 4 → 8 с и дальше 8 с (rnd — доля случайного разброса)
export const backoff = (n, rnd = 0) => Math.round(Math.min(8000, 250 * 2 ** Math.max(0, n)) * (1 + 0.2 * rnd));

const st = (f, ms) => globalThis.setTimeout(f, ms);
const ct = (id) => globalThis.clearTimeout(id);
const safe = (fn, ...a) => { try { fn(...a); } catch (e) { (globalThis.reportError || console.error)(e); } };

// role 'client' — открывает соединение (connect), сам переподключается; 'server' — принимает готовое (accept).
// cfg: { role, name, key, connect(h) → Promise<transport>, check(hello) → { name } | null, now, pingEvery, jitter }
export function createLink(cfg = {}) {
  const role = cfg.role || 'client', now = cfg.now || defaultNow, pingEvery = cfg.pingEvery || PING_EVERY;
  const clock = createClock(), jit = createJitter(cfg.jitter);
  const subs = new Set(), frameSubs = new Set(), eventSubs = new Set();
  let state = 'idle', err = '', peer = null, want = false, attempts = 0, nextAt = 0;
  let sid = 0, tr = null, hsT = 0, pingT = 0, retryT = 0, lastRx = 0, seq = 0;
  let pend = new Map(), waits = new Map(), stat = { sent: 0, got: 0, rtt: 0, last: 0 };

  const emit = () => subs.forEach((fn) => safe(fn, state));
  const set = (s, e = '') => { state = s; err = e; emit(); };
  const clearAll = () => { ct(hsT); ct(pingT); ct(retryT); hsT = pingT = retryT = 0; };

  function drop(id, reason, fatal = false) {
    if (id !== sid) return;
    sid++;
    clearAll();
    const t = tr; tr = null;
    if (t) safe(() => t.close());
    pend.clear();
    waits.forEach((w) => { ct(w.t); w.reject(new Error(reason)); }); waits.clear();
    peer = null; clock.reset(); jit.reset();
    if (fatal || FATAL.has(reason)) { want = false; set('failed', reason); return; }
    if (role === 'client' && want) {
      const d = backoff(attempts++, Math.random());
      nextAt = now() + d;
      set('retry', reason);
      retryT = st(() => { retryT = 0; attempt(); }, d);
    } else set('idle', reason === 'closed' ? '' : reason);
  }

  function raw(type, payload) {
    if (!tr) return false;
    try { tr.send(type, payload); return true; } catch (e) { drop(sid, 'net'); return false; }
  }

  function sendPing(id) {
    if (id !== sid || !tr) return 0;
    const n = ++seq >>> 0, t0 = now();
    pend.set(n, t0);
    if (pend.size > 32) pend.delete(pend.keys().next().value);
    stat.sent++;
    raw(T.PING, packPing(n, t0));
    return n;
  }

  function opened(id) {
    ct(hsT); hsT = 0;
    attempts = 0; lastRx = now();
    set('open');
    for (let k = 0; k < BURST; k++) st(() => sendPing(id), k * BURST_GAP);
    pingT = globalThis.setInterval(() => {
      if (id !== sid) return;
      if (now() - lastRx > DEAD_AFTER) { drop(id, 'timeout'); return; }
      sendPing(id);
    }, pingEvery);
  }

  function onFrame(id, type, payload) {
    if (id !== sid) return;
    const a = now();
    lastRx = a;
    if (type === T.PING) {
      const p = unpackPing(payload);
      if (p && state === 'open') raw(T.PONG, packPong(p.seq, p.t0, a, now()));
    } else if (type === T.PONG) {
      const p = unpackPong(payload), t3 = a;
      if (!p || !pend.has(p.seq)) return;
      pend.delete(p.seq);
      const est = clock.add(p.t0, p.t1, p.t2, t3);
      const rtt = (t3 - p.t0) - (p.t2 - p.t1);
      stat.got++; stat.last = rtt; stat.rtt = stat.rtt ? stat.rtt * 0.8 + rtt * 0.2 : rtt;
      const w = waits.get(p.seq);
      if (w) { ct(w.t); waits.delete(p.seq); w.resolve(rtt); }
      if (est) subs.forEach((fn) => safe(fn, state));
    } else if (type === T.HELLO && role === 'server' && state === 'connecting') {
      const j = unpackJson(payload) || {};
      if ((j.v | 0) !== VERSION) { raw(T.ERROR, packJson({ code: 'version' })); if (tr && tr.auth) safe(() => tr.auth(false)); drop(id, 'version', true); return; }
      const who = cfg.check ? cfg.check(j) : { name: j.name || '' };
      if (!who) { raw(T.ERROR, packJson({ code: 'key' })); if (tr && tr.auth) safe(() => tr.auth(false)); drop(id, 'key', true); return; }
      peer = { name: who.name || j.name || '' };
      if (tr && tr.auth) safe(() => tr.auth(true));
      raw(T.WELCOME, packJson({ v: VERSION, name: cfg.name || '' }));
      opened(id);
    } else if (type === T.WELCOME && role === 'client' && state === 'connecting') {
      const j = unpackJson(payload) || {};
      peer = { name: j.name || '' };
      opened(id);
    } else if (type === T.ERROR) {
      const j = unpackJson(payload) || {};
      drop(id, String(j.code || 'proto'), FATAL.has(j.code));
    } else if (type === T.BYE) {
      drop(id, 'closed');
    } else if (isApp(type) && state === 'open') {
      frameSubs.forEach((fn) => safe(fn, type, payload));
      if (isEvent(type)) {
        const e = unpackEvent(payload);
        if (!e) return;
        const local = clock.ready() ? clock.toLocal(e.ts) : a, m = jit.observe(a, local);
        eventSubs.forEach((fn) => safe(fn, type, e.data, { ts: e.ts, at: m.at, late: m.late, delay: a - local }));
      }
    }
  }

  const handlers = (id) => ({ frame: (type, payload) => onFrame(id, type, payload), close: (reason) => drop(id, reason || 'net') });

  async function attempt() {
    if (!want || role !== 'client') return;
    const id = ++sid;
    set('connecting');
    let t;
    try { t = await cfg.connect(handlers(id)); }
    catch (e) { drop(id, (e && e.reason) || 'net', !!(e && (e.reason === 'pin' || e.reason === 'key'))); return; }
    if (id !== sid) { safe(() => t.close()); return; }
    tr = t;
    lastRx = now();
    hsT = st(() => drop(id, 'timeout'), HANDSHAKE_MS);
    raw(T.HELLO, packJson({ v: VERSION, key: cfg.key || '', name: cfg.name || '' }));
  }

  return {
    role, clock, jitter: jit,
    get state() { return state; },
    get error() { return err; },
    get peer() { return peer; },
    get isOpen() { return state === 'open'; },
    // клиент: открыть и держать открытым (сам переподключается)
    open() {
      if (role !== 'client') return;
      want = true;
      if (state === 'connecting' || state === 'open' || state === 'retry') return;
      attempts = 0; attempt();
    },
    // сервер: принять соединение; → обработчики { frame, close } для того, кто читает сокет
    accept(transport) {
      if (role !== 'server') throw new Error('role');
      const id = ++sid;
      tr = transport; lastRx = now();
      set('connecting');
      hsT = st(() => drop(id, 'timeout'), HANDSHAKE_MS);
      return handlers(id);
    },
    close() {
      want = false;
      if (tr && state === 'open') raw(T.BYE, new Uint8Array(0));
      if (state === 'failed') { set('idle'); return; }
      drop(sid, 'closed');
    },
    // Прикладной кадр (0x20–0xFE) как есть; false — канал не открыт
    send(type, payload = new Uint8Array(0)) {
      if (!isApp(type)) throw new RangeError('type');
      return state === 'open' && raw(type, payload);
    },
    // Событие (0x20–0x7F): в начало нагрузки — время отправителя; приёмник пересчитает его в свои часы
    sendEvent(type, data = new Uint8Array(0)) {
      if (!isEvent(type)) throw new RangeError('type');
      return state === 'open' && raw(type, packEvent(now(), data));
    },
    // Один обмен по каналу → Promise<круг, мс> (для проверки связи); отказ — канал закрыт или ответ не пришёл за 2 с
    ping(timeout = 2000) {
      return new Promise((resolve, reject) => {
        if (state !== 'open') { reject(new Error('closed')); return; }
        const n = sendPing(sid);
        if (!n) { reject(new Error('closed')); return; }
        waits.set(n, { resolve, reject, t: st(() => { waits.delete(n); reject(new Error('timeout')); }, timeout) });
      });
    },
    onFrame(fn) { frameSubs.add(fn); return () => frameSubs.delete(fn); },
    onEvent(fn) { eventSubs.add(fn); return () => eventSubs.delete(fn); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    // Сведения для экрана и отладки
    info() {
      const c = clock.estimate();
      return { state, error: err, peer, rtt: stat.rtt, lastRtt: stat.last, offset: c.offset, clockSpread: clock.spread(), clockReady: clock.ready(), sent: stat.sent, got: stat.got, lost: Math.max(0, stat.sent - stat.got - pend.size), jitter: jit.stats(), attempts, retryIn: state === 'retry' ? Math.max(0, nextAt - now()) : 0 };
    },
    // Событие, пришедшее с меткой ts (часы другого устройства) → когда играть у себя (мс, свои часы)
    playAt(ts) { return (clock.ready() ? clock.toLocal(ts) : now()) + jit.ahead(); },
  };
}
