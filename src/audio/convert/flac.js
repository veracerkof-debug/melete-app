// Кодировщик FLAC без зависимостей (сжатие без потерь): блоки по 4096 отсчётов, у каждого канала — лучший из
// постоянного, фиксированных предсказателей 0…4 и «как есть»; для стерео — лучший из четырёх видов (L/R, L/S, S/R, M/S);
// остатки — код Райса с подбором параметра по частям блока. Порядок предсказателя и вид стерео выбираются по сумме
// модулей остатков (быстро), параметры Райса — точным подсчётом бит. Проверено декодером ffmpeg (tests/convert.test.js).
// Вход: каналы Float32Array (−1…1), частота, разрядность 16 или 24. Выход: Uint8Array файла .flac.

const BS = 4096;

class Bits {
  constructor(n = 1 << 16) { this.buf = new Uint8Array(n); this.pos = 0; this.acc = 0; this.nb = 0; }
  grow(n) { if (this.pos + n <= this.buf.length) return; let m = this.buf.length * 2; while (m < this.pos + n) m *= 2; const b = new Uint8Array(m); b.set(this.buf); this.buf = b; }
  // до 24 бит за раз (значение без знака)
  put(v, n) {
    if (n > 24) { this.put(Math.floor(v / 16777216) & ((1 << (n - 24)) - 1), n - 24); this.put(v & 0xffffff, 24); return; }
    this.acc = (this.acc << n) | (v & ((1 << n) - 1)); this.nb += n;
    this.grow(4);
    while (this.nb >= 8) { this.nb -= 8; this.buf[this.pos++] = (this.acc >>> this.nb) & 0xff; }
    this.acc &= (1 << this.nb) - 1;
  }
  putS(v, n) { this.put(v < 0 ? v + 2 ** n : v, n); } // со знаком (дополнительный код)
  unary(q) { while (q >= 24) { this.put(0, 24); q -= 24; } this.put(1, q + 1); } // q нулей и единица
  align() { if (this.nb) this.put(0, 8 - this.nb); }
  bytes() { return this.buf.subarray(0, this.pos); }
}

