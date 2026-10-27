// Главный экран: живые обои — фоновый слой на canvas, который сам показывает время.
// Если часы скрыты («Без часов»), обои рисуются в полную силу и встают на место часов;
// иначе лежат бледно за всем экраном.
import { LAND_MASK, LAND_W, LAND_H } from './landmask.js';
import { greekNumeral } from './numerals.js';

// Название — строка wall.<id>, пояснение — wall.<id>.hint
export const WALLPAPERS = [
  { id: 'none', el: '—' },
  { id: 'hands', el: 'γνώμων' },
  { id: 'planet', el: 'γῆ' },
  { id: 'sun', el: 'ἥλιος' },
];

// высота места под обои, когда они заменяют часы
export const SLOT_HEIGHT = { hands: 230, planet: 300, sun: 210 };

const TAU = Math.PI * 2;

// — Земля из точек —
const LAND = (() => {
  const bytes = Uint8Array.from(atob(LAND_MASK), (c) => c.charCodeAt(0));
  const isLand = (lat, lon) => {
    const x = Math.floor(((lon + 180) / 360) * LAND_W) % LAND_W;
    const y = Math.min(LAND_H - 1, Math.floor(((90 - lat) / 180) * LAND_H));
    const i = y * LAND_W + x;
    return (bytes[i >> 3] >> (7 - (i & 7))) & 1;
  };
  const pts = [];
  for (let lat = -78; lat <= 84; lat += 3) {
    const r = Math.cos((lat * Math.PI) / 180);
    const step = 3 / Math.max(r, 0.15);
    for (let lon = -180; lon < 180; lon += step) {
      if (!isLand(lat, lon)) continue;
      const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
      pts.push([Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]);
    }
  }
  return pts;
})();

const TILT = (23.4 * Math.PI) / 180;

