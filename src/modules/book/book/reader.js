// «Учебник»: интерактивная книга в двух разделах — академическая теория и джазовая. Оглавление (раздел, части, главы, поиск термина)
// и чтение главы: текст из языковой папки (lang/<код>/: base.js + части pN.js), в нём живые схемы ({{lab:id}} → labs.js)
// и термины-ссылки
// ([[id|слово]] → определение в шторке и переход к главе). Грузится по требованию (модуль «Учебник», src/modules/book/index.js — import()).
// Состояние: глава — в настройках модуля (th.book), схемы — в памяти до закрытия окна.
import { createLabs } from './labs.js';
import { stopSing } from './labs5.js';
import { LESSONS, PATHS, SEC_PATHS, lessonById, INSTS } from './lessons.js';
import { createSound, setLabels, esc } from './draw.js';
import './book.css';
// Шрифт нот (SMuFL) — файл проекта alphaTab, без сети; грузится один раз при открытии учебника
import BRAVURA from '@coderline/alphatab/font/Bravura.woff2?url';
let fontOn = false;
function loadFont() {
  if (fontOn || typeof FontFace === 'undefined' || typeof document === 'undefined') return;
  fontOn = true;
  new FontFace('Melete Bravura', 'url(' + BRAVURA + ')').load().then((f) => document.fonts.add(f)).catch(() => { fontOn = false; });
}

const LANGS = { ru: () => import('./lang/ru/index.js'), uz: () => import('./lang/uz/index.js'), en: () => import('./lang/en/index.js') };
// Части и порядок глав (главы, которых ещё нет в языковом файле, пропускаются). Номер части — ключ названия bk.partN
export const PARTS = [
  ['sound', 'rhythm', 'meter', 'pitch', 'mode', 'keys', 'melody', 'perform'],
  ['iv', 'chords', 'scales', 'key'],
  ['iivi', 'ana', 'voice', 'hands', 'mod', 'reharm', 'centers'],
  ['comp', 'latin', 'forms', 'arr', 'impro', 'lines', 'outside', 'trad'],
  ['tune'],
  ['practice', 'ref'],
  ['slash', 'melmin'],
  ['play'],
];
// Два раздела учебника (решение автора 30.10.2026): академическая теория (программа музыкальной школы) и джазовая;
// «Практика и справка» — общая, в конце обоих
export const SECTIONS = { school: [0, 1, 7, 5], jazz: [6, 2, 3, 4, 5] };
const SECS = Object.keys(SECTIONS);
// Главы в порядке частей (все разделы)
export const ordered = (L) => PARTS.flat().map((id) => L.CH.find((c) => c.id === id)).filter(Boolean);
// Раздел главы: общая глава — текущий раздел
export const sectionOf = (id, cur = 'school') => { const own = SECS.filter((k) => SECTIONS[k].some((p) => PARTS[p].includes(id))); return own.includes(cur) ? cur : own[0] || cur; };

// Языковой файл (el и прочие — английский)
const cache = {};
export async function loadLang(code) {
  const k = LANGS[code] ? code : 'en';
  if (!cache[k]) cache[k] = (await LANGS[k]()).default;
  return cache[k];
}
export const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? v[k] : m));

// Разметка текста главы → HTML: схемы и ссылки-термины
export function chapterHTML(ch, terms) {
  let n = 0;
  return ch.h.replace(/\{\{lab:([a-z0-9]+)\}\}/g, (m, id) => '<div class="blab" data-lab="' + id + '" data-k="' + ch.id + ':' + n++ + '"></div>')
    .replace(/\[\[([a-zA-Z0-9]+)\|([^\]]+)\]\]/g, (m, id, txt) => (terms[id] ? '<a class="bterm" data-term="' + id + '" role="button" tabindex="0">' + txt + '</a>' : txt));
}

