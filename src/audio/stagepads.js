// Барабанные пэды сцены (слово автора 22.11.2026): ударные «в пространстве» — длинное эхо и большой зал.
// Три набора (слово автора 26.11.2026): электронные (умолчание), акустические, синтез кода; сэмплы лежат в public/drums/<набор>/<пэд>_a|b.mp3
// (a — мягкий слой, b — жёсткий), грузятся один раз; пока не загружены — играет синтез. Умолчание: длинный зал, эхо выключено, сила удара 60 %.
// Синтез без сэмплов (drums.js); у каждого пэда своя доля посыла в зал и эхо (сухая бочка — почти без пространства, «мокрая» бочка,
// рим, хлопок, крэш — тонут в зале). Эхо — в долях темпа песни (пунктирная восьмая). Все узлы создаются один раз при открытии сцены
// и не переподключаются: ручки меняют только параметры плавно (принцип 3). Без DOM.
import { drumHit } from './drums.js';
import { makeSpace } from './spaces.js';

// id, голос, посыл в зал, посыл в эхо, громкость
export const PADS = [
  { id: 'kick', lane: 'kick', room: 0.08, echo: 0, vol: 1 },
  { id: 'kickw', lane: 'kick', room: 0.95, echo: 0.2, vol: 1 },
  { id: 'snare', lane: 'snare', room: 0.55, echo: 0.35, vol: 0.9 },
  { id: 'rim', lane: 'rim', room: 0.4, echo: 0.55, vol: 0.9 },
  { id: 'tom', lane: 'tom', room: 0.7, echo: 0.3, vol: 0.9 },
  { id: 'clap', lane: 'clap', room: 0.65, echo: 0.5, vol: 0.85 },
  { id: 'hat', lane: 'hat', room: 0.12, echo: 0.1, vol: 0.85 },
  { id: 'crash', lane: 'crash', room: 0.55, echo: 0.1, vol: 0.8 },
];
// Время эха: пунктирная восьмая от темпа (0,75 доли), не короче 0,12 и не длиннее 1,2 с
export const echoTime = (bpm) => Math.max(0.12, Math.min(1.2, (60 / (+bpm > 0 ? +bpm : 90)) * 0.75));

export const KITS = ['elec', 'muld', 'synth'];
export const DEF_KIT = 'elec', DEF_VEL = 0.6, DEF_SPACE = 0.6, DEF_ECHO = 0;
const defaultLoad = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error('drums ' + r.status); return r.arrayBuffer(); });
const kitUrl = (kit, id, layer) => new URL('drums/' + kit + '/' + id + '_' + layer + '.mp3', typeof document !== 'undefined' ? document.baseURI : 'http://localhost/').href;

