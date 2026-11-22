// PDF из нарисованного alphaTab стана: SVG страниц → картинки → A4 (150 dpi) → pdf (music/pdfwriter.js). Общий для «с игры» и редактора.
import { jpegsToPdf } from '../../music/pdfwriter.js';

// surf — поверхность alphaTab (`.atsurf`), fontUrl — шрифт Bravura (встраивается в картинки: из SVG своих шрифтов не видно)
export async function scorePdfBytes(surf, fontUrl) {
  const root = surf && surf.querySelector('.at-surface'), svgs = root ? [...root.querySelectorAll('svg')] : [];
  if (!svgs.length) throw new Error('нет отрисованных нот');
  let font = '';
  try { const b = await (await fetch(fontUrl)).blob(); font = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.readAsDataURL(b); }); } catch { /* без шрифта ноты не нарисуются — ошибка ниже */ }
  const W = 1240, H = 1754, M = 70; // A4 при 150 dpi
  const items = svgs.map((el) => ({ el, r: el.getBoundingClientRect() })).sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
  const k = (W - 2 * M) / Math.max(1, ...items.map((x) => x.r.width));
  const pages = []; let cv = null, g = null, y = M;
  const fresh2 = () => { cv = document.createElement('canvas'); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); y = M; };
  const flush = async () => { const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.92)); pages.push({ w: W, h: H, u8: new Uint8Array(await blob.arrayBuffer()) }); };
  const toImg = (el, r) => new Promise((res, rej) => {
    const c = el.cloneNode(true); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', Math.ceil(r.width)); c.setAttribute('height', Math.ceil(r.height));
    // ноты — глифы шрифта по правилу страницы «.at-surface.at .at»: клону правило не достаётся, переносим вычисленный стиль (семья, размер)
    // на каждый .at и встраиваем сам шрифт (картинка из SVG своих шрифтов не видит)
    const live = [...el.querySelectorAll('.at')];
    [...c.querySelectorAll('.at')].forEach((n, i) => { const cs = live[i] && getComputedStyle(live[i]); n.setAttribute('style', (n.getAttribute('style') || '') + ';font-family:alphaTab;font-style:normal;font-weight:normal;line-height:1' + (cs ? ';font-size:' + cs.fontSize : '')); });
    if (font) { const st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = '@font-face{font-family:"alphaTab";src:url(data:font/woff2;base64,' + font + ') format("woff2")}'; c.insertBefore(st, c.firstChild); }
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)], { type: 'image/svg+xml;charset=utf-8' }));
    const im = new Image(); im.onload = () => { URL.revokeObjectURL(url); res(im); }; im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('svg')); }; im.src = url;
  });
  for (const it of items) {
    const h = it.r.height * k;
    if (!cv) fresh2(); else if (y + h > H - M) { await flush(); fresh2(); }
    g.drawImage(await toImg(it.el, it.r), M, y, it.r.width * k, h); y += h;
  }
  await flush();
  return jpegsToPdf(pages);
}
