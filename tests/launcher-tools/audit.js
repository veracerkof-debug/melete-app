// аудит экрана: вызывается в странице — возвращает список находок
window.__audit = (scopeSel, label) => {
  const out = [];
  const lum = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const alpha = (c) => { const m = c.match(/[\d.]+/g); return m && m.length > 3 ? +m[3] : 1; };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (alpha(cs.backgroundColor) > 0.5 && cs.backgroundColor !== 'transparent') return cs.backgroundColor; } return getComputedStyle(document.body).backgroundColor; };
  const W = innerWidth;
  const scope = document.querySelector(scopeSel);
  if (!scope) return [`${label}: нет ${scopeSel}`];
  const seen = new Set();
  scope.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) return;
    // за край по горизонтали (кроме намеренно уходящих)
    if ((r.right > W + 2 || r.left < -2) && !el.closest('.l-wh-i, .l-dial-i, .l-wheel, svg, .l-scrub, .l-d-ghost') && el.textContent.trim()) {
      const k = 'over:' + el.className;
      if (!seen.has(k)) { seen.add(k); out.push(`${label}: за край ${el.tagName}.${el.className} [${Math.round(r.left)}..${Math.round(r.right)}] «${el.textContent.trim().slice(0, 30)}»`); }
    }
    // контраст текста: только у элементов со своим текстом
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (own && +cs.opacity > 0.3) {
      const fg = lum(cs.color), bg = lum(bgOf(el));
      if (fg != null && bg != null) {
        const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
        if (ratio < 2.6) { const k = 'c:' + el.className + cs.color; if (!seen.has(k)) { seen.add(k); out.push(`${label}: контраст ${ratio.toFixed(2)} ${el.tagName}.${el.className} «${el.textContent.trim().slice(0, 24)}» ${cs.color} на ${bgOf(el)}`); } }
      }
    }
    // цели касания
    if ((el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && (r.height < 30 || r.width < 30) && !el.closest('.l-dial-i, .l-wh-i')) {
      const k = 't:' + el.className; if (!seen.has(k)) { seen.add(k); out.push(`${label}: мелкая цель ${Math.round(r.width)}×${Math.round(r.height)} .${el.className} «${el.textContent.trim().slice(0, 20)}»`); }
    }
  });
  // блоки главного не наезжают друг на друга
  const blks = [...document.querySelectorAll('.l-home > [data-blk]')].filter((b) => !b.hidden && getComputedStyle(b).position !== 'absolute').map((b) => [b.dataset.blk, b.getBoundingClientRect()]);
  for (let i = 0; i < blks.length; i++) for (let j = i + 1; j < blks.length; j++) {
    const [a, ra] = blks[i], [b, rb] = blks[j];
    const ov = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ov > 4 && a !== 'space' && b !== 'space') out.push(`${label}: наложение блоков ${a}/${b} на ${Math.round(ov)}px`);
  }
  // не помещается по высоте
  document.querySelectorAll('.l-home > [data-blk]').forEach((b) => { const r = b.getBoundingClientRect(); if (r.bottom > innerHeight + 2 && !b.hidden) out.push(`${label}: блок ${b.dataset.blk} ниже экрана (${Math.round(r.bottom)})`); });
  return out;
};
