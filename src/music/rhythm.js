// Тренажёр ритма: ячейки длительностей, генерация ритма по уровню и размеру, моменты ударов, нотная запись
// (для src/modules/theory/book/score.js), сверка ударов человека с ожидаемыми и статистика. Без DOM и звука.
// Ритм — такты из ячеек; ячейка занимает 1–4 доли, внутри — сетка sub на долю и удары hits по сетке.
// Размеры x/8 (6/8, 9/8, 12/8) — сложные: доля — четверть с точкой, внутри три восьмые.

// [id, уровень, доли, сетка на долю, удары, нотная запись]
const SIMPLE = [
  ['q', 1, 1, 1, [1], [{ d: 'q' }]],
  ['r', 1, 1, 1, [0], [{ d: 'q', rest: true }]],
  ['h', 1, 2, 1, [1, 0], [{ d: 'h' }]],
  ['hd', 1, 3, 1, [1, 0, 0], [{ d: 'h', dot: true }]],
  ['w', 1, 4, 1, [1, 0, 0, 0], [{ d: 'w' }]],
  ['ee', 2, 1, 2, [1, 1], [{ d: 'e', b: 1 }, { d: 'e', b: 1 }]],
  ['re', 2, 1, 2, [0, 1], [{ d: 'e', rest: true }, { d: 'e' }]],
  ['dqe', 3, 2, 2, [1, 0, 0, 1], [{ d: 'q', dot: true }, { d: 'e' }]],
  ['eqe', 3, 2, 2, [1, 1, 0, 1], [{ d: 'e' }, { d: 'q' }, { d: 'e' }]],
  ['ssss', 4, 1, 4, [1, 1, 1, 1], [{ d: 's', b: 1 }, { d: 's', b: 1 }, { d: 's', b: 1 }, { d: 's', b: 1 }]],
  ['ess', 4, 1, 4, [1, 0, 1, 1], [{ d: 'e', b: 1 }, { d: 's', b: 1 }, { d: 's', b: 1 }]],
  ['sse', 4, 1, 4, [1, 1, 1, 0], [{ d: 's', b: 1 }, { d: 's', b: 1 }, { d: 'e', b: 1 }]],
  ['des', 5, 1, 4, [1, 0, 0, 1], [{ d: 'e', dot: true, b: 1 }, { d: 's', b: 1 }]],
  ['ses', 5, 1, 4, [1, 1, 0, 1], [{ d: 's', b: 1 }, { d: 'e', b: 1 }, { d: 's', b: 1 }]],
  ['sde', 5, 1, 4, [1, 1, 0, 0], [{ d: 's', b: 1 }, { d: 'e', dot: true, b: 1 }]],
  ['rsss', 5, 1, 4, [0, 1, 1, 1], [{ d: 's', rest: true }, { d: 's', b: 1 }, { d: 's', b: 1 }, { d: 's', b: 1 }]],
  ['ttt', 6, 1, 3, [1, 1, 1], [{ d: 'e', b: 1, trip: 'a' }, { d: 'e', b: 1, trip: 'b' }, { d: 'e', b: 1, trip: 'c' }]],
  ['qt', 6, 1, 3, [1, 0, 1], [{ d: 'q', trip: 'a' }, { d: 'e', trip: 'c' }]],
  ['rtt', 6, 1, 3, [0, 1, 1], [{ d: 'e', rest: true, trip: 'a' }, { d: 'e', b: 1, trip: 'b' }, { d: 'e', b: 1, trip: 'c' }]],
];
const COMPOUND = [
  ['c.q', 1, 1, 3, [1, 0, 0], [{ d: 'q', dot: true }]],
  ['c.r', 1, 1, 3, [0, 0, 0], [{ d: 'q', dot: true, rest: true }]],
  ['c.h', 1, 2, 3, [1, 0, 0, 0, 0, 0], [{ d: 'h', dot: true }]],
  ['c.eee', 2, 1, 3, [1, 1, 1], [{ d: 'e', b: 1 }, { d: 'e', b: 1 }, { d: 'e', b: 1 }]],
  ['c.qe', 2, 1, 3, [1, 0, 1], [{ d: 'q' }, { d: 'e' }]],
  ['c.eq', 3, 1, 3, [1, 1, 0], [{ d: 'e' }, { d: 'q' }]],
  ['c.ree', 3, 1, 3, [0, 1, 1], [{ d: 'e', rest: true }, { d: 'e', b: 1 }, { d: 'e', b: 1 }]],
  // шестнадцатые в сложном размере: сетка 6 на долю
  ['c.sse', 4, 1, 6, [1, 1, 1, 0, 1, 0], [{ d: 's', b: 1 }, { d: 's', b: 1 }, { d: 'e', b: 1 }, { d: 'e', b: 1 }]],
  ['c.ess', 4, 1, 6, [1, 0, 1, 1, 1, 0], [{ d: 'e', b: 1 }, { d: 's', b: 1 }, { d: 's', b: 1 }, { d: 'e', b: 1 }]],
];

