// Слой вывода (src/core/output.js, output-hooks.js): два экземпляра («телефон» A и «компьютер» B) соединены подменой
// транспорта в памяти. Проверяется: нота на одном звучит на другом, порядок, потеря кадров glide, обрыв канала —
// все голоса отпущены, дублирование со сдвигом, настройки по умолчанию не меняют поведения.
import { describe, it, expect } from 'vitest';
import { createOutput, jitterBuffer, bothDelay, playAt, CATS, TARGETS } from '../src/core/output.js';

function fakeAudio(name) {
  const log = [];
  const A = { name, log, t: 10 };
  const voices = new Map();
  A.synth = {
    on(m, key, o = {}) { A.synth.off(key, true); log.push(['on', m, key, o.bus, o.at, o.vel]); voices.set(key, m); }, // как настоящий: сначала снимает старое
    off(key, fast, at) { if (voices.delete(key)) log.push(['off', key, !!fast, at || 0]); },
    all() { log.push(['all']); voices.clear(); },
    release(key) { log.push(['rel', key]); },
    voices,
  };
  let nodes = false, over = {}; const keys = new Map(), subs = new Set();
  const changed = () => subs.forEach((f) => f());
  A.drone = {
    subscribe(f) { subs.add(f); return () => subs.delete(f); }, notify: changed,
    get on() { return nodes; }, get sounding() { return nodes || keys.size > 0; }, get chord() { return over.chord || 'fifth'; }, get held() { return new Set(keys.keys()); },
    start(o) { log.push(['pad+', o]); over = o ? { ...o } : {}; nodes = true; changed(); },
    stop(fade) { if (!nodes) return; log.push(['pad-', fade]); nodes = false; changed(); },
    swap(o) { log.push(['padswap', o]); over = o || {}; if (!nodes) { A.drone.start(o); return; } A.drone.stop(1); A.drone.start(o); },
    retune() { log.push(['retune']); },
    keyOn(pc) { log.push(['kon', pc]); keys.set(pc, 1); changed(); }, keyOff(pc) { if (keys.delete(pc)) log.push(['koff', pc]); changed(); }, keysOff() { [...keys.keys()].forEach((pc) => A.drone.keyOff(pc)); },
    vol() { log.push(['vol']); }, setReverb(x) { log.push(['rev', x]); }, setHall(x) { log.push(['hall', x]); },
  };
  A.metro = {
    cfg: { bpm: 100, num: 4 }, running: false,
    start(at) { log.push(['m+', at]); A.metro.running = true; }, stop() { if (A.metro.running) log.push(['m-']); A.metro.running = false; },
    setBpm(v) { A.metro.cfg.bpm = v; log.push(['bpm', v]); }, save() {},
  };
  const gains = [];
  A.mixer = {
    state: { metro: 1, piano: 0.9, drone: 1, audio: 1, mute: {} }, applied: 0,
    set(bus, v) { A.mixer.state[bus === 'media' ? 'audio' : bus] = v; }, toggleMute(bus) { const k = bus === 'media' ? 'audio' : bus; A.mixer.state.mute[k] = !A.mixer.state.mute[k]; },
    apply() { A.mixer.applied++; },
    bus() { return { real: true, context: { createGain: () => { const g = { dead: true }; gains.push(g); return g; } } }; },
  };
  A.gains = gains;
  A.chimed = 0; A.chime = () => { A.chimed++; };
  A.now = () => A.t;
  return A;
}

function fakeTransport() {
  const T = { handlers: new Set(), states: new Set(), connected: true, state: 'on', rtt: 40, jitter: 5, sent: [], cut: false, lossy: () => false, peer: null,
    send(f) { T.sent.push(f); if (T.cut || !T.connected) throw new Error('канал оборван'); if (f.lossy && T.lossy(f)) return; const c = JSON.parse(JSON.stringify(f)); T.peer.handlers.forEach((h) => h(c)); },
    onFrame(fn) { T.handlers.add(fn); return () => T.handlers.delete(fn); },
    onState(fn) { T.states.add(fn); return () => T.states.delete(fn); },
    now: () => 0,
    set(connected) { T.connected = connected; T.state = connected ? 'on' : 'off'; T.states.forEach((f) => f()); },
  };
  return T;
}

