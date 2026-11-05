// Хроматический круг и «ритм становится нотой» (слово автора 05.11.2026: «эту красоту — в учебник, везде, где помогает
// объяснить аккорды и гаммы; ритм → нота — в нужное место с наглядной демонстрацией»).
// chroma — аккорд на круге: выбрать вид или собрать касанием нот; фигура, шаги «+4 +3», формула и название.
// chromascale — гамма на круге: шаги тон/полутон, симметричные гаммы видны сразу.
// pulse — три пульса в отношении 4:5:6 (и другие): медленно — ритм, быстрее 20 ударов в секунду — тон, и те же
// числа звучат аккордом. Звук — поезд импульсов (draw.js: snd.pulses), один узел на голос, частота — плавно.
import { CHORDS, SCALES, IV, pcOf, rootN, nm, up, ALL12, chordById } from './engine.js';
import { chromaSVG, chordSteps } from '../../../ui/chroma.js';
import { sel, playBtn, simp } from './draw.js';

const SH = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const semis = (d) => ((IV[d] ? IV[d][1] : 0) % 12 + 12) % 12;
const CH_IDS = ['', 'm', '°', '+', 'sus4', '7', 'maj7', 'm7', 'm7♭5', '°7'];
const SC_IDS = ['ionian', 'aeolian', 'dorian', 'lydian', 'mixolydian', 'harmmin', 'melmin', 'whole', 'dimhw', 'pentmaj', 'pentmin', 'bluesmin'];

// Набор нот → аккорд: основной тон — первая нажатая (если подходит), иначе любая подходящая
function identify(pcs) {
  const set = [...new Set(pcs)];
  if (set.length < 3) return null;
  const tries = [set[0], ...set.slice(1)];
  for (const r of tries) {
    const rel = set.map((p) => ((p - r) % 12 + 12) % 12).sort((a, b) => a - b).join(',');
    const c = CHORDS.find((x) => x.f.map(semis).sort((a, b) => a - b).join(',') === rel);
    if (c) return { root: r, c };
  }
  return null;
}

