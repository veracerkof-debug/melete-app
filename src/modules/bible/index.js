// Библия (церковный режим): Синодальный перевод (66 книг) и модули MyBible (*.SQLite3). Текст главы занимает окно целиком; вверху — одна узкая
// полоса: соседние главы, книга и глава (выбор — шторкой), размер шрифта. В конце главы — «Прочитано»
// (отметка идёт в план чтения, ядро: ctx.bible) и переход к следующей главе.
// Текст и список книг — src/core/bible.js, планы и отметки — src/core/reading.js (в ядре: их видят главная и календарь).
// В «Минимале» — изучение по логике MyBible (study.js): номера Стронга, комментарии, сноски, ссылки, подзаголовки и жесты.
import './bible.css';
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import el from './i18n/el.json';
import { BOOKS, ALL, bookOf, loadBook, chKey, parseKey, refText } from '../../core/bible.js';
import { pureEnter, pureLeave } from '../../core/pure.js';
import { refOf, quoteText, normQ, hitHTML } from './quote.js';
// изучение (study.js с разбором модулей) загружается лениво — только в «Минимале»
let S = null;
const study = async () => (S ||= await import('./study.js'));

// Переводы: встроенный Синодальный и модули MyBible (*.SQLite3), сохранённые на устройстве (ctx.files, вид 'bible')
const SYN = { id: 'synodal', short: 'СП', has: () => true, chapters: (c) => bookOf(c).chapters, book: loadBook, name: (c) => bookOf(c).name, abbr: (c) => bookOf(c).abbr };
const opened = new Map(); // id → модуль MyBible (держится открытым, пока выбран)
async function providerOf(id) {
  if (id === 'synodal' || !ctx.files.get(id)) return SYN;
  if (!opened.has(id)) {
    const rec = ctx.files.get(id), { openModule, abbrOf } = await import('../../core/mybible-study.js');
    const m = await openModule(new Uint8Array(await rec.blob.arrayBuffer()), rec.meta && rec.meta.file || rec.name);
    if (m.type !== 'bible') { m.close(); throw new Error('not a Bible module'); }
    opened.forEach((x, k) => { if (k !== id) { x.close(); opened.delete(k); } }); // в памяти — один модуль
    const cache = new Map();
    // главы книги строками (обычный вид); сырые стихи с тегами — для изучения
    const book = (c) => { if (!cache.has(c)) cache.set(c, Array.from({ length: m.books[c] || 0 }, (_, i) => m.raw(c, i + 1).map((r) => m.plain(r.t)))); return Promise.resolve(cache.get(c)); };
    opened.set(id, { id, short: shortOf(rec), has: (c) => !!m.books[c], chapters: (c) => m.books[c] || 0, book, name: (c) => m.names[c] || bookOf(c).name,
      abbr: (c) => m.shorts[c] || bookOf(c).abbr, close: () => { cache.clear(); m.close(); },
      raw: (c, ch) => m.raw(c, ch), plain: m.plain, stories: (c, ch) => m.stories(c, ch), strong: m.strong, prefix: m.prefix,
      abbr0: rec.meta && rec.meta.file ? abbrOf(rec.meta.file) : null }); // сокращение модуля — по нему сноски находят свой перевод
  }
  return opened.get(id);
}
const isBible = (r) => !r.meta || !r.meta.type || r.meta.type === 'bible'; // старые записи — без типа
const shortOf = (rec) => String(rec.name || '').replace(/\.[^.]+$/, '').slice(0, 10);