function rig({ enabled = true } = {}) {
  const errs = [], q = [];
  const later = (ms, fn) => { q.push({ ms, fn }); return q.length; };
  const mk = (name) => {
    const audio = fakeAudio(name), device = { drone: { pc: 9, sound: 'soft', vol: 0.7, arp: { on: false } } };
    const out = createOutput({ device, audio, enabled, later, report: (e) => errs.push(e), now: audio.now });
    return { audio, device, out };
  };
  const a = mk('телефон'), b = mk('компьютер');
  const ta = fakeTransport(), tb = fakeTransport();
  ta.peer = tb; tb.peer = ta;
  const connect = () => { a.out.attach(ta); b.out.attach(tb); };
  return { a, b, ta, tb, errs, q, connect, flush: () => { while (q.length) q.shift().fn(); } };
}

describe('чистые функции вывода', () => {
  it('буфер дрожания: двойное дрожание и запас, в пределах 20…250 мс', () => {
    expect(jitterBuffer(0)).toBeCloseTo(0.02);
    expect(jitterBuffer(5)).toBeCloseTo(0.03);
    expect(jitterBuffer(1000)).toBe(0.25);
    expect(jitterBuffer(undefined)).toBeCloseTo(0.02);
  });
  it('линейка компенсации: без сведённых часов — полпути и буфер, со сведёнными — только буфер', () => {
    expect(bothDelay({ rtt: 40, jitter: 5 })).toBeCloseTo(0.05);
    expect(bothDelay({ rtt: 40, jitter: 5 }, true)).toBeCloseTo(0.03);
    expect(bothDelay({})).toBeCloseTo(0.02);
  });
  it('когда играть: метка + буфер; опоздавшее чуть — сейчас; сильно — отбрасывается', () => {
    expect(playAt({ mapped: 10, now: 9, buf: 0.03 })).toBeCloseTo(10.03);
    expect(playAt({ mapped: undefined, now: 9, buf: 0.03 })).toBeCloseTo(9.03);
    expect(playAt({ mapped: 8.9, now: 9, buf: 0.03 })).toBe(9);
    expect(playAt({ mapped: 5, now: 9, buf: 0.03 })).toBeNull();
    expect(playAt({ mapped: 5, now: 9, buf: 0.03, stale: 1e9 })).toBe(9);
  });
  it('категории и цели — по контракту', () => {
    expect(CATS).toEqual(['sound', 'click', 'media', 'control']);
    expect(TARGETS).toEqual(['local', 'remote', 'both']);
  });
});

describe('умолчание: всё у себя', () => {
  it('цели — local, звук идёт напрямую, транспорта нет', () => {
    const { a } = rig();
    CATS.forEach((c) => expect(a.out.get(c)).toBe('local'));
    expect(a.out.state.link).toBe('off');
    a.audio.synth.on(60, 'k1', { bus: 'piano' });
    expect(a.audio.log).toEqual([['on', 60, 'k1', 'piano', undefined, undefined]]);
  });
  it('цель remote без связи — запасной ход: играет у себя', () => {
    const { a } = rig();
    a.out.set('sound', 'remote');
    a.audio.synth.on(60, 'k1', { bus: 'piano' });
    expect(a.audio.log[0][0]).toBe('on');
  });
  it('выключенный слой (не DEV) не ставит обёрток и всегда local', () => {
    const { a } = rig({ enabled: false });
    a.out.set('sound', 'remote');
    expect(a.out.get('sound')).toBe('local');
    expect(a.audio.drone.local).toBeUndefined();
  });
  it('цели хранятся в device.output и переживают пересоздание; устройство-цель', () => {
    const { a, device } = { a: rig().a, device: null };
    a.out.set('click', 'both');
    a.out.target = { key: 'pc1', name: 'Компьютер' };
    expect(a.device.output.click).toBe('both');
    const audio = fakeAudio('x');
    const again = createOutput({ device: a.device, audio, now: audio.now });
    expect(again.get('click')).toBe('both');
    expect(again.target).toEqual({ key: 'pc1', name: 'Компьютер' });
    expect(device).toBeNull();
  });
  it('неверные значения не принимаются', () => {
    const { a } = rig();
    a.out.set('sound', 'везде'); a.out.set('нет', 'remote');
    expect(a.out.get('sound')).toBe('local');
  });
});

