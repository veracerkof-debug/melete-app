// Голосовая цепочка диктофона — один и тот же код вживую (AudioWorklet) и в файле (импорт в src/audio/vocal.js):
// вживую и в файле звучит одинаково. Файл без импортов: AudioWorklet грузит его как есть (new URL), сборщик — как модуль.
// Цепочка «как на радио» (порядок — как в эфирных процессорах и у EasyEffects / LSP / OBS):
//   pre: срез низа → экспандер (тише порога — тише ещё, мягче гейта) → де-эссер (только верх, по доле верха в сигнале)
//        → тембр (4 полосы для голоса) → компрессор (мягкое колено, атака и отпускание, автоподъём)
//   lim: лимитер с заглядыванием вперёд (окно минимума + сглаживание той же длины: к пику усиление уже снижено,
//        выше потолка не бывает) — после эффектов и усиления.
// Параметры — плоский объект (VOCAL_RANGE), 0 у среза, −90 у порога экспандера, 1 у степени сжатия, 0 у силы
// де-эссера — «выключено». Правка параметров — без пересоздания: коэффициенты пересчитываются, состояние фильтров остаётся.

export const VOCAL_RANGE = {
  hp: [0, 300], hpSlope: [12, 24],
  expThr: [-90, -20], expRatio: [1, 8], expRange: [0, 60],
  dsFreq: [3000, 10000], dsAmt: [0, 1],
  eqLow: [-12, 12], eqMud: [-12, 12], eqPres: [-12, 12], eqAir: [-12, 12],
  compThr: [-50, 0], compRatio: [1, 10], compAtt: [0.5, 80], compRel: [20, 800],
  lim: [-12, 0], limOn: [0, 1],
  denoise: [0, 1],
};
export const VOCAL_FLAT = {
  hp: 0, hpSlope: 12, expThr: -90, expRatio: 2, expRange: 15, dsFreq: 6500, dsAmt: 0,
  eqLow: 0, eqMud: 0, eqPres: 0, eqAir: 0, compThr: -20, compRatio: 1, compAtt: 10, compRel: 150,
  lim: -1, limOn: 0, denoise: 0,
};
export function normalizeVocal(p) {
  const o = { ...VOCAL_FLAT };
  for (const k in VOCAL_RANGE) {
    const v = p && p[k] != null ? +p[k] : NaN;
    if (isFinite(v)) { const [a, b] = VOCAL_RANGE[k]; o[k] = Math.max(a, Math.min(b, v)); }
  }
  o.hpSlope = o.hpSlope >= 18 ? 24 : 12;
  o.limOn = o.limOn ? 1 : 0;
  return o;
}
// Полосы тембра: низ (полка, «тело» и эффект близости), муть, разборчивость, воздух (полка)
export const TONE_BANDS = [['low', 120, 0.7], ['peak', 300, 1], ['peak', 3500, 1], ['high', 10000, 0.7]];

const dbLin = (d) => Math.pow(10, d / 20);
const linDb = (x) => (x > 1e-9 ? 20 * Math.log10(x) : -180);
const coef = (ms, sr) => Math.exp(-1 / Math.max(1, (ms / 1000) * sr));

