// Текст песни с аккордами: распознавание аккордов, транспонирование, разметка.
// Перенесено из legacy/practice.html (CH_RE, trChord, lyricsHTML).
import { SH, FL, NAT } from './notes.js';
import { transposeChord, shiftKey } from './transpose.js';
import { parseDegree, chordToDegree, degreeToChord, degreeToRoman, degreeToNash } from './degrees.js';

export const CH_RE = /^\(?[A-H](?:#|b|♯|♭)?(?:maj|min|m|M|dim|aug|sus|add|°|ø|\+)?[0-9]*(?:(?:sus|add|maj|b|#|♭|♯)[0-9]+)*(?:\/[A-H](?:#|b|♯|♭)?)?\)?$/;

// Русские буквы вместо латинских в аккордах (слово автора 28.11.2026: из Holyrics приходят «[Е] [А] [Н]» с кириллицей): А В С Е Н М → A B C E H M,
// м → m. Замена один к одному (длина текста та же — подсветка редактора не съезжает). В квадратных скобках — всегда, если после замены
// получился аккорд; в строках без скобок — только если вся строка из аккордов и есть хотя бы один «не буква»-признак (знак, цифра, m, косая),
// чтобы слова «А», «В», «Е» в тексте песни не превращались в аккорды.
const GLYPH = { 'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'М': 'M', 'м': 'm', 'а': 'a', 'х': 'x', 'Х': 'x' };
const GLYPH_RE = /[АВСЕНМмаХх]/;
const fixTok = (t) => t.replace(/[АВСЕНМмаХх]/g, (c) => GLYPH[c]);
export function fixGlyphs(txt) {
  const src = String(txt || '');
  if (!GLYPH_RE.test(src)) return src;
  return src.split('\n').map((line) => {
    if (!GLYPH_RE.test(line)) return line;
    // [Е] [А/Н] — в скобках
    let out = line.replace(/\[([^\]]+)\]/g, (m, c) => { if (!GLYPH_RE.test(c)) return m; const f = fixTok(c); return CH_RE.test(f) || /^[xX]\s*\d+$/.test(f) ? '[' + f + ']' : m; });
    // смешанная строка из одних аккордов: часть в скобках, часть без («[Е][А]С#m[Н]») — аккорды без скобок тоже
    if (/\[/.test(out)) {
      const bare = out.replace(/\[[^\]]*\]/g, ' ').trim().split(/\s+/).filter(Boolean);
      if (bare.length && bare.every((t) => CH_RE.test(fixTok(t)) || /^[|\-–/x]+$/.test(fixTok(t)) || /^[xX]\s*\d+$/.test(fixTok(t)))) out = out.split(/(\[[^\]]*\])/).map((seg) => (seg.startsWith('[') ? seg : fixTok(seg))).join('');
    }
    // строка без скобок: все слова — аккорды, и хотя бы одно не из одной буквы
    if (!/\[/.test(out)) {
      const toks = out.trim().split(/\s+/).filter(Boolean), fx = toks.map(fixTok);
      if (toks.length && fx.every((t) => CH_RE.test(t) || /^[|\-–/x]+$/.test(t)) && fx.some((t) => CH_RE.test(t) && t.length > 1)) out = out.replace(/\S+/g, fixTok);
    }
    return out;
  }).join('\n');
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Сдвиг аккорда на n полутонов; бемольное написание сохраняется (и выбирается при сдвиге вниз)
export function trChord(ch, n) {
  if (!n) return ch.replace(/#/g, '♯').replace(/([A-H])b/g, '$1♭');
  const flat = /[A-H](b|♭)/.test(ch) || (n < 0 && !/[#♯]/.test(ch));
  return ch.replace(/([A-H])(#|b|♯|♭)?/g, (m, L, acc) => {
    const base = L === 'H' ? 11 : NAT[L];
    const pc = (base + (acc === '#' || acc === '♯' ? 1 : acc === 'b' || acc === '♭' ? -1 : 0) + n + 24) % 12;
    return (flat ? FL : SH)[pc];
  });
}

// Аккорды могут быть записаны и ступенями (src/music/degrees.js): римскими цифрами — всегда, числами
// нэшвиллской системы — только если в тексте нет буквенных аккордов (иначе «1» или «2» могли бы быть просто числами)
const letterChords = (txt) => String(txt || '').split('\n').some((line) =>
  (isLine(line, true) && line.trim().split(/\s+/).some((t) => CH_RE.test(t))) || [...line.matchAll(/\[([^\]]+)\]/g)].some((m) => CH_RE.test(m[1])));
const tokOf = (t, numbers) => (CH_RE.test(t) ? 'chord' : parseDegree(t, { numbers }) ? 'deg' : null);
const isLine = (line, numbers) => { const toks = line.trim().split(/\s+/).filter(Boolean); return toks.length > 0 && toks.every((t) => tokOf(t, numbers) || /^[|\-–/x]+$/.test(t)); };
const isChordLine = (line) => isLine(line, false) && line.trim().split(/\s+/).some((t) => CH_RE.test(t));

// Все аккорды текста по порядку: строки только из аккордов и аккорды в квадратных скобках
export function chordsIn(txt) {
  txt = fixGlyphs(txt);
  const out = [];
  String(txt || '').split('\n').forEach((line) => {
    if (isChordLine(line)) line.trim().split(/\s+/).forEach((t) => { if (CH_RE.test(t)) out.push(t.replace(/^\(|\)$/g, '')); });
    else line.replace(/\[([^\]]+)\]/g, (m, c) => { if (CH_RE.test(c)) out.push(c.replace(/^\(|\)$/g, '')); return m; });
  });
  return out;
}

// Ступени, записанные в тексте (римские цифры или числа)
export function degreesIn(txt) {
  txt = fixGlyphs(txt);
  const numbers = !letterChords(txt), out = [];
  String(txt || '').split('\n').forEach((line) => {
    if (isLine(line, numbers)) line.trim().split(/\s+/).forEach((t) => { const d = !CH_RE.test(t) && parseDegree(t, { numbers }); if (d) out.push(d); });
    else line.replace(/\[([^\]]+)\]/g, (m, c) => { const d = !CH_RE.test(c) && parseDegree(c, { numbers }); if (d) out.push(d); return m; });
  });
  return out;
}

// Строки только из аккордов подсвечиваются целиком; в тексте — аккорды в квадратных скобках [Am].
// key — исходная тональность { pc, minor, sharp }: тогда написание по ступеням (src/music/transpose.js);
// без неё — простой сдвиг, как в прототипе.
// view: 'chords' — аккордами в тональности со сдвигом n; 'degrees' — ступенями, style: 'roman' | 'nash'.
// Что бы ни было в тексте (аккорды или ступени), показывается выбранный вид.

// «Не распознано» (решение автора 22.11.2026): похоже на аккорд или ступень (буквы и знаки аккорда), но не разобралось — опечатка вроде
// [IIII], [Vv], [Amj7]. Слова («Припев», Chorus, Bridge) и «х2» сюда не попадают: в них есть буквы, которых нет в аккордах.
const ATTEMPT = /^\(?(?:[b♭#♯]?[ivxIVX]+|[A-H][#b♯♭]?)[0-9majindugsbMAJDSivxIVX°ø+♯♭#()\/\-]*\)?$/;
const REPEAT = /^[xXхХ×]\s*\d+$|^\d+\s*[xXхХ×]$/; // «x2», «2х» — повтор, не аккорд
const looksLikeChord = (t) => !REPEAT.test(t) && (ATTEMPT.test(t) && /[ivxIVXA-H]/.test(t) && !/^[A-Ha-h]$/.test(t) || /^[ivxIVX]{2,}$/.test(t));
const SEP = /^[|\-–/x]+$/;
// Строка из одних аккордов, часть которых в скобках, часть без: «[E][A]C#m[H] [x2]» (слова песни такую строку не делают)
const mixedChordLine = (line, numbers) => {
  if (!/\[[^\]]+\]/.test(line)) return false;
  const inner = [...line.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]), bare = line.replace(/\[[^\]]*\]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return inner.some((c) => tokOf(c, numbers)) && inner.every((c) => tokOf(c, numbers) || REPEAT.test(c) || looksLikeChord(c)) && bare.every((t) => tokOf(t, numbers) || SEP.test(t) || REPEAT.test(t));
};
// Строка аккордов с ошибкой: хотя бы две «лексемы», одна разобрана, остальные — разобраны, похожи на аккорд или разделитель
const isLooseLine = (line, numbers) => {
  const toks = line.trim().split(/\s+/).filter(Boolean);
  return toks.length >= 2 && toks.some((t) => tokOf(t, numbers)) && toks.every((t) => tokOf(t, numbers) || SEP.test(t) || (looksLikeChord(t) && !/^[a-z]{3,}$/.test(t)));
};
const kindOf = (t, numbers) => (tokOf(t, numbers) ? 'ok' : looksLikeChord(t) && !SEP.test(t) ? 'bad' : null);
// Сколько мест «не распознано» в тексте (для подсказки в редакторе)
export function badIn(txt) {
  txt = fixGlyphs(txt);
  const numbers = !letterChords(txt);
  let n = 0;
  String(txt || '').split('\n').forEach((line) => {
    if (isLine(line, numbers) || isLooseLine(line, numbers)) line.trim().split(/\s+/).forEach((t) => { if (kindOf(t, numbers) === 'bad') n++; });
    else line.replace(/\[([^\]]+)\]/g, (m, c) => { if (kindOf(c, numbers) === 'bad') n++; return m; });
  });
  return n;
}
// Подсветка при наборе: тот же текст дословно, распознанное и «не распознанное» — в <mark> (редактор рисует это под текстом)
export function markupHTML(txt) {
  txt = fixGlyphs(txt);
  const numbers = !letterChords(txt);
  return String(txt || '').split('\n').map((line) => {
    if (isLine(line, numbers) || isLooseLine(line, numbers)) return line.split(/(\s+)/).map((t) => { const k = /\S/.test(t) ? kindOf(t, numbers) : null; return k ? '<mark class="' + (k === 'ok' ? 'c' : 'x') + '">' + esc(t) + '</mark>' : esc(t); }).join('');
    return esc(line).replace(/\[([^\]]+)\]/g, (m, c) => { const k = kindOf(c, numbers); return k ? '<mark class="' + (k === 'ok' ? 'c' : 'x') + '">' + m + '</mark>' : m; });
  }).join('\n');
}

// view: 'chords' — аккордами в тональности со сдвигом n; 'degrees' — ступенями; 'both' — аккорд и под ним ступень (учить, привыкать).
export function lyricsHTML(txt, n, key = null, { view = 'chords', style = 'roman' } = {}) {
  txt = fixGlyphs(txt);
  const numbers = !letterChords(txt);
  const asDeg = (x) => (style === 'nash' ? degreeToNash(x) : degreeToRoman(x));
  const degOf = (c) => (CH_RE.test(c) ? (key ? chordToDegree(c, key) : null) : parseDegree(c, { numbers }));
  const tr = (c) => {
    if (CH_RE.test(c)) {
      if (view === 'degrees' && key) { const x = chordToDegree(c, key); if (x) return asDeg(x); }
      return key ? transposeChord(c, n, key) : trChord(c, n);
    }
    const x = parseDegree(c, { numbers });
    if (!x) return c;
    if (view === 'degrees') return asDeg(x);
    return key ? degreeToChord(x, shiftKey(key, n)) : asDeg(x);
  };
  const b = (c) => {
    if (view !== 'both' || !key) return '<b class="chd">' + esc(tr(c)) + '</b>';
    const x = degOf(c);
    return '<b class="chd both">' + esc(tr(c)) + (x ? '<i>' + esc(asDeg(x)) + '</i>' : '') + '</b>';
  };
  const bad = (c) => '<b class="chd bad" role="button" tabindex="0" data-bad="' + esc(c) + '">' + esc(c) + '</b>';
  return txt.split('\n').map((line) => {
    if (isLine(line, numbers) || isLooseLine(line, numbers)) return line.replace(/\S+/g, (t) => (tokOf(t, numbers) ? b(t) : kindOf(t, numbers) === 'bad' ? bad(t) : esc(t)));
    if (mixedChordLine(line, numbers)) return line.split(/(\[[^\]]*\])/).map((seg) => (seg.startsWith('[') ? (tokOf(seg.slice(1, -1), numbers) ? b(seg.slice(1, -1)) : kindOf(seg.slice(1, -1), numbers) === 'bad' ? bad(seg.slice(1, -1)) : esc(seg)) : seg.replace(/\S+/g, (t) => (tokOf(t, numbers) ? b(t) : esc(t))))).join('');
    return esc(line).replace(/\[([^\]]+)\]/g, (m, c) => (tokOf(c, numbers) ? b(c) : kindOf(c, numbers) === 'bad' ? bad(c) : m));
  }).join('\n');
}

