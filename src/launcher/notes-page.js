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
[Am]Аккорды — в квадратных скобках перед слогом; \`\`\` — блок моноширинного текста.
Внизу — кнопки для быстрого ввода. Поиск сверху: набрать название и «Ввод» — новая заметка.
Удержание заметки в списке — закрепить или удалить. Смахнуть влево — назад, к списку и на главный экран.`, 3 * DAY, true),
    n(`Список дел
- [ ] Струны для гитары
- [ ] Позвонить насчёт репетиции
- [x] Ноты к воскресенью
Связано: [[Песни на воскресенье]] #дела`, DAY),
    n(`Песни на воскресенье
1. Вступление — ре мажор
2. Вторая песня — ля, капо 2
[Am]Слова над ак[F]кордом — [C]ровно над [G]слогом
\`\`\`
Am      F       C     G
моноширинно — пробелы не съезжают
\`\`\`
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
  // касание — открыть, удержание — меню (закрепить, скопировать, удалить)
  let timer, held = false, x0 = 0, y0 = 0;
  el.addEventListener('pointerdown', (e) => { held = false; x0 = e.clientX; y0 = e.clientY; timer = setTimeout(() => { held = true; vibr(); menu(n); }, 480); });
  el.addEventListener('pointermove', (e) => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) clearTimeout(timer); });
  el.addEventListener('pointerup', () => clearTimeout(timer));
  el.addEventListener('pointercancel', () => clearTimeout(timer));
  el.addEventListener('click', () => { if (!held) openNote(n.id); });
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
      h('button', { onclick: () => ins('[', ']'), 'aria-label': 'Аккорд' }, '[Am]'),
      h('button', { onclick: () => ins('```\n', '\n```'), 'aria-label': 'Моноширинный блок' }, '```'),
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
// аккорды: [Am]слова — аккорд над слогом (как в песнях Melete); ``` … ``` — моноширинно, пробелы не съезжают
const CHORD = /^[A-H][#b♯♭]?(?:m|maj|min|dim|aug|sus|add|M)?\d{0,2}(?:sus\d|add\d|[#b]\d)*(?:\/[A-H][#b♯♭]?)?$/;
const chordLine = (ln) => /(^|[^[])\[[^\[\]]+\](?!\])/.test(ln) && [...ln.matchAll(/(?:^|[^[])\[([^\[\]]+)\](?!\])/g)].every((m) => CHORD.test(m[1].trim()));
function chords(ln) {
  const parts = ln.split(/(?<!\[)\[([^\[\]]+)\](?!\])/);
  // по словам: аккорд — над первым словом своего куска, строка переносится между словами
  const seg = (chord, text) => {
    const words = (text || ' ').split(/(?<= )/);
    return words.map((w, j) => `<span class="cs"><b>${j === 0 && chord ? esc(chord) : ''}</b>${inline(w) || '&nbsp;'}</span>`).join('');
  };
  let html = parts[0] ? seg('', parts[0]) : '';
  for (let i = 1; i < parts.length; i += 2) html += seg(parts[i].trim(), parts[i + 1]);
  return `<p class="chords">${html}</p>`;
}

function render(text) {
  const out = [];
  let list = false, pre = null;
  const close = () => { if (list) { out.push('</ul>'); list = false; } };
  text.split('\n').forEach((ln, i) => {
    let m;
    if (/^```/.test(ln.trim())) {
      if (pre) { out.push(`<pre class="mono">${esc(pre.join('\n'))}</pre>`); pre = null; } else { close(); pre = []; }
      return;
    }
    if (pre) { pre.push(ln); return; }
    if (i > 0 && chordLine(ln)) { close(); out.push(chords(ln)); return; }
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
  if (pre) out.push(`<pre class="mono">${esc(pre.join('\n'))}</pre>`); // не закрыли ``` — всё равно показать
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
// Смахивание справа налево — назад: из заметки — к списку; из списка — закрыть блокнот (страница идёт за пальцем,
// родитель двигает iframe: notes.js). Не с текста заметки в правке и не с полей ввода.
(() => {
  let st = null;
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('input, textarea, .tools, .tags')) { st = null; return; }
    st = { x: e.screenX, y: e.screenY, lock: null, vel: [], top: !S.cur && !app.querySelector('.wrap') };
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (!st) return;
    const dx = e.screenX - st.x, dy = e.screenY - st.y;
    if (!st.lock) {
      if (Math.hypot(dx, dy) < 6) return;
      st.lock = Math.abs(dx) > Math.abs(dy) && dx < 0 ? 'x' : 'no';
      if (st.lock === 'no') { st = null; return; }
    }
    st.vel.push({ dx, t: performance.now() }); if (st.vel.length > 6) st.vel.shift();
    if (st.top && parent !== window) parent.postMessage({ notesDrag: Math.max(0, -dx) }, '*');
  }, true);
  const end = (e) => {
    if (!st) return;
    const s = st; st = null;
    if (s.lock !== 'x') return;
    const dx = Math.max(0, s.x - e.screenX);
    const a = s.vel[0], b = s.vel[s.vel.length - 1];
    const v = a && b && b.t > a.t ? (a.dx - b.dx) / (b.t - a.t) : 0;
    if (s.top && parent !== window) { parent.postMessage({ notesDragEnd: dx, v }, '*'); return; }
    if (dx > 50 || v > 0.3) window.__notesBack();
  };
  // палец пошёл вбок — браузер не должен начать прокрутку (иначе pointercancel и жест гибнет)
  document.addEventListener('touchmove', (e) => { if (st?.lock === 'x') e.preventDefault(); }, { passive: false, capture: true });
  document.addEventListener('pointerup', end, true);
  document.addEventListener('pointercancel', () => { if (st?.top && parent !== window) parent.postMessage({ notesDragEnd: 0, v: 0 }, '*'); st = null; }, true);
})();

window.__notesBack = () => {
  const w = app.querySelector('.wrap');
  if (w) w.remove();
  else if (S.cur) closeNote();
  else parent.postMessage('notes:close', '*');
};
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); window.__notesBack(); } });

renderList();
