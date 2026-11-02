// Контейнеры и заголовки для конвертера — без DOM и зависимостей:
// encodeAiff — AIFF 16/24 бит (Logic, GarageBand); oggOpus — пакеты Opus (от WebCodecs) в Ogg; sniff — формат и частота
// исходника по первым байтам (чтобы раскодировать без пересчёта частоты).

/* ---------- AIFF ---------- */

// 80-битное число с плавающей точкой (частота в заголовке COMM)
function ext80(v) {
  const out = new Uint8Array(10);
  if (!v) return out;
  let e = Math.floor(Math.log2(v)), m = v / 2 ** e;
  if (m >= 2) { m /= 2; e++; }
  const ex = e + 16383, hi = Math.floor(m * 2 ** 31), lo = Math.floor((m * 2 ** 31 - hi) * 2 ** 32);
  out[0] = ex >> 8; out[1] = ex & 0xff;
  for (let i = 0; i < 4; i++) { out[2 + i] = (hi >>> (24 - 8 * i)) & 0xff; out[6 + i] = (lo >>> (24 - 8 * i)) & 0xff; }
  return out;
}
export function encodeAiff(ch, sr, bits = 16) {
  const nc = ch.length, n = ch[0].length, bps = bits === 24 ? 3 : 2, data = n * nc * bps, pad = data & 1;
  const size = 4 + (8 + 18) + (8 + 8 + data + pad);
  const buf = new Uint8Array(8 + size), v = new DataView(buf.buffer), w = (o, s) => { for (let i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i); };
  w(0, 'FORM'); v.setUint32(4, size); w(8, 'AIFF');
  w(12, 'COMM'); v.setUint32(16, 18); v.setUint16(20, nc); v.setUint32(22, n); v.setUint16(26, bits === 24 ? 24 : 16); buf.set(ext80(sr), 28);
  w(38, 'SSND'); v.setUint32(42, 8 + data); v.setUint32(46, 0); v.setUint32(50, 0);
  let o = 54;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    const x = ch[c][i], s = x > 1 ? 1 : x < -1 ? -1 : x;
    if (bps === 3) { const q = Math.round(s < 0 ? s * 0x800000 : s * 0x7fffff); buf[o] = (q >> 16) & 0xff; buf[o + 1] = (q >> 8) & 0xff; buf[o + 2] = q & 0xff; }
    else v.setInt16(o, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff));
    o += bps;
  }
  return buf;
}

/* ---------- Ogg Opus ---------- */

const CRC = new Uint32Array(256);
for (let i = 0; i < 256; i++) { let c = i << 24; for (let k = 0; k < 8; k++) c = c & 0x80000000 ? (c << 1) ^ 0x04c11db7 : c << 1; CRC[i] = c >>> 0; }
const oggCrc = (u) => { let c = 0; for (let i = 0; i < u.length; i++) c = ((c << 8) ^ CRC[((c >>> 24) ^ u[i]) & 0xff]) >>> 0; return c; };

// Страница Ogg: пакеты целиком (каждый ≤ 255·255 байт), granule — позиция в отсчётах 48 кГц после последнего пакета
function page(packets, { serial, seq, granule, bos = false, eos = false }) {
  const lace = [];
  packets.forEach((p) => { let n = p.length; while (n >= 255) { lace.push(255); n -= 255; } lace.push(n); });
  const body = packets.reduce((a, p) => a + p.length, 0), out = new Uint8Array(27 + lace.length + body), v = new DataView(out.buffer);
  out.set([0x4f, 0x67, 0x67, 0x53], 0); out[4] = 0; out[5] = (bos ? 2 : 0) | (eos ? 4 : 0);
  v.setUint32(6, granule % 2 ** 32, true); v.setUint32(10, Math.floor(granule / 2 ** 32), true);
  v.setUint32(14, serial, true); v.setUint32(18, seq, true); v.setUint32(22, 0, true);
  out[26] = lace.length; out.set(lace, 27);
  let o = 27 + lace.length; packets.forEach((p) => { out.set(p, o); o += p.length; });
  v.setUint32(22, oggCrc(out), true);
  return out;
}
// packets — [{ data: Uint8Array, samples }] (samples — длительность пакета в отсчётах 48 кГц); total — сколько
// отсчётов было на входе (конец обрезается по нему); preSkip — задержка кодировщика
export function oggOpus(packets, { channels, inputRate = 48000, preSkip = 312, total, vendor = 'Melete', serial = 0x4d454c45 }) {
  const head = new Uint8Array(19), hv = new DataView(head.buffer);
  head.set([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], 0); head[8] = 1; head[9] = channels;
  hv.setUint16(10, preSkip, true); hv.setUint32(12, inputRate, true); hv.setInt16(16, 0, true); head[18] = 0;
  const vb = new TextEncoder().encode(vendor), tags = new Uint8Array(8 + 4 + vb.length + 4), tv = new DataView(tags.buffer);
  tags.set(new TextEncoder().encode('OpusTags'), 0); tv.setUint32(8, vb.length, true); tags.set(vb, 12); tv.setUint32(12 + vb.length, 0, true);
  const pages = [page([head], { serial, seq: 0, granule: 0, bos: true }), page([tags], { serial, seq: 1, granule: 0 })];
  let seq = 2, pos = 0, cur = [], curLace = 0;
  const end = preSkip + (total ?? packets.reduce((a, p) => a + p.samples, 0));
  const flush = (eos) => { pages.push(page(cur, { serial, seq: seq++, granule: eos ? end : preSkip + pos, eos })); cur = []; curLace = 0; };
  packets.forEach((p, i) => {
    const lace = Math.floor(p.data.length / 255) + 1;
    if (curLace + lace > 255 || cur.length >= 50) flush(false); // ~1 с на страницу
    cur.push(p.data); curLace += lace; pos += p.samples;
    if (i === packets.length - 1) flush(true);
  });
  if (!packets.length) flush(true);
  const out = new Uint8Array(pages.reduce((a, p) => a + p.length, 0));
  let o = 0; pages.forEach((p) => { out.set(p, o); o += p.length; });
  return out;
}

