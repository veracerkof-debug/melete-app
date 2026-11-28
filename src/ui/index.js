// Общие элементы интерфейса для ядра и модулей: шторка, сообщение, подтверждение, переключатели, иконки.
// Разметка и классы — как в прототипе (стили в ui.css).
import './ui.css';
import { loader } from './loader.js';
import { t, withText } from '../i18n/index.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const icons = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.8v14.4c0 .8.9 1.3 1.6.9l11.3-7.2c.6-.4.6-1.4 0-1.8L8.6 3.9C7.9 3.5 7 4 7 4.8z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M14.5 6l-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9.5 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 8 13"><path d="M1.5 1.5 6.5 6.5 1.5 11.5"/></svg>',
  check: '<svg class="check" viewBox="0 0 16 16"><path d="M3 8.5 6.5 12 13 4.5"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.7 9.4a2.4 2.4 0 1 1 3.4 2.2c-.7.4-1.1.9-1.1 1.7v.3"/><path d="M12 16.6v.2"/></svg>',
};

// Сегментированный выбор: opts — [[значение, подпись], …]
export const seg = (name, opts, cur, label = '') =>
  '<div class="seg" role="group" data-seg="' + name + '"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '>' +
  opts.map(([v, l]) => '<button type="button" data-v="' + v + '" aria-pressed="' + (String(cur) === String(v)) + '">' + l + '</button>').join('') + '</div>';

// Переключатель
export const sw = (name, on, label) =>
  '<label class="sw"><input type="checkbox" data-sw="' + name + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(label) + '"><i></i></label>';

// Кнопки − / +
export const stepper = (name, label) =>
  '<span class="stepper" role="group" aria-label="' + esc(label) + '"><button type="button" data-step="' + name + '" data-d="-1" aria-label="' + esc(t('ui.less')) + '">−</button>' +
  '<button type="button" data-step="' + name + '" data-d="1" aria-label="' + esc(t('ui.more')) + '">+</button></span>';

// Круглая кнопка-иконка с подписью для чтения с экрана
// cap — короткая подпись под значком (слово автора 27.11.2026): видна в полном окне, пока в Оформлении не выключены «Подписи под значками»
export const icb = (attrs, icon, label, cls, cap) =>
  '<button type="button" class="ic' + (cls ? ' ' + cls : '') + '" ' + attrs + ' aria-label="' + esc(label) + '" title="' + esc(label) + '"' + (cap ? ' data-cap="' + esc(cap) + '"' : '') + '>' + icon + '</button>';

// Заголовок шторки: слева, по центру, справа
export const snav = (title, { left = '<span></span>', right = '<button class="link b r" data-close>' + esc(t('ui.done')) + '</button>' } = {}) =>
  '<div class="snav">' + left + '<div class="t">' + esc(title) + '</div>' + right + '</div>';

/* ---------- шторка ---------- */

let layer = null;
const stack = [];

// Открыть нижнюю шторку. render() → html; init(el, api) — один раз после открытия; onClose — после закрытия.
// Возвращает api: { el, close(), update() } — update перерисовывает, сохраняя прокрутку
/* ---------- плавный уход ---------- */

// Элемент уходит с анимацией (.leaving в styles/motion.css) и удаляется после неё. Сразу теряет id и нажатия,
// чтобы «Назад» и поиск по странице его уже не находили. «Уменьшить движение» — почти сразу
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function leave(el, ms = 240) {
  if (!el || el.classList.contains('leaving')) return;
  el.classList.add('leaving');
  el.removeAttribute('id');
  el.setAttribute('aria-hidden', 'true');
  setTimeout(() => el.remove(), reduced() ? 0 : ms);
}

