// Мелодия песни для режима «Петь» (слово автора 14.11.2026, DECISIONS «Вокал: прогресс и «Петь»»): высота по отделённому
// вокалу записи (медиатека: дорожка vocals) и оценка дубля. Чистые функции без DOM (tests/melody.test.js); считает рабочий
// поток src/audio/melody.worker.js, экран — src/modules/audio (вид «Петь»).
// - trackPitch — линия высоты: YIN на 8 кГц (вокалу хватает: основной тон до 1 кГц), шаг 32 мс; тишина и шум — 0;
//   медианное сглаживание, одиночные октавные скачки сворачиваются, обрывки короче 0,12 с убираются.
// - melodyNotes — ноты из линии (для полосок), phrasesOf — фразы по паузам (оценка и разбор по фразам).
// - scoreTake — дубль против мелодии: по кадрам, где поёт оригинал; без учёта октавы (мужчина поёт женскую партию ниже);
//   счёт 0…100 (точно — 1, рядом — 0,5), фразы «чисто / рядом / мимо», средний уход в центах.

export const HOP = 0.032;
export const MEL_SR = 8000;

// Линия высоты: x — моно Float32Array (лучше уже 8 кГц), sr — частота. → Int16Array: высота × 10 (MIDI, 0 — тишина)
export function trackPitch(x, sr, { hop = HOP, fmin = 70, fmax = 1000, thr = 0.15 } = {}) {
  const H = Math.max(1, Math.round(hop * sr)), W = Math.round(sr * 0.04), minLag = Math.floor(sr / fmax), maxLag = Math.min(Math.ceil(sr / fmin), W);
  const n = Math.max(0, Math.floor((x.length - W - maxLag) / H));
  const out = new Int16Array(n), rms = new Float32Array(n);
  for (let f = 0; f < n; f++) { let s = 0; const o = f * H; for (let j = 0; j < W; j++) s += x[o + j] * x[o + j]; rms[f] = Math.sqrt(s / W); }
  // порог тишины — от громкости самого вокала (10 % от 90-го процентиля): в дорожке вокала тихие места — без голоса
  const sorted = Array.from(rms).sort((a, b) => a - b), gate = Math.max(1e-4, (sorted[Math.floor(sorted.length * 0.9)] || 0) * 0.1);
  const d = new Float32Array(maxLag + 1), cm = new Float32Array(maxLag + 1);
  for (let f = 0; f < n; f++) {
    if (rms[f] < gate) continue;
    const o = f * H;
    for (let tau = 1; tau <= maxLag; tau++) { let s = 0; for (let j = 0; j < W; j++) { const df = x[o + j] - x[o + j + tau]; s += df * df; } d[tau] = s; }
    let run = 0; cm[0] = 1;
    for (let tau = 1; tau <= maxLag; tau++) { run += d[tau]; cm[tau] = run ? (d[tau] * tau) / run : 1; }
    let best = -1;
    for (let tau = Math.max(2, minLag); tau < maxLag; tau++) { if (cm[tau] < thr) { while (tau + 1 < maxLag && cm[tau + 1] < cm[tau]) tau++; best = tau; break; } }
    if (best < 0) continue; // нет ясного тона — шум, согласная
    const x0 = cm[best - 1], x1 = cm[best], x2 = cm[best + 1] ?? x1, den = x0 + x2 - 2 * x1, sh = den ? (x0 - x2) / (2 * den) : 0;
    const hz = sr / (best + sh);
    if (hz >= fmin && hz <= fmax) out[f] = Math.round((69 + 12 * Math.log2(hz / 440)) * 10);
  }
  return cleanLine(out, Math.round(0.12 / hop));
}

// Сглаживание: медиана по 5 кадрам внутри голоса, одиночный скачок на октаву — к соседям, обрывки короче minLen — тишина
export function cleanLine(p, minLen = 4) {
  const n = p.length, q = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    if (!p[i]) continue;
    const w = [];
    for (let k = i - 2; k <= i + 2; k++) if (k >= 0 && k < n && p[k]) w.push(p[k]);
    w.sort((a, b) => a - b);
    let v = w[w.length >> 1];
    const prev = i && q[i - 1];
    if (prev && Math.abs(v - prev) > 100 && Math.abs(Math.abs(v - prev) - 120) < 15) v += v > prev ? -120 : 120;
    q[i] = v;
  }
  for (let i = 0; i < n;) { // короткие обрывки
    if (!q[i]) { i++; continue; }
    let j = i; while (j < n && q[j]) j++;
    if (j - i < minLen) q.fill(0, i, j);
    i = j;
  }
  return q;
}

