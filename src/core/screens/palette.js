// Компьютер (слово автора 27.11.2026, макет «Главный экран»): поиск и клавиши. Ctrl K или «/» — окно поиска: песня, инструмент, раздел,
// действие; ↑↓ и Enter, Esc закрывает. Ctrl 1–9 — разделы по порядку; без модификаторов (когда ничего не открыто и не вводится текст):
// Пробел на главной — «Свободная практика», буква инструмента (M метроном, T тюнер, P пианино…) — открыть его. Только режим компьютера (html.desk).
import { t } from '../../i18n/index.js';
import { esc } from '../../ui/index.js';
import { moduleById } from '../../modules/index.js';
import { moduleName } from '../modules.js';
import { toolsTab } from './tools.js';
import { isPage } from './common.js';

// Клавиши инструментов (латиница; в подсказках — заглавной)
export const TOOL_KEYS = { metro: 'm', tuner: 't', piano: 'p', glider: 'g', drone: 'd', studio: 's', theory: 'h', ear: 'e', beat: 'r', vocal: 'v', notes: 'n', audio: 'l', voice: 'q', timer: 'o', spectrum: 'x', looper: 'u', theremin: 'w' };
const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
// Совпадение: начало слова весомее, потом любое вхождение; 0 — нет
export function score(q, text) {
  const s = norm(text); if (!q) return 1;
  if (s.startsWith(q)) return 4;
  if (s.split(/[\s\-—·.,()]+/).some((w) => w.startsWith(q))) return 3;
  return s.includes(q) ? 2 : 0;
}