describe('ноты: телефон → компьютер', () => {
  it('нота звучит на удалённом, у себя — нет; отпускание доходит; порядок сохранён', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote');
    r.a.audio.synth.on(60, 'a', { bus: 'piano', vel: 0.9 });
    r.a.audio.synth.on(64, 'b', { bus: 'piano' });
    r.a.audio.synth.off('a');
    expect(r.a.audio.log).toEqual([]); // у себя не играли
    const L = r.b.audio.log;
    expect(L.map((x) => x[0] + ':' + (x[2] || x[1]))).toEqual(['on:~a', 'on:~b', 'off:~a']);
    expect(L[0][3]).toBe('piano');
    expect(L[0][5]).toBeCloseTo(0.9);
    expect(L[0][4]).toBeGreaterThanOrEqual(10.03 - 1e-9); // не раньше прихода + буфер дрожания
  });
  it('шины вне категории sound не уходят (looper, notes), а метроном — категория click', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote');
    r.a.audio.synth.on(60, 'x', { bus: 'looper' });
    expect(r.a.audio.log.length).toBe(1);
    expect(r.b.audio.log).toEqual([]);
  });
  it('нота с узлом назначения (арпеджиатор) остаётся у себя', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote');
    r.a.audio.synth.on(60, 'arp1', { bus: 'drone', out: {} });
    expect(r.a.audio.log.length).toBe(1);
    expect(r.b.audio.log).toEqual([]);
  });
  it('both: играет и там, и тут; местная копия сдвинута на оценку задержки', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'both');
    r.a.audio.synth.on(60, 'a', { bus: 'piano' });
    expect(r.a.audio.log[0][4]).toBeCloseTo(10 + 0.05); // часы не сведены: полпути (20 мс) + буфер (30 мс)
    expect(r.b.audio.log[0][2]).toBe('~a');
    r.a.audio.synth.off('a');
    const off = r.a.audio.log.find((x) => x[0] === 'off');
    expect(off[3]).toBeCloseTo(10.05);
  });
  it('удалённых голосов не больше предела', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote');
    for (let i = 0; i < 40; i++) r.a.audio.synth.on(40 + (i % 40), 'k' + i, { bus: 'piano' });
    expect(r.b.audio.synth.voices.size).toBeLessThanOrEqual(32);
  });
  it('чужая шина и мусор в кадре не играют', () => {
    const r = rig(); r.connect();
    r.b.out.receive({ c: 'sound', e: 'on', k: 'z', i: 'looper', m: 60 });
    r.b.out.receive({ c: 'sound', e: 'on', k: 'z', i: 'piano', m: 9999 });
    r.b.out.receive(null); r.b.out.receive('x'); r.b.out.receive({ c: '???', e: '!!!' });
    expect(r.b.audio.log).toEqual([]);
  });
  it('ошибка обработчика одного события не роняет остальные', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote');
    let first = true;
    const on0 = r.b.audio.synth.on;
    r.b.audio.synth.on = (...a) => { if (first) { first = false; throw new Error('сбой движка'); } return on0(...a); };
    r.a.audio.synth.on(60, 'a', { bus: 'piano' });
    r.a.audio.synth.on(62, 'b', { bus: 'piano' });
    expect(r.errs.length).toBe(1);
    expect(r.b.audio.log.map((x) => x[2])).toContain('~b');
  });
});