// Пояснения — не текстом, а по запросу (слово автора 21.11.2026: «текст нужен один-два раза, а место занимает постоянно»;
// 22.11.2026: без кружков «?» — кликабельные названия). Абзац-пояснение (.ftr, .segcap, подпись строки) прячется, а название
// раздела или параметра становится кликабельным (вид не меняется): касание — окошко с пояснением. Нет названия рядом —
// абзац остаётся одной строкой с «…», касание раскрывает его в окошко. Показания (статус, проценты, значения) пояснением не
// считаются и не прячутся: у них класс .keep или data-keep. Только простой текст: со ссылкой или кнопкой — как есть.
let hintPop = null;
export function closeHint() { if (hintPop) { hintPop.remove(); hintPop = null; } }
function openHint(btn) {
  const was = hintPop && hintPop.dataset.for === btn.dataset.hid;
  closeHint();
  if (was) return;
  const pop = document.createElement('div');
  pop.className = 'hintpop'; pop.setAttribute('role', 'dialog'); pop.dataset.for = btn.dataset.hid;
  pop.innerHTML = btn._hint;
  document.body.appendChild(pop); hintPop = pop;
  const r = btn.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  const w = Math.min(340, vw - 24);
  pop.style.width = w + 'px';
  pop.style.left = Math.max(12, Math.min(vw - w - 12, r.left + Math.min(r.width, 200) / 2 - w / 2)) + 'px';
  const h = pop.offsetHeight, below = r.bottom + 8 + h <= vh - 12;
  pop.style.top = (below ? r.bottom + 8 : Math.max(12, r.top - 8 - h)) + 'px';
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') { // (в тестах без DOM — пропускаем)
  document.addEventListener('pointerdown', (e) => { if (hintPop && !e.target.closest('.hintpop,.hqt,.hqline')) closeHint(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && hintPop) { closeHint(); e.stopPropagation(); } }, true);
}
let hintId = 0;
// Сделать элемент ссылкой на пояснение (повторно — пояснения склеиваются)
export function hintLink(host, html) {
  if (host._hint != null) { host._hint += '<br>' + html; return; }
  host.classList.add('hqt'); host.tabIndex = 0; host.setAttribute('role', 'button'); host.setAttribute('aria-haspopup', 'dialog');
  host.dataset.hid = 'h' + (++hintId); host._hint = html;
  host.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); openHint(host); });
  host.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); openHint(host); } });
}
const isReadout = (h) => h.classList.contains('keep') || h.classList.contains('danger') || h.hasAttribute('data-keep') || h.hasAttribute('data-bpsum') || h.hasAttribute('data-mcap') || h.style.color;
export function foldHints(root, drop = false) {
  // Длинное пояснение под названием строки (не однострочная подпись с «…») — название строки становится ссылкой
  root.querySelectorAll('.cell .bksub').forEach((h) => {
    if (h.querySelector('a,button,input,select') || h.textContent.trim().length < 40 || getComputedStyle(h).whiteSpace === 'nowrap' || h.closest('.hintpop') || isReadout(h)) return;
    const par = h.parentNode, before = [...par.childNodes].slice(0, [...par.childNodes].indexOf(h)).filter((n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()));
    if (!before.length) { if (drop) h.hidden = true; else lineLink(h); return; }
    let host = before[0].nodeType === 1 && before.length === 1 && !before[0].matches('button,a,input,label') ? before[0] : null;
    if (!host) { host = document.createElement('span'); par.insertBefore(host, h); before.forEach((n) => host.appendChild(n)); }
    hintLink(host, h.innerHTML); h.hidden = true;
  });
  root.querySelectorAll('.ftr, .segcap, .lphint, .hintx').forEach((h) => {
    if (h.querySelector('a,button,input,select') || h.textContent.trim().length < 25 || h.closest('.hintpop') || isReadout(h)) return; // показания и ошибки — как есть
    let host = null;
    if (h.classList.contains('segcap')) host = h.parentElement && h.parentElement.querySelector(':scope > .segttl');
    else {
      let p = h.previousElementSibling;
      while (p && p.classList.contains('ftr')) p = p.previousElementSibling;
      const hd = p && p.previousElementSibling;
      host = hd && hd.classList.contains('hdr') ? hd : p && p.classList.contains('hdr') ? p : null;
    }
    if (host) { hintLink(host, h.innerHTML); h.hidden = true; return; }
    if (drop) { h.hidden = true; return; }
    lineLink(h); // нет названия рядом — абзац в одну строку, касание раскрывает
  });
}
function lineLink(h) {
  if (h._hint != null) return;
  h.classList.add('hqline'); h.tabIndex = 0; h.setAttribute('role', 'button'); h.setAttribute('aria-haspopup', 'dialog');
  h.dataset.hid = 'h' + (++hintId); h._hint = h.innerHTML;
  const go = (e) => { e.stopPropagation(); e.preventDefault(); openHint(h); };
  h.addEventListener('click', go);
  h.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go(e); });
}