/* ---------- что за файл ---------- */

// По первым байтам: { type: 'wav'|'aiff'|'flac'|'mp3'|'ogg'|'mp4'|'webm'|'caf'|'wma'|'amr'|'ac3'|'unknown', rate } —
// rate — частота исходника, если её видно в заголовке (иначе 0)
export function sniff(u8) {
  const s = (o, n) => (o + n <= u8.length ? String.fromCharCode(...u8.subarray(o, o + n)) : '');
  const be32 = (o) => ((u8[o] << 24) | (u8[o + 1] << 16) | (u8[o + 2] << 8) | u8[o + 3]) >>> 0;
  const le32 = (o) => (u8[o] | (u8[o + 1] << 8) | (u8[o + 2] << 16) | (u8[o + 3] << 24)) >>> 0;
  if (s(0, 4) === 'RIFF' && s(8, 4) === 'WAVE') {
    for (let o = 12; o + 8 <= u8.length && o < 1 << 20;) { const id = s(o, 4), size = le32(o + 4); if (id === 'fmt ') return { type: 'wav', rate: le32(o + 12) }; o += 8 + size + (size & 1); }
    return { type: 'wav', rate: 0 };
  }
  if (s(0, 4) === 'FORM' && (s(8, 4) === 'AIFF' || s(8, 4) === 'AIFC')) {
    for (let o = 12; o + 8 <= u8.length && o < 1 << 20;) { const id = s(o, 4), size = be32(o + 4); if (id === 'COMM') { const e = ((u8[o + 16] & 0x7f) << 8) | u8[o + 17], m = be32(o + 18); return { type: 'aiff', rate: Math.round(m * 2 ** (e - 16383 - 31)) }; } o += 8 + size + (size & 1); }
    return { type: 'aiff', rate: 0 };
  }
  if (s(0, 4) === 'fLaC') return { type: 'flac', rate: (u8[18] << 12) | (u8[19] << 4) | (u8[20] >> 4) };
  if (s(0, 4) === 'OggS') {
    const i = indexOf(u8, 'OpusHead', 0, 4096); if (i >= 0) return { type: 'ogg', codec: 'opus', rate: le32(i + 12) || 48000 };
    const j = indexOf(u8, 'vorbis', 0, 4096); return { type: 'ogg', codec: j >= 0 ? 'vorbis' : '', rate: j >= 0 ? le32(j + 11) : 0 };
  }
  if (s(4, 4) === 'ftyp' || s(4, 4) === 'moov' || s(4, 4) === 'mdat') {
    const i = indexOf(u8, 'mp4a', 0, Math.min(u8.length, 4 << 20)), k = indexOf(u8, 'alac', 0, Math.min(u8.length, 4 << 20));
    const at = i >= 0 ? i : k;
    return { type: 'mp4', codec: k >= 0 && (i < 0 || k < i) ? 'alac' : 'aac', rate: at >= 0 ? ((u8[at + 28] << 8) | u8[at + 29]) : 0 };
  }
  if (u8[0] === 0x1a && u8[1] === 0x45 && u8[2] === 0xdf && u8[3] === 0xa3) return { type: 'webm', rate: 48000 };
  if (s(0, 4) === 'caff') return { type: 'caf', rate: 0 };
  if (u8[0] === 0x30 && u8[1] === 0x26 && u8[2] === 0xb2 && u8[3] === 0x75) return { type: 'wma', rate: 0 };
  if (s(0, 5) === '#!AMR') return { type: 'amr', rate: s(0, 9) === '#!AMR-WB\n' ? 16000 : 8000 };
  if (u8[0] === 0x0b && u8[1] === 0x77) return { type: 'ac3', rate: 0 };
  // MP3: ID3 и/или кадр MPEG (синхро 11 единиц)
  let o = 0;
  if (s(0, 3) === 'ID3') o = 10 + (((u8[6] & 0x7f) << 21) | ((u8[7] & 0x7f) << 14) | ((u8[8] & 0x7f) << 7) | (u8[9] & 0x7f));
  for (let i = o; i < Math.min(u8.length - 4, o + 65536); i++) {
    if (u8[i] === 0xff && (u8[i + 1] & 0xe0) === 0xe0 && ((u8[i + 1] >> 1) & 3) === 1) { // слой III
      const ver = (u8[i + 1] >> 3) & 3, ri = (u8[i + 2] >> 2) & 3;
      if (ri === 3 || ver === 1) continue;
      const base = [44100, 48000, 32000][ri];
      return { type: 'mp3', rate: ver === 3 ? base : ver === 2 ? base / 2 : base / 4 };
    }
    if (u8[i] === 0xff && (u8[i + 1] & 0xf6) === 0xf0) { const ri = (u8[i + 2] >> 2) & 15, R = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350]; return { type: 'aac', rate: R[ri] || 0 }; } // ADTS
  }
  return { type: 'unknown', rate: 0 };
}
function indexOf(u8, str, from, to) {
  const c0 = str.charCodeAt(0), n = str.length, end = Math.min(u8.length - n, to);
  outer: for (let i = from; i <= end; i++) { if (u8[i] !== c0) continue; for (let k = 1; k < n; k++) if (u8[i + k] !== str.charCodeAt(k)) continue outer; return i; }
  return -1;
}