describe('пэды и арпеджиатор', () => {
  it('пэд remote: у себя не звучит, но интерфейс видит «играет»; арпеджиатор у себя молчит (drone.local.on)', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote');
    r.a.audio.drone.start({ chord: 'maj' });
    expect(r.a.audio.log).toEqual([]);
    expect(r.a.audio.drone.on).toBe(true);
    expect(r.a.audio.drone.local.on).toBe(false);
    expect(r.a.audio.drone.chord).toBe('maj');
    expect(r.b.audio.log[0]).toEqual(['pad+', { chord: 'maj' }]);
    expect(r.b.device.drone.arp).toEqual({ on: false });
    r.a.audio.drone.stop(1.5);
    expect(r.a.audio.drone.on).toBe(false);
    expect(r.b.audio.log.at(-1)).toEqual(['pad-', 1.5]);
  });
  it('настройки пэда уезжают на удалённое и возвращаются при остановке; на диск не пишутся', () => {
    const r = rig(); r.connect();
    r.b.device.drone.pc = 2;
    r.a.out.set('sound', 'remote');
    r.a.device.drone.pc = 5; r.a.device.drone.arp = { on: true, style: 'up' };
    r.a.audio.drone.start();
    expect(r.b.device.drone.pc).toBe(5);
    expect(r.b.device.drone.arp).toEqual({ on: true, style: 'up' });
    r.a.audio.drone.stop();
    r.b.out.receive({ c: 'sound', e: 'pad-' });
    expect(r.b.device.drone.pc).toBe(2);
  });
  it('смена тональности (swap) и громкость идут на удалённое', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote');
    r.a.audio.drone.start();
    r.a.audio.drone.swap({ chord: 'min' });
    r.a.audio.drone.vol();
    const names = r.b.audio.log.map((x) => x[0]);
    expect(names).toContain('padswap');
    expect(names).toContain('vol');
    expect(r.a.audio.log).toEqual([]);
  });
  it('both: пэд и у себя (со сдвигом), и там; остановка — тоже; swap у себя не шлёт лишнего pad-', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'both');
    r.a.audio.drone.start();
    expect(r.a.audio.log).toEqual([]); // сдвинут
    r.flush();
    expect(r.a.audio.log[0][0]).toBe('pad+');
    r.a.audio.drone.swap({ chord: 'maj' });
    r.flush();
    const sent = r.ta.sent.filter((f) => f.e === 'pad-');
    expect(sent.length).toBe(0); // внутренние stop/start оригинала swap не пересылаются
    expect(r.a.audio.drone.on).toBe(true);
  });
  it('клавиши пэдов (режим пианино)', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote');
    r.a.audio.drone.keyOn(4);
    expect([...r.a.audio.drone.held]).toEqual([4]);
    expect(r.b.audio.log).toEqual([['kon', 4]]);
    r.a.audio.drone.keysOff();
    expect(r.b.audio.log.at(-1)).toEqual(['koff', 4]);
    expect(r.a.audio.drone.held.size).toBe(0);
  });
});

describe('метроном и сигналы', () => {
  it('click remote: у себя метроном идёт (экран, вспышка), но шина — тупиковый узел; там запускается со своей сеткой', () => {
    const r = rig(); r.connect();
    r.a.out.set('click', 'remote');
    const real = r.a.audio.mixer.bus('piano');
    expect(real.real).toBe(true);
    expect(r.a.audio.mixer.bus('metro').dead).toBe(true);
    expect(r.a.audio.mixer.bus('metro')).toBe(r.a.audio.mixer.bus('metro')); // узел создан один раз
    r.a.audio.metro.start();
    expect(r.a.audio.metro.running).toBe(true);
    const m = r.b.audio.log.find((x) => x[0] === 'm+');
    expect(m[1]).toBeCloseTo(10.03); // часы не сведены: по приходу + буфер дрожания
    expect(r.b.audio.metro.cfg).toEqual({ bpm: 100, num: 4 });
    r.a.audio.metro.setBpm(120);
    expect(r.b.audio.metro.cfg.bpm).toBe(120);
    r.a.audio.metro.stop();
    expect(r.b.audio.metro.running).toBe(false);
  });
  it('настройки метронома компьютера возвращаются после остановки', () => {
    const r = rig(); r.connect();
    r.b.audio.metro.cfg.bpm = 60;
    r.a.out.set('click', 'remote');
    r.a.audio.metro.cfg.bpm = 140;
    r.a.audio.metro.start(); r.a.audio.metro.stop();
    expect(r.b.audio.metro.cfg.bpm).toBe(60);
  });
  it('шина метронома у себя обычная, пока цель local или both', () => {
    const r = rig(); r.connect();
    expect(r.a.audio.mixer.bus('metro').real).toBe(true);
    r.a.out.set('click', 'both');
    expect(r.a.audio.mixer.bus('metro').real).toBe(true);
    r.a.audio.metro.start();
    expect(r.a.audio.log.find((x) => x[0] === 'm+')[1]).toBeCloseTo(10.08 + 0.05);
  });
  it('сигнал окончания (chime) — по цели', () => {
    const r = rig(); r.connect();
    r.a.out.set('click', 'remote');
    r.a.audio.chime();
    expect(r.a.audio.chimed).toBe(0);
    expect(r.b.audio.chimed).toBe(1);
  });
});

