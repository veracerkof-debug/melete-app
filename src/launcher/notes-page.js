// Блокнот Ἐλάχιστον (DECISIONS 2026-10-26): простой текст, как в Obsidian — первая строка — название,
// [[ссылка]] на другую заметку (нет такой — создаётся), #метка, «- [ ]» — дело, # заголовок, **жирный**, `код`.
// Хранение — localStorage браузера (elachiston.notes); сохраняется на каждом вводе.
const KEY = 'elachiston.notes';
const DAY = 864e5;
const app = document.getElementById('app');
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v != null && v !== false) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const vibr = () => { try { navigator.vibrate && navigator.vibrate(8); } catch {} };

// ── хранение ──
let notes;
try { notes = JSON.parse(localStorage.getItem(KEY)); } catch { notes = null; }
if (!Array.isArray(notes)) notes = sample();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch {} };
save();

function sample() {
  const now = Date.now();
  const n = (text, ago, pin = false) => ({ id: uid() + ago, text, pin, created: now - ago, updated: now - ago });
  return [
    n(`# Как пользоваться блокнотом
Первая строка — название заметки.

- [ ] Отметить дело — касание квадратика
- [x] Сделанное дело — зачёркнуто
- Ссылка на другую заметку: [[Список дел]]
- Метки: #идеи #музыка — касание показывает все заметки с меткой

**Жирный**, \`код\`, > цитата, --- черта.
Внизу — кнопки для быстрого ввода. Поиск сверху: набрать название и «Ввод» — новая заметка.
Удержание заметки в списке — закрепить, смахнуть влево — удалить.`, 3 * DAY, true),
    n(`Список дел
- [ ] Струны для гитары
- [ ] Позвонить насчёт репетиции
- [x] Ноты к воскресенью
Связано: [[Песни на воскресенье]] #дела`, DAY),
    n(`Песни на воскресенье
1. Вступление — ре мажор
2. Вторая песня — ля, капо 2
Темп держать ровно, без ускорения. #музыка`, 2 * 3600e3),
  ];
}

