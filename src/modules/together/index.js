// «Вместе» — совместное чтение (слово автора 22.11.2026; церковный режим). Один экран: партнёр и серия, чтение на сегодня,
// отчёт дня (фото, что запомнилось), отчёт партнёра с подтверждением, «Напомнить». Данные — общий репозиторий GitHub пары
// (src/core/together). Главная кнопка внизу; подключение — шторкой. Контракт модуля — MODULE_SPEC.md.
import './together.css';
import ru from './i18n/ru.json';
import uz from './i18n/uz.json';
import en from './i18n/en.json';
import meta, { ICON } from './meta.js';
import { BOOKS, bookOf, refText } from '../../core/bible.js';

let host = null, ctx = null, size = 'full', off = null, partnerPhoto = '';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const G = () => ctx.together;
const refKeys = (r) => (r && r.b ? Array.from({ length: (r.c2 && r.c2 > r.c ? r.c2 : r.c) - r.c + 1 }, (_, i) => r.b + '.' + (r.c + i)) : []);
const refStr = (r) => (r ? refText(refKeys(r)) : '');

// Чтение на сегодня из плана (ядро: ctx.bible) → { b, c, c2? } | null
function todayRef() {
  try {
    const rd = ctx.bible && ctx.bible.today && ctx.bible.today();
    if (rd && rd.keys && rd.keys.length) {
      const first = rd.keys[0].split('.'), same = rd.keys.filter((k) => k.split('.')[0] === first[0]), last = +same[same.length - 1].split('.')[1];
      return { b: first[0], c: +first[1], ...(last > +first[1] ? { c2: last } : {}) };
    }
    const p = ctx.bible && ctx.bible.pos && ctx.bible.pos();
    if (p && p.code) return { b: p.code, c: p.ch || 1 };
  } catch { /* плана нет */ }
  return null;
}

function stateText(st) { return ctx.t(st === 'done' ? 'st.done' : st === 'posted' ? 'st.posted' : 'st.none'); }

function render() {
  if (!host) return;
  const t = ctx.t, g = G();
  if (!g.connected) {
    host.innerHTML = '<div class="tg"><div class="tgempty"><button class="btn fill block" data-x="connect" style="min-height:56px;max-width:320px">' + esc(t('connect')) + '</button></div></div>';
    return;
  }
  const m = g.model, st = g.status, me = g.me, p = g.partner, today = g.today;
  const myState = m ? m.dayState(me, today) : 'none', pState = p && m ? m.dayState(p, today) : 'none';
  const pName = p ? g.profile(p).name : '', big = size === 'full';
  const ref = todayRef(), prep = p && m ? m.checkins[p] : null;
  const lastD = prep ? Object.keys(prep).sort().pop() : null, last = lastD ? prep[lastD] : null;
  const unacked = last && !m.isAcked(p, 'c-' + lastD);
  const sc = m ? m.streak : { together: 0, best: 0, weeks: 0 };
  const stat = st.authError ? '<div class="tgstat bad">' + esc(t('authErr')) + '</div>' : st.offline || st.queue ? '<div class="tgstat">' + esc(st.offline ? t('offline') : t('queue', { n: st.queue })) + '</div>' : '';
  host.innerHTML = '<div class="tg">' +
    '<div class="tgtop"><span class="tgname">' + esc(p ? pName : t('partnerWait')) + '</span>' +
    '<span class="tgchip' + (sc.together ? ' on' : '') + '">' + esc(t('streak', { n: sc.together })) + '</span>' + (big && sc.weeks ? '<span class="tgchip">' + esc(t('weeks', { n: sc.weeks })) + '</span>' : '') + '</div>' +
    '<div class="tgrow"><div class="tgcard"><b>' + esc(g.name || t('st.me')) + '</b><small>' + esc(stateText(myState)) + '</small></div>' +
    '<div class="tgcard"><b>' + esc(pName || '—') + '</b><small>' + esc(p ? stateText(pState) : '') + '</small></div></div>' +
    '<div class="tgmid">' +
      '<div class="tgcard"><small>' + esc(t('today')) + '</small><b>' + esc(ref ? refStr(ref) : t('noPlan')) + '</b>' + (ref ? '<button class="btn sm" data-x="read" style="align-self:flex-start;margin-top:6px">' + esc(t('read')) + '</button>' : '') + '</div>' +
      (last ? '<div class="tgcard"><small>' + esc(t('partnerReport')) + ' · ' + esc(lastD) + '</small><div class="tgrep">' + (last.photo ? '<img alt="" id="tgpp" src="' + esc(partnerPhoto) + '">' : '') + '<p><b>' + esc(refStr(last.ref)) + '</b> ' + esc(last.text || '') + '</p></div>' +
        (unacked ? '<button class="btn fill" data-x="ack" style="margin-top:6px;min-height:48px">' + esc(t('confirm')) + '</button>' : '<small>' + esc(t('confirmed')) + '</small>') + '</div>' : (big ? '<div class="tgcard"><small>' + esc(t('noReport')) + '</small></div>' : '')) +
    '</div>' + stat +
    '<div class="tgbar"><button class="btn" data-x="nudge" style="min-height:52px">' + esc(t('nudge')) + '</button><button class="btn" data-x="sync" aria-label="' + esc(t('sync')) + '" style="min-height:52px">↻</button>' +
    '<button class="btn fill grow" data-x="report" style="min-height:52px;flex:1">' + esc(t(m && m.checkins[me] && m.checkins[me][today] ? 'reportEdit' : 'report')) + '</button></div></div>';
  if (last && last.photo) g.photoURL(last.photo).then((u) => { const i = host && host.querySelector('#tgpp'); if (u && i) { partnerPhoto = u; i.src = u; } });
}