describe('параметры (control)', () => {
  it('громкость шины уходит и применяется там; свои значения возвращаются при обрыве', () => {
    const r = rig(); r.connect();
    r.a.out.set('control', 'remote');
    r.a.audio.mixer.set('piano', 0.4);
    r.a.audio.mixer.toggleMute('media');
    expect(r.b.audio.mixer.state.piano).toBe(0.4);
    expect(r.b.audio.mixer.state.mute.audio).toBe(true);
    expect(r.b.audio.mixer.applied).toBeGreaterThan(0);
    r.ta.set(false); r.tb.set(false);
    expect(r.b.audio.mixer.state.piano).toBe(0.9);
    expect(r.b.audio.mixer.state.mute.audio).toBe(false);
  });
  it('значение вне пределов обрезается', () => {
    const r = rig(); r.connect();
    r.b.out.receive({ c: 'control', e: 'mix', b: 'piano', v: 99 });
    expect(r.b.audio.mixer.state.piano).toBe(1.5);
    r.b.out.receive({ c: 'control', e: 'mix', b: 'неизвестная', v: 1 });
  });
});

describe('обрыв канала', () => {
  it('удалённые голоса, пэд и метроном отпущены, настройки возвращены', () => {
    const r = rig(); r.connect();
    r.b.device.drone.pc = 3;
    r.a.out.set('sound', 'remote'); r.a.out.set('click', 'remote');
    r.a.audio.synth.on(60, 'a', { bus: 'piano' });
    r.a.audio.synth.on(64, 'b', { bus: 'theory' });
    r.a.audio.drone.start();
    r.a.audio.drone.keyOn(2);
    r.a.audio.metro.start();
    expect(r.b.audio.synth.voices.size).toBe(2);
    r.b.audio.log.length = 0;
    r.tb.set(false); // компьютер видит обрыв
    const L = r.b.audio.log.map((x) => x[0]);
    expect(L.filter((x) => x === 'off').length).toBe(2);
    expect(L).toContain('pad-');
    expect(L).toContain('m-');
    expect(r.b.audio.synth.voices.size).toBe(0);
    expect(r.b.device.drone.pc).toBe(3);
    expect(r.b.out.rx.voices.size).toBe(0);
    expect(r.b.out.state.link).toBe('off');
  });
  it('у передающего при обрыве пэд и метроном продолжаются у себя (тишины на сцене не бывает)', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote'); r.a.out.set('click', 'remote');
    r.a.audio.drone.start({ chord: 'min' });
    r.a.audio.metro.start(); r.a.audio.metro.stop(); r.a.audio.metro.start();
    r.a.audio.log.length = 0;
    r.ta.set(false);
    expect(r.a.audio.log.some((x) => x[0] === 'pad+' && x[1].chord === 'min')).toBe(true);
    expect(r.a.audio.drone.local.on).toBe(true);
    expect(r.a.out.effective('sound')).toBe('local');
    r.a.audio.synth.on(60, 'x', { bus: 'piano' });
    expect(r.a.audio.log.at(-1)[0]).toBe('on'); // новая нота — у себя
  });
  it('обрыв сообщает транспорт не вызовом: периодическая проверка находит его сама', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote');
    r.b.audio.synth.voices.set('~q', 60); r.b.out.rx.voices.set('~q', 'piano');
    r.tb.connected = false; // без onState
    r.b.out.check();
    expect(r.b.out.rx.voices.size).toBe(0);
  });
  it('канал оборван в момент отправки — исключение гасится, звук у себя не страдает', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'both');
    r.ta.cut = true; // send бросает, а состояние ещё «on»
    expect(() => r.a.audio.synth.on(60, 'a', { bus: 'piano' })).not.toThrow();
    expect(r.a.audio.log.at(-1)[0]).toBe('on');
    expect(r.errs.length).toBeGreaterThan(0);
  });
  it('переподключение: снимок приводит удалённое состояние к присланному', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote');
    // на компьютере «зависли» голос и пэд; телефон шлёт снимок, где их нет, а есть другая нота
    r.b.audio.synth.on(50, '~old', { bus: 'piano' }); r.b.out.rx.voices.set('~old', 'piano');
    r.b.out.rx.pad = true;
    r.b.out.receive({ c: 'sync', e: 'sync', sound: { notes: [{ k: 'new', i: 'piano', m: 70 }], pad: null, pk: [] } });
    expect(r.b.audio.synth.voices.has('~old')).toBe(false);
    expect(r.b.audio.synth.voices.has('~new')).toBe(true);
    expect(r.b.out.rx.pad).toBe(false);
  });
  it('при подключении телефон сам шлёт снимок: что звучит и какой темп', () => {
    const r = rig();
    r.ta.connected = false;
    r.a.out.attach(r.ta); r.b.out.attach(r.tb);
    r.a.out.set('sound', 'remote'); r.a.out.set('click', 'remote');
    r.a.audio.metro.cfg.bpm = 88;
    r.ta.set(true); r.tb.set(true);
    expect(r.ta.sent.some((f) => f.c === 'sync')).toBe(true);
    const sync = r.ta.sent.find((f) => f.c === 'sync');
    expect(sync.sound.notes).toEqual([]);
    expect(sync.click.metro).toBeNull();
  });
});