export function createStagePads(c, out, { bpm = () => 90, space = DEF_SPACE, echo = DEF_ECHO, kit = DEF_KIT, vel = DEF_VEL, load = defaultLoad } = {}) {
  const N = { dry: c.createGain(), roomBus: c.createGain(), echoBus: c.createGain(), wet: c.createGain(), delay: c.createDelay(1.5), fb: c.createGain(), lp: c.createBiquadFilter(), echoOut: c.createGain() };
  N.dry.connect(out);
  N.wet.gain.value = 1.0; N.wet.connect(out);
  let room = null;
  try { room = makeSpace(c, 'cathedral', N.wet); N.roomBus.connect(room.input); } catch { room = null; } // нет зала — остаются сухой звук и эхо
  N.delay.delayTime.value = echoTime(bpm());
  N.lp.type = 'lowpass'; N.lp.frequency.value = 3200;
  N.fb.gain.value = 0.46; // повторы затухают, не копятся (≈ 6–7 раз)
  N.echoBus.connect(N.delay); N.delay.connect(N.lp); N.lp.connect(N.fb); N.fb.connect(N.delay); N.lp.connect(N.echoOut); N.echoOut.connect(out);
  N.roomBus.gain.value = space * 1.5; N.echoOut.gain.value = echo * 1.1;
  const pads = PADS.map((p) => {
    const input = c.createGain(), toRoom = c.createGain(), toEcho = c.createGain();
    input.gain.value = p.vol;
    toRoom.gain.value = p.room; toEcho.gain.value = p.echo;
    input.connect(N.dry); input.connect(toRoom).connect(N.roomBus); input.connect(toEcho).connect(N.echoBus);
    return { ...p, input };
  });
  const now = () => c.currentTime, lv = { space, echo, kit: KITS.includes(kit) ? kit : DEF_KIT, vel: Math.max(0.05, Math.min(1, +vel || DEF_VEL)) };
  // сэмплы набора: { 'набор/пэд_слой': AudioBuffer }; грузятся в фоне один раз, ошибка файла — этот звук остаётся синтезом
  const bufs = new Map(), loading = new Map();
  const loadKit = (k) => {
    if (k === 'synth' || loading.has(k)) return loading.get(k) || Promise.resolve();
    const job = Promise.all(PADS.flatMap((p) => ['a', 'b'].map((l) => {
      const key = k + '/' + p.id + '_' + l;
      return load(kitUrl(k, p.id, l)).then((ab) => c.decodeAudioData(ab)).then((b) => { bufs.set(key, b); }).catch(() => { /* этот звук — синтез */ });
    }))).then(() => {});
    loading.set(k, job);
    return job;
  };
  loadKit(lv.kit);
  const sample = (p) => {
    if (lv.kit === 'synth') return null;
    return { soft: bufs.get(lv.kit + '/' + p.id + '_a'), hard: bufs.get(lv.kit + '/' + p.id + '_b') };
  };
  const set = (g, v) => g.gain.setTargetAtTime(Math.max(0, Math.min(2, v)), now(), 0.03);
  return {
    // Удар по пэду i (0…7); v — сила 0…1. Ошибка одного удара не ломает остальные
    hit(i, v = lv.vel) {
      const p = pads[i];
      if (!p || c.state === 'closed') return false;
      try {
        const sm = sample(p), b = sm && (v > 0.62 ? sm.hard || sm.soft : sm.soft || sm.hard);
        if (b) { // живой или электронный сэмпл: мягкий слой до 60 %, жёсткий выше; громкость растёт с силой
          const s = c.createBufferSource(), g = c.createGain();
          s.buffer = b; g.gain.value = 0.35 + 0.65 * v;
          s.connect(g); g.connect(p.input); s.start(now());
          s.onended = () => { try { s.disconnect(); g.disconnect(); } catch { /* уже */ } };
          return true;
        }
        drumHit(c, p.input, p.lane, now(), v); return true;
      } catch { return false; }
    },
    setKit(k) { if (!KITS.includes(k)) return; lv.kit = k; loadKit(k); },
    setVel(v) { lv.vel = Math.max(0.05, Math.min(1, +v || DEF_VEL)); },
    get kit() { return lv.kit; }, get vel() { return lv.vel; },
    ready: () => lv.kit === 'synth' || PADS.every((p) => bufs.has(lv.kit + '/' + p.id + '_a')),
    // «Пространство» 0…1: уровень зала (и хвоста) для всех пэдов; «Эхо» 0…1; время эха — под темп
    setSpace(v) { lv.space = v; set(N.roomBus, v * 1.5); },
    setEcho(v) { lv.echo = v; set(N.echoOut, v * 1.1); },
    setBpm(b) { N.delay.delayTime.setTargetAtTime(echoTime(b), now(), 0.05); },
    // Тишина «сейчас»: хвосты эха и зала плавно гасятся (кнопка «стоп всё»)
    hush(sec = 1.2) { try { N.dry.gain.setTargetAtTime(0, now(), sec / 4); N.echoOut.gain.setTargetAtTime(0, now(), sec / 4); N.wet.gain.setTargetAtTime(0, now(), sec / 4); } catch { /* */ } },
    unhush() { try { N.dry.gain.setTargetAtTime(1, now(), 0.02); N.wet.gain.setTargetAtTime(1, now(), 0.02); N.echoOut.gain.setTargetAtTime(lv.echo * 1.1, now(), 0.02); } catch { /* */ } },
    get hasRoom() { return !!room; },
    dispose() { try { [N.dry, N.roomBus, N.echoBus, N.wet, N.delay, N.fb, N.lp, N.echoOut, ...pads.flatMap((p) => [p.input])].forEach((n) => n.disconnect()); } catch { /* */ } },
  };
}
