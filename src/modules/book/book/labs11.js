// «Гитара с нуля», вторая часть схем (слово автора 25.11.2026: начинать с устройства; потом ритм, слух, гаммы, ступени):
// gnames — струны и лады: номера, имена, касание — звук; gbar — такт и его деления (целая… шестнадцатая) с метрономом;
// gall — карта аккордов: мажор и минор на одном экране, «Играть подряд»; gformula — формула гаммы из тонов и полутонов (мажор, минор, хроматика);
// gtriad — из чего состоит аккорд: 1–3–5, большая и малая терция.
import { playBtn } from './draw.js';
import { GCH, OPEN, midisOf, chordBoxSVG } from './labs9.js';

const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const STR_NAMES = ['E', 'A', 'D', 'G', 'B', 'E']; // 6-я … 1-я
export const MAJ_ALL = ['C', 'D', 'E', 'G', 'A', 'F'];
export const MIN_ALL = ['Am', 'Em', 'Dm', 'Bm', 'F#m', 'Fm'];

export function guitarLabs2({ T, snd }) {
  const LABS = {};
  const btn = (list, cur, pre, label) => '<div class="bkgrow">' + list.map((k) => '<button type="button" class="bkgch' + (k === cur ? ' on' : '') + '" data-a="' + pre + ':' + k + '" aria-pressed="' + (k === cur) + '">' + label(k) + '</button>').join('') + '</div>';

  // Струны и лады: 6 струн сверху вниз от толстой к тонкой — как лежит гитара у играющего; номера ладов от порожка; касание струны — звук
  LABS.gnames = {
    st: { sel: 5 },
    render(s) {
      const W = 300, x0 = 46, dx = 44, y0 = 26, dy = 30;
      let g = '<svg class="bkgnames" viewBox="0 0 ' + W + ' 210" role="img" aria-label="' + T('gp.nm.aria') + '">';
      g += '<line class="nut" x1="' + x0 + '" x2="' + x0 + '" y1="' + (y0 - 8) + '" y2="' + (y0 + 5 * dy + 8) + '"/>';
      for (let f = 1; f <= 5; f++) g += '<line class="fw" x1="' + (x0 + f * dx) + '" x2="' + (x0 + f * dx) + '" y1="' + (y0 - 8) + '" y2="' + (y0 + 5 * dy + 8) + '"/><text class="fnum" x="' + (x0 + (f - 0.5) * dx) + '" y="14" text-anchor="middle">' + f + '</text>';
      for (let i = 0; i < 6; i++) {
        const k = 5 - i, y = y0 + (5 - k) * dy; // k: 0 — 6-я (сверху) … 5 — 1-я (снизу)
        const yy = y0 + i * dy, num = 6 - i, on = s.sel === num;
        g += '<g class="gnst' + (on ? ' on' : '') + '" data-a="n:' + num + '"><line class="str" x1="' + x0 + '" x2="' + (W - 8) + '" y1="' + yy + '" y2="' + yy + '" stroke-width="' + (1 + (6 - num) * 0.3).toFixed(1) + '"/><circle cx="16" cy="' + yy + '" r="11"/><text x="16" y="' + (yy + 4) + '" text-anchor="middle">' + num + '</text><text class="nm" x="' + (W - 16) + '" y="' + (yy - 5) + '" text-anchor="end">' + STR_NAMES[i] + '</text></g>';
        void y;
      }
      g += '</svg>';
      const n = s.sel, nm = STR_NAMES[6 - n];
      return '<div class="bkgwrap">' + g + '</div><div class="bkginfo"><b>' + T('gp.nm.str', { n, name: nm }) + '</b><span>' + T('gp.nm.fret') + '</span><span>' + T('gp.nm.fing') + '</span></div><p class="bkhint">' + T('gp.nm.hint') + '</p>';
    },
    on(s, a) { if (a.startsWith('n:')) { s.sel = +a.slice(2); snd.hits([[0, [OPEN[6 - s.sel]], 1.6]]); return; } return false; },
  };

  // Такт и деления: целая (1), половинная (2), четверть (4), восьмая (8), шестнадцатая (16) — столько равных частей в такте на 4/4
  const COUNTS = { 1: ['1'], 2: ['1', '3'], 4: ['1', '2', '3', '4'], 8: ['1', 'и', '2', 'и', '3', 'и', '4', 'и'], 16: ['1', 'е', 'и', 'а', '2', 'е', 'и', 'а', '3', 'е', 'и', 'а', '4', 'е', 'и', 'а'] };
  LABS.gbar = {
    st: { d: 4, m: true, bpm: 70 },
    render(s) {
      const cs = COUNTS[s.d], cells = cs.map((c, i) => '<div class="bkgbc' + (/^\d$/.test(c) ? ' beat' : '') + '"><b>' + (i === 0 ? '▮' : '▯') + '</b><span class="bkgcn">' + c + '</span></div>').join('');
      return btn([1, 2, 4, 8, 16], s.d, 'd', (k) => T('gp.bar.' + k)) +
        '<div class="bkgbar" role="img" aria-label="' + T('gp.bar.aria') + '" style="grid-template-columns:repeat(' + s.d + ',1fr)">' + cells + '</div>' +
        '<div class="bkginfo"><b>' + T('gp.bar.' + s.d) + '</b><span>' + T('gp.bar.' + s.d + '.d') + '</span></div>' +
        '<div class="bkrow">' + playBtn('data-a="hear"', T('gp.box.hear')) + '<button type="button" class="bkgch' + (s.m ? ' on' : '') + '" data-a="m" aria-pressed="' + !!s.m + '">' + T('gp.strum.metro') + '</button>' +
        '<button type="button" class="bkgch" data-a="b:-5" aria-label="−5">−5</button><span class="bkgbpm">' + s.bpm + '</span><button type="button" class="bkgch" data-a="b:5" aria-label="+5">+5</button></div>';
    },
    on(s, a) {
      if (a.startsWith('d:')) { s.d = +a.slice(2); return; }
      if (a === 'm') { s.m = !s.m; return; }
      if (a.startsWith('b:')) { s.bpm = Math.max(40, Math.min(160, s.bpm + +a.slice(2))); return; }
      if (a !== 'hear') return false;
      const beat = 60 / s.bpm, hits = [];
      for (let bar = 0; bar < 2; bar++) {
        if (s.m) for (let b = 0; b < 4; b++) hits.push([(bar * 4 + b) * beat, b ? 'click' : 'clickHi', 0.5]);
        for (let i = 0; i < s.d; i++) hits.push([bar * 4 * beat + i * 4 * beat / s.d, 'wood', i === 0 ? 0.95 : 0.7]);
      }
      snd.play({ hits }); return false;
    },
  };

  // Карта аккордов: все мажорные и минорные на одном экране; касание схемы — звук; «Играть подряд» — по очереди
  const ALLS = { maj: MAJ_ALL, min: MIN_ALL, all: [...MAJ_ALL, ...MIN_ALL] };
  const allLab = (start) => ({
    st: { g: start },
    render(s) {
      const list = ALLS[s.g];
      return btn(['maj', 'min', 'all'], s.g, 'g', (k) => T('gp.all.' + k)) +
        '<div class="bkgall">' + list.map((n) => '<button type="button" class="bkgcard" data-a="h:' + n + '" aria-label="' + n + '"><b>' + n + '</b>' + chordBoxSVG(n, T('gp.box.aria', { n })) + '</button>').join('') + '</div>' +
        '<p class="bkhint">' + T('gp.all.hint') + '</p><div class="bkrow">' + playBtn('data-a="seq"', T('gp.all.seq')) + '</div>';
    },
    on(s, a) {
      if (a.startsWith('g:') && ALLS[a.slice(2)]) { s.g = a.slice(2); return; }
      if (a.startsWith('h:') && GCH[a.slice(2)]) { snd.chord(midisOf(a.slice(2)), { arp: 0.11, dur: 1.8 }); return false; }
      if (a !== 'seq') return false;
      const hits = []; ALLS[s.g].forEach((n, i) => midisOf(n).forEach((m, k) => hits.push([i * 1.5 + k * 0.03, [m], 1.4])));
      snd.hits(hits); return false;
    },
  });
  LABS.gallmaj = allLab('maj');
  LABS.gall = allLab('all');

  // Формула гаммы: ступени и шаги между ними (т — тон, п — полутон); мажор от до, минор от ля (те же белые клавиши), хроматика — только полутоны, параллельные — рядом
  const FORM = { maj: { from: 0, steps: [2, 2, 1, 2, 2, 2, 1] }, min: { from: 9, steps: [2, 1, 2, 2, 1, 2, 2] }, chrom: { from: 0, steps: Array(12).fill(1) } };
  const rowOf = (id) => { const f = FORM[id]; let m = 60 + f.from; const out = [m]; f.steps.forEach((d) => { m += d; out.push(m); }); return out; };
  const rowHTML = (id) => {
    const ms = rowOf(id), f = FORM[id], n = ms.length;
    return '<div class="bkgform" style="grid-template-columns:repeat(' + (2 * n - 1) + ',auto)">' + ms.map((m, i) => '<div class="bkgnote' + (i === 0 || i === n - 1 ? ' root' : '') + '"><b>' + NAMES[m % 12] + '</b>' + (id !== 'chrom' ? '<span class="bkgcn">' + (i + 1 > 7 ? 1 : i + 1) + '</span>' : '') + '</div>' + (i < n - 1 ? '<div class="bkgstep' + (f.steps[i] === 1 ? ' semi' : '') + '">' + (f.steps[i] === 1 ? T('gp.fm.s') : T('gp.fm.t')) + '</div>' : '')).join('') + '</div>';
  };
  const formLab = (list, start) => ({
    st: { id: start },
    render(s) {
      const body = s.id === 'par' ? '<h4 class="bkgh">' + T('gp.fm.maj') + '</h4>' + rowHTML('maj') + '<h4 class="bkgh">' + T('gp.fm.min') + '</h4>' + rowHTML('min') : rowHTML(s.id);
      return (list.length > 1 ? btn(list, s.id, 's', (k) => T('gp.fm.' + k)) : '') + body + '<p class="bkhint">' + T('gp.fm.hint.' + s.id) + '</p><div class="bkrow">' + playBtn('data-a="hear"', T('gp.box.hear')) + '</div>';
    },
    on(s, a) {
      if (a.startsWith('s:')) { s.id = a.slice(2); return; }
      if (a !== 'hear') return false;
      const ms = s.id === 'par' ? rowOf('maj').concat(rowOf('min')) : rowOf(s.id), notes = [];
      ms.forEach((m, i) => notes.push([i * 0.4 + (s.id === 'par' && i >= 8 ? 0.4 : 0), [m], 0.5, 0.8]));
      snd.play({ notes }); return false;
    },
  });
  LABS.gformmaj = formLab(['maj'], 'maj');
  LABS.gformmin = formLab(['min'], 'min');
  LABS.gformchrom = formLab(['chrom'], 'chrom');
  LABS.gformpar = formLab(['par'], 'par');
  LABS.gformall = formLab(['maj', 'min', 'chrom'], 'maj');

  // Из чего состоит трезвучие: основной звук, терция, квинта; мажор — большая терция (4 полутона), минор — малая (3)
  const TR = { C: [0, 4, 7], Cm: [0, 3, 7], A: [9, 13, 16], Am: [9, 12, 16] };
  LABS.gtriad = {
    st: { c: 'C' },
    render(s) {
      const iv = TR[s.c], base = 60, notes = iv.map((d) => NAMES[(base + d) % 12]);
      return btn(['C', 'Cm', 'Am', 'A'], s.c, 'c', (k) => k) +
        '<div class="bkgform" style="grid-template-columns:repeat(5,auto)">' + notes.map((n, i) => '<div class="bkgnote' + (i === 0 ? ' root' : '') + '"><b>' + n + '</b><span class="bkgcn">' + [1, 3, 5][i] + '</span></div>' + (i < 2 ? '<div class="bkgstep' + (iv[i + 1] - iv[i] === 3 ? ' semi' : '') + '">' + T('gp.tr.' + (iv[i + 1] - iv[i])) + '</div>' : '')).join('') + '</div>' +
        '<div class="bkginfo"><b>' + T('gp.tr.' + (/m$/.test(s.c) ? 'min' : 'maj')) + '</b><span>' + T('gp.tr.' + (/m$/.test(s.c) ? 'min' : 'maj') + '.d') + '</span></div>' +
        '<div class="bkrow">' + playBtn('data-a="hear"', T('gp.box.hear')) + '</div>';
    },
    on(s, a) {
      if (a.startsWith('c:') && TR[a.slice(2)]) { s.c = a.slice(2); return; }
      if (a !== 'hear') return false;
      const ms = TR[s.c].map((d) => 60 + d), notes = ms.map((m, i) => [i * 0.5, [m], 0.5, 0.8]); ms.forEach((m) => notes.push([1.8, [m], 1.6, 0.8]));
      snd.play({ notes }); return false;
    },
  };
  return LABS;
}
