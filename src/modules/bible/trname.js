// Короткое имя перевода (RST, NRT 23…): известные переводы — по названию; короткое слитное сокращение из модуля — как есть; иначе заглавные буквы слов названия
const KNOWN = [[/современный перевод|новый русский|new russian|\bnrt\b/i, 'NRT'], [/синодальн|synodal|\brst\b/i, 'RST'], [/new international|\bniv\b/i, 'NIV'], [/english standard|\besv\b/i, 'ESV'], [/king james|\bkjv\b/i, 'KJV'], [/new living|\bnlt\b/i, 'NLT'], [/world english|\bweb\b/i, 'WEB']];
export function shortName(r) {
  if (!r) return '';
  const src = [r.name, r.meta && r.meta.file, r.meta && r.meta.abbr].filter(Boolean).join(' '), k = KNOWN.find(([re]) => re.test(src));
  if (k) { const y = /(?:^|\D)(?:19|20)(\d\d)(?!\d)/.exec(src); return k[1] + (k[1] === 'NRT' && y ? ' ' + y[1] : ''); }
  const ab = String((r.meta && r.meta.abbr) || '').trim();
  if (/^[\p{L}\p{N}._-]{1,8}$/u.test(ab)) return ab;
  const words = String(r.name || ab).replace(/[.,:;()«»"“”]/g, ' ').split(/\s+/).filter((w) => w && !/^(святая|святое|библия|bible|holy|the|of|новый|завет)$/i.test(w));
  const ini = words.map((w) => w[0].toUpperCase()).join('').slice(0, 5);
  return ini.length >= 2 ? ini : (words[0] || ab || r.name || '').slice(0, 6);
}