const ERR = { auth: 'err.auth', notfound: 'err.notfound', forbidden: 'err.forbidden', network: 'err.network', nocouple: 'err.nocouple', full: 'err.full' };
function connectSheet() {
  const t = ctx.t, g = G();
  let create = false, busy = false;
  const api = ctx.ui.sheet(() => ctx.ui.snav(t('connect'), { left: '<button class="link l" data-close>' + esc(t('ui.cancel') || '×') + '</button>' }) +
    '<div class="group"><label class="cell"><input class="inp grow" data-f="invite" placeholder="' + esc(t('invite')) + '" autocomplete="off" autocapitalize="off" spellcheck="false" style="border:0;background:none"></label>' +
    '<label class="cell"><input class="inp grow" data-f="token" type="password" placeholder="' + esc(t('token')) + '" autocomplete="off" style="border:0;background:none"></label>' +
    '<label class="cell"><input class="inp grow" data-f="name" maxlength="40" placeholder="' + esc(t('yourName')) + '" style="border:0;background:none"></label></div>' +
    '<div class="group"><button class="cell act center" data-go="join">' + esc(t('join')) + '</button><button class="cell act center" data-go="create">' + esc(t('create')) + '</button></div>' +
    '<p class="ftr" data-err style="color:var(--red)"></p>',
  (el) => el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-go]'); if (!b || busy) return;
    const f = (k) => el.querySelector('[data-f="' + k + '"]').value.trim(), errEl = el.querySelector('[data-err]');
    const inv = ctx.together.parseInvite(f('invite')) || {}, token = f('token') || inv.token || '', name = f('name');
    if (!inv.owner || !token || !name) { errEl.textContent = t('err.fields'); return; }
    busy = true; errEl.textContent = '';
    try {
      await g.connect({ token, owner: inv.owner, repo: inv.repo, name, create: b.dataset.go === 'create' });
      api.close(); g.start(); render();
    } catch (er) { errEl.textContent = t(ERR[er && er.kind] || 'err.other'); }
    busy = false;
  }));
  void create;
  return api;
}

