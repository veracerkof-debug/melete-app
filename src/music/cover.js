// Обложка из тегов файла (слово автора 21.11.2026: у официального трека есть обложка — она должна показываться).
// Чистые функции над байтами, без DOM: MP3 (ID3v2.2/2.3/2.4: PIC/APIC), FLAC (блок PICTURE), M4A/MP4 (covr в moov/udta/meta/ilst).
// OGG/Opus (METADATA_BLOCK_PICTURE в base64) — позже. Возврат: { mime, bytes } или null. Ничего не бросает: битый файл — null.

const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const sync32 = (b, o) => ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f);
const ascii = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));

const sniff = (b) => (b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' : b[0] === 0x89 && b[1] === 0x50 ? 'image/png' : b[0] === 0x47 && b[1] === 0x49 ? 'image/gif' : b[0] === 0x52 && b[1] === 0x49 ? 'image/webp' : null);

// конец строки в теге: один нулевой байт (кодировки 0 и 3) или два (UTF-16, кодировки 1 и 2)
function skipText(b, o, enc, end) {
  if (enc === 1 || enc === 2) { while (o + 1 < end && !(b[o] === 0 && b[o + 1] === 0)) o += 2; return o + 2; }
  while (o < end && b[o] !== 0) o++;
  return o + 1;
}

function id3(b) {
  if (b.length < 10 || ascii(b, 0, 3) !== 'ID3') return null;
  const ver = b[3], flags = b[5], size = sync32(b, 6), end = Math.min(b.length, 10 + size);
  let o = 10;
  if (flags & 0x40 && ver >= 3) { const ext = ver === 4 ? sync32(b, o) : u32(b, o) + 4; o += ext; } // расширенный заголовок
  const idLen = ver === 2 ? 3 : 4, hdr = ver === 2 ? 6 : 10;
  while (o + hdr <= end) {
    const id = ascii(b, o, idLen);
    if (!/^[A-Z0-9]{3,4}$/.test(id)) break; // дальше пустое место
    const len = ver === 2 ? (b[o + 3] << 16) | (b[o + 4] << 8) | b[o + 5] : ver === 4 ? sync32(b, o + 4) : u32(b, o + 4);
    const body = o + hdr, bodyEnd = body + len;
    if (len <= 0 || bodyEnd > end) break;
    if (id === 'APIC' || id === 'PIC') {
      const enc = b[body];
      let p = body + 1, mime = null;
      if (id === 'APIC') { const e = skipText(b, p, 0, bodyEnd); mime = ascii(b, p, Math.max(0, e - 1 - p)); p = e; } else p += 3; // PIC: формат из трёх букв
      p += 1; // тип картинки
      p = skipText(b, p, enc, bodyEnd); // описание
      const bytes = b.subarray(p, bodyEnd);
      const m = sniff(bytes) || (mime && /^image\//.test(mime) ? mime : null);
      if (m && bytes.length > 64) return { mime: m, bytes };
    }
    o = bodyEnd;
  }
  return null;
}

function flac(b) {
  if (b.length < 8 || ascii(b, 0, 4) !== 'fLaC') return null;
  let o = 4;
  for (;;) {
    if (o + 4 > b.length) return null;
    const last = b[o] & 0x80, type = b[o] & 0x7f, len = (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3], body = o + 4;
    if (body + len > b.length) return null;
    if (type === 6) {
      let p = body + 4; // тип картинки
      const ml = u32(b, p); p += 4; const mime = ascii(b, p, ml); p += ml;
      const dl = u32(b, p); p += 4 + dl + 16; // описание, ширина, высота, глубина, цвета
      const n = u32(b, p); p += 4;
      const bytes = b.subarray(p, Math.min(p + n, body + len));
      const m = sniff(bytes) || (/^image\//.test(mime) ? mime : null);
      if (m && bytes.length > 64) return { mime: m, bytes };
    }
    if (last) return null;
    o = body + len;
  }
}

// ящики MP4: [размер 4][имя 4][тело]; размер 1 — 64-битный, 0 — до конца
function boxes(b, from, to, fn) {
  let o = from;
  while (o + 8 <= to) {
    let size = u32(b, o), hdr = 8;
    const name = ascii(b, o + 4, 4);
    if (size === 1) { if (o + 16 > to) return; size = u32(b, o + 12) + u32(b, o + 8) * 4294967296; hdr = 16; } else if (size === 0) size = to - o;
    if (size < hdr || o + size > to) size = Math.min(size, to - o);
    if (size < hdr) return;
    if (fn(name, o + hdr, o + size) === true) return;
    o += size;
  }
}

function mp4(b) {
  if (b.length < 16 || ascii(b, 4, 4) !== 'ftyp') return null;
  let found = null;
  const walk = (from, to, path) => boxes(b, from, to, (name, bs, be) => {
    if (found) return true;
    if (path.length < 5 && (name === 'moov' || name === 'udta' || name === 'ilst')) walk(bs, be, [...path, name]);
    else if (name === 'meta' && path.length < 5) walk(bs + 4, be, [...path, name]); // у meta 4 байта версии и флагов
    else if (name === 'covr') {
      boxes(b, bs, be, (n2, bs2, be2) => {
        if (n2 !== 'data' || be2 - bs2 < 8 + 64) return false;
        const bytes = b.subarray(bs2 + 8, be2), type = u32(b, bs2) & 0xffffff, m = sniff(bytes) || (type === 14 ? 'image/png' : type === 13 ? 'image/jpeg' : null);
        if (m) { found = { mime: m, bytes }; return true; }
        return false;
      });
    }
    return !!found;
  });
  walk(0, b.length, []);
  return found;
}

export function coverOf(bytes) {
  try {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    return id3(b) || flac(b) || mp4(b) || null;
  } catch { return null; }
}

// Для больших файлов читать целиком не нужно: теги ID3 и FLAC — в начале, у MP4 ящик «moov» может быть и в конце.
// blob — Blob/File. Возврат — как у coverOf. Читает только нужные куски.
export async function coverOfBlob(blob, { max = 12 * 1024 * 1024 } = {}) {
  try {
    const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    if (head.length < 10) return null;
    if (ascii(head, 0, 3) === 'ID3') {
      const n = Math.min(max, 10 + sync32(head, 6));
      return coverOf(new Uint8Array(await blob.slice(0, n).arrayBuffer()));
    }
    if (ascii(head, 0, 4) === 'fLaC') return coverOf(new Uint8Array(await blob.slice(0, Math.min(max, 4 * 1024 * 1024)).arrayBuffer()));
    if (ascii(head, 4, 4) === 'ftyp') {
      // верхний уровень: пройти по ящикам, прочитать только moov
      let o = 0;
      const size = blob.size;
      while (o + 8 <= size) {
        const h = new Uint8Array(await blob.slice(o, o + 16).arrayBuffer());
        let len = u32(h, 0), hdr = 8;
        const name = ascii(h, 4, 4);
        if (len === 1) { len = u32(h, 12) + u32(h, 8) * 4294967296; hdr = 16; } else if (len === 0) len = size - o;
        if (len < hdr) return null;
        if (name === 'moov') {
          if (len > max) return null;
          const moov = new Uint8Array(await blob.slice(o, o + len).arrayBuffer());
          const wrap = new Uint8Array(16 + moov.length); // для разбора нужна «ftyp»: подставить пустую
          wrap.set([0, 0, 0, 16, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0, 0, 0, 0, 0]); wrap.set(moov, 16);
          return coverOf(wrap);
        }
        o += len;
      }
    }
    return null;
  } catch { return null; }
}
