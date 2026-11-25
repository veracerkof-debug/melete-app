// «Гитара с нуля» (слово автора 25.11.2026): три схемы для уроков классической гитары — своя, простая, без чужих картинок.
// gpos — посадка (вид сбоку, три опоры); gparts — устройство гитары (касание части — название и зачем она);
// gbox / gboxm — как читать схему аккорда: мажорные, потом минорные; касание кнопки — аккорд на схеме, «Послушать» — разбор струн.
import { playBtn } from './draw.js';

const OPEN = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4 — струны с 6-й по 1-ю
// Аккорды: лады по струнам 6→1 (-1 — не играть, 0 — открытая) и пальцы (1 — указательный … 4 — мизинец)
export const GCH = {
  C: { f: [-1, 3, 2, 0, 1, 0], p: [0, 3, 2, 0, 1, 0] },
  G: { f: [3, 2, 0, 0, 0, 3], p: [2, 1, 0, 0, 0, 3] },
  D: { f: [-1, -1, 0, 2, 3, 2], p: [0, 0, 0, 1, 3, 2] },
  A: { f: [-1, 0, 2, 2, 2, 0], p: [0, 0, 1, 2, 3, 0] },
  E: { f: [0, 2, 2, 1, 0, 0], p: [0, 2, 3, 1, 0, 0] },
  Am: { f: [-1, 0, 2, 2, 1, 0], p: [0, 0, 2, 3, 1, 0] },
  Em: { f: [0, 2, 2, 0, 0, 0], p: [0, 2, 3, 0, 0, 0] },
  Dm: { f: [-1, -1, 0, 2, 3, 1], p: [0, 0, 0, 2, 3, 1] },
};
export const midisOf = (name) => GCH[name].f.map((f, i) => (f < 0 ? null : OPEN[i] + f)).filter((m) => m != null);

// Схема аккорда: вертикальная, 6 струн (слева — толстая), 4 лада, сверху «×» и «○»
export function chordBoxSVG(name, aria) {
  const c = GCH[name], W = 120, H = 130, x0 = 20, dx = 16, y0 = 28, dy = 22;
  let s = '<svg class="bkgbox" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + aria + '">';
  s += '<line class="nut" x1="' + x0 + '" x2="' + (x0 + 5 * dx) + '" y1="' + y0 + '" y2="' + y0 + '"/>';
  for (let f = 1; f <= 4; f++) s += '<line class="fw" x1="' + x0 + '" x2="' + (x0 + 5 * dx) + '" y1="' + (y0 + f * dy) + '" y2="' + (y0 + f * dy) + '"/>';
  for (let i = 0; i < 6; i++) s += '<line class="str" x1="' + (x0 + i * dx) + '" x2="' + (x0 + i * dx) + '" y1="' + y0 + '" y2="' + (y0 + 4 * dy) + '"/>';
  c.f.forEach((f, i) => {
    const x = x0 + i * dx;
    if (f < 0) s += '<text class="mk" x="' + x + '" y="' + (y0 - 8) + '" text-anchor="middle">×</text>';
    else if (f === 0) s += '<circle class="op" cx="' + x + '" cy="' + (y0 - 10) + '" r="3.6"/>';
    else s += '<circle class="dot" cx="' + x + '" cy="' + (y0 + (f - 0.5) * dy) + '" r="7"/><text class="fn" x="' + x + '" y="' + (y0 + (f - 0.5) * dy + 3.6) + '" text-anchor="middle">' + c.p[i] + '</text>';
  });
  return s + '</svg>';
}

