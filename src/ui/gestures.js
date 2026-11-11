// Общие жесты: смахивание влево-вправо и щипок двумя пальцами. Принцип приложения: где жест удобен, понятен
// и принят в телефонах — он есть, а кнопки остаются для тех, кто жестов не знает.
// Защита от случайных срабатываний: смахивание — только почти горизонтальное, быстрое и достаточно длинное;
// не начинается на полях ввода, ползунках, клавишах, полосах выбора с прокруткой и там, где стоит data-noswipe.
let lastSwipe = 0;
const NOSWIPE = 'input, textarea, select, [contenteditable], .hscroll, .kb, canvas, [role="slider"], [data-noswipe], .mwheel';

// el — где слушать; left() — смахнули влево (дальше), right() — вправо (назад).
// min — сколько пикселей пройти; edge — начинать только у левого края (жест «назад»), 0 — где угодно
export function swipe(el, { left, right, min = 70, edge = 0, ok = () => true } = {}) {
  let s = null;
  const down = (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary || !ok(e)) { s = null; return; }
    if (e.target.closest && e.target.closest(NOSWIPE)) { s = null; return; }
    if (edge && e.clientX > edge) { s = null; return; }
    s = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  };
  const up = (e) => {
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y, dt = performance.now() - s.t;
    s = null;
    if (dt > 700 || Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 2) return;
    if (document.getSelection && String(document.getSelection()).length) return; // выделяли текст
    if ((dx < 0 && left) || (dx > 0 && right)) lastSwipe = performance.now(); // смахивание между страницами его не повторит
    if (dx < 0 && left) left(); else if (dx > 0 && right) right();
  };
  const cancel = () => { s = null; };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', cancel); };
}

// Щипок двумя пальцами: get() — текущее значение, set(v, live) — новое (live — во время жеста, false — в конце).
// Значение меняется пропорционально расстоянию между пальцами, в пределах min…max; ok(e) — начинать ли здесь
export function pinch(el, { get, set, min = 10, max = 64, ok = () => true }) {
  let p = null;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const start = (e) => { if (e.touches.length === 2 && ok(e)) p = { d: dist(e.touches), v: get() }; };
  const move = (e) => {
    if (!p || e.touches.length !== 2) return;
    e.preventDefault();
    set(Math.max(min, Math.min(max, Math.round(p.v * (dist(e.touches) / p.d)))), true);
  };
  const end = (e) => { if (p && e.touches.length < 2) { set(get(), false); p = null; } };
  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchmove', move, { passive: false });
  el.addEventListener('touchend', end);
  el.addEventListener('touchcancel', end);
  return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchmove', move); el.removeEventListener('touchend', end); el.removeEventListener('touchcancel', end); };
}

// Два пальца — «раздвинуть» или «свести» (слово автора 06.11.2026): развести пальцы — во весь экран, свести — обратно
// (в сессии — окна звучащих инструментов). Срабатывает один раз, когда пальцы отпущены, и только если расстояние
// изменилось заметно (в 1,4 раза). Не спорит с щипками внутри: если ближний обработчик уже взял жест
// (preventDefault на touchmove — масштаб табов, нот, текста), этот молчит; ok(e) — можно ли начинать здесь.
export function spread(el, { out, inn, ok = () => true, k = 1.4 } = {}) {
  let p = null;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const start = (e) => {
    if (e.touches.length === 2) p = ok(e) ? { d: Math.max(1, dist(e.touches)), r: 1, taken: false, e } : null;
    else if (e.touches.length > 2) p = null;
  };
  const move = (e) => {
    if (!p || e.touches.length !== 2) return;
    if (e.defaultPrevented) p.taken = true;
    p.r = dist(e.touches) / p.d;
  };
  const end = (e) => {
    if (!p || e.touches.length >= 2) return;
    const q = p; p = null;
    if (q.taken) return;
    if (q.r >= k && out) out(q.e);
    else if (q.r <= 1 / k && inn) inn(q.e);
  };
  const cancel = () => { p = null; };
  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchmove', move, { passive: true });
  el.addEventListener('touchend', end);
  el.addEventListener('touchcancel', cancel);
  return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchmove', move); el.removeEventListener('touchend', end); el.removeEventListener('touchcancel', cancel); };
}
// Где двумя пальцами не управлять окном: пианино и глайдер (там играют несколькими пальцами — только кнопки),
// поля ввода и то, что само масштабируется щипком
export const NOSPREAD = '[data-group="piano"], [data-group="glider"], input, textarea, select, [contenteditable], [data-nospread]';

