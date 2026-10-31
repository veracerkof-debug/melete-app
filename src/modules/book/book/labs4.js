// Учебник, часть 4 «Игра»: схемы глав latin, forms, arr, lines, outside, trad (по «Джазологии», книгам Левайна и Алексееву).
// Контракт — как в labs.js; tap(st, midi) — касание клавиши (для схем, где звуки кладут руками). Мелодии — свои, учебные.
import { N, pcOf, nm, up, rootN, MAJ_ROOTS, IV, degLabel, scaleById } from './engine.js';
import { keyboardSVG, staffSVG, seg, sel, playBtn, simp, esc } from './draw.js';
import { scoreSVG } from './score.js';

const SHARP = [N(0, 0), N(0, 1), N(1, 0), N(1, 1), N(2, 0), N(3, 0), N(3, 1), N(4, 0), N(4, 1), N(5, 0), N(5, 1), N(6, 0)];
const FLAT = [N(0, 0), N(1, -1), N(1, 0), N(2, -1), N(2, 0), N(3, 0), N(4, -1), N(4, 0), N(5, -1), N(5, 0), N(6, -1), N(6, 0)];
const noteOf = (m, flats) => (flats ? FLAT : SHARP)[((m % 12) + 12) % 12];
const FLATKEYS = new Set([5, 10, 3, 8, 1, 6]); // F B♭ E♭ A♭ D♭ G♭
const isFlat = (pc) => FLATKEYS.has(((pc % 12) + 12) % 12);
const near = (pc, lo) => lo + ((pc - lo % 12 + 120) % 12);
const mod = (x) => ((x % 12) + 12) % 12;
const lit = (el, c, i) => { if (el && el.querySelectorAll) el.querySelectorAll(c).forEach((x, k) => x.classList.toggle('lit', k === i)); };
const SEM = { 1: 0, b9: 1, 9: 2, '#9': 3, b3: 3, 3: 4, 11: 5, 4: 5, '#11': 6, b5: 6, 5: 7, '#5': 8, b13: 8, 6: 9, 13: 9, bb7: 9, b7: 10, 7: 11 };
function placeUp(pc, degs, lo) { const out = []; let prev = lo - 1; degs.forEach((d) => { let m = near(mod(pc + SEM[d]), lo); while (m <= prev) m += 12; out.push(m); prev = m; }); return out; }
const DEG = {
  maj: ['1', '♭9', '9', '♯9', '3', '11', '♯11', '5', '♯5', '13', '♭7', '7'],
  dom: ['1', '♭9', '9', '♯9', '3', '11', '♯11', '5', '♭13', '13', '♭7', '7'],
  min: ['1', '♭9', '9', '♭3', '3', '11', '♭5', '5', '♭13', '13', '♭7', '7'],
};

