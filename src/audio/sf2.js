// Разбор звукового банка SoundFont 2 (SONiVOX GM, Apache-2.0 — тот же банк, что у «Табов»): пресеты (банк, программа,
// зоны) → инструменты (зоны по клавишам и силе) → сэмплы (16 бит, петля, нота записи). Без DOM и звука — чистая функция,
// голоса строит gm.js. Спецификация SF 2.01: RIFF sfbk → sdta/smpl (PCM) и pdta (phdr, pbag, pgen, inst, ibag, igen, shdr).

// Номера генераторов, которые нужны проигрывателю
export const G = {
  startOff: 0, endOff: 1, loopStartOff: 2, loopEndOff: 3, startCoarse: 4, filterFc: 8, filterQ: 9, endCoarse: 12, pan: 17,
  delayVol: 33, attackVol: 34, holdVol: 35, decayVol: 36, sustainVol: 37, releaseVol: 38,
  instrument: 41, keyRange: 43, velRange: 44, loopStartCoarse: 45, keynum: 46, velocity: 47, attenuation: 48,
  loopEndCoarse: 50, coarseTune: 51, fineTune: 52, sampleID: 53, sampleModes: 54, scaleTuning: 56, exclusiveClass: 57, rootKey: 58,
};
// Значения по умолчанию (спецификация 8.1.3)
export const DEFAULTS = { [G.filterFc]: 13500, [G.delayVol]: -12000, [G.attackVol]: -12000, [G.holdVol]: -12000, [G.decayVol]: -12000,
  [G.releaseVol]: -12000, [G.scaleTuning]: 100, [G.rootKey]: -1, [G.keynum]: -1, [G.velocity]: -1 };
// Генераторы, которые у пресета складываются с инструментом (не диапазоны и не адреса)
const ADDITIVE = new Set([G.filterFc, G.filterQ, G.pan, G.delayVol, G.attackVol, G.holdVol, G.decayVol, G.sustainVol, G.releaseVol, G.attenuation, G.coarseTune, G.fineTune, G.scaleTuning]);
const RANGE = new Set([G.keyRange, G.velRange]);

const str = (u8, o, n) => { let s = ''; for (let i = 0; i < n && u8[o + i]; i++) s += String.fromCharCode(u8[o + i]); return s.trim(); };

// buf — ArrayBuffer файла .sf2 → { presets, samples, pcm: Int16Array }
export function parseSf2(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  const id = (o) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
  if (id(0) !== 'RIFF' || id(8) !== 'sfbk') throw new Error('not sf2');
  const ck = {};
  const walk = (off, end) => {
    while (off + 8 <= end) {
      const cid = id(off), len = dv.getUint32(off + 4, true), body = off + 8;
      if (cid === 'LIST') walk(body + 4, Math.min(end, body + len)); else ck[cid] = { o: body, n: len };
      off = body + len + (len & 1);
    }
  };
  walk(12, u8.length);
  if (!ck.smpl || !ck.phdr || !ck.shdr) throw new Error('sf2: no data');
  const pcm = new Int16Array(buf.slice(ck.smpl.o, ck.smpl.o + (ck.smpl.n & ~1)));
  const recs = (name, size, fn) => { const c = ck[name], out = []; for (let o = c.o; o + size <= c.o + c.n; o += size) out.push(fn(o)); return out; };
  const phdr = recs('phdr', 38, (o) => ({ name: str(u8, o, 20), program: dv.getUint16(o + 20, true), bank: dv.getUint16(o + 22, true), bag: dv.getUint16(o + 24, true) }));
  const bag = (name) => recs(name, 4, (o) => dv.getUint16(o, true));
  const gens = (name) => recs(name, 4, (o) => [dv.getUint16(o, true), dv.getInt16(o + 2, true), u8[o + 2], u8[o + 3]]); // [op, signed, lo, hi]
  const pbag = bag('pbag'), pgen = gens('pgen'), ibag = bag('ibag'), igen = gens('igen');
  const inst = recs('inst', 22, (o) => ({ name: str(u8, o, 20), bag: dv.getUint16(o + 20, true) }));
  const samples = recs('shdr', 46, (o) => ({ name: str(u8, o, 20), start: dv.getUint32(o + 20, true), end: dv.getUint32(o + 24, true), loopStart: dv.getUint32(o + 28, true),
    loopEnd: dv.getUint32(o + 32, true), rate: dv.getUint32(o + 36, true), root: u8[o + 40], corr: dv.getInt8(o + 41), link: dv.getUint16(o + 42, true), type: dv.getUint16(o + 44, true) }));
  samples.pop(); // EOS
  // зоны: генераторы от bag[i] до bag[i+1]; диапазоны — [lo, hi], остальное — число
  const zonesOf = (bags, gl, from, to, last) => {
    const out = [];
    for (let b = from; b < to; b++) {
      const g = {}, g0 = bags[b], g1 = b + 1 < bags.length ? bags[b + 1] : gl.length;
      for (let k = g0; k < g1 && k < gl.length; k++) { const [op, v, lo, hi] = gl[k]; g[op] = RANGE.has(op) ? [lo, hi] : v; }
      out.push(g);
    }
    // первая зона без завершающего генератора (инструмент / сэмпл) — общая для остальных
    const global = out.length && out[0][last] === undefined ? out.shift() : {};
    return { global, zones: out.filter((z) => z[last] !== undefined) };
  };
  const insts = inst.slice(0, -1).map((x, i) => ({ name: x.name, ...zonesOf(ibag, igen, x.bag, inst[i + 1].bag, G.sampleID) }));
  const presets = phdr.slice(0, -1).map((x, i) => ({ name: x.name, bank: x.bank, program: x.program, ...zonesOf(pbag, pgen, x.bag, phdr[i + 1].bag, G.instrument) }))
    .sort((a, b) => a.bank - b.bank || a.program - b.program);
  return { presets, insts, samples, pcm };
}