const mk = (a, compound) => ({ id: a[0], lv: a[1], beats: a[2], sub: a[3], hits: a[4], notes: a[5], compound, rest: !a[4].some(Boolean), long: a[2] > 1 && a[3] === 1 || a[0] === 'c.h' });
export const CELLS = Object.fromEntries([...SIMPLE.map((a) => mk(a, false)), ...COMPOUND.map((a) => mk(a, true))].map((c) => [c.id, c]));
export const cellHits = (c) => c.hits.filter(Boolean).length;

// Уровни свободного тренажёра: что добавляется на каждом (в сложных размерах — свои ячейки тех же уровней)
export const LEVELS = [1, 2, 3, 4, 5, 6];
export const MAX_LEVEL = 6;
export const METERS = ['2/4', '3/4', '4/4', '5/4', '6/8', '9/8', '12/8'];
export const BARS = [1, 2, 4];
// Допуск попадания, мс: мягко / обычно / строго
export const STRICT = { soft: 60, mid: 35, strict: 20 };
export const SOUNDS = ['wood', 'clap', 'snare', 'clave'];
// Полиритмы: «a:b» — a ударов человека на b щелчков такта
export const POLY = ['3:2', '2:3', '4:3', '3:4', '5:4', '5:3'];
// «Держи темп»: тактов со щелчками и без
export const GAPS = [1, 2, 4, 8];
export const DRILLS = ['echo', 'read', 'dict', 'pulse', 'poly'];

export function parseMeter(s) {
  const [num, den] = String(s || '4/4').split('/').map(Number);
  const compound = den === 8 && num % 3 === 0 && num > 3;
  return { num, den, compound, beats: compound ? num / 3 : num };
}

// Ячейки, из которых строится ритм: уровень (все до него) или свой набор
export function poolOf(meter, level, custom) {
  const M = typeof meter === 'string' ? parseMeter(meter) : meter;
  const all = Object.values(CELLS).filter((c) => c.compound === M.compound);
  let pool = custom && custom.length ? all.filter((c) => custom.includes(c.id)) : all.filter((c) => c.lv <= level);
  if (!pool.some((c) => !c.rest && c.beats === 1)) pool = pool.concat(all.filter((c) => c.lv === 1 && !c.rest && c.beats === 1));
  return pool;
}

// Может ли ячейка начаться на доле b такта из beats долей (длинные — с сильных долей)
export function fits(c, b, beats) {
  if (c.beats > beats - b) return false;
  if (c.id === 'w') return b === 0 && beats === 4;
  if (c.id === 'hd') return b === 0 && beats >= 3;
  if (c.beats === 2 && beats % 2 === 0) return b % 2 === 0;
  return true;
}

function pickW(list, w, rnd) {
  const sum = list.reduce((s, x, i) => s + w[i], 0);
  let r = rnd() * sum;
  for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}

