// Панель «Рисунки» студии: готовые ударные, басы, клавиши, пэды и последовательности аккордов (music/studioloops.js).
// Одна полоса внизу над транспортом, плейлист остаётся виден: плитка — мини-картинка рисунка и название.
// Касание плитки — рисунок ложится на такт курсора (на подходящую свободную дорожку, нет — новая) и играет;
// потянуть плитку вверх на плейлист — бросить на нужные дорожку и такт; полоса листается вбок. Бас, клавиши и пэды
// играют по аккордам проекта (нет аккордов — от тоники), протяжённость аккордов закрывается целиком.
import { LOOPS, FAMILIES, loopById, loopsOf, loopShape, progLabel, spanFrom, roleOf } from '../../music/studioloops.js';
import { COLORS } from '../../music/project.js';

const FAM_COLOR = { chords: COLORS[0], drums: COLORS[2], bass: COLORS[1], keys: COLORS[4], pads: COLORS[6] };
const MOVE = 8; // пикселей — с этого начинается жест

// Мини-картинка: клетки рисунка тонкими чёрточками (всё — через цвет текста)
function shapeSVG(loop) {
  const s = loopShape(loop);
  if (!s.cols) return '';
  const w = s.cols, h = s.rows;
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
    s.cells.map(([x, y, l]) => '<rect x="' + x + '" y="' + y + '" width="' + Math.max(0.8, l - 0.25) + '" height="0.72" rx="0.15"/>').join('') + '</svg>';
}

export function loopsHTML(ctx, p, fam) {
  const { t, ui } = ctx, list = loopsOf(fam);
  const chips = FAMILIES.map((f) => '<button class="stlpf' + (f === fam ? ' on' : '') + '" data-lpf="' + f + '" aria-pressed="' + (f === fam) + '" style="--c:' + FAM_COLOR[f] + '">' + ui.esc(t('lp.f.' + f)) + '</button>').join('');
  const plates = list.map((l) => '<button class="stlpc' + (l.fam === 'chords' ? ' ch' : '') + '" data-lp="' + l.id + '" style="--c:' + FAM_COLOR[l.fam] + '" aria-label="' + ui.esc(t('lp.' + l.id)) + '">' +
    (l.fam === 'chords' ? '<span class="stlpp">' + ui.esc(progLabel(p, l)) + '</span>' : '<span class="stlpp">' + shapeSVG(l) + '</span>') +
    '<b>' + ui.esc(t('lp.' + l.id)) + '</b><i>' + ui.esc(ctx.tn('bars', l.bars)) + '</i></button>').join('');
  return '<div class="stlps" id="stlps"><div class="stlpt"><div class="stlpfs">' + chips + '</div>' +
    '<button class="ic sm plain stlpx" data-x="loops" aria-label="' + ui.esc(t('lp.close')) + '"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
    '<div class="stlpr" id="stlpr">' + plates + '</div><div class="stlph">' + ui.esc(t('lp.hint.' + (fam === 'chords' ? 'chords' : fam === 'drums' ? 'drums' : 'fit'))) + '</div></div>';
}

// Касания плиток. api: { fam(f) — выбрать семью, drop(id, x, y) — бросили на плейлист (экранные точки), tap(id) — касание,
// hit(x, y) → { tr, beat, len } | null — что под пальцем, mark(m | null) — метка на плейлисте }
export function loopsBind(host, api) {
  let g = null; // { id, el, x0, y0, id, mode: null | 'drag' | 'scroll', ghost }
  const plate = (e) => e.target.closest && e.target.closest('.stlpc');
  const down = (e) => {
    const b = plate(e);
    if (!b || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    g = { el: b, lp: b.dataset.lp, pid: e.pointerId, x0: e.clientX, y0: e.clientY, mode: null, ghost: null };
  };
  const ghost = (e) => {
    const r = g.el.getBoundingClientRect(), el = g.el.cloneNode(true);
    el.classList.add('stlpg'); el.style.width = r.width + 'px'; el.style.height = r.height + 'px';
    document.body.appendChild(el); g.ghost = el;
    g.el.classList.add('lift');
    try { g.el.setPointerCapture(e.pointerId); } catch { /* */ }
  };
  const move = (e) => {
    if (!g || e.pointerId !== g.pid) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (!g.mode && Math.hypot(dx, dy) > MOVE) {
      const row = host.querySelector('.stlpr'), vert = row && getComputedStyle(row).flexDirection === 'column'; // боком панель — колонка слева: брать влево, листать вверх-вниз
      const take = vert ? dx < 0 && Math.abs(dx) > Math.abs(dy) * 0.8 : dy < 0 && Math.abs(dy) > Math.abs(dx) * 0.8;
      if (take) { g.mode = 'drag'; ghost(e); } else g.mode = 'scroll'; // к плейлисту — взять рисунок, вдоль полосы — листать
    }
    if (g.mode === 'drag') {
      g.ghost.style.transform = 'translate(' + (e.clientX - g.ghost.offsetWidth / 2) + 'px,' + (e.clientY - g.ghost.offsetHeight - 14) + 'px)';
      const h = api.hit(e.clientX, e.clientY, g.lp);
      api.mark(h);
      e.preventDefault();
    }
  };
  const end = (e, cancel) => {
    if (!g || (e && e.pointerId !== g.pid)) return;
    const s = g; g = null;
    if (s.ghost) s.ghost.remove();
    s.el.classList.remove('lift');
    api.mark(null);
    if (cancel) return;
    if (s.mode === 'drag') { const h = api.hit(e.clientX, e.clientY, s.lp); if (h) api.drop(s.lp, h); }
    else if (!s.mode) api.tap(s.lp);
  };
  const up = (e) => end(e, false), cancel = (e) => end(e, true);
  const click = (e) => { const b = e.target.closest && e.target.closest('[data-lpf]'); if (b) { api.fam(b.dataset.lpf); e.stopPropagation(); } };
  host.addEventListener('pointerdown', down);
  host.addEventListener('pointermove', move, { passive: false });
  host.addEventListener('pointerup', up);
  host.addEventListener('pointercancel', cancel);
  host.addEventListener('click', click, true);
  return () => { host.removeEventListener('pointerdown', down); host.removeEventListener('pointermove', move); host.removeEventListener('pointerup', up); host.removeEventListener('pointercancel', cancel); host.removeEventListener('click', click, true); if (g && g.ghost) g.ghost.remove(); g = null; };
}
export { loopById, spanFrom, roleOf, LOOPS };
