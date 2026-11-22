// Минимальный PDF из картинок-страниц (JPEG, DCTDecode): без библиотек. Страница — одна картинка на весь лист A4 (или свой размер).
// pages: [{ w, h, u8 }] — пиксели и байты JPEG; → Uint8Array файла PDF. Используется для печати табов («Выгрузить → PDF»).
const enc = new TextEncoder();

export function jpegsToPdf(pages, { pw = 595.28, ph = 841.89 } = {}) {
  const chunks = []; let len = 0; const offs = [];
  const put = (x) => { const u = typeof x === 'string' ? enc.encode(x) : x; chunks.push(u); len += u.length; };
  const obj = (n, body, stream) => { offs[n] = len; put(n + ' 0 obj\n' + body + (stream ? '\nstream\n' : '\nendobj\n')); if (stream) { put(stream); put('\nendstream\nendobj\n'); } };
  const N = pages.length, first = 3; // 1 — каталог, 2 — дерево страниц, дальше по три объекта на страницу: страница, содержимое, картинка
  put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Count ' + N + ' /Kids [' + pages.map((_, i) => (first + i * 3) + ' 0 R').join(' ') + '] >>');
  pages.forEach((p, i) => {
    const pg = first + i * 3, ct = pg + 1, im = pg + 2, k = Math.min(pw / p.w, ph / p.h), w = p.w * k, h = p.h * k, x = 0, y = ph - h;
    obj(pg, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw.toFixed(2) + ' ' + ph.toFixed(2) + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>');
    const c = 'q ' + w.toFixed(2) + ' 0 0 ' + h.toFixed(2) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' cm /Im0 Do Q';
    obj(ct, '<< /Length ' + c.length + ' >>', enc.encode(c));
    obj(im, '<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.u8.length + ' >>', p.u8);
  });
  const total = first + N * 3, xref = len;
  let x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
  for (let n = 1; n < total; n++) x += String(offs[n]).padStart(10, '0') + ' 00000 n \n';
  put(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
  const out = new Uint8Array(len); let o = 0; chunks.forEach((u) => { out.set(u, o); o += u.length; });
  return out;
}
