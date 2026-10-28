// Звуки General MIDI из банка SONiVOX (sf2.js): 128 инструментов (бас, гитары, струнные, духовые…) и наборы ударных —
// для дорожек студии. Банк грузится один раз по первому требованию (1,3 МБ, в сборке), сэмпл → AudioBuffer один раз
// на контекст (свой у офлайн-сведения). Голос: запись с петлёй, высота — скорость, огибающая громкости банка
// (задержка, атака, удержание, спад, уровень, отпускание), фильтр и панорама зоны. Без DOM.
import { parseSf2, zonesFor, presetOf, pitchOf, addrOf, tcSec, cbGain, G } from './sf2.js';
import SF2_URL from '@coderline/alphatab/soundfont/sonivox.sf2?url';

let bank = null, loading = null;
// Загрузить банк (повторный вызов — то же обещание); → банк или null
export function loadGM(url = SF2_URL) {
  if (bank) return Promise.resolve(bank);
  if (!loading) loading = fetch(url).then((r) => { if (!r.ok) throw new Error('gm ' + r.status); return r.arrayBuffer(); }).then((b) => (bank = parseSf2(b))).catch((e) => { loading = null; throw e; });
  return loading;
}
export const gmReady = () => !!bank;
export const gmBank = () => bank;
// Для тестов: банк из готового буфера
export const setGMBank = (b) => { bank = b; };

// Семейства GM (по 8 программ) — для выбора звука; названия программ — из банка
export const FAMILIES = ['piano', 'chromatic', 'organ', 'guitar', 'bass', 'strings', 'ensemble', 'brass', 'reed', 'pipe', 'synthLead', 'synthPad', 'synthFx', 'ethnic', 'percussive', 'fx'];
// Ряды ударных студии → ноты набора GM
export const DRUM_NOTES = { kick: 36, snare: 38, hat: 42, ohat: 46, clap: 39 };
export const KITS = [0, 8, 32, 40]; // Standard, Room, Jazz, Brush
export const programName = (p) => { const x = bank && presetOf(bank, 0, p); return x ? x.name : 'GM ' + (p + 1); };
export const kitName = (k) => { const x = bank && bank.presets.find((q) => q.bank === 128 && q.program === k); return x ? x.name : 'Kit ' + k; };

const bufCache = new WeakMap(); // контекст → Map(индекс сэмпла → AudioBuffer)
function bufferOf(c, sample) {
  let m = bufCache.get(c);
  if (!m) bufCache.set(c, (m = new Map()));
  const i = bank.samples.indexOf(sample);
  let b = m.get(i);
  if (!b) {
    const n = Math.max(1, sample.end - sample.start), rate = Math.max(3000, Math.min(192000, sample.rate || 22050));
    b = c.createBuffer(1, n, rate);
    const d = b.getChannelData(0), src = bank.pcm;
    for (let k = 0; k < n; k++) d[k] = (src[sample.start + k] || 0) / 32768;
    m.set(i, b);
  }
  return b;
}