// Экранная клавиатура на Android не сжимает страницу, а закрывает её (видимая область vv сжимается, раскладка — нет): высота
// клавиатуры идёт в --kb, шторки поднимаются над ней (ui.css: .scrim), поле ввода остаётся на виду. Без visualViewport — 0
let kbOn = false;
function trackKeyboard() {
  const vv = typeof window !== 'undefined' && window.visualViewport;
  if (kbOn || !vv) return;
  kbOn = true;
  const set = () => {
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    document.documentElement.style.setProperty('--kb', (kb > 80 ? kb : 0) + 'px'); // меньше 80 — не клавиатура (адресная строка, жесты)
    const a = document.activeElement;
    if (kb > 80 && a && a.closest && a.closest('.sheet') && !a.closest('.aichat') && a.scrollIntoView) setTimeout(() => { try { a.scrollIntoView({ block: 'nearest' }); } catch { /* */ } }, 60);
  };
  vv.addEventListener('resize', set); vv.addEventListener('scroll', set); set();
}

export function sheet(render, init, { onClose, hints } = {}) {
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'sheetLayer';
    document.body.appendChild(layer);
    trackKeyboard();
  }
  const prevFocus = document.activeElement;
  const scrim = document.createElement('div');
  scrim.className = 'scrim opening'; // содержимое поднимается по очереди только при открытии, не при каждом обновлении
  setTimeout(() => scrim.classList.remove('opening'), 650);
  scrim.style.zIndex = 46 + stack.length; // над сценой (45): шторки списка и состава открываются прямо на сцене
  scrim.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"></div>';
  const el = scrim.firstChild;
  const api = {
    el,
    update() {
      const y = el.scrollTop;
      el.innerHTML = '<div class="grab"></div>' + withText(render); // настройки — с текстом и в «Минимале» без текста
      foldHints(el, hints === 'drop');
      el.scrollTop = y;
    },
    close() {
      if (!stack.includes(api)) return;
      leave(scrim, 260);
      stack.splice(stack.indexOf(api), 1);
      document.removeEventListener('keydown', onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (onClose) onClose();
    },
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && stack.at(-1) === api) api.close();
  };
  scrim.addEventListener('click', (e) => {
    if (e.target === scrim || e.target.closest('[data-close]')) { api.close(); return; }
  });
  document.addEventListener('keydown', onKey);
  layer.appendChild(scrim);
  stack.push(api);
  api.update();
  // Потянуть шторку вниз за полоску сверху или за заголовок (или в любом месте, если она прокручена в начало)
  let drag = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || e.target.closest('input,textarea,select,[contenteditable],.sw,.seg,[role="slider"],canvas[data-stone],canvas[data-eq]')) return;
    const head = e.target.closest('.grab,.snav');
    if (!head && el.scrollTop > 0) return;
    // внутри прокручиваемого списка (чат, длинный текст) тянет не шторку, а список: иначе шторка ползёт за пальцем и отскакивает назад
    if (!head) for (let n = e.target; n && n !== el; n = n.parentElement) { if (n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)) return; }
    drag = { y: e.clientY, t: performance.now(), dy: 0, id: e.pointerId, head: !!head };
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dy = Math.max(0, e.clientY - drag.y);
    if (!drag.head && drag.dy < 8) return;
    if (drag.dy > 4) { el.classList.add('dragging'); el.style.transform = 'translateY(' + drag.dy + 'px)'; scrim.style.backgroundColor = 'rgba(0,0,0,' + Math.max(0, 0.4 - drag.dy / 900) + ')'; }
  });
  const drop = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const v = drag.dy / Math.max(1, performance.now() - drag.t), d = drag.dy;
    drag = null;
    el.classList.remove('dragging');
    if (d > 110 || (d > 40 && v > 0.6)) { el.style.transform = ''; api.close(); return; }
    el.classList.add('snap');
    el.style.transform = '';
    scrim.style.backgroundColor = '';
    setTimeout(() => el.classList.remove('snap'), 300);
  };
  el.addEventListener('pointerup', drop);
  el.addEventListener('pointercancel', drop);
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  if (init) init(el, api);
  return api;
}

