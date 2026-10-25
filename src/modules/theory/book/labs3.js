// Учебник, часть 3 «Гармония джаза»: схемы глав voice, hands, mod, reharm, centers (по «Джазологии» и книгам Левайна).
// Контракт — как в labs.js. Голоса: ступени от корня, левая рука около C3–C4, правая — выше; всё звучит через snd.
import { N, pcOf, nm, up, rootN, MAJ_ROOTS, ALL12, IV, CHORDS, chordById, parseChord, degLabel } from './engine.js';
import { keyboardSVG, seg, sel, playBtn, simp, esc } from './draw.js';

const PCS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
// ступень → полутоны (для голосов, включая 10 = терция через октаву)
const SEM = { 1: 0, b9: 1, 9: 2, '#9': 3, b3: 3, 3: 4, 11: 5, 4: 5, '#11': 6, b5: 6, 5: 7, '#5': 8, b13: 8, 6: 9, 13: 9, bb7: 9, b7: 10, 7: 11, b10: 15, 10: 16 };
const LBL = (d) => degLabel(d === 'b10' ? 'b3' : d === '10' ? '3' : d);
// разложить ступени снизу вверх от нижней границы
function placeUp(pc, degs, lo) { const out = []; let prev = lo - 1; degs.forEach((d, i) => { let m = lo - 12 + ((pc + SEM[d]) % 12 + 12) % 12; if (i === 0) { while (m < lo) m += 12; } else while (m <= prev) m += 12; out.push(m); prev = m; }); return out; }
const near = (pc, lo) => lo + ((pc - lo % 12 + 120) % 12);

