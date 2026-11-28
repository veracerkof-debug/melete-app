// Экран «Устройства» (слово автора 28.11.2026: «интерфейс коннекта к разным устройствам очень неудобный и неинтуитивный»).
// Раньше страница связи была простынёй из шести блоков с вводом адреса и кода вручную, и человек не видел, с кем именно
// идёт синхронизация, по какому адресу и почему не работает. Теперь: список «Мои устройства» (карточка на каждое —
// статус, что включено, когда синхронизировано, две крупные кнопки), шторка устройства (переключатели, проверка связи,
// адрес, «Забыть»), мастер «Подключить устройство» в три шага и свёрнутые «Другие способы».
// Движок связи (sync.js, linkmode.js, mesh) не тронут: здесь только вид и те же вызовы (pair, syncNow, setLinkMode…).
import { Capacitor } from '@capacitor/core';
import { t } from '../../i18n/index.js';
import { sheet, snav, esc, toast, confirm, icons } from '../../ui/index.js';
import { isDesktop } from '../desktop.js';
import { DEV } from '../variants.js';
import { WEB } from '../platform.js';
import { pcOf, oldPc, pair, syncNow, forgetPc, forgetDev, devsOf, setLinkMode, fpCheck, meshClient, http, refreshMyRole, PORT } from '../sync.js';
import { modeOf } from '../linkmode.js';
import { ROLES, roleOf, roleToMode } from '../roles.js';
import { scanQR, parsePair, pairPayload, qrHTML } from './qrscan.js';
import { CHEV } from './common.js';

/* ---------- чистая логика (без DOM, проверяется тестами) ---------- */

export const SOON = 2 * 3600 * 1000; // обмен был не позже — «на связи»
export const ERR_KEEP = 6 * 3600 * 1000; // ошибка свежее этого и новее последнего обмена — «не отвечает»
// Причины, после которых устройство считается «не отвечающим»; «занято», «прервано», «уже идёт» — не поломка
export const DOWN = ['unreachable', 'key', 'pin', 'off', 'tls', 'addr', 'repair'];

// Статус устройства по последнему обмену и последней ошибке — без опроса сети.
// → { id: 'ok' | 'old' | 'down' | 'new', reason }
export function statusOf({ last = 0, errAt = 0, errReason = '', now = Date.now() } = {}) {
  if (errAt && errAt > last && now - errAt < ERR_KEEP && DOWN.includes(errReason)) return { id: 'down', reason: errReason };
  if (!last) return { id: 'new', reason: '' };
  return { id: now - last <= SOON ? 'ok' : 'old', reason: '' };
}

// Сеть по адресу: частные диапазоны различаются, всё остальное (мобильный интернет) — 'ext'
const netKey = (ip) => {
  const m = /(\d+)\.(\d+)\.(\d+)\.(\d+)/.exec(String(ip || ''));
  if (!m) return null;
  const [a, b, c] = [+m[1], +m[2], +m[3]];
  if (a === 192 && b === 168) return '192.168.' + c;
  if (a === 172 && b >= 16 && b <= 31) return '172.' + b;
  if (a === 10) return '10';
  return 'ext';
};
// Одна ли сеть у двух адресов: true / false, а если не понять (нет адреса, обе «внешние») — null
export function sameNet(mine, other) {
  const a = netKey(mine), b = netKey(other);
  if (!a || !b || (a === 'ext' && b === 'ext')) return null;
  return a === b;
}

// Что можно подключить на этом устройстве: [{ id: 'pc' | 'phone', roles: ['show' | 'join'] }]
//   show — показать код здесь (это устройство принимает подключения), join — подключиться к другому (код и адрес с его экрана)
export function waysOf({ native = false, srv = false, mesh = false, meshCli = false } = {}) {
  const phone = [];
  if (srv || mesh) phone.push('show');
  if (mesh || meshCli) phone.push('join');
  const out = [];
  if (native) out.push({ id: 'pc', roles: ['join'] }); // телефон подключается к компьютеру; компьютер показывает код
  if (phone.length) out.push({ id: 'phone', roles: phone });
  return out;
}
const env = (app) => ({ native: Capacitor.isNativePlatform(), srv: !!(app.syncSrv && app.syncSrv.avail), mesh: !!(app.mesh && app.mesh.avail), meshCli: meshClient() });

// Ошибки, о которых человеку не говорят «не отвечает»
const errs = new Map(); // id → { at, reason }
const okAt = new Map(); // id → время явной проверки связи или синхронизации
const busy = new Set(), msgs = new Map(); // идёт синхронизация этого устройства, ход строкой
const noteErr = (id, reason) => { if (DOWN.includes(reason)) errs.set(id, { at: Date.now(), reason }); };
const noteOk = (id) => { errs.delete(id); okAt.set(id, Date.now()); };
const phoneName = (n) => !/(^|\s)(пк|pc|компьютер|windows|linux|desktop|computer)/i.test(String(n || ''));