export const closeAllSheets = () => [...stack].reverse().forEach((s) => s.close());
// Закрыть верхнюю шторку (кнопка «Назад» на Android); false — шторок нет
export const closeTopSheet = () => { const s = stack.at(-1); if (!s) return false; s.close(); return true; };

/* ---------- сообщение ---------- */

// opts.action + opts.onAction — кнопка в сообщении (дольше на экране, нажимается)
export function toast(msg, opts = {}) {
  if (!msg || !String(msg).trim()) return; // «Минимал» без текста: сообщение без слов не показывается
  document.querySelectorAll('.toast').forEach((x) => x.remove()); // новое сообщение сменяет старое сразу
  const el = document.createElement('div');
  el.className = 'toast' + (opts.action ? ' act' : '');
  el.setAttribute('role', 'status');
  el.textContent = msg;
  if (opts.action) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'toastbtn'; b.textContent = opts.action;
    b.addEventListener('click', () => { leave(el, 160); try { opts.onAction && opts.onAction(); } catch { /* */ } });
    el.appendChild(b);
  }
  document.body.appendChild(el);
  setTimeout(() => leave(el, 240), opts.action ? 7000 : 2400);
}

/* ---------- подтверждение ---------- */

export function confirm(title, text, yes) {
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.className = 'ask';
    d.innerHTML = '<div class="alert" role="alertdialog" aria-label="' + esc(title) + '"><div class="ab"><h3>' + esc(title) + '</h3><p>' + esc(text) +
      '</p></div><div class="abtns"><button data-k="no">' + esc(t('ui.cancel')) + '</button><button data-k="yes" style="color:var(--red)">' + esc(yes) + '</button></div></div>';
    document.body.appendChild(d);
    d.querySelector('[data-k="no"]').focus();
    d.addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]');
      if (!k && e.target !== d) return;
      leave(d, 160);
      resolve(!!k && k.dataset.k === 'yes');
    });
  });
}

// Согласие с галочкой: окно не закрывается ни касанием мимо, ни «Назад», пока галочка не поставлена и не нажато «Продолжить»
export function agree(title, text, check, yes) {
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.className = 'ask agree';
    d.innerHTML = '<div class="alert" role="alertdialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="ab"><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' +
      '<label class="agchk"><input type="checkbox" data-k="chk"><span>' + esc(check) + '</span></label></div>' +
      '<div class="abtns"><button data-k="yes" disabled>' + esc(yes) + '</button></div></div>';
    document.body.appendChild(d);
    const box = d.querySelector('[data-k="chk"]'), btn = d.querySelector('[data-k="yes"]');
    box.addEventListener('change', () => { btn.disabled = !box.checked; });
    btn.addEventListener('click', () => { if (!box.checked) return; leave(d, 160); resolve(true); });
    box.focus();
  });
}

export { loader };
export const ui = { esc, icons, seg, sw, stepper, icb, snav, sheet, toast, confirm, agree, leave, loader, foldHints };
