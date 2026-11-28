// Блок «Рядом» экрана «Устройства» и мастера «Подключить устройство» (автопоиск, слово автора 28.11.2026: «чтобы не
// сканировать QR каждый раз»; docs/ecosystem.md). Поиск — только по нажатию «Искать устройства» и при входе в шаг
// подключения мастера: фонового опроса нет. Найденное устройство выбирается одним касанием — дальше только код из
// 6 цифр (адрес подставлен); сопряжение, как и раньше, по коду с закреплением отпечатка — здесь ничего не сопрягается.
// Свой код — в этом файле, чтобы не трогать остальной devices.js: туда ведут три точки (HTML блока, клик, выбор в мастере).
import { t } from '../../i18n/index.js';
import { esc, icons } from '../../ui/index.js';
import { discoverAvail, discoverDevices, lastFound, lastFoundAt, searching, clearFound, DISCOVER_MS } from '../discover.js';
import { pcOf, devsOf } from '../sync.js';
import { netInfo } from '../netinfo.js';

const CHEV = icons.chev || '';
const IC = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M10.5 18.5h3"/></svg>',
  pc: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="12" rx="1.8"/><path d="M8 20h8M12 16.5V20"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>',
};

// Адрес для сопряжения: «192.168.1.5:53329» — без ввода IP человеком
export const pairAddr = (f) => f.addr + ':' + f.port;
// Первые 8 знаков отпечатка из объявления — подсказка «то ли это устройство» (pair проверяет её после обмена)
export const fpHint = (f) => (/^[0-9a-f]{8}$/i.test(f.id) ? f.id.toLowerCase() : '');

// Что скрыть/показать: блок нужен, если поиск есть на платформе и это устройство может подключаться к другому
export const nearAvail = (canJoin) => !!canJoin && discoverAvail();

// Это устройство: свои адреса (чтобы не показать самих себя) и отпечаток
async function mineOf(app) {
  const ips = [], S = app && ((app.syncSrv && app.syncSrv.avail && app.syncSrv) || (app.mesh && app.mesh.avail && app.mesh));
  try { if (S && S.state) { for (const a of S.state.ips || []) ips.push(a); } } catch { /* нет сведений */ }
  try { const n = await netInfo(); if (n && n.ip) ips.push(n.ip); } catch { /* неизвестно */ }
  const fp = S && S.state && S.state.fp ? String(S.state.fp) : '';
  return { ips, fp8: fp.slice(0, 8) };
}
const pairedOf = () => {
  const out = [], pc = pcOf();
  if (pc) out.push({ addr: pc.addr, fp: pc.fp || '' });
  for (const d of devsOf()) out.push({ addr: d.addr, fp: d.fp || '' });
  return out;
};

let tried = false; // поиск уже шёл на этом экране — пустой список значит «ничего не найдено», а не «ещё не искали»

// Запустить поиск; onUpdate вызывается при старте и по окончании. Не бросает
export async function nearSearch(app, onUpdate = () => {}) {
  if (!discoverAvail() || searching()) return lastFound();
  tried = true;
  onUpdate();
  try { await discoverDevices({ timeoutMs: DISCOVER_MS, mine: await mineOf(app), paired: pairedOf() }); } catch { /* пусто */ }
  onUpdate();
  return lastFound();
}
// Сбросить результат (экран закрыт)
export function nearReset() { clearFound(); tried = false; }

// Блок «Рядом». attr — имя атрибута действий: 'data-dv' на странице, 'data-dvw' в мастере
export function nearHTML(attr = 'data-dv') {
  if (!discoverAvail()) return '';
  const list = lastFound(), busy = searching();
  const rows = list.map((f, i) => f.paired
    ? '<div class="cell dvnrow paired"><span class="dvic">' + (f.type === 'phone' ? IC.phone : IC.pc) + '</span><span class="dvtx grow"><b class="dvname">' + esc(f.name) + '</b><span class="dvsub">' + esc(t('dv.near.paired')) + '</span></span></div>'
    : '<button class="cell act dvnrow" ' + attr + '="npick" data-i="' + i + '" aria-label="' + esc(t('dv.near.pick', { name: f.name })) + '"><span class="dvic">' + (f.type === 'phone' ? IC.phone : IC.pc) + '</span><span class="dvtx grow"><b class="dvname">' + esc(f.name) + '</b><span class="dvsub">' + esc(f.addr) + '</span></span>' + CHEV + '</button>').join('');
  const status = busy ? '<p class="dvnote dvnearst" role="status"><i class="dvdot" aria-hidden="true"></i>' + esc(t('dv.near.busy')) + '</p>'
    : !list.length && tried ? '<p class="dvnote danger dvnearst" role="status">' + esc(t('dv.near.none')) + '</p>' : '';
  return '<div class="dvnear"><div class="hdr">' + esc(t('dv.near')) + '</div>' + (rows ? '<div class="group">' + rows + '</div>' : '') + status +
    '<div class="group"><button class="cell act dvnfind" ' + attr + '="nfind"' + (busy ? ' disabled' : '') + '>' + IC.search + '<span>' + esc(t(list.length || tried ? 'dv.near.again' : 'dv.near.find')) + '</span></button></div></div>';
}

// Найденное по номеру в последнем списке (только несопряжённое)
export const nearAt = (i) => { const f = lastFound()[Number(i)]; return f && !f.paired ? f : null; };

// Когда искали последний раз (для тестов и подписи)
export const nearAt0 = () => lastFoundAt();

// Шаг «только код» в мастере: устройство выбрано из списка
export function pickHTML(f, { code = '', busy = false, msg = '', attr = 'data-dvw', inAttr = 'data-dvin' } = {}) {
  return '<div class="dvpick"><div class="dvdone"><span class="dvic big">' + (f.type === 'phone' ? IC.phone : IC.pc) + '</span><b>' + esc(f.name) + '</b><span class="dvsub">' + esc(f.addr) + '</span></div>' +
    '<p class="dvnote">' + esc(t('dv.near.codeHint')) + '</p>' +
    '<div class="group"><label class="cell"><span>' + esc(t('sy.code')) + '</span><input class="inp" ' + inAttr + '="code" inputmode="numeric" maxlength="7" placeholder="000 000" value="' + esc(code) + '" aria-label="' + esc(t('sy.code')) + '" autocomplete="off"></label>' +
    '<button class="cell act" ' + attr + '="join"' + (busy ? ' disabled' : '') + '>' + esc(t('dv.w.connect')) + '</button>' +
    '<button class="cell act" ' + attr + '="unpick"' + (busy ? ' disabled' : '') + '>' + esc(t('dv.near.other')) + '</button></div>' +
    (msg ? '<p class="dvnote' + (busy ? '' : ' danger') + '" role="status">' + esc(msg) + '</p>' : '') + '</div>';
}
