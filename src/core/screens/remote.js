// Пульт другого устройства (Melete DEV, шаг 2): шторка на этом устройстве — что звучит там, играть и пауза, перемотка,
// соседняя запись, громкость каждой дорожки разделённой записи, скорость, тональность, список записей (касание — играть).
// Состояние — раз в секунду (пока шторка открыта); команды — сразу. Канал и ключ — от сопряжения (sync.js).
import { t } from '../../i18n/index.js';
import { sheet, snav, esc, toast } from '../../ui/index.js';
import { http } from '../sync.js';
import { mName } from '../../music/notes.js';

const PARTS = ['vocals', 'inst', 'drums', 'bass', 'guitar', 'piano', 'other'];
const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// dev: { addr, key, name } — сопряжённое устройство (телефон из «Моих устройств» или компьютер)
export function remoteSheet(app, dev, H = http) {
  let S = null, X = null, list = [], err = '', timer = 0, touching = false, q = '', view = 'snd';
  const call = (path, json) => H(json ? 'POST' : 'GET', dev.addr + path, { key: dev.key, json, timeout: 15000 });
  const fail = (e) => { err = t(e && e.status === 401 ? 'rc.err.key' : e && e.status === 409 ? 'rc.err.off' : 'rc.err.net'); };
  async function poll() {
    try { const r = await call('/melete/v1/rc/state'); S = r.media; X = r.snd || null; list = r.list || []; err = ''; } catch (e) { fail(e); }
    if (!touching) api.update();
  }
  async function cmd(c) {
    try { const r = await call('/melete/v1/rc/cmd', c); if (r && r.media !== undefined) S = r.media; if (r && r.snd) X = r.snd; err = ''; } catch (e) { fail(e); toast(err); }
    api.update();
  }
  const btn = (a, label, txt, extra = '') => '<button class="rcb' + (extra ? ' ' + extra : '') + '" data-rc="' + a + '" aria-label="' + esc(label) + '">' + txt + '</button>';
  // Звук и инструменты: пауза всего, метроном, пэды и арпеджиатор, громкости шин, открыть инструмент
  const sw = (a, on, label) => '<button class="rcsw' + (on ? ' on' : '') + '" data-rc="' + a + '" aria-pressed="' + !!on + '" aria-label="' + esc(label) + '">' + esc(t(on ? 'rc.on' : 'rc.offs')) + '</button>';
  function sndHTML() {
    if (!X) return err ? '' : '<p class="ftr">' + esc(t('rc.wait')) + '</p>';
    let h = '<div class="group"><div class="cell"><span class="grow">' + esc(t('rc.hold')) + '</span>' + sw('hold', X.held, t('rc.hold')) + '</div>';
    if (X.metro) h += '<div class="cell rcline"><span class="grow">' + esc(t('rc.metro')) + '</span>' + btn('bpm-', t('rc.slower'), '−') + '<b class="num">' + X.metro.bpm + '</b>' + btn('bpm+', t('rc.faster'), '+') + sw('metro', X.metro.running, t('rc.metro')) + '</div>';
    if (X.pads) h += '<div class="cell rcline"><span class="grow">' + esc(t('rc.pads')) + '</span>' + btn('pc-', t('rc.lower'), '−') + '<b class="num">' + esc(mName(60 + X.pads.pc).replace(/\d+$/, '')) + '</b>' + btn('pc+', t('rc.higher'), '+') + sw('pads', X.pads.on, t('rc.pads')) + '</div>' +
      '<div class="cellcol"><div class="rcchips">' + X.pads.chords.map((c) => '<button class="rcchip' + (X.pads.on && X.pads.chord === c ? ' on' : '') + '" data-rcchord="' + esc(c) + '">' + esc(t('rc.ch.' + c)) + '</button>').join('') + '</div></div>' +
      '<div class="cell"><span class="grow">' + esc(t('rc.arp')) + '</span>' + sw('arp', X.pads.arp, t('rc.arp')) + '</div>';
    h += '</div>';
    const B = X.buses.slice().sort((a, b) => (b.active - a.active));
    if (B.length) h += '<div class="hdr">' + esc(t('rc.mix')) + '</div><div class="group">' + B.map((b) => '<label class="cell rcstem' + (b.active ? '' : ' idle') + '"><span class="rcpart">' + esc(b.name) + '</span><input type="range" min="0" max="1.5" step="0.05" value="' + b.vol + '" data-rcv="vol" data-bus="' + esc(b.id) + '" aria-label="' + esc(b.name) + '"><span class="num rcpct">' + Math.round(b.vol * 100) + '</span>' + sw('mute:' + b.id, b.on, b.name) + '</label>').join('') + '</div>';
    if (X.tools.length) h += '<div class="hdr">' + esc(t('rc.tools')) + '</div><div class="rcchips">' + X.tools.map((m) => '<button class="rcchip" data-rctool="' + esc(m.id) + '">' + esc(m.name) + '</button>').join('') + '</div><p class="ftr">' + esc(t('rc.toolsHint')) + '</p>';
    return h;
  }
  const body = () => {
    let h = snav(t('rc.title', { name: dev.name || '' })) + '<div class="rc"><div class="seg rcseg" role="tablist">' + ['snd', 'media'].map((k) => '<button role="tab" data-rcview="' + k + '" aria-selected="' + (view === k) + '"' + (view === k ? ' class="on"' : '') + '>' + esc(t('rc.v.' + k)) + '</button>').join('') + '</div>';
    if (err) h += '<p class="ftr danger">' + esc(err) + '</p>';
    if (view === 'snd') return h + sndHTML() + '</div>';
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
      const v = e.target.closest('[data-rcview]');
      if (v) { view = v.dataset.rcview; api.update(); return; }
      const ch = e.target.closest('[data-rcchord]');
      if (ch) { cmd({ a: 'padchord', c: ch.dataset.rcchord }); return; }
      const tl = e.target.closest('[data-rctool]');
      if (tl) { cmd({ a: 'tool', id: tl.dataset.rctool }); toast(t('rc.opened')); return; }
      const b0 = e.target.closest('[data-rc]');
      if (b0 && X) {
        const a = b0.dataset.rc;
        if (a === 'hold') { e.preventDefault(); cmd({ a: 'hold', on: !X.held }); return; }
        if (a === 'metro') { cmd({ a: 'metro', on: !X.metro.running }); return; }
        if (a === 'bpm-' || a === 'bpm+') { cmd({ a: 'bpm', v: X.metro.bpm + (a === 'bpm+' ? 1 : -1) }); return; }
        if (a === 'pads') { cmd({ a: 'pads', on: !X.pads.on }); return; }
        if (a === 'pc-' || a === 'pc+') { cmd({ a: 'padpc', pc: (X.pads.pc + (a === 'pc+' ? 1 : 11)) % 12 }); return; }
        if (a === 'arp') { cmd({ a: 'arp', on: !X.pads.arp }); return; }
        if (a.startsWith('mute:')) { e.preventDefault(); const bus = a.slice(5), bb = X.buses.find((x) => x.id === bus); cmd({ a: 'mute', bus, on: !(bb && bb.on) }); return; }
      }
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
      else if (d.rcv === 'vol') cmd({ a: 'vol', bus: d.bus, v: +e.target.value });
    });
    el.addEventListener('input', (e) => {
      if (e.target.matches('[data-rcq]')) { q = e.target.value; const at = e.target.selectionStart; api.update(); const i = api.el.querySelector('[data-rcq]'); if (i) { i.focus(); i.setSelectionRange(at, at); } }
      else if (e.target.dataset.rcv === 'stem' || e.target.dataset.rcv === 'vol') { const p = e.target.parentNode.querySelector('.rcpct'); if (p) p.textContent = Math.round(e.target.value * 100); }
    });
  }, { onClose: () => clearInterval(timer) });
  poll();
  timer = setInterval(() => { if (!document.activeElement || !document.activeElement.matches('[data-rcq]')) poll(); }, 1000);
  return api;
}