// Гитара спереди: номера частей — касанием
const PARTS = ['pegs', 'head', 'nut', 'neck', 'fret', 'strings', 'hole', 'body', 'bridge'];
const PART_AT = { pegs: [128, 24], head: [72, 30], nut: [120, 62], neck: [78, 120], fret: [120, 150], strings: [80, 240], hole: [130, 214], body: [56, 270], bridge: [140, 304] };
function guitarSVG(sel, aria) {
  const fy = (n) => 62 + 226 * (1 - Math.pow(2, -n / 12));
  let s = '<svg class="bkgparts" viewBox="0 0 200 350" role="img" aria-label="' + aria + '">';
  s += '<path class="g body' + (sel === 'body' ? ' on' : '') + '" data-a="p:body" d="M100 170C78 168 64 176 64 196c0 14 10 20 10 32 0 10-22 20-22 52 0 28 22 46 48 46s48-18 48-46c0-32-22-42-22-52 0-12 10-18 10-32 0-20-14-28-36-26z"/>';
  s += '<rect class="g neck' + (sel === 'neck' ? ' on' : '') + '" data-a="p:neck" x="91" y="62" width="18" height="112" rx="2"/>';
  for (let n = 1; n <= 12; n++) s += '<line class="fw' + (sel === 'fret' ? ' on' : '') + '" data-a="p:fret" x1="91" x2="109" y1="' + fy(n).toFixed(1) + '" y2="' + fy(n).toFixed(1) + '"/>';
  s += '<path class="g head' + (sel === 'head' ? ' on' : '') + '" data-a="p:head" d="M89 62V14q0-8 11-8t11 8v48z"/>';
  [14, 28, 42].forEach((y) => { s += '<circle class="g peg' + (sel === 'pegs' ? ' on' : '') + '" data-a="p:pegs" cx="82" cy="' + y + '" r="4.2"/><circle class="g peg' + (sel === 'pegs' ? ' on' : '') + '" data-a="p:pegs" cx="118" cy="' + y + '" r="4.2"/>'; });
  s += '<rect class="g nut' + (sel === 'nut' ? ' on' : '') + '" data-a="p:nut" x="89" y="60" width="22" height="4" rx="1"/>';
  s += '<circle class="g hole' + (sel === 'hole' ? ' on' : '') + '" data-a="p:hole" cx="100" cy="214" r="16"/>';
  s += '<rect class="g bridge' + (sel === 'bridge' ? ' on' : '') + '" data-a="p:bridge" x="80" y="290" width="40" height="8" rx="2"/>';
  for (let i = 0; i < 6; i++) { const xt = 92.6 + i * 2.96, xb = 84 + i * 6.4; s += '<line class="str' + (sel === 'strings' ? ' on' : '') + '" data-a="p:strings" x1="' + xt.toFixed(1) + '" x2="' + xb.toFixed(1) + '" y1="62" y2="294" style="stroke-width:' + [1.1, 0.95, 0.8, 0.6, 0.5, 0.45][i] + '"/>'; }
  PARTS.forEach((id, i) => { const [x, y] = PART_AT[id]; s += '<g class="pn' + (sel === id ? ' on' : '') + '" data-a="p:' + id + '"><circle cx="' + x + '" cy="' + y + '" r="9"/><text x="' + x + '" y="' + (y + 3.6) + '" text-anchor="middle">' + (i + 1) + '</text></g>'; });
  return s + '</svg>';
}

// Посадка: вид сбоку — стул, спина, левая нога на подставке, гитара на левом бедре, гриф вверх (классическая посадка)
function seatSVG(aria) {
  return '<svg class="bkgpos" viewBox="0 0 220 200" role="img" aria-label="' + aria + '">' +
    '<line class="fl" x1="10" x2="210" y1="186" y2="186"/>' +
    '<path class="ch" d="M44 100v86M44 104h46M90 104v82M44 104V60"/>' +
    '<circle class="hd" cx="62" cy="34" r="13"/><path class="bd" d="M60 48C58 62 58 78 60 100"/>' +
    '<path class="bd" d="M60 100q16 6 42 4l8 40"/><path class="bd" d="M62 62q24 14 44 12"/>' +
    '<path class="ft" d="M118 168h26v-12h-26z"/><path class="bd" d="M110 144l8 14"/>' +
    '<path class="gt" d="M96 112c-8 10-4 26 8 32 14 6 28-4 28-18 0-10-8-18-18-18-8 0-14 0-18 4z"/>' +
    '<path class="gn" d="M122 108L186 56"/><circle class="gh" cx="190" cy="53" r="5"/>' +
    '<g class="pt"><circle cx="64" cy="62" r="8"/><text x="64" y="65.2" text-anchor="middle">1</text>' +
    '<circle cx="126" cy="178" r="8"/><text x="126" y="181.2" text-anchor="middle">2</text>' +
    '<circle cx="104" cy="124" r="8"/><text x="104" y="127.2" text-anchor="middle">3</text></g></svg>';
}