// Карточки устройств: компьютер телефона, «Мои устройства», подключившиеся к этому устройству
export function devicesOf(app, now = Date.now()) {
  const list = [];
  const add = (c) => {
    const e = errs.get(c.id), cli = c.kind === 'pc' && app.syncCli && app.syncCli.last && !app.syncCli.last.ok ? app.syncCli.last : null;
    const best = e && (!cli || e.at >= cli.at) ? e : cli ? { at: cli.at, reason: cli.reason } : { at: 0, reason: '' }; // свежее из: своя ошибка, ошибка фоновой синхронизации
    c.status = statusOf({ last: Math.max(c.last || 0, okAt.get(c.id) || 0), errAt: best.at, errReason: best.reason, now });
    c.mode = modeOf(c.entry);
    c.role = roleOf(c.entry); // у входящего — роль, выданная ему здесь; у исходящего — моя роль там
    list.push(c);
  };
  const pc = pcOf();
  if (pc) add({ id: 'pc', kind: 'pc', out: true, phone: false, name: pc.name || 'PC', addr: pc.addr, fp: pc.fp || '', key: pc.key, last: pc.last || 0, entry: pc, canRcHere: !!(app.mesh && app.mesh.avail) });
  for (const d of devsOf()) add({ id: 'dev:' + d.addr, kind: 'dev', out: true, phone: d.phone !== false, name: d.name || d.addr, addr: d.addr, fp: d.fp || '', key: d.key, last: d.last || 0, entry: d, canRcHere: true });
  for (const S of [app.syncSrv, app.mesh]) {
    if (!S || !S.avail) continue;
    for (const p of S.peers) add({ id: (S.mesh ? 'mesh:' : 'srv:') + p.key, kind: 'in', out: false, S, phone: phoneName(p.name), name: p.name || '—', addr: '', fp: '', key: p.key, last: p.at || 0, entry: p, canRcHere: false });
  }
  for (const c of list) { c.canSync = c.out && c.mode.sync; c.canRc = c.out && c.mode.rc && c.canRcHere; }
  return list;
}

// Тексты ошибок связи — одинаково для компьютера и телефона
export const errText = (reason) => {
  const r = ['unreachable', 'code', 'addr', 'wait', 'off', 'tls', 'key', 'pin', 'repair', 'busy', 'mode', 'running', 'stopped', 'nopc', 'port'].includes(reason) ? reason : 'unreachable';
  return t('dv.err.' + r);
};
const stepText = (x) => (x.stage === 'data' ? t('sy.step.data') : t('sy.step.' + x.stage, { n: (x.done || 0) + 1, total: x.total || 0, name: x.name || '' }));
const ago = (ts) => { if (!ts) return t('sy.never'); const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? t('sy.just') : m < 60 ? t('sy.min', { n: m }) : new Date(ts).toLocaleString(); };

/* ---------- сеть (src/core/netinfo.js пишет другая работа; нет файла — плашки нет, всё как раньше) ---------- */

const NET = import.meta.glob('../netinfo.js'); // пустой, пока файла нет
let net = null, netAt = 0;
export async function refreshNet() {
  const load = NET['../netinfo.js'];
  if (!load) return null;
  try { const m = await load(); const r = await m.netInfo(); net = r && typeof r === 'object' ? r : null; } catch { net = null; }
  netAt = Date.now();
  return net;
}
export const netState = () => net;
export const __setNet = (v) => { net = v; }; // для тестов

/* ---------- вид ---------- */

const IC = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M10.5 18.5h3"/></svg>',
  pc: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="12" rx="1.8"/><path d="M8 20h8M12 16.5V20"/></svg>',
  wifi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19.4" r="1" fill="currentColor"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};
const psw = (key, on, label) => '<label class="sw"><input type="checkbox" data-psw="' + key + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(label) + '"><i></i></label>';
const netBar = () => (net && net.wifi === false ? '<div class="dvnet" role="status">' + IC.wifi + '<span>' + esc(t('dv.nowifi')) + '</span></div>' : '');
// Подпись под устройством: роль (если не «моё») или что включено
const lineOf = (d) => (d.role !== 'own' ? t('role.' + d.role) : onLine(d.mode));
const onLine = (m) => [m.sync ? t('dv.on.sync') : '', m.rc ? t('dv.on.rc') : ''].filter(Boolean).join(' · ');
const stLabel = (d) => t('dv.st.' + d.status.id);
const hintOf = (d) => {
  if (d.status.id !== 'down') return '';
  const r = d.status.reason;
  if (r === 'unreachable' && net && net.wifi === false) return t('dv.nowifi');
  return t('dv.h.' + (['unreachable', 'key', 'pin', 'repair', 'off', 'tls', 'addr'].includes(r) ? r : 'unreachable'));
};

