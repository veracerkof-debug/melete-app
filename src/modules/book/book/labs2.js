// Учебник, часть 2 «Основы гармонии»: схемы глав iv, chords, slash, scales, melmin, key (новые по книгам
// Фридкина, Левайна, «Джазологии», Kubistra). Контракт — как в labs.js. Без DOM, кроме подсветки по ходу звука.
import { NAT, N, pcOf, nm, up, rootN, MAJ_ROOTS, ALL12, IV, chordById, scaleById, midiOf, degLabel } from './engine.js';
import { keyboardSVG, marksOf, seg, sel, playBtn, simp } from './draw.js';
import { scoreSVG } from './score.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MAJ = [0, 2, 4, 5, 7, 9, 11], HMIN = [0, 2, 3, 5, 7, 8, 11];
// звук ступени: буква по номеру ступени, знак — по полутонам
const degNote = (tonic, i, semis) => { const l = (tonic.l + i) % 7, pc = (pcOf(tonic) + semis[i]) % 12; let a = pc - NAT[l]; a = ((a + 6) % 12 + 12) % 12 - 6; return N(l, a); };

export function harmonyLabs({ T, L, snd, fact, sp, rootSel, voiceSimple, scName }) {
  const LABS = {};
  const sc = (items, o = {}) => scoreSVG(items, { label: T('sc.staff'), ...o });
  const deg = (d) => degLabel(d);
  const W = (n, m, c) => ({ d: 'w', n, m, c });
  const near = (pc, lo) => { let m = lo + ((pc - lo % 12 + 120) % 12); return m; };

  /* ---------- Интервалы в ладу: где стоит интервал и как разрешается ---------- */
  // интервал: [ключ L.IV, ступеней (букв) вверх, полутонов]
  const IVS = [['b2', 1, 1], ['2', 1, 2], ['b3', 2, 3], ['3', 2, 4], ['4', 3, 5], ['#4', 3, 6], ['b5', 4, 6], ['5', 4, 7], ['b6', 5, 8], ['6', 5, 9], ['b7', 6, 10], ['7', 6, 11], ['#2', 1, 3], ['bb7', 6, 9], ['#5', 4, 8], ['b4', 3, 4]];
  LABS.ivmode = {
    st: { k: 'maj', iv: '#4' },
    tones(s) { return s.k === 'maj' ? { t: N(0, 0), st: MAJ, b: 60 } : { t: N(5, 0), st: HMIN, b: 57 }; },
    // разрешение: устойчивые (I, III, V) стоят, неустойчивые — к ближайшему устойчивому; II — туда, куда велит интервал
    res(s, i, j, aug, dim) {
      const pick = (d, other) => {
        if ([0, 2, 4].includes(d % 7)) return 0;
        const dn = d % 7;
        if (dn === 6) return 1; if (dn === 3) return -1; if (dn === 5) return -1;
        if (dn === 1) return aug ? (other ? 1 : -1) : dim ? (other ? -1 : 1) : -1;
        return 0;
      };
      return [pick(i, false), pick(j, true)];
    },
    render(s) {
      const { t, st, b } = this.tones(s), iv = IVS.find((x) => x[0] === s.iv);
      const hits = ROMAN.map((r, i) => { const j = i + iv[1], semis = (st[j % 7] + (j >= 7 ? 12 : 0)) - st[i]; return semis === iv[2] ? i : -1; }).filter((i) => i >= 0);
      const opts = IVS.filter((x) => s.k === 'hmin' || !['#2', 'bb7', '#5', 'b4'].includes(x[0])).map((x) => [x[0], (L.IV[x[0]] || [x[0]])[0]]);
      const cards = ROMAN.map((r, i) => {
        const on = hits.includes(i), n1 = degNote(t, i, st), n2 = degNote(t, (i + iv[1]) % 7, st);
        return '<button class="pc' + (on ? ' on' : ' off') + '" data-a="d:' + i + '"' + (on ? '' : ' disabled') + '><b>' + r + '</b><small>' + (on ? nm(n1) + '–' + nm(n2) : '·') + '</small></button>';
      }).join('');
      return '<div class="bkctl">' + seg('k', [['maj', T('key.majOf', { k: 'C' })], ['hmin', T('key.minOf', { k: 'a' }) + ' ' + T('im.harm')]], s.k) + sel('iv', opts, s.iv, T('ui.interval')) + '</div>' +
        '<div class="pulls">' + cards + '</div><p class="bknote">' + (hits.length ? T('im.where', { n: hits.length, list: hits.map((i) => ROMAN[i]).join(', ') }) : T('im.none')) + ' ' + T('im.tap') + '</p>';
    },
    set(s, k) { if (k === 'k' && s.k === 'maj' && ['#2', 'bb7', '#5', 'b4'].includes(s.iv)) s.iv = '#4'; },
    on(s, a) {
      if (!a.startsWith('d:')) return false;
      const { st, b } = this.tones(s), iv = IVS.find((x) => x[0] === s.iv), i = +a.slice(2), j = i + iv[1];
      const m1 = b + st[i], m2 = b + st[j % 7] + (j >= 7 ? 12 : 0);
      const aug = /^#/.test(s.iv) || s.iv === '#4', dim = /^b(5|4)$|^bb/.test(s.iv);
      const [d1, d2] = this.res(s, i, j, aug, dim);
      const go = (deg0, dir) => { if (!dir) return b + st[deg0 % 7] + (deg0 >= 7 ? 12 : 0); const nd = deg0 + dir; return b + (nd >= 7 ? st[nd % 7] + 12 : nd < 0 ? st[(nd + 7) % 7] - 12 : st[nd]) + (deg0 >= 7 && nd >= 7 ? 0 : 0); };
      const r1 = go(i, d1), r2 = j >= 7 ? b + 12 + (st[(j - 7 + d2 + 7) % 7]) + ((j - 7 + d2) >= 7 ? 12 : (j - 7 + d2) < 0 ? -12 : 0) : go(j, d2);
      snd.play({ notes: [[0, [m1, m2], 1.1], [1.25, [r1, r2], 1.3]] });
      return false;
    },
  };

  /* ---------- Трезвучия на ступенях и обращения (5/3, 6, 6/4) ---------- */
  const TRI_Q = { '4,7': 'maj', '3,7': 'min', '3,6': 'dim', '4,8': 'aug' };
  LABS.triads = {
    st: { k: 'maj', inv: 0, i: 0 },
    render(s) {
      const minor = s.k === 'hmin', t = minor ? N(5, 0) : N(0, 0), st = minor ? HMIN : MAJ, b = minor ? 57 : 60;
      const tri = (i) => [0, 2, 4].map((k) => { const j = i + k; return { n: degNote(t, j % 7, st), m: b + st[j % 7] + (j >= 7 ? 12 : 0) }; });
      const kind = (i) => { const x = tri(i); return TRI_Q[(x[1].m - x[0].m) + ',' + (x[2].m - x[0].m)]; };
      const cur = tri(s.i).map((x, k) => (k < s.inv ? { ...x, m: x.m + 12 } : x)).sort((p, q) => p.m - q.m);
      return '<div class="bkctl">' + seg('k', [['maj', T('key.majOf', { k: 'C' })], ['hmin', T('key.minOf', { k: 'a' }) + ' ' + T('im.harm')]], s.k) + seg('inv', [[0, '5/3'], [1, '6'], [2, '6/4']], s.inv) + '</div>' +
        '<div class="pulls">' + ROMAN.map((r, i) => '<button class="pc' + (i === s.i ? ' on' : '') + ' q' + kind(i) + '" data-a="d:' + i + '"><b>' + (['maj', 'aug'].includes(kind(i)) ? r : r.toLowerCase()) + (kind(i) === 'dim' ? '°' : kind(i) === 'aug' ? '+' : '') + '</b><small>' + nm(tri(i)[0].n) + '</small><span>' + T('ti.' + kind(i)) + '</span></button>').join('') + '</div>' +
        '<div class="bktwo"><div>' + sc([{ d: 'w', n: cur[0].n, m: cur[0].m }].concat(cur.slice(1).map((x) => ({ d: 'w', n: x.n, m: x.m }))).map((x, k, a) => (k ? { ...x, chord: true } : x)), { clef: 'treble', w: 120 }) + '</div><div class="bkfacts"><div class="bkbig">' + nm(tri(s.i)[0].n) + (kind(s.i) === 'min' ? 'm' : kind(s.i) === 'dim' ? '°' : kind(s.i) === 'aug' ? '+' : '') + ' · ' + T('ti.inv' + s.inv) + '</div><dl>' +
        fact(T('ti.bass'), nm(cur[0].n) + ' — ' + T('ti.bass' + s.inv)) + fact(T('ti.ivs'), T('ti.iv.' + kind(s.i) + s.inv)) + '</dl></div></div>' +
        keyboardSVG(marksOf(cur.map((x, k) => ({ m: x.m, c: x.n.l === tri(s.i)[0].n.l ? 'root' : 'on', t: nm(x.n) }))), { lo: 55, hi: 84 });
    },
    on(s, a) {
      if (a.startsWith('d:')) s.i = +a.slice(2);
      const minor = s.k === 'hmin', st = minor ? HMIN : MAJ, b = minor ? 57 : 60;
      const ms = [0, 2, 4].map((k) => { const j = s.i + k; return b + st[j % 7] + (j >= 7 ? 12 : 0); }).map((m, k) => (k < s.inv ? m + 12 : m)).sort((p, q) => p - q);
      snd.chord(ms, { dur: 1.5 });
    },
    set(s) { this.on(s, ''); },
  };
  // В score.js аккорд — несколько нот в одном столбце: пометка chord у следующих нот (рисуются на том же x)

  /* ---------- Доминантсептаккорд и его обращения: разрешение ---------- */
  const D7 = [['7', [0, 1, 2, 3]], ['65', [1, 2, 3, 0]], ['43', [2, 3, 0, 1]], ['2', [3, 0, 1, 2]]];
  LABS.d7 = {
    st: { root: 'C', minor: 0, v: 0 },
    chords(s) {
      const t = rootN(s.root), st = s.minor ? HMIN : MAJ, b = 60 + pcOf(t) - (pcOf(t) > 4 ? 12 : 0);
      const at = (i) => ({ n: degNote(t, i % 7, st), m: b + st[i % 7] + 12 * Math.floor(i / 7) });
      const v = [at(4), at(6), at(8), at(10)]; // V VII II IV — звуки D7
      const order = D7[s.v][1], ch = order.map((k, j) => { const x = v[k]; let m = x.m; return { ...x, m }; });
      // плотное расположение снизу вверх от баса
      for (let j = 1; j < ch.length; j++) while (ch[j].m <= ch[j - 1].m) ch[j] = { ...ch[j], m: ch[j].m + 12 };
      // разрешение по правилам: VII → I вверх, IV → III вниз, II → I (в D7 — к I), V → I (в 6/5, 4/3 — стоит на месте как квинта T)
      const tI = at(7), tIII = at(9), tV = at(4);
      const res = ch.map((x) => {
        const dn = ((x.n.l - t.l) % 7 + 7) % 7;
        if (dn === 6) return { ...tI, m: x.m + (s.minor ? 1 : 1) };
        if (dn === 3) return { ...tIII, m: x.m - (s.minor ? 2 : 1) };
        if (dn === 1) return { ...tI, m: x.m - 2 };
        return s.v === 0 && dn === 4 ? { ...tI, m: x.m + 5 } : { ...tV, m: x.m };
      });
      return { ch, res, t };
    },
    render(s) {
      const { ch, res, t } = this.chords(s), name = T('d7.n' + s.v);
      return '<div class="bkctl">' + rootSel('root', s.root, MAJ_ROOTS.map((x) => [x, x])) + seg('minor', [[0, T('key.major')], [1, T('key.minor')]], s.minor) + seg('v', D7.map(([k], i) => [i, 'D' + (k === '7' ? '7' : k === '65' ? '6/5' : k === '43' ? '4/3' : '2')]), s.v) + '</div>' +
        '<div class="bktwo"><div>' + sc([...ch.map((x, k) => ({ d: 'h', n: x.n, m: x.m, chord: k > 0 })), ...res.map((x, k) => ({ d: 'h', n: x.n, m: x.m, chord: k > 0, c: 'root' })), { bar: '|.' }], { clef: 'treble' }) + '</div>' +
        '<div class="bkfacts"><div class="bkbig">' + name + '</div><p class="bknote">' + T('d7.r' + s.v) + '</p></div></div><div class="bkrow">' + playBtn('data-a="p"') + '</div>';
    },
    set(s, k) { if (k === 'minor') s.minor = +s.minor; },
    on(s) { const { ch, res } = this.chords(s); snd.prog([ch.map((x) => x.m), res.map((x) => x.m)], 1.2); },
  };

  /* ---------- Sus по Левайну и фригийский sus♭9 ---------- */
  // [ключ, бас, звуки сверху (midi от G2/E2), разрешение]
  const SUS = [
    ['no3', 43, [65, 69, 72, 74], [48, 64, 67, 71, 74]], // G | F A C D → C | E G B D
    ['3up', 43, [60, 65, 69, 71], [48, 64, 67, 71, 74]], // G | C F A B — терция выше кварты
    ['m9', 43, [59, 65, 69, 72], [48, 64, 67, 71, 74]], // G | B F A C — кварта выше терции: малая нона B–C
    ['phr', 40, [62, 65, 69, 71], [45, 61, 64, 68, 71]], // E | D F A B (Esus♭9) → A | C♯ E G♯ B
  ];
  LABS.sus = {
    st: { i: 0 },
    render(s) {
      const [k, bs, top] = SUS[s.i], marks = {};
      marks[bs] = { c: 'root', t: '1' };
      top.forEach((m) => { const iv = (m - bs) % 12; marks[m] = { c: iv === 4 || iv === 3 ? 'alt' : iv === 5 ? 'b' : 'on', t: { 0: '1', 1: '♭9', 2: '9', 3: '♭3', 4: '3', 5: '4', 7: '5', 9: '13', 10: '♭7', 11: '7' }[iv] }; });
      return '<div class="bkctl">' + seg('i', SUS.map(([key], i) => [i, T('su.' + key)]), s.i) + '</div>' + keyboardSVG(marks, { lo: 36, hi: 77 }) +
        '<p class="bknote">' + T('su.n.' + k) + '</p><div class="bkrow">' + playBtn('data-a="p"', T('su.res')) + '</div>';
    },
    on(s) { const [, bs, top, res] = SUS[s.i]; snd.prog([[bs, ...top], res], 1.5); },
    set(s) { this.on(s); },
  };

  /* ---------- Девять верхних структур (Левайн): трезвучие над тритоном доминанты ---------- */
  // [номер, сдвиг корня трезвучия, мажор/минор, нужен корень в басу, тянет вниз на квинту, гамма (id), двойник на F♯7]
  const US = [
    ['II', 2, 'M', 0, 1, 'lyddom', '♭VI'], ['♭III', 3, 'M', 0, 0, 'dimhw', 'VI'], ['♭V', 6, 'M', 1, 1, 'dimhw', '—'], ['♭VI', 8, 'M', 0, 1, 'altered', 'II'],
    ['VI', 9, 'M', 0, 1, 'dimhw', '♭III'], ['Im', 0, 'm', 0, 0, 'dimhw', '♯IVm'], ['♭IIm', 1, 'm', 1, 1, 'altered', '—'], ['♭IIIm', 3, 'm', 1, 1, 'dimhw', '—'], ['♯IVm', 6, 'm', 0, 1, 'dimhw', 'Im'],
  ];
  const TENS = { 0: '1', 1: '♭9', 2: '9', 3: '♯9', 4: '3', 5: '11', 6: '♯11', 7: '5', 8: '♭13', 9: '13', 10: '♭7', 11: '7' };
  LABS.ustnum = {
    st: { root: 'C', i: 0 },
    ms(s) {
      const rp = pcOf(rootN(s.root)), u = US[s.i], third = u[2] === 'M' ? 4 : 3;
      const lh = [52 + ((rp + 4 - 52) % 12 + 12) % 12, 0].map((m, k) => (k ? 0 : m)); // 3 и ♭7 — ниже среднего до
      const m3 = 50 + ((rp + 4 - 50) % 12 + 12) % 12, m7 = m3 + 6;
      const tri = [0, third, 7].map((x) => near((rp + u[1] + x) % 12, 60)).sort((a, b) => a - b);
      const bass = 36 + rp - (rp > 7 ? 12 : 0);
      void lh;
      return { bass, guide: [m3, m7], tri, ivs: [0, third, 7].map((x) => (u[1] + x) % 12) };
    },
    render(s) {
      const r = rootN(s.root), u = US[s.i], { bass, guide, tri, ivs } = this.ms(s), marks = {};
      if (u[3]) marks[bass] = { c: 'root', t: '1' };
      guide.forEach((m, k) => { marks[m] = { c: 'on', t: k ? '♭7' : '3' }; });
      tri.forEach((m) => { marks[m] = { c: 'alt', t: TENS[(m - pcOf(r) + 120) % 12] }; });
      const cards = US.map((x, i) => {
        const trn = nm(simp(up(r, ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'][x[1]]))) + (x[2] === 'm' ? 'm' : '');
        return '<button class="us' + (i === s.i ? ' on' : '') + '" data-a="u:' + i + '"><b>' + x[0] + '</b><small>' + trn + '</small></button>';
      }).join('');
      return '<div class="bkctl">' + rootSel('root', s.root, MAJ_ROOTS.map((x) => [x, x])) + sp('un.lh') + '</div><div class="usgrid nine">' + cards + '</div>' +
        '<div class="bkfacts wide"><div class="bkbig">' + nm(r) + '7 · ' + u[0] + ' — ' + ivs.map((x) => TENS[x]).join(', ') + '</div><dl>' +
        fact(T('ui.scale'), scName(u[5])) + fact(T('un.twin'), u[6] === '—' ? T('un.noTwin') : T('un.twinIs', { u: u[6], r: nm(simp(up(r, 'b5'))) + '7' })) +
        fact(T('un.root'), T(u[3] ? 'un.rootYes' : 'un.rootNo')) + fact(T('un.res'), T(u[4] ? 'un.resYes' : 'un.resNo')) + '</dl></div>' + keyboardSVG(marks, { lo: 36, hi: 79 }) +
        '<div class="bkrow">' + playBtn('data-a="p"') + playBtn('data-a="res"', T('un.go', { t: nm(simp(up(r, '4'))) })) + '</div>';
    },
    on(s, a) {
      if (a.startsWith('u:')) s.i = +a.slice(2);
      const { bass, guide, tri } = this.ms(s), ch = [bass, ...guide, ...tri];
      if (a === 'res') { const t = pcOf(rootN(s.root)) + 5, tb = 36 + (t % 12) - (t % 12 > 7 ? 12 : 0); snd.prog([ch, [tb, near((t + 4) % 12, 52), near((t + 11) % 12, 55), near((t + 2) % 12, 60), near((t + 7) % 12, 64)]], 1.3); return; }
      snd.chord(ch, { dur: 1.8 });
    },
  };

  /* ---------- Аккорд над басом: 12 трезвучий над C (Левайн) и септаккорды над G («Джазология») ---------- */
  // [сдвиг корня трезвучия, мажор/минор, ключ подписи «звучит как», гамма]
  const SLT = [[1, 'M', 'db', 'phrygian'], [2, 'M', 'd', 'lydian'], [3, 'M', 'eb', 'dorian'], [4, 'M', 'e', 'lydaug'], [5, 'M', 'f', 'ionian'], [6, 'M', 'gb', 'dimhw'], [7, 'M', 'g', 'ionian'], [8, 'M', 'ab', 'ionian'], [9, 'M', 'a', 'dimhw'], [10, 'M', 'bb', 'mixolydian'], [11, 'M', 'b', 'dimwh']];
  LABS.slashtri = {
    st: { bass: 'C', i: 1 },
    ms(s, i = s.i) { const bp = pcOf(rootN(s.bass)), x = SLT[i]; return { bass: 36 + bp - (bp > 7 ? 12 : 0), tri: [7, 0, 4].map((k, j) => near((bp + x[0] + k) % 12, 58 + j * 3)).sort((a, b) => a - b) }; },
    render(s) {
      const b = rootN(s.bass), x = SLT[s.i];
      const nmT = (o) => nm(simp(up(b, ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'][o])));
      const cards = SLT.map((y, i) => '<button class="us' + (i === s.i ? ' on' : '') + '" data-a="t:' + i + '"><b>' + nmT(y[0]) + '/' + nm(b) + '</b><small>' + T('sl.s.' + y[2]) + '</small></button>').join('');
      const { bass, tri } = this.ms(s), marks = { [bass]: { c: 'root', t: nm(b) } };
      tri.forEach((m) => { marks[m] = { c: 'alt', t: TENS[(m - pcOf(b) + 120) % 12] }; });
      return '<div class="bkctl">' + rootSel('bass', s.bass, ALL12.map((y) => [y, y])) + '</div><div class="usgrid six">' + cards + '</div>' +
        '<div class="bkfacts wide"><div class="bkbig">' + nmT(x[0]) + '/' + nm(b) + ' — ' + T('sl.s.' + x[2]) + '</div><p class="bknote">' + T('sl.n.' + x[2], { r: nm(b) }) + ' ' + T('sl.scale', { s: nm(b) + ' ' + scName(x[3]) }) + '</p></div>' +
        keyboardSVG(marks, { lo: 36, hi: 79 }) + '<div class="bkrow">' + playBtn('data-a="p"') + playBtn('data-a="alt"', T('sl.alt')) + '</div>';
    },
    on(s, a) {
      if (a.startsWith('t:')) s.i = +a.slice(2);
      if (a === 'alt') { const g = this.ms(s, 5), ab = this.ms(s, 7); snd.prog([[g.bass, ...g.tri], [g.bass, ...ab.tri], [g.bass, ...g.tri, ...ab.tri]], 1.2); return; }
      const { bass, tri } = this.ms(s); snd.chord([bass, ...tri], { dur: 1.8 });
    },
  };
  // септаккорды над басом G: [аккорд сверху (корень от G, вид), «звучит как»]
  const SL7 = [['b7', 'maj7', 'G13sus4'], ['5', 'm7', 'G11'], ['b3', 'maj7', 'Gm9'], ['b7', 'maj7♯5', 'G13♯11'], ['b7', 'm7', 'G7sus4♭9♭13'], ['b7', 'm6', 'G7sus4♭9'], ['b3', 'm(maj7)', 'Gm9♭5'], ['b3', 'm7', 'Gm7♭5♭9'], ['b3', 'm6', 'Gm7♭5'], ['b3', 'maj7♯5', 'Gm(maj9)'], ['b2', 'maj7', 'Gm11♭5♭9'], ['7', 'm7', 'Gmaj9♯11'], ['b6', 'maj7', 'G phryg']];
  LABS.slash7 = {
    st: { i: 0 },
    render(s) {
      const g = rootN('G');
      return '<div class="bktw"><table><thead><tr><th>' + T('sl.top') + '</th><th>' + T('sl.sounds') + '</th></tr></thead><tbody>' + SL7.map((x, i) => '<tr class="click' + (i === s.i ? ' on' : '') + '" data-a="r:' + i + '"><td><b>' + nm(simp(up(g, x[0]))) + x[1] + '/G</b></td><td>' + x[2] + '</td></tr>').join('') + '</tbody></table></div>';
    },
    on(s, a) {
      if (!a.startsWith('r:')) return false;
      s.i = +a.slice(2); const x = SL7[s.i], r = simp(up(rootN('G'), x[0])), c = chordById(x[1]);
      snd.chord([43, ...c.f.map((d) => near((pcOf(r) + IV[d][1]) % 12, 55))].sort((a, b) => a - b), { dur: 1.8 });
    },
  };

  /* ---------- Гаммы по семьям аккорда (Kubistra): аккорд + напряжения, неудобные — серым ---------- */
  // ступени: s — неудобная нота
  const FAM = [
    ['maj', 'ionian', 'maj7', '1 9 3 s4 5 13 7'], ['maj', 'lydian', 'maj7', '1 9 3 #11 5 13 7'],
    ['min', 'dorian', 'm7', '1 9 b3 11 5 13 b7'], ['min', 'aeolian', 'm7', '1 9 b3 11 5 sb13 b7'], ['min', 'phrygian', 'm7', '1 sb9 b3 11 5 sb13 b7'], ['min', 'harmmin', 'm(maj7)', '1 9 b3 11 5 sb13 7'], ['min', 'melmin', 'm(maj7)', '1 9 b3 11 5 13 7'],
    ['dom', 'mixolydian', '7', '1 9 3 s11 5 13 b7'], ['dom', 'lyddom', '7♯11', '1 9 3 #11 5 13 b7'], ['dom', 'altered', '7alt', '1 b9 #9 3 #11 b13 b7'], ['dom', 'dimhw', '7♭9', '1 b9 #9 3 #11 5 13 b7'], ['dom', 'whole', '7♯5', '1 9 3 #11 b13 b7'],
    ['dim', 'dimwh', '°7', '1 9 b3 11 b5 b13 bb7 7'], ['dim', 'locrian', 'm7♭5', '1 sb9 b3 11 b5 b13 b7'], ['dim', 'locnat2', 'm7♭5', '1 9 b3 11 b5 b13 b7'],
  ];
  const DEGMAP = { b9: 'b2', 9: '2', '#9': '#2', 11: '4', '#11': '#4', b13: 'b6', 13: '6' };
  LABS.famscale = {
    st: { root: 'C', i: 0 },
    render(s) {
      const r = rootN(s.root);
      let cur = '';
      const rows = FAM.map(([g, id, , f], i) => {
        const head = g !== cur ? '<h4>' + T('fs.' + g) + '</h4>' : ''; cur = g;
        return head + '<button class="brow' + (i === s.i ? ' on' : '') + '" data-a="r:' + i + '"><span class="bn">' + scName(id) + '</span><span class="bd">' + f.split(' ').map((d) => '<i class="' + (/^s/.test(d) ? 'avd' : /[b#]/.test(d) ? 'alt' : '') + '">' + degLabel(d.replace(/^s/, '')) + '</i>').join('') + '</span></button>';
      }).join('');
      return '<div class="bkctl">' + rootSel('root', s.root, MAJ_ROOTS.map((x) => [x, x])) + sp('fs.hint') + '</div><div class="bright">' + rows + '</div>';
    },
    on(s, a) {
      if (a.startsWith('r:')) s.i = +a.slice(2);
      const [, id, ch, f] = FAM[s.i], r = rootN(s.root), b = 60 + pcOf(r) - (pcOf(r) > 6 ? 12 : 0);
      const line = f.split(' ').map((d) => { const k = d.replace(/^s/, ''), dd = DEGMAP[k] || k; return b + (IV[dd] ? IV[dd][1] : 0); }).sort((x, y) => x - y).concat([b + 12]);
      snd.over(voiceSimple({ r, id: chordById(ch) ? ch : '7' }), line.length * 0.22 + 0.6, line, 0.22, 0.4);
      void id;
    },
  };

  /* ---------- Какая гамма к доминанте: по напряжениям в символе («Джазология») ---------- */
  const TEN = ['b9', '9', '#9', '#11', '5', 'b13', '13'];
  function domScale(on) {
    const h = (k) => on.includes(k), anyAltNine = h('b9') || h('#9');
    if (anyAltNine && h('b13') && !h('5') && !h('13') && !h('9')) return 'altered';
    if (anyAltNine && (h('13') || h('5')) && !h('b13') && !h('9')) return 'dimhw';
    if (h('b9') && h('b13') && h('5')) return 'phrdom';
    if (h('9') && h('b13') && h('#11') && !h('5') && !h('13')) return 'whole';
    if (h('9') && h('b13') && !anyAltNine) return 'mixob13';
    if (h('#11') && !anyAltNine && !h('b13')) return 'lyddom';
    if (!anyAltNine && !h('b13') && !h('#11')) return 'mixolydian';
    return null;
  }
  LABS.altdim = {
    st: { on: 'b9,13' },
    render(s) {
      const on = s.on.split(',').filter(Boolean), id = domScale(on);
      const chips = TEN.map((k) => '<button class="chk' + (on.includes(k) ? ' on' : '') + '" data-a="x:' + k + '" aria-pressed="' + on.includes(k) + '">' + degLabel(k) + '</button>').join('');
      return '<div class="extypes">' + chips + '</div><div class="bkbig">G7' + (on.length ? '(' + on.map(degLabel).join(' ') + ')' : '') + ' → ' + (id ? scName(id) : T('ad.mixed')) + '</div><p class="bknote">' + T('ad.n.' + (id || 'mixed')) + '</p><div class="bkrow">' + playBtn('data-a="p"', T('sc.over')) + '</div>';
    },
    on(s, a) {
      if (a.startsWith('x:')) { const k = a.slice(2), on = new Set(s.on.split(',').filter(Boolean)); if (on.has(k)) on.delete(k); else on.add(k); s.on = [...on].join(','); return; }
      const id = domScale(s.on.split(',').filter(Boolean)); if (!id) return false;
      const r = rootN('G'), f = scaleById(id).f, b = 55, line = f.map((d) => b + IV[d][1]).sort((x, y) => x - y).concat([67]);
      const ch = [43, 59, 65, ...s.on.split(',').filter(Boolean).map((k) => near((7 + IV[DEGMAP[k] || k][1]) % 12, 67))];
      snd.over(ch, line.length * 0.22 + 0.6, line, 0.22, 0.4);
      void r;
    },
  };

  /* ---------- Хроматическая гамма: правописание вверх и вниз (Фридкин) ---------- */
  // мажор вверх: повышенные ступени, кроме III и VI; VII — пониженная. Вниз: пониженные, кроме I и V (V — повышенная IV).
  const CHROM = {
    majUp: ['1', '#1', '2', '#2', '3', '4', '#4', '5', '#5', '6', 'b7', '7', '8'],
    majDn: ['8', '7', 'b7', '6', 'b6', '5', '#4', '4', '3', 'b3', '2', 'b2', '1'],
    minUp: ['1', 'b2', '2', '3_', '3', '4', '#4', '5', '6_', '6', '7_', '7', '8'],
    minDn: ['8', '7', '7_', '6', '6_', '5', '#4', '4', '3', '3_', '2', 'b2', '1'],
  };
  LABS.chromsc = {
    st: { root: 'C', k: 'maj' },
    notes(s) {
      const minor = s.k === 'min', r = rootN(s.root), b = 60 + pcOf(r) - (pcOf(r) > 6 ? 12 : 0);
      // в миноре: III и VI ступени — натурального минора, «_» — ступень минора повышенная (b3 → 3 и т. д.)
      const map = (d) => (minor ? { '3_': 'b3', 3: '3', '6_': 'b6', 6: '6', '7_': 'b7', 7: '7' }[d] || d : d);
      const one = (d) => { const dd = map(d); const k = dd === '8' ? '1' : dd === '#1' ? '#1' : dd; const sem = dd === '8' ? 12 : dd === '#1' ? 1 : IV[dd][1]; const n = k === '#1' ? N(r.l, r.a + 1) : up(r, k); return { n: Math.abs(n.a) > 1 ? simp(n) : n, m: b + sem }; };
      return { up: CHROM[minor ? 'minUp' : 'majUp'].map(one), dn: CHROM[minor ? 'minDn' : 'majDn'].map(one) };
    },
    render(s) {
      const { up: u, dn } = this.notes(s);
      const q = (x) => ({ d: 'q', n: x.n, m: x.m, noAcc: false });
      return '<div class="bkctl">' + rootSel('root', s.root, ['C', 'D', 'E♭', 'E', 'F', 'G', 'A', 'B♭'].map((x) => [x, x])) + seg('k', [['maj', T('key.major')], ['min', T('key.minor')]], s.k) + '</div>' +
        '<small class="bklbl">' + T('cr.up') + '</small>' + sc(u.map(q), { clef: 'treble', unit: 14 }) + '<small class="bklbl">' + T('cr.down') + '</small>' + sc(dn.map(q), { clef: 'treble', unit: 14 }) +
        '<p class="bknote">' + T('cr.n.' + s.k) + '</p><div class="bkrow">' + playBtn('data-a="u"', T('sc.up')) + playBtn('data-a="d"', T('sc.down')) + '</div>';
    },
    on(s, a) { const { up: u, dn } = this.notes(s); snd.seq((a === 'd' ? dn : u).map((x) => x.m), 0.16, 0.3); },
  };

  /* ---------- Мелодический минор: одна тональность — шесть аккордов (Левайн) ---------- */
  const MM = [0, 2, 3, 5, 7, 9, 11];
  const MMQ = ['m(maj7)', 'sus♭9', 'maj7♯5', '7♯11', '7♭13', 'ø', '7alt'];
  LABS.mmfamily = {
    st: { root: 'C', b: 0, v: 'key' },
    render(s) {
      const t = rootN(s.root), tp = pcOf(t);
      const vo = [3, 5, 7, 9].map((k) => { const i = k - 1, j = i % 7; return near((tp + MM[j] + (i >= 7 ? 12 : 0)) % 12, 59); }).sort((a, b) => a - b); // 3–5–7–9 тональности
      const basses = MM.map((x, i) => ({ i, n: degNote(t, i, MM), m: 36 + ((tp + x) % 12) - ((tp + x) % 12 > 7 ? 12 : 0) }));
      const cur = basses[s.b], marks = { [cur.m]: { c: 'root', t: nm(cur.n) } };
      vo.forEach((m) => { marks[m] = { c: 'alt', t: TENS[(m - pcOf(cur.n) + 120) % 12] }; });
      const cards = basses.map((x) => '<button class="pc' + (x.i === s.b ? ' on' : '') + (x.i === 4 ? ' off' : '') + '" data-a="b:' + x.i + '"><b>' + ROMAN[x.i] + '</b><small>' + nm(x.n) + '</small><span>' + MMQ[x.i] + '</span></button>').join('');
      return '<div class="bkctl">' + rootSel('root', s.root, ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'].map((x) => [x, x])) + sp('mm.hint') + '</div><div class="pulls">' + cards + '</div>' +
        '<div class="bkbig">' + nm(cur.n) + MMQ[s.b] + '</div><p class="bknote">' + T('mm.n' + s.b) + '</p>' + keyboardSVG(marks, { lo: 36, hi: 79 }) +
        '<div class="bkrow">' + playBtn('data-a="p"') + playBtn('data-a="all"', T('mm.all')) + playBtn('data-a="iiv"', T('mm.iiv')) + '</div>';
    },
    on(s, a) {
      const t = rootN(s.root), tp = pcOf(t);
      const vo = [3, 5, 7, 9].map((k) => { const i = k - 1, j = i % 7; return near((tp + MM[j] + (i >= 7 ? 12 : 0)) % 12, 59); }).sort((x, y) => x - y);
      const bass = (i) => 36 + ((tp + MM[i]) % 12) - ((tp + MM[i]) % 12 > 7 ? 12 : 0);
      if (a.startsWith('b:')) s.b = +a.slice(2);
      if (a === 'all') { snd.prog([0, 1, 2, 3, 5, 6, 0].map((i) => [bass(i), ...vo]), 0.9); return false; }
      if (a === 'iiv') {
        // минорный ii–V–i в тонике C: Dø (из F мел. минора) → G7alt (из A♭ мел. минора — на м3 выше) → Cm(maj7)
        const phr = [65, 68, 72, 74, 72, 68], up3 = phr.map((m) => m + 3), q = 0.22;
        const notes = [[0, [38, 53, 56, 60], 1.5, 0.35], ...phr.map((m, k) => [k * q, m, q * 0.9]), [1.45, [43, 53, 56, 59], 1.5, 0.35], ...up3.map((m, k) => [1.45 + k * q, m, q * 0.9]), [2.9, [36, 51, 55, 59, 62], 2, 0.35], [2.9, 67, 1.6]];
        snd.play({ notes }); return false;
      }
      snd.chord([bass(s.b), ...vo], { dur: 1.8 });
    },
  };

  /* ---------- Гармонизация мелодии главными трезвучиями (Фридкин) ---------- */
  // своя мелодия: 8 тактов в до мажоре, по такту — какой аккорд (T/S/D); проверка — сильная доля входит в аккорд
  const HM = 'E4q G4q C5q G4q | A4q F4q A4q C5q | G4q E4q G4q C5q | D5q B4q G4q B4q | C5q A4q F4q A4q | G4q E4q C4q E4q | D4q F4q B4q D5q | C5w ||';
  const FN = { T: [0, 4, 7], S: [5, 9, 0], D: [7, 11, 2] };
  LABS.harmtsd = {
    st: { pick: 'TTTTTTTT', bar: 0 },
    mel() {
      return HM.split('|').map((b) => b.trim().replace('||', '').trim()).filter(Boolean).map((b) => b.split(/\s+/).map((tok) => { const mm = /^([A-G])(\d)([whq])/.exec(tok); const l = 'CDEFGAB'.indexOf(mm[1]); return { n: N(l, 0), m: (+mm[2] + 1) * 12 + NAT[l], d: mm[3] }; }));
    },
    render(s) {
      const bars = this.mel(), pick = s.pick.split('');
      const ok = bars.map((b, i) => FN[pick[i]].includes(b[0].m % 12));
      const items = []; bars.forEach((b, i) => { b.forEach((x, k) => items.push({ ...x, c: k === 0 ? (ok[i] ? 'alt' : 'b') : '', t: k === 0 ? pick[i] : '' })); items.push({ bar: i === bars.length - 1 ? '|.' : '|' }); });
      const cut = items.findIndex((x, k) => x.bar && items.slice(0, k + 1).filter((z) => z.bar).length === 4) + 1;
      const chips = bars.map((b, i) => '<div class="tsdb' + (ok[i] ? '' : ' bad') + '"><small>' + (i + 1) + '</small>' + ['T', 'S', 'D'].map((f) => '<button class="chipc' + (pick[i] === f ? ' on' : '') + '" data-a="f:' + i + ':' + f + '">' + f + '</button>').join('') + '</div>').join('');
      return sc(items.slice(0, cut), { clef: 'treble', time: [4, 4] }) + sc(items.slice(cut), { clef: 'treble' }) + '<div class="tsd">' + chips + '</div>' +
        '<p class="bknote">' + (ok.every(Boolean) ? T('hm.ok') : T('hm.bad', { n: ok.filter((x) => !x).length })) + '</p><div class="bkrow">' + playBtn('data-a="p"') + playBtn('data-a="sol"', T('hm.sol')) + '</div>';
    },
    on(s, a) {
      if (a.startsWith('f:')) { const [, i, f] = a.split(':'), p = s.pick.split(''); p[+i] = f; s.pick = p.join(''); return; }
      if (a === 'sol') { s.pick = 'TSTDSTDT'; }
      const bars = this.mel(), pick = s.pick.split(''), q = 0.5, notes = [];
      const CH = { T: [48, 52, 55], S: [48, 53, 57], D: [47, 50, 55] };
      bars.forEach((b, i) => { notes.push([i * 4 * q, CH[pick[i]], 4 * q * 0.95, 0.35]); let t = 0; b.forEach((x) => { notes.push([i * 4 * q + t, x.m, (x.d === 'w' ? 4 : 1) * q * 0.9]); t += (x.d === 'w' ? 4 : 1) * q; }); });
      snd.play({ notes });
    },
  };

  void sel; void midiOf; void deg; void W;
  return LABS;
}
