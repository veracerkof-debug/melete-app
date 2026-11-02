// Затухание у края прокручиваемых рядов (вкладки разделов, ряды пресетов): видно, что дальше есть ещё —
// только когда ряд не помещается. Класс fr — есть что справа, fl — слева; рисует CSS (ui.css: .fr/.fl).
const SEL = '.tsw, .hscroll';
const seen = new WeakSet();
const mark = (el) => {
  const over = el.scrollWidth - el.clientWidth > 2;
  el.classList.toggle('fl', over && el.scrollLeft > 2);
  el.classList.toggle('fr', over && el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
};
let ro = null, raf = 0;
const scan = () => {
  raf = 0;
  document.querySelectorAll(SEL).forEach((el) => {
    if (!seen.has(el)) { seen.add(el); el.addEventListener('scroll', () => mark(el), { passive: true }); ro && ro.observe(el); }
    mark(el);
  });
};
export function startEdgeFade() {
  if (typeof document === 'undefined') return;
  ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((es) => es.forEach((e) => mark(e.target))) : null;
  // новые ряды появляются при каждой отрисовке экрана: пересмотр раз в кадр, только когда добавились элементы
  new MutationObserver((ms) => { if (!raf && ms.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1))) raf = requestAnimationFrame(scan); })
    .observe(document.body, { childList: true, subtree: true });
  scan();
}
