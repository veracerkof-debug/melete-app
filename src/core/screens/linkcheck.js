// Проверка связи с сопряжённым устройством (Melete DEV): серия из 50 лёгких запросов по защищённому каналу —
// задержка туда-обратно (медиана, p95, максимум), потери, разброс и вывод словами; ниже — постоянный канал событий
// для игры в реальном времени (link.js): включить, состояние, круг, сдвиг часов, буфер дрожания.
// Математика — linkstats.js, серия — linkcheck.js, канал — linkhub.js.
import { t } from '../../i18n/index.js';
import { sheet, snav, esc, toast } from '../../ui/index.js';
import { http } from '../sync.js';
import { runCheck, httpPing, SERIES } from '../linkcheck.js';
import { openLink, closeLink, linkFor, linkCanOpen, subscribeLink } from '../linkhub.js';

const ms = (v) => t('lc.ms', { v: Math.round(v * 10) / 10 });

export function linkSheet(app, dev, H = http) {
  let res = null, prog = null, running = false, stop = false, timer = 0, unsub = null;
  async function run() {
    if (running) return;
    running = true; stop = false; res = null; prog = { i: 0, n: SERIES }; api.update();
    res = await runCheck(httpPing(H, dev), { n: SERIES, onStep: (p) => { prog = p; api.update(); }, shouldStop: () => stop });
    running = false; prog = null;
    api.update();
  }
  const cell = (label, val) => '<div class="cell"><span class="grow">' + esc(label) + '</span><b class="num">' + esc(val) + '</b></div>';
  function chanHTML() {
    if (!linkCanOpen()) return '';
    const l = linkFor(dev), on = !!l && l.state !== 'idle' && l.state !== 'failed', i = l ? l.info() : null;
    let st = t('lc.st.idle');
    if (i) st = i.state === 'retry' ? t('lc.st.retry', { s: Math.ceil(i.retryIn / 1000) }) : i.state === 'failed' ? t('lc.st.failed', { why: t('lc.err.' + (i.error || 'net')) }) : t('lc.st.' + i.state);
    let h = '<div class="hdr">' + esc(t('lc.chan')) + '</div><div class="group"><div class="cell"><span class="grow">' + esc(t('lc.chanSw')) + '<span class="psub">' + esc(st) + '</span></span>' +
      '<button class="rcsw' + (on ? ' on' : '') + '" data-lc="chan" aria-pressed="' + on + '" aria-label="' + esc(t('lc.chanSw')) + '">' + esc(t(on ? 'rc.on' : 'rc.offs')) + '</button></div>';
    if (i && i.state === 'open') {
      h += cell(t('lc.chanRtt'), i.got ? ms(i.rtt) : '…') + cell(t('lc.lost'), String(i.lost)) +
        cell(t('lc.clock'), i.clockReady ? t('lc.clockV', { off: Math.round(i.offset), sp: Math.round(i.clockSpread * 10) / 10 }) : '…') +
        cell(t('lc.buf'), ms(i.jitter.buffer));
    }
    return h + '</div><p class="ftr">' + esc(t('lc.chanHint')) + '</p>';
  }
  const body = () => {
    let h = snav(t('lc.title', { name: dev.name || '' })) + '<div class="group"><button class="cell act" data-lc="run"' + (running ? ' disabled' : '') + '>' +
      esc(running && prog ? t('lc.busy', { i: prog.i, n: prog.n }) : t('lc.run', { n: SERIES })) + '</button>' +
      (running ? '<button class="cell act" data-lc="stop">' + esc(t('lc.stop')) + '</button>' : '') + '</div>';
    if (res) {
      h += '<div class="group">' + cell(t('lc.median'), res.n ? ms(res.median) : '—') + cell(t('lc.p95'), res.n ? ms(res.p95) : '—') + cell(t('lc.max'), res.n ? ms(res.max) : '—') +
        cell(t('lc.loss'), t('lc.lossV', { lost: res.lost, sent: res.sent, pct: res.lossPct })) + cell(t('lc.jitter'), res.n ? ms(res.jitter) : '—') + '</div>' +
        '<p class="ftr"><b>' + esc(t('lc.v.' + res.verdict)) + '</b></p>';
    } else if (!running) h += '<p class="ftr">' + esc(t('lc.hint')) + '</p>';
    return h + chanHTML();
  };
  const api = sheet(body, (el) => {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lc]');
      if (!b) return;
      const a = b.dataset.lc;
      if (a === 'run') run();
      else if (a === 'stop') stop = true;
      else if (a === 'chan') {
        const l = linkFor(dev);
        if (l && l.state !== 'idle' && l.state !== 'failed') closeLink();
        else if (!openLink(dev)) toast(t('lc.err.net'));
        api.update();
      }
    });
  }, { onClose: () => { clearInterval(timer); if (unsub) unsub(); stop = true; } });
  unsub = subscribeLink(() => { try { api.update(); } catch { /* шторка закрыта */ } });
  timer = setInterval(() => { if (!running) api.update(); }, 1000);
  return api;
}