// Движок голосов на контексте c. opts.after(ms, fn) / cancel — часы (живой звук — clock.js, сведение — свои)
export function createGM({ after = (ms, fn) => setTimeout(fn, ms), cancel = clearTimeout } = {}) {
  const voices = new Map(); // ключ → [{ src, g, rel, levelAt }] — звучащие и ещё не отпущенные
  const alive = new Set(); // все голоса до отключения (и отпущенные заранее — планировщик): стоп транспорта глушит и их
  const drop = (v) => { alive.delete(v); try { v.g.disconnect(); } catch { /* */ } };
  const MAXV = 48;
  let order = [];
  const kill = (key, t, fast) => {
    const vs = voices.get(key);
    if (!vs) return;
    voices.delete(key); order = order.filter((k) => k !== key);
    vs.forEach((v) => {
      const c = v.g.context, at = Math.max(c.currentTime, t || 0), r = fast ? 0.02 : v.rel;
      try {
        v.g.gain.cancelScheduledValues(at);
        v.g.gain.setValueAtTime(v.levelAt(at), at);
        v.g.gain.setTargetAtTime(0, at, Math.max(0.005, r / 5));
        v.src.stop(at + r + 0.05);
      } catch { /* */ }
      cancel(v.tm);
      v.tm = after((at - c.currentTime + r + 0.2) * 1000, () => drop(v));
    });
  };
  const api = {
    // Нота: program — программа GM (0…127), drums — номер набора ударных (банк 128); out — узел дорожки; at — время;
    // vel 0…1; dur — если известна длина (планировщик), отпускание ставится сразу и точно
    on(c, m, key, { program = 0, drums = null, out, vel = 0.8, at = 0, dur = 0 } = {}) {
      if (!bank || !c || !out) return false;
      kill(key, 0, true);
      while (order.length >= MAXV) kill(order[0], 0, true);
      const preset = drums != null ? presetOf(bank, 128, drums) : presetOf(bank, 0, program);
      const v127 = Math.max(1, Math.min(127, Math.round(vel * 127))), key127 = Math.max(0, Math.min(127, Math.round(m)));
      const zs = zonesFor(bank, preset, key127, v127);
      if (!zs.length) return false;
      const t = Math.max(c.currentTime + 0.002, at || 0), list = [];
      zs.forEach(({ sample, g }) => {
        const a = addrOf(sample, g), buf = bufferOf(c, sample), sr = buf.sampleRate;
        const src = c.createBufferSource(), env = c.createGain();
        src.buffer = buf;
        src.playbackRate.value = Math.pow(2, pitchOf(sample, g, key127) / 12);
        if (a.loop) { src.loop = true; src.loopStart = (a.ls - sample.start) / sr; src.loopEnd = (a.le - sample.start) / sr; }
        let node = src;
        if (g[G.filterFc] < 13400) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(20000, 8.176 * Math.pow(2, g[G.filterFc] / 1200)); f.Q.value = Math.max(0.0001, Math.pow(10, (g[G.filterQ] || 0) / 200)); node = node.connect(f); }
        if (g[G.pan] && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, g[G.pan] / 500)); node = node.connect(p); }
        node.connect(env).connect(out);
        // огибающая громкости банка
        const peak = cbGain(g[G.attenuation]) * Math.pow(v127 / 127, 1.6) * 0.9;
        const dl = tcSec(g[G.delayVol]), atk = Math.max(0.002, tcSec(g[G.attackVol])), hold = tcSec(g[G.holdVol]), dec = tcSec(g[G.decayVol]);
        const sus = peak * Math.pow(10, -Math.max(0, Math.min(1440, g[G.sustainVol] || 0)) / 200), rel = Math.min(8, Math.max(0.03, tcSec(g[G.releaseVol])));
        const t1 = t + dl, t2 = t1 + atk, t3 = t2 + hold;
        env.gain.setValueAtTime(0, t); env.gain.setValueAtTime(0, t1);
        env.gain.linearRampToValueAtTime(peak, t2);
        env.gain.setValueAtTime(peak, t3);
        env.gain.setTargetAtTime(sus, t3, Math.max(0.005, dec / 5));
        // уровень огибающей в момент x — для мягкого отпускания с того же места
        const levelAt = (x) => (x <= t1 ? 0 : x <= t2 ? peak * ((x - t1) / atk) : x <= t3 ? peak : sus + (peak - sus) * Math.exp(-(x - t3) / Math.max(0.005, dec / 5)));
        src.start(t);
        const v = { src, g: env, rel, levelAt, tm: 0 };
        if (!a.loop) { const life = (a.e - a.s) / sr / src.playbackRate.value; v.tm = after((t - c.currentTime + life + 0.3) * 1000, () => drop(v)); }
        list.push(v); alive.add(v);
      });
      voices.set(key, list); order.push(key);
      if (dur > 0) api.off(key, t + dur);
      return true;
    },
    off(key, at = 0) { kill(key, at, false); },
    // Стоп: всё звучащее и запланированное — тихо и сразу
    all() {
      voices.clear(); order = [];
      alive.forEach((v) => { const c = v.g.context, t = c.currentTime; try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.levelAt(t), t); v.g.gain.linearRampToValueAtTime(0, t + 0.03); v.src.stop(t + 0.05); } catch { /* */ } cancel(v.tm); v.tm = after(150, () => drop(v)); });
    },
    get count() { return voices.size; },
  };
  return api;
}
