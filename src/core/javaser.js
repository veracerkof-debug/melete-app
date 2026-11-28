// Чтение потока сериализации Java (ObjectOutputStream): публичный формат (Java Object Serialization Stream Protocol), без выполнения чужого
// кода — только данные. Нужен для файлов Holyrics .muf/.mufl, выгруженных командой «Экспорт» (внутри — Java-объекты песен; у Holyrics файлы
// из папки синхронизации зашифрованы и сюда не попадают). Читаются: классы, объекты, строки, массивы, ссылки, перечисления, списки и
// словари стандартной библиотеки. Пределы — от испорченных и чужих файлов. Без DOM.
const TC = { NULL: 0x70, REF: 0x71, CLASSDESC: 0x72, OBJECT: 0x73, STRING: 0x74, ARRAY: 0x75, CLASS: 0x76, BLOCK: 0x77, END: 0x78, RESET: 0x79, LONGBLOCK: 0x7a, LONGSTRING: 0x7c, PROXY: 0x7d, ENUM: 0x7e };
const SC_WRITE = 0x01, SC_EXT = 0x04, BASE = 0x7e0000;
export const JAVA_LIMITS = { objects: 2_000_000, depth: 400, bytes: 40 * 1024 * 1024 };

export const isJavaStream = (u8) => !!u8 && u8.length > 4 && u8[0] === 0xac && u8[1] === 0xed && u8[2] === 0x00 && u8[3] === 0x05;

class Rd {
  constructor(u8) { this.u = u8; this.p = 0; this.dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); this.h = []; this.depth = 0; }
  need(n) { if (this.p + n > this.u.length) throw new Error('java: обрыв файла'); }
  u8() { this.need(1); return this.u[this.p++]; }
  u16() { this.need(2); const v = this.dv.getUint16(this.p); this.p += 2; return v; }
  i32() { this.need(4); const v = this.dv.getInt32(this.p); this.p += 4; return v; }
  i64() { this.need(8); const v = this.dv.getBigInt64(this.p); this.p += 8; return Number(v); }
  f32() { this.need(4); const v = this.dv.getFloat32(this.p); this.p += 4; return v; }
  f64() { this.need(8); const v = this.dv.getFloat64(this.p); this.p += 8; return v; }
  bytes(n) { this.need(n); const b = this.u.subarray(this.p, this.p + n); this.p += n; return b; }
  // «модифицированный UTF-8» Java: NUL как C0 80, символы вне BMP — парой суррогатов по 3 байта
  utf(n) {
    const b = this.bytes(n), out = [];
    for (let i = 0; i < b.length;) {
      const c = b[i];
      if (c < 0x80) { out.push(c); i++; }
      else if ((c & 0xe0) === 0xc0) { out.push(((c & 0x1f) << 6) | (b[i + 1] & 0x3f)); i += 2; }
      else { out.push(((c & 0x0f) << 12) | ((b[i + 1] & 0x3f) << 6) | (b[i + 2] & 0x3f)); i += 3; }
    }
    let s = ''; for (let i = 0; i < out.length; i += 8192) s += String.fromCharCode.apply(null, out.slice(i, i + 8192));
    return s;
  }
  utfShort() { return this.utf(this.u16()); }
  add(v) { if (this.h.length > JAVA_LIMITS.objects) throw new Error('java: слишком много объектов'); this.h.push(v); return this.h.length - 1; }

  classDescAny() {
    const tc = this.u8();
    if (tc === TC.NULL) return null;
    if (tc === TC.REF) return this.ref();
    if (tc === TC.CLASSDESC) return this.classDesc();
    if (tc === TC.PROXY) {
      const d = { name: '(proxy)', fields: [], flags: 0, sup: null }; this.add(d);
      const n = this.i32(); for (let i = 0; i < n; i++) this.utfShort();
      this.annotations(); d.sup = this.classDescAny(); return d;
    }
    throw new Error('java: ожидалось описание класса (' + tc + ')');
  }
  classDesc() {
    const d = { name: this.utfShort(), fields: [], flags: 0, sup: null };
    this.bytes(8); this.add(d); // serialVersionUID
    d.flags = this.u8();
    const n = this.u16();
    for (let i = 0; i < n; i++) {
      const t = String.fromCharCode(this.u8()), name = this.utfShort();
      let cls = null; if (t === 'L' || t === '[') cls = this.content();
      d.fields.push({ t, name, cls });
    }
    this.annotations(); d.sup = this.classDescAny();
    return d;
  }
  ref() { const i = this.i32() - BASE; if (i < 0 || i >= this.h.length) throw new Error('java: плохая ссылка'); return this.h[i]; }
  // всё до TC_ENDBLOCKDATA: блоки данных (Uint8Array) и объекты
  annotations() {
    const out = [];
    for (;;) {
      const tc = this.u[this.p]; if (tc === undefined) throw new Error('java: обрыв файла');
      if (tc === TC.END) { this.p++; return out; }
      out.push(this.content());
    }
  }
  value(t, cls) {
    switch (t) {
      case 'B': return this.dv.getInt8(this.p++ + 0) ;
      case 'C': return String.fromCharCode(this.u16());
      case 'D': return this.f64();
      case 'F': return this.f32();
      case 'I': return this.i32();
      case 'J': return this.i64();
      case 'S': { this.need(2); const v = this.dv.getInt16(this.p); this.p += 2; return v; }
      case 'Z': return this.u8() !== 0;
      default: return this.content();
    }
  }
  content() {
    if (++this.depth > JAVA_LIMITS.depth) throw new Error('java: слишком глубоко');
    try {
      const tc = this.u8();
      switch (tc) {
        case TC.NULL: return null;
        case TC.REF: return this.ref();
        case TC.STRING: { const s = this.utfShort(); this.add(s); return s; }
        case TC.LONGSTRING: { const n = this.i64(); if (n > JAVA_LIMITS.bytes) throw new Error('java: строка слишком длинная'); const s = this.utf(n); this.add(s); return s; }
        case TC.CLASSDESC: return this.classDesc();
        case TC.CLASS: { const d = this.classDescAny(); const o = { javaClass: d }; this.add(o); return o; }
        case TC.BLOCK: return this.bytes(this.u8());
        case TC.LONGBLOCK: return this.bytes(this.i32());
        case TC.RESET: this.h = []; return this.content();
        case TC.ENUM: { const d = this.classDescAny(); const o = { cls: d.name, enumName: null }; this.add(o); o.enumName = this.content(); return o; }
        case TC.ARRAY: return this.array();
        case TC.OBJECT: return this.object();
        default: throw new Error('java: неизвестный тип данных 0x' + tc.toString(16));
      }
    } finally { this.depth--; }
  }
  array() {
    const d = this.classDescAny(), a = [], idx = this.add(a);
    const n = this.i32(); if (n < 0 || n > JAVA_LIMITS.objects) throw new Error('java: плохой массив');
    const t = d && d.name[1] ? d.name[1] : 'L';
    if (t === 'B') { const b = this.bytes(n); this.h[idx] = b; return b; }
    for (let i = 0; i < n; i++) a.push(this.value(t));
    return a;
  }
  object() {
    const d = this.classDescAny(), o = { cls: d ? d.name : '', f: {}, ann: [] }; this.add(o);
    const chain = []; for (let x = d; x; x = x.sup) chain.unshift(x);
    for (const c of chain) {
      if (c.flags & SC_EXT) { o.ann.push(...this.annotations()); continue; }
      for (const f of c.fields) o.f[f.name] = this.value(f.t, f.cls);
      if (c.flags & SC_WRITE) o.ann.push(...this.annotations());
    }
    return o;
  }
}