function reportSheet() {
  const t = ctx.t, g = G(), old = g.checkinOf(g.me), ref0 = (old && old.ref) || todayRef() || { b: 'JOH', c: 1 };
  let photo = null, photoUrl = '';
  const d = { b: ref0.b, c: ref0.c, c2: ref0.c2 && ref0.c2 > ref0.c ? ref0.c2 : 0, text: (old && old.text) || '' };
  const api = ctx.ui.sheet(() => {
    const bk = bookOf(d.b) || BOOKS[0], opt = (v, l, cur) => '<option value="' + v + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>';
    const chs = Array.from({ length: bk.chapters }, (_, i) => i + 1);
    return ctx.ui.snav(t('rep.title'), { left: '<button class="link l" data-close>' + esc(t('ui.cancel') || '×') + '</button>', right: '<button class="link b r" data-send>' + esc(t('rep.send')) + '</button>' }) +
      '<div class="group tgsheet"><div class="cell"><button class="tgph" data-pick style="border:0;cursor:pointer" aria-label="' + esc(t('rep.photo')) + '">' + (photoUrl ? '<img alt="" src="' + photoUrl + '">' : esc(t('rep.photo'))) + '</button></div>' +
      '<label class="cell"><span class="grow">' + esc(t('rep.book')) + '</span><select class="sortsel" data-f="b">' + BOOKS.map((b) => opt(b.code, b.name, d.b)).join('') + '</select></label>' +
      '<label class="cell"><span class="grow">' + esc(t('rep.chapter')) + '</span><select class="sortsel" data-f="c">' + chs.map((n) => opt(n, n, d.c)).join('') + '</select></label>' +
      '<label class="cell"><span class="grow">' + esc(t('rep.to')) + '</span><select class="sortsel" data-f="c2">' + opt(0, '—', d.c2) + chs.filter((n) => n > d.c).map((n) => opt(n, n, d.c2)).join('') + '</select></label>' +
      '<label class="cellcol"><span class="l2" style="font-size:13px">' + esc(t('rep.text')) + '</span><textarea class="inp" data-f="text" rows="4" maxlength="2000" style="width:100%;margin-top:6px">' + esc(d.text) + '</textarea></label></div>' +
      '<input type="file" accept="image/*" data-file hidden>';
  }, (el) => {
    const sync = () => { const ta = el.querySelector('[data-f="text"]'); if (ta) d.text = ta.value; };
    el.addEventListener('change', async (e) => {
      const f = e.target.closest('[data-f]');
      if (f && f.dataset.f !== 'text') { sync(); if (f.dataset.f === 'b') { d.b = f.value; d.c = 1; d.c2 = 0; } else d[f.dataset.f] = +f.value; if (d.c2 && d.c2 <= d.c) d.c2 = 0; api.update(); return; }
      if (e.target.matches('[data-file]') && e.target.files[0]) {
        try { const { toJpeg } = await import('../../core/together/image.js'); photo = await toJpeg(e.target.files[0]); photoUrl = URL.createObjectURL(photo); sync(); api.update(); } catch { ctx.ui.toast(t('err.other')); }
      }
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-pick]')) { sync(); el.querySelector('[data-file]').click(); return; }
      if (e.target.closest('[data-send]')) {
        sync();
        g.postCheckin({ ref: { b: d.b, c: d.c, ...(d.c2 ? { c2: d.c2 } : {}) }, text: d.text, photo });
        ctx.ui.toast(t('rep.saved')); api.close(); render();
      }
    });
  });
  return api;
}

function onClick(e) {
  const b = e.target.closest('[data-x]'); if (!b) return;
  const g = G(), t = ctx.t, x = b.dataset.x;
  if (x === 'connect') connectSheet();
  else if (x === 'report') reportSheet();
  else if (x === 'read') ctx.openTool('bible');
  else if (x === 'sync') g.sync(true).then(render);
  else if (x === 'nudge') ctx.ui.toast(t(g.nudge() ? 'nudged' : 'nudgeWait'));
  else if (x === 'ack') { const p = g.partner, m = g.model, d = p && m.checkins[p] ? Object.keys(m.checkins[p]).sort().pop() : null; if (d) { g.ack(p, 'c-' + d); render(); } }
}

export default {
  ...meta,
  status: (c) => (c.together && c.together.connected && c.together.model ? c.t('streak', { n: c.together.model.streak.together }) : ''),
  mount(el, c, sz) {
    host = el; ctx = c; size = sz;
    host.addEventListener('click', onClick);
    off = ctx.together.subscribe(render);
    render();
    if (ctx.together.connected) { ctx.together.start(); ctx.together.markSeen(); }
  },
  resize(sz) { size = sz; render(); },
  unmount() {
    if (host) host.removeEventListener('click', onClick);
    if (off) off(); off = null;
    if (ctx && ctx.together) ctx.together.stop();
    host = null;
  },
};
export { ICON, ru, uz, en };