export function initPalette(app) {
  if (typeof document === 'undefined' || initPalette.done) return;
  initPalette.done = true;
  const html = document.documentElement;
  const desk = () => html.classList.contains('desk');
  let el = null, list = [], sel = 0, prevFocus = null;

  // кнопка поиска в полосе навигации (видна только на компьютере — CSS)
  const mountBtn = () => {
    const nav = document.querySelector('.tabbar');
    if (!nav || nav.querySelector('.deskfind')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'deskfind'; b.setAttribute('aria-label', t('palette.ph'));
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>' + esc(t('palette.find')) + '</span><kbd>Ctrl K</kbd>';
    b.addEventListener('click', () => open());
    nav.appendChild(b); mo.disconnect();
  };
  const mo = new MutationObserver(() => mountBtn());
  mo.observe(document.body, { childList: true, subtree: true });
  mountBtn();

  const tabsOf = () => {
    const st = app.store.state.settings;
    const L = [['home', t('nav.home')], ['library', t('nav.library')], ['calendar', t('nav.calendar')], ['tools', t('nav.tools')]];
    if (st.church) L.push(['bible', t('nav.bible')]);
    return L;
  };
  const toolsOf = () => {
    const st = app.store.state.settings;
    return toolsTab(st).shown.filter((id) => !isPage(id) && moduleById(id)).map((id) => ({ id, name: moduleName(moduleById(id)) }));
  };
  const entries = () => {
    const out = [];
    out.push({ g: 'act', label: t('palette.free'), hint: t('palette.space'), run: () => app.startSession('free') });
    out.push({ g: 'act', label: t('palette.settings'), run: () => app.go('settings') });
    tabsOf().forEach(([k, name], i) => out.push({ g: 'go', label: name, hint: 'Ctrl ' + (i + 1), run: () => app.go(k) }));
    toolsOf().forEach((x) => out.push({ g: 'tool', label: x.name, hint: TOOL_KEYS[x.id] ? TOOL_KEYS[x.id].toUpperCase() : '', run: () => app.showTool(x.id) }));
    (app.store.songs() || []).forEach((s) => out.push({ g: 'song', label: s.title || '', sub: [s.artist, s.key].filter(Boolean).join(' · '), find: (s.title || '') + ' ' + (s.artist || ''), run: () => app.go('library', s.id) }));
    return out;
  };
  const GROUPS = ['act', 'go', 'tool', 'song'];
  const GL = { act: 'palette.act', go: 'palette.go', tool: 'palette.tools', song: 'palette.songs' };
  const search = (qRaw) => {
    const q = norm(qRaw.trim()), all = entries();
    let r = all.map((e) => ({ e, sc: score(q, e.find || e.label) })).filter((x) => x.sc > 0);
    if (!q) r = r.filter((x) => x.e.g !== 'song' || r.filter((y) => y.e.g === 'song').indexOf(x) < 5); // без запроса — пять песен
    r.sort((a, b) => GROUPS.indexOf(a.e.g) - GROUPS.indexOf(b.e.g) || b.sc - a.sc); // группы по порядку, внутри — лучшее совпадение выше
    const CAP = { act: 3, go: 5, tool: 6, song: 6 }, n = {};
    return r.filter((x) => (n[x.e.g] = (n[x.e.g] || 0) + 1) <= CAP[x.e.g]).map((x) => x.e); // не больше нескольких в группе: песни не вытесняются инструментами
  };

  const draw = () => {
    const box = el.querySelector('[data-pl]'); let g = '';
    box.innerHTML = list.length ? list.map((e, i) => (e.g !== g ? ((g = e.g), '<div class="plg">' + esc(t(GL[e.g])) + '</div>') : '') +
      '<button class="pli' + (i === sel ? ' on' : '') + '" data-i="' + i + '" role="option" aria-selected="' + (i === sel) + '"><span class="plt">' + esc(e.label) + (e.sub ? '<small>' + esc(e.sub) + '</small>' : '') + '</span>' + (e.hint ? '<kbd>' + esc(e.hint) + '</kbd>' : '') + '</button>').join('') : '<p class="plno">' + esc(t('palette.none')) + '</p>';
    const cur = box.querySelector('.pli.on'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  };
  const run = (i) => { const e = list[i]; if (!e) return; close(); setTimeout(() => e.run(), 0); };
  function close() {
    if (!el) return;
    el.remove(); el = null;
    if (prevFocus && prevFocus.isConnected) { try { prevFocus.focus(); } catch { /* */ } }
  }
  function open() {
    if (el) { el.querySelector('input').focus(); return; }
    prevFocus = document.activeElement;
    el = document.createElement('div');
    el.className = 'kpal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', t('palette.ph'));
    el.innerHTML = '<div class="kpalc"><div class="kpals"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="text" autocomplete="off" spellcheck="false" placeholder="' + esc(t('palette.ph')) + '" aria-label="' + esc(t('palette.ph')) + '"><kbd>Esc</kbd></div><div class="kpall" data-pl role="listbox"></div></div>';
    document.body.appendChild(el);
    const inp = el.querySelector('input');
    list = search(''); sel = 0; draw(); inp.focus();
    inp.addEventListener('input', () => { list = search(inp.value); sel = 0; draw(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(list.length - 1, sel + 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    });
    el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
    el.addEventListener('click', (e) => { const b = e.target.closest('.pli'); if (b) run(+b.dataset.i); });
    el.addEventListener('mousemove', (e) => { const b = e.target.closest('.pli'); if (b && +b.dataset.i !== sel) { sel = +b.dataset.i; el.querySelectorAll('.pli').forEach((x, i) => { x.classList.toggle('on', i === sel); x.setAttribute('aria-selected', i === sel); }); } });
  }

  // что-то открыто поверх экрана — клавиши инструментов не трогаем
  const busy = () => !!(document.querySelector('.sheet, .scrim, #panelLayer, .tview, .session, .kpal, .pdffull, .ned, .bwrap.bpure, .szin') || html.classList.contains('arrange'));
  const typing = (t0) => !!t0 && (/^(INPUT|TEXTAREA|SELECT)$/.test(t0.tagName) || t0.isContentEditable);
  document.addEventListener('keydown', (e) => {
    if (!desk() || e.defaultPrevented || e.isComposing) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) { e.preventDefault(); open(); return; }
    if (mod && !e.altKey && !e.shiftKey && /^[1-9]$/.test(e.key) && !el) {
      const tabs = [...document.querySelectorAll('.tabbar .tab[data-tab]')], b = tabs[+e.key - 1];
      if (b) { e.preventDefault(); app.go(b.dataset.tab); }
      return;
    }
    if (mod || e.altKey || e.repeat || el || typing(e.target) || busy()) return;
    if (e.key === '/') { e.preventDefault(); open(); return; }
    if (e.key === ' ' && (e.target === document.body || e.target === document.documentElement)) {
      const home = document.querySelector('.tabbar .tab[data-tab="home"][aria-current="page"]');
      if (home && !app.active) { e.preventDefault(); app.startSession('free'); }
      return;
    }
    if (e.target && e.target.closest && e.target.closest('button, a, [role="button"], [role="slider"]') && e.target !== document.body) return;
    const k = String(e.key || '').toLowerCase(), id = Object.keys(TOOL_KEYS).find((m) => TOOL_KEYS[m] === k);
    if (id && toolsOf().some((x) => x.id === id)) { e.preventDefault(); app.showTool(id); }
  });
}