// Поток → дерево объектов { cls, f (поля), ann (данные записи класса) }
export function readJava(u8) {
  if (!isJavaStream(u8)) throw new Error('java: не поток сериализации');
  if (u8.length > JAVA_LIMITS.bytes) throw new Error('java: файл слишком большой');
  const r = new Rd(u8); r.p = 4;
  return r.content();
}

const LIST = /^java\.util\.(ArrayList|LinkedList|Vector|ArrayDeque|CopyOnWriteArrayList|Stack)$|^java\.util\.Arrays\$ArrayList$|^java\.util\.Collections\$/;
const MAP = /^java\.util\.(HashMap|LinkedHashMap|TreeMap|Hashtable|ConcurrentHashMap|WeakHashMap)$/;
const SET = /^java\.util\.(HashSet|LinkedHashSet|TreeSet)$/;
const BOX = /^java\.lang\.(Integer|Long|Short|Byte|Double|Float|Boolean|Character|String)$/;
// Дерево → обычные значения JS (списки — массивы, словари — объекты, обёртки — значения, прочие объекты — поля)
export function simplify(v, seen = new Map(), depth = 0) {
  if (v === null || typeof v !== 'object' || v instanceof Uint8Array) return v;
  if (depth > 60) return null;
  if (Array.isArray(v)) return v.map((x) => simplify(x, seen, depth + 1));
  if (seen.has(v)) return seen.get(v);
  if (v.enumName !== undefined) return v.enumName;
  if (v.f === undefined) return null;
  const items = () => v.ann.filter((x) => !(x instanceof Uint8Array));
  let out;
  if (BOX.test(v.cls)) out = v.f.value;
  else if (LIST.test(v.cls) || SET.test(v.cls)) { out = []; seen.set(v, out); items().forEach((x) => out.push(simplify(x, seen, depth + 1))); return out; }
  else if (MAP.test(v.cls)) { out = {}; seen.set(v, out); const it = items(); for (let i = 0; i + 1 < it.length; i += 2) out[String(simplify(it[i], seen, depth + 1))] = simplify(it[i + 1], seen, depth + 1); return out; }
  else { out = { _class: v.cls }; seen.set(v, out); for (const [k, x] of Object.entries(v.f)) out[k] = simplify(x, seen, depth + 1); return out; }
  seen.set(v, out); return out;
}