const CRC8 = new Uint8Array(256), CRC16 = new Uint16Array(256);
for (let i = 0; i < 256; i++) {
  let c = i; for (let k = 0; k < 8; k++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff; CRC8[i] = c;
  let d = i << 8; for (let k = 0; k < 8; k++) d = d & 0x8000 ? ((d << 1) ^ 0x8005) & 0xffff : (d << 1) & 0xffff; CRC16[i] = d;
}
const crc8 = (u, a, b) => { let c = 0; for (let i = a; i < b; i++) c = CRC8[c ^ u[i]]; return c; };
const crc16 = (u, a, b) => { let c = 0; for (let i = a; i < b; i++) c = ((c << 8) & 0xffff) ^ CRC16[(c >> 8) ^ u[i]]; return c; };

// Остатки фиксированного предсказателя порядка o (первые o отсчётов — «разгон», в остатки не входят)
function residual(x, n, o, out) {
  if (o === 0) for (let i = 0; i < n; i++) out[i] = x[i];
  else if (o === 1) for (let i = 1; i < n; i++) out[i] = x[i] - x[i - 1];
  else if (o === 2) for (let i = 2; i < n; i++) out[i] = x[i] - 2 * x[i - 1] + x[i - 2];
  else if (o === 3) for (let i = 3; i < n; i++) out[i] = x[i] - 3 * x[i - 1] + 3 * x[i - 2] - x[i - 3];
  else for (let i = 4; i < n; i++) out[i] = x[i] - 4 * x[i - 1] + 6 * x[i - 2] - 4 * x[i - 3] + x[i - 4];
  return out;
}
function absSum(r, o, n) { let s = 0; for (let i = o; i < n; i++) s += r[i] < 0 ? -r[i] : r[i]; return s; }

// Лучший параметр Райса для отрезка и его стоимость в битах
function riceCost(r, a, b, maxK) {
  let s = 0;
  for (let i = a; i < b; i++) { const v = r[i]; s += v < 0 ? -2 * v - 1 : 2 * v; }
  const n = b - a;
  if (!n) return { k: 0, bits: 0 };
  let k0 = 0; const mean = s / n; while (k0 < maxK && (1 << (k0 + 1)) <= mean) k0++;
  let best = { k: k0, bits: Infinity };
  for (let k = Math.max(0, k0 - 1); k <= Math.min(maxK, k0 + 1); k++) {
    let bits = n * (k + 1);
    for (let i = a; i < b; i++) { const v = r[i], u = v < 0 ? -2 * v - 1 : 2 * v; bits += Math.floor(u / (1 << k)); }
    if (bits < best.bits) best = { k, bits };
  }
  return best;
}
// Лучшее разбиение на части (порядок 0…6) → { po, ks, bits, rice2 }
function bestPartition(r, n, o) {
  let best = null;
  for (let po = 0; po <= 6; po++) {
    const parts = 1 << po;
    if (n % parts || (n >> po) <= o) break;
    const len = n >> po, ks = [];
    let bits = 0, maxk = 0;
    for (let p = 0; p < parts; p++) { const a = p ? p * len : o, rc = riceCost(r, a, (p + 1) * len, 30); ks.push(rc.k); bits += rc.bits; if (rc.k > maxk) maxk = rc.k; }
    const rice2 = maxk > 14;
    bits += parts * (rice2 ? 5 : 4);
    if (!best || bits < best.bits) best = { po, ks, bits, rice2 };
  }
  return best;
}

// Одна подрамка канала: CONSTANT / FIXED / VERBATIM — что короче
function subframe(w, x, n, bps) {
  let allSame = true; for (let i = 1; i < n; i++) if (x[i] !== x[0]) { allSame = false; break; }
  if (allSame) { w.put(0, 8); w.putS(x[0], bps); return; }
  const r = new Int32Array(n);
  let bo = 0, bs = Infinity;
  for (let o = 0; o <= Math.min(4, n - 1); o++) { residual(x, n, o, r); const s = absSum(r, o, n); if (s < bs) { bs = s; bo = o; } }
  residual(x, n, bo, r);
  const part = bestPartition(r, n, bo), fixedBits = 8 + bo * bps + 6 + part.bits;
  if (fixedBits >= 8 + n * bps) { w.put(0x02, 8); for (let i = 0; i < n; i++) w.putS(x[i], bps); return; } // VERBATIM
  w.put(0x10 | (bo << 1), 8); // 0 001ooo 0
  for (let i = 0; i < bo; i++) w.putS(x[i], bps);
  w.put(part.rice2 ? 1 : 0, 2); w.put(part.po, 4);
  const len = n >> part.po;
  for (let p = 0; p < part.ks.length; p++) {
    const k = part.ks[p]; w.put(k, part.rice2 ? 5 : 4);
    const m = 1 << k;
    for (let i = p ? p * len : bo; i < (p + 1) * len; i++) { const v = r[i], u = v < 0 ? -2 * v - 1 : 2 * v; w.unary(Math.floor(u / m)); if (k) w.put(u & (m - 1), k); }
  }
}
// Оценка стоимости канала (для выбора вида стерео): наименьшая сумма модулей остатков среди порядков
function cost(x, n) { const r = new Int32Array(n); let best = Infinity; for (let o = 0; o <= Math.min(4, n - 1); o++) { residual(x, n, o, r); best = Math.min(best, absSum(r, o, n)); } return best; }

function utf8Num(w, v) { // номер кадра, как UTF-8
  if (v < 0x80) { w.put(v, 8); return; }
  const bytes = []; let lead = 0x80, max = 0x3f, k = 0;
  while (v > max) { bytes.unshift(0x80 | (v & 0x3f)); v = Math.floor(v / 64); k++; max >>= 1; lead = (lead >> 1) | 0x80; }
  w.put(lead | v, 8); bytes.forEach((b) => w.put(b, 8));
}

export function encodeFlac(ch, sr, bits = 16) {
  const nc = Math.min(8, ch.length), total = ch[0].length, bps = bits === 24 ? 24 : 16, scale = bps === 24 ? 8388607 : 32767;
  const ints = ch.slice(0, nc).map((x) => { const y = new Int32Array(total); for (let i = 0; i < total; i++) { const v = x[i] > 1 ? 1 : x[i] < -1 ? -1 : x[i]; y[i] = Math.round(v * scale); } return y; });
  const w = new Bits(Math.max(1 << 16, total * nc * 2));
  const blk = Math.max(16, Math.min(BS, total || 16));
  // заголовок потока: «fLaC» + STREAMINFO (последний блок метаданных)
  w.put(0x664c6143, 32); w.put(0x80, 8); w.put(34, 24);
  w.put(blk, 16); w.put(blk, 16); w.put(0, 24); w.put(0, 24);
  w.put(sr, 20); w.put(nc - 1, 3); w.put(bps - 1, 5); w.put(Math.floor(total / 2 ** 32), 4); w.put(Math.floor(total / 65536) & 0xffff, 16); w.put(total & 0xffff, 16);
  for (let i = 0; i < 4; i++) w.put(0, 32); // MD5 не считается (разрешено: «неизвестно»)
  let frame = 0;
  for (let off = 0; off < total; off += blk, frame++) {
    const n = Math.min(blk, total - off), start = w.pos;
    const sub = ints.map((y) => y.subarray(off, off + n));
    let mode = nc === 1 ? 0 : nc - 1, chans = sub, extra = sub.map(() => 0);
    if (nc === 2) { // вид стерео: независимо, левый/разность, разность/правый, середина/разность
      const L = sub[0], R = sub[1], S = new Int32Array(n), M = new Int32Array(n);
      for (let i = 0; i < n; i++) { S[i] = L[i] - R[i]; M[i] = (L[i] + R[i]) >> 1; }
      const cL = cost(L, n), cR = cost(R, n), cS = cost(S, n), cM = cost(M, n);
      const opts = [[cL + cR, 1, [L, R], [0, 0]], [cL + cS, 8, [L, S], [0, 1]], [cS + cR, 9, [S, R], [1, 0]], [cM + cS, 10, [M, S], [0, 1]]];
      opts.sort((a, b) => a[0] - b[0]);
      [, mode, chans, extra] = opts[0];
    }
    w.put(0xfff8, 16); // синхро, постоянный размер блока
    const bsCode = n === 4096 ? 12 : n === 256 ? 8 : 7;
    w.put(bsCode, 4); w.put(0, 4); // частота — из STREAMINFO
    w.put(mode, 4); w.put(bps === 24 ? 6 : 4, 3); w.put(0, 1);
    utf8Num(w, frame);
    if (bsCode === 7) w.put(n - 1, 16);
    w.put(crc8(w.buf, start, w.pos), 8);
    chans.forEach((x, k) => subframe(w, x, n, bps + extra[k]));
    w.align();
    w.put(crc16(w.buf, start, w.pos), 16);
  }
  return w.bytes().slice();
}