// Новый ритм: { meter, bars: [[id, …], …] }. Новое уровня встречается чаще; в каждом такте есть удар.
export function genRhythm({ meter = '4/4', bars = 2, level = 2, custom = null, rnd = Math.random } = {}) {
  const M = parseMeter(meter), pool = poolOf(M, level, custom);
  const top = Math.max(...pool.map((c) => c.lv));
  const weight = (c) => (custom && custom.length ? 1 : c.lv === top && top > 1 ? 2.4 : 1) * (c.rest ? 0.45 : 1) * (c.long ? 0.55 : 1);
  let best = null;
  for (let tries = 0; tries < 30; tries++) {
    const out = [];
    for (let k = 0; k < bars; k++) {
      let bar;
      do {
        bar = [];
        let b = 0;
        while (b < M.beats) {
          const cand = pool.filter((c) => fits(c, b, M.beats) && !(k === 0 && b === 0 && c.rest && level <= 2));
          const list = cand.length ? cand : [CELLS[M.compound ? 'c.q' : 'q']];
          const c = pickW(list, list.map(weight), rnd);
          bar.push(c.id);
          b += c.beats;
        }
      } while (!bar.some((id) => !CELLS[id].rest));
      out.push(bar);
    }
    best = out;
    // свой набор и первый уровень — как вышло; иначе в ритме должно быть что-то из нового
    if ((custom && custom.length) || top <= 1 || out.flat().some((id) => CELLS[id].lv === top)) break;
  }
  return { meter, bars: best };
}

// Удары ритма: [{ b — доля от начала, cell — номер ячейки по порядку, beat — доля в такте }]
// swing — восьмые с качанием (вторая восьмая доли — на 2/3)
export function onsets(r, { swing = false } = {}) {
  const out = [];
  let pos = 0, k = 0;
  r.bars.forEach((bar) => {
    let inBar = 0;
    bar.forEach((id) => {
      const c = CELLS[id];
      c.hits.forEach((h, i) => {
        if (!h) return;
        let t = i / c.sub;
        if (swing && c.sub === 2 && i % 2 === 1) t = Math.floor(i / 2) + 2 / 3;
        out.push({ b: pos + t, cell: k, beat: Math.floor(inBar + t) });
      });
      pos += c.beats; inBar += c.beats; k++;
    });
  });
  return out;
}
export const rhythmBeats = (r) => r.bars.length * parseMeter(r.meter).beats;

// Нотная запись для scoreSVG: marks — класс для каждого удара по порядку ('ok' | 'near' | 'off' | 'miss')
export function notation(r, marks = null) {
  const items = [];
  let k = 0, hit = 0;
  r.bars.forEach((bar, bi) => {
    bar.forEach((id) => {
      const c = CELLS[id];
      c.notes.forEach((n) => {
        const it = { ...n };
        delete it.b;
        if (n.b) it.bm = k;
        if (!n.rest) { if (marks && marks[hit]) it.c = marks[hit]; hit++; }
        items.push(it);
      });
      k++;
    });
    items.push({ bar: bi === r.bars.length - 1 ? '|.' : '|' });
  });
  return items;
}
// Одна ячейка нотами — для палитры диктанта
export const cellNotation = (id) => CELLS[id].notes.map((n) => { const it = { ...n }; delete it.b; if (n.b) it.bm = 0; return it; });