function drawPlanet(ctx, o) {
  const { cx, cy, now, col, full, w } = o;
  const R = Math.min(full ? 92 : 120, w * 0.26);
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const m = now.getMinutes() + now.getSeconds() / 60;
  const sec = now.getSeconds() + now.getMilliseconds() / 1000;

  // солнце на 24-часовом кольце: полночь внизу, полдень наверху, по часовой
  const phi = Math.PI / 2 + (h / 24) * TAU;
  const ring = R * 1.3;
  const sun = [cx + Math.cos(phi) * ring, cy + Math.sin(phi) * ring];
  const light = norm([Math.cos(phi), -Math.sin(phi), 0.35]);

  // сфера
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  const g = ctx.createRadialGradient(sun[0], sun[1], R * 0.2, cx, cy, R * 1.6);
  g.addColorStop(0, rgba(col.fg, 0.06));
  g.addColorStop(1, rgba(col.fg, 0.015));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(col.fg, 0.35);
  ctx.lineWidth = 1;
  ctx.stroke();

  // вращение: один оборот за минуту
  const spin = (sec / 60) * TAU;
  const cs = Math.cos(spin), sn = Math.sin(spin), ct = Math.cos(TILT), st = Math.sin(TILT);
  const dot = Math.max(1.1, R / 70);
  ctx.fillStyle = rgb(col.fg);
  for (const [x0, y0, z0] of LAND) {
    const x1 = x0 * cs + z0 * sn, z1 = -x0 * sn + z0 * cs;
    const y2 = y0 * ct - z1 * st, z2 = y0 * st + z1 * ct;
    if (z2 <= 0.02) continue;
    const lit = Math.max(0, x1 * light[0] + y2 * light[1] + z2 * light[2]);
    ctx.globalAlpha = (0.12 + 0.88 * Math.min(1, lit * 1.4)) * (0.35 + 0.65 * z2);
    const d = dot * (1.2 + z2); // квадратная «смальта» — дешевле кругов
    ctx.fillRect(cx + x1 * R - d / 2, cy - y2 * R - d / 2, d, d);
  }
  ctx.globalAlpha = 1;

  // ночная сторона — мягкая тень
  const sh = ctx.createLinearGradient(cx + light[0] * R, cy - light[1] * R, cx - light[0] * R, cy + light[1] * R);
  sh.addColorStop(0.45, rgba(col.bg, 0));
  sh.addColorStop(1, rgba(col.bg, 0.55));
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fillStyle = sh;
  ctx.fill();

  // кольцо часов
  ctx.strokeStyle = rgba(col.fg, 0.4);
  for (let i = 0; i < 24; i++) {
    const a = Math.PI / 2 + (i / 24) * TAU;
    const l = i % 6 === 0 ? 7 : 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (ring - l), cy + Math.sin(a) * (ring - l));
    ctx.lineTo(cx + Math.cos(a) * ring, cy + Math.sin(a) * ring);
    ctx.stroke();
  }
  ctx.fillStyle = rgba(col.fg, 0.55);
  ctx.font = `10px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [[0, '0'], [6, '6'], [12, '12'], [18, '18']].forEach(([hh, t]) => {
    const a = Math.PI / 2 + (hh / 24) * TAU;
    ctx.fillText(t, cx + Math.cos(a) * (ring - 19), cy + Math.sin(a) * (ring - 19));
  });

  // солнце
  glow(ctx, sun[0], sun[1], 22, col.accent, 0.45);
  ctx.beginPath();
  ctx.arc(sun[0], sun[1], 5.5, 0, TAU);
  ctx.fillStyle = rgb(col.accent);
  ctx.fill();

  // луна — минуты: наверху 0, по часовой
  const orbitR = R * 1.62;
  ctx.setLineDash([2, 5]);
  ctx.strokeStyle = rgba(col.fg, 0.3);
  ctx.beginPath();
  ctx.arc(cx, cy, orbitR, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  const psi = -Math.PI / 2 + (m / 60) * TAU;
  const mx = cx + Math.cos(psi) * orbitR, my = cy + Math.sin(psi) * orbitR;
  ctx.beginPath();
  ctx.arc(mx, my, 8, 0, TAU);
  ctx.fillStyle = rgb(col.bg);
  ctx.fill();
  ctx.strokeStyle = rgb(col.fg);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = rgb(col.fg);
  ctx.font = `9px ui-monospace, monospace`;
  ctx.fillText(String(now.getMinutes()).padStart(2, '0'), mx, my + 0.5);
  ctx.restore();
}

// — Стрелки: весь экран как циферблат —
function drawHands(ctx, o) {
  const { cx, cy, w, h, now, col, full } = o;
  const sec = now.getSeconds() + now.getMilliseconds() / 1000;
  const m = now.getMinutes() + sec / 60;
  const hr = (now.getHours() % 12) + m / 60;

  // деления по краю экрана: луч из центра до границы
  const edge = (a) => {
    const dx = Math.sin(a), dy = -Math.cos(a);
    const tx = dx > 0 ? (w - cx) / dx : dx < 0 ? -cx / dx : Infinity;
    const ty = dy > 0 ? (h - cy) / dy : dy < 0 ? -cy / dy : Infinity;
    return [dx, dy, Math.min(tx, ty)];
  };
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const [dx, dy, t] = edge((i / 60) * TAU);
    const big = i % 5 === 0;
    const len = big ? 16 : 7;
    const inset = 10;
    ctx.strokeStyle = rgba(col.fg, big ? 0.5 : 0.22);
    ctx.lineWidth = big ? 1.4 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + dx * (t - inset - len), cy + dy * (t - inset - len));
    ctx.lineTo(cx + dx * (t - inset), cy + dy * (t - inset));
    ctx.stroke();
    if (big && full) {
      ctx.fillStyle = rgba(col.fg, 0.45);
      ctx.font = `15px 'Launcher Serif', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.church ? greekNumeral(i / 5 || 12, false) : String(i / 5 || 12), cx + dx * (t - 42), cy + dy * (t - 42));
    }
  }

  const hand = (a, len, width, color, tail = 0) => {
    const dx = Math.sin(a), dy = -Math.cos(a);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(cx - dx * tail, cy - dy * tail);
    ctx.lineTo(cx + dx * len, cy + dy * len);
    ctx.stroke();
  };
  const ha = (hr / 12) * TAU, ma = (m / 60) * TAU, sa = (sec / 60) * TAU;
  const k = full ? 1 : 0.6;
  hand(ha, edge(ha)[2] * 0.42, 6 * k, rgba(col.fg, full ? 0.92 : 0.5));
  hand(ma, edge(ma)[2] * 0.8, 2.6 * k, rgba(col.fg, full ? 0.92 : 0.5));
  hand(sa, edge(sa)[2] - 10, 1, rgba(col.accent, 0.9), 40);
  ctx.beginPath();
  ctx.arc(cx, cy, 5 * k + 1, 0, TAU);
  ctx.fillStyle = rgb(col.fg);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, TAU);
  ctx.fillStyle = rgb(col.accent);
  ctx.fill();
  ctx.restore();
}