function cardHTML(d) {
  const isBusy = busy.has(d.id), id = esc(d.id), h = hintOf(d);
  const when = d.last ? (d.out ? t('dv.syncd', { when: ago(d.last) }) : t('dv.seen', { when: ago(d.last) })) : '';
  const re = d.status.id === 'down' && d.out && ['key', 'pin', 'repair', 'tls'].includes(d.status.reason) ? '<button class="link b" data-dv="add">' + esc(t('dv.reconnect')) + '</button>'
    : d.status.id === 'down' && d.out && d.kind === 'pc' ? '<button class="link b" data-dv="sync" data-id="' + id + '">' + esc(t('dv.refind')) + '</button>'
    : d.status.id === 'down' && d.out ? '<button class="link b" data-dv="add">' + esc(t('dv.reconnect')) + '</button>' : '';
  return '<div class="dvcard" data-st="' + d.status.id + '" data-id="' + id + '">' +
    '<button class="dvhead" data-dv="open" data-id="' + id + '" aria-label="' + esc(d.name + ', ' + stLabel(d)) + '">' +
      '<span class="dvic">' + (d.phone ? IC.phone : IC.pc) + '</span>' +
      '<span class="dvtx"><b class="dvname">' + esc(d.name) + '</b><span class="dvst"><i class="dvdot" aria-hidden="true"></i>' + esc(stLabel(d)) + '</span><span class="dvsub">' + esc(lineOf(d)) + '</span>' + (when ? '<span class="dvsub">' + esc(when) + '</span>' : '') + '</span>' + CHEV + '</button>' +
    (h ? '<div class="dvhint" role="status"><span>' + esc(h) + '</span>' + re + '</div>' : '') +
    (d.canSync || d.canRc ? '<div class="dvact">' +
      (d.canSync ? '<button class="dvbtn main" data-dv="sync" data-id="' + id + '"' + (isBusy ? ' disabled' : '') + '>' + esc(t(isBusy ? 'sy.busy' : 'sy.now')) + '</button>' : '') +
      (d.canRc ? '<button class="dvbtn" data-dv="rc" data-id="' + id + '">' + esc(t('dv.btn.rc')) + '</button>' : '') + '</div>' : '') +
    (isBusy && msgs.get(d.id) ? '<p class="dvprog" role="status">' + esc(msgs.get(d.id)) + '</p>' : '') +
    '</div>';
}

// Развёрнутые «другие способы»
const open = new Set();
const stripHdr = (h) => String(h || '').replace(/^<div class="hdr">[\s\S]*?<\/div>/, '');
function otherHTML(app, ctx, list) {
  const S = ctx.sections || {}, rows = [];
  const row = (key, label, val, body) => {
    const o = open.has(key);
    rows.push('<button class="cell act dvrow" data-dv="grp" data-g="' + key + '" aria-expanded="' + o + '"><span class="grow">' + esc(label) + '</span>' + (val ? '<span class="val l2">' + esc(val) + '</span>' : '') + CHEV + '</button>' + (o ? '<div class="dvgbody">' + stripHdr(body()) + '</div>' : ''));
  };
  const hasSrv = !!((app.syncSrv && app.syncSrv.avail) || (app.mesh && app.mesh.avail));
  if (hasSrv || list.some((d) => d.out)) rows.push('<button class="cell act dvrow" data-act="ens"><span class="grow">' + esc(t('ens.open')) + '</span>' + CHEV + '</button>');
  if (DEV && app.output) rows.push('<button class="cell act dvrow" data-act="outsheet"><span class="grow">' + esc(t('out.setTitle')) + '</span>' + CHEV + '</button>');
  const G = app.guest;
  if (G && G.avail && S.guest) row('guest', t('gs.title'), t(G.status.on ? 'dv.on' : 'dv.off'), S.guest);
  const L = app.localSend;
  if (L && L.available && !WEB && S.localSend) row('ls', t('ls.title'), L.enabled() && L.state.on ? t('dv.on') : t('dv.off'), S.localSend);
  if (!WEB && S.pcWork) row('pcwork', t('auto.pcTitle'), '', S.pcWork);
  const B = app.deskBg;
  if (B && B.avail && S.deskBg) row('bg', t('bg.title'), app.store.state.settings.deskBg === true ? t('dv.on') : t('dv.off'), S.deskBg);
  return rows.length ? '<div class="hdr">' + esc(t('dv.other')) + '</div><div class="group dvother">' + rows.join('') + '</div>' : '';
}