import meta, { ICON } from './meta.js';
const I = {
  prev: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M6 12h12M12 6v12"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  unfull: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/></svg>',
  del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
const FS_MIN = 14, FS_MAX = 30;

let host = null, ctx = null, size = 'full', cur = { code: 'GEN', ch: 1 }, verses = null, failed = false, onClick = null, scrollT = 0, P = SYN;
// изучение: стихи главы ({ v, t } или строки) и метки модулей
const NO_MARKS = { comm: [], xref: new Map(), subs: new Map(), stories: new Map() };
let rows = null, marks = NO_MARKS, livePx = 0;
let pure = false, sel = null; // полный экран; выбранные стихи (Set) или null
const waiting = []; // места, где Библия была открыта раньше (см. mount)

const fs = () => ctx.store.get('fs', 18);
const isRead = () => ctx.bible.isRead(chKey(cur.code, cur.ch));
// соседняя глава; книги, которых нет в выбранном переводе, пропускаются
const step = (d) => { for (let i = ALL.indexOf(chKey(cur.code, cur.ch)) + d; i >= 0 && i < ALL.length; i += d) { const k = parseKey(ALL[i]); if (P.has(k.code) && k.ch <= P.chapters(k.code)) return k; } return null; };

function barHTML() {
  const { t, ui } = ctx, small = size === 'strip' || size === 'quarter';
  return '<div class="bbar">' + ui.icb('data-x="bprev"', I.prev, t('prev'), 'sm') +
    '<button class="bpick" data-x="bpick" aria-label="' + ui.esc(t('pick')) + '">' + ui.esc((small ? P.abbr(cur.code) : P.name(cur.code)) + ' ' + cur.ch) + '</button>' +
    ui.icb('data-x="bnext"', I.next, t('next'), 'sm') +
    (small ? '' : '<button class="btr" data-x="btr" aria-label="' + ui.esc(t('tr')) + '">' + ui.esc(P.short) + '</button><span class="bgrow"></span>' + ui.icb('data-x="bsearch"', I.search, t('search'), 'sm') +
      ui.icb('data-x="bfs" data-d="-2"', I.minus, t('smaller'), 'sm') + ui.icb('data-x="bfs" data-d="2"', I.plus, t('bigger'), 'sm') + ui.icb('data-x="bpure"', I.full, t('pure'), 'sm')) +
    '<button class="ic sm bmark' + (isRead() ? ' on' : '') + '" data-x="bmark" aria-pressed="' + isRead() + '" aria-label="' + ui.esc(t(isRead() ? 'unmark' : 'markRead')) + '">' + I.check + '</button></div>';
}

function textHTML() {
  const { t, ui } = ctx;
  if (failed) return '<p class="bfail l2">' + t('loadFail') + '</p>';
  if (!verses) return '<div class="bload">' + ui.loader('book', P.name(cur.code) + ' ' + cur.ch) + '</div>';
  const n = step(1);
  return '<h2 class="bhead">' + ui.esc(P.name(cur.code)) + ' <span>' + cur.ch + '</span></h2>' +
    (S ? '<div class="bverses">' + S.chapterHTML(ctx, P, cur, rows || verses, marks) + '</div>' :
      '<p class="bverses">' + verses.map((v, i) => '<span class="bv" data-v="' + (i + 1) + '"><sup>' + (i + 1) + '</sup>' + ui.esc(v) + ' </span>').join('') + '</p>') +
    '<div class="bend">' + (isRead() ? '<button class="btn bdone" data-x="bmark">' + I.check + '<span>' + t('read') + '</span></button>' : '<button class="btn fill" data-x="bmark">' + t('read') + '</button>') +
    (n ? '<button class="btn" data-x="bnext">' + ui.esc(t('nextCh', { ref: P.abbr(n.code) + ' ' + n.ch })) + '</button>' : '') + '</div>';
}

function render() {
  if (!host) return;
  const y = host.querySelector('.btext') ? host.querySelector('.btext').scrollTop : 0;
  // полоса — внизу (под большой палец) или вверху (настройка «Кнопки вверху»)
  const top = ctx.store.get('barTop', false), bar = sel ? selHTML() : pure ? ctx.ui.icb('data-x="bunpure"', I.unfull, ctx.t('unpure'), 'sm bunpure') : barHTML();
  host.innerHTML = '<div class="bwrap study ' + size + (pure ? ' bpure' : '') + (sel ? ' bselm' : '') + (top ? ' btop' : '') + '" style="--bfs:' + fs() + 'px">' +
    (top ? bar : '') + (size === 'strip' ? '' : '<div class="btext">' + textHTML() + '</div>') + (top ? '' : bar) + '</div>';
  const tx = host.querySelector('.btext');
  if (tx) {
    tx.scrollTop = y;
    tx.addEventListener('scroll', () => { clearTimeout(scrollT); scrollT = setTimeout(() => ctx && ctx.bible.setPos({ ...cur, y: tx.scrollTop }), 400); }, { passive: true });
    if (S && verses) gestures(tx);
  }
}

/* ---------- изучение («Минимал») ---------- */
// Переход по ссылке: глава, стих подсвечивается; mode 'comm' — сразу комментарий к стиху
function nav(code, ch, v, mode) {
  if (!P.has(code)) { ctx.ui.toast(ctx.t('st.noBook')); return; }
  if (code === cur.code && ch === cur.ch && verses) { flash(v); if (mode === 'comm') S.commentary(ctx, P, code, ch, v, nav); return; }
  open(code, ch, 0, { v, mode });
}
function flash(v) {
  const el = v && host && host.querySelector('.bv[data-v="' + v + '"]');
  if (!el) return;
  el.scrollIntoView({ block: 'center' });
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1600);
}
const verseText = (v) => { const r = rows && rows.find((x) => x.v === v); return r ? (P.plain ? P.plain(r.t) : r.t) : (verses && verses[v - 1]) || ''; };
function gestures(tx) {
  tx.addEventListener('contextmenu', (e) => e.preventDefault());
  S.bindGestures(tx, {
    lexicon: (s) => S.lexicon(ctx, s, nav),
    morph: (m) => S.morph(ctx, m, nav),
    dict: (w) => S.dictWord(ctx, w, nav),
    comm: (v) => S.commentary(ctx, P, cur.code, cur.ch, v, nav),
    xref: (v) => S.xrefs(ctx, P, cur.code, cur.ch, v, marks.xref.get(v) || [], nav),
    foot: (v, m) => S.footnote(ctx, P, cur.code, cur.ch, v, m, nav),
    menu: (v) => S.verseMenu(ctx, P, cur, v, verseText(v), marks, nav, { copy: () => copyVerses([v]), share: () => shareVerses([v]), select: () => selStart(v) }),
    tap: (e) => { if (!sel) return false; const b = e.target.closest('.bv'); if (b) selToggle(+b.dataset.v); return true; },
    link: (href) => S.follow(ctx, href, nav),
    step: (d) => { if (sel) return; const n = step(d); if (n) open(n.code, n.ch); },
    fs: () => fs(),
    font: (px, done) => {
      if (px != null) { livePx = Math.max(FS_MIN, Math.min(FS_MAX, Math.round(px))); host.querySelector('.bwrap').style.setProperty('--bfs', livePx + 'px'); }
      if (done && livePx) { ctx.store.set('fs', livePx); livePx = 0; }
    },
  });
}
// Метки главы из вспомогательных модулей — после текста, затем перерисовка на том же месте
function loadMarks(code, ch) {
  if (!S || (!S.auxCount(ctx) && !P.stories)) return Promise.resolve();
  const p = P;
  return S.chapterMarks(ctx, P, code, ch).then((x) => {
    if (!host || cur.code !== code || cur.ch !== ch || P !== p) return;
    marks = x;
    render();
  }, (e) => ctx && ctx.logErr(e));
}