// Масштаб двумя пальцами по двум осям (слово автора 06.11.2026 — Студия, пиано-ролл, ударные): развести или свести
// по горизонтали — kx, по вертикали — ky, наискось — оба; ось выбирается по тому, как пальцы поставлены (почти в ряд —
// только x, почти друг над другом — только y). start(mx, my) — пальцы поставлены (середина между ними, экранные
// координаты); move(kx, ky, mx, my) — во время жеста (k — во сколько раз от начала); end() — пальцы отпущены.
export function zoom2(el, { start, move, end, ok = () => true }) {
  let z = null;
  const spanOf = (t) => ({ dx: Math.abs(t[0].clientX - t[1].clientX), dy: Math.abs(t[0].clientY - t[1].clientY), mx: (t[0].clientX + t[1].clientX) / 2, my: (t[0].clientY + t[1].clientY) / 2 });
  const ts = (e) => {
    if (e.touches.length !== 2) { if (e.touches.length > 2) z = null; return; }
    if (!ok(e)) return;
    z = spanOf(e.touches);
    z.ax = z.dx > z.dy * 1.7 ? 'x' : z.dy > z.dx * 1.7 ? 'y' : 'xy';
    if (start) start(z.mx, z.my, e);
  };
  const tm = (e) => {
    if (!z || e.touches.length !== 2) return;
    e.preventDefault();
    const s = spanOf(e.touches);
    const kx = z.ax !== 'y' && z.dx > 24 ? s.dx / z.dx : 1, ky = z.ax !== 'x' && z.dy > 24 ? s.dy / z.dy : 1;
    move(kx, ky, s.mx, s.my);
  };
  const te = (e) => { if (z && e.touches.length < 2) { z = null; if (end) end(); } };
  el.addEventListener('touchstart', ts, { passive: true });
  el.addEventListener('touchmove', tm, { passive: false });
  el.addEventListener('touchend', te);
  el.addEventListener('touchcancel', te);
  return () => { el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', te); el.removeEventListener('touchcancel', te); };
}

// Смахивание между страницами (слово автора 06.11.2026): там, где вверху переключатель страниц ([role="tablist"]
// внутри области [data-swtabs]), смахивание по странице влево — следующая, вправо — предыдущая; переход — тем же
// касанием по вкладке, что и рукой. Не действует там, где жест значит другое: клавиши, холсты, пэды
// ([data-noswipe], NOSWIPE), полосы с прокруткой вбок и места со своим смахиванием (оно срабатывает раньше).
const PAGE_NOSWIPE = NOSWIPE.replace('.hscroll, ', '');
// → полоса с прокруткой вбок, внутри которой палец (или null)
const scrollsX = (el, stop) => {
  for (let x = el; x && x !== stop; x = x.parentElement) {
    if (x.scrollWidth > x.clientWidth + 2) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll') return x; }
  }
  return null;
};
// полоса упёрлась в край в сторону смахивания (d = 1 — влево, к следующей вкладке)
const atEdge = (sc, d) => (d > 0 ? sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 2 : sc.scrollLeft <= 2);
export function pageStep(reg, d) {
  const tl = reg && reg.querySelector('[role="tablist"]');
  if (!tl) return false;
  const tabs = [...tl.querySelectorAll('[role="tab"]')].filter((b) => !b.disabled && b.offsetParent);
  const i = tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true');
  const n = tabs[i + d];
  if (i < 0 || !n) return false;
  n.click();
  n.scrollIntoView && n.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return true;
}
// На касаниях, а не на pointer-событиях: браузер отменяет pointer, когда начинает свою прокрутку, а touchend приходит всегда.
// other — смахивание вне области страниц (нижние вкладки приложения): { ok(target), step(d) }
export function pageSwipe(root = document, { min = 70, other = null } = {}) {
  let s = null;
  const start = (e) => {
    s = null;
    if (e.touches.length !== 1) return;
    const tg = e.target, reg = tg.closest && tg.closest('[data-swtabs]');
    // полоса чипов (.hscroll) мешает, только если ей есть что прокручивать вбок (scrollsX): короткая полоса категорий
    // в «Песнях» раньше съедала смахивание между вкладками по всей своей ширине
    if (!tg.closest || tg.closest(PAGE_NOSWIPE) || tg.closest('[role="tablist"]')) return;
    if (!reg && !(other && other.ok(tg))) return;
    // полоса с прокруткой: сначала она листается; уже у края — смахивание дальше переключает (как в телефонах)
    // гриф, ноты и прочие рабочие поверхности с прокруткой — без исключения у края: там случайное переключение мешает играть
    const sc = scrollsX(tg, reg), p = e.touches[0];
    if (sc && !sc.classList.contains('hscroll')) return;
    s = { x: p.clientX, y: p.clientY, t: performance.now(), reg, sc, sl: sc ? sc.scrollLeft : 0 };
  };
  const end = (e) => {
    if (!s || e.touches.length) { if (e.touches.length) s = null; return; }
    const q = s, p = e.changedTouches[0];
    s = null;
    const dx = p.clientX - q.x, dy = p.clientY - q.y, now = performance.now();
    if (now - q.t > 700 || Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 2) return;
    if (q.sc) { const d = dx < 0 ? 1 : -1, was = q.sc.scrollLeft; q.sc.scrollLeft = q.sl; const edge = atEdge(q.sc, d); q.sc.scrollLeft = was; if (!edge) return; }
    if (now - lastSwipe < 400) return; // взял ближний обработчик
    if (document.getSelection && String(document.getSelection()).length) return;
    if (q.reg) pageStep(q.reg, dx < 0 ? 1 : -1); else other.step(dx < 0 ? 1 : -1);
  };
  const cancel = () => { s = null; };
  root.addEventListener('touchstart', start, { passive: true });
  root.addEventListener('touchend', end);
  root.addEventListener('touchcancel', cancel);
  return () => { root.removeEventListener('touchstart', start); root.removeEventListener('touchend', end); root.removeEventListener('touchcancel', cancel); };
}