const inRange = (r, v) => !r || (v >= r[0] && v <= r[1]);
// Что звучит на ноту key с силой vel (0…127) у пресета: [{ sample, g }] — g — итоговые генераторы зоны (инструмент: своя
// зона поверх общей и умолчаний; пресет: прибавки своей зоны поверх общей)
export function zonesFor(bank, preset, key, vel) {
  const out = [];
  for (const pz of preset.zones) {
    const pg = { ...preset.global, ...pz };
    if (!inRange(pg[G.keyRange], key) || !inRange(pg[G.velRange], vel)) continue;
    const ins = bank.insts[pg[G.instrument]];
    if (!ins) continue;
    for (const iz of ins.zones) {
      const ig = { ...DEFAULTS, ...ins.global, ...iz };
      if (!inRange(ig[G.keyRange], key) || !inRange(ig[G.velRange], vel)) continue;
      const sample = bank.samples[ig[G.sampleID]];
      if (!sample) continue;
      const g = { ...ig };
      ADDITIVE.forEach((op) => { if (pg[op] !== undefined) g[op] = (g[op] || 0) + pg[op]; });
      out.push({ sample, g });
    }
  }
  return out;
}
// Пресет по банку и программе (нет такого — программа в банке 0, потом первый)
export const presetOf = (bank, b, program) => bank.presets.find((p) => p.bank === b && p.program === program) || bank.presets.find((p) => p.bank === 0 && p.program === program) || bank.presets[0];
// Время из тайм-центов, с; громкость из сантибел (с поправкой 0,4, как у FluidSynth и большинства проигрывателей)
export const tcSec = (tc) => Math.pow(2, (tc == null ? -12000 : tc) / 1200);
export const cbGain = (cb) => Math.pow(10, -(Math.max(0, cb || 0) * 0.4) / 200);
// Высота: на сколько полутонов поднять сэмпл, чтобы прозвучала нота key
export function pitchOf(sample, g, key) {
  const root = g[G.rootKey] >= 0 ? g[G.rootKey] : sample.root;
  return ((key - root) * (g[G.scaleTuning] == null ? 100 : g[G.scaleTuning])) / 100 + (g[G.coarseTune] || 0) + ((g[G.fineTune] || 0) + (sample.corr || 0)) / 100;
}
// Границы сэмпла и петли в отсчётах pcm с поправками адресов зоны
export function addrOf(sample, g) {
  const s = sample.start + (g[G.startOff] || 0) + 32768 * (g[G.startCoarse] || 0);
  const e = sample.end + (g[G.endOff] || 0) + 32768 * (g[G.endCoarse] || 0);
  const ls = sample.loopStart + (g[G.loopStartOff] || 0) + 32768 * (g[G.loopStartCoarse] || 0);
  const le = sample.loopEnd + (g[G.loopEndOff] || 0) + 32768 * (g[G.loopEndCoarse] || 0);
  return { s, e: Math.max(s + 1, e), ls: Math.max(s, ls), le: Math.min(e, le), loop: (g[G.sampleModes] & 1) === 1 && le > ls + 4 };
}