// Открыть главу; y — где был текст (при возвращении к прочитанному месту)
function open(code, ch, y = 0, go = null) {
  if (!P.has(code)) { const f = BOOKS.find((b) => P.has(b.code)); if (!f) return; code = f.code; ch = 1; y = 0; } // нет книги в переводе — первая, что есть
  if (ch > P.chapters(code)) { ch = P.chapters(code); y = 0; }
  cur = { code, ch };
  verses = null; rows = null; marks = NO_MARKS; failed = false; sel = null;
  ctx.bible.setPos({ code, ch, y });
  render();
  const p = P;
  p.book(code).then((book) => {
    if (!host || cur.code !== code || cur.ch !== ch || P !== p) return;
    verses = book[ch - 1] || [];
    if (P.raw) rows = P.raw(code, ch);
    render();
    const tx = host.querySelector('.btext');
    if (tx) { tx.scrollTop = y; tx.classList.add('bnew'); setTimeout(() => tx.classList.remove('bnew'), 450); } // новая глава проявляется
    loadMarks(code, ch).then(() => {
      if (!go || !host || cur.code !== code || cur.ch !== ch) return;
      flash(go.v);
      if (go.mode === 'comm') S.commentary(ctx, P, code, ch, go.v, nav);
    });
  }, (e) => { ctx && ctx.logErr(e); failed = true; render(); });
}