describe('смена цели на ходу', () => {
  it('local → remote: звучащий пэд и метроном переезжают, у себя стихают; remote → local — возвращаются', () => {
    const r = rig(); r.connect();
    r.a.audio.drone.start({ chord: 'maj' });
    r.a.audio.metro.start();
    r.a.audio.log.length = 0;
    r.a.out.set('sound', 'remote'); r.a.out.set('click', 'remote');
    expect(r.a.audio.log.some((x) => x[0] === 'pad-')).toBe(true);
    expect(r.b.audio.log.some((x) => x[0] === 'pad+')).toBe(true);
    expect(r.b.audio.log.some((x) => x[0] === 'm+')).toBe(true);
    r.a.audio.log.length = 0;
    r.a.out.set('sound', 'local'); r.a.out.set('click', 'local');
    expect(r.a.audio.log.some((x) => x[0] === 'pad+')).toBe(true); // продолжает у себя
    expect(r.b.audio.log.some((x) => x[0] === 'pad-')).toBe(true);
    expect(r.b.audio.log.some((x) => x[0] === 'm-')).toBe(true);
  });
  it('удержанные ноты при возврате на local отпускаются на удалённом', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote');
    r.a.audio.synth.on(60, 'a', { bus: 'piano' });
    r.a.out.set('sound', 'local');
    expect(r.b.audio.synth.voices.size).toBe(0);
    expect(r.a.out.sh.held.size).toBe(0);
  });
});

describe('glide: частые кадры, «последний побеждает»', () => {
  it('кадры схлопываются в один на тик; потеря кадров не страшна; опоздавший отбрасывается', () => {
    const r = rig(); r.connect();
    r.a.out.set('sound', 'remote');
    const got = [];
    r.b.out.onGlide((id, p, end) => got.push([id, p, end]));
    expect(r.a.out.glide('g1', { y: 1 })).toBe(true);
    r.a.out.glide('g1', { y: 2 }); r.a.out.glide('g1', { y: 3 });
    r.flush();
    expect(got).toEqual([['g1', { y: 3 }, false]]);
    // потеря кадра: транспорт теряет каждый lossy — ничего не ломается, следующий приходит
    let n = 0; r.ta.lossy = () => (n++ % 2 === 0);
    r.a.out.glide('g1', { y: 4 }); r.flush();
    r.a.out.glide('g1', { y: 5 }); r.flush();
    expect(got.at(-1)).toEqual(['g1', { y: 5 }, false]);
    expect(got.length).toBe(2);
    // кадр с меньшим номером, пришедший позже, игнорируется
    const last = r.ta.sent.at(-1);
    r.b.out.receive({ c: 'sound', e: 'g', i: 'g1', p: { y: 0 }, s: last.s - 1 });
    expect(got.at(-1)[1]).toEqual({ y: 5 });
    r.a.out.glideEnd('g1');
    expect(got.at(-1)).toEqual(['g1', null, true]);
  });
  it('цель local: glide не уходит и не перехватывает управление', () => {
    const r = rig(); r.connect();
    expect(r.a.out.glide('g', { y: 1 })).toBe(false);
    expect(r.ta.sent.length).toBe(0);
  });
  it('обрыв канала прекращает glide у принимающего', () => {
    const r = rig(); r.connect();
    const got = [];
    r.b.out.onGlide((id, p, end) => got.push([id, end]));
    r.tb.set(false);
    expect(got).toEqual([[null, true]]);
  });
});