// ctx — модуль «Учебник»; L — языковой файл; th — настройки модуля (th.book: { ch — глава, sec — раздел })
export function createBook(ctx, L, { save }) {
  const T = (k, v) => fill(L.S[k] ?? k, v);
  loadFont();
  setLabels({ kb: T('bk.kb'), staff: T('sc.staff'), fret: T('sc.fret'), circle: T('bk.circle'), signs: T('bk.signs'), play: T('ui.play') });
  const snd = createSound(() => ctx.audio);
  const ui = { redraw: (el) => drawLab(el) };
  // кнопки уроков «открыть метроном / тюнер…»: метроном — сразу в темпе урока
  const tools = (id, st) => { try { if (id === 'metro' && st.bpm && ctx.audio && ctx.audio.metro) ctx.audio.metro.setBpm(st.bpm); } catch { /* метроном ещё не готов */ } if (ctx.openTool) ctx.openTool(id); };
  const LABS = createLabs({ T, L, snd, mic: ctx.mic ? () => ctx.mic.request() : null, ui, tools });
  const states = new Map();
  const all = ordered(L), byId = (id) => all.find((c) => c.id === id);
  // раздел: сохранённый; открыта глава только другого раздела (ссылка из «Теории», термин) — её раздел
  const curSec = () => { const b = ctx.store.all().book || {}, sec = SECTIONS[b.sec] ? b.sec : 'school'; return b.ch ? sectionOf(b.ch, sec) : sec; };
  // уроки: инструмент (p пианино, g гитара, b бас), пройденные уроки, страница «Начальный путь»
  const BS = () => (ctx.store.all().book ||= {});
  const curInst = () => (INSTS.includes(BS().inst) ? BS().inst : 'p');
  const doneMap = () => (BS().done ||= {});
  const lsTitle = (id) => T('ls.' + id);
  const instSeg = () => '<div class="seg bklinst" role="group" aria-label="' + T('lx.inst') + '">' + INSTS.map((k) => '<button data-li="' + k + '" aria-pressed="' + (k === curInst()) + '"' + (k === curInst() ? ' class="on"' : '') + '>' + T('lx.i.' + k) + '</button>').join('') + '</div>';
  // главы раздела по порядку; номер главы и «назад/дальше» — внутри раздела
  const secChs = (sec) => SECTIONS[sec].flatMap((p) => PARTS[p]).map(byId).filter(Boolean);
  const num = (id, sec = curSec()) => secChs(sec).findIndex((c) => c.id === id) + 1;
  let q = '', jumpTerm = null, jumpLesson = null, toTop = false;

  function tocHTML() {
    const sec = curSec(), found = q.trim() ? Object.entries(L.TERMS).filter(([, [a, b]]) => (a + ' ' + b).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 12) : null;
    return '<div class="bhero"><div class="bhicon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5v13c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z"/><path d="M12 6v13.5"/></svg></div>' +
      '<h2>' + T('bk.title') + '</h2><p>' + T('bk.lead') + '</p>' +
      '<input class="bsearch" data-bq value="' + esc(q) + '" placeholder="' + T('bk.find') + '" aria-label="' + T('bk.find') + '"></div>' +
      (found ? '<div class="bfound">' + (found.length ? found.map(([id, [a, b]]) => '<button class="bfrow" data-term="' + id + '"><b>' + a + '</b><span>' + b + '</span></button>').join('') : '<p class="hint">' + T('bk.none') + '</p>') + '</div>' : '') +
      '<div class="bsecs" role="tablist" aria-label="' + T('bk.secs') + '">' + SECS.map((k) => '<button class="bsec ' + k + (k === sec ? ' on' : '') + '" data-bsec="' + k + '" role="tab" aria-selected="' + (k === sec) + '"><b>' + T('bk.sec.' + k) + '</b><span>' + T('bk.sub.' + k) + '</span></button>').join('') + '</div>' +
      '<div class="bpaths">' + SEC_PATHS[sec].map(pathCard).join('') + '</div>' +
      SECTIONS[sec].map((p, i) => { const ids = PARTS[p]; return !ids.some(byId) ? '' : '<section class="bpart"><h3><span>' + (i + 1) + '</span>' + T('bk.part' + p) + '</h3><div class="bcards">' +
        ids.map((id) => { const c = byId(id); return c ? '<button class="bcard p' + p + '" data-bch="' + id + '"><i class="num">' + num(id) + '</i><b>' + c.t + '</b><span>' + c.s + '</span></button>' : ''; }).join('') + '</div></section>'; }).join('');
  }
  function readerHTML(id) {
    const sec = curSec(), list = secChs(sec), c = byId(id), i = num(id), prev = list[i - 2], next = list[i];
    return '<div class="bkhbar"><button class="bback" data-btoc aria-label="' + T('bk.toc') + '">‹ ' + T('bk.toc') + '</button><span class="num">' + T('bk.sec.' + sec) + ' · ' + i + ' ' + T('bk.of', { n: list.length }) + '</span></div>' +
      '<header class="bkhead"><small>' + T('bk.ch', { n: i }) + '</small><h2>' + c.t + '</h2><p>' + c.s + '</p></header>' + lessonNav(c) + '<article class="bktext">' + (LESSONS[c.id] ? lessonsHTML(c) : chapterHTML(c, L.TERMS)) + '</article>' + srcHTML(c) +
      '<nav class="bpn">' + (prev ? '<button data-bch="' + prev.id + '">‹ ' + prev.t + '</button>' : '<span></span>') + (next ? '<button data-bch="' + next.id + '">' + next.t + ' ›</button>' : '<span></span>') + '</nav>';
  }
  // Глава уроками: куски текста (по подзаголовкам) собираются в уроки, после каждого — упражнения и «Урок пройден»
  function lessonsHTML(c) {
    const html = chapterHTML(c, L.TERMS), segs = html.split(/(?=<h3>)/);
    if (/^\s*<h3>/.test(html)) segs.unshift('');
    return LESSONS[c.id].map((l, i) => '<section class="bkles" id="les-' + l.id + '"><div class="bklh"><span>' + T('ls.n', { n: i + 1 }) + '</span><b>' + lsTitle(l.id) + '</b>' + (doneMap()[l.id] ? '<i class="bkldok" aria-label="' + T('lx.isDone') + '">✓</i>' : '') + '</div>' +
      l.secs.map((k) => segs[k] || '').join('') + exHTML(l) + '</section>').join('');
  }
  function exHTML(l) {
    const inst = curInst(), has = (k) => L.S[k] != null, done = !!doneMap()[l.id];
    const checks = l.ex.filter((x) => !x.only || x.only.includes(inst)).map((x, i) => '<div class="blab" data-lab="' + x.lab + '" data-k="x:' + l.id + ':' + i + ':' + inst + '" data-cfg="' + encodeURIComponent(JSON.stringify({ ...x.cfg, inst })) + '"></div>').join('');
    return '<div class="bklex"><div class="bklexh"><b>' + T('lx.title') + '</b>' + instSeg() + '</div>' +
      (has('lx.' + l.id + '.' + inst) ? '<div class="bklext">' + T('lx.' + l.id + '.' + inst) + '</div>' : '') + checks +
      (has('lx.' + l.id + '.t') ? '<div class="bklphone"><b>' + T('lx.phone') + '</b><div>' + T('lx.' + l.id + '.t') + '</div></div>' : '') +
      '<button class="bkldone' + (done ? ' on' : '') + '" data-ldone="' + l.id + '" aria-pressed="' + done + '">' + (done ? '✓ ' + T('lx.isDone') : T('lx.markDone')) + '</button></div>';
  }
  // Полоса уроков главы под заголовком: касание — к уроку
  const lessonNav = (c) => (!LESSONS[c.id] ? '' : '<nav class="bklnav" aria-label="' + T('ls.list') + '">' + LESSONS[c.id].map((l, i) => '<button data-ljump="' + l.id + '"' + (doneMap()[l.id] ? ' class="ok"' : '') + '>' + (doneMap()[l.id] ? '✓ ' : (i + 1) + '. ') + lsTitle(l.id) + '</button>').join('') + '</nav>');
  // Пути (от новичка до продвинутого): карточки в оглавлении раздела и страница пути с уроками по порядку
  const pathDone = (id) => PATHS[id].filter((x) => doneMap()[x]).length;
  const pathNext = (id) => PATHS[id].find((x) => !doneMap()[x]) || PATHS[id][0];
  const pathCard = (id) => '<button class="bpath ' + id + '" data-bpath="' + id + '"><span class="bpk">' + T('lp.' + id + '.kicker') + '</span><b>' + T('lp.' + id + '.title') + '</b><span>' + T('lp.' + id + '.sub') + '</span>' +
    '<span class="bpbar"><i style="width:' + Math.round((pathDone(id) / PATHS[id].length) * 100) + '%"></i></span><small>' + T('lp.prog', { d: pathDone(id), n: PATHS[id].length }) + '</small></button>';
  function pathHTML(id) {
    const P = PATHS[id], next = pathNext(id), sec = SEC_PATHS.jazz.includes(id) ? 'jazz' : 'school';
    return '<div class="bkhbar"><button class="bback" data-btoc aria-label="' + T('bk.toc') + '">‹ ' + T('bk.toc') + '</button><span class="num">' + T('lp.prog', { d: pathDone(id), n: P.length }) + '</span></div>' +
      '<header class="bkhead"><small>' + T('bk.sec.' + sec) + '</small><h2>' + T('lp.' + id + '.title') + '</h2><p>' + T('lp.' + id + '.lead') + '</p></header>' +
      '<div class="bklexh"><b>' + T('lx.inst') + '</b>' + instSeg() + '</div>' +
      '<button class="btn fill bpgo" data-lgo="' + next + '">' + T(pathDone(id) ? 'lp.cont' : 'lp.begin', { n: P.indexOf(next) + 1, t: lsTitle(next) }) + '</button>' +
      '<ol class="bplist">' + P.map((x, i) => { const l = lessonById(x), c = l && byId(l.ch), ok = !!doneMap()[x]; return !l || !c ? '' : '<li><button data-lgo="' + x + '" class="' + (ok ? 'ok' : '') + (x === next ? ' next' : '') + '"><i>' + (ok ? '✓' : i + 1) + '</i><span><b>' + lsTitle(x) + '</b><small>' + c.t + '</small></span></button></li>'; }).join('') + '</ol>' +
      '<p class="bknote">' + T('lp.note') + '</p>';
  }
  // Источники главы: ключи из c.src → краткие названия книг (base.js: SRC)
  const srcHTML = (c) => (c.src && L.SRC ? '<p class="bsrc">' + T('bk.src') + ' ' + c.src.split(',').map((k) => L.SRC[k.trim()] && L.SRC[k.trim()][0]).filter(Boolean).join('; ') + '</p>' : '');
  // Схема: состояние по месту в главе, перерисовка только её
  function drawLab(el, focus) {
    const lab = LABS[el.dataset.lab]; if (!lab) return;
    // настройка урока (data-cfg) — поверх исходного состояния схемы
    if (!states.has(el.dataset.k)) states.set(el.dataset.k, Object.assign(JSON.parse(JSON.stringify(lab.st)), el.dataset.cfg ? JSON.parse(decodeURIComponent(el.dataset.cfg)) : {}));
    try { el.innerHTML = lab.render(states.get(el.dataset.k)); } catch (e) { ctx.log('учебник: схема ' + el.dataset.lab + ' — ' + (e && e.message), 'w'); el.innerHTML = ''; }
    if (focus) { const f = el.querySelector('[data-in="' + focus + '"]'); if (f) { f.focus(); try { f.setSelectionRange(f.value.length, f.value.length); } catch { /* select */ } } }
  }
  const coerce = (old, v) => (typeof old === 'number' ? +v : v);

  // Шторка термина: определение и переход к главе
  function termSheet(id) {
    const tm = L.TERMS[id]; if (!tm) return;
    const c = byId(tm[2]);
    ctx.ui.sheet(() => ctx.ui.snav(tm[0]) + '<p class="btdef">' + tm[1] + '</p>' + (c ? '<button class="btn fill" data-go style="width:100%;margin-top:12px">' + T('bk.inBook', { t: c.t }) + '</button>' : ''),
      (el, sh) => el.addEventListener('click', (e) => { if (e.target.closest('[data-go]')) { sh.close(); open(tm[2], id); } }));
  }
  function open(ch, term = null, lesson = null) { const b = BS(), sec = ch ? sectionOf(ch, curSec()) : curSec(); Object.assign(b, { ch, sec, view: null }); jumpTerm = term; jumpLesson = lesson; toTop = true; snd.stop(); stopSing(); save(); }
  function setSec(sec) { Object.assign(BS(), { ch: null, sec, view: null }); snd.stop(); stopSing(); save(); }
  function openPath(id) { Object.assign(BS(), { ch: null, sec: SEC_PATHS.jazz.includes(id) ? 'jazz' : 'school', view: 'path', path: id }); toTop = true; snd.stop(); stopSing(); save(); }
  function goLesson(id) { const l = lessonById(id); if (l) open(l.ch, null, id); }

  return {
    T,
    html(th) { const b = th.book || {}; return '<div class="swrap bkwrap"><div class="book">' + (b.ch && byId(b.ch) ? readerHTML(b.ch) : b.view === 'path' ? pathHTML(PATHS[b.path] ? b.path : 'start') : tocHTML()) + '</div></div>'; },
    // после вставки в окно: схемы и события
    mount(root) {
      const box = root.querySelector('.book'); if (!box) return;
      box.querySelectorAll('.blab').forEach((el) => drawLab(el));
      if (toTop) { toTop = false; const w = root.querySelector('.bkwrap'); if (w) w.scrollTop = 0; }
      if (jumpLesson) { const t = box.querySelector('#les-' + jumpLesson); jumpLesson = null; if (t) t.scrollIntoView({ block: 'start' }); }
      if (jumpTerm) { const t = box.querySelector('[data-term="' + jumpTerm + '"]'); jumpTerm = null; if (t) { t.scrollIntoView({ block: 'center' }); t.classList.add('flash'); } }
      box.addEventListener('click', (e) => {
        const t = e.target;
        const term = t.closest('[data-term]'); if (term) { termSheet(term.dataset.term); return; }
        const ch = t.closest('[data-bch]'); if (ch) { open(ch.dataset.bch); return; }
        if (t.closest('[data-btoc]')) { open(null); return; }
        const bs = t.closest('[data-bsec]'); if (bs) { setSec(bs.dataset.bsec); return; }
        const bp = t.closest('[data-bpath]'); if (bp) { openPath(PATHS[bp.dataset.bpath] ? bp.dataset.bpath : 'start'); return; }
        const lg = t.closest('[data-lgo]'); if (lg) { goLesson(lg.dataset.lgo); return; }
        const lj = t.closest('[data-ljump]'); if (lj) { const x = box.querySelector('#les-' + lj.dataset.ljump); if (x) x.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
        const li = t.closest('[data-li]'); if (li) { BS().inst = li.dataset.li; snd.stop(); stopSing(); save(); return; }
        const ld = t.closest('[data-ldone]'); if (ld) { const d = doneMap(), id = ld.dataset.ldone; if (d[id]) delete d[id]; else d[id] = 1; stopSing(); save(); return; }
        const el = t.closest('.blab'); if (!el) return;
        const lab = LABS[el.dataset.lab], st = states.get(el.dataset.k);
        const sb = t.closest('.seg button');
        if (sb) { const k = sb.parentElement.dataset.seg; st[k] = coerce(st[k], sb.dataset.v); if (lab.set) lab.set(st, k); drawLab(el); return; }
        const key = t.closest('[data-midi]');
        if (key) { if (ctx.audio.unlock()) ctx.audio.playNote(+key.dataset.midi, { bus: 'theory', dur: 1 }); if (lab.tap && lab.tap(st, +key.dataset.midi) !== false) { drawLab(el); return; } key.classList.add('hit'); setTimeout(() => key.classList.remove('hit'), 250); return; }
        const ci = t.closest('[data-ci]');
        if (ci) { if (lab.on(st, 'ci:' + ci.dataset.ci + (ci.dataset.min ? ':m' : ''), el) !== false) drawLab(el); return; }
        const a = t.closest('[data-a]');
        if (a && lab.on(st, a.dataset.a, el) !== false) drawLab(el);
      });
      box.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('a.bterm')) { e.preventDefault(); termSheet(e.target.dataset.term); } else if (e.key === 'Enter' && e.target.matches('input[data-in]')) e.target.blur(); });
      box.addEventListener('change', (e) => {
        const el = e.target.closest('.blab'), k = e.target.dataset.sel || e.target.dataset.in; if (!el || !k || e.target.dataset.live) return;
        const lab = LABS[el.dataset.lab], st = states.get(el.dataset.k);
        st[k] = coerce(st[k], e.target.value); if (lab.set) lab.set(st, k); drawLab(el);
      });
      box.addEventListener('input', (e) => {
        if (e.target.matches('[data-bq]')) { q = e.target.value; const f = box.querySelector('.bfound'), html = tocHTML(); const tmp = document.createElement('div'); tmp.innerHTML = html; const nf = tmp.querySelector('.bfound'); if (f) f.replaceWith(nf || document.createElement('i')); else if (nf) box.querySelector('.bhero').after(nf); return; }
        if (!e.target.dataset.live) return;
        const el = e.target.closest('.blab'); states.get(el.dataset.k)[e.target.dataset.in] = e.target.value; drawLab(el, e.target.dataset.in);
      });
    },
    stop: () => { snd.stop(); stopSing(); },
    open,
    chapterOf: (id) => byId(id),
  };
}