// Шторка выбора: книги (с долей прочитанного) → главы (прочитанные отмечены)
function pickSheet() {
  const { t, ui } = ctx;
  let book = null, part = !!(bookOf(cur.code) || {}).nt; // вкладка — Завет текущей книги
  // Заветы — вкладками: одна сетка без прокрутки
  const tabs = () => ui.seg('btest', [['ot', t('ot')], ['nt', t('nt')]], part ? 'nt' : 'ot', t('pick'));
  const books = (nt) => '<div class="bgrid">' + BOOKS.filter((b) => b.nt === nt).map((b) => {
    const r = ctx.bible.readIn(b.code) / b.chapters, has = P.has(b.code);
    return '<button class="bbook' + (b.code === cur.code ? ' cur' : '') + '" data-bk="' + b.code + '" style="--r:' + (r * 100).toFixed(1) + '%" aria-label="' + ui.esc(P.name(b.code)) + '"' + (has ? '' : ' disabled') + '>' + ui.esc(P.abbr(b.code)) + '</button>';
  }).join('') + '</div>';
  const chapters = (b) => '<div class="hdr">' + ui.esc(P.name(b.code)) + '</div><div class="bgrid ch">' + Array.from({ length: P.chapters(b.code) }, (_, k) => k + 1).map((c) =>
    '<button class="bch' + (ctx.bible.isRead(chKey(b.code, c)) ? ' read' : '') + (b.code === cur.code && c === cur.ch ? ' cur' : '') + '" data-ch="' + c + '" aria-label="' + ui.esc(t('chOf', { n: c })) + '">' + c + '</button>').join('') + '</div>';
  const api = ui.sheet(() => ui.snav(book ? P.name(book) : t('pick')) + (book ? chapters(bookOf(book)) : tabs() + books(part)), (el) => {
    el.addEventListener('click', (e) => {
      const sg = e.target.closest('[data-seg="btest"] [data-v]');
      if (sg) { part = sg.dataset.v === 'nt'; api.update(); return; }
      const bk = e.target.closest('[data-bk]'), c = e.target.closest('[data-ch]');
      if (bk) { const b = bookOf(bk.dataset.bk); if (P.chapters(b.code) === 1) { api.close(); open(b.code, 1); } else { book = b.code; api.update(); } }
      else if (c) { api.close(); open(book, +c.dataset.ch); }
    });
  });
}