export function jazzLabs({ T, L, snd, fact, sp, rootSel, voiceSimple, scName }) {
  const LABS = {};
  const tone = (d) => (/^(1|b3|3|b5|5|#5|b7|7|bb7|6|4)$/.test(d) ? 'on' : 'alt');

  /* ---------- Альтерации в левой руке (Левайн, «The Jazz Piano Book») ---------- */
  const LHALT = [
    ['m7♭5', [['b3', 'b5', 'b7', '9'], ['b7', '9', 'b3', 'b5'], ['1', '11', 'b5', 'b7'], ['b5', 'b7', '9', '11'], ['11', 'b5', 'b7', '9']]],
    ['7♭9', [['3', '13', 'b7', 'b9'], ['b7', 'b9', '3', '13']]],
    ['7♯5', [['3', 'b13', 'b7', '9'], ['b7', '9', '3', 'b13']]],
    ['7alt', [['3', 'b13', 'b7', '#9'], ['b7', '#9', '3', 'b13']]],
    ['7♯11', [['b7', '9', '#11', '13'], ['#11', '13', 'b7', '9'], ['b7', '3', '#11', '13']]],
    ['7♯9', [['3', '5', 'b7', '#9']]],
    ['m(maj7)', [['b3', '5', '7', '9'], ['7', '9', 'b3', '5']]],
    ['°7', [['1', 'b3', 'b5', '7']]],
    ['7sus4', [['1', '4', 'b7', '9'], ['b7', '9', '4', '5']]],
    ['phr', [['1', 'b9', '4', '5']]],
  ];
  LABS.lhalt = {
    st: { root: 'G', i: 3, v: 0 },
    ms(s) { const r = pcOf(rootN(s.root)), degs = LHALT[s.i][1][s.v] || LHALT[s.i][1][0]; return { degs, ms: placeUp(r, degs, 50) }; },
    render(s) {
      const [id, vs] = LHALT[s.i], { degs, ms } = this.ms(s), marks = {};
      ms.forEach((m, k) => { marks[m] = { c: tone(degs[k]), t: LBL(degs[k]) }; });
      const bass = 36 + pcOf(rootN(s.root)) - (pcOf(rootN(s.root)) > 7 ? 12 : 0); marks[bass] = { c: 'root', t: '1' };
      return '<div class="bkctl">' + rootSel('root', s.root, MAJ_ROOTS.map((x) => [x, x])) + sel('i', LHALT.map(([x], i) => [i, x === 'phr' ? 'sus♭9' : x]), s.i, T('ui.chord')) + (vs.length > 1 ? seg('v', vs.map((_, k) => [k, String.fromCharCode(65 + k)]), Math.min(s.v, vs.length - 1)) : '') + '</div>' +
        '<div class="bkbig">' + nm(rootN(s.root)) + (id === 'phr' ? 'sus♭9' : id) + ' · ' + degs.map(LBL).join(' – ') + '</div><p class="bknote">' + T('la.n.' + (id === 'phr' ? 'phr' : id.replace(/[♭♯()°]/g, (c) => ({ '♭': 'b', '♯': 's', '(': '', ')': '', '°': 'd' })[c]))) + '</p>' +
        keyboardSVG(marks, { lo: 36, hi: 77 }) + '<div class="bkrow">' + playBtn('data-a="p"') + (id === '7alt' ? playBtn('data-a="sub"', T('la.sub', { r: nm(simp(up(rootN(s.root), 'b5'))) + '7' })) : '') + '</div>';
    },
    set(s, k) { if (k === 'i') s.v = 0; this.on(s, 'p'); },
    on(s, a) {
      const { ms } = this.ms(s), r = pcOf(rootN(s.root)), bass = 36 + r - (r > 7 ? 12 : 0);
      if (a === 'sub') { const sb = (r + 6) % 12, b2 = 36 + sb - (sb > 7 ? 12 : 0); snd.prog([[bass, ...ms], [b2, ...ms]], 1.4); return false; }
      snd.chord([bass, ...ms], { dur: 1.8 });
    },
  };

  /* ---------- Правило A/B по ходу корня («Джазология») ---------- */
  const AB = { maj: [['3', '5', '7', '9'], ['7', '9', '3', '5']], min: [['b3', '5', 'b7', '9'], ['b7', '9', 'b3', '5']], dom: [['3', '13', 'b7', '9'], ['b7', '9', '3', '13']], hdim: [['b3', 'b5', 'b7', '1'], ['b7', '1', 'b3', 'b5']], dim: [['1', 'b3', 'b5', 'bb7'], ['b5', 'bb7', '1', 'b3']], sus: [['1', '4', 'b7', '9'], ['b7', '9', '4', '5']], aug: [['3', '#5', '7', '9'], ['7', '9', '3', '#5']] };
  const PRESET = ['Dm7 G7 | Cmaj7 | Em7 A7 | Dm7 G7', 'Cmaj7 | A7 | Dm7 | G7', 'Fmaj7 | E♭7 | Dm7 | D♭7 | Cmaj7', 'Am7 D7 | Gmaj7 Cmaj7 | F♯m7♭5 B7 | Em6'];
  LABS.abrule = {
    st: { text: PRESET[0], p: 0, start: 0 },
    build(s) {
      const toks = []; String(s.text).split('|').forEach((b) => b.trim().split(/\s+/).filter(Boolean).forEach((t) => { const c = parseChord(t); if (c) toks.push({ ...c, sym: t }); }));
      let prev = null, type = s.start;
      return toks.map((c, i) => {
        let why = 'start';
        if (i) {
          const d = (pcOf(c.root) - pcOf(toks[i - 1].root) + 12) % 12, step = Math.min(d, 12 - d);
          if (step === 1 || step === 2) why = 'second';
          else if (step === 5) { why = 'fourth'; type = 1 - type; }
          else if (step === 0) why = 'same';
          else why = 'third';
        }
        const pc = pcOf(c.root), set = AB[c.fam] || AB.dom;
        let ms = placeUp(pc, set[type], 50);
        if (why === 'third' || why === 'start' || why === 'same') {
          const other = placeUp(pc, set[1 - type], 50), avg = (v) => v.reduce((x, y) => x + y, 0) / v.length;
          if (prev && Math.abs(avg(other) - avg(prev)) < Math.abs(avg(ms) - avg(prev)) && why === 'third') { type = 1 - type; ms = other; }
        }
        prev = ms;
        return { c, ms, type, why, degs: set[type] };
      });
    },
    render(s) {
      const vs = this.build(s);
      return '<div class="bkctl">' + sel('p', PRESET.map((x, i) => [i, x]), s.p, T('ui.example')) + seg('start', [[0, 'A'], [1, 'B']], s.start) + '</div>' +
        '<textarea data-in="text" rows="2" spellcheck="false" aria-label="' + T('ui.chords') + '">' + esc(s.text) + '</textarea>' +
        '<div class="bkvrow">' + vs.map((x, i) => '<button class="vc" data-a="c:' + i + '"><b>' + esc(x.c.sym) + '</b><small>' + x.degs.map(LBL).join(' · ') + '</small><em>' + (x.type ? 'B' : 'A') + ' — ' + T('ab.' + x.why) + '</em></button>').join('') + '</div>' +
        '<div class="bkrow">' + playBtn('data-a="play"') + sp('ab.hint') + '</div>';
    },
    set(s, k) { if (k === 'p') s.text = PRESET[s.p]; },
    on(s, a) {
      const vs = this.build(s), ch = (x) => [36 + pcOf(x.c.root) - (pcOf(x.c.root) > 7 ? 12 : 0), ...x.ms];
      if (a === 'play') snd.prog(vs.map(ch), 1.1);
      if (a.startsWith('c:')) snd.chord(ch(vs[+a.slice(2)]), { dur: 1.6 });
    },
  };

  /* ---------- Одно расположение — пять аккордов («Джазология») ---------- */
  // голос C13 типа A: 3–13–♭7–9 (E A B♭ D) над пятью басами
  const ONE = [['0', '13', 'v13'], ['6', '7alt', 'valt'], ['4', 'm7♭5', 'hd'], ['9', '7sus4♭9', 'phr'], ['7', 'm6/9', 'm69']];
  LABS.onevoice = {
    st: { root: 'C', i: 0 },
    render(s) {
      const r = pcOf(rootN(s.root)), vo = placeUp(r, ['3', '13', 'b7', '9'], 52), x = ONE[s.i], b = (r + +x[0]) % 12, bass = 36 + b - (b > 7 ? 12 : 0), marks = { [bass]: { c: 'root', t: nm(simp(up(rootN(s.root), PCS[+x[0]]))) } };
      vo.forEach((m) => { marks[m] = { c: 'alt', t: degLabel(PCS[(m - b + 120) % 12]) }; });
      return '<div class="bkctl">' + rootSel('root', s.root, MAJ_ROOTS.map((y) => [y, y])) + sp('ov2.hint') + '</div><div class="bkchips">' + ONE.map((y, i) => '<button class="chipc wide' + (i === s.i ? ' on' : '') + '" data-a="b:' + i + '">' + nm(simp(up(rootN(s.root), PCS[+y[0]]))) + y[1] + '</button>').join('') + '</div>' +
        '<p class="bknote">' + T('ov2.' + x[2]) + '</p>' + keyboardSVG(marks, { lo: 36, hi: 77 }) + '<div class="bkrow">' + playBtn('data-a="all"', T('ov2.all')) + '</div>';
    },
    on(s, a) {
      const r = pcOf(rootN(s.root)), vo = placeUp(r, ['3', '13', 'b7', '9'], 52), bassOf = (y) => { const b = (r + +y[0]) % 12; return 36 + b - (b > 7 ? 12 : 0); };
      if (a.startsWith('b:')) { s.i = +a.slice(2); snd.chord([bassOf(ONE[s.i]), ...vo], { dur: 1.8 }); return; }
      if (a === 'all') snd.prog(ONE.map((y) => [bassOf(y), ...vo]), 1.1);
    },
  };

  /* ---------- Голоса двумя руками: каталог по виду аккорда и верхней ноте ---------- */
  // [id, вид, левая рука, правая рука, источник] — ступени от корня, снизу вверх
  const HV = [
    ['sw', 'm7', ['1', '4'], ['b7', 'b3', '5'], 'piano'], ['kb', 'm7', ['1', '5', '9'], ['b3', 'b7', '11'], 'piano'], ['st3', 'm7', ['1', 'b3', '5'], ['b7', '9', '11'], 'piano'], ['jm7', 'm7', ['b3', '5', 'b7'], ['9', '5', '1'], 'jazzology'],
    ['swM', 'maj7', ['3', '6'], ['9', '5', '7'], 'piano'], ['q69', 'maj7', ['3', '6'], ['9', '5', '1'], 'piano'], ['jmaj', 'maj7', ['7', '3', '6'], ['9', '5'], 'jazzology'], ['triD', 'maj7', ['1'], ['9', '#11', '13'], 'levine'],
    ['swL', 'lyd', ['7', '3'], ['6', '9', '#11'], 'piano'], ['jlyd', 'lyd', ['3', '6'], ['#11', '7', '3'], 'jazzology'],
    ['q6', '7', ['b7', '3', '13'], ['9', '5', '1'], 'piano'], ['j7', '7', ['3', 'b7'], ['3', '13', '9'], 'jazzology'], ['usII', '7', ['3', 'b7'], ['9', '#11', '13'], 'piano'],
    ['usbVI', '7alt', ['3', 'b7'], ['b13', '1', '#9'], 'piano'], ['jalt', '7alt', ['3', 'b7', 'b9'], ['#5', 'b7', '#9'], 'jazzology'],
    ['usVI', '7♭9', ['3', 'b7'], ['13', 'b9', '3'], 'piano'], ['dd', '7♭9', ['3', '5', 'b7', 'b9'], ['b9', '3', '5', '1'], 'piano'],
    ['susT', '7sus4', ['1'], ['4', 'b7', '9'], 'levine'], ['jsus', '7sus4', ['1', 'b7'], ['9', '11', '13'], 'jazzology'],
    ['jhd', 'm7♭5', ['1', '4', 'b5', 'b7'], ['9', '11'], 'jazzology'],
  ];
  const HKIND = ['m7', 'maj7', 'lyd', '7', '7alt', '7♭9', '7sus4', 'm7♭5'];
  const topOf = (v) => v[3][v[3].length - 1];
  const handsMs = (rp, v) => { const lh = placeUp(rp, v[2], 48); const rh = placeUp(rp, v[3], Math.max(60, lh[lh.length - 1] + 1)); return { lh, rh }; };
  LABS.hands = {
    st: { root: 'D', k: 'm7', top: '', i: 0 },
    list(s) { return HV.filter((v) => v[1] === s.k && (!s.top || topOf(v) === s.top)); },
    render(s) {
      const r = rootN(s.root), rp = pcOf(r), all = HV.filter((v) => v[1] === s.k), tops = [...new Set(all.map(topOf))], list = this.list(s), cur = list[s.i] || list[0];
      const sym = nm(r) + (s.k === 'lyd' ? 'maj7♯11' : s.k);
      let kb = '';
      if (cur) { const { lh, rh } = handsMs(rp, cur), marks = {}; lh.forEach((m, k) => { marks[m] = { c: 'b', t: LBL(cur[2][k]) }; }); rh.forEach((m, k) => { marks[m] = { c: 'alt', t: LBL(cur[3][k]) }; }); kb = keyboardSVG(marks, { lo: 41, hi: 84 }); }
      return '<div class="bkctl">' + rootSel('root', s.root, MAJ_ROOTS.map((x) => [x, x])) + sel('k', HKIND.map((x) => [x, x === 'lyd' ? 'maj7♯11' : x]), s.k, T('ui.chord')) + seg('top', [['', T('hd.any')], ...tops.map((t) => [t, LBL(t)])], s.top) + '</div>' +
        '<div class="bkvrow">' + list.map((v, i) => '<button class="vc' + (v === cur ? ' on' : '') + '" data-a="v:' + i + '"><b>' + T('hd.' + v[0]) + '</b><small>' + v[2].map(LBL).join('·') + ' | ' + v[3].map(LBL).join('·') + '</small><em>' + T('hd.top', { d: LBL(topOf(v)) }) + '</em></button>').join('') + '</div>' +
        (cur ? '<div class="bkbig">' + sym + ' — ' + T('hd.' + cur[0]) + '</div><p class="bknote">' + T('hd.n.' + cur[0]) + ' ' + T('hd.lr') + '</p>' + kb : '<p class="bkhint">' + T('hd.none') + '</p>') +
        '<div class="bkrow">' + playBtn('data-a="p"') + playBtn('data-a="iivi"', T('hd.iivi')) + '</div>';
    },
    set(s, k) { if (k === 'k') { s.top = ''; s.i = 0; } if (k === 'top') s.i = 0; this.on(s, 'p'); },
    on(s, a) {
      if (a.startsWith('v:')) s.i = +a.slice(2);
      if (a === 'iivi') {
        // ii–V–I в C: все четыре голоса вниз (Gsus — G7♭9 (VI) — CΔ кварты), затем Gsus — G7alt (♭VI) — CΔ So What
        snd.prog([[43, 60, 65, 69], [41, 59, 64, 68], [40, 57, 62, 67], [43, 60, 65, 69], [41, 47, 58, 63, 67], [40, 45, 62, 67, 71]], 1.1);
        return false;
      }
      const list = this.list(s), cur = list[s.i] || list[0]; if (!cur) return false;
      const { lh, rh } = handsMs(pcOf(rootN(s.root)), cur); snd.chord([...lh, ...rh], { dur: 2 });
    },
  };

  /* ---------- So What: одна форма — три аккорда, обращения и сдвиг ---------- */
  // форма: кварта–кварта–кварта–большая терция (от нижнего звука: 0 5 10 15 19)
  const SW = [0, 5, 10, 15, 19];
  const SWK = [['m7', '1', 'D', 0], ['maj7', '3', 'B♭', 4], ['lyd', '7', 'E♭', 11]];
  LABS.sowhat = {
    st: { k: 0, inv: 0, sh: 0, how: 'dia' },
    notes(s) {
      // базовая форма от D3 (50): D G C F A; сдвиг: по звукам ре дорийского или по полутонам
      const DOR = [0, 2, 3, 5, 7, 9, 10];
      let ms = SW.map((x) => 50 + x);
      for (let k = 0; k < s.inv; k++) ms = [...ms.slice(1), ms[0] + 12];
      if (s.how === 'chr') ms = ms.map((m) => m + s.sh);
      else ms = ms.map((m) => { const p = (m - 50 + 120) % 12, i = DOR.indexOf(p), j = i + s.sh, o = Math.floor(j / 7); return m - p + DOR[((j % 7) + 7) % 7] + o * 12; });
      return ms;
    },
    render(s) {
      const [kind, top, bass, bo] = SWK[s.k], ms = this.notes(s), bm = 36 + (pcOf(rootN(bass)) - (pcOf(rootN(bass)) > 7 ? 12 : 0)), marks = { [bm]: { c: 'root', t: bass } };
      ms.forEach((m) => { marks[m] = { c: 'alt', t: degLabel(PCS[(m - bm + 120) % 12]) }; });
      void bo;
      return '<div class="bkctl">' + seg('k', SWK.map(([x, , b], i) => [i, b + (x === 'lyd' ? 'maj7♯11' : x)]), s.k) + seg('how', [['dia', T('sw.dia')], ['chr', T('sw.chr')]], s.how) + '</div>' +
        '<div class="bkctl"><button class="ib" data-a="dn" aria-label="−">▼</button><button class="ib" data-a="up" aria-label="+">▲</button>' + seg('inv', [0, 1, 2, 3, 4].map((i) => [i, i ? T('sw.inv', { n: i }) : T('sw.base')]), s.inv) + '</div>' +
        '<p class="bknote">' + T('sw.n.' + kind, { top: degLabel(top) }) + '</p>' + keyboardSVG(marks, { lo: 36, hi: 84 }) + '<div class="bkrow">' + playBtn('data-a="p"') + playBtn('data-a="walk"', T('sw.walk')) + '</div>';
    },
    set(s) { this.on(s, 'p'); },
    on(s, a) {
      const bass = (k) => { const b = pcOf(rootN(SWK[k][2])); return 36 + b - (b > 7 ? 12 : 0); };
      if (a === 'up') s.sh++; if (a === 'dn') s.sh--;
      if (a === 'walk') { const save = s.sh, seq = [0, 1, 2, 1, 0, -1, 0].map((k) => { s.sh = k; return [38, ...this.notes(s)]; }); s.sh = save; snd.prog(seq, 0.55); return false; }
      snd.chord([bass(s.k), ...this.notes(s)], { dur: 1.8 });
    },
  };

  /* ---------- Полная таблица заимствований: 8 ладов × 7 ступеней («Джазология») ---------- */
  const MIG = [
    ['harm', [['1', 'm(maj7)'], ['2', 'm7♭5'], ['b3', 'maj7♯5'], ['4', 'm7'], ['5', '7♭9'], ['b6', 'maj7'], ['7', '°7']]],
    ['mel', [['1', 'm(maj7)'], ['2', 'm7'], ['b3', 'maj7♯5'], ['4', '7♯11'], ['5', '9'], ['6', 'm7♭5'], ['7', 'm7♭5']]],
    ['nat', [['1', 'm7'], ['2', 'm7♭5'], ['b3', 'maj7'], ['4', 'm7'], ['5', 'm7'], ['b6', 'maj7'], ['b7', '7']]],
    ['dor', [['1', 'm7'], ['2', 'm7'], ['b3', 'maj7'], ['4', '7'], ['5', 'm7'], ['6', 'm7♭5'], ['b7', 'maj7']]],
    ['phr', [['1', 'm7'], ['b2', 'maj7'], ['b3', '7'], ['4', 'm7'], ['5', 'm7♭5'], ['b6', 'maj7'], ['b7', 'm7']]],
    ['lyd', [['1', 'maj7'], ['2', '7'], ['3', 'm7'], ['#4', 'm7♭5'], ['5', 'maj7'], ['6', 'm7'], ['7', 'm7']]],
    ['mix', [['1', '7'], ['2', 'm7'], ['3', 'm7♭5'], ['4', 'maj7'], ['5', 'm7'], ['6', 'm7'], ['b7', 'maj7']]],
    ['loc', [['1', 'm7♭5'], ['b2', 'maj7'], ['b3', 'm7'], ['4', 'm7'], ['b5', 'maj7'], ['b6', '7'], ['b7', 'm7']]],
  ];
  const RN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const rnOf = (d, q) => { const i = +d.replace(/[b#]/g, '') - 1, pre = d[0] === 'b' ? '♭' : d[0] === '#' ? '♯' : '', low = /^m|°/.test(q) && !/^maj/.test(q); return pre + (low ? RN[i].toLowerCase() : RN[i]) + q; };
  LABS.migrid = {
    st: { key: 'C', r: 2, c: 5 },
    render(s) {
      const k = rootN(s.key);
      return '<div class="bkctl">' + rootSel('key', s.key, MAJ_ROOTS.map((x) => [x, x])) + sp('mg.hint') + '</div><div class="bktw"><table class="mig"><thead><tr><th></th>' + RN.map((x) => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>' +
        MIG.map(([m, row], i) => '<tr><th>' + T('mg.' + m) + '</th>' + row.map(([d, q], j) => '<td class="click' + (i === s.r && j === s.c ? ' on' : '') + '" data-a="x:' + i + ':' + j + '"><b>' + nm(simp(up(k, d))) + q + '</b><small>' + rnOf(d, q) + '</small></td>').join('') + '</tr>').join('') + '</tbody></table></div><p class="bknote">' + T('mg.note') + '</p>';
    },
    on(s, a) {
      if (!a.startsWith('x:')) return false;
      const [, i, j] = a.split(':').map(Number); s.r = i; s.c = j;
      const k = rootN(s.key), [d, q] = MIG[i][1][j], I = voiceSimple({ r: k, id: 'maj7' });
      snd.prog([I, voiceSimple({ r: simp(up(k, d)), id: chordById(q) ? q : q === '9' ? '9' : '7' }), I], 1.1);
    },
  };

  /* ---------- Какая доминанта куда тянет: ♭9, alt, ♯11 и тритоновые двойники (Левайн) ---------- */
  // цели от корня доминанты: [ступень цели, ключ пояснения]
  const DK = {
    b9: [['4', 'q5'], ['4m', 'q5m'], ['7', 'semi'], ['b6', 'b3down']],
    alt: [['4', 'q5'], ['b2', 'semiUp'], ['b6', 'b3down']],
    s11: [['7', 'semi'], ['5', 'q4down'], ['2', 'toneUp'], ['1m', 'iiSameRoot']],
  };
  LABS.domkind = {
    st: { root: 'E', k: 'alt' },
    render(s) {
      const r = rootN(s.root), id = s.k === 'b9' ? '7♭9' : s.k === 'alt' ? '7alt' : '7♯11', twin = simp(up(r, 'b5'));
      const tg = DK[s.k].map(([d, w], i) => { const minor = /m$/.test(d), dd = d.replace(/m$/, ''); const t = dd === '1' ? r : simp(up(r, dd)); return '<button class="bkli" data-a="t:' + i + '"><b>' + nm(r) + id + ' → ' + nm(t) + (minor ? 'm7' : 'maj7') + '</b><span>' + T('dk.' + w) + '</span></button>'; }).join('');
      return '<div class="bkctl">' + rootSel('root', s.root, MAJ_ROOTS.map((x) => [x, x])) + seg('k', [['b9', '7♭9'], ['alt', '7alt'], ['s11', '7♯11']], s.k) + '</div>' +
        '<p class="bknote">' + T('dk.n.' + s.k, { tw: nm(twin) + (s.k === 'alt' ? '7♯11' : s.k === 's11' ? '7alt' : '7♭9') }) + '</p><div class="bklist">' + tg + '</div>';
    },
    on(s, a) {
      if (!a.startsWith('t:')) return false;
      const r = rootN(s.root), [d] = DK[s.k][+a.slice(2)], minor = /m$/.test(d), dd = d.replace(/m$/, ''), t = dd === '1' ? r : simp(up(r, dd));
      snd.prog([voiceSimple({ r, id: s.k === 'b9' ? '7♭9' : s.k === 'alt' ? '7alt' : '7♯11' }), voiceSimple({ r: t, id: minor ? 'm7' : 'maj7' })], 1.2);
      return false;
    },
  };

  /* ---------- Проверка тритоновой замены по мелодии (Левайн) ---------- */
  LABS.ttcheck = {
    st: { root: 'G', mel: 'A' },
    render(s) {
      const r = rootN(s.root), sub = simp(up(r, 'b5')), m = pcOf(rootN(s.mel));
      const before = degLabel(PCS[(m - pcOf(r) + 12) % 12]).replace('♭6', '♭13').replace(/^6$/, '13').replace(/^2$/, '9').replace('♭2', '♭9').replace('♭3', '♯9').replace(/^4$/, '11').replace('♭5', '♯11');
      const after = degLabel(PCS[(m - pcOf(sub) + 12) % 12]).replace('♭6', '♭13').replace(/^6$/, '13').replace(/^2$/, '9').replace('♭2', '♭9').replace('♭3', '♯9').replace(/^4$/, '11').replace('♭5', '♯11');
      const good = (x) => ['1', '3', '5', '♭7', '9', '13', '♯11'].includes(x) ? 'ok' : ['♭9', '♯9', '♭13', '♯5'].includes(x) ? 'alt' : 'bad';
      return '<div class="bkctl">' + rootSel('root', s.root, MAJ_ROOTS.map((x) => [x, x])) + '<label class="bkfld">' + T('tc.mel') + ' ' + sel('mel', ALL12.map((x) => [x, x]), s.mel) + '</label></div>' +
        '<div class="ba"><div><small>' + T('rh.before') + '</small><div class="bkbig">' + nm(r) + '7: ' + T('tc.is', { d: before }) + '</div><span class="tcv ' + good(before) + '">' + T('tc.' + good(before)) + '</span></div>' +
        '<div><small>' + T('rh.after') + '</small><div class="bkbig">' + nm(sub) + '7: ' + T('tc.is', { d: after }) + '</div><span class="tcv ' + good(after) + '">' + T('tc.' + good(after)) + '</span></div></div><p class="bknote">' + T('tc.note') + '</p>' +
        '<div class="bkrow">' + playBtn('data-a="a"', nm(r) + '7') + playBtn('data-a="b"', nm(sub) + '7') + '</div>';
    },
    on(s, a) {
      const r = rootN(s.root), sub = simp(up(r, 'b5')), mel = near(pcOf(rootN(s.mel)), 72), tgt = simp(up(r, '4'));
      const v = (x) => voiceSimple({ r: x, id: '7' });
      snd.play({ notes: [[0, a === 'b' ? v(sub) : v(r), 1.1, 0.35], [0, mel, 1.1, 0.7], [1.2, voiceSimple({ r: tgt, id: 'maj7' }), 1.3, 0.35]] });
      return false;
    },
  };

  /* ---------- Одна нота — много аккордов (Алексеев) / аккорд на любом басу (Левайн) ---------- */
  // где нота — звук аккорда или доступное напряжение: для каждого корня (баса) — подходящие виды
  const KINDS = [['maj7', ['1', '3', '5', '7', '9', '#4', '6']], ['6', ['1', '3', '5', '6', '9']], ['m7', ['1', 'b3', '5', 'b7', '9', '4', '6']], ['7', ['1', '3', '5', 'b7', '9', '6']], ['7alt', ['1', '3', 'b7', 'b2', 'b3', 'b6', '#4']], ['7sus4', ['1', '4', '5', 'b7', '9', '6']], ['m7♭5', ['1', 'b3', 'b5', 'b7', '4', 'b6', '9']], ['7♯11', ['1', '3', '5', 'b7', '9', '#4', '6']]];
  const TDEG = { 1: '1', b2: '♭9', 2: '9', b3: '♭3/♯9', 3: '3', 4: '11', '#4': '♯11', b5: '♭5', 5: '5', b6: '♭13', 6: '13', b7: '♭7', 7: '7', 9: '9' };
  function fits(notePc, rootPc) {
    const iv = (notePc - rootPc + 12) % 12, k = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'][iv], key2 = k === '2' ? '9' : k, out = [];
    KINDS.forEach(([id, ok]) => { if (ok.includes(k) || ok.includes(key2) || (id === 'm7♭5' && k === '#4' && ok.includes('b5'))) out.push([id, id === 'm7♭5' && k === '#4' ? '♭5' : TDEG[k] || k]); });
    return out;
  }
  LABS.onenote = {
    st: { n: 'B', pick: '' },
    render(s) {
      const p = pcOf(rootN(s.n)), rows = [];
      for (let k = 0; k < 12; k++) { const rp = (p + 12 - k) % 12, f = fits(p, rp); if (f.length) rows.push({ rp, f }); }
      const nameOf = (rp) => nm(simp(up(rootN(s.n), PCS[(rp - p + 12) % 12])));
      return '<div class="bkctl">' + sel('n', ALL12.map((x) => [x, x]), s.n, T('on.note')) + sp('on.hint') + '</div><div class="onrows">' +
        rows.map(({ rp, f }) => '<div class="onr"><b>' + nameOf(rp) + '</b>' + f.map(([id, d]) => { const key = rp + ':' + id; return '<button class="chipc' + (s.pick === key ? ' on' : '') + '" data-a="c:' + key + '"><b>' + nameOf(rp) + id + '</b><small>' + d + '</small></button>'; }).join('') + '</div>').join('') + '</div>';
    },
    on(s, a) {
      if (!a.startsWith('c:')) return false;
      s.pick = a.slice(2); const [rp, id] = s.pick.split(':'), p = pcOf(rootN(s.n));
      const r = rootN(nm(simp(up(rootN(s.n), PCS[(+rp - p + 12) % 12]))));
      snd.play({ notes: [[0, voiceSimple({ r, id: chordById(id) ? id : '7' }), 1.6, 0.35], [0, near(p, 72), 1.6, 0.7]] });
    },
  };

  /* ---------- Реармонизация тоники по ноте мелодии (Левайн) ---------- */
  const TONRE = [['1', 'up', 'D♭maj7'], ['5', 'up', 'D♭maj7'], ['3', 's5', 'Cmaj7♯5'], ['7', 's5', 'Cmaj7♯5'], ['#4', 'tri', 'B/C'], ['7', 'tri', 'B/C'], ['5', 'b6', 'Cmaj7♭6'], ['2', 'lyd', 'Cmaj7♯11']];
  LABS.tonicre = {
    st: { i: 0 },
    chordMs(sym) {
      if (sym === 'B/C') return [36, 59, 63, 66];
      if (sym === 'Cmaj7♭6') return [36, 52, 55, 56, 59];
      if (sym === 'Cmaj7♯5') return [36, 52, 56, 59];
      if (sym === 'Cmaj7♯11') return [36, 52, 54, 59, 62];
      return voiceSimple({ r: rootN('D♭'), id: 'maj7' });
    },
    render(s) {
      const x = TONRE[s.i];
      return '<div class="bklist">' + TONRE.map((y, i) => '<button class="bkli' + (i === s.i ? ' on' : '') + '" data-a="i:' + i + '"><b>' + T('tr2.mel', { d: degLabel(y[0]) }) + ' → ' + y[2] + '</b><span>' + T('tr2.' + y[1]) + '</span></button>').join('') + '</div>' +
        '<div class="bkrow">' + playBtn('data-a="a"', 'Cmaj7') + playBtn('data-a="b"', x[2]) + '</div>';
    },
    on(s, a) {
      if (a.startsWith('i:')) s.i = +a.slice(2);
      const x = TONRE[s.i], mel = 72 + SEM[x[0] === '2' ? '9' : x[0] === '#4' ? '#11' : x[0]] % 12;
      snd.play({ notes: [[0, a === 'b' || a.startsWith('i:') ? this.chordMs(x[2]) : voiceSimple({ r: rootN('C'), id: 'maj7' }), 1.8, 0.35], [0, mel, 1.8, 0.7]] });
    },
  };

  /* ---------- Тональные центры: ходы центра, формулы Колтрейна, деление октавы ---------- */
  const MOVES = [['q', '4'], ['tone', 'b7'], ['semi', '7'], ['b3', 'b6'], ['m3', '6']];
  LABS.centers = {
    st: { i: 0 },
    render(s) { return '<div class="bklist">' + MOVES.map(([k, d], i) => '<button class="bkli' + (i === s.i ? ' on' : '') + '" data-a="m:' + i + '"><b>C → ' + nm(simp(up(rootN('C'), d))) + '</b><span>' + T('ce.' + k) + '</span></button>').join('') + '</div>'; },
    on(s, a) {
      if (!a.startsWith('m:')) return false;
      s.i = +a.slice(2); const k = rootN('C'), t = simp(up(k, MOVES[s.i][1])), iivi = (x) => [voiceSimple({ r: simp(up(x, '2')), id: 'm7' }), voiceSimple({ r: simp(up(x, '5')), id: '7' }), voiceSimple({ r: x, id: 'maj7' })];
      snd.prog([...iivi(k), ...iivi(t)], 0.8);
    },
  };
  // формулы: ступени и виды от тоники I (♭VI = b6 и т. п.)
  const FORM = {
    count: [['2', 'm7'], ['b3', '7'], ['b6', 'maj7'], ['7', '7'], ['3', 'maj7'], ['5', '7'], ['1', 'maj7']],
    lady: [['1', 'maj7'], ['b3', '7'], ['b6', 'maj7'], ['b2', '7'], ['1', 'maj7']],
    barron: [['3', 'm7'], ['b3', '7'], ['b6', 'maj7'], ['b2', '7♯11'], ['1', 'maj7']],
    up3: [['1', 'maj7'], ['7', '7'], ['3', 'maj7'], ['5', '7'], ['1', 'maj7']],
    maj3: [['1', 'maj7'], ['b6', 'maj7'], ['3', 'maj7'], ['1', 'maj7']],
    min3: [['4', 'm7'], ['b7', '7'], ['b3', 'maj7'], ['7', 'm7'], ['3', '7'], ['6', 'maj7'], ['b6', 'm7'], ['b2', '7'], ['#4', 'maj7'], ['2', 'm7'], ['5', '7'], ['1', 'maj7']],
  };
  LABS.ctform = {
    st: { key: 'C', f: 'count' },
    seq(s) { const k = rootN(s.key); return FORM[s.f].map(([d, id]) => ({ r: d === '1' ? k : simp(up(k, d === '#4' ? '#4' : d)), id })); },
    render(s) {
      return '<div class="bkctl">' + rootSel('key', s.key, MAJ_ROOTS.map((x) => [x, x])) + sel('f', Object.keys(FORM).map((k) => [k, T('cf.' + k)]), s.f, T('ui.example')) + '</div>' +
        '<div class="bxs new">' + this.seq(s).map((x) => '<span class="bx">' + nm(x.r) + x.id + '</span>').join('') + '</div><p class="bknote">' + T('cf.n.' + s.f) + '</p><div class="bkrow">' + playBtn('data-a="p"') + '</div>';
    },
    on(s) { snd.prog(this.seq(s).map(voiceSimple), 0.85); },
  };
  // «Локрийский V» Маккоя Тайнера: трезвучие ♭II над корнем V → I; сверху — пентатоника ♭VI
  LABS.locv = {
    st: { key: 'G', v: 'loc' },
    render(s) {
      const k = rootN(s.key), v = simp(up(k, '5')), b2 = simp(up(v, 'b2')), b6 = simp(up(k, 'b6'));
      return '<div class="bkctl">' + rootSel('key', s.key, MAJ_ROOTS.map((x) => [x, x])) + seg('v', [['v7', nm(v) + '7'], ['loc', nm(b2) + '/' + nm(v)]], s.v) + '</div>' +
        '<p class="bknote">' + T('lv.n', { v: nm(v), b: nm(b2), k: nm(k), p: nm(b6) }) + '</p><div class="bkrow">' + playBtn('data-a="p"') + playBtn('data-a="pent"', T('lv.pent', { p: nm(b6) })) + '</div>';
    },
    set(s) { this.on(s, 'p'); },
    on(s, a) {
      const k = pcOf(rootN(s.key)), v = (k + 7) % 12, vb = 36 + v - (v > 7 ? 12 : 0), kb = 36 + k - (k > 7 ? 12 : 0);
      const chord = s.v === 'loc' ? [vb, near((v + 1) % 12, 55), near((v + 5) % 12, 58), near((v + 8) % 12, 62)] : voiceSimple({ r: rootN(MAJ_ROOTS[v]), id: '7' });
      const tonic = [kb, near((k + 7) % 12, 55), near(k, 59), near((k + 4) % 12, 63)];
      if (a === 'pent') { const b6 = (k + 8) % 12, pent = [0, 2, 4, 7, 9, 12].map((x) => near(b6, 67) + x - (x === 12 ? 0 : 0)); snd.play({ notes: [[0, chord, 1.7, 0.35], ...pent.map((m, i) => [i * 0.25, m, 0.24]), [1.7, tonic, 1.6, 0.35]] }); return false; }
      snd.prog([chord, tonic], 1.3);
    },
  };

  void CHORDS; void fact; void scName; void N; void L; void IV;
  return LABS;
}