describe('движки пульта и плеера (share)', () => {
  const engine = () => { const e = { calls: [], press(p) { e.calls.push(['press', p]); return 'play'; }, stopAll() { e.calls.push(['stopAll']); }, stray() {} }; return e; };
  it('метод уходит по цели категории; у себя — только при local/both; ret при remote', () => {
    const r = rig(); r.connect();
    const ea = engine(), eb = engine(); let dropped = 0;
    r.a.out.share('sound', 'show.pads', ea, ['press', 'stopAll'], { ret: { press: 'play' } });
    r.b.out.share('sound', 'show.pads', eb, ['press', 'stopAll'], { drop: () => { dropped++; } });
    expect(ea.press({ id: 1 })).toBe('play');
    expect(ea.calls.length).toBe(1);            // local: у себя
    expect(eb.calls.length).toBe(0);
    r.a.out.set('sound', 'remote');
    expect(ea.press({ id: 2, file: 'f' })).toBe('play');
    expect(ea.calls.length).toBe(1);            // не звучит у себя
    expect(eb.calls).toEqual([['press', { id: 2, file: 'f' }]]);
    r.a.out.set('sound', 'both');
    ea.stopAll(); r.flush();
    expect(ea.calls.at(-1)).toEqual(['stopAll']);
    expect(eb.calls.at(-1)).toEqual(['stopAll']);
    r.tb.set(false);
    expect(dropped).toBe(1);                    // при обрыве удалённый движок глушится
  });
  it('метод вне списка принять нельзя; без зарегистрированного движка кадр игнорируется', () => {
    const r = rig(); r.connect();
    const eb = engine();
    r.b.out.share('sound', 'show.pads', eb, ['press']);
    r.b.out.receive({ c: 'sound', e: 'x', n: 'show.pads', f: 'stray', a: [] });
    r.b.out.receive({ c: 'sound', e: 'x', n: 'нет-такого', f: 'press', a: [] });
    expect(eb.calls).toEqual([]);
  });
  it('категория media: смена на local глушит удалённое (halt)', () => {
    const r = rig(); r.connect();
    const eb = engine(); let dropped = 0;
    r.b.out.share('media', 'show.deck', eb, ['press'], { drop: () => { dropped++; } });
    r.a.out.set('media', 'remote');
    r.a.out.set('media', 'local');
    expect(dropped).toBe(1);
  });
});

describe('безопасность кадров', () => {
  it('ключи прототипа в присланных настройках не попадают в объект', () => {
    const r = rig(); r.connect();
    r.b.out.receive(JSON.parse('{"c":"sound","e":"pad+","set":{"__proto__":{"evil":1},"pc":4}}'));
    expect(({}).evil).toBeUndefined();
    expect(r.b.device.drone.pc).toBe(4);
  });
});

describe('сведённые часы (linkclock)', () => {
  it('метка отправителя переводится в местные часы; both сдвигает копию только на буфер', () => {
    const r = rig();
    r.tb.clock = { toRemote: (t) => t - 100, toLocal: (t) => t + 100 }; // часы компьютера на 100 с впереди телефона
    r.ta.clock = { toRemote: (t) => t + 100, toLocal: (t) => t - 100 };
    r.connect();
    r.b.audio.t = 110.01;
    r.a.out.set('sound', 'both');
    r.a.audio.synth.on(60, 'a', { bus: 'piano' });
    expect(r.a.audio.log[0][4]).toBeCloseTo(10.03); // сведено: только буфер
    expect(r.b.audio.log[0][4]).toBeCloseTo(110.03); // метка 10 → 110 по часам компьютера + буфер
  });
});