// Переводы: Синодальный и модули MyBible; добавить — файл .SQLite3, удалить — крестик.
// В «Минимале» — ещё словари, комментарии, ссылки, подзаголовки и что показывать в тексте
const AUX = [['dictionary', 'secDict'], ['commentaries', 'secComm'], ['crossreferences', 'secXref'], ['subheadings', 'secSubs']];
function trSheet() {
  const { t, ui } = ctx;
  const cur0 = () => ctx.store.get('tr', 'synodal');
  const mb = (r) => (r.size / 1048576).toFixed(1);
  const row = (id, title, sub, del) => '<div class="cell"><button class="grow btrrow" data-tr="' + id + '"><span>' + (cur0() === id ? '✓ ' : '') + ui.esc(title) + '</span><span class="st l2" style="display:block;font-size:12.5px">' + ui.esc(sub) + '</span></button>' +
    (del ? ui.icb('data-trdel="' + id + '"', I.del, t('trDel'), 'sm') : '') + '</div>';
  const auxRow = (r) => '<div class="cell"><span class="grow"><span>' + ui.esc(r.name) + '</span><span class="st l2" style="display:block;font-size:12.5px">' + ui.esc(t('modSub', { abbr: r.meta.abbr || '', mb: mb(r) })) + '</span></span>' +
    ui.icb('data-moddel="' + r.id + '"', I.del, t('modDel'), 'sm') + '</div>';
  const studyHTML = () => {
    if (!S) return '';
    const pf = S.prefs(ctx), all = ctx.files.list('bible');
    return AUX.map(([type, key]) => { const l = all.filter((r) => r.meta && r.meta.type === type); return l.length ? '<div class="hdr">' + t(key) + '</div><div class="group">' + l.map(auxRow).join('') + '</div>' : ''; }).join('') +
      '<div class="hdr">' + t('st.show') + '</div><div class="group">' + [['strong', 'st.strong'], ['comm', 'st.comm'], ['xref', 'st.xref'], ['subs', 'st.subs']].map(([k, l]) =>
        '<div class="cell"><span class="grow">' + t(l) + '</span>' + ui.sw('stp-' + k, pf[k], t(l)) + '</div>').join('') + '</div>';
  };
  const api = ui.sheet(() => ui.snav(t('tr')) + '<div class="group">' + row('synodal', t('trSyn'), t('trSynSub'), false) +
    ctx.files.list('bible').filter(isBible).map((r) => row(r.id, r.name, t('trSub', { n: r.meta ? r.meta.count : '?', mb: mb(r) }) + (r.meta && r.meta.lang ? ' · ' + r.meta.lang : ''), true)).join('') + '</div>' +
    studyHTML() +
    '<div class="hdr">' + t('view') + '</div><div class="group"><div class="cell"><span class="grow">' + t('barTop') + '</span>' + ui.sw('bartop', ctx.store.get('barTop', false), t('barTop')) + '</div></div>' +
    '<button class="btn" data-tradd style="width:100%;margin-top:14px">' + t('trAdd') + '</button><p class="ftr">' + t('trHintStudy') + '</p>', (el) => {
    el.addEventListener('click', async (e) => {
      const r = e.target.closest('[data-tr]'), d = e.target.closest('[data-trdel]'), md = e.target.closest('[data-moddel]'), add = e.target.closest('[data-tradd]');
      if (r) { await switchTr(r.dataset.tr); api.close(); }
      else if (d) {
        if (!(await ui.confirm(t('trDelQ'), t('trDelText'), t('trDel')))) return;
        if (cur0() === d.dataset.trdel) await switchTr('synodal');
        const o = opened.get(d.dataset.trdel); if (o) { o.close(); opened.delete(d.dataset.trdel); }
        ctx.files.remove(d.dataset.trdel);
        api.update();
      } else if (md) {
        if (!(await ui.confirm(t('modDelQ'), t('modDelText'), t('modDel')))) return;
        S && S.closeAux();
        ctx.files.remove(md.dataset.moddel);
        api.update();
        reopen();
      } else if (add) addModule(() => api.update());
    });
    el.addEventListener('change', (e) => {
      if (e.target.dataset.sw === 'bartop') { ctx.store.set('barTop', e.target.checked); render(); return; }
      const k = (e.target.dataset.sw || '').replace(/^stp-/, '');
      if (!e.target.dataset.sw || k === e.target.dataset.sw) return;
      ctx.store.set('study', { ...prefs(ctx), [k]: e.target.checked });
      reopen();
    });
  });
}
// перерисовать главу на том же месте (метки модулей — заново)
const reopen = () => { const tx = host && host.querySelector('.btext'); open(cur.code, cur.ch, tx ? tx.scrollTop : 0); };

async function switchTr(id) {
  try { P = await providerOf(id); ctx.store.set('tr', P.id); ctx.log('перевод: ' + P.short); }
  catch (e) { ctx.logErr(e); ctx.ui.toast(ctx.t('trFail')); P = SYN; ctx.store.set('tr', 'synodal'); }
  open(cur.code, cur.ch);
}