// Одинаковы ли два ритма на слух (одни и те же удары)
export function sameRhythm(a, b) {
  const x = onsets(a).map((o) => Math.round(o.b * 12)), y = onsets(b).map((o) => Math.round(o.b * 12));
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

// Диктант: ответ по тактам — добавить ячейку (null, если не влезает в такт или тактов уже total)
export function dictPush(bars, meter, id, total) {
  const M = parseMeter(meter), out = bars.map((b) => b.slice());
  let cur = out[out.length - 1];
  const used = cur ? cur.reduce((s, x) => s + CELLS[x].beats, 0) : M.beats;
  if (!cur || used >= M.beats) { if (out.length >= total) return null; cur = []; out.push(cur); }
  const left = M.beats - (cur.reduce((s, x) => s + CELLS[x].beats, 0));
  if (CELLS[id].beats > left) return null;
  cur.push(id);
  return out;
}
export function dictFull(bars, meter, total) {
  const M = parseMeter(meter);
  return bars.length === total && bars.every((b) => b.reduce((s, x) => s + CELLS[x].beats, 0) === M.beats);
}

// Сверка ударов: exp и taps — секунды по возрастанию; tol — допуск, с. Каждому ожидаемому — ближайший свободный удар
// в окне (не дальше половины расстояния до соседнего ожидаемого и не дальше 0,25 с).
// → { hits: [{ t, tap, err (мс, − раньше, + позже), g: 'ok'|'near'|'off'|'miss' }], extra: [t…], ok, near, off, miss,
//     mean (мс, среднее со знаком), abs (мс, среднее по модулю), pass, score (0…1) }
export function matchTaps(exp, taps, tol = 0.035) {
  const used = new Array(taps.length).fill(false);
  const hits = exp.map((e, i) => {
    const gl = i ? e - exp[i - 1] : Infinity, gr = i < exp.length - 1 ? exp[i + 1] - e : Infinity;
    const w = Math.min(0.25, Math.max(tol * 2, Math.min(gl, gr) / 2));
    let bj = -1, bd = Infinity;
    taps.forEach((t, j) => { if (!used[j] && Math.abs(t - e) <= w && Math.abs(t - e) < bd) { bd = Math.abs(t - e); bj = j; } });
    if (bj < 0) return { t: e, tap: null, err: null, g: 'miss' };
    used[bj] = true;
    const err = Math.round((taps[bj] - e) * 1000), a = Math.abs(err) / 1000;
    return { t: e, tap: taps[bj], err, g: a <= tol ? 'ok' : a <= tol * 2 ? 'near' : 'off' };
  });
  const extra = taps.filter((t, j) => !used[j]);
  const n = (g) => hits.filter((h) => h.g === g).length;
  const m = hits.filter((h) => h.err != null);
  const mean = m.length ? Math.round(m.reduce((s, h) => s + h.err, 0) / m.length) : 0;
  const abs = m.length ? Math.round(m.reduce((s, h) => s + Math.abs(h.err), 0) / m.length) : 0;
  const ok = n('ok'), near = n('near'), off = n('off'), miss = n('miss');
  const score = exp.length ? Math.max(0, (ok + near * 0.5) / (exp.length + extra.length)) : 0;
  return { hits, extra, ok, near, off, miss, mean, abs, pass: !miss && !off && !extra.length && exp.length > 0, score };
}

// Ход темпа по ошибкам ударов (мс): наклон прямой — на сколько мс за удар уходит человек (+ замедляется, − спешит)
export function drift(errs) {
  const p = errs.map((e, i) => [i, e]).filter(([, e]) => e != null);
  if (p.length < 3) return 0;
  const n = p.length, sx = p.reduce((s, [x]) => s + x, 0), sy = p.reduce((s, [, y]) => s + y, 0);
  const sxx = p.reduce((s, [x]) => s + x * x, 0), sxy = p.reduce((s, [x, y]) => s + x * y, 0);
  const d = n * sxx - sx * sx;
  return d ? (n * sxy - sx * sy) / d : 0;
}

// Полиритм a:b — доли ударов человека в такте (в щелчках такта)
export function polyBeats(p) {
  const [a, b] = String(p).split(':').map(Number);
  return { a, b, at: Array.from({ length: a }, (_, i) => (i * b) / a) };
}

// Задержка по эху: щелчки отсчёта (ts) и найденные микрофоном всплески (on) → медиана задержки или null
export function echoDelay(ts, on, max = 0.45) {
  const d = ts.map((t) => { const x = on.filter((o) => o >= t && o - t <= max); return x.length ? x[0] - t : null; }).filter((x) => x != null).sort((a, b) => a - b);
  if (d.length < 2) return null;
  const med = d[Math.floor(d.length / 2)];
  return d.filter((x) => Math.abs(x - med) <= 0.03).length >= 2 ? med : null;
}

/* ---------- статистика (данные модуля, ctx.data) ---------- */

export function normalizeData(d) {
  d.days = d.days || {};   // 'YYYY-MM-DD' → { n упражнений, p сдано, s сумма оценок, e сумма |ошибок| мс, h ударов с ошибкой }
  d.cells = d.cells || {}; // ячейка → { c верно, t всего }
  d.drills = d.drills || {}; // упражнение → { c сдано, t всего }
  d.beat = d.beat || {};   // доля такта → { s сумма ошибок со знаком, n }
  return d;
}

// Записать попытку: res — итог matchTaps, cells — id ячейки для каждого ожидаемого удара (или null), beats — доля такта
export function recordRun(d, { drill, res, cells = null, beats = null, day }) {
  normalizeData(d);
  const x = d.days[day] || (d.days[day] = { n: 0, p: 0, s: 0, e: 0, h: 0 });
  x.n++; if (res.pass) x.p++; x.s += res.score;
  res.hits.forEach((h) => { if (h.err != null) { x.e += Math.abs(h.err); x.h++; } });
  const dr = d.drills[drill] || (d.drills[drill] = { c: 0, t: 0 });
  dr.t++; if (res.pass) dr.c++;
  if (cells) {
    const per = {};
    res.hits.forEach((h, i) => { const id = cells[i]; if (id == null) return; const p = per[id] || (per[id] = []); p.push(h.g === 'ok' || h.g === 'near'); });
    Object.entries(per).forEach(([id, oks]) => { const c = d.cells[id] || (d.cells[id] = { c: 0, t: 0 }); c.t++; if (oks.every(Boolean)) c.c++; });
  }
  if (beats) res.hits.forEach((h, i) => { if (h.err == null || beats[i] == null) return; const b = d.beat[beats[i]] || (d.beat[beats[i]] = { s: 0, n: 0 }); b.s += h.err; b.n++; });
  return d;
}

// Итог недели: { n, p, acc (0…1), abs (мс) } по дням keys
export function weekOf(d, keys) {
  normalizeData(d);
  let n = 0, p = 0, s = 0, e = 0, h = 0;
  keys.forEach((k) => { const x = d.days[k]; if (x) { n += x.n; p += x.p; s += x.s; e += x.e; h += x.h; } });
  return { n, p, acc: n ? s / n : 0, abs: h ? Math.round(e / h) : 0 };
}

// Что даётся хуже: ячейки с точностью ниже 80 % (не меньше 4 попыток) и доли с заметной спешкой или опозданием
export function weakSpots(d) {
  normalizeData(d);
  const cells = Object.entries(d.cells).filter(([, v]) => v.t >= 4 && v.c / v.t < 0.8).sort((a, b) => a[1].c / a[1].t - b[1].c / b[1].t).map(([id, v]) => ({ id, p: v.c / v.t, t: v.t }));
  const beats = Object.entries(d.beat).filter(([, v]) => v.n >= 8 && Math.abs(v.s / v.n) >= 15).map(([b, v]) => ({ beat: +b, ms: Math.round(v.s / v.n) }));
  return { cells, beats };
}

// Настройки по умолчанию: хороши сразу — 4/4, два такта, восьмые, 80 ударов в минуту, обычный допуск
export function normalizeConf(e) {
  const def = { drill: 'home', level: 2, custom: null, meter: '4/4', bars: 2, bpm: 80, strict: 'mid', click: true, sound: 'wood', tapSound: true, swing: false, gap: 2, poly: '3:2', lat: {}, listen: true };
  for (const k in def) if (e[k] === undefined) e[k] = def[k];
  if (!DRILLS.includes(e.drill) && e.drill !== 'home') e.drill = 'home';
  if (!METERS.includes(e.meter)) e.meter = '4/4';
  if (!BARS.includes(e.bars)) e.bars = 2;
  if (!STRICT[e.strict]) e.strict = 'mid';
  e.level = Math.max(1, Math.min(MAX_LEVEL, Math.round(+e.level || 2)));
  e.bpm = Math.max(40, Math.min(200, Math.round(+e.bpm || 80)));
  if (!POLY.includes(e.poly)) e.poly = '3:2';
  if (!GAPS.includes(e.gap)) e.gap = 2;
  if (!SOUNDS.includes(e.sound)) e.sound = 'wood';
  if (!e.lat || typeof e.lat !== 'object') e.lat = {};
  return e;
}