// Замена записи насовсем (кнопка в редакторе текста): to = 'deg' — буквенные аккорды → римские цифры в тональности key;
// 'chords' — ступени → аккорды в key. Строка аккордов сохраняет «колонки» над словами: короче — добавляются пробелы, длиннее — съедаются пробелы после.
export function convertText(txt, key, to = 'deg') {
  if (!key) return txt;
  txt = fixGlyphs(txt);
  const numbers = !letterChords(txt);
  const conv = (c) => {
    if (to === 'deg') { if (!CH_RE.test(c)) return c; const x = chordToDegree(c, key); return x ? degreeToRoman(x) : c; }
    if (CH_RE.test(c)) return c;
    const x = parseDegree(c, { numbers });
    return x ? degreeToChord(x, key) : c;
  };
  return String(txt || '').split('\n').map((line) => {
    if (isLine(line, numbers) || isLooseLine(line, numbers)) {
      const parts = line.split(/(\s+)/); let debt = 0;
      return parts.map((t) => {
        if (!t) return t;
        if (/^\s+$/.test(t)) { const keep = Math.max(1, t.length - Math.max(0, debt)); debt = Math.max(0, debt - (t.length - keep)); return ' '.repeat(keep); }
        const r = tokOf(t, numbers) ? conv(t) : t;
        const d = r.length - t.length;
        if (d < 0) return r + ' '.repeat(-d) + (debt < 0 ? '' : '') ;
        debt += d;
        return r;
      }).join('').replace(/\s+$/, '');
    }
    return line.replace(/\[([^\]]+)\]/g, (m, c) => (tokOf(c, numbers) ? '[' + conv(c) + ']' : m));
  }).join('\n');
}

// Подсказка к «не распознано»: что, скорее всего, имелось в виду (регистр, «mj» → «maj», лишние повторы), иначе null
export function suggestFix(tok, txt = '') {
  const numbers = !letterChords(txt), t = String(tok);
  const tries = [/^([ivx])\1+$/i.test(t) && t !== t.toUpperCase() && t !== t.toLowerCase() ? t[0].toUpperCase() : t, t.toUpperCase(), t.toLowerCase(), t.replace(/mj/gi, 'maj'), t.replace(/(.)\1{3,}/g, '$1$1$1'), t.replace(/^([ivxIVX]+)(?=[^ivxIVX]|$)/, (m) => m.slice(0, 3)),
    t.replace(/^([A-Ha-h])/, (m) => m.toUpperCase()), t.replace(/^([iIvVxX]+)/, (m) => (m === m.toUpperCase() ? m.toLowerCase() : m.toUpperCase()))];
  return tries.find((x) => x !== t && (CH_RE.test(x) || parseDegree(x, { numbers }))) || null;
}