// Добавить модули MyBible (можно сразу несколько): тип по таблицам (перевод — есть стихи книг канона; в «Минимале» —
// и словари, комментарии, ссылки, подзаголовки) → сохранение на устройстве → первый добавленный перевод выбирается сразу
async function addOne(f) {
  const { openModule } = await import('../../core/mybible-study.js'), { bookCount } = await import('../../core/mybible.js');
  let m;
  try { m = await openModule(new Uint8Array(await f.arrayBuffer()), f.name); } catch (e) { throw Object.assign(e, { reason: 'notbible' }); }
  const bible = m.type === 'bible', count = bible ? bookCount({ books: m.books }) : 0;
  m.close();
  if (bible && !count) throw Object.assign(new Error('no canonical books'), { reason: 'nobooks' });
  const meta = { type: m.type, abbr: m.abbr, file: f.name, lang: m.info.language || '', count };
  const rec = { id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'bible', name: m.title, size: f.size, type: 'application/x-sqlite3', created: Date.now(), blob: f, meta, songs: [] };
  if (!(await ctx.files.add(rec))) throw Object.assign(new Error('not saved'), { reason: 'notsaved' });
  if (ctx.files.reread) await ctx.files.reread(rec);
  ctx.log('модуль MyBible (' + m.type + '): ' + m.title + (bible ? ', книг ' + count : '') + ', ' + (f.size / 1048576).toFixed(1) + ' МБ');
  return rec;
}
// .zip → файлы .SQLite3 внутри; имя без русских букв (бывает «.SQLite3») — по имени архива («Стронг.dictionary.zip»)
async function unzipModules(files) {
  const out = [];
  for (const f of files) {
    if (!/\.zip$/i.test(f.name)) { out.push(f); continue; }
    const { unzipSync } = await import('fflate');
    const z = unzipSync(new Uint8Array(await f.arrayBuffer()), { filter: (e) => /\.sqlite3?$/i.test(e.name) });
    const base = safeDecode(f.name).replace(/\.zip$/i, '').replace(/\.sqlite3?$/i, '');
    for (const [name, u8] of Object.entries(z)) out.push(new File([u8], zipEntryName(name, base), { type: 'application/x-sqlite3' }));
  }
  return out;
}
const safeDecode = (n) => { try { return decodeURIComponent(n); } catch { return n; } };
export const zipEntryName = (name, base) => { const n = String(name).split('/').pop(); return /^\.sqlite3?$/i.test(n) || !n.replace(/\.sqlite3?$/i, '').trim() ? base + '.SQLite3' : n; };
const ERR = { notbible: 'trNotBible', nobooks: 'trNoBooks', notsaved: 'trNotSaved' };
function addModule(done) {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '.SQLite3,.sqlite3,.sqlite,.db,.zip';
  input.addEventListener('change', async () => {
    let list = [...input.files];
    if (!list.length) return;
    // архивы .zip (так модули скачиваются с сайтов MyBible) — раскрыть: внутри один или несколько .SQLite3
    try { list = await unzipModules(list); } catch (e) { ctx.logErr(e); }
    ctx.ui.toast(ctx.t('trReading'));
    const added = [], failed = [];
    for (const f of list) {
      try { added.push(await addOne(f)); }
      catch (e) { ctx.logErr(e); failed.push({ name: f.name, reason: e && e.reason }); }
      if (!ctx) return; // Библию закрыли, пока читались файлы
    }
    const tr = added.find((r) => r.meta.type === 'bible');
    if (added.some((r) => r.meta.type !== 'bible')) S && S.closeAux();
    if (tr) await switchTr(tr.id); else if (added.length) reopen();
    // итог: один файл — как раньше; несколько — сколько подключено и что не подошло
    if (list.length === 1) ctx.ui.toast(failed.length ? ctx.t(ERR[failed[0].reason] || 'trFail') : tr ? ctx.t('modAdded', { name: tr.name }) : ctx.t('modAdded', { name: added[0].name }));
    else ctx.ui.toast(ctx.t('modAddedN', { n: added.length, all: list.length }) + (failed.length ? ' · ' + ctx.t('modSkipped', { list: failed.map((x) => x.name).join(', ') }) : ''));
    done();
  });
  input.click();
}

/* ---------- полный экран ---------- */
// Только текст главы на весь экран (вкладка внизу и полоса прячутся); выход — кнопка в углу, «Назад», Esc
const pureKey = (e) => { if (e.key === 'Escape' && !document.querySelector('#sheetLayer .scrim')) setPure(false); };
async function setPure(on) {
  if (pure === on || !ctx) return;
  pure = on;
  document.documentElement.classList.toggle('bible-pure', on);
  if (on) { pureEnter(() => setPure(false)); document.addEventListener('keydown', pureKey); ctx.ui.toast(ctx.t('pureHint')); }
  else { pureLeave(); document.removeEventListener('keydown', pureKey); }
  render();
}