export function playLabs({ T, L, snd, sp, rootSel, voiceSimple }) {
  const LABS = {};
  const ivAb = (k) => String((L.IV[k] || [k, k])[1]).split(' · ')[0];
  const SEMK4 = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'], SEMK5 = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
  const KEYS = MAJ_ROOTS.map((r) => [r, r]);

  /* ---------- Клаве, монтуно и тумбао (Левайн: «The Jazz Theory Book», «The Jazz Piano Book») ---------- */
  // 16 восьмых = два такта. Сон-клаве: «трёхударный» такт 1, 2+, 4; «двухударный» 2, 3. Румба: третий удар на 4+.
  const clave = (dir, rumba) => { const three = rumba ? [0, 3, 7] : [0, 3, 6], two = [2, 4]; return dir === '32' ? [...three, ...two.map((x) => x + 8)] : [...two, ...three.map((x) => x + 8)]; };
  const threeAt = (dir) => (dir === '32' ? 0 : 8);
  // монтуно по Левайну: такт «двойки» клаве — 1, 2, 2+, 3+, 4+; такт «тройки» — 1+, 2+, 3+, 4+; последняя нота — уже следующий аккорд
  const MONT = { two: [0, 2, 3, 5, 7], three: [1, 3, 5, 7] };
  const PHR = ['1001001000101100', '0010100010010010', '1010101010101010', '1000000010000000'];
  LABS.clave = {
    st: { dir: '32', rumba: 0, mode: 'g', c: 1, mo: 1, ba: 1, bpm: 104, mel: PHR[0], ph: 0 },
    render(s) {
      const cl = new Set(clave(s.dir, s.rumba)), t3 = threeAt(s.dir), bombo = t3 + 3, ponche = t3 + 6;
      const row = (lbl, on, cls = '') => '<div class="clrow"><b>' + lbl + '</b><div class="rgg" style="--n:16">' + Array.from({ length: 16 }, (_, i) => '<span class="rgc' + (on(i) ? ' on' : '') + (i % 2 === 0 ? ' beat' : '') + (i % 8 === 0 ? ' bar' : '') + (i === bombo || i === ponche ? ' bmb' : '') + cls + '">' + (i % 2 === 0 ? (i / 2) % 4 + 1 : '') + '</span>').join('') + '</div></div>';
      const ctl = '<div class="bkctl">' + seg('dir', [['32', '3-2'], ['23', '2-3']], s.dir) + seg('rumba', [[0, T('cl.son')], [1, T('cl.rumba')]], s.rumba) + seg('mode', [['g', T('cl.groove')], ['m', T('cl.mel')]], s.mode) + seg('bpm', [[88, '88'], [104, '104'], [176, '176']], s.bpm) + '</div>';
      if (s.mode === 'g') {
        const mont = new Set(), sides = s.dir === '32' ? ['three', 'two'] : ['two', 'three'];
        sides.forEach((sd, b) => MONT[sd].forEach((x) => mont.add(b * 8 + x)));
        const tog = (k, lbl) => '<button class="chipc' + (s[k] ? ' on' : '') + '" data-a="t:' + k + '" aria-pressed="' + !!s[k] + '">' + lbl + '</button>';
        return ctl + row(T('cl.clave'), (i) => cl.has(i)) + row(T('cl.mont'), (i) => mont.has(i)) + row(T('cl.bass'), (i) => i % 8 === 3 || i % 8 === 6) +
          '<p class="bknote">' + T('cl.note') + '</p><div class="bkchips">' + tog('c', T('cl.clave')) + tog('mo', T('cl.mont')) + tog('ba', T('cl.bass')) + '</div><div class="bkrow">' + playBtn('data-a="p"') + '</div>';
      }
      const score = (dir) => { const c = new Set(clave(dir, s.rumba)), b3 = threeAt(dir); let n = 0; [...s.mel].forEach((x, i) => { if (x === '1' && c.has(i)) n++; }); return { n, bo: s.mel[b3 + 3] === '1', po: s.mel[b3 + 6] === '1' }; };
      const tot = [...s.mel].filter((x) => x === '1').length, r32 = score('32'), r23 = score('23');
      const line = (dir, r) => '<div class="clres' + (dir === s.dir ? ' cur' : '') + '"><b>' + (dir === '32' ? '3-2' : '2-3') + '</b> ' + T('cl.hits', { n: r.n, t: tot }) + ' · ' + T('cl.bombo') + ' ' + (r.bo ? '✓' : '—') + ' · ' + T('cl.ponche') + ' ' + (r.po ? '✓' : '—') + '</div>';
      return ctl + '<div class="bkctl">' + sel('ph', PHR.map((_, i) => [i, T('cl.ph' + i)]), s.ph, T('ui.example')) + '</div>' + row(T('cl.clave'), (i) => cl.has(i)) +
        '<div class="clrow"><b>' + T('cl.melody') + '</b><div class="rgg" style="--n:16">' + [...s.mel].map((x, i) => '<button class="rgc' + (x === '1' ? ' on' : '') + (i % 2 === 0 ? ' beat' : '') + (i % 8 === 0 ? ' bar' : '') + (x === '1' && cl.has(i) ? ' hit' : '') + '" data-a="x:' + i + '" aria-pressed="' + (x === '1') + '">' + (i % 2 === 0 ? (i / 2) % 4 + 1 : '') + '</button>').join('') + '</div></div>' +
        line('32', r32) + line('23', r23) + '<p class="bknote">' + T(r32.n === r23.n ? 'cl.none' : r32.n > r23.n ? 'cl.fit32' : 'cl.fit23') + '</p><div class="bkrow">' + playBtn('data-a="p"') + sp('cl.hint') + '</div>';
    },
    set(s, k) { if (k === 'ph') s.mel = PHR[s.ph]; },
    on(s, a, el) {
      if (a.startsWith('t:')) { const k = a.slice(2); s[k] = s[k] ? 0 : 1; return; }
      if (a.startsWith('x:')) { const i = +a.slice(2), c = [...s.mel]; c[i] = c[i] === '1' ? '0' : '1'; s.mel = c.join(''); return; }
      const e = 30 / s.bpm, hits = [], notes = [], marks = [], cl = clave(s.dir, s.rumba), reps = s.mode === 'g' ? 2 : 2;
      // гармония монтуно: I – IV – V – IV по такту
      const CH = [0, 5, 7, 5], sides = s.dir === '32' ? ['three', 'two'] : ['two', 'three'];
      const tri = (r) => [r, r + 4, r + 7];
      const montNote = (r, k) => { const top = near(mod(r + [0, 4, 7, 4][k % 4]), 67), pcs = tri(r).map(mod); let inner = top - 1; while (!pcs.includes(mod(inner)) || mod(inner) === mod(top)) inner--; return [top - 12, inner, top]; };
      for (let rep = 0; rep < reps; rep++) {
        const base = rep * 16 * e;
        if (s.mode === 'm' || s.c) cl.forEach((i) => hits.push([base + i * e, 'clave', 0.85]));
        for (let i = 0; i < 16; i += 2) hits.push([base + i * e, i % 8 ? 'click' : 'clickHi', 0.2]);
        if (s.mode === 'm') [...s.mel].forEach((x, i) => { if (x === '1') hits.push([base + i * e, 'wood', 0.7]); });
        else {
          for (let b = 0; b < 2; b++) {
            const bar = rep * 2 + b, r = CH[bar % 4], nx = CH[(bar + 1) % 4];
            if (s.mo) MONT[sides[b]].forEach((x, k) => { const t = base + (b * 8 + x) * e, ch = x === 7 ? nx : r; notes.push([t, montNote(ch, k), x === 7 ? e * 2.6 : e * 0.9, 0.55]); });
            if (s.ba) { notes.push([base + (b * 8 + 3) * e, near(mod(r + 7), 36), e * 2.5, 0.75]); notes.push([base + (b * 8 + 6) * e, near(nx, 36), e * 4.5, 0.8]); }
          }
        }
        for (let i = 0; i < 16; i++) marks.push([base + i * e, () => lit(el, '.clrow .rgc', -1)]);
      }
      snd.play({ hits, notes, marks });
      return false;
    },
  };

  /* ---------- Длины частей формы (Левайн, гл. 17) ---------- */
  const FL = [['AABA', '8-8-8-8'], ['AABA', '8-8-8-12'], ['AABA', '16-16-8-16'], ['AABA', '12-12-8-12'], ['AABA', '16-16-16-16'], ['AABA', '8-8-4-8'], ['ABAC', '8-8-8-8'], ['AABC', '8-8-8-8'], ['ABCD', '8-8-8-10'], ['ABCDE', '8-8-8-10-4'], ['AABBA', '8-8-8-8-8'], ['AB', '16-16'], ['A', '12']];
  const parseFL = (s) => { const ls = [...String(s.letters).toUpperCase().replace(/[^A-Z]/g, '')].slice(0, 12), ns = String(s.lens).split(/[^0-9]+/).filter(Boolean).map(Number); return ls.map((x, i) => [x, Math.max(1, Math.min(64, ns[i] || ns[ns.length - 1] || 8))]); };
  LABS.flen = {
    st: { p: 0, letters: FL[0][0], lens: FL[0][1] },
    render(s) {
      const parts = parseFL(s), tot = parts.reduce((a, [, n]) => a + n, 0);
      return '<div class="bkctl">' + sel('p', FL.map((x, i) => [i, x[0] === 'A' ? T('fl.blues') : x[0] + ' · ' + x[1]]), s.p, T('ui.form')) + '</div><p class="bkhint">' + T('fl.p' + s.p) + '</p>' +
        '<div class="form">' + parts.map(([x, n]) => '<div class="fs s' + ('ABC'.includes(x) ? x : 'C') + '" style="flex:' + n + '"><b>' + (x === 'A' && parts.length === 1 ? '12' : x) + '</b><small>' + n + '</small></div>').join('') + '</div>' +
        '<div class="bkctl"><label class="bkfld">' + T('fl.letters') + ' <input data-in="letters" value="' + esc(s.letters) + '" size="7"></label><label class="bkfld">' + T('fl.lens') + ' <input data-in="lens" value="' + esc(s.lens) + '" size="12"></label></div>' +
        '<p class="bknote">' + T('fl.total', { n: tot }) + '</p>';
    },
    set(s, k) { if (k === 'p') { s.letters = FL[s.p][0]; s.lens = FL[s.p][1]; } },
    on() {},
  };

  /* ---------- Блочные аккорды (Левайн: C6 и °7 на бибоп-гамме) ---------- */
  const BM = { maj: [0, 2, 4, 5, 7, 8, 9, 11, 12], min: [0, 2, 3, 5, 7, 8, 9, 11, 12] };
  const MELS = { up: (k) => BM[k], down: (k) => BM[k].slice().reverse(), ph: (k) => (k === 'maj' ? [4, 5, 7, 9, 12, 11, 9, 7, 4] : [3, 5, 7, 9, 12, 11, 9, 7, 3]) };
  function blocks(s) {
    const kp = pcOf(rootN(s.key)), six = (s.kind === 'maj' ? [0, 4, 7, 9] : [0, 3, 7, 9]).map((x) => mod(x + kp)), dim = [11, 2, 5, 8].map((x) => mod(x + kp)), fl = isFlat(kp) || s.kind === 'min';
    return MELS[s.mel](s.kind).map((o) => {
      const m = 72 + mod(kp) - (kp > 6 ? 12 : 0) + o, isSix = six.includes(mod(m)), set = isSix ? six : dim, v = [m];
      let x = m - 1; while (v.length < 4) { if (set.includes(mod(x)) && mod(x) !== mod(m)) v.push(x); x--; }
      if (s.style === 'drop2') v[1] -= 12;
      if (s.style === 'shear') v.push(m - 12);
      const ms = v.sort((a, b) => a - b), lbl = isSix ? nm(rootN(s.key)) + (s.kind === 'maj' ? '6' : 'm6') : nm(noteOf(kp + 11, false)) + '°7';
      return { ms, isSix, lbl, fl, top: m };
    });
  }
  LABS.block = {
    st: { key: 'C', kind: 'maj', style: 'close', mel: 'up' },
    render(s) {
      const bs = blocks(s), items = [];
      bs.forEach((b, i) => { b.ms.forEach((m, k) => items.push({ n: noteOf(m, b.fl), m, d: 'q', chord: k > 0, c: b.isSix ? '' : 'alt', t: k === 0 ? (b.isSix ? '6' : '°7') : undefined })); if (i % 4 === 3 && i < bs.length - 1) items.push({ bar: '|' }); });
      items.push({ bar: '|.' });
      return '<div class="bkctl">' + rootSel('key', s.key, KEYS) + seg('kind', [['maj', T('bl.maj')], ['min', T('bl.min')]], s.kind) + sel('mel', [['up', T('bl.up')], ['down', T('bl.down')], ['ph', T('bl.ph')]], s.mel, T('ui.example')) + '</div>' +
        '<div class="bkctl">' + seg('style', [['close', T('bl.close')], ['shear', T('bl.shear')], ['drop2', 'drop 2']], s.style) + '</div>' + scoreSVG(items, { clef: 'treble' }) +
        '<p class="bknote">' + T('bl.n.' + s.style, { six: bs.find((b) => b.isSix).lbl, dim: (bs.find((b) => !b.isSix) || bs[0]).lbl, v: nm(simp(up(rootN(s.key), '5'))) }) + '</p><div class="bkrow">' + playBtn('data-a="p"') + '</div>';
    },
    on(s, a, el) { snd.seq(blocks(s).map((b) => b.ms), 0.42, 0.42); return false; },
  };

  /* ---------- Проверка расположения («Джазология», правила гармонизации) ---------- */
  const VK = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], 7: [0, 4, 7, 10], '7♭9': [0, 1, 4, 7, 10], 'm7♭5': [0, 3, 6, 10] };
  const VEX = [[36, 40, 43, 58, 61], [36, 52, 57, 58, 62], [41, 57, 60, 64, 67], [36, 46, 52, 57, 62]];
  function vchecks(s) {
    const r = pcOf(rootN(s.root)), ns = s.notes.slice().sort((a, b) => a - b), rel = ns.map((m) => mod(m - r)), has = (x) => rel.includes(x), out = [];
    if (ns.length < 2) return [];
    const third = s.id.startsWith('m') ? 3 : 4, sev = VK[s.id].includes(11) ? 11 : 10, dom = s.id.startsWith('7');
    out.push(['core', has(third) && has(sev)]);
    if (dom) out.push(['tri', has(4) && has(10)]);
    if (s.id === 'm7♭5') out.push(['five', has(6)]);
    let b9 = false; for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) if (ns[j] - ns[i] > 12 && mod(ns[j] - ns[i]) === 1) b9 = true;
    if (s.id !== '7♭9') out.push(['b9', !b9]);
    const n = ns.length, topI = ns[n - 1] - ns[n - 2];
    out.push(['top', topI !== 1], ['wide', topI <= 9]);
    let mud = false; for (let i = 0; i + 1 < n; i++) if (ns[i] < 50 && ns[i + 1] - ns[i] < 5) mud = true;
    out.push(['low', !mud]);
    out.push(['dbl', !(mod(ns[0] - r) === sev && mod(ns[n - 1] - r) === sev)]);
    const outside = rel.filter((x) => !VK[s.id].includes(x) && ![2, 5, 6, 8, 9].includes(x));
    out.push(['foreign', outside.length === 0]);
    return out;
  }
  LABS.vcheck = {
    st: { root: 'C', id: '7', notes: VEX[0], ex: 0 },
    render(s) {
      const r = pcOf(rootN(s.root)), marks = {}, f = isFlat(r) || s.id !== 'maj7';
      s.notes.forEach((m) => { const k = mod(m - r); marks[m] = { c: k === 0 ? 'root' : VK[s.id].includes(k) ? 'on' : 'alt', t: DEG[s.id.startsWith('m') ? 'min' : s.id === 'maj7' ? 'maj' : 'dom'][k] }; });
      const cs = vchecks(s);
      return '<div class="bkctl">' + rootSel('root', s.root, KEYS) + seg('id', Object.keys(VK).map((x) => [x, x === 'm7♭5' ? 'ø' : x]), s.id) + sel('ex', VEX.map((_, i) => [i, T('vk.ex' + i)]), s.ex, T('ui.example')) + '</div>' +
        keyboardSVG(marks, { lo: 36, hi: 79 }) + '<p class="bkhint">' + T('vk.hint') + ' · ' + s.notes.slice().sort((a, b) => a - b).map((m) => nm(noteOf(m, f))).join(' ') + '</p>' +
        '<div class="vkl">' + cs.map(([k, ok]) => '<div class="vk ' + (ok ? 'ok' : 'bad') + '"><b>' + (ok ? '✓' : '✗') + '</b><span>' + T('vk.' + k + (ok ? '' : 'X')) + '</span></div>').join('') + '</div>' +
        '<div class="bkrow">' + playBtn('data-a="p"') + '<button class="chipc" data-a="clr">' + T('vk.clear') + '</button></div>';
    },
    set(s, k) { if (k === 'ex') { s.notes = VEX[s.ex].slice(); s.root = 'C'; s.id = ['7', '7', 'maj7', 'm7'][s.ex]; if (s.ex === 2) s.root = 'F'; } },
    tap(s, m) { const i = s.notes.indexOf(m); if (i >= 0) s.notes.splice(i, 1); else if (s.notes.length < 8) s.notes.push(m); },
    on(s, a) { if (a === 'clr') { s.notes = []; return; } if (s.notes.length) snd.chord(s.notes.slice(), { dur: 2 }); return false; },
  };

  /* ---------- Перестройка аккорда по квартам и по квинтам (Алексеев) ---------- */
  const STK = [['C', '6/9', ['1', '3', '5', '6', '9']], ['F', '13', ['1', '3', '5', 'b7', '9', '13']], ['D', 'm11', ['1', 'b3', '5', 'b7', '9', '11']], ['E♭', 'maj13', ['1', '3', '5', '7', '9', '13']], ['A', 'm11♭5', ['1', 'b3', 'b5', 'b7', '11']], ['A', '9', ['1', '3', '5', 'b7', '9']],
    ['F', 'm11', ['1', 'b3', '5', 'b7', '9', '11']], ['G', '13', ['1', '3', '5', 'b7', '9', '13']], ['D', 'm9♭5', ['1', 'b3', 'b5', 'b7', '9']]];
  function stack(s) {
    const [rn, q, degs] = STK[s.ch], r = rootN(rn), rp = pcOf(r), bass = near(rp, 36);
    const up1 = degs.slice(1).map((d) => ({ d, pc: mod(rp + IV[d][1]) }));
    if (s.mode === 'th') return { r, q, bass, ups: placeUp(rp, degs.slice(1).map((d) => d.replace('11', '4').replace('13', '6')), 55).map((m, i) => ({ m, d: up1[i].d })) };
    const allow = s.mode === 'q4' ? [5, 6] : [7, 6], nodes = [...up1, { d: '1', pc: rp, opt: true }];
    let best = null;
    const dfs = (path, used, cost) => {
      const need = up1.every((u) => path.some((p) => p.d === u.d));
      if (need) { const c = cost + (path.some((p) => p.opt) ? 0.1 : 0); if (!best || c < best.c) best = { c, path: path.slice() }; return; }
      if (best && cost >= best.c) return;
      nodes.forEach((n, i) => { if (used & (1 << i)) return; const st = path.length ? mod(n.pc - path[path.length - 1].pc) : 0, bad = path.length && !allow.includes(st) ? 1 : 0; path.push(n); dfs(path, used | (1 << i), cost + bad); path.pop(); });
    };
    dfs([], 0, 0);
    let prev = 54; const ups = best.path.map((p) => { let m = near(p.pc, prev + 1); if (m <= prev) m += 12; prev = m; return { m, d: p.d }; });
    return { r, q, bass, ups };
  }
  LABS.stack = {
    st: { ch: 0, mode: 'q4' },
    render(s) {
      const { r, q, bass, ups } = stack(s), items = [{ n: r, m: bass }, ...ups.map((u) => ({ n: simp(up(r, u.d)), m: u.m }))];
      const ivs = ups.slice(1).map((u, i) => { const d = u.m - ups[i].m, k = (s.mode === 'q5' ? SEMK5 : SEMK4)[mod(d)]; const ok = s.mode === 'th' || (s.mode === 'q4' ? [5, 6] : [6, 7]).includes(d); return '<span class="' + (ok ? '' : 'bad') + '">' + nm(simp(up(r, ups[i].d))) + '–' + nm(simp(up(r, u.d))) + ' ' + (d > 12 ? d + '' : ivAb(k)) + '</span>'; }).join(' ');
      return '<div class="bkctl">' + sel('ch', STK.map((x, i) => [i, nm(rootN(x[0])) + x[1]]), s.ch, T('ui.chord')) + seg('mode', [['th', T('stk.th')], ['q4', T('stk.q4')], ['q5', T('stk.q5')]], s.mode) + '</div>' +
        staffSVG(items, { mode: 'chord' }) + '<p class="stkiv">' + ivs + '</p><p class="bknote">' + T('stk.n.' + s.mode) + '</p><div class="bkrow">' + playBtn('data-a="p"') + playBtn('data-a="ab"', T('stk.ab')) + '</div>';
    },
    on(s, a) {
      const cur = stack(s), mk = (x) => [x.bass, ...x.ups.map((u) => u.m)];
      if (a === 'ab') { const th = stack({ ...s, mode: 'th' }); snd.prog([mk(th), mk(cur)], 1.6); return false; }
      snd.chord(mk(cur), { dur: 2.2, arp: 0.08 }); return false;
    },
  };

  /* ---------- Пентатоники в тональности (Левайн, гл. 9) ---------- */
  const PK_ROWS = [['ii', 2, 'm7', [0, 2, 4, 5, 7, 9, 11]], ['V', 7, '7', [2, 4, 5, 7, 9, 11]], ['I', 0, 'maj7', [0, 2, 4, 6, 7, 9, 11]], ['Valt', 7, '7alt', [7, 8, 10, 11, 1, 3, 5]]];
  const PK_COLS = [['I', 0], ['IV', 5], ['V', 7], ['II', 2], ['♭II', 1]];
  const BEST = { 'ii:V': 1, 'I:V': 1, 'V:V': 1, 'Valt:♭II': 1 };
  const pent = (x) => [0, 2, 4, 7, 9].map((k) => mod(x + k));
  LABS.pentakey = {
    st: { key: 'C', pick: 'ii:V' },
    render(s) {
      const k = rootN(s.key), kp = pcOf(k), fl = isFlat(kp) || kp === 0;
      const name = (o) => nm(noteOf(kp + o, fl || o === 1 || o === 10));
      return '<div class="bkctl">' + rootSel('key', s.key, KEYS) + sp('pk.hint') + '</div><div class="bktw"><table class="pkt"><thead><tr><th></th>' + PK_COLS.map(([c, o]) => '<th>' + c + '<small>' + name(o) + '</small></th>').join('') + '</tr></thead><tbody>' +
        PK_ROWS.map(([id, o, q, ok]) => '<tr><th>' + name(o) + (q === 'm7' ? 'm7' : q) + '</th>' + PK_COLS.map(([c, co]) => { const bad = pent(co).filter((x) => !ok.includes(x)), key2 = id + ':' + c; return '<td><button class="pkc' + (bad.length ? ' no' : ' ok') + (BEST[key2] ? ' best' : '') + (s.pick === key2 ? ' on' : '') + '" data-a="c:' + key2 + '" title="' + bad.map((x) => name(x)).join(' ') + '">' + (bad.length ? '✗ ' + name(bad[0]) : BEST[key2] ? '★' : '✓') + '</button></td>'; }).join('') + '</tr>').join('') +
        '</tbody></table></div><p class="bknote">' + T('pk.n.' + s.pick.split(':')[0]) + '</p>';
    },
    on(s, a) {
      if (!a.startsWith('c:')) return;
      s.pick = a.slice(2);
      const [rid, cid] = s.pick.split(':'), row = PK_ROWS.find((x) => x[0] === rid), col = PK_COLS.find((x) => x[0] === cid), kp = pcOf(rootN(s.key));
      const line = [0, 2, 4, 7, 9, 12, 14, 16].map((x) => near(mod(kp + col[1]), 60) + x);
      snd.over(voiceSimple({ r: rootN(MAJ_ROOTS[mod(kp + row[1])]), id: row[2] }), 3.5, line.concat(line.slice(0, -1).reverse()), 0.2, 0.3);
    },
  };

  /* ---------- Четыре звука (Левайн: минорная шестая гамма и «общая» четвёрка) ---------- */
  const FOUR = [['C', 'maj7', 'lydian', 'maj'], ['D', 'm7', 'dorian', 'min'], ['G', '7', 'mixolydian', 'dom'], ['G', '7alt', 'altered', 'dom'], ['E', 'm7♭5', 'locnat2', 'min'], ['A', '7alt', 'altered', 'dom'], ['C', '7♯9', 'dimhw', 'dom'], ['E♭', '7♯11', 'lyddom', 'dom'], ['B♭', 'maj7', 'lydian', 'maj']];
  const SHP = { m6: [[0, 3, 7, 9], ['1', 'b3', '5', '6'], 'm6'], com: [[0, 2, 5, 7], ['1', '2', '4', '5'], ''] };
  function fours(s) {
    const [rn, id, sc, fam] = FOUR[s.ch], r = rootN(rn), rp = pcOf(r), pcs = new Set(scaleById(sc).f.map((d) => mod(rp + IV[d][1]))), [shape, degs, suf] = SHP[s.shape], out = [];
    for (let p = 0; p < 12; p++) if (shape.every((x) => pcs.has(mod(p + x)))) {
      const fr = rootN(MAJ_ROOTS[p]);
      out.push({ p, name: suf ? nm(fr) + suf : degs.map((d) => nm(simp(up(fr, d)))).join(' '), degs: shape.map((x) => DEG[fam][mod(p + x - rp)]), ms: shape.map((x) => p + x) });
    }
    return { r, id, fam, out };
  }
  LABS.four = {
    st: { ch: 3, shape: 'm6', i: 0 },
    render(s) {
      const { r, id, out } = fours(s);
      return '<div class="bkctl">' + sel('ch', FOUR.map((x, i) => [i, nm(rootN(x[0])) + (x[1] === 'm7♭5' ? 'ø' : x[1])]), s.ch, T('ui.chord')) + seg('shape', [['m6', T('fr.m6')], ['com', T('fr.com')]], s.shape) + '</div>' +
        (out.length ? '<div class="bklist">' + out.map((x, i) => '<button class="bkli' + (i === s.i ? ' on' : '') + '" data-a="f:' + i + '"><b>' + x.name + '</b><span>' + T('fr.degs', { c: nm(r) + (id === 'm7♭5' ? 'ø' : id), d: x.degs.join(' ') }) + '</span></button>').join('') + '</div>' : '<p class="bkhint">' + T('fr.none') + '</p>') +
        '<p class="bknote">' + T('fr.n.' + s.shape) + '</p>';
    },
    set(s) { s.i = 0; },
    on(s, a) {
      if (a.startsWith('f:')) s.i = +a.slice(2);
      const { r, id, out } = fours(s), x = out[s.i]; if (!x) return;
      const base = x.ms.map((m) => near(mod(m), 55)).sort((p, q) => p - q), line = [];
      for (let o = 0; o < 3; o++) base.forEach((m) => line.push(m + 12 * o));
      snd.over(voiceSimple({ r, id }), line.length * 0.14 + 1, line.concat(line.slice(0, -1).reverse()), 0.14, 0.22);
    },
  };

  /* ---------- Секвенция (Левайн, гл. 6) ---------- */
  const MOT = [[0, 1, 2, 4], [0, 2, 4, 2], [4, 2, 1, 0], [0, 4, 3, 1]];
  const MAJ = [0, 2, 4, 5, 7, 9, 11];
  function seqNotes(s) {
    const kp = pcOf(rootN(s.key)), base = 60 + kp - (kp > 5 ? 12 : 0);
    const deg = (d) => base + Math.floor(d / 7) * 12 + MAJ[((d % 7) + 7) % 7];
    const cells = [];
    if (s.step === 'grow') { const IVS = [5, 6, 7, 8, 9]; let st = base + 12; IVS.forEach((iv, i) => { cells.push([st, st + iv]); st -= i % 2 ? 1 : 2; }); return { cells, fl: true }; }
    const mot = MOT[s.mot].map(deg);
    for (let i = 0; i < 4; i++) {
      if (s.step === 'dia') cells.push(MOT[s.mot].map((d) => deg(d + i)));
      else if (s.step === 'm3') cells.push(mot.map((m) => m + 3 * i));
      else { const sh = [0, 5, -2, 3][i]; cells.push(mot.map((m) => m + sh)); }
    }
    return { cells, fl: s.step === 'm3' || s.step === 'q4' || isFlat(kp) };
  }
  LABS.seq = {
    st: { key: 'C', mot: 0, step: 'dia' },
    render(s) {
      const { cells, fl } = seqNotes(s), items = [];
      cells.forEach((c, i) => { c.forEach((m) => items.push({ n: noteOf(m, fl), m, d: 'e', bm: 'g' + i })); });
      items.push({ bar: '|.' });
      return '<div class="bkctl">' + rootSel('key', s.key, KEYS) + (s.step === 'grow' ? '' : sel('mot', MOT.map((m, i) => [i, m.map((d) => d + 1).join('–')]), s.mot, T('sq.motif'))) + '</div><div class="bkctl">' +
        seg('step', [['dia', T('sq.dia')], ['m3', T('sq.m3')], ['q4', T('sq.q4')], ['grow', T('sq.grow')]], s.step) + '</div>' + scoreSVG(items, { clef: 'treble' }) +
        '<p class="bknote">' + T('sq.n.' + s.step) + '</p><div class="bkrow">' + playBtn('data-a="p"') + '</div>';
    },
    on(s) { snd.seq(seqNotes(s).cells.flat(), 0.2, 0.24); return false; },
  };

  /* ---------- Внутри — снаружи (Левайн, гл. 8; «Джазология», пентатоники) ---------- */
  const OUT_CH = { maj: ['C', 'maj7', 'D', [0, 4, 7]], min: ['D', 'm7', 'F', [0, 4, 7]], dom: ['G', '7', 'D', [0, 3, 7]] };
  function outLine(s) {
    const [rn, id, tn, tq] = OUT_CH[s.ch], r = rootN(rn), rp = pcOf(r), ip = pcOf(rootN(tn));
    // внутри: трезвучие верхних звуков аккорда или пентатоника V ступени (соль) — она звучит над всеми тремя аккордами до мажора
    const ins = s.mat === 'tri' ? [...tq, 12].map((x) => near(ip, 62) + x) : [0, 2, 4, 7].map((x) => 67 + x), outs = ins.map((m) => m + s.sh);
    const key = new Set(MAJ); // все три аккорда — из до мажора
    const foreign = outs.filter((m) => !key.has(mod(m))).length;
    return { r, id, rp, ins, outs, line: [...ins, ...outs, ...ins.slice().reverse()], foreign, fam: s.ch };
  }
  LABS.outside = {
    st: { ch: 'maj', mat: 'tri', sh: 1 },
    render(s) {
      const o = outLine(s), marks = {}, lab = (m) => DEG[o.fam][mod(m - o.rp)];
      o.ins.forEach((m) => { marks[m] = { c: 'on', t: lab(m) }; });
      o.outs.forEach((m) => { if (!marks[m]) marks[m] = { c: 'alt', t: lab(m) }; });
      return '<div class="bkctl">' + seg('ch', [['maj', 'Cmaj7'], ['min', 'Dm7'], ['dom', 'G7']], s.ch) + seg('mat', [['tri', T('ou.tri')], ['pent', T('ou.pent')]], s.mat) + '</div><div class="bkctl">' +
        seg('sh', [[1, T('ou.s1')], [2, T('ou.s2')], [3, T('ou.s3')], [6, T('ou.s6')]], s.sh) + '</div>' + keyboardSVG(marks, { lo: 60, hi: 89 }) +
        '<div class="oumeter"><span style="width:' + (o.foreign / 4) * 100 + '%"></span></div><p class="bknote">' + T('ou.count', { n: o.foreign }) + ' ' + T('ou.n' + s.sh) + '</p>' +
        '<div class="bkrow">' + playBtn('data-a="p"', T('ou.play')) + '</div>';
    },
    on(s) { const o = outLine(s); snd.over(voiceSimple({ r: o.r, id: o.id }), o.line.length * 0.2 + 0.6, o.line, 0.2, 0.26); return false; },
  };

  /* ---------- Левая рука: страйд, децимы, голоса Бада Пауэлла (Левайн, «The Jazz Piano Book») ---------- */
  const POW = [[[10], [4], [11], [9]], [[15], [10], [16], [11]], [[10, 15], [4, 10], [11, 16], [9, 16]]];
  function lhBars(s) {
    const k = rootN(s.key), kp = pcOf(k), fl = isFlat(kp);
    const ch = (d, q) => ({ r: rootN(MAJ_ROOTS[mod(kp + IV[d][1])]), q, p: mod(kp + IV[d][1]) });
    if (s.st === 'powell') {
      const [ii, v, i] = [ch('2', 'm7'), ch('5', '7'), ch('1', 'maj7')], ri = near(ii.p, 40), rv = ri + 5, r1 = rv - 7, P = POW[s.v];
      return { fl, bars: [[{ ms: [ri, ...P[0].map((x) => ri + x)], d: 'w', c: ii }], [{ ms: [rv, ...P[1].map((x) => rv + x)], d: 'w', c: v }], [{ ms: [r1, ...P[2].map((x) => r1 + x)], d: 'h', c: i }, { ms: [r1, ...P[3].map((x) => r1 + x)], d: 'h' }]] };
    }
    if (s.st === 'tenth') {
      const b = near(kp, 43), T4 = [[0, 7, 16], [2, 9, 17], [3, 12, 18], [4, 12, 19]];
      const bar = T4.map((x, j) => ({ ms: x.map((y) => b + y), d: 'q', c: j ? null : ch('1', '6') }));
      return { fl, bars: [bar, bar] };
    }
    const prog = [ch('1', '6'), ch('6', '7'), ch('2', 'm7'), ch('5', '7')];
    const MOD = { 6: ['3', '5', '6', '9'], 7: ['b7', '9', '3', '13'], m7: ['b3', '5', 'b7', '9'] };
    return { fl, bars: prog.map((c, j) => {
      const lo = near(c.p, 36), third = c.q === 'm7' ? 3 : 4;
      if (s.st === 'modern') { const v = placeUp(c.p, j % 2 ? MOD['7'] : MOD[c.q === 'm7' ? 'm7' : '6'], 50); return [{ ms: [lo], d: 'q', c }, { ms: v, d: 'q' }, { ms: [lo + 7 > 47 ? lo - 5 : lo + 7], d: 'q' }, { ms: v, d: 'q' }]; }
      const tri = placeUp(c.p, c.q === '6' ? ['3', '5', '6'] : c.q === 'm7' ? ['b3', '5', 'b7'] : ['3', '5', 'b7'], 52);
      return [{ ms: [lo], d: 'q', c }, { ms: tri, d: 'q' }, { ms: [lo, lo + 12 + third], d: 'q' }, { ms: tri, d: 'q' }];
    }) };
  }
  LABS.lefthand = {
    st: { st: 'stride', key: 'C', v: 0 },
    render(s) {
      const { fl, bars } = lhBars(s), rows = [];
      // по два такта в строке — иначе ноты мелкие на телефоне
      bars.forEach((bar, bi) => {
        if (bi % 2 === 0) rows.push([]);
        const items = rows[rows.length - 1];
        bar.forEach((ev) => ev.ms.slice().sort((a, b) => a - b).forEach((m, k) => items.push({ n: noteOf(m, fl), m, d: ev.d, chord: k > 0, t: k === 0 && ev.c ? nm(ev.c.r) + ev.c.q : undefined })));
        items.push({ bar: bi === bars.length - 1 ? '|.' : '|' });
      });
      return '<div class="bkctl">' + sel('st', [['stride', T('lh.stride')], ['modern', T('lh.modern')], ['tenth', T('lh.tenth')], ['powell', T('lh.powell')]], s.st, T('ui.pattern')) + rootSel('key', s.key, KEYS) +
        (s.st === 'powell' ? seg('v', [[0, '1'], [1, '2'], [2, '3']], s.v) : '') + '</div>' + rows.map((items) => scoreSVG(items, { clef: 'bass' })).join('') + '<p class="bknote">' + T('lh.n.' + s.st + (s.st === 'powell' ? s.v : '')) + '</p><div class="bkrow">' + playBtn('data-a="p"') + '</div>';
    },
    on(s) {
      const { bars } = lhBars(s), q = 0.42, hits = []; let t = 0;
      for (let rep = 0; rep < 2; rep++) bars.forEach((bar) => bar.forEach((ev) => { const d = { q: 1, h: 2, w: 4 }[ev.d] * q; hits.push([t, ev.ms, d * 0.9]); t += d; }));
      snd.hits(hits); return false;
    },
  };

  return LABS;
}
