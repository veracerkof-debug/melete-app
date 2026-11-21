// Канал событий (Melete DEV): платформенные транспорты и общий узел. Логика связи — link.js, формат — linkframe.js.
//   телефон (Android): плагин Link (LinkPlugin.java) открывает TLS с закреплённым отпечатком компьютера, держит
//     Wi-Fi в режиме малой задержки и отдаёт кадры событием «frame»; openLink(dev) — открыть и держать;
//   компьютер: src-tauri/src/link.rs принимает те же соединения на порту синхронизации (первые байты «MLNK»), отдаёт
//     окну события link-open / link-frame / link-close; acceptOn(mem) включает приём, ключ проверяется по сопряжённым.
// Только DEV (variants.js) и только по кнопке: без неё ничего не открывается и не принимается.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { DEV } from './variants.js';
import { isDesktop } from './desktop.js';
import { log } from './log.js';
import { b64 } from './sync.js';
import { createLink } from './link.js';

const isAndroid = () => Capacitor.getPlatform() === 'android';
const isDesk = isDesktop;
// Канал доступен: DEV; телефон — открывает, компьютер — принимает
export const linkAvail = () => DEV && (isAndroid() || isDesk());
export const linkCanOpen = () => DEV && isAndroid();

let P = null;
const plugin = () => (P ??= registerPlugin('Link'));

// Телефон → компьютер: connect для createLink. dev: { addr: 'https://ip:порт', key, fp }
export function androidConnect(dev) {
  return async (h) => {
    const u = new URL(dev.addr);
    const subs = [await plugin().addListener('frame', (e) => h.frame(e.t | 0, b64.to(e.d || ''))), await plugin().addListener('close', (e) => h.close(e && e.reason))];
    const off = () => subs.forEach((s) => { try { s.remove(); } catch { /* уже снят */ } });
    try { await plugin().connect({ host: u.hostname, port: +u.port || 443, pin: dev.fp || '', timeout: 4000 }); }
    catch (e) { off(); throw Object.assign(new Error(String(e && e.message)), { reason: e && (e.code === 'pin' || e.code === 'tls') ? e.code : 'net' }); }
    return {
      send: (type, payload) => { plugin().send({ t: type, d: b64.from(payload) }); },
      close: () => { off(); plugin().close().catch(() => {}); },
    };
  };
}

let cur = null;       // { link, dev } — исходящий канал телефона
const accepted = new Set(); // принятые компьютером связи
const subs = new Set();
const emit = () => subs.forEach((fn) => { try { fn(); } catch (e) { (globalThis.reportError || console.error)(e); } });
export const subscribeLink = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const linkNow = () => (cur ? cur.link : null);
// Исходящий канал именно к этому устройству (dev: { addr })
export const linkFor = (dev) => (cur && dev && cur.dev.addr === dev.addr ? cur.link : null);
export const acceptedLinks = () => [...accepted];
// Канал открыт — приложению нужна работа в фоне (background.js: busyText)
export const linkBusy = () => !!(cur && (cur.link.state === 'open' || cur.link.state === 'retry' || cur.link.state === 'connecting')) || [...accepted].some((l) => l.state === 'open');

export function openLink(dev, name = 'Melete') {
  if (!linkCanOpen()) return null;
  if (cur && cur.dev.addr === dev.addr && cur.link.state !== 'failed' && cur.link.state !== 'idle') return cur.link;
  closeLink();
  const link = createLink({ role: 'client', name, key: dev.key, connect: androidConnect(dev) });
  link.subscribe(() => emit());
  let was = '';
  link.subscribe((s) => { if ((s === 'failed' || s === 'retry') && was !== s) log('link', 'канал событий: ' + s + ' (' + link.error + ')', s === 'failed' ? 'w' : undefined); was = s; });
  cur = { link, dev };
  link.open();
  log('link', 'канал событий: открываю ' + String(dev.addr).replace(/^https:\/\//, ''));
  emit();
  return link;
}
export function closeLink() {
  if (!cur) return;
  const c = cur; cur = null;
  c.link.close();
  log('link', 'канал событий закрыт');
  emit();
}

/* ---------- компьютер: приём ---------- */
let unl = [], conns = new Map();
export async function acceptOn(mem, name = 'PC') {
  if (!DEV || !isDesk() || unl.length) return;
  const { invoke } = await import('@tauri-apps/api/core');
  const { listen } = await import('@tauri-apps/api/event');
  const peerOf = (j) => { const p = mem.peers && mem.peers[j.key]; return p ? { name: p.name || '' } : null; };
  unl.push(await listen('link-open', (e) => {
    const cid = e.payload && e.payload.cid;
    const link = createLink({ role: 'server', name, check: peerOf });
    const hd = link.accept({
      send: (type, payload) => { invoke('link_send', payload, { headers: { cid: String(cid), type: String(type) } }).catch(() => {}); },
      close: () => { invoke('link_close', { cid }).catch(() => {}); },
      auth: (ok) => { invoke('link_auth', { cid, ok }).catch(() => {}); },
    });
    // подписчиков оповещают и на каждый обмен пингами (часы) с тем же состоянием — в журнал только переход в «открыт»
    let was = '';
    link.subscribe((s) => { if (s === 'open' && was !== 'open') log('link', 'канал событий: подключилось ' + ((link.peer && link.peer.name) || '').slice(0, 30)); was = s; emit(); });
    conns.set(cid, { link, hd });
    accepted.add(link);
  }));
  unl.push(await listen('link-frame', (e) => { const p = e.payload || {}, c = conns.get(p.cid); if (c) c.hd.frame(p.t | 0, b64.to(p.d || '')); }));
  unl.push(await listen('link-close', (e) => {
    const p = e.payload || {}, c = conns.get(p.cid);
    if (c) { c.hd.close(p.reason || 'net'); conns.delete(p.cid); accepted.delete(c.link); emit(); }
  }));
  await invoke('link_enable', { on: true });
  log('link', 'канал событий: приём включён');
}
export async function acceptOff() {
  if (!unl.length) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('link_enable', { on: false }).catch(() => {});
  unl.forEach((u) => { try { u(); } catch { /* */ } }); unl = [];
  conns.forEach((c) => c.link.close()); conns.clear(); accepted.clear();
  emit();
}