export function chromaLabs({ T, L, snd, rootSel }) {
  const LABS = {};
  const chName = (id) => (L.CHN && L.CHN[id]) || id, scName = (id) => (L.SCN && L.SCN[id]) || id;

  /* ---------- аккорд на круге ---------- */
  LABS.chroma = {
    st: { root: 'C', id: '', free: null },
    render(s) {
      let pcs, names, title, sub, root;
      if (s.free) { // собранный касанием
        pcs = s.free; const x = identify(pcs);
        root = x ? x.root : pcs[0];
        if (x) pcs = [x.root, ...pcs.filter((p) => p !== x.root)];
        names = (p) => SH[p]; title = x ? SH[x.root] + x.c.id : pcs.map((p) => SH[p]).join(' ');
        sub = x ? chName(x.c.id) : pcs.length < 3 ? T('cr.more') : T('cr.none');
      } else {
        const r = rootN(s.root), c = chordById(s.id) || chordById('');
        const notes = c.f.map((d) => simp(up(r, d)));
        pcs = notes.map(pcOf); root = pcs[0];
        names = (p) => { const i = pcs.indexOf(p); return i >= 0 ? nm(notes[i]) : SH[p]; };
        title = nm(r) + c.id; sub = chName(c.id);
      }
      const st = chordSteps(pcs), deg = (p) => { if (s.free) return ''; const c = chordById(s.id) || chordById(''); return c.f[pcs.indexOf(p)] || ''; };
      return '<div class="bkctl">' + rootSel('root', s.root) + sel('id', CH_IDS.map((id) => [id, (id || 'maj') + ' — ' + chName(id)]), s.id, T('ui.chord')) + '</div>' +
        chromaSVG({ pcs, name: names, sub: s.free ? null : deg, steps: pcs.length > 1 ? 'chord' : null, center: [title, ''], label: title, tap: true, cls: 'bkchroma' }) +
        (st.length ? '<div class="crform"><span>' + st.join(' + ') + ' = ' + sub + '</span></div>' : '<p class="bkhint" style="text-align:center">' + sub + '</p>') +
        '<div class="bkrow" style="justify-content:center">' + playBtn('data-a="play"', T('cr.play')) + playBtn('data-a="arp"', T('cr.arp')) +
        (s.free ? '<button type="button" class="bkplay" data-a="reset">' + T('cr.reset') + '</button>' : '') + '</div>' +
        '<p class="bkhint" style="text-align:center">' + T('cr.hint') + '</p>';
    },
    set(s) { s.free = null; },
    on(s, a) {
      if (a.startsWith('cpc:')) { // касание ноты: собрать свой аккорд (первое касание — из показанного)
        const p = +a.slice(4);
        if (!s.free) { const r = rootN(s.root), c = chordById(s.id) || chordById(''); s.free = c.f.map((d) => pcOf(simp(up(r, d)))); }
        s.free = s.free.includes(p) ? s.free.filter((x) => x !== p) : [...s.free, p].slice(0, 6);
        snd.seq([60 + p], 0.3, 0.6);
        return true;
      }
      const pcs = s.free || (() => { const r = rootN(s.root), c = chordById(s.id) || chordById(''); return c.f.map((d) => pcOf(simp(up(r, d)))); })();
      const r0 = pcs[0] || 0, ms = pcs.map((p) => 60 + r0 + ((p - r0 + 12) % 12)).sort((a, b) => a - b);
      if (a === 'play') snd.chord(ms, { dur: 1.8 });
      if (a === 'arp') snd.seq(ms, 0.32, 0.9);
      if (a === 'reset') s.free = null;
      return a === 'reset';
    },
  };

  /* ---------- гамма на круге ---------- */
  LABS.chromascale = {
    st: { root: 'C', id: 'ionian' },
    render(s) {
      const sc = SCALES.find((x) => x.id === s.id) || SCALES[0], r = rootN(s.root), notes = sc.f.map((d) => simp(up(r, d))), pcs = notes.map(pcOf);
      const name = (p) => { const i = pcs.indexOf(p); return i >= 0 ? nm(notes[i]) : SH[p]; };
      const ids = SC_IDS.filter((id) => SCALES.some((x) => x.id === id));
      return '<div class="bkctl">' + rootSel('root', s.root, ALL12.map((x) => [x, x])) + sel('id', ids.map((id) => [id, scName(id)]), s.id, T('ui.scale')) + '</div>' +
        chromaSVG({ pcs, name, sub: (p) => sc.f[pcs.indexOf(p)].replace('b', '♭').replace('#', '♯'), steps: 'scale', stepTxt: (st) => T('cr.st' + Math.min(4, st)), center: [nm(r), scName(sc.id)], label: nm(r) + ' ' + scName(sc.id), tap: false, cls: 'bkchroma' }) +
        '<p class="bkhint" style="text-align:center">' + sc.f.map((d, i) => { const n = semis(sc.f[(i + 1) % sc.f.length]) - semis(d); return T('cr.st' + Math.min(4, ((n % 12) + 12) % 12 || 12)); }).join(' · ') + '</p>' +
        '<div class="bkrow" style="justify-content:center">' + playBtn('data-a="play"', T('cr.play')) + '</div>';
    },
    on(s, a) {
      if (a.startsWith('cpc:')) { snd.seq([60 + +a.slice(4)], 0.3, 0.6); return false; }
      if (a !== 'play') return false;
      const sc = SCALES.find((x) => x.id === s.id) || SCALES[0], r = rootN(s.root), base = 60 + pcOf(r);
      const ms = sc.f.map((d) => base + (IV[d] ? IV[d][1] : 0)); ms.push(base + 12);
      snd.seq(ms, 0.26, 0.4);
      return false;
    },
  };

  /* ---------- ритм становится нотой ---------- */
  // Отношения: каждый пульс — правильный многоугольник с числом вершин = его числу; одна стрелка обходит круг за
  // «общий период», вершина вспыхивает, когда её пульс бьёт. Быстрее ~20 ударов в секунду — удары сливаются в тон
  const RATIOS = { '2:3': [2, 3], '3:4': [3, 4], '4:5': [4, 5], '4:5:6': [4, 5, 6], '10:12:15': [10, 12, 15], '1:2': [1, 2] };
  const RNAME = { '2:3': 'cr.r.fifth', '3:4': 'cr.r.fourth', '4:5': 'cr.r.third', '4:5:6': 'cr.r.major', '10:12:15': 'cr.r.minor', '1:2': 'cr.r.octave' };
  LABS.pulse = {
    st: { r: '4:5:6', x: 0.12 },
    render(s) {
      return '<div class="bkctl">' + sel('r', Object.keys(RATIOS).map((k) => [k, k + ' — ' + T(RNAME[k])]), s.r, T('pu.ratio')) + '</div>' +
        '<div class="bkpulse" data-pulse data-hits="' + T('pu.hits') + '" data-hz="' + T('pu.hz') + '">' +
        '<div class="pu-head"><b class="pu-big">' + s.r.split(':').map((n, i) => '<i class="k' + i + '">' + n + '</i>').join('<span>:</span>') + '</b><span class="pu-rate"></span></div>' +
        '<canvas class="pu-cv" aria-label="' + T('pu.title') + '"></canvas>' +
        '<div class="pu-axis"><span>' + T('pu.rhythm') + '</span><div class="pu-bar"><i class="pu-mark" style="left:' + (100 * xAt(20)).toFixed(1) + '%"></i><b class="pu-dot"></b><small style="left:' + (100 * xAt(20)).toFixed(1) + '%">20 ' + T('pu.hz') + '</small></div><span>' + T('pu.note') + '</span></div>' +
        '<input type="range" class="range pu-range" min="0" max="1" step="0.001" value="' + s.x + '" data-pu aria-label="' + T('pu.speed') + '">' +
        '<div class="bkrow" style="justify-content:center">' + playBtn('data-a="go"', T('pu.play')) + '<button type="button" class="bkplay" data-a="stop">' + T('pu.stop') + '</button></div>' +
        '</div><p class="bkhint" style="text-align:center">' + T('pu.hint') + '</p>';
    },
    set(s) { if (s.live) { s.live.stop(); s.live = snd.pulses(RATIOS[s.r] || RATIOS['4:5:6'], baseAt(s.x)); } },
    on(s, a, el) {
      if (a === 'go') { s.play = true; const v = snd.pulses(RATIOS[s.r] || RATIOS['4:5:6'], baseAt(s.x)); s.live = v; animate(s, el); return false; }
      if (a === 'stop') { s.play = false; if (s.live) s.live.stop(); s.live = null; return false; }
      return true;
    },
    mounted: (s, el) => animate(s, el),
  };
  return LABS;
}