// RBJ: [b0, b1, b2, a1, a2] (нормировано по a0)
export function rbj(type, f, db, q, sr) {
  const w = (2 * Math.PI * Math.min(f, sr * 0.45)) / sr, cw = Math.cos(w), sw = Math.sin(w), A = Math.pow(10, db / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'hp' || type === 'lp' || type === 'bp') {
    const al = sw / (2 * q);
    if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; }
    else if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; }
    a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al;
  } else if (type === 'peak') {
    const al = sw / (2 * q);
    b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A;
  } else {
    const al = (sw / 2) * Math.SQRT2, sA = 2 * Math.sqrt(A) * al, s = type === 'low' ? 1 : -1;
    b0 = A * ((A + 1) - s * (A - 1) * cw + sA); b1 = s * 2 * A * ((A - 1) - s * (A + 1) * cw); b2 = A * ((A + 1) - s * (A - 1) * cw - sA);
    a0 = (A + 1) + s * (A - 1) * cw + sA; a1 = -s * 2 * ((A - 1) + s * (A + 1) * cw); a2 = (A + 1) + s * (A - 1) * cw - sA;
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
// Биквад (транспонированная форма II): состояние по каналам, коэффициенты меняются без щелчков
class Bq {
  constructor(nch) { this.c = [1, 0, 0, 0, 0]; this.z1 = new Float64Array(nch); this.z2 = new Float64Array(nch); this.on = false; }
  set(c, on = true) { this.c = c; this.on = on; }
  run(x, k) {
    const [b0, b1, b2, a1, a2] = this.c, y = b0 * x + this.z1[k];
    this.z1[k] = b1 * x - a1 * y + this.z2[k];
    this.z2[k] = b2 * x - a2 * y;
    return y;
  }
}

export class VocalDSP {
  // stage: 'pre' — срез, экспандер, де-эссер, тембр, компрессор; 'lim' — лимитер
  constructor(sr, nch = 2, stage = 'pre') {
    this.sr = sr; this.nch = nch; this.stage = stage;
    this.hp = [new Bq(nch), new Bq(nch)];
    this.eq = TONE_BANDS.map(() => new Bq(nch));
    this.dsSplit = new Bq(nch); this.dsDet = new Bq(1);
    // огибающие
    this.eEnv = 0; this.eRed = 0; this.eHold = 0;
    this.dHf = 0; this.dAll = 0; this.dRed = 0;
    this.cEnv = -120; this.cRed = 0;
    // лимитер: задержка L, окно минимума (монотонная очередь), скользящее среднее длины L
    this.L = Math.max(8, Math.round(sr * 0.005));
    this.dl = Array.from({ length: nch }, () => new Float32Array(this.L));
    this.dp = 0;
    this.qv = new Float32Array(this.L + 1); this.qi = new Float64Array(this.L + 1); this.qh = 0; this.qt = 0; this.t = 0;
    this.box = new Float32Array(this.L).fill(1); this.boxSum = this.L; this.bp = 0; this.lg = 1;
    // показания сокращения усиления (дБ, наибольшее с прошлого чтения)
    this.gr = { exp: 0, ds: 0, comp: 0, lim: 0 };
    this.set(VOCAL_FLAT);
  }
  set(p) {
    const o = (this.p = normalizeVocal(p)), sr = this.sr;
    if (o.hp > 0) {
      if (o.hpSlope === 24) { this.hp[0].set(rbj('hp', o.hp, 0, 0.5412, sr)); this.hp[1].set(rbj('hp', o.hp, 0, 1.3066, sr)); }
      else { this.hp[0].set(rbj('hp', o.hp, 0, Math.SQRT1_2, sr)); this.hp[1].on = false; }
    } else { this.hp[0].on = false; this.hp[1].on = false; }
    const g = [o.eqLow, o.eqMud, o.eqPres, o.eqAir];
    TONE_BANDS.forEach(([t, f, q], i) => this.eq[i].set(rbj(t, f, g[i], q, sr), Math.abs(g[i]) > 0.05));
    this.dsShelfF = o.dsFreq * 0.7; this.dsDb = 0; this.dsSplit.set(rbj('high', this.dsShelfF, 0, 0.7, sr), o.dsAmt > 0);
    this.dsDet.set(rbj('bp', o.dsFreq, 0, 1.2, sr), o.dsAmt > 0);
    // де-эссер: порог — доля верха в сигнале (дБ относительно всего), глубина — по силе
    this.dsThr = -7 - 9 * o.dsAmt; this.dsMax = 3 + 9 * o.dsAmt;
    this.cmk = o.compRatio > 1 ? Math.min(6, (-o.compThr * (1 - 1 / o.compRatio)) * 0.4) : 0; // автоподъём
    this.ceil = dbLin(o.lim);
    this.k = {
      eA: coef(1, sr), eR: coef(60, sr), gO: coef(3, sr), gC: coef(120, sr), hold: Math.round(0.06 * sr),
      dA: coef(1, sr), dR: coef(40, sr), drA: coef(2, sr), drR: coef(60, sr),
      cA: coef(o.compAtt, sr), cR: coef(o.compRel, sr), lR: coef(80, sr),
    };
  }
  readGr() { const g = this.gr; this.gr = { exp: 0, ds: 0, comp: 0, lim: 0 }; return g; }
  // каналы ch (Float32Array[]), n отсчётов — на месте
  process(ch, n = ch[0].length) { return this.stage === 'lim' ? this.limit(ch, n) : this.pre(ch, n); }

  pre(ch, n) {
    const o = this.p, k = this.k, nc = Math.min(ch.length, this.nch), useExp = o.expThr > -90 && o.expRatio > 1 && o.expRange > 0;
    const useDs = o.dsAmt > 0, useComp = o.compRatio > 1, W = 6, mk = dbLin(this.cmk);
    let grE = this.gr.exp, grD = this.gr.ds, grC = this.gr.comp;
    for (let i = 0; i < n; i++) {
      let pk = 0, mono = 0;
      for (let c = 0; c < nc; c++) {
        let x = ch[c][i];
        if (this.hp[0].on) x = this.hp[0].run(x, c);
        if (this.hp[1].on) x = this.hp[1].run(x, c);
        ch[c][i] = x;
        const a = x < 0 ? -x : x; if (a > pk) pk = a;
        mono += x;
      }
      mono /= nc;
      // экспандер: огибающая пика, ниже порога — сокращение (порог − уровень)·(степень − 1), не больше глубины;
      // открывается быстро, закрывается плавно и с удержанием (слоги не обрезаются)
      let g = 1;
      if (useExp) {
        this.eEnv = pk > this.eEnv ? pk + (this.eEnv - pk) * k.eA : pk + (this.eEnv - pk) * k.eR;
        const lv = linDb(this.eEnv);
        let red = lv < o.expThr ? Math.min(o.expRange, (o.expThr - lv) * (o.expRatio - 1)) : 0;
        if (red <= 0) this.eHold = k.hold; else if (this.eHold > 0) { this.eHold--; red = 0; }
        this.eRed = red < this.eRed ? red + (this.eRed - red) * k.gO : red + (this.eRed - red) * k.gC;
        if (this.eRed > grE) grE = this.eRed;
        g = dbLin(-this.eRed);
      }
      // де-эссер: доля полосы шипящих во всём сигнале; выше порога — приглушить только верх: высокая полка
      // с усилением −сокращение (коэффициенты — раз в 16 отсчётов и только при заметной перемене)
      if (useDs) {
        const hf = this.dsDet.run(mono, 0), ah = hf < 0 ? -hf : hf, am = mono < 0 ? -mono : mono;
        this.dHf = ah > this.dHf ? ah + (this.dHf - ah) * k.dA : ah + (this.dHf - ah) * k.dR;
        this.dAll = am > this.dAll ? am + (this.dAll - am) * k.dA : am + (this.dAll - am) * k.dR;
        const rel = this.dAll > 3e-4 ? linDb(this.dHf) - linDb(this.dAll) : -99;
        const red = Math.max(0, Math.min(this.dsMax, (rel - this.dsThr) * 2));
        this.dRed = red > this.dRed ? red + (this.dRed - red) * k.drA : red + (this.dRed - red) * k.drR;
        if (this.dRed > grD) grD = this.dRed;
        if ((i & 15) === 0 && Math.abs(this.dRed - this.dsDb) > 0.05) { this.dsDb = this.dRed; this.dsSplit.c = rbj('high', this.dsShelfF, -this.dsDb, 0.7, this.sr); }
      }
      // компрессор по пику после тембра: мягкое колено 6 дБ
      let cpk = 0;
      for (let c = 0; c < nc; c++) {
        let x = ch[c][i] * g;
        if (useDs) x = this.dsSplit.run(x, c);
        for (let b = 0; b < 4; b++) if (this.eq[b].on) x = this.eq[b].run(x, c);
        ch[c][i] = x;
        const a = x < 0 ? -x : x; if (a > cpk) cpk = a;
      }
      if (useComp) {
        const d = linDb(cpk);
        this.cEnv = d > this.cEnv ? d + (this.cEnv - d) * k.cA : d + (this.cEnv - d) * k.cR;
        const over = this.cEnv - o.compThr, r = o.compRatio;
        let red = 0;
        if (2 * over > W) red = over - over / r;
        else if (2 * over > -W) { const z = over + W / 2; red = ((1 - 1 / r) * z * z) / (2 * W); }
        this.cRed = red;
        if (red > grC) grC = red;
        const cg = dbLin(-red) * mk;
        for (let c = 0; c < nc; c++) ch[c][i] *= cg;
      }
    }
    this.gr.exp = grE; this.gr.ds = grD; this.gr.comp = grC;
    return ch;
  }

  limit(ch, n) {
    const o = this.p, nc = Math.min(ch.length, this.nch), L = this.L, ceil = this.ceil, kR = this.k.lR;
    if (!o.limOn) return ch;
    let grL = this.gr.lim;
    for (let i = 0; i < n; i++) {
      let pk = 0;
      for (let c = 0; c < nc; c++) { const a = Math.abs(ch[c][i]); if (a > pk) pk = a; }
      const need = pk > ceil ? ceil / pk : 1;
      // окно минимума за последние L отсчётов (монотонная очередь)
      while (this.qt > this.qh && this.qv[(this.qt - 1) % (L + 1)] >= need) this.qt--;
      this.qv[this.qt % (L + 1)] = need; this.qi[this.qt % (L + 1)] = this.t; this.qt++;
      while (this.qi[this.qh % (L + 1)] <= this.t - L) this.qh++;
      const m = this.qv[this.qh % (L + 1)];
      // сглаживание тем же окном: к моменту выхода пика (задержка L − 1) усиление уже не выше нужного
      this.boxSum += m - this.box[this.bp]; this.box[this.bp] = m; this.bp = (this.bp + 1) % L;
      const gb = this.boxSum / L;
      this.lg = gb < this.lg ? gb : gb + (this.lg - gb) * kR; // вниз — сразу (уже сглажено), вверх — плавно
      this.t++;
      const red = -linDb(this.lg); if (red > grL) grL = red;
      for (let c = 0; c < nc; c++) {
        const d = this.dl[c], y = d[this.dp];
        d[this.dp] = ch[c][i];
        const v = y * this.lg;
        ch[c][i] = v > ceil ? ceil : v < -ceil ? -ceil : v; // страховка от погрешности
      }
      this.dp = (this.dp + 1) % (L - 1 || 1);
    }
    this.gr.lim = grL;
    return ch;
  }
}

/* ---------- AudioWorklet ---------- */

if (typeof AudioWorkletProcessor !== 'undefined' && typeof registerProcessor === 'function') {
  class VocalProcessor extends AudioWorkletProcessor {
    constructor(opts) {
      super();
      const po = (opts && opts.processorOptions) || {};
      this.dsp = new VocalDSP(sampleRate, 2, po.stage || 'pre');
      this.dsp.set(po.p || {});
      this.n = 0;
      this.port.onmessage = (e) => { if (e.data && e.data.p) this.dsp.set(e.data.p); };
    }
    process(inputs, outputs) {
      const inp = inputs[0], out = outputs[0];
      if (!out || !out.length) return true;
      const n = out[0].length;
      for (let c = 0; c < out.length; c++) {
        const src = inp && inp.length ? inp[Math.min(c, inp.length - 1)] : null;
        if (src) out[c].set(src); else out[c].fill(0);
      }
      this.dsp.process(out, n);
      // показания — около 20 раз в секунду
      if ((this.n += n) >= sampleRate / 20) { this.n = 0; this.port.postMessage({ gr: this.dsp.readGr() }); }
      return true;
    }
  }
  registerProcessor('melete-vocal', VocalProcessor);
}
