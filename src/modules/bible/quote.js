// Библия: цитата стихов с ссылкой и переводом, поиск по тексту — чистые функции (tests/bible.test.js)

// Номера стихов: «16–18, 20»
export function refOf(vs) {
  vs = [...new Set(vs)].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < vs.length;) {
    let j = i;
    while (j + 1 < vs.length && vs[j + 1] === vs[j] + 1) j++;
    out.push(vs[i] + (j > i ? '–' + vs[j] : ''));
    i = j + 1;
  }
  return out.join(', ');
}

// Текст стихов: один — без номера, несколько — с номерами; ниже — книга, глава, стихи и перевод
export function quoteText(vs, textOf, ref, tr) {
  vs = [...new Set(vs)].sort((a, b) => a - b);
  const body = vs.map((v) => (vs.length > 1 ? v + ' ' : '') + String(textOf(v) || '').trim()).join(' ');
  return body + '\n— ' + ref + ':' + refOf(vs) + (tr ? ' (' + tr + ')' : '');
}

// Поиск без учёта регистра и ё/е
export const normQ = (x) => String(x).toLowerCase().replace(/ё/g, 'е');

// Найденный стих: кусок вокруг совпадения с <mark>; null — не найдено. nq — normQ(запрос)
export function hitHTML(v, nq, esc) {
  const n = normQ(v), i = n.indexOf(nq);
  if (i < 0) return null;
  const a = Math.max(0, i - 60), b = i + nq.length, z = Math.min(v.length, b + 120);
  return (a ? '…' : '') + esc(v.slice(a, i)) + '<mark>' + esc(v.slice(i, b)) + '</mark>' + esc(v.slice(b, z)) + (z < v.length ? '…' : '');
}
