// Пульт другого устройства (Melete DEV, шаг 2): шторка на этом устройстве — что звучит там, играть и пауза, перемотка,
// соседняя запись, громкость каждой дорожки разделённой записи, скорость, тональность, список записей (касание — играть).
// Состояние — раз в секунду (пока шторка открыта); команды — сразу. Канал и ключ — от сопряжения (sync.js).
import { t } from '../../i18n/index.js';
import { sheet, snav, esc, toast } from '../../ui/index.js';
import { http } from '../sync.js';

const PARTS = ['vocals', 'inst', 'drums', 'bass', 'guitar', 'piano', 'other'];
const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// dev: { addr, key, name } — сопряжённое устройство (телефон из «Моих устройств» или компьютер)
export function remoteSheet(app, dev, H = http) {
  let S = null, list = [], err = '', timer = 0, touching = false, q = '';
  const call = (path, json) => H(json ? 'POST' : 'GET', dev.addr + path, { key: dev.key, json, timeout: 15000 });
  const fail = (e) => { err = t(e && e.status === 401 ? 'rc.err.key' : e && e.status === 409 ? 'rc.err.off' : 'rc.err.net'); };
  async function poll() {
    try { const r = await call('/melete/v1/rc/state'); S = r.media; list = r.list || []; err = ''; } catch (e) { fail(e); }
    if (!touching) api.update();
  }
  async function cmd(c) {
    try { const r = await call('/melete/v1/rc/cmd', c); if (r && r.media) S = r.media; err = ''; } catch (e) { fail(e); toast(err); }
    api.update();
  }
  const btn = (a, label, txt, extra = '') => '<button class="rcb' + (extra ? ' ' + extra : '') + '" data-rc="' + a + '" aria-label="' + esc(label) + '">' + txt + '</button>';
  const body = () => {
    let h = snav(t('rc.title', { name: dev.name || '' })) + '<div class="rc">';
    if (err) h += '<p class="ftr danger">' + esc(err) + '</p>';
    if (S && S.id) {
      h += '<div class="rcnow"><b>' + esc(String(S.name).replace(/\.[a-z0-9]{2,5}$/i, '')) + '</b><span class="l2 num">' + fmt(S.pos) + ' / ' + fmt(S.dur) + '</span></div>' +
        '<input class="rcseek" type="range" min="0" max="' + Math.max(1, Math.round(S.dur)) + '" step="1" value="' + Math.round(S.pos) + '" data-rcv="seek" aria-label="' + esc(t('rc.seek')) + '">' +
        '<div class="rcrow">' + btn('prev', t('rc.prev'), '⏮') + btn('back', t('rc.back'), '−10') + btn('play', t(S.playing ? 'rc.pause' : 'rc.play'), S.playing ? '❚❚' : '▶', 'main') + btn('fwd', t('rc.fwd'), '+10') + btn('next', t('rc.next'), '⏭') + '</div>' +
        '<div class="rcrow small"><span class="l2">' + esc(t('rc.rate')) + '</span>' + btn('rate-', t('rc.slower'), '−') + '<b class="num">' + Math.round((S.rate || 1) * 100) + ' %</b>' + btn('rate+', t('rc.faster'), '+') +
        '<span class="l2">' + esc(t('rc.key')) + '</span>' + btn('key-', t('rc.lower'), '−') + '<b class="num">' + (S.key > 0 ? '+' : '') + (S.key || 0) + '</b>' + btn('key+', t('rc.higher'), '+') + '</div>';
      const stems = (S.stems || []).slice().sort((a, b) => PARTS.indexOf(a.part) - PARTS.indexOf(b.part));
      if (stems.length) h += '<div class="hdr">' + esc(t('rc.stems')) + '</div><div class="group">' + stems.map((x) => '<label class="cell rcstem"><span class="rcpart">' + esc(t('rc.part.' + x.part)) + '</span>' +
        '<input type="range" min="0" max="1.5" step="0.05" value="' + x.v + '" data-rcv="stem" data-part="' + esc(x.part) + '" aria-label="' + esc(t('rc.part.' + x.part)) + '"><span class="num rcpct">' + Math.round(x.v * 100) + '</span></label>').join('') + '</div>';
    } else if (!err) h += '<p class="ftr">' + esc(t(S ? 'rc.none' : 'rc.wait')) + '</p>';
    const L = q ? list.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())) : list;
    h += '<div class="hdr">' + esc(t('rc.list')) + '</div>' + (list.length > 8 ? '<input class="inp rcq" data-rcq value="' + esc(q) + '" placeholder="' + esc(t('rc.find')) + '" aria-label="' + esc(t('rc.find')) + '">' : '') +
      '<div class="group">' + (L.length ? L.slice(0, 100).map((x) => '<button class="cell act' + (S && S.id === x.id ? ' on' : '') + '" data-rcopen="' + esc(x.id) + '"><span class="grow">' + esc(x.name) + '</span><span class="l2 num">' + fmt(x.dur) + '</span></button>').join('') : '<div class="cellcol"><span class="l2">' + esc(t('rc.empty')) + '</span></div>') + '</div></div>';
    return h;
  };
  const api = sheet(body, (el) => {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rc]');
      if (b && S) {
        const a = b.dataset.rc;
        if (a === 'play') cmd({ a: 'play' });
        else if (a === 'prev') cmd({ a: 'step', d: -1 });
        else if (a === 'next') cmd({ a: 'step', d: 1 });
        else if (a === 'back') cmd({ a: 'seek', t: (S.pos || 0) - 10 });
        else if (a === 'fwd') cmd({ a: 'seek', t: (S.pos || 0) + 10 });
        else if (a === 'rate-' || a === 'rate+') cmd({ a: 'rate', r: Math.round(((S.rate || 1) + (a === 'rate+' ? 0.05 : -0.05)) * 100) / 100 });
        else if (a === 'key-' || a === 'key+') cmd({ a: 'key', p: (S.key || 0) + (a === 'key+' ? 1 : -1) });
        return;
      }
      const o = e.target.closest('[data-rcopen]');
      if (o) cmd({ a: 'open', id: o.dataset.rcopen });
    });
    // ползунки: пока палец на нём — опрос не перерисовывает; отпустил — команда
    el.addEventListener('pointerdown', (e) => { if (e.target.matches('input[type=range]')) touching = true; });
    el.addEventListener('change', (e) => {
      const d = e.target.dataset;
      touching = false;
      if (d.rcv === 'seek') cmd({ a: 'seek', t: +e.target.value });
      else if (d.rcv === 'stem') cmd({ a: 'stem', part: d.part, v: +e.target.value });
    });
    el.addEventListener('input', (e) => {
      if (e.target.matches('[data-rcq]')) { q = e.target.value; const at = e.target.selectionStart; api.update(); const i = api.el.querySelector('[data-rcq]'); if (i) { i.focus(); i.setSelectionRange(at, at); } }
      else if (e.target.dataset.rcv === 'stem') { const p = e.target.parentNode.querySelector('.rcpct'); if (p) p.textContent = Math.round(e.target.value * 100); }
    });
  }, { onClose: () => clearInterval(timer) });
  poll();
  timer = setInterval(() => { if (!document.activeElement || !document.activeElement.matches('[data-rcq]')) poll(); }, 1000);
  return api;
}
