// Текст из PDF для вложений чата: pdf.js (уже в сборке приложения, без сети), страницы по порядку, предел по знакам.
import PdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker';
import { LIMITS } from './attach.js';

let lib = null;
const load = () => lib || (lib = import('pdfjs-dist/legacy/build/pdf.mjs').catch((e) => { lib = null; throw e; }));
export async function pdfText(u8, maxPages = 80) {
  const pdfjs = await load();
  if (!pdfjs.GlobalWorkerOptions.workerPort) pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
  const doc = await pdfjs.getDocument({ data: u8.slice(), useSystemFonts: true }).promise;
  try {
    let out = '';
    for (let i = 1; i <= Math.min(doc.numPages, maxPages) && out.length < LIMITS.textChars; i++) {
      const page = await doc.getPage(i), tc = await page.getTextContent();
      let line = '', y = null;
      for (const it of tc.items) { if (!('str' in it)) continue; const yy = it.transform ? Math.round(it.transform[5]) : null; if (y !== null && yy !== null && Math.abs(yy - y) > 2) { out += line.trimEnd() + '\n'; line = ''; } line += it.str + (it.hasEOL ? '\n' : ' '); y = yy; }
      out += line.trimEnd() + '\n\n';
    }
    return out.trim();
  } finally { try { await doc.destroy(); } catch { /* */ } }
}
