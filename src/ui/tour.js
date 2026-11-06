// Инструкция с подсветкой (слово автора 06.11.2026, пункт 20): всё затемнено, кроме показываемого элемента; рядом —
// короткая надпись. «Дальше» — следующий шаг, «Пропустить» или касание в любом другом месте — пропуск всей инструкции;
// кнопки экрана под затемнением не нажимаются (касание по ним — тоже пропуск). На последнем шаге — «Больше не показывать».
// steps — [{ sel | el, text, title? }]; root — где искать sel; шаги без элемента на экране пропускаются.
// Возвращает Promise<{ done: bool, never: bool }>.
import { esc } from './index.js';
import './tour.css';

const visible = (el) => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight; };

export function tour(steps, { root = document, t, never = true } = {}) {
  const list = steps.map((s) => ({ ...s, el: s.el || (s.sel ? root.querySelector(s.sel) : null) })).filter((s) => !s.sel && !s.el ? true : visible(s.el));
  if (!list.length) return Promise.resolve({ done: false, never: false, empty: true });
  return new Promise((resolve) => {
    let i = 0;
    const L = document.createElement('div');
    L.className = 'tour';
    L.setAttribute('role', 'dialog');
    L.setAttribute('aria-modal', 'true');
    L.innerHTML = '<div class="tourhole"></div><div class="tourbub" role="document"><div class="tourtx"></div><div class="tourft"></div></div>';
    document.body.appendChild(L);
    const hole = L.querySelector('.tourhole'), bub = L.querySelector('.tourbub');
    const finish = (done) => {
      const nv = !!(L.querySelector('[data-tour="never"]') || {}).checked;
      removeEventListener('resize', place);
      L.classList.add('out');
      setTimeout(() => L.remove(), 180);
      resolve({ done, never: done && nv });
    };
    function place() {
      const s = list[i], el = s.el;
      if (el && visible(el)) {
        const r = el.getBoundingClientRect(), pad = 6;
        Object.assign(hole.style, { display: 'block', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
        L.classList.remove('nohole');
        // надпись — под элементом, если внизу хватает места, иначе над ним
        const below = r.bottom + 14, bh = bub.offsetHeight || 140;
        bub.style.top = (below + bh < innerHeight - 12 ? below : Math.max(12, r.top - bh - 14)) + 'px';
      } else {
        hole.style.display = 'none';
        L.classList.add('nohole');
        bub.style.top = Math.max(12, innerHeight / 2 - 90) + 'px';
      }
    }
    function show() {
      const s = list[i], last = i === list.length - 1;
      if (s.el && s.el.scrollIntoView) s.el.scrollIntoView({ block: 'nearest' });
      bub.querySelector('.tourtx').innerHTML = (s.title ? '<b>' + esc(s.title) + '</b>' : '') + '<span>' + esc(s.text) + '</span>';
      bub.querySelector('.tourft').innerHTML = '<span class="tourn num">' + (i + 1) + ' / ' + list.length + '</span>' +
        (last && never ? '<label class="tournv"><input type="checkbox" data-tour="never" checked><span>' + esc(t('help.never')) + '</span></label>' : '') +
        '<button class="tourbtn skip" data-tour="skip">' + esc(t('tour.skip')) + '</button>' +
        '<button class="tourbtn next" data-tour="next">' + esc(t(last ? 'tour.done' : 'tour.next')) + '</button>';
      requestAnimationFrame(place);
      bub.querySelector('[data-tour="next"]').focus({ preventScroll: true });
    }
    // всё касание — здесь: кнопки надписи работают, остальное (в том числе подсвеченный элемент) — пропуск
    L.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('.tournv')) return; // галочка «Больше не показывать» — как обычно
      e.preventDefault();
      const b = e.target.closest('[data-tour]');
      if (b && b.dataset.tour === 'next') { if (i < list.length - 1) { i++; show(); } else finish(true); }
      else if ((b && b.dataset.tour === 'skip') || !e.target.closest('.tourbub')) finish(false);
    }, true);
    ['pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach((k) => L.addEventListener(k, (e) => e.stopPropagation()));
    L.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(false); });
    addEventListener('resize', place);
    show();
  });
}