// Скорость: ползунок 0…1 → основной пульс (единица отношения) 0,4…110 ударов в секунду, по логарифму
const LO = 0.4, HI = 110;
export const baseAt = (x) => LO * Math.pow(HI / LO, x);
// место частоты верхнего пульса на шкале «ритм → нота» (0,5…660 Гц)
const xAt = (hz) => Math.max(0, Math.min(1, Math.log(hz / 0.5) / Math.log(660 / 0.5)));

// Рисунок пульсов: живёт, пока схема на экране; ползунок двигает частоту без перерисовки схемы
const ANIM = new WeakMap();
function animate(s, el) {
  const box = el && el.querySelector && el.querySelector('[data-pulse]'); if (!box) return;
  const cv = box.querySelector('.pu-cv'), rng = box.querySelector('[data-pu]'), rate = box.querySelector('.pu-rate'), dot = box.querySelector('.pu-dot');
  if (ANIM.get(box)) return;
  const ratios = () => (s.r || '4:5:6').split(':').map(Number);
  const st = { ph: 0, last: performance.now(), flash: [0, 0, 0] };
  ANIM.set(box, st);
  const onIn = () => { s.x = +rng.value; if (s.live) s.live.set(baseAt(s.x)); text(); };
  rng.addEventListener('input', onIn);
  const NOTE = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const noteOf = (hz) => { const m = Math.round(69 + 12 * Math.log2(hz / 440)); return NOTE[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); };
  const fmt = (v) => (v < 10 ? v.toFixed(1).replace('.', ',') : String(Math.round(v)));
  function text() {
    const b = baseAt(s.x), hz = ratios().map((r) => r * b), top = Math.max(...hz);
    rate.textContent = top < 20 ? hz.map(fmt).join(' · ') + ' ' + box.dataset.hits : hz.map((h) => Math.round(h) + '').join(' · ') + ' ' + box.dataset.hz + ' — ' + hz.map(noteOf).join(' ');
    dot.style.left = (100 * xAt(top)).toFixed(1) + '%';
  }
  text();
  const g = cv.getContext('2d');
  const css = getComputedStyle(box), col = [css.getPropertyValue('--tint').trim() || '#946B3E', css.getPropertyValue('--tint-text').trim() || '#765A38', css.getPropertyValue('--ink').trim() || '#222'];
  function frame(now) {
    if (!box.isConnected) { // перерисовали схему — рисует новая; ушли из главы — звук стоп
      rng.removeEventListener('input', onIn); ANIM.delete(box);
      if (!el.isConnected && s.live) { s.live.stop(); s.live = null; s.play = false; }
      return;
    }
    const dt = Math.min(0.1, (now - st.last) / 1000); st.last = now;
    const b = baseAt(s.x), rs = ratios(), fast = Math.max(...rs) * b > 16;
    const prev = st.ph; st.ph = (st.ph + (s.play ? b * dt : 0)) % 1;
    const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const C = [W / 2, H / 2], R0 = Math.min(W, H) * 0.44;
    rs.forEach((n, i) => {
      const R = R0 * (1 - i * 0.2) * (rs.length === 2 ? 1 - i * 0.05 : 1), v = Math.max(n, 1), pts = [];
      for (let k = 0; k < v; k++) { const a = (k / v) * Math.PI * 2 - Math.PI / 2; pts.push([C[0] + R * Math.cos(a), C[1] + R * Math.sin(a)]); }
      // удар: стрелка прошла вершину
      if (s.play && !fast) for (let k = 0; k < v; k++) { const at = k / v; if ((prev <= at && st.ph > at) || (prev > st.ph && (at >= prev || at < st.ph))) st.flash[i] = 1; }
      const c = col[i % col.length], glow = fast && s.play ? 1 : st.flash[i];
      g.globalAlpha = 0.35 + 0.65 * glow; g.strokeStyle = c; g.lineWidth = 2 + 2 * glow; g.shadowColor = c; g.shadowBlur = 14 * glow;
      g.beginPath(); if (v >= 3) { pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); } else { g.arc(C[0], C[1], R, 0, Math.PI * 2); }
      g.stroke(); g.shadowBlur = 0;
      g.fillStyle = c; pts.forEach(([x, y]) => { g.globalAlpha = 0.6 + 0.4 * glow; g.beginPath(); g.arc(x, y, 4 + 3 * glow, 0, Math.PI * 2); g.fill(); });
      st.flash[i] *= 0.88;
    });
    g.globalAlpha = 1;
    // стрелка (на высокой скорости — светлый круг: ритм слился в тон)
    if (s.play && fast) { g.fillStyle = col[0]; g.globalAlpha = 0.18; g.beginPath(); g.arc(C[0], C[1], R0 * 0.32, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    const a = st.ph * Math.PI * 2 - Math.PI / 2;
    if (!(s.play && fast)) { g.strokeStyle = col[2]; g.lineWidth = 2; g.beginPath(); g.moveTo(C[0], C[1]); g.lineTo(C[0] + R0 * 1.02 * Math.cos(a), C[1] + R0 * 1.02 * Math.sin(a)); g.stroke(); }
    g.fillStyle = col[2]; g.beginPath(); g.arc(C[0], C[1], 7, 0, Math.PI * 2); g.fill();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