/* ---------- выбор стихов: копировать и отправить с ссылкой и переводом ---------- */
function selHTML() {
  const { t, ui } = ctx, n = sel.size;
  return '<div class="bbar bsel">' + ui.icb('data-x="bsel0"', I.del, t('selDone'), 'sm') + '<span class="bseln">' + ui.esc(n ? t('selN', { n, ref: refOf([...sel]) }) : t('selHint')) + '</span><span class="bgrow"></span>' +
    (n ? ui.icb('data-x="bselcopy"', I.copy, t('copy'), 'sm') + ui.icb('data-x="bselshare"', I.share, t('share'), 'sm') : '') + '</div>';
}
function selStart(v) { sel = new Set([v]); render(); paintSel(); }
function selToggle(v) {
  if (sel.has(v)) sel.delete(v); else sel.add(v);
  const bar = host.querySelector('.bsel');
  if (bar) bar.outerHTML = selHTML();
  paintSel();
}
const paintSel = () => host && host.querySelectorAll('.bv').forEach((b) => b.classList.toggle('sel', !!sel && sel.has(+b.dataset.v)));
const trName = () => (P === SYN ? ctx.t('trSyn') : (ctx.files.get(P.id) || {}).name || P.short);
const quote = (vs) => quoteText(vs, verseText, P.name(cur.code) + ' ' + cur.ch, trName());
async function copyVerses(vs) {
  if (!vs.length) return;
  try {
    await navigator.clipboard.writeText(quote(vs));
    ctx.ui.toast(ctx.t(vs.length > 1 ? 'copiedN' : 'st.copied', { n: vs.length }));
    ctx.log('скопировано стихов: ' + vs.length);
    if (sel) { sel = null; render(); }
  } catch { ctx.ui.toast(ctx.t('st.copyFail')); }
}
async function shareVerses(vs) {
  if (!vs.length) return;
  try {
    const r = await ctx.sendText(quote(vs), P.name(cur.code) + ' ' + cur.ch);
    if (r === 'copied') ctx.ui.toast(ctx.t('st.copied'));
    if (sel && r !== 'cancel') { sel = null; render(); }
  } catch (e) { ctx.logErr(e); ctx.ui.toast(ctx.t('shareFail')); }
}

/* ---------- поиск по всей Библии (выбранный перевод) ---------- */
const MAXHITS = 300;
function searchSheet() {
  const { t, ui } = ctx, esc = ui.esc;
  let scope = ctx.store.get('bscope', 'all'), token = 0, deb = 0;
  const q0 = ctx.store.get('bq', '');
  const scopes = [['all', t('sAll')], ['ot', t('ot')], ['nt', t('nt')], ['book', P.abbr(cur.code)]];
  ui.sheet(() => ui.snav(t('search')) + '<input class="bsq" type="search" enterkeyhint="search" autocomplete="off" aria-label="' + esc(t('search')) + '" placeholder="' + esc(t('sPh')) + '" value="' + esc(q0) + '">' +
    ui.seg('bscope', scopes, scope, t('search')) + '<div class="bsst l2" aria-live="polite"></div><div class="bsres"></div>', (el, api) => {
    const inp = el.querySelector('.bsq'), res = el.querySelector('.bsres'), st = el.querySelector('.bsst');
    const run = async () => {
      const q = inp.value.trim(), my = ++token;
      ctx.store.set('bq', q);
      res.innerHTML = ''; st.textContent = '';
      if (q.length < 2) return;
      const nq = normQ(q), list = BOOKS.filter((b) => P.has(b.code) && (scope === 'all' || (scope === 'nt' ? b.nt : scope === 'ot' ? !b.nt : b.code === cur.code)));
      let hits = 0, html = '';
      const said = () => t('sFound', { n: hits }) + (hits >= MAXHITS ? ' · ' + t('sMore') : '');
      st.textContent = t('sBusy');
      for (const b of list) {
        let book;
        try { book = await P.book(b.code); } catch (e) { ctx.logErr(e); continue; }
        if (my !== token || !el.isConnected) return;
        book.forEach((ch, ci) => ch.forEach((v, vi) => {
          if (hits >= MAXHITS) return;
          const h = hitHTML(v, nq, esc);
          if (h == null) return;
          hits++;
          html += '<button class="cell bshit" data-r="' + b.code + ':' + (ci + 1) + ':' + (vi + 1) + '"><span class="grow"><b>' + esc(P.abbr(b.code) + ' ' + (ci + 1) + ':' + (vi + 1)) + '</b> ' + h + '</span></button>';
        }));
        res.innerHTML = html ? '<div class="group">' + html + '</div>' : '';
        st.textContent = said();
        if (hits >= MAXHITS) break;
      }
      if (my === token) { st.textContent = hits ? said() : t('sNone'); ctx.log('поиск по Библии: найдено ' + hits); }
    };
    inp.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(run, 450); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(deb); run(); inp.blur(); } });
    el.addEventListener('click', (e) => {
      const sg = e.target.closest('[data-seg="bscope"] [data-v]');
      if (sg) { scope = sg.dataset.v; ctx.store.set('bscope', scope); el.querySelectorAll('[data-seg="bscope"] [data-v]').forEach((x) => x.setAttribute('aria-pressed', x === sg)); run(); return; }
      const h = e.target.closest('[data-r]');
      if (h) { const [code, ch, v] = h.dataset.r.split(':'); api.close(); nav(code, +ch, +v); }
    });
    if (q0) run(); else setTimeout(() => inp.focus(), 250);
  });
}

