// Шторка арпеджиатора пэдов (src/audio/arp.js): включить, звук, рисунок, частота нот, диапазон; жизнь, плотность,
// длина, громкость, свинг; свой темп (когда метроном молчит); спутник «Глайдер рядом» — громкость, эхо, подвижность.
// Всё меняется на ходу: звук не прерывается, следующие ноты уже по-новому.
import { normalizeArp, STYLES, RATES, ARP_SOUNDS, lvlDb } from '../../audio/arp.js';

export function arpSheet(ctx, onChange) {
  const { t, ui } = ctx, A = () => (ctx.store.all().arp = normalizeArp(ctx.store.all().arp)), eng = () => ctx.audio.arp;
  const P = (v) => Math.round(v * 100) + '%';
  // громкость — в децибелах от фона: «фон» — как по умолчанию
  const DB = (v) => { const d = Math.round(lvlDb(v)); return d === 0 ? t('arp.lvl0') : (d > 0 ? '+' : '−') + Math.abs(d) + ' ' + t('arp.db'); };
  const sl = (k, v, min, max, step, txt, attr = 'data-ak') => '<div class="sslider"><div class="ssl"><span>' + t('arp.' + k) + '</span><b class="num" id="av-' + k + '">' + txt +
    '</b></div><input type="range" class="range" ' + attr + '="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" aria-label="' + t('arp.' + k) + '"></div>';
  const body = () => {
    const a = A(), g = a.glide, metro = ctx.audio.metro && ctx.audio.metro.running;
    return ui.snav(t('arp.title')) +
      '<div class="group"><div class="cell"><span class="grow"><span>' + t('arp.on') + '</span><span class="st l2" style="display:block;font-size:13px">' + t('arp.onHint') + '</span></span>' + ui.sw('arpon', a.on, t('arp.on')) + '</div>' + sl('lvl', a.lvl, 0, 1, 0.025, DB(a.lvl)).replace('class="sslider"', 'class="sslider cell"') + '</div><p class="ftr">' + t('arp.lvlHint') + '</p>' +
      '<div class="hdr">' + t('arp.sound') + '</div><div class="dchs" role="group" aria-label="' + t('arp.sound') + '">' + ARP_SOUNDS.map((k) => '<button class="dch' + (a.sound === k ? ' on' : '') + '" data-asnd="' + k + '" aria-pressed="' + (a.sound === k) + '">' + t('arp.snd.' + k) + '</button>').join('') + '</div>' +
      '<div class="hdr">' + t('arp.style') + '</div><div class="dchs" role="group" aria-label="' + t('arp.style') + '">' + STYLES.map((k) => '<button class="dch' + (a.style === k ? ' on' : '') + '" data-asty="' + k + '" aria-pressed="' + (a.style === k) + '">' + t('arp.st.' + k) + '</button>').join('') + '</div>' +
      '<div class="group" style="margin-top:10px"><div class="cellcol"><span>' + t('arp.rate') + '</span><div style="margin-top:8px">' + ui.seg('arate', Object.keys(RATES).map((k) => [k, t('arp.r.' + k.replace('/', '_'))]), a.rate, t('arp.rate')) + '</div></div>' +
      '<div class="cellcol"><span>' + t('arp.range') + '</span><div style="margin-top:8px">' + ui.seg('arange', [1, 2, 3].map((k) => [String(k), t('arp.oct', { n: k })]), String(a.range), t('arp.range')) + '</div></div></div>' +
      '<div class="hdr">' + t('arp.motion') + '</div><div class="group sgroup">' + sl('life', a.life, 0, 1, 0.05, P(a.life)) + sl('density', a.density, 0.3, 1, 0.05, P(a.density)) + sl('gate', a.gate, 0, 1, 0.05, P(a.gate)) + sl('swing', a.swing, 0, 1, 0.05, P(a.swing)) + '</div>' +
      '<p class="ftr">' + t('arp.motionHint') + '</p>' +
      '<div class="hdr">' + t('arp.tempo') + '</div><div class="group sgroup">' + sl('bpm', a.bpm, 40, 200, 1, String(a.bpm)) + '</div><p class="ftr">' + t(metro ? 'arp.tempoMetro' : 'arp.tempoHint') + '</p>' +
      '<div class="hdr">' + t('arp.glide') + '</div><div class="group"><div class="cell"><span class="grow"><span>' + t('arp.glideOn') + '</span><span class="st l2" style="display:block;font-size:13px">' + t('arp.glideHint') + '</span></span>' + ui.sw('aglide', g.on, t('arp.glideOn')) + '</div></div>' +
      (g.on ? '<div class="group sgroup">' + sl('glvl', g.lvl, 0, 1, 0.025, DB(g.lvl), 'data-ag') + sl('gecho', g.echo, 0, 1, 0.05, P(g.echo), 'data-ag') + sl('gbusy', g.busy, 0, 1, 0.05, P(g.busy), 'data-ag') + '</div>' : '');
  };
  ui.sheet(body, (el, sh) => {
    const save = (re = false) => { ctx.store.save(); eng().sync(); onChange(); if (re) sh.update(); };
    el.addEventListener('click', (e) => {
      const g = (s) => e.target.closest(s);
      let b;
      if ((b = g('[data-asnd]'))) { A().sound = b.dataset.asnd; save(true); }
      else if ((b = g('[data-asty]'))) { A().style = b.dataset.asty; save(true); }
      else if ((b = g('[data-seg="arate"] [data-v]'))) { A().rate = b.dataset.v; save(true); }
      else if ((b = g('[data-seg="arange"] [data-v]'))) { A().range = +b.dataset.v; save(true); }
    });
    el.addEventListener('change', (e) => {
      const k = e.target.dataset.sw;
      if (k === 'arpon') { A().on = e.target.checked; if (A().on && !ctx.audio.drone.on) ctx.ui.toast(t('arp.needPad')); save(true); }
      else if (k === 'aglide') { A().glide.on = e.target.checked; save(true); }
      else if (e.target.dataset.ak || e.target.dataset.ag) save(false);
    });
    el.addEventListener('input', (e) => {
      const k = e.target.dataset.ak, gk = e.target.dataset.ag, v = +e.target.value;
      if (k) { A()[k] = v; const o = el.querySelector('#av-' + k); if (o) o.textContent = k === 'bpm' ? String(v) : k === 'lvl' ? DB(v) : Math.round(v * 100) + '%'; eng().sync(); }
      if (gk) { A().glide[gk.slice(1)] = v; const o = el.querySelector('#av-' + gk); if (o) o.textContent = gk === 'glvl' ? DB(v) : Math.round(v * 100) + '%'; }
    });
  });
}
