// Учебник: нотная строка с ритмом — SVG строкой, глифы SMuFL (шрифт Bravura из проекта alphaTab, без сети).
// scoreSVG(items, opts): items — события по порядку:
//   нота  { d: 'w'|'h'|'q'|'e'|'s', dot, n: {l, a}, m: midi, tie, bm: группа ребра, trip: 'a'|'b'|'c' (начало/середина/конец
//           триоли), art: 'stacc'|'acc'|'ten'|'marc', orn: 'tr'|'mord'|'mordL'|'turn'|'ferm', dyn: 'pp'…'sf', grace, c: класс,
//           t: подпись снизу, top: подпись сверху }; без n — удар на одной линии (ключ 'perc')
//   пауза { d, dot, rest: true }
//   черта { bar: '|' | '||' | '|:' | ':|' | '|.' }
// opts: { clef: 'treble'|'bass'|'alto'|'perc'|null, line: одна линия без ключа (ячейки ритма), up: штили вверх, time: [4, 4], sig: число знаков (+ диезы, − бемоли), w, unit, from }
// Ширина нот пропорциональна длительности. Без DOM.
import { NAT } from './engine.js';

const G = {
  gClef: '', fClef: '', cClef: '', pClef: '',
  hW: '', hH: '', hB: '', hX: '',
  f8u: '', f8d: '', f16u: '', f16d: '',
  rW: '', rH: '', rQ: '', r8: '', r16: '',
  dot: '', sharp: '', flat: '', nat: '', dsharp: '', dflat: '',
  ferm: '', tr: '', mord: '', mordL: '', turn: '',
  acc: '', stacc: '', ten: '', marc: '', t0: 0xE080,
};
const DYN = { p: '', m: '', f: '', s: '', z: '' };
const ACCG = { '-2': G.dflat, '-1': G.flat, 0: G.nat, 1: G.sharp, 2: G.dsharp };
export const BEATS = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };
export const durOf = (x) => (BEATS[x.d] || 1) * (x.dot ? 1.5 : 1) * (x.trip ? 2 / 3 : 1);

const SP = 10, FS = 40; // промежуток между линиями и кегль глифов (SMuFL: кегль = 4 промежутка)
// Диатонический номер средней линии ключа (C4 = 28)
const MID = { treble: 34, bass: 22, alto: 28, tenor: 26, perc: 34 };
// Ключевые знаки: диатонические номера в скрипичном ключе (F5 C5 G5 D5 A4 E5 B4 / B4 E5 A4 D5 G4 C5 F4)
const SIG_SH = [38, 35, 39, 36, 33, 37, 34], SIG_FL = [34, 37, 33, 36, 32, 35, 31];
const DI = (n, m) => (Math.round((m - NAT[n.l] - n.a) / 12) - 1) * 7 + n.l;