const titleOf = (n) => (n.text.split('\n')[0] || '').replace(/^#+\s*/, '').trim() || 'Без названия';
const bodyOf = (n) => n.text.split('\n').slice(1).join(' ').replace(/[#*`>\[\]-]+/g, ' ').replace(/\s+/g, ' ').trim();
const tagsOf = (text) => [...new Set([...text.matchAll(/(^|\s)#([\p{L}\p{N}_-]+)/gu)].map((m) => m[2].toLowerCase()))];
const byTitle = (t) => notes.find((n) => titleOf(n).toLowerCase() === t.trim().toLowerCase());
const when = (t) => {
  const d = new Date(t), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const S = { q: '', tag: null, cur: null, edit: false };
const listV = h('div', { class: 'view' });
const noteV = h('div', { class: 'view', style: 'display:none' });
app.append(listV, noteV);

// ── список ──
function renderList() {
  const q = S.q.trim().toLowerCase();
  const shown = notes
    .filter((n) => (!q || n.text.toLowerCase().includes(q)) && (!S.tag || tagsOf(n.text).includes(S.tag)))
    .sort((a, b) => (b.pin - a.pin) || (b.updated - a.updated));
  const allTags = [...new Set(notes.flatMap((n) => tagsOf(n.text)))].sort();
  const input = h('input', { class: 'q', type: 'search', placeholder: 'Поиск или новая заметка', value: S.q, enterkeyhint: 'go', 'aria-label': 'Поиск или новая заметка' });
  input.addEventListener('input', () => { S.q = input.value; renderRows(); hint.textContent = S.q.trim() && !byTitle(S.q) ? `«Ввод» — новая заметка «${S.q.trim()}»` : ''; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && S.q.trim()) { const ex = byTitle(S.q); openNote(ex ? ex.id : create(S.q.trim()).id, !ex); S.q = ''; } });
  const hint = h('div', { class: 'hint' });
  const rows = h('div', { class: 'list' });
  const renderRows = () => {
    const qq = S.q.trim().toLowerCase();
    const list = notes.filter((n) => (!qq || n.text.toLowerCase().includes(qq)) && (!S.tag || tagsOf(n.text).includes(S.tag)))
      .sort((a, b) => (b.pin - a.pin) || (b.updated - a.updated));
    rows.replaceChildren(...(list.length ? list.map(row) : [h('div', { class: 'empty' }, notes.length ? 'Ничего не найдено' : 'Пока пусто. «+» — новая заметка')]));
  };
  listV.replaceChildren(
    h('div', { class: 'bar' },
      parent !== window ? h('button', { class: 'ib', onclick: () => parent.postMessage('notes:close', '*'), 'aria-label': 'На главный экран' }, '‹') : null,
      h('h1', {}, 'Блокнот')),
    input, hint,
    allTags.length ? h('div', { class: 'tags' }, allTags.map((t) => h('button', { class: 'tag' + (S.tag === t ? ' on' : ''), onclick: () => { S.tag = S.tag === t ? null : t; renderList(); } }, '#' + t))) : null,
    rows,
    h('button', { class: 'fab', onclick: () => openNote(create('').id, true), 'aria-label': 'Новая заметка' }, '+'));
  renderRows();
  void shown;
}

function row(n) {
  const el = h('button', { class: 'row' },
    h('b', {}, n.pin ? h('i', {}, '★') : null, titleOf(n)),
    h('small', {}, h('em', {}, when(n.updated)), bodyOf(n) || ' '));
  const wrap = h('div', { class: 'rowwrap' }, el);
  let x0 = null, y0, dx = 0, lock = null, timer, held = false;
  el.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; dx = 0; lock = null; held = false; timer = setTimeout(() => { held = true; vibr(); menu(n); }, 480); });
  el.addEventListener('pointermove', (e) => {
    if (x0 == null) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!lock && Math.hypot(mx, my) > 8) { lock = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'; clearTimeout(timer); }
    if (lock === 'x') { dx = Math.min(0, mx); el.style.transform = `translateX(${dx}px)`; }
  });
  const end = () => {
    clearTimeout(timer);
    if (x0 == null) return;
    if (lock === 'x' && dx < -100) { el.style.transition = 'transform .18s'; el.style.transform = 'translateX(-100%)'; setTimeout(() => remove(n), 170); }
    else { el.style.transition = 'transform .2s'; el.style.transform = ''; setTimeout(() => (el.style.transition = ''), 200); if (!lock && !held) openNote(n.id); }
    x0 = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => { clearTimeout(timer); x0 = null; el.style.transform = ''; });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  return wrap;
}

function create(title) {
  const n = { id: uid(), text: title ? title + '\n' : '', pin: false, created: Date.now(), updated: Date.now() };
  notes.push(n); save();
  return n;
}

function remove(n) {
  const i = notes.indexOf(n);
  notes = notes.filter((x) => x !== n); save();
  if (S.cur === n.id) closeNote(); else renderList();
  toast(`Удалено: ${titleOf(n)}`, () => { notes.splice(i, 0, n); save(); renderList(); });
}

function menu(n) {
  const w = h('div', { class: 'wrap' }, h('div', { class: 'bg', onclick: () => w.remove() }),
    h('div', { class: 'sheet' },
      h('button', { onclick: () => { n.pin = !n.pin; save(); w.remove(); S.cur ? renderNote() : renderList(); } }, n.pin ? 'Открепить' : 'Закрепить наверху'),
      h('button', { onclick: () => { w.remove(); copy(n.text); } }, 'Скопировать текст'),
      h('button', { class: 'del', onclick: () => { w.remove(); remove(n); } }, 'Удалить')));
  app.append(w);
}

function copy(text) {
  (navigator.clipboard?.writeText(text) || Promise.reject()).then(() => toast('Скопировано'), () => toast('Скопировать не удалось'));
}

// ── заметка ──
function openNote(id, edit = false) {
  S.cur = id; S.edit = edit || !notes.find((n) => n.id === id)?.text.trim();
  listV.style.display = 'none'; noteV.style.display = '';
  renderNote();
}
function closeNote() {
  const n = notes.find((x) => x.id === S.cur);
  if (n && !n.text.trim()) { notes = notes.filter((x) => x !== n); save(); } // пустая — не храним
  S.cur = null; noteV.style.display = 'none'; listV.style.display = ''; renderList();
}

function renderNote() {
  const n = notes.find((x) => x.id === S.cur);
  if (!n) return closeNote();
  const bar = h('div', { class: 'bar' },
    h('button', { class: 'ib', onclick: closeNote, 'aria-label': 'К списку' }, '‹'),
    h('h1', {}, ''),
    h('button', { class: 'ib' + (n.pin ? ' on' : ''), onclick: () => { n.pin = !n.pin; save(); renderNote(); }, 'aria-label': n.pin ? 'Открепить' : 'Закрепить' }, n.pin ? '★' : '☆'),
    h('button', { class: 'ib', onclick: () => { S.edit = !S.edit; renderNote(); }, 'aria-label': S.edit ? 'Готово' : 'Изменить' }, S.edit ? '✓' : '✎'),
    h('button', { class: 'ib', onclick: () => menu(n), 'aria-label': 'Ещё' }, '⋯'));
  if (S.edit) {
    const ta = h('textarea', { class: 'ed', placeholder: 'Название\nТекст…', spellcheck: 'true' });
    ta.value = n.text;
    let tm;
    ta.addEventListener('input', () => { n.text = ta.value; n.updated = Date.now(); clearTimeout(tm); tm = setTimeout(save, 250); });
    ta.addEventListener('blur', save);
    // быстрые вставки — для пальца, без знания разметки
    const ins = (before, after = '', line = false) => {
      const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
      if (line) {
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        ta.value = v.slice(0, ls) + before + v.slice(ls);
        ta.selectionStart = ta.selectionEnd = s + before.length;
      } else {
        ta.value = v.slice(0, s) + before + v.slice(s, e) + after + v.slice(e);
        ta.selectionStart = s + before.length; ta.selectionEnd = e + before.length;
      }
      ta.focus(); ta.dispatchEvent(new Event('input'));
    };
    const date = () => new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    noteV.replaceChildren(bar, ta, h('div', { class: 'tools' },
      h('button', { onclick: () => ins('- [ ] ', '', true), 'aria-label': 'Дело' }, '☐'),
      h('button', { onclick: () => ins('- ', '', true), 'aria-label': 'Список' }, '•'),
      h('button', { onclick: () => ins('# ', '', true), 'aria-label': 'Заголовок' }, 'H'),
      h('button', { onclick: () => ins('**', '**'), 'aria-label': 'Жирный' }, h('b', {}, 'Ж')),
      h('button', { onclick: () => ins('[[', ']]'), 'aria-label': 'Ссылка на заметку' }, '[[ ]]'),
      h('button', { onclick: () => ins('#'), 'aria-label': 'Метка' }, '#'),
      h('button', { onclick: () => ins(date()), 'aria-label': 'Дата' }, 'дата')));
    setTimeout(() => { ta.focus(); if (!n.text) return; }, 60);
  } else {
    const read = h('div', { class: 'read', html: render(n.text) });
    read.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (a?.dataset.note) { e.preventDefault(); const ex = byTitle(a.dataset.note); openNote(ex ? ex.id : create(a.dataset.note).id, !ex); return; }
      if (a?.dataset.tag) { e.preventDefault(); S.tag = a.dataset.tag; S.q = ''; closeNote(); return; }
      if (a?.href) { e.preventDefault(); parent !== window ? parent.postMessage({ notesUrl: a.href }, '*') : window.open(a.href, '_blank'); return; }
      const cb = e.target.closest('input[data-line]');
      if (cb) { toggleTask(n, +cb.dataset.line); return; }
      if (!e.target.closest('button') && !window.getSelection()?.toString()) { S.edit = true; renderNote(); }
    });
    const title = titleOf(n).toLowerCase();
    const backs = notes.filter((x) => x !== n && [...x.text.matchAll(/\[\[([^\]]+)\]\]/g)].some((m) => m[1].trim().toLowerCase() === title));
    if (backs.length) read.append(h('div', { class: 'back' }, h('div', {}, 'Ссылаются сюда'), backs.map((b) => h('button', { onclick: () => openNote(b.id) }, titleOf(b)))));
    noteV.replaceChildren(bar, h('div', { class: 'meta' }, 'Изменено ' + when(n.updated) + ' · касание текста — изменить'), read);
  }
}

function toggleTask(n, line) {
  const lines = n.text.split('\n');
  lines[line] = lines[line].replace(/\[( |x|X)\]/, (m, c) => (c === ' ' ? '[x]' : '[ ]'));
  n.text = lines.join('\n'); n.updated = Date.now(); save(); vibr(); renderNote();
}

// разметка — небольшое подмножество Markdown, построчно
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>')
    .replace(/\[\[([^\]]+)\]\]/g, (m, t) => `<a href="#" data-note="${t.trim()}" class="${byTitle(t) ? '' : 'miss'}">${t.trim()}</a>`)
    .replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, (m, sp, t) => `${sp}<a href="#" class="ht" data-tag="${t.toLowerCase()}">#${t}</a>`)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
}
function render(text) {
  const out = [];
  let list = false;
  const close = () => { if (list) { out.push('</ul>'); list = false; } };
  text.split('\n').forEach((ln, i) => {
    let m;
    if ((m = ln.match(/^\s*[-*] \[( |x|X)\] (.*)$/))) {
      if (!list) { out.push('<ul>'); list = true; }
      const done = m[1] !== ' ';
      out.push(`<li class="task${done ? ' done' : ''}"><input type="checkbox" data-line="${i}"${done ? ' checked' : ''} aria-label="Дело"><span>${inline(m[2])}</span></li>`);
    } else if ((m = ln.match(/^\s*(?:[-*]|\d+\.) (.*)$/))) {
      if (!list) { out.push('<ul>'); list = true; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else {
      close();
      if (i === 0 && !/^#/.test(ln)) out.push(`<h1>${inline(ln || 'Без названия')}</h1>`);
      else if ((m = ln.match(/^(#{1,3}) (.*)$/))) out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`);
      else if (/^---+$/.test(ln.trim())) out.push('<hr>');
      else if ((m = ln.match(/^> ?(.*)$/))) out.push(`<blockquote>${inline(m[1])}</blockquote>`);
      else if (ln.trim()) out.push(`<p>${inline(ln)}</p>`);
    }
  });
  close();
  return out.join('');
}

let toastEl, toastTm;
function toast(text, undo) {
  toastEl && toastEl.remove(); clearTimeout(toastTm);
  toastEl = h('div', { class: 'toast', role: 'status' }, h('span', {}, text), undo ? h('button', { onclick: () => { undo(); toastEl.remove(); } }, 'Отменить') : null);
  app.append(toastEl);
  toastTm = setTimeout(() => toastEl && toastEl.remove(), 4000);
}

// «Назад» из лаунчера и Esc: шторка → заметка → закрыть блокнот
window.__notesBack = () => {
  const w = app.querySelector('.wrap');
  if (w) w.remove();
  else if (S.cur) closeNote();
  else parent.postMessage('notes:close', '*');
};
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); window.__notesBack(); } });

renderList();
