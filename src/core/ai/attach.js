// Вложения в чат с нейросетью (слово автора 25.11.2026: «дай возможность» — файл или ссылка, дальше модель сама разбирает,
// извлекает текст и предлагает, куда добавить). Приложение только достаёт текст (или картинку) и отправляет вместе с сообщением —
// по нажатию «Отправить»; что именно уйдёт, видно в чате до отправки. Без DOM (кроме shrinkImage) и без сети (ссылка — через get).
import { unzipSync, strFromU8 } from 'fflate';

export const LIMITS = { files: 5, textChars: 120000, imageBytes: 4 * 1024 * 1024, fileBytes: 25 * 1024 * 1024, urlBytes: 2 * 1024 * 1024 };
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|xml|html?|rtf|cho|crd|chopro|pro|lrc|srt|log)$/i, IMG_EXT = /\.(png|jpe?g|webp|gif)$/i;
// → 'pdf' | 'docx' | 'html' | 'text' | 'image' | null
export function kindOf(name = '', type = '') {
  const n = String(name), t = String(type).toLowerCase();
  if (t === 'application/pdf' || /\.pdf$/i.test(n)) return 'pdf';
  if (/\.docx$/i.test(n) || t === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (/\.html?$/i.test(n) || t === 'text/html') return 'html';
  if (t.startsWith('image/') || IMG_EXT.test(n)) return 'image';
  if (t.startsWith('text/') || t === 'application/json' || t === 'application/xml' || TEXT_EXT.test(n)) return 'text';
  return null;
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…' };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? (() => { const c = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(c) && c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ''; })() : ENT[e.toLowerCase()] ?? m));
// HTML → текст: без скриптов, стилей и навигации, абзацы сохраняются
export function stripHtml(html) {
  let s = String(html || '');
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(s);
  s = s.replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(s); if (body) s = body[1];
  s = s.replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/pre|\/blockquote)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ');
  s = decode(s).replace(/[ \t\f\v]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return (t && decode(t[1]).trim() ? decode(t[1]).trim() + '\n\n' : '') + s;
}
// DOCX → текст: абзацы из word/document.xml
export function docxText(u8) {
  const z = unzipSync(u8, { filter: (f) => f.name === 'word/document.xml' }), x = z['word/document.xml'];
  if (!x) throw Object.assign(new Error('docx'), { kind: 'format' });
  return decode(strFromU8(x).replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<w:br[^>]*\/>/g, '\n').replace(/<[^>]+>/g, '')).replace(/\n{3,}/g, '\n\n').trim();
}
const clip = (text) => (text.length > LIMITS.textChars ? { text: text.slice(0, LIMITS.textChars), trimmed: true } : { text, trimmed: false });
const uid = () => 'a' + Math.random().toString(36).slice(2, 9);
export const b64Of = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

// Файл (File/Blob с name и type) → вложение; deps.pdfText(u8) — извлечение текста из PDF (core/ai/pdftext.js), deps.shrink(file) — сжатие картинки
export async function fromFile(file, deps = {}) {
  const name = String(file.name || 'файл'), kind = kindOf(name, file.type);
  if (!kind) throw Object.assign(new Error('type'), { kind: 'type' });
  if (file.size > LIMITS.fileBytes) throw Object.assign(new Error('big'), { kind: 'big' });
  if (kind === 'image') {
    const f = deps.shrink ? await deps.shrink(file) : file, u8 = new Uint8Array(await f.arrayBuffer());
    if (u8.length > LIMITS.imageBytes) throw Object.assign(new Error('big'), { kind: 'big' });
    return { id: uid(), name, kind: 'image', mime: f.type || file.type || 'image/jpeg', b64: b64Of(u8), chars: 0, bytes: u8.length, source: 'file' };
  }
  const u8 = new Uint8Array(await file.arrayBuffer());
  let raw;
  if (kind === 'pdf') { if (!deps.pdfText) throw Object.assign(new Error('pdf'), { kind: 'type' }); raw = await deps.pdfText(u8); }
  else if (kind === 'docx') raw = docxText(u8);
  else raw = new TextDecoder('utf-8').decode(u8).replace(/^﻿/, '');
  if (kind === 'html') raw = stripHtml(raw);
  raw = raw.replace(/\r\n?/g, '\n').trim();
  if (!raw) throw Object.assign(new Error('empty'), { kind: 'empty' });
  const c = clip(raw);
  return { id: uid(), name, kind: 'text', text: c.text, chars: c.text.length, trimmed: c.trimmed, source: 'file' };
}
// Ссылка: только https; get(url) → { status, data (текст), headers }; страница → текст (PDF и двоичное по ссылке не читаются)
export async function fromUrl(url, get) {
  let u; try { u = new URL(String(url).trim()); } catch { throw Object.assign(new Error('url'), { kind: 'url' }); }
  if (u.protocol !== 'https:' || u.username || u.password) throw Object.assign(new Error('https'), { kind: 'https' });
  const r = await get(u.href), type = String((r.headers && (r.headers['content-type'] || r.headers['Content-Type'])) || '').toLowerCase();
  if (r.status < 200 || r.status >= 300) throw Object.assign(new Error('http ' + r.status), { kind: 'http', status: r.status });
  if (type && !/text\/|json|xml/.test(type)) throw Object.assign(new Error('type'), { kind: 'type' });
  let raw = typeof r.data === 'string' ? r.data : JSON.stringify(r.data || '');
  if (raw.length > LIMITS.urlBytes) raw = raw.slice(0, LIMITS.urlBytes);
  if (/html/.test(type) || /^\s*<(!doctype|html)/i.test(raw)) raw = stripHtml(raw);
  raw = raw.replace(/\r\n?/g, '\n').trim();
  if (!raw) throw Object.assign(new Error('empty'), { kind: 'empty' });
  const c = clip(raw);
  return { id: uid(), name: u.hostname + (u.pathname.length > 1 ? u.pathname.slice(0, 40) : ''), kind: 'text', text: c.text, chars: c.text.length, trimmed: c.trimmed, source: 'url', url: u.href };
}

export const textChars = (atts) => (atts || []).reduce((n, a) => n + (a.kind === 'text' ? a.chars : 0), 0);
export const imagesOf = (atts) => (atts || []).filter((a) => a.kind === 'image');
// Текст вложений для запроса: каждое — отдельным блоком; сказано, что это данные, а не команды
export function textBlock(atts) {
  return (atts || []).filter((a) => a.kind === 'text').map((a) => '=== ВЛОЖЕНИЕ: ' + a.name + (a.url ? ' (' + a.url + ')' : '') + (a.trimmed ? ' [обрезано]' : '') + ' ===\n' + a.text + '\n=== КОНЕЦ ВЛОЖЕНИЯ ===').join('\n\n');
}
// Сжать картинку до 1568 px по длинной стороне, JPEG 0,85 (только в браузере/WebView); иначе — как есть
export async function shrinkImage(file, max = 1568) {
  try {
    if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') return file;
    const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size <= LIMITS.imageBytes) return file;
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
    return blob || file;
  } catch { return file; }
}