export function scoreSVG(items, { clef = 'treble', line = false, up = false, time = null, sig = 0, w = 0, unit = 26, label = 'Notes' } = {}) {
  const mid = MID[clef] || 34, top = 30, pc = clef === 'perc' || line;
  const y = (d) => top + 2 * SP + (mid - d) * (SP / 2);
  const lines = pc ? [0] : [-4, -2, 0, 2, 4];
  // разметка по x
  let x = 8;
  const head = [];
  if (clef) { head.push([clef, x]); x += 34; }
  const sigX = x;
  if (sig) x += Math.abs(sig) * 9 + 6;
  const timeX = x;
  if (time) x += 26;
  x += 6;
  let lastNote = null;
  const pos = items.map((it) => {
    if (it.bar) { const p = { it, x: x + 4 }; x += it.bar === '|' ? 12 : 18; return p; }
    if (it.chord && lastNote) return { it, x: lastNote.x, head: lastNote };
    const acc = it.n && it.n.a && !it.noAcc ? 12 : 0, chAcc = items.slice(items.indexOf(it) + 1).findIndex((z) => !z.chord);
    const p = { it, x: x + acc + 6 * Math.max(0, (chAcc < 0 ? items.length - items.indexOf(it) - 1 : chAcc) > 0 ? 1 : 0) };
    lastNote = p;
    x = p.x + Math.max(it.grace ? 12 : 18, durOf(it) * unit * 2.2) + (it.dot ? 6 : 0);
    return p;
  });
  const W = w || x + 6;
  // вертикальные размеры: с учётом нот ниже и выше стана
  const ds = items.filter((it) => it.n).map((it) => DI(it.n, it.m));
  const loD = Math.min(mid - 8, ...ds.map((d) => d - 9)), hiD = Math.max(mid + 8, ...ds.map((d) => d + 9));
  const y0 = Math.min(0, y(hiD)), H = Math.max(y(loD), top + 4 * SP + 24) - y0 + 4;
  let s = '<svg class="bkscore" viewBox="0 ' + y0 + ' ' + W + ' ' + H + '" style="max-width:' + Math.round(W * 1.15) + 'px" role="img" aria-label="' + label + '"><g class="lines">';
  for (const l of lines) s += '<line x1="4" x2="' + (W - 4) + '" y1="' + y(mid + l) + '" y2="' + y(mid + l) + '"/>';
  s += '</g>';
  const txt = (g, xx, yy, cl = 'smf', size) => '<text class="' + cl + '" x="' + xx + '" y="' + yy + '"' + (size ? ' font-size="' + size + '"' : '') + '>' + g + '</text>';
  for (const [c, cx] of head) {
    if (c === 'treble') s += txt(G.gClef, cx, y(32));
    else if (c === 'bass') s += txt(G.fClef, cx, y(24));
    else if (c === 'alto' || c === 'tenor') s += txt(G.cClef, cx, y(28));
    else if (c === 'perc') s += '<rect class="pcl" x="' + (cx + 6) + '" y="' + (y(mid) - 10) + '" width="4" height="20"/><rect class="pcl" x="' + (cx + 14) + '" y="' + (y(mid) - 10) + '" width="4" height="20"/>';
  }
  if (sig) {
    const shift = clef === 'bass' ? -14 : clef === 'alto' ? -7 : clef === 'tenor' ? -9 : 0, list = sig > 0 ? SIG_SH : SIG_FL;
    for (let i = 0; i < Math.abs(sig); i++) s += txt(sig > 0 ? G.sharp : G.flat, sigX + i * 9, y(list[i] + shift));
  }
  if (time) {
    const dig = (n) => String(n).split('').map((ch) => String.fromCharCode(G.t0 + +ch)).join('');
    s += txt(dig(time[0]), timeX, y(mid + 2)) + txt(dig(time[1]), timeX, y(mid - 2));
  }
  // ребра: группы bm
  const groups = {};
  pos.forEach((p, i) => { if (p.it.bm != null && !p.it.rest) (groups[p.it.bm] = groups[p.it.bm] || []).push(i); });
  const stemDir = {};
  for (const [, idx] of Object.entries(groups)) {
    const avg = idx.reduce((a, i) => a + (pos[i].it.n ? DI(pos[i].it.n, pos[i].it.m) : mid), 0) / idx.length;
    idx.forEach((i) => { stemDir[i] = up || avg < mid ? 1 : -1; });
  }
  const stemEnds = {};
  pos.forEach((p, i) => {
    const it = p.it;
    if (it.bar) {
      const yt = y(mid + (pc ? 2 : 4)), yb = y(mid - (pc ? 2 : 4));
      if (it.bar === '|') s += '<line class="bar" x1="' + p.x + '" x2="' + p.x + '" y1="' + yt + '" y2="' + yb + '"/>';
      else {
        const thick = it.bar === '|.' || it.bar === '|:' || it.bar === ':|';
        const xa = it.bar === '|:' ? p.x + 5 : p.x, xb = it.bar === '|:' ? p.x : p.x + 5;
        s += '<line class="bar" x1="' + xa + '" x2="' + xa + '" y1="' + yt + '" y2="' + yb + '"/>';
        s += '<line class="bar' + (thick ? ' thick' : '') + '" x1="' + xb + '" x2="' + xb + '" y1="' + yt + '" y2="' + yb + '"/>';
        if (it.bar === '|:' || it.bar === ':|') { const dx = it.bar === '|:' ? p.x + 11 : p.x - 6; s += '<circle class="rd" cx="' + dx + '" cy="' + y(mid + 1) + '" r="1.8"/><circle class="rd" cx="' + dx + '" cy="' + y(mid - 1) + '" r="1.8"/>'; }
      }
      return;
    }
    if (it.rest) {
      const g = { w: G.rW, h: G.rH, q: G.rQ, e: G.r8, s: G.r16 }[it.d];
      const ry = it.d === 'w' ? y(mid + 2) : y(mid);
      s += txt(g, p.x, ry, 'smf' + (it.c ? ' ' + it.c : ''));
      if (it.dot) s += txt(G.dot, p.x + 14, y(mid + 1));
      if (it.t) s += '<text class="st" x="' + (p.x + 6) + '" y="' + (y(mid - 4) + 26) + '">' + it.t + '</text>';
      return;
    }
    const d = it.n ? DI(it.n, it.m) : mid, yy = y(d), sc = it.grace ? 0.65 : 1;
    // добавочные линии
    if (!pc) {
      for (let L = mid + 6; L <= d; L += 2) s += '<line class="ldg" x1="' + (p.x - 4) + '" x2="' + (p.x + 15) + '" y1="' + y(L) + '" y2="' + y(L) + '"/>';
      for (let L = mid - 6; L >= d; L -= 2) s += '<line class="ldg" x1="' + (p.x - 4) + '" x2="' + (p.x + 15) + '" y1="' + y(L) + '" y2="' + y(L) + '"/>';
    }
    if (it.n && it.n.a && !it.noAcc) s += txt(ACCG[it.n.a], p.x - 12, yy, 'smf');
    if (it.n && it.n.a === 0 && it.natural) s += txt(G.nat, p.x - 11, yy, 'smf');
    if (it.chord && p.head) { const prevD = p.head.it.n ? DI(p.head.it.n, p.head.it.m) : mid; const prev = pos[i - 1]; const pd = prev && prev.it.n ? DI(prev.it.n, prev.it.m) : -99; if (Math.abs(d - pd) === 1 && !prev.shifted) { p.x += 11; p.shifted = true; } void prevD; }
    const hg = !it.n && pc ? (it.d === 'w' || it.d === 'h' ? G.hH : G.hB) : it.d === 'w' ? G.hW : it.d === 'h' ? G.hH : G.hB;
    s += txt(hg, p.x, yy, 'smf nh' + (it.c ? ' ' + it.c : ''), it.grace ? FS * sc : 0);
    if (it.dot) s += txt(G.dot, p.x + 15, d % 2 === 0 ? yy - SP / 2 : yy, 'smf');
    // столбец аккорда: ноты с chord после этой; штиль один — от крайней ноты
    const col = [p, ...pos.slice(i + 1).filter((z, k, arr) => z.it.chord && arr.slice(0, k).every((w) => w.it.chord))];
    if (it.chord) { /* штиль и украшения — у первой ноты столбца */ } else if (it.d !== 'w') {
      const ds = col.map((z) => (z.it.n ? DI(z.it.n, z.it.m) : mid)), lo = Math.min(...ds), hi = Math.max(...ds);
      const dir0 = stemDir[i] || (it.grace || up ? 1 : (lo + hi) / 2 < mid ? 1 : -1);
      const len = (it.grace ? 2.6 : 3.5) * SP, sx = dir0 > 0 ? p.x + 11.6 * sc : p.x + 0.6, dir = dir0;
      const yy0 = dir > 0 ? y(lo) : y(hi), yy1 = dir > 0 ? y(hi) : y(lo);
      const ye = dir > 0 ? yy1 - len : yy1 + len;
      stemEnds[i] = { sx, ye, dir, yy: yy0 };
      if (stemDir[i] == null) {
        s += '<line class="stem" x1="' + sx + '" x2="' + sx + '" y1="' + (yy0 - dir * 1) + '" y2="' + ye + '"/>';
        if (it.d === 'e' || it.d === 's') s += txt(it.d === 'e' ? (dir > 0 ? G.f8u : G.f8d) : dir > 0 ? G.f16u : G.f16d, sx - 0.6, ye, 'smf', it.grace ? FS * sc : 0);
        if (it.grace && it.slash) s += '<line class="stem" x1="' + (sx - 5) + '" x2="' + (sx + 6) + '" y1="' + (ye + 12) + '" y2="' + (ye + 4) + '"/>';
      }
    }
    // штрихи, украшения, динамика, подписи
    const above = Math.min(y(mid + 6), yy - 16) - (stemEnds[i] && stemEnds[i].dir > 0 ? 0 : 0);
    const aboveY = stemEnds[i] && stemEnds[i].dir > 0 ? Math.min(above, stemEnds[i].ye - 6) : above;
    if (it.art) s += txt(G[it.art], p.x + 2, it.art === 'stacc' || it.art === 'ten' ? (stemEnds[i] && stemEnds[i].dir > 0 ? yy + 12 : yy - 12) : aboveY, 'smf');
    if (it.orn) s += txt(G[it.orn], p.x - 2, aboveY - (it.art ? 10 : 0), 'smf');
    if (it.dyn) s += txt(it.dyn.split('').map((ch) => DYN[ch]).join(''), p.x - 2, Math.max(y(mid - 4), yy) + 30, 'smf dyn');
    if (it.top) s += '<text class="st up" x="' + (p.x + 6) + '" y="' + (aboveY - 4) + '">' + it.top + '</text>';
    if (it.t) s += '<text class="st" x="' + (p.x + 6) + '" y="' + (Math.max(y(mid - 4), yy) + 26) + '">' + it.t + '</text>';
  });
  // ребра
  for (const [, idx] of Object.entries(groups)) {
    const st = idx.map((i) => stemEnds[i]).filter(Boolean); if (st.length < 2) continue;
    const dir = st[0].dir, yb = dir > 0 ? Math.min(...st.map((e) => e.ye)) : Math.max(...st.map((e) => e.ye));
    idx.forEach((i) => { const e = stemEnds[i]; if (e) s += '<line class="stem" x1="' + e.sx + '" x2="' + e.sx + '" y1="' + (e.yy - dir) + '" y2="' + yb + '"/>'; });
    const x1 = stemEnds[idx[0]].sx, x2 = stemEnds[idx[idx.length - 1]].sx;
    s += '<line class="beam" x1="' + x1 + '" x2="' + x2 + '" y1="' + (yb + dir * 2.5) + '" y2="' + (yb + dir * 2.5) + '"/>';
    // второе ребро — между соседними шестнадцатыми; одиночная — короткий хвост
    idx.forEach((i, k) => {
      if (pos[i].it.d !== 's') return;
      const e = stemEnds[i], nx = idx[k + 1] != null && pos[idx[k + 1]].it.d === 's' ? stemEnds[idx[k + 1]] : null, pv = idx[k - 1] != null && pos[idx[k - 1]].it.d === 's';
      if (nx) s += '<line class="beam" x1="' + e.sx + '" x2="' + nx.sx + '" y1="' + (yb + dir * 9.5) + '" y2="' + (yb + dir * 9.5) + '"/>';
      else if (!pv) { const xx = k ? e.sx - 7 : e.sx + 7; s += '<line class="beam" x1="' + e.sx + '" x2="' + xx + '" y1="' + (yb + dir * 9.5) + '" y2="' + (yb + dir * 9.5) + '"/>'; }
    });
  }
  // лиги
  pos.forEach((p, i) => {
    if (!p.it.tie) return;
    const q = pos.slice(i + 1).find((z) => !z.it.bar); if (!q) return;
    const d = p.it.n ? DI(p.it.n, p.it.m) : mid, yy = y(d), up = !(stemEnds[i] && stemEnds[i].dir < 0) ? 1 : -1, yc = yy + up * 8;
    s += '<path class="tie" d="M' + (p.x + 8) + ' ' + (yy + up * 5) + ' Q' + ((p.x + q.x) / 2 + 6) + ' ' + (yc + up * 7) + ' ' + (q.x + 4) + ' ' + (yy + up * 5) + '"/>';
  });
  // фразировочная лига (легато): it.slur — сколько нот вперёд охватывает дуга; дуга над нотами
  pos.forEach((p, i) => {
    if (!p.it.slur) return;
    const notes = pos.slice(i + 1).filter((z) => !z.it.bar && !z.it.rest), q = notes[p.it.slur - 1]; if (!q) return;
    const span = [p, ...notes.slice(0, p.it.slur)], top = Math.min(...span.map((z) => { const k = pos.indexOf(z); return stemEnds[k] && stemEnds[k].dir > 0 ? stemEnds[k].ye : y(z.it.n ? DI(z.it.n, z.it.m) : mid) - 8; })) - 8;
    s += '<path class="tie" d="M' + (p.x + 5) + ' ' + (top + 6) + ' Q' + ((p.x + q.x) / 2 + 6) + ' ' + (top - 12) + ' ' + (q.x + 7) + ' ' + (top + 6) + '"/>';
  });
  // триоли: скобка с «3» над группой a…c
  pos.forEach((p, i) => {
    if (p.it.trip !== 'a') return;
    const j = pos.findIndex((z, k) => k > i && z.it.trip === 'c'); if (j < 0) return;
    const ys = Math.min(...pos.slice(i, j + 1).map((z, k) => (stemEnds[i + k] ? Math.min(stemEnds[i + k].ye, stemEnds[i + k].yy) : y(mid + 4)))) - 8;
    const x1 = p.x, x2 = pos[j].x + 12, xm = (x1 + x2) / 2;
    s += '<path class="tbr" d="M' + x1 + ' ' + (ys + 4) + 'V' + ys + 'H' + (xm - 6) + 'M' + (xm + 6) + ' ' + ys + 'H' + x2 + 'V' + (ys + 4) + '"/><text class="tn" x="' + xm + '" y="' + (ys + 4) + '">3</text>';
  });
  return s + '</svg>';
}

