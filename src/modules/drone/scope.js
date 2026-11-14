// Окно сигнала в настройках арпеджиатора и глайдера: нотная «дорожка» последних и ближайших секунд. Арпеджиатор — короткие
// полоски (длина — длина ноты, яркость — сила), глайдер — тянущаяся линия с точками. Читает только журнал движка
// (audio.arp.trace) — звук не трогает; рисует, пока шторка открыта.
const WIN = 6, HEAD = 0.7; // секунд в окне; где «сейчас» (доля ширины)

export function scopeHTML(ui, label, idle) {
  return '<canvas class="dscope" role="img" aria-label="' + ui.esc(label) + '" data-idle="' + ui.esc(idle) + '"></canvas>';
}

// el — шторка: холст берётся из неё каждый кадр (шторка перерисовывается целиком при смене вкладки)
export function scopeLoop(ctx, el) {
  const view = { lo: 48, hi: 72 };
  const frame = () => {
    if (!el.isConnected) return;
    const cv = el.querySelector('canvas.dscope');
    if (cv) { try { draw(cv, ctx.audio.arp, view); } catch { /* рисунок не важнее звука */ } }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function draw(cv, eng, view) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'), cs = getComputedStyle(cv);
  const tint = cs.getPropertyValue('--tint').trim() || '#0a84ff', l2 = cs.getPropertyValue('--l2').trim() || '#888', l3 = cs.getPropertyValue('--l3').trim() || '#aaa';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const now = eng.time(), x0 = w * HEAD, px = w / WIN, tx = (t) => x0 + (t - now) * px;
  const ev = eng.trace.filter((e) => e.t + e.d > now - x0 / px && e.t < now + (w - x0) / px);
  // высота: охватывает ноты окна, плавно
  if (ev.length) {
    let lo = 127, hi = 0; ev.forEach((e) => { lo = Math.min(lo, e.m); hi = Math.max(hi, e.m); });
    lo -= 2; hi += 2; if (hi - lo < 14) { const c = (hi + lo) / 2; lo = c - 7; hi = c + 7; }
    view.lo += (lo - view.lo) * 0.12; view.hi += (hi - view.hi) * 0.12;
  }
  const pad = 8, ty = (m) => pad + (1 - (m - view.lo) / (view.hi - view.lo)) * (h - 2 * pad);
  // октавные линии — опора для глаза
  g.strokeStyle = l3; g.globalAlpha = 0.25; g.lineWidth = 1;
  for (let m = Math.ceil(view.lo / 12) * 12; m <= view.hi; m += 12) { g.beginPath(); g.moveTo(0, ty(m)); g.lineTo(w, ty(m)); g.stroke(); }
  // глайдер: линия по нотам, ступенька перехода — плавная
  const gl = ev.filter((e) => e.k === 'g');
  if (gl.length) {
    g.globalAlpha = 0.85; g.strokeStyle = tint; g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    gl.forEach((e, i) => {
      const xa = tx(e.t), xb = tx(e.t + e.d), y = ty(e.m);
      if (i === 0) g.moveTo(xa, y); else { const p = gl[i - 1], py = ty(p.m), mid = xa + Math.min(18, (xb - xa) / 3); g.bezierCurveTo((tx(p.t + p.d) + mid) / 2, py, (xa + mid) / 2, y, mid, y); }
      g.lineTo(xb, y);
    });
    g.stroke();
  }
  // арпеджиатор: полоски; звучащая сейчас — ярче и толще
  ev.filter((e) => e.k === 'a').forEach((e) => {
    const on = e.t <= now && now < e.t + e.d, xa = tx(e.t), len = Math.max(4, e.d * px), hh = on ? 8 : 5;
    g.globalAlpha = on ? 1 : 0.3 + 0.55 * e.v; g.fillStyle = tint;
    g.beginPath(); g.roundRect ? g.roundRect(xa, ty(e.m) - hh / 2, len, hh, hh / 2) : g.rect(xa, ty(e.m) - hh / 2, len, hh); g.fill();
  });
  // «сейчас»
  g.globalAlpha = 0.6; g.strokeStyle = l2; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0, h); g.stroke();
  if (!eng.running) { g.globalAlpha = 1; g.fillStyle = l2; g.font = '600 13px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(cv.dataset.idle, w / 2, h / 2 + 4); }
  g.globalAlpha = 1;
}
