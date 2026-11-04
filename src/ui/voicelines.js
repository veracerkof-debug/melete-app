// Линии голосов — картинка звука (DECISIONS 2026-11-04): каждая звучащая нота — светящаяся линия, время течёт от
// инструмента прочь (вверх от клавиш пианино); при смене аккорда голоса плавно перетекают к ближайшим нотам нового
// аккорда — видно схождение и расхождение голосов, как следы на глайдере. Один движок для всех инструментов:
// пианино, глайдер, терменвокс, лупер, прогрессии дня.
// Холст не перехватывает касания (pointer-events: none — задаёт тот, кто вставляет). Рисует только пока есть что
// показывать: тишина — кадров нет. Без DOM-зависимостей, кроме холста.
//
// const vl = voiceLines(canvas, { xOf: (m) => px, dir: 'up' | 'left', span: 3, color: (m) => css });
// vl.on(id, m, vel) — нота началась; vl.off(id) — кончилась; vl.bend(id, m) — высота сменилась (скольжение);
// vl.layout() — размер холста изменился; vl.clear(); vl.destroy().

const LINK = 0.45;
const GLIDE = 0.22; // с, длина перехода голоса к новой ноте // с, сколько после конца голоса новая нота считается его продолжением (смена аккорда)
const now = () => performance.now() / 1000;

// Цвет по высоте ноты: 12 мягких оттенков по кругу квинт (соседние по квинте — близкие цвета, аккорд — гармоничная
// палитра), светлота — по теме
export function pcColor(m, dark) {
  const pc = ((Math.round(m) % 12) + 12) % 12, fifth = (pc * 7) % 12;
  return 'hsl(' + Math.round(fifth * 30 + 20) + ' ' + (dark ? 62 : 52) + '% ' + (dark ? 66 : 48) + '%)';
}

// Кривая перехода голоса: плавный S (как ведение голоса), t — 0…1
const ease = (t) => t * t * (3 - 2 * t);

export function voiceLines(cv, opt = {}) {
  const o = { span: 3, dir: 'up', xOf: (m) => m, color: null, width: 3, label: null, ...opt };
  const g = cv.getContext('2d');
  const live = new Map(); // id → голос
  let past = []; // закончившиеся голоса (пока видны)
  let raf = 0, W = 0, H = 0, dpr = 1, dark = false;

  function layout() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
    dark = matchMedia && document.documentElement.dataset.theme ? /dark|oled/.test(document.documentElement.dataset.theme) : !!(matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    kick();
  }
  const colorOf = (m) => (o.color ? o.color(m, dark) : pcColor(m, dark));

  function on(id, m, vel = 0.8) {
    const t = now();
    if (live.has(id)) off(id);
    const v = { id, pts: [[t, m]], end: 0, vel: Math.max(0.25, Math.min(1, vel || 0.8)), from: null, c: colorOf(m) };
    // продолжение голоса: недавно закончившийся голос без продолжения, ближайший по высоте
    let best = null, bd = 1e9;
    for (const p of past) { if (p.next || t - p.end > LINK) continue; const pm = p.pts[p.pts.length - 1][1], d = Math.abs(pm - m); if (d < bd && d <= 12) { bd = d; best = p; } }
    // переход виден всегда одинаково плавным (не короче GLIDE): прежний голос сворачивает к новой ноте заранее,
    // его хвост после поворота не рисуется
    if (best) { best.next = true; const t0 = Math.min(best.end, t - GLIDE); best.cut = Math.max(best.pts[0][0], t0); v.from = [best.cut, best.pts[best.pts.length - 1][1], best.c]; }
    live.set(id, v);
    kick();
  }
  function bend(id, m) {
    const v = live.get(id);
    if (!v) return;
    const t = now(), last = v.pts[v.pts.length - 1];
    if (Math.abs(last[1] - m) < 0.02 && t - last[0] < 0.05) return;
    v.pts.push([t, m]);
    if (v.pts.length > 4000) v.pts.splice(1, 1000);
    kick();
  }
  function off(id) {
    const v = live.get(id);
    if (!v) return;
    live.delete(id);
    v.end = now();
    v.pts.push([v.end, v.pts[v.pts.length - 1][1]]);
    past.push(v);
    kick();
  }
  function clear() { live.clear(); past = []; kick(); }

  // время → координата вдоль оси времени (0 — у инструмента), высота → поперёк
  function P(t, m, tn) {
    const k = (tn - t) / o.span;
    if (o.dir === 'left') return [W - k * W, o.xOf(m)];
    return [o.xOf(m), H - k * H];
  }
  function stroke(path, c, w, a) { g.globalAlpha = a; g.strokeStyle = c; g.lineWidth = w; g.stroke(path); }
  function draw() {
    raf = 0;
    const tn = now();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.lineCap = 'round'; g.lineJoin = 'round';
    past = past.filter((v) => tn - v.end < o.span + LINK);
    const all = past.concat([...live.values()]);
    for (const v of all) {
      const path = new Path2D(), pts = v.pts, endT = v.end || tn;
      // переход от прежнего голоса: S-кривая по времени
      if (v.from) {
        const [t0, m0] = v.from, t1 = pts[0][0], m1 = pts[0][1], N = 14;
        for (let i = 0; i <= N; i++) { const u = i / N, [x, y] = P(t0 + (t1 - t0) * u, m0 + (m1 - m0) * ease(u), tn); if (i) path.lineTo(x, y); else path.moveTo(x, y); }
      } else { const [x, y] = P(pts[0][0], pts[0][1], tn); path.moveTo(x, y); }
      for (let i = 0; i < pts.length; i++) {
        if (v.cut && pts[i][0] > v.cut) { const [x, y] = P(v.cut, pts[Math.max(0, i - 1)][1], tn); path.lineTo(x, y); break; }
        const [x, y] = P(pts[i][0], pts[i][1], tn); path.lineTo(x, y);
      }
      if (!v.end) { const [x, y] = P(endT, pts[pts.length - 1][1], tn); path.lineTo(x, y); }
      const w = o.width * (0.6 + 0.8 * v.vel);
      stroke(path, v.c, w * 3.2, 0.14); // свечение
      stroke(path, v.c, w, v.end ? 0.75 : 0.95);
      // звучащая нота — светлая точка у инструмента
      if (!v.end) {
        const m = pts[pts.length - 1][1], [x, y] = P(tn, m, tn);
        g.globalAlpha = 1; g.fillStyle = v.c; g.beginPath(); g.arc(x, y, w * 1.25, 0, Math.PI * 2); g.fill();
        // подпись звучащей ноты (D5, G4) — рядом с точкой
        if (o.label) { g.font = '600 11px system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = o.dir === 'left' ? 'right' : 'center'; g.fillText(o.label(m), o.dir === 'left' ? x - 9 : x, o.dir === 'left' ? y - 9 : y - 12); }
      }
    }
    g.globalAlpha = 1;
    // край дальше от инструмента — растворяется
    g.globalCompositeOperation = 'destination-out';
    const fade = o.dir === 'left' ? g.createLinearGradient(0, 0, W * 0.35, 0) : g.createLinearGradient(0, 0, 0, H * 0.35);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    if (live.size || past.length) raf = requestAnimationFrame(draw);
  }
  function kick() { if (!raf && W) raf = requestAnimationFrame(draw); }

  layout();
  return {
    on, off, bend, clear, layout,
    set(k, v) { o[k] = v; kick(); },
    get busy() { return live.size > 0; },
    destroy() { if (raf) cancelAnimationFrame(raf); raf = 0; live.clear(); past = []; },
  };
}
