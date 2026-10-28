// Плейлист на холсте — по форме FL Studio Mobile: сверху линейка тактов, слева колонка дорожек (цветной значок
// по роду: ударные, клавиши, аккорды, запись), дальше сетка таймлайна и клипы — цветные блоки с рисунком
// содержимого (удары, ноты, названия аккордов, волна записи). Клип по кругу — границы повторов видны.
// Жесты (переделка 28.10.2026, по просьбе автора): касание клипа — выделить (выделено несколько — касание добавляет
// или убирает); удержать клип — его шторка (править, тональность, скорость, по кругу); двойное касание клипа —
// разрезать в этом месте; вести клип — перенос (выделенные — все вместе; на другую дорожку того же рода); вести за
// правый край — длина (запись — открывается дальше записанное, по кругу — повтор, сплошной — пустое место), за левый —
// начало (так же назад); касание пустого места — «+» в этом такте, касание «+» — новая партия и сразу её редактор;
// удержать пустое и вести — рамка выделения (без движения — меню: вставить); вести по пустому — прокрутка;
// щипок — масштаб (до миллисекунд; сетка мельчает с приближением, на самом крупном — без сетки);
// касание линейки — играть отсюда; вести по линейке — петля, вести край петли — изменить, удержать линейку — меню
// (маркер, снять петлю). Касание значка дорожки — её меню, «+» внизу — новая дорожка.
// Без зависимости от модуля: получает проект и обратные вызовы.
import { clipsOf, trackOf, songBars, moveClip, resizeClip, trimClipStart, dataBeats, chordName, setRegion, setAutoPoint, removeAutoPoint, autoPointAt, autoAt, piecePasses, DRUMS, TQ } from '../../music/project.js';
import { pinch } from '../../ui/gestures.js';
const buzz = () => { try { navigator.vibrate && navigator.vibrate(12); } catch { /* нет вибрации */ } };

const HEAD = 56, RULER = 30, ROW = 64, GAP = 3, EDGE = 16, HOLD_MS = 450, MIN_BARS = 8, ZMIN = 6, ZMAX = 2400;