// Удар по сетке → нотная запись ударов одной долей: hits — массив 0/1 длиной sub (2, 3 или 4 на долю)
// Пустые клетки в начале доли — паузы, остальное — до следующего удара (как пишут ритм хлопков)
export function beatNotes(hits, sub, beam) {
  const out = [], on = hits.map((h, i) => (h ? i : -1)).filter((i) => i >= 0);
  if (!on.length) return [{ d: 'q', rest: true }];
  const unit = sub === 4 ? { 1: ['s'], 2: ['e'], 3: ['e', true], 4: ['q'] } : sub === 2 ? { 1: ['e'], 2: ['q'] } : { 1: ['e'], 2: ['q'], 3: ['q'] };
  const trip = sub === 3;
  if (on[0] > 0) { const [d, dot] = unit[on[0]]; out.push({ d, dot, rest: true, ...(trip ? { trip: 'a' } : {}) }); }
  on.forEach((st, k) => {
    const len = (on[k + 1] != null ? on[k + 1] : sub) - st;
    if (trip && len === 3) { out.push({ d: 'q' }); return; }
    const [d, dot] = unit[len];
    out.push({ d, dot, bm: beam, ...(trip ? { trip: 'b' } : {}) });
  });
  if (trip && out.length) {
    if (out.length === 1 && !out[0].trip) return out;
    out.forEach((x) => { x.trip = 'b'; }); out[0].trip = 'a'; out[out.length - 1].trip = 'c';
    if (out.length === 1) out[0].trip = 'a';
  }
  return out;
}