export function guitarLabs({ T, snd }) {
  const LABS = {};
  LABS.gpos = { st: {}, render: () => '<div class="bkgwrap">' + seatSVG(T('gp.pos.aria')) + '</div><ol class="bkgleg">' + [1, 2, 3].map((i) => '<li><b>' + i + '</b> ' + T('gp.pos.' + i) + '</li>').join('') + '</ol>', on: () => false };

  LABS.gparts = {
    st: { sel: 'neck' },
    render(s) {
      return '<div class="bkgwrap">' + guitarSVG(s.sel, T('gp.parts.aria')) + '</div>' +
        '<div class="bkginfo"><b>' + (PARTS.indexOf(s.sel) + 1) + '. ' + T('gp.' + s.sel + '.n') + '</b><span>' + T('gp.' + s.sel + '.d') + '</span></div>' +
        '<p class="bkhint" style="text-align:center">' + T('gp.parts.hint') + '</p>';
    },
    on(s, a) { if (a.startsWith('p:') && PARTS.includes(a.slice(2))) { s.sel = a.slice(2); return; } return false; },
  };

  const boxLab = (list, start = list[0]) => ({
    st: { ch: start },
    render(s) {
      const c = GCH[s.ch];
      return '<div class="bkgrow">' + list.map((n) => '<button type="button" class="bkgch' + (n === s.ch ? ' on' : '') + '" data-a="c:' + n + '" aria-pressed="' + (n === s.ch) + '">' + n + '</button>').join('') + '</div>' +
        '<div class="bkgwrap">' + chordBoxSVG(s.ch, T('gp.box.aria', { n: s.ch })) + '</div>' +
        '<ul class="bkgleg flat">' + c.f.map((f, i) => '<li><b>' + (6 - i) + '</b> ' + (f < 0 ? T('gp.box.mute') : f === 0 ? T('gp.box.open') : T('gp.box.fret', { f, p: c.p[i] })) + '</li>').join('') + '</ul>' +
        '<div class="bkrow">' + playBtn('data-a="hear"', T('gp.box.hear')) + '</div>';
    },
    on(s, a) {
      if (a.startsWith('c:') && GCH[a.slice(2)]) { s.ch = a.slice(2); return; }
      if (a === 'hear') { snd.chord(midisOf(s.ch), { arp: 0.11, dur: 1.8 }); return false; }
      return false;
    },
  });
  const MAJ = ['C', 'G', 'D', 'A', 'E'];
  LABS.gbox = boxLab(MAJ);
  LABS.gboxg = boxLab(MAJ, 'G');
  LABS.gboxd = boxLab(MAJ, 'D');
  const MIN = ['Am', 'Em', 'Dm'];
  LABS.gboxm = boxLab(MIN);
  LABS.gboxem = boxLab(MIN, 'Em');
  LABS.gboxdm = boxLab(MIN, 'Dm');

  // Бой: рисунок на восемь долей («1 и 2 и 3 и 4 и») — ↓ вниз, ↑ вверх, · пропуск; «Послушать» играет два такта под счёт (80 уд/мин)
  const PAT = { q: 'D-D-D-D-', e: 'DUDUDUDU', f: 'D-DU-UDU' };
  const strumLab = (pat, ch) => ({
    st: { pat, ch },
    render(s) {
      const p = PAT[s.pat], lab = ['1', 'и', '2', 'и', '3', 'и', '4', 'и'];
      return '<div class="bkgrow">' + ['Am', 'C', 'G'].map((n) => '<button type="button" class="bkgch' + (n === s.ch ? ' on' : '') + '" data-a="c:' + n + '" aria-pressed="' + (n === s.ch) + '">' + n + '</button>').join('') +
        '<span class="bkgsp"></span>' + Object.keys(PAT).map((k) => '<button type="button" class="bkgch' + (k === s.pat ? ' on' : '') + '" data-a="s:' + k + '" aria-pressed="' + (k === s.pat) + '" aria-label="' + T('gp.strum.' + k) + '">' + T('gp.strum.' + k) + '</button>').join('') + '</div>' +
        '<div class="bkgstrum" role="img" aria-label="' + T('gp.strum.aria') + '">' + [...p].map((c, i) => '<div class="bkgbt' + (i % 2 ? ' off' : '') + '"><b>' + (c === 'D' ? '↓' : c === 'U' ? '↑' : '·') + '</b><i>' + lab[i] + '</i></div>').join('') + '</div>' +
        '<p class="bkhint">' + T('gp.strum.hint') + '</p><div class="bkrow">' + playBtn('data-a="hear"', T('gp.box.hear')) + '</div>';
    },
    on(s, a) {
      if (a.startsWith('c:') && GCH[a.slice(2)]) { s.ch = a.slice(2); return; }
      if (a.startsWith('s:') && PAT[a.slice(2)]) { s.pat = a.slice(2); return; }
      if (a !== 'hear') return false;
      const ms = midisOf(s.ch), step = 60 / 80 / 2, list = [];
      for (let bar = 0; bar < 2; bar++) [...PAT[s.pat]].forEach((c, i) => {
        if (c === '-') return;
        const t = (bar * 8 + i) * step, order = c === 'D' ? ms : [...ms].reverse();
        order.forEach((m, k) => list.push([t + k * 0.018, [m], 0.5]));
      });
      snd.hits(list); return false;
    },
  });
  LABS.gstrum = strumLab('q', 'Am');
  LABS.gstrume = strumLab('e', 'Am');
  LABS.gstrumf = strumLab('f', 'C');
  return LABS;
}