// Автоматизация (get().auto = { tr, kind }): поверх ряда дорожки — огибающая; касание — точка, вести — сдвинуть,
// удержать — убрать; значок этой дорожки — выйти.
// host — элемент под холст; get() → { p, names(tr) → имя, fileName(id), peaks(id) → Float32Array|null, auto };
// on: { open(clip) — удержание клипа, split(clip, beat) — двойное касание, sel(ids) — выделение изменилось, track(tr, x, y),
//       addTrack(x, y), create(tr, beat) — касание «+», empty(tr, beat, x, y) — удержание пустого без движения (вставить),
//       seek(beat), ruler(beat, x, y) — удержание линейки, region() — петля изменена, change(),
//       autoChange() — точки автоматизации изменились, autoExit() — выйти из автоматизации }
export function createPlaylist(host, get, on) {
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  cv.className = 'plcv';
  host.appendChild(cv);
  // sels — выделенные клипы; plus — «+» на пустом месте { tr, bar }; band — рамка выделения (экранные точки)
  const V = { pxb: 0, x: 0, y: 0, dpr: Math.min(2, devicePixelRatio || 1), pos: -1, sels: new Set(), plus: null, band: null, cursor: 0 };
  let W = 0, H = 0, raf = 0, drag = null, holdT = 0, css = null, lastTap = { t: 0, id: null };
  const setSel = (ids) => { V.sels = new Set(ids); on.sel && on.sel([...V.sels]); };
  const colors = () => css || (css = (() => { const s = getComputedStyle(host); const v = (k) => s.getPropertyValue(k).trim(); return { ink: v('--ink'), l2: v('--l2'), sep: v('--sep'), fill: v('--fill'), fill2: v('--fill2') || v('--fill'), cell: v('--cell'), tint: v('--tint'), bg: v('--bg'), red: v('--red') || '#D2463F' }; })());
  const P = () => get().p;
  const bars = () => Math.max(MIN_BARS, songBars(P()) + 2);
  // сетка по масштабу: мелко — такт, крупнее — доля, ¼, 1/16; совсем крупно — без сетки (до 1/960 доли — миллисекунды)
  const snap = () => (V.pxb < 22 ? P().num : V.pxb < 70 ? 1 : V.pxb < 200 ? 0.25 : V.pxb < 700 ? 1 / 16 : 0);
  const xOf = (b) => HEAD + b * V.pxb - V.x, bOf = (x) => (x - HEAD + V.x) / V.pxb;
  const yOf = (i) => RULER + i * ROW - V.y, rowOf = (y) => Math.floor((y - RULER + V.y) / ROW);
  const clampView = () => {
    const p = P();
    V.x = Math.max(0, Math.min(Math.max(0, bars() * p.num * V.pxb - (W - HEAD)), V.x));
    V.y = Math.max(0, Math.min(Math.max(0, (p.tracks.length + 1) * ROW + RULER - H), V.y));
  };

  function size() {
    const r = host.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    cv.width = W * V.dpr; cv.height = H * V.dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    if (!V.pxb) V.pxb = Math.max(10, Math.min(48, (W - HEAD) / (8 * P().num))); // 8 тактов в кадре
    draw();
  }
  function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // Значок дорожки по роду — простыми штрихами
  function icon(kind, x, y, s, col) {
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.2; g.lineCap = 'round';
    if (kind === 'drums') { [0.3, 0.6, 1].forEach((h, i) => { rr(x + i * s * 0.36, y + s * (1 - h), s * 0.26, s * h, 2); g.fill(); }); }
    else if (kind === 'notes') { for (let i = 0; i < 4; i++) { rr(x + i * s * 0.26, y, s * 0.22, s, 2); g.fill(); } g.fillStyle = colors().cell; [0.2, 0.46, 0.72].forEach((k) => { g.fillRect(x + k * s + s * 0.02, y, s * 0.12, s * 0.55); }); }
    else if (kind === 'chords') { g.font = '700 ' + Math.round(s * 0.95) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('C', x + s / 2, y + s / 2 + 1); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; }
    else { g.beginPath(); for (let i = 0; i < 5; i++) { const h = [0.35, 0.7, 1, 0.6, 0.3][i] * s; g.moveTo(x + i * s * 0.22 + 1, y + (s - h) / 2); g.lineTo(x + i * s * 0.22 + 1, y + (s + h) / 2); } g.stroke(); }
  }

  function draw() {
    const { p, names, fileName, peaks } = get(), C = colors(), n = p.num, tot = bars() * n, solo = p.tracks.some((t) => t.solo);
    g.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    clampView();
    // ряды дорожек
    p.tracks.forEach((tr, i) => {
      const y = yOf(i);
      if (y + ROW < RULER || y > H) return;
      g.fillStyle = i % 2 ? C.fill : C.cell; g.fillRect(HEAD, y, W - HEAD, ROW);
    });
    const yAdd = yOf(p.tracks.length);
    g.fillStyle = C.bg; g.fillRect(HEAD, yAdd, W - HEAD, H - yAdd);
    // сетка: доли тонко, такты толще
    g.save(); g.beginPath(); g.rect(HEAD, RULER, W - HEAD, H - RULER); g.clip();
    for (let b = 0; b <= tot; b++) {
      const x = xOf(b);
      if (x < HEAD - 1 || x > W) continue;
      const bar = b % n === 0;
      if (!bar && V.pxb < 12) continue;
      g.strokeStyle = bar ? C.l2 : C.sep; g.lineWidth = bar ? 1.2 : 0.6; g.globalAlpha = bar ? 0.7 : 0.9;
      g.beginPath(); g.moveTo(x, RULER); g.lineTo(x, Math.min(H, yAdd)); g.stroke();
    }
    g.globalAlpha = 1;
    // петля: отрезок по кругу — лёгкая подсветка по дорожкам
    const R = p.region;
    if (R) { const x0 = xOf(R.a), x1 = xOf(R.b); g.fillStyle = C.tint; g.globalAlpha = 0.08; g.fillRect(Math.max(HEAD, x0), RULER, Math.min(W, x1) - Math.max(HEAD, x0), Math.min(H, yAdd) - RULER); g.globalAlpha = 1; }
    // маркеры — пунктир через дорожки
    (p.marks || []).forEach((m) => { const x = xOf(m.t); if (x < HEAD || x > W) return; g.strokeStyle = C.ink; g.globalAlpha = 0.35; g.setLineDash([3, 5]); g.lineWidth = 1; g.beginPath(); g.moveTo(x, RULER); g.lineTo(x, Math.min(H, yAdd)); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; });
    // клипы
    p.clips.forEach((c) => {
      const i = p.tracks.findIndex((t) => t.id === c.tr), tr = p.tracks[i];
      if (!tr) return;
      const x = xOf(c.at), y = yOf(i) + GAP, w = c.len * V.pxb, h = ROW - GAP * 2, dim = tr.mute || (solo && !tr.solo) || c.mute;
      if (x + w < HEAD || x > W || y + h < RULER || y > H) return;
      const ghost = drag && drag.c === c && drag.moved;
      g.globalAlpha = dim ? 0.35 : ghost ? 0.75 : 1;
      g.fillStyle = tr.color; rr(x, y, Math.max(4, w), h, 7); g.fill();
      if (V.sels.has(c.id)) { g.lineWidth = 3; g.strokeStyle = C.ink; g.stroke(); g.lineWidth = 1.2; g.strokeStyle = '#fff'; rr(x + 2.5, y + 2.5, Math.max(2, w - 5), h - 5, 5); g.stroke(); }
      g.save(); rr(x + 1, y + 1, Math.max(2, w - 2), h - 2, 6); g.clip();
      // проходы куска: по кругу — тонкие линии на границах повторов; сплошной — без линий
      const pp = tr.kind === 'audio' ? null : piecePasses(p, c);
      if (pp && c.loop) { g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; pp.offs.forEach((o) => { if (o <= 1e-6 || o >= c.len - 1e-6) return; const xx = xOf(c.at + o); g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); }); }
      preview(c, tr, x, y, w, h, pp, fileName, peaks);
      if (c.loop && tr.kind !== 'drums' && w > 30) { g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '700 11px system-ui'; g.fillText('⟳', x + w - 14, y + h - 6); }
      if (c.mute) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; for (let xx = x - h; xx < x + w; xx += 10) { g.beginPath(); g.moveTo(xx, y + h); g.lineTo(xx + h, y); g.stroke(); } }
      // подпись
      g.fillStyle = '#fff'; g.font = '600 12px system-ui'; g.textBaseline = 'top';
      // подпись держится у левого края видимой части клипа (клип уехал влево — название видно) и режется по ширине
      const lx = Math.max(x, HEAD) + 7, room = x + w - lx - (c.loop && tr.kind !== 'drums' ? 18 : 6);
      if (room > 14) g.fillText(fit(label(c, tr, names, fileName), room), lx, y + 5);
      g.textBaseline = 'alphabetic';
      g.restore();
      g.globalAlpha = 1;
    });
    g.restore();
    // автоматизация дорожки: ряд затемнён, огибающая линией с точками
    const A = get().auto, atr = A && p.tracks.find((t) => t.id === A.tr);
    if (atr) {
      const i = p.tracks.indexOf(atr), y = yOf(i), pts = (atr.auto && atr.auto[A.kind]) || [], def = A.kind === 'pan' ? (atr.pan || 0) : 1;
      const yv = (v) => y + GAP + (A.kind === 'pan' ? (1 - v) / 2 : 1 - v) * (ROW - GAP * 2);
      g.save(); g.beginPath(); g.rect(HEAD, RULER, W - HEAD, H - RULER); g.clip();
      g.fillStyle = C.bg; g.globalAlpha = 0.55; g.fillRect(HEAD, y, W - HEAD, ROW); g.globalAlpha = 1;
      g.strokeStyle = C.tint; g.lineWidth = 2; g.beginPath();
      const b0 = bOf(HEAD), b1 = bOf(W);
      g.moveTo(HEAD, yv(autoAt(pts, b0, def)));
      pts.forEach((q) => g.lineTo(xOf(q.t), yv(q.v)));
      g.lineTo(W, yv(autoAt(pts, b1, def))); g.stroke();
      pts.forEach((q) => { const xx = xOf(q.t); if (xx < HEAD - 8 || xx > W + 8) return; g.fillStyle = C.bg; g.beginPath(); g.arc(xx, yv(q.v), 7, 0, Math.PI * 2); g.fill(); g.fillStyle = C.tint; g.beginPath(); g.arc(xx, yv(q.v), 5, 0, Math.PI * 2); g.fill(); });
      g.restore();
    }
    // «+» на пустом месте — касание создаёт партию; рамка выделения
    if (V.plus) {
      const i = p.tracks.findIndex((t) => t.id === V.plus.tr);
      if (i >= 0) {
        const x = xOf(V.plus.bar), y = yOf(i) + GAP, w = n * V.pxb, h = ROW - GAP * 2, tr = p.tracks[i];
        g.save(); g.beginPath(); g.rect(HEAD, RULER, W - HEAD, H - RULER); g.clip();
        g.globalAlpha = 0.18; g.fillStyle = tr.color; rr(x, y, w, h, 7); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = tr.color; g.lineWidth = 2; g.setLineDash([5, 4]); rr(x, y, w, h, 7); g.stroke(); g.setLineDash([]);
        const cx = x + Math.min(w, 120) / 2, cy = y + h / 2;
        g.fillStyle = tr.color; g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx - 7, cy); g.lineTo(cx + 7, cy); g.moveTo(cx, cy - 7); g.lineTo(cx, cy + 7); g.stroke();
        g.restore();
      }
    }
    if (V.band) {
      const { x0, y0, x1, y1 } = V.band;
      g.fillStyle = C.tint; g.globalAlpha = 0.12; g.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); g.globalAlpha = 1;
      g.strokeStyle = C.tint; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); g.setLineDash([]);
    }
    // ход и курсор
    const px = xOf(V.pos >= 0 ? V.pos : V.cursor);
    if (px >= HEAD && px <= W) { g.strokeStyle = V.pos >= 0 ? C.red : C.tint; g.lineWidth = 2; g.beginPath(); g.moveTo(px, RULER); g.lineTo(px, H); g.stroke(); }
    // линейка: номера тактов и деления долей
    g.fillStyle = C.cell; g.fillRect(0, 0, W, RULER);
    g.strokeStyle = C.sep; g.beginPath(); g.moveTo(0, RULER - 0.5); g.lineTo(W, RULER - 0.5); g.stroke();
    g.save(); g.beginPath(); g.rect(HEAD, 0, W - HEAD, RULER); g.clip();
    g.font = '600 11px system-ui'; g.fillStyle = C.l2; g.strokeStyle = C.l2;
    for (let b = 0; b <= tot; b++) {
      const x = xOf(b), bar = b % n === 0;
      if (x < HEAD - 20 || x > W) continue;
      g.lineWidth = 1; g.beginPath(); g.moveTo(x, RULER - (bar ? 12 : 5)); g.lineTo(x, RULER); g.stroke();
      if (bar && b < tot) g.fillText(String(b / n + 1), x + 4, 12);
    }
    // петля на линейке — полоса с краями; маркеры — флажки с названием
    if (R) { const x0 = Math.max(HEAD, xOf(R.a)), x1 = Math.min(W, xOf(R.b)); if (x1 > x0) { g.fillStyle = C.tint; g.globalAlpha = 0.25; g.fillRect(x0, 0, x1 - x0, RULER - 1); g.globalAlpha = 1; g.fillRect(x0, 0, 3, RULER - 1); g.fillRect(x1 - 3, 0, 3, RULER - 1); } }
    (p.marks || []).forEach((m) => { // флажок с названием на плашке (поверх номера такта)
      const x = xOf(m.t); if (x < HEAD || x > W) return;
      g.font = '600 10px system-ui'; const nm = m.name ? m.name.slice(0, 14) : '', tw = nm ? g.measureText(nm).width + 10 : 0;
      g.fillStyle = C.ink; rr(x, 2, 10 + tw, 14, 4); g.fill();
      g.fillStyle = C.bg; g.beginPath(); g.moveTo(x + 3, 5); g.lineTo(x + 9, 9); g.lineTo(x + 3, 13); g.closePath(); g.fill();
      if (nm) g.fillText(nm, x + 12, 13);
    });
    g.restore();
    if (px >= HEAD && px <= W) { g.fillStyle = V.pos >= 0 ? C.red : C.tint; g.beginPath(); g.moveTo(px - 6, RULER - 10); g.lineTo(px + 6, RULER - 10); g.lineTo(px, RULER - 2); g.closePath(); g.fill(); }
    // колонка дорожек
    g.fillStyle = C.bg; g.fillRect(0, RULER, HEAD, H - RULER);
    p.tracks.forEach((tr, i) => {
      const y = yOf(i);
      if (y + ROW < RULER || y > H) return;
      const dim = tr.mute || (solo && !tr.solo);
      g.globalAlpha = dim ? 0.4 : 1;
      g.fillStyle = tr.color; rr(6, y + GAP, HEAD - 12, ROW - GAP * 2, 10); g.fill();
      icon(tr.kind, 6 + (HEAD - 12) / 2 - 11, y + ROW / 2 - 11, 22, 'rgba(255,255,255,.95)');
      if (atr === tr) { g.fillStyle = C.tint; g.beginPath(); g.arc(HEAD - 12, y + GAP + 6, 6, 0, Math.PI * 2); g.fill(); }
      if (tr.solo) { g.fillStyle = '#fff'; g.font = '700 9px system-ui'; g.fillText('S', 11, y + ROW - 9); }
      g.globalAlpha = 1;
    });
    // «+» — новая дорожка
    g.strokeStyle = C.l2; g.lineWidth = 2; const cx = HEAD / 2, cy = yAdd + ROW / 2;
    if (cy < H + 20) { rr(6, yAdd + GAP, HEAD - 12, ROW - GAP * 2, 10); g.setLineDash([4, 4]); g.stroke(); g.setLineDash([]); g.beginPath(); g.moveTo(cx - 8, cy); g.lineTo(cx + 8, cy); g.moveTo(cx, cy - 8); g.lineTo(cx, cy + 8); g.stroke(); }
    g.fillStyle = C.bg; g.fillRect(0, 0, HEAD, RULER);
  }
  function label(c, tr, names, fileName) {
    if (tr.kind === 'chords' && c.data.chords.length) return c.data.chords.map((ch) => chordName(ch.pc, ch.type, P().key.minor)).join(' ');
    if (tr.kind === 'audio') return String(fileName(c.data.fileId) || '');
    return names(tr);
  }
  // Строка по ширине (px) текущим шрифтом: не влезла — обрезка с «…»
  function fit(s, room) {
    if (g.measureText(s).width <= room) return s;
    let a = 0, b = s.length;
    while (a < b) { const m = (a + b + 1) >> 1; if (g.measureText(s.slice(0, m) + '…').width <= room) a = m; else b = m - 1; }
    return a ? s.slice(0, a).trimEnd() + '…' : '';
  }
  // Рисунок содержимого внутри клипа: проходы куска (pp: по кругу или один, со скоростью); запись — один раз (по кругу — повтор)
  function preview(c, tr, x, y, w, h, pp, fileName, peaks) {
    const top = y + 20, ph = h - 24;
    if (ph < 8) return;
    g.fillStyle = 'rgba(255,255,255,.85)';
    const each = (list, fn) => pp.offs.forEach((o) => list.forEach((ev) => { const t = o + ev.t * pp.k, d = (ev.d || 0.25) * pp.k; if (t + d <= 0 || t >= c.len) return; fn(ev, Math.max(0, t), Math.min(c.len, t + d) - Math.max(0, t)); }));
    if (tr.kind === 'drums') {
      const lanes = DRUMS.length, lh = ph / lanes, evs = [];
      DRUMS.forEach((lane, li) => (c.data.steps[lane] || []).forEach((i) => evs.push({ t: i * 0.25, d: 0.25, li })));
      each(evs, (ev, t) => { g.fillRect(xOf(c.at + t), top + ev.li * lh + 1, Math.max(2, Math.min(V.pxb * 0.25 * pp.k - 1, 6)), Math.max(2, lh - 2)); });
    } else if (tr.kind === 'notes') {
      const ns = c.data.notes; if (!ns.length) return;
      const lo = Math.min(...ns.map((n) => n.m)), hi = Math.max(...ns.map((n) => n.m)), span = Math.max(12, hi - lo + 1);
      each(ns, (nt, t, d) => { g.fillRect(xOf(c.at + t), top + (1 - (nt.m - lo + 0.5) / span) * ph, Math.max(2, d * V.pxb - 1), Math.max(2, ph / span)); });
    } else if (tr.kind === 'chords') {
      each(c.data.chords, (ch, t, d) => { g.globalAlpha *= 0.35; g.fillRect(xOf(c.at + t) + 1, top, Math.max(2, d * V.pxb - 2), ph); g.globalAlpha /= 0.35; });
    } else {
      const pk = peaks(c.data.fileId), mid = top + ph / 2;
      if (!pk) { g.fillRect(x + 4, mid - 1, Math.max(2, w - 8), 2); return; }
      const spb = 60 / P().bpm, n = pk.length, dur = Math.max(0.01, pk.dur || 1), off = c.data.off || 0, x0 = Math.max(HEAD, x), x1 = Math.min(W, x + w);
      for (let xx = x0; xx < x1; xx += 2) {
        let sec = off + (bOf(xx) - c.at) * spb;
        if (c.loop) sec = off + ((sec - off) % Math.max(0.01, dur - off));
        else if (sec >= dur) break; // дальше записи — пусто
        const v = pk[Math.max(0, Math.min(n - 1, Math.floor((sec / dur) * n)))] || 0;
        g.fillRect(xx, mid - v * ph / 2, 1.5, Math.max(1, v * ph));
      }
    }
  }

  /* ---------- жесты ---------- */
  const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const hit = (q) => {
    const p = P(), i = rowOf(q.y), tr = p.tracks[i];
    if (!tr || q.x < HEAD) return null;
    const b = bOf(q.x), c = clipsOf(p, tr).find((x) => b >= x.at && b < x.at + x.len);
    if (!c) return { tr, i, b };
    const x0 = xOf(c.at), x1 = xOf(c.at + c.len), wide = x1 - x0 > EDGE * 3;
    return { tr, i, b, c, edge: wide && x1 - q.x < EDGE ? 'r' : wide && q.x - x0 < EDGE ? 'l' : null };
  };
  cv.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) { clearTimeout(holdT); drag = null; return; }
    const q = pt(e);
    try { cv.setPointerCapture(e.pointerId); } catch { /* */ }
    clearTimeout(holdT);
    if (q.y < RULER) { // линейка: касание — играть отсюда; вести — петля; край петли — изменить; удержать — меню
      if (q.x < HEAD) return;
      const p = P(), R = p.region, b = bOf(q.x), edge = R && Math.abs(xOf(R.a) - q.x) < EDGE ? 'a' : R && Math.abs(xOf(R.b) - q.x) < EDGE ? 'b' : null;
      drag = { id: e.pointerId, x0: q.x, y0: q.y, ruler: true, b0: edge ? (edge === 'a' ? R.b : R.a) : b, edge, moved: false };
      holdT = setTimeout(() => { if (drag && !drag.moved) { buzz(); drag = null; on.ruler(Math.max(0, Math.round(b / snap()) * snap()), e.clientX, e.clientY); } }, HOLD_MS);
      return;
    }
    if (q.x < HEAD) { // колонка дорожек: дорожка или «+»; в автоматизации — её значок выходит
      const i = rowOf(q.y), tr = P().tracks[i], A = get().auto;
      if (tr && A && A.tr === tr.id) on.autoExit(); else if (tr) on.track(tr, e.clientX, e.clientY); else if (i === P().tracks.length) on.addTrack(e.clientX, e.clientY);
      return;
    }
    const A = get().auto, atr = A && P().tracks.find((t) => t.id === A.tr);
    if (atr && P().tracks[rowOf(q.y)] === atr) { // огибающая: точка под пальцем — вести или удержать; пусто — новая точка
      const y = yOf(P().tracks.indexOf(atr)), vOf = (yy) => { const f = Math.max(0, Math.min(1, (yy - y - GAP) / (ROW - GAP * 2))); return A.kind === 'pan' ? 1 - f * 2 : 1 - f; };
      const b = bOf(q.x), tol = 8 / V.pxb, pt0 = autoPointAt(atr, A.kind, b, tol);
      drag = { id: e.pointerId, x0: q.x, y0: q.y, auto: true, q: pt0 || setAutoPoint(atr, A.kind, b, vOf(q.y), snap()), vOf, moved: false };
      if (!pt0) on.autoChange();
      if (pt0) holdT = setTimeout(() => { if (drag && !drag.moved) { buzz(); removeAutoPoint(atr, A.kind, pt0); drag = null; on.autoChange(); draw(); } }, HOLD_MS);
      draw();
      return;
    }
    const h = hit(q);
    drag = { id: e.pointerId, x0: q.x, y0: q.y, vx: V.x, vy: V.y, moved: false, h, cx: e.clientX, cy: e.clientY };
    if (h && h.c) {
      drag.c = h.c;
      // вести выделенный клип — едут все выделенные (каждый со своей дорожкой и местом)
      const group = V.sels.has(h.c.id) && V.sels.size > 1 ? P().clips.filter((x) => V.sels.has(x.id)) : [h.c];
      drag.group = group.map((x) => ({ c: x, at0: x.at, tr0: x.tr, row0: P().tracks.findIndex((t) => t.id === x.tr) }));
      drag.at0 = h.c.at; drag.len0 = h.c.len;
      holdT = setTimeout(() => { if (drag && !drag.moved && drag.c) { buzz(); const c = drag.c; drag = null; on.open(c); draw(); } }, HOLD_MS);
    } else if (h) {
      // удержать пустое — рамка выделения (вести) или меню (без движения)
      holdT = setTimeout(() => { if (drag && !drag.moved) { buzz(); drag.band = true; V.band = { x0: q.x, y0: q.y, x1: q.x, y1: q.y }; V.plus = null; draw(); } }, HOLD_MS);
    }
    draw();
  });
  // Клипы внутри рамки (экранные точки) → id
  const inBand = (B) => {
    const p = P(), xa = Math.min(B.x0, B.x1), xb = Math.max(B.x0, B.x1), ya = Math.min(B.y0, B.y1), yb = Math.max(B.y0, B.y1);
    return p.clips.filter((c) => { const i = p.tracks.findIndex((t) => t.id === c.tr), x0 = xOf(c.at), x1 = xOf(c.at + c.len), y0 = yOf(i), y1 = y0 + ROW; return i >= 0 && x1 > xa && x0 < xb && y1 > ya && y0 < yb; }).map((c) => c.id);
  };
  cv.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const q = pt(e), dx = q.x - drag.x0, dy = q.y - drag.y0, p = P();
    if (drag.band) { // рамка: тянется за пальцем, выделение — сразу видно
      if (Math.hypot(dx, dy) > 6) drag.moved = true;
      V.band.x1 = q.x; V.band.y1 = q.y; V.sels = new Set(inBand(V.band)); draw(); return;
    }
    if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; clearTimeout(holdT); }
    if (!drag.moved) return;
    if (drag.ruler) { setRegion(p, drag.b0, bOf(q.x), snap()); draw(); return; }
    if (drag.auto) { // точка: новое место по сетке и значение; занятая доля — обходится
      const A = get().auto, atr = p.tracks.find((t) => t.id === A.tr), qq = drag.q;
      if (!atr || !qq) return;
      const g0 = snap() || 1 / TQ, T = Math.max(0, Math.round(bOf(q.x) / g0) * g0), busy = (atr.auto[A.kind] || []).some((z) => z !== qq && Math.abs(z.t - T) < 1e-6);
      if (!busy) qq.t = T;
      qq.v = Math.round(drag.vOf(q.y) * 100) / 100;
      atr.auto[A.kind].sort((a, b2) => a.t - b2.t);
      draw(); return;
    }
    const c = drag.c;
    if (!c) { V.x = drag.vx - dx; V.y = drag.vy - dy; V.plus = null; draw(); return; }
    const grid = snap(), h = drag.h;
    if (h.edge === 'r') resizeClip(p, c, drag.len0 + dx / V.pxb, grid);
    else if (h.edge === 'l') { c.at = drag.at0; c.len = drag.len0; trimClipStart(p, c, drag.at0 + dx / V.pxb, grid); }
    else {
      // перенос: сдвиг по сетке от начала ведомого клипа, остальные — на тот же сдвиг; ряд — на ту же разницу (род тот же)
      const lead = drag.group.find((x) => x.c === c), dRow = Math.max(0, Math.min(p.tracks.length - 1, rowOf(q.y))) - lead.row0;
      const at = grid > 0 ? Math.max(0, Math.round((drag.at0 + dx / V.pxb) / grid) * grid) : Math.max(0, drag.at0 + dx / V.pxb);
      const shift = Math.max(-Math.min(...drag.group.map((x) => x.at0)), at - drag.at0);
      drag.group.forEach((x) => { const to = p.tracks[x.row0 + dRow], kind = trackOf(p, x.c).kind; moveClip(p, x.c, x.at0 + shift, to && to.kind === kind ? to.id : x.tr0, 0); });
    }
    draw();
  });
  const up = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    clearTimeout(holdT);
    const d = drag; drag = null;
    if (d.band) { // рамка: выделить; без движения — меню пустого места (вставить, новая партия)
      V.band = null;
      if (d.moved) setSel(inBand({ x0: d.x0, y0: d.y0, x1: pt(e).x, y1: pt(e).y }));
      else if (d.h) { setSel([]); on.empty(d.h.tr, Math.floor(d.h.b / P().num) * P().num, d.cx, d.cy); }
      draw(); return;
    }
    if (d.auto) { on.autoChange(); }
    else if (d.ruler) {
      if (d.moved) on.region();
      else { V.cursor = Math.max(0, Math.floor(bOf(d.x0) / P().num) * P().num); on.seek(V.cursor); }
    } else if (d.c) {
      if (d.moved) { p0fix(); on.change(); }
      else {
        const now = performance.now();
        if (lastTap.id === d.c.id && now - lastTap.t < 350) { lastTap = { t: 0, id: null }; on.split(d.c, bOf(d.x0), snap()); } // двойное касание — разрезать здесь
        else {
          lastTap = { t: now, id: d.c.id };
          // выделено несколько — касание добавляет или убирает; иначе — только этот (повторное касание — снять)
          if (V.sels.size > 1) { const s2 = new Set(V.sels); if (s2.has(d.c.id)) s2.delete(d.c.id); else s2.add(d.c.id); setSel([...s2]); }
          else setSel(V.sels.has(d.c.id) ? [] : [d.c.id]);
          V.plus = null;
        }
      }
    } else if (d.h && !d.moved) { // пустое место: «+» в этом такте; касание «+» — новая партия
      const bar = Math.floor(d.h.b / P().num) * P().num;
      if (V.plus && V.plus.tr === d.h.tr.id && V.plus.bar === bar) { V.plus = null; on.create(d.h.tr, bar); }
      else { V.plus = { tr: d.h.tr.id, bar }; if (V.sels.size) setSel([]); }
    } else if (!d.h && !d.moved && V.sels.size) setSel([]);
    draw();
  };
  const p0fix = () => { P().clips.sort((a, b) => a.at - b.at); };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  // масштаб — вокруг середины кадра; на самом крупном шаг сетки — без сетки (миллисекунды)
  const zoomTo = (v, mid = bOf(HEAD + (W - HEAD) / 2)) => { V.pxb = Math.max(ZMIN, Math.min(ZMAX, v)); V.x = mid * V.pxb - (W - HEAD) / 2; draw(); };
  const offPinch = pinch(cv, { min: ZMIN, max: ZMAX, get: () => V.pxb, set: (v) => zoomTo(v) });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); if (e.ctrlKey) zoomTo(V.pxb * Math.exp(-e.deltaY / 300)); else { V.x += e.deltaX; V.y += e.deltaY; draw(); } }, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  const ro = new ResizeObserver(size);
  ro.observe(host);
  size();

  return {
    draw,
    // ход проигрывания (доля) — линия; -1 — нет
    pos(b) { V.pos = b; cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); },
    // показать нужную долю (начало проигрывания — в кадре)
    follow(b) { const x = b * V.pxb; if (x < V.x || x > V.x + W - HEAD - 20) { V.x = Math.max(0, x - 40); draw(); } },
    get cursor() { return V.cursor; },
    set cursor(b) { V.cursor = Math.max(0, b); draw(); },
    select(id) { V.sels = new Set(id ? [id] : []); draw(); },
    // выделенные клипы (id); задать — без обратного вызова
    get selection() { return [...V.sels].filter((id) => P().clips.some((c) => c.id === id)); },
    set selection(ids) { V.sels = new Set(ids || []); draw(); },
    clearPlus() { V.plus = null; draw(); },
    get zoom() { return V.pxb; },
    zoomBy(f) { zoomTo(V.pxb * f); },
    destroy() { ro.disconnect(); offPinch(); clearTimeout(holdT); cancelAnimationFrame(raf); cv.remove(); },
  };
}