// — Солнце: дуга дня, ночью луна в настоящей фазе —
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;
  return [r(1), r(2), r(3)];
});

function moonPhase(date) {
  const ref = Date.UTC(2000, 0, 6, 18, 14); // новолуние
  const syn = 29.530588853;
  return ((((date - ref) / 86400000) % syn) + syn) % syn / syn;
}

function drawSun(ctx, o) {
  const { cx, cy, w, now, col, full, slotH } = o;
  const R = Math.min(w * 0.4, 170);
  const hz = full ? cy + slotH / 2 - 26 : cy + R * 0.45; // линия горизонта
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const day = h >= 6 && h < 18;
  const t = day ? (h - 6) / 12 : (((h - 18) + 24) % 24) / 12;
  const a = Math.PI + Math.PI * t;
  const bx = cx + Math.cos(a) * R, by = hz + Math.sin(a) * R;
  ctx.save();

  if (!day) {
    const tw = performance.now() / 1000;
    STARS.forEach(([x, y, p]) => {
      const sy = y * (hz - 10);
      ctx.globalAlpha = (0.15 + 0.35 * (0.5 + 0.5 * Math.sin(tw * (0.6 + p) + p * 20))) * (full ? 1 : 0.6);
      ctx.fillStyle = rgb(col.fg);
      ctx.fillRect(x * w, sy, 1.4, 1.4);
    });
    ctx.globalAlpha = 1;
  } else {
    // тёплое свечение неба — сильнее на рассвете и закате
    const warm = 1 - Math.sin(Math.PI * t);
    glow(ctx, bx, by, R * 1.4, col.accent, 0.1 + 0.18 * warm);
  }

  // горизонт и дуга
  ctx.strokeStyle = rgba(col.fg, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - R - 40, hz);
  ctx.lineTo(cx + R + 40, hz);
  ctx.stroke();
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  ctx.arc(cx, hz, R, Math.PI, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  // часы на дуге
  ctx.font = `10px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 12; i++) {
    const aa = Math.PI + (Math.PI * i) / 12;
    const big = i % 3 === 0;
    ctx.strokeStyle = rgba(col.fg, big ? 0.5 : 0.25);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(aa) * (R - (big ? 8 : 4)), hz + Math.sin(aa) * (R - (big ? 8 : 4)));
    ctx.lineTo(cx + Math.cos(aa) * R, hz + Math.sin(aa) * R);
    ctx.stroke();
    if (big) {
      ctx.fillStyle = rgba(col.fg, 0.5);
      const label = ((day ? 6 : 18) + i) % 24;
      ctx.fillText(String(label), cx + Math.cos(aa) * (R - 20), hz + Math.sin(aa) * (R - 20));
    }
  }

  if (day) {
    glow(ctx, bx, by, 34, col.accent, 0.55);
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, TAU);
    ctx.fillStyle = rgb(col.accent);
    ctx.fill();
  } else {
    drawMoon(ctx, bx, by, 9, moonPhase(now), col);
  }

  if (full) {
    ctx.fillStyle = rgba(col.fg, 0.6);
    ctx.font = `11px ui-monospace, monospace`;
    ctx.fillText(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, cx, hz + 16);
  }
  ctx.restore();
}

function drawMoon(ctx, x, y, r, p, col) {
  glow(ctx, x, y, 26, col.fg, 0.18);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = rgb(col.bg);
  ctx.fill();
  ctx.strokeStyle = rgba(col.fg, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();
  const k = Math.cos(TAU * p); // 1 — новолуние, −1 — полнолуние
  ctx.beginPath();
  if (p < 0.5) {
    ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.ellipse(x, y, r * Math.abs(k), r, 0, Math.PI / 2, -Math.PI / 2, k > 0);
  } else {
    ctx.arc(x, y, r, Math.PI / 2, -Math.PI / 2, false);
    ctx.ellipse(x, y, r * Math.abs(k), r, 0, -Math.PI / 2, Math.PI / 2, k > 0);
  }
  ctx.fillStyle = rgb(col.fg);
  ctx.fill();
}

const DRAW = { planet: drawPlanet, hands: drawHands, sun: drawSun };
const FPS = { planet: 30, hands: 30, sun: 8 };

// — цвета из CSS-переменных —
function parseColor(str) {
  const s = str.trim();
  if (s.startsWith('#')) {
    const n = parseInt(s.slice(1).length === 3 ? [...s.slice(1)].map((c) => c + c).join('') : s.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/[\d.]+/g);
  return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };

function glow(ctx, x, y, r, c, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(c, a));
  g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  return { fg: parseColor(cs.getPropertyValue('--ink')), bg: parseColor(cs.getPropertyValue('--bg')), accent: parseColor(cs.getPropertyValue('--tint')) };
}

// — Слой обоев —
export function mountWallpaper(container, getState) {
  const canvas = document.createElement('canvas');
  canvas.className = 'l-wallpaper';
  canvas.setAttribute('aria-hidden', 'true');
  container.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let col = readColors();
  let colAt = 0;
  let theme = document.documentElement.dataset.theme;
  let last = 0;

  const frame = (t) => {
    requestAnimationFrame(frame);
    const { id, full, church } = getState();
    if (document.hidden || container.querySelector('.l-drawer.open')) return; // экран закрыт — не рисуем
    if (!DRAW[id]) {
      if (canvas.dataset.on) { ctx.clearRect(0, 0, canvas.width, canvas.height); delete canvas.dataset.on; }
      return;
    }
    if (t - last < 1000 / FPS[id]) return;
    last = t;
    const th = document.documentElement.dataset.theme;
    if (th !== theme || t - colAt > 1000) { col = readColors(); colAt = t; theme = th; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const slot = container.querySelector('.l-home .clock');
    const box = container.getBoundingClientRect();
    const r = slot ? slot.getBoundingClientRect() : { left: 0, top: 0, width: w, height: h * 0.4 };
    canvas.dataset.on = '1';
    ctx.globalAlpha = 1;
    canvas.style.opacity = full ? '1' : '0.35';
    DRAW[id](ctx, {
      w, h, full, church, col, now: new Date(),
      cx: r.left - box.left + r.width / 2,
      cy: r.top - box.top + r.height / 2,
      slotH: r.height,
    });
  };
  requestAnimationFrame(frame);
}

// статичное превью для настроек
export function drawPreview(canvas, id, church = false, now = new Date()) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!DRAW[id]) return;
  const scale = 0.5;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  DRAW[id](ctx, { w: w / scale, h: h / scale, cx: w / scale / 2, cy: h / scale / 2, full: true, church, col: readColors(), now, slotH: h / scale });
}