// Ноты из линии: ровный участок (±0,6 полутона от медианы) не короче minDur → { t, d, m } (m — целая нота)
export function melodyNotes(p, hop = HOP, { minDur = 0.12, tol = 6 } = {}) {
  const out = [];
  let i = 0;
  const n = p.length;
  while (i < n) {
    if (!p[i]) { i++; continue; }
    let j = i + 1;
    const seg = [p[i]];
    while (j < n && p[j]) { const md = seg.slice().sort((a, b) => a - b)[seg.length >> 1]; if (Math.abs(p[j] - md) > tol) break; seg.push(p[j]); j++; }
    if ((j - i) * hop >= minDur) { const md = seg.slice().sort((a, b) => a - b)[seg.length >> 1]; out.push({ t: i * hop, d: (j - i) * hop, m: Math.round(md / 10) }); }
    i = j;
  }
  return out;
}

// Фразы — ноты, разделённые паузой больше gap секунд → [{ t0, t1 }]
export function phrasesOf(notes, gap = 0.6) {
  const out = [];
  notes.forEach((n) => {
    const last = out[out.length - 1];
    if (last && n.t - last.t1 <= gap) last.t1 = n.t + n.d; else out.push({ t0: n.t, t1: n.t + n.d });
  });
  return out;
}

// Оценка дубля. ref — линия мелодии (Int16Array ×10), hop; sung — [{ t — секунды песни, m — высота голоса }];
// semi — сдвиг тональности плеера (мелодия сдвигается так же); from/to — какой отрезок песни пели.
// Кадр оригинала с голосом — цель: голоса нет — мимо; |уход| ≤ 50 центов — точно, ≤ 100 — рядом (без учёта октавы).
// → { score, frames, ok, near, cents — средний уход (знак: + выше), phr: [{ t0, t1, p, r: 'ok' | 'near' | 'miss' }], hi }
export function scoreTake(ref, hop, sung, { semi = 0, from = 0, to = Infinity, phrases = null } = {}) {
  const s = sung.filter((x) => x.m > 0).sort((a, b) => a.t - b.t);
  let k = 0, ok = 0, near = 0, frames = 0, cs = 0, cn = 0, hi = 0;
  const per = [];
  const at = (t) => { // ближайшая проба голоса в пределах 60 мс
    while (k + 1 < s.length && s[k + 1].t <= t) k++;
    const a = s[k], b = s[k + 1];
    const c = [a, b].filter((x) => x && Math.abs(x.t - t) <= 0.06).sort((x, y) => Math.abs(x.t - t) - Math.abs(y.t - t))[0];
    return c ? c.m : 0;
  };
  for (let f = 0; f < ref.length; f++) {
    const t = f * hop;
    if (!ref[f] || t < from || t > to) continue;
    frames++;
    const target = ref[f] / 10 + semi, m = s.length ? at(t) : 0;
    let r = 0;
    if (m) {
      const dd = m - target, fold = ((dd % 12) + 18) % 12 - 6, ac = Math.abs(fold);
      if (ac <= 0.5) { ok++; r = 1; } else if (ac <= 1) { near++; r = 0.5; }
      if (ac <= 1) { cs += fold * 100; cn++; }
      if (ac <= 0.5) hi = Math.max(hi, Math.round(m));
    }
    per.push([t, r]);
  }
  const score = frames ? Math.round(((ok + near * 0.5) / frames) * 100) : 0;
  const phr = (phrases || []).filter((p) => p.t1 >= from && p.t0 <= to).map((p) => {
    const xs = per.filter(([t]) => t >= p.t0 && t <= p.t1), v = xs.length ? xs.reduce((a, x) => a + x[1], 0) / xs.length : 0;
    return { t0: p.t0, t1: p.t1, p: Math.round(v * 100), r: v >= 0.75 ? 'ok' : v >= 0.45 ? 'near' : 'miss' };
  });
  return { score, frames, ok, near, cents: cn ? Math.round(cs / cn) : 0, phr, hi };
}

// Хранение линии в записи: обычный массив чисел (база и копии — JSON) ↔ Int16Array
export const packLine = (p) => Array.from(p);
export const unpackLine = (a) => Int16Array.from(Array.isArray(a) ? a : []);