function bind() {
  onClick = (e) => {
    const x = e.target.closest('[data-x]');
    if (!x) return;
    const a = x.dataset.x;
    if (a === 'bprev' || a === 'bnext') { const n = step(a === 'bnext' ? 1 : -1); if (n) open(n.code, n.ch); }
    else if (a === 'bpick') pickSheet();
    else if (a === 'bsearch') searchSheet();
    else if (a === 'bpure') setPure(true);
    else if (a === 'bunpure') setPure(false);
    else if (a === 'bsel0') { sel = null; render(); }
    else if (a === 'bselcopy') copyVerses([...sel]);
    else if (a === 'bselshare') shareVerses([...sel]);
    else if (a === 'btr') trSheet();
    else if (a === 'bfs') { ctx.store.set('fs', Math.max(FS_MIN, Math.min(FS_MAX, fs() + +x.dataset.d))); host.querySelector('.bwrap').style.setProperty('--bfs', fs() + 'px'); }
    else if (a === 'bmark') { const k = chKey(cur.code, cur.ch), on = !ctx.bible.isRead(k); ctx.bible.mark(k, on); ctx.log('прочитано ' + k + ': ' + on); render(); }
  };
  host.addEventListener('click', onClick);
}

export default {
  ...meta,
  status(c) { const p = c.bible.pos(); return p ? refText([chKey(p.code, p.ch)]) : c.t('name'); },
  mount(el, c, sz = 'full') {
    // Библия уже открыта в другом месте (вкладка внизу, а теперь — окно сессии): то место ждёт и вернётся после закрытия этого
    if (host && host !== el && host.isConnected) { if (onClick) host.removeEventListener('click', onClick); clearTimeout(scrollT); waiting.push({ el: host, c: ctx, sz: size }); }
    host = el; ctx = c; size = sz;
    bind();
    const p = ctx.bible.pos() || { code: 'GEN', ch: 1, y: 0 };
    const go = () => open(bookOf(p.code) ? p.code : 'GEN', p.ch || 1, p.y || 0);
    (ctx.files.ready || Promise.resolve()).then(() => study()).then(() => providerOf(ctx.store.get('tr', 'synodal'))).then((x) => { P = x; }, (e) => { ctx.logErr(e); P = SYN; }).then(() => { if (host) go(); });
  },
  resize(sz) { size = sz; render(); },
  unmount(el) {
    // закрывается место, которое ждёт (Библия сейчас открыта в другом) — просто забыть его
    if (el && host && el !== host) { const i = waiting.findIndex((w) => w.el === el); if (i >= 0) waiting.splice(i, 1); return; }
    clearTimeout(scrollT);
    if (pure) setPure(false);
    sel = null;
    opened.forEach((x) => x.close()); opened.clear(); P = SYN; S && S.closeAux(); // модули MyBible в памяти — только пока Библия открыта
    if (host && onClick) host.removeEventListener('click', onClick);
    host = null; ctx = null; verses = null; rows = null; marks = NO_MARKS;
    const w = waiting.pop();
    if (w && w.el.isConnected) this.mount(w.el, w.c, w.sz);
  },
};