// Принимать подключения: переключатель и, пока включено, «Показать код»
function acceptHTML(app) {
  const S = app.syncSrv && app.syncSrv.avail ? app.syncSrv : app.mesh && app.mesh.avail ? app.mesh : null;
  if (!S) return '';
  const st = S.state, key = S.mesh ? 'meshOn' : 'syncSrv';
  return '<div class="group dvaccept"><div class="cell"><span class="grow">' + esc(t('dv.accept')) + '</span>' +
    (st.on ? '<button class="link b" data-dv="code">' + esc(t('dv.showCode')) + '</button>' : '') + psw(key, st.on, t('dv.accept')) + '</div></div>' +
    (st.err === 'port' && !st.on ? '<p class="dvnote danger">' + esc(t('sy.err.port2')) + '</p>' : '');
}

// Вся страница. ctx.sections — старые блоки панели (гости, LocalSend, работа компьютера, фон), функции (строятся лениво)
export function devicesHTML(app, ctx = {}) {
  const list = devicesOf(app), ways = waysOf(env(app));
  const cards = list.length ? '<div class="dvlist">' + list.map((d) => cardHTML(d)).join('') + '</div>'
    : '<div class="dvempty"><span class="dvic big">' + IC.phone + IC.pc + '</span><b>' + esc(t('dv.empty')) + '</b><span>' + esc(t(ways.length ? 'dv.emptySub' : 'dv.emptyNone')) + '</span></div>';
  return '<div class="dvpage"><div class="large">' + esc(t('page.link')) + '</div>' + netBar() +
    '<div class="hdr">' + esc(t('dv.mine')) + '</div>' + (!pcOf() && oldPc() ? '<p class="dvhint solo" role="status">' + esc(t('sy.err.repair')) + '</p>' : '') + cards +
    (ways.length ? '<button class="dvadd" data-dv="add">' + IC.plus + '<span>' + esc(t('dv.add')) + '</span></button>' : '') +
    acceptHTML(app) + otherHTML(app, ctx, list) + '</div>';
}

/* ---------- действия ---------- */

const find = (app, id) => devicesOf(app).find((x) => x.id === id);

// Синхронизация одного устройства: те же вызовы, что были на странице связи
function runSync(app, d, onStep) {
  if (d.kind === 'pc') return app.syncCli ? app.syncCli.run(onStep) : syncNow(app, onStep);
  return syncNow(app, onStep, undefined, { dev: d.addr });
}
async function syncCard(app, ctx, id, onMsg) {
  const d = find(app, id);
  if (!d || !d.canSync || busy.has(id)) return;
  busy.add(id); msgs.set(id, t('sy.step.data')); ctx.render(); if (onMsg) onMsg();
  try {
    const r = await runSync(app, d, (x) => { msgs.set(id, stepText(x)); ctx.render(); if (onMsg) onMsg(); });
    noteOk(id);
    toast(t('sy.done', { songs: r.songs, sessions: r.sessions, up: r.up, down: r.down }));
    if (ctx.onChange) ctx.onChange();
  } catch (e) {
    const reason = (e && e.reason) || 'unreachable';
    noteErr(id, reason);
    toast(errText(reason));
    // ключ не подошёл или отвечает не то устройство — запись забывается, подключить заново (как и раньше)
    if (reason === 'key' || reason === 'pin') { if (d.kind === 'pc') forgetPc(); else forgetDev(d.addr); errs.delete(id); }
  } finally { busy.delete(id); msgs.delete(id); ctx.render(); if (onMsg) onMsg(); }
}

async function forget(app, ctx, d) {
  const yes = await confirm(t('dv.forgetQ', { name: d.name }), t('dv.forgetText'), t('sy.forget'));
  if (!yes) return false;
  if (d.kind === 'pc') forgetPc(); else if (d.kind === 'dev') forgetDev(d.addr); else d.S.forget(d.key);
  errs.delete(d.id); okAt.delete(d.id);
  ctx.render();
  return true;
}

// Явная проверка связи: один лёгкий запрос /hello (ключ не уходит)
async function probe(d) {
  const t0 = performance.now();
  try {
    const h = await http('GET', d.addr + '/melete/v1/hello', { timeout: 5000, connect: 3000 });
    if (!h || h.app !== 'melete') throw Object.assign(new Error('not melete'), { reason: 'unreachable' });
    return { ok: true, ms: Math.round(performance.now() - t0) };
  } catch (e) { return { ok: false, reason: e && (e.reason === 'pin' || e.reason === 'tls') ? e.reason : e && e.reason === 'repair' ? 'repair' : 'unreachable' }; }
}

/* ---------- шторка устройства ---------- */

