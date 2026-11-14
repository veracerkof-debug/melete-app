// Страницы настроек арпеджиатора и глайдера пэдов (src/audio/arp.js): вкладки «Арпеджиатор» и «Глайдер» шторки пэдов.
// Арпеджиатор: включить, громкость, звук, рисунок, частота нот, диапазон, движение, темп. Глайдер: включить, громкость, эхо,
// подвижность. Всё слышно сразу, пока тянется ползунок (движок читает настройки на каждом шаге и перестраивает такт).
import { STYLES, RATES, ARP_SOUNDS, lvlDb, normalizeArp } from '../../audio/arp.js';

export const A = (ctx) => (ctx.store.all().arp = normalizeArp(ctx.store.all().arp));

export function arpPages(ctx) {
  const { t, ui } = ctx;
  const P = (v) => Math.round(v * 100) + '%';
  const DB = (v) => { const d = Math.round(lvlDb(v)); return d === 0 ? t('arp.lvl0') : (d > 0 ? '+' : '−') + Math.abs(d) + ' ' + t('arp.db'); };
  const sl = (k, v, min, max, step, txt, attr = 'data-ak') => '<div class="sslider"><div class="ssl"><span>' + t('arp.' + k) + '</span><b class="num" id="av-' + k + '">' + txt +
    '</b></div><input type="range" class="range" ' + attr + '="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" aria-label="' + t('arp.' + k) + '"></div>';
  const chips = (title, attr, list, cur, label) => '<div class="hdr">' + title + '</div><div class="dchs" role="group" aria-label="' + title + '">' +
    list.map((k) => '<button class="dch' + (cur === k ? ' on' : '') + '" ' + attr + '="' + k + '" aria-pressed="' + (cur === k) + '">' + label(k) + '</button>').join('') + '</div>';
  const sw = (id, on, title, hint) => '<div class="cell"><span class="grow"><span>' + title + '</span><span class="st l2" style="display:block;font-size:13px">' + hint + '</span></span>' + ui.sw(id, on, title) + '</div>';
  return {
    arp: () => { const a = A(ctx), metro = ctx.audio.metro && ctx.audio.metro.running; return '<div class="group">' + sw('arpon', a.on, t('arp.on'), t('arp.onHint')) + sl('lvl', a.lvl, 0, 1, 0.025, DB(a.lvl)).replace('class="sslider"', 'class="sslider cell"') + '</div><p class="ftr">' + t('arp.lvlHint') + '</p>' +
      chips(t('arp.style'), 'data-asty', STYLES, a.style, (k) => t('arp.st.' + k)) +
      '<div class="group" style="margin-top:10px"><div class="cellcol"><span>' + t('arp.rate') + '</span><div style="margin-top:8px">' + ui.seg('arate', Object.keys(RATES).map((k) => [k, t('arp.r.' + k.replace('/', '_'))]), a.rate, t('arp.rate')) + '</div></div>' +
      '<div class="cellcol"><span>' + t('arp.range') + '</span><div style="margin-top:8px">' + ui.seg('arange', [1, 2, 3].map((k) => [String(k), t('arp.oct', { n: k })]), String(a.range), t('arp.range')) + '</div></div></div>' +
      '<div class="hdr">' + t('arp.motion') + '</div><div class="group sgroup">' + sl('life', a.life, 0, 1, 0.05, P(a.life)) + sl('density', a.density, 0.3, 1, 0.05, P(a.density)) + sl('gate', a.gate, 0, 1, 0.05, P(a.gate)) + sl('swing', a.swing, 0, 1, 0.05, P(a.swing)) + '</div>' +
      '<p class="ftr">' + t('arp.motionHint') + '</p>' +
      chips(t('arp.sound'), 'data-asnd', ARP_SOUNDS, a.sound, (k) => t('arp.snd.' + k)) +
      '<div class="hdr">' + t('arp.tempo') + '</div><div class="group sgroup">' + sl('bpm', a.bpm, 40, 200, 1, String(a.bpm)) + '</div><p class="ftr">' + t(metro ? 'arp.tempoMetro' : 'arp.tempoHint') + '</p>'; },
    glide: () => { const g = A(ctx).glide; return '<div class="group">' + sw('aglide', g.on, t('arp.glideOn'), t('arp.glideHint')) + '</div>' +
      (g.on ? '<div class="group sgroup" style="margin-top:12px">' + sl('glvl', g.lvl, 0, 1, 0.025, DB(g.lvl), 'data-ag') + sl('gecho', g.echo, 0, 1, 0.05, P(g.echo), 'data-ag') + sl('gbusy', g.busy, 0, 1, 0.05, P(g.busy), 'data-ag') + '</div><p class="ftr">' + t('arp.glideFtr') + '</p>' : ''); },
  };
}

// Касания и ползунки вкладок; sh — шторка, onChange — перерисовать пэды
export function arpBind(ctx, el, sh, onChange) {
  const { t } = ctx, eng = () => ctx.audio.arp;
  const DB = (v) => { const d = Math.round(lvlDb(v)); return d === 0 ? t('arp.lvl0') : (d > 0 ? '+' : '−') + Math.abs(d) + ' ' + t('arp.db'); };
  const save = (re = false) => { ctx.store.save(); eng().sync(); onChange(); if (re) sh.update(); };
  el.addEventListener('click', (e) => {
    const g = (s) => e.target.closest(s);
    let b;
    if ((b = g('[data-asnd]'))) { A(ctx).sound = b.dataset.asnd; save(true); }
    else if ((b = g('[data-asty]'))) { A(ctx).style = b.dataset.asty; save(true); }
    else if ((b = g('[data-seg="arate"] [data-v]'))) { A(ctx).rate = b.dataset.v; save(true); }
    else if ((b = g('[data-seg="arange"] [data-v]'))) { A(ctx).range = +b.dataset.v; save(true); }
  });
  el.addEventListener('change', (e) => {
    const k = e.target.dataset.sw;
    if (k === 'arpon') { A(ctx).on = e.target.checked; if (A(ctx).on && !ctx.audio.drone.on) ctx.ui.toast(t('arp.needPad')); save(true); }
    else if (k === 'aglide') { A(ctx).glide.on = e.target.checked; save(true); }
    else if (e.target.dataset.ak || e.target.dataset.ag) save(false);
  });
  el.addEventListener('input', (e) => {
    const k = e.target.dataset.ak, gk = e.target.dataset.ag, v = +e.target.value;
    if (k) { A(ctx)[k] = v; const o = el.querySelector('#av-' + k); if (o) o.textContent = k === 'bpm' ? String(v) : k === 'lvl' ? DB(v) : Math.round(v * 100) + '%'; eng().sync(); }
    if (gk) { A(ctx).glide[gk.slice(1)] = v; const o = el.querySelector('#av-' + gk); if (o) o.textContent = gk === 'glvl' ? DB(v) : Math.round(v * 100) + '%'; }
  });
}