export function deviceSheet(app, ctx, id) {
  let res = null, probing = false, unsub = [];
  const modeRow = (k, on) => '<div class="cell sub"><span class="grow">' + esc(t('lm.' + k)) + '<span class="bksub">' + esc(t('lm.' + k + '.sub')) + '</span></span><label class="sw"><input type="checkbox" data-dvlm="' + k + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(t('lm.' + k)) + '"><i></i></label></div>';
  const body = () => {
    const d = find(app, id);
    if (!d) { setTimeout(() => api && api.close(), 0); return snav(''); }
    const h = hintOf(d);
    let s = snav(d.name) + '<div class="dvsh"><span class="dvic big">' + (d.phone ? IC.phone : IC.pc) + '</span><div class="dvtx"><span class="dvst" data-st="' + d.status.id + '"><i class="dvdot" aria-hidden="true"></i>' + esc(stLabel(d)) + '</span><span class="dvsub">' + esc(d.last ? (d.out ? t('dv.syncd', { when: ago(d.last) }) : t('dv.seen', { when: ago(d.last) })) : lineOf(d)) + '</span></div></div>';
    if (h) s += '<p class="dvhint solo" role="status">' + esc(h) + '</p>';
    // роль: у входящего меняется здесь и действует сразу; у исходящего показывается (её выдаёт то устройство)
    s += '<div class="group"><div class="cell"><span class="grow">' + esc(t(d.kind === 'in' ? 'role.title' : 'role.mine')) + '<span class="bksub">' + esc(t('role.' + d.role + '.sub')) + '</span></span><span class="val l2" data-dvrole-now="' + d.role + '">' + esc(t('role.' + d.role)) + '</span></div>' +
      (d.kind === 'in' ? ROLES.filter((r) => r !== d.role).map((r) => '<button class="cell act" data-dvrole="' + r + '">' + esc(t('role.make.' + r)) + '</button>').join('') : '') + '</div>';
    if (d.kind !== 'in' && d.role !== 'own') s += '<p class="dvhint solo" role="status">' + esc(t('role.mineHint')) + '</p>';
    const rm = roleToMode(d.role), rows = (rm.sync ? modeRow('sync', d.mode.sync) : '') + (rm.rc ? modeRow('rc', d.mode.rc) : '');
    if (rows) s += '<div class="group">' + rows + '</div>';
    if (d.out) {
      s += '<div class="group"><button class="cell act" data-dvs="check"' + (probing ? ' disabled' : '') + '>' + esc(t(probing ? 'dv.checking' : 'dv.check')) + '</button>' +
        (res ? '<div class="cell"><span class="grow">' + esc(t(res.ok ? 'dv.check.ok' : 'dv.check.fail', { ms: res.ms || 0 })) + '</span>' + (res.ok ? '' : '') + '</div>' : '') +
        (res && !res.ok ? '<p class="dvhint solo" role="status">' + esc(errText(res.reason)) + '</p>' : '') +
        (d.canRcHere ? '<button class="cell act" data-dvs="detail">' + esc(t('dv.detail')) + '</button>' : '') +
        (d.kind === 'pc' ? '<button class="cell act" data-dvs="refind"' + (busy.has(d.id) ? ' disabled' : '') + '>' + esc(t('dv.refind')) + '</button>' : '<button class="cell act" data-dvs="reconnect">' + esc(t('dv.reconnect')) + '</button>') +
        '<div class="cell"><span class="grow">' + esc(t('sy.addr')) + '</span><span class="val l2 num">' + esc(String(d.addr).replace(/^https:\/\//, '')) + (d.fp ? ' · ' + esc(fpCheck(d.fp)) : '') + '</span></div></div>';
    }
    s += '<div class="group"><button class="cell act danger" data-dvs="forget">' + esc(t('dv.forget')) + '</button></div>';
    return s;
  };
  const api = sheet(body, (el) => {
    el.addEventListener('change', (e) => {
      const k = e.target.dataset && e.target.dataset.dvlm;
      if (!k) return;
      const d = find(app, id);
      if (!d) return;
      const patch = { [k]: e.target.checked };
      if (d.kind === 'in') d.S.setMode(d.key, patch); else setLinkMode(patch, d.kind === 'dev' ? d.addr : undefined);
      ctx.render(); api.update();
    });
    el.addEventListener('click', async (e) => {
      const rb = e.target.closest('[data-dvrole]');
      if (rb) { const d = find(app, id); if (d && d.kind === 'in' && ROLES.includes(rb.dataset.dvrole)) { d.S.setRole(d.key, rb.dataset.dvrole); ctx.render(); api.update(); } return; }
      const b = e.target.closest('[data-dvs]');
      if (!b) return;
      const d = find(app, id), a = b.dataset.dvs;
      if (!d) return;
      if (a === 'check' && !probing) {
        probing = true; res = null; api.update();
        res = await probe(d);
        if (res.ok && d.out) await refreshMyRole(d.kind === 'dev' ? d.addr : undefined); // роль могли сменить на том устройстве
        probing = false;
        if (res.ok) noteOk(d.id); else noteErr(d.id, res.reason);
        ctx.render(); api.update();
      } else if (a === 'detail') import('./linkcheck.js').then((m) => m.linkSheet(app, d.entry));
      else if (a === 'refind') { api.close(); syncCard(app, ctx, d.id); }
      else if (a === 'reconnect') { api.close(); wizard(app, ctx); }
      else if (a === 'forget') { if (await forget(app, ctx, d)) api.close(); }
    });
    for (const S of [app.syncCli, app.mesh, app.syncSrv]) if (S && S.subscribe) unsub.push(S.subscribe(() => { try { api.update(); } catch { /* шторка закрыта */ } }));
  }, { onClose: () => { unsub.forEach((f) => f()); unsub = []; } });
  return api;
}

/* ---------- мастер «Подключить устройство» ---------- */

export function wizard(app, ctx, { show = false } = {}) {
  const types = waysOf(env(app));
  if (!types.length) return null;
  const S = app.syncSrv && app.syncSrv.avail ? app.syncSrv : app.mesh && app.mesh.avail ? app.mesh : null;
  const trail = []; // пройденные шаги — для «Назад»
  const s = { step: 'type', type: '', role: '', grant: 'own', addr: '', code: '', fp: '', busy: false, msg: '', res: null, known: [], syncing: '', syncMsg: '' };
  let unsub = [];
  const go = (step) => { trail.push(s.step); s.step = step; s.msg = ''; if (step === 'show') startShow(); if (step === 'join') s.fp = ''; api.update(); };
  const back = () => { if (!trail.length) { api.close(); return; } s.step = trail.pop(); s.msg = ''; api.update(); };
  const pickType = (id) => {
    s.type = id;
    const ty = types.find((x) => x.id === id);
    if (ty.roles.length === 1) { s.role = ty.roles[0]; go(s.role === 'show' ? 'grant' : s.role); } else go('role');
  };
  async function startShow() {
    if (!S) return;
    s.known = S.peers.map((p) => p.key);
    if (!S.state.on) {
      s.busy = true; api.update();
      try { await S.start(); } catch { s.msg = t('dv.err.port'); }
      s.busy = false;
    }
    api.update();
  }
  const newPeer = () => (S ? S.peers.find((p) => !s.known.includes(p.key)) : null);
  async function doJoin(q) {
    if (s.busy) return;
    s.busy = true; s.msg = t('sy.pairing'); api.update();
    try {
      const d = await pair(q.addr, q.code, t(isDesktop() ? 'sy.pcName' : 'sy.phoneName'));
      // отпечаток из QR не совпал — это не то устройство: связь не сохраняется
      if (q.fp && d.fp && !d.fp.startsWith(q.fp)) { if (d.phone) forgetDev(d.addr); else forgetPc(); throw Object.assign(new Error('fp'), { reason: 'tls' }); }
      s.res = { id: d.phone ? 'dev:' + d.addr : 'pc', name: d.name, phone: !!d.phone };
      okAt.set(s.res.id, Date.now());
      s.step = 'done'; trail.length = 0;
      ctx.render();
    } catch (e) { s.msg = errText(e && e.reason); }
    s.busy = false; api.update();
  }
  async function scan() {
    const x = await scanQR((v) => !!parsePair(v));
    const q = x && parsePair(x);
    if (!q) return;
    s.addr = q.addr; s.code = q.code; s.fp = q.fp;
    await doJoin(q);
  }
  const dots = (n) => '<div class="dvdots" role="img" aria-label="' + esc(t('dv.w.step', { n, total: 3 })) + '">' + [1, 2, 3].map((i) => '<i' + (i <= n ? ' class="on"' : '') + '></i>').join('') + '</div>';
  const tile = (act, val, ic, title, sub) => '<button class="dvtile" data-dvw="' + act + '" data-v="' + val + '"><span class="dvic">' + ic + '</span><span class="dvtx"><b>' + esc(title) + '</b><span class="dvsub">' + esc(sub) + '</span></span>' + CHEV + '</button>';
  const warnText = () => {
    const r = sameNet(net && net.ip, s.addr);
    return r === false ? t('dv.w.diffnet', { mine: net.ip, theirs: (/(\d+\.\d+\.\d+\.\d+)/.exec(s.addr) || [])[1] || '' }) : '';
  };
  function showHTML() {
    const st = S ? S.state : null;
    if (!st) return '';
    if (!st.on) return '<p class="dvnote" role="status">' + esc(s.msg || t('dv.w.starting')) + '</p>';
    const ip = st.ips[0], port = !S.mesh ? '' : st.port && st.port !== PORT ? ':' + st.port : '';
    if (!ip) return '<p class="dvnote danger" role="status">' + esc(t('dv.w.noIp')) + '</p>';
    const payload = pairPayload(ip + port, st.code, st.fp || '');
    return '<div class="cellcol sypair dvcode"><span class="l2">' + esc(t('sy.addr')) + '</span><b class="num sybig">' + esc(ip) + '</b>' +
      (st.ips.length > 1 && !S.mesh ? '<span class="l2">' + esc(st.ips.slice(1).join(', ')) + '</span>' : '') +
      '<span class="l2" style="margin-top:8px">' + esc(t('sy.code')) + '</span><b class="num sybig">' + esc(st.code.slice(0, 3) + ' ' + st.code.slice(3)) + '</b>' +
      (st.fp ? '<span class="l2" style="margin-top:8px">' + esc(t('sy.check')) + ' <b class="num">' + esc(fpCheck(st.fp)) + '</b></span>' : '') +
      '<div class="syqr" data-qr="' + esc(payload) + '">' + qrHTML(payload) + '</div></div>' +
      '<p class="dvnote">' + esc(t('dv.w.showHint')) + '</p><p class="dvwait" role="status"><i class="dvdot" aria-hidden="true"></i>' + esc(t('dv.w.wait')) + '</p>';
  }
  const body = () => {
    const back0 = '<button class="ic sm plain" data-dvw="back" aria-label="' + esc(t('dv.w.back')) + '">' + icons.back + '</button>';
    const head = (title) => snav(title, { left: s.step === 'type' && !trail.length ? '<span></span>' : back0 });
    if (s.step === 'type') {
      return head(t('dv.w.title')) + dots(1) + '<div class="dvq">' + esc(t('dv.w.what')) + '</div><div class="dvtiles">' +
        types.map((x) => tile('type', x.id, x.id === 'pc' ? IC.pc : IC.phone, t('dv.w.' + x.id), t('dv.w.' + x.id + '.sub'))).join('') + '</div>';
    }
    if (s.step === 'role') {
      return head(t('dv.w.title')) + dots(1) + '<div class="dvq">' + esc(t('dv.w.how')) + '</div><div class="dvtiles">' +
        types.find((x) => x.id === s.type).roles.map((r) => tile('role', r, r === 'show' ? IC.wifi : IC.plus, t('dv.w.' + r), t('dv.w.' + r + '.sub'))).join('') + '</div>';
    }
    if (s.step === 'grant') {
      return head(t('dv.w.show')) + dots(2) + '<div class="dvq">' + esc(t('role.choose')) + '</div><div class="dvtiles">' +
        ROLES.map((r) => tile('grant', r, r === 'own' ? IC.ok : r === 'view' ? IC.wifi : IC.plus, t('role.' + r), t('role.' + r + '.sub'))).join('') + '</div>';
    }
    if (s.step === 'show') return head(t('dv.w.show')) + dots(2) + netBar() + '<p class="dvnote">' + IC.ok + esc(t('dv.w.wifi')) + '</p>' + (s.grant !== 'own' ? '<p class="dvnote">' + esc(t('role.once', { role: t('role.' + s.grant) })) + '</p>' : '') + showHTML();
    if (s.step === 'join') {
      const wt = warnText();
      return head(t('dv.w.join')) + dots(2) + netBar() + '<p class="dvnote">' + IC.ok + esc(t('dv.w.wifi')) + '</p>' +
        (Capacitor.isNativePlatform() ? '<div class="group"><button class="cell act" data-dvw="scan"' + (s.busy ? ' disabled' : '') + '>' + esc(t('qr.scan')) + '</button></div><p class="dvnote">' + esc(t('dv.w.or')) + '</p>' : '<p class="dvnote">' + esc(t('dv.w.joinHint')) + '</p>') +
        '<div class="group"><label class="cell"><span>' + esc(t('sy.addr')) + '</span><input class="inp" data-dvin="addr" inputmode="decimal" placeholder="192.168.1.23" value="' + esc(s.addr) + '" aria-label="' + esc(t('sy.addr')) + '"></label>' +
        '<label class="cell"><span>' + esc(t('sy.code')) + '</span><input class="inp" data-dvin="code" inputmode="numeric" maxlength="7" placeholder="000 000" value="' + esc(s.code) + '" aria-label="' + esc(t('sy.code')) + '"></label>' +
        '<button class="cell act" data-dvw="join"' + (s.busy ? ' disabled' : '') + '>' + esc(t('dv.w.connect')) + '</button></div>' +
        '<p class="dvnote danger" data-dvwarn' + (wt ? '' : ' hidden') + '>' + esc(wt) + '</p>' +
        (s.msg ? '<p class="dvnote' + (s.busy ? '' : ' danger') + '" role="status">' + esc(s.msg) + '</p>' : '');
    }
    // done
    const r = s.res || {}, d = r.id ? find(app, r.id) : null, bz = r.id && busy.has(r.id);
    return snav(t('dv.w.title'), { left: '<span></span>' }) + dots(3) + '<div class="dvdone"><span class="dvic big ok">' + IC.ok + '</span><b>' + esc(t('sy.paired', { name: r.name || '' })) + '</b>' +
      (r.incoming ? '<span class="dvsub">' + esc(t('dv.w.doneIn')) + '</span>' : '') + '</div>' +
      '<div class="group">' + (d && d.canSync ? '<button class="cell act" data-dvw="sync"' + (bz ? ' disabled' : '') + '>' + esc(t(bz ? 'sy.busy' : 'sy.now')) + '</button>' : '') +
      '<button class="cell act" data-dvw="finish">' + esc(t('ui.done')) + '</button></div>' + (bz && msgs.get(r.id) ? '<p class="dvnote" role="status">' + esc(msgs.get(r.id)) + '</p>' : '');
  };
  const api = sheet(body, (el) => {
    el.addEventListener('input', (e) => {
      const k = e.target.dataset && e.target.dataset.dvin;
      if (!k) return;
      s[k] = e.target.value;
      const w = el.querySelector('[data-dvwarn]');
      if (w) { const x = warnText(); w.textContent = x; w.hidden = !x; } // без перерисовки: ввод не сбрасывается
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-dvw]');
      if (!b) return;
      const a = b.dataset.dvw;
      if (a === 'back') back();
      else if (a === 'type') pickType(b.dataset.v);
      else if (a === 'role') { s.role = b.dataset.v; go(s.role === 'show' ? 'grant' : s.role); }
      else if (a === 'grant' && ROLES.includes(b.dataset.v)) { s.grant = b.dataset.v; if (S) S.setPairRole(s.grant); go('show'); } // роль новому устройству назначает эта сторона
      else if (a === 'scan' && !s.busy) scan();
      else if (a === 'join' && !s.busy) doJoin({ addr: s.addr, code: s.code, fp: '' });
      else if (a === 'sync' && s.res) syncCard(app, ctx, s.res.id, () => { try { api.update(); } catch { /* закрыта */ } });
      else if (a === 'finish') api.close();
    });
    // пока показан код — ждать нового подключившегося
    if (S) unsub.push(S.subscribe(() => {
      if (s.step === 'show') { const p = newPeer(); if (p) { s.res = { id: '', name: p.name, phone: true, incoming: true }; s.step = 'done'; trail.length = 0; ctx.render(); } }
      try { api.update(); } catch { /* закрыта */ }
    }));
  }, { onClose: () => { unsub.forEach((f) => f()); unsub = []; if (S) S.setPairRole('own'); } });
  // один вариант — без лишних вопросов
  if (show && S && types.some((x) => x.id === 'phone' && x.roles.includes('show'))) { s.type = 'phone'; s.role = 'show'; go('grant'); trail.length = 0; }
  else if (types.length === 1) { pickType(types[0].id); trail.length = 0; }
  refreshNet().then(() => { try { api.update(); } catch { /* закрыта */ } });
  return api;
}

/* ---------- связь со страницей настроек ---------- */

// Клик по странице. ctx: { render, onChange }. → true, если клик обработан здесь
export function devicesClick(app, target, ctx) {
  const b = target.closest && target.closest('[data-dv]');
  if (!b) return false;
  const a = b.dataset.dv, id = b.dataset.id;
  if (a === 'add') wizard(app, ctx);
  else if (a === 'open') deviceSheet(app, ctx, id);
  else if (a === 'sync') syncCard(app, ctx, id);
  else if (a === 'rc') { const d = find(app, id); if (d) import('./remote.js').then((m) => m.remoteSheet(app, d.entry)); }
  else if (a === 'code') wizardShow(app, ctx);
  else if (a === 'grp') { const g = b.dataset.g; if (open.has(g)) open.delete(g); else open.add(g); ctx.render(); }
  else return false;
  return true;
}
// «Показать код» при включённом приёме: сразу шаг с кодом
function wizardShow(app, ctx) { wizard(app, ctx, { show: true }); }

let tick = 0, lastCtx = null;
// После отрисовки страницы: свежие сведения о сети (плашка «Нет Wi-Fi») и обновление раз в 15 с (время «N мин назад»)
export function devicesMount(app, ctx) {
  lastCtx = ctx;
  if (Date.now() - netAt > 8000) refreshNet().then((n) => { if (n !== null && lastCtx) lastCtx.render(); });
  if (!tick) {
    tick = setInterval(() => {
      if (!document.querySelector('.dvpage')) { clearInterval(tick); tick = 0; return; }
      refreshNet().finally(() => { if (lastCtx) lastCtx.render(); });
    }, 15000);
  }
}
