// Автопоиск устройств Melete в локальной сети (слово автора 28.11.2026: «чтобы не сканировать QR каждый раз»;
// docs/ecosystem.md, «Автопоиск»). Только по явному действию человека (кнопка «Искать устройства», открытие мастера
// «Подключить»): ни фонового опроса, ни обращений к сети при запуске. Объявление устройства несёт только тип, имя и порт
// (плюс 8 знаков отпечатка для подсказки «то ли это устройство»): никаких ключей, кодов и данных. Сопряжение — по-прежнему
// кодом (6 цифр на экране другого устройства) с закреплением отпечатка; автопоиск ничего не сопрягает сам.
// Android: плагин NetDiscovery (NSD, `_melete._tcp`); компьютер: команда Tauri discover_find (mDNS, src-tauri/src/discover.rs);
// веб — недоступно. Для проверок без сети: window.__MELETE_DISCOVER__ — массив записей или функция({ timeoutMs }).
import { Capacitor, registerPlugin } from '@capacitor/core';
import { isDesktop } from './desktop.js';
import { WEB } from './platform.js';
import { isPrivateHost } from './netinfo.js';

export const DISCOVER_MS = 8000; // сколько искать

let plugin = null, cache = [], cacheAt = 0, flight = null;

const inject = () => (typeof window !== 'undefined' ? window.__MELETE_DISCOVER__ : undefined);

// Поиск доступен: Android, компьютер (не веб-версия); подстановка для проверок
export function discoverAvail() {
  if (inject() !== undefined) return true;
  if (WEB) return false;
  try { return (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') || isDesktop(); } catch { return false; }
}

// Одна запись из объявления → { name, type, addr, port, id } или null. Сеть — недоверенная: проверяем всё
export function parseFound(x) {
  if (!x || typeof x !== 'object') return null;
  const addr = String(x.addr || '').trim();
  const port = Number(x.port);
  if (!isPrivateHost(addr) || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  const type = x.type === 'phone' ? 'phone' : 'desktop';
  const name = String(x.name == null ? '' : x.name).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60) || (type === 'phone' ? 'Melete' : 'PC');
  const id = String(x.id || '').replace(/[^0-9a-zA-Z:._-]/g, '').slice(0, 80) || addr + ':' + port;
  return { name, type, addr, port, id };
}

// Хост из «https://192.168.1.5:53329» / «192.168.1.5:53329» / «192.168.1.5»
const hostOf = (a) => { const m = /(\d+\.\d+\.\d+\.\d+)/.exec(String(a || '')); return m ? m[1] : ''; };
const portOf = (a) => { const m = /:(\d+)(?:\/.*)?$/.exec(String(a || '')); return m ? Number(m[1]) : 0; };

// Список из объявлений → без повторов, без самого этого устройства, с пометкой «сопряжено».
// mine: { ips: [адреса этого устройства], fp8 } ; paired: [{ addr, fp }] — сопряжённые (sync.js: pcOf(), devsOf())
export function listFound(raw, { mine = {}, paired = [] } = {}) {
  const ips = new Set((mine.ips || []).map(hostOf).filter(Boolean));
  const fp8 = String(mine.fp8 || '').toLowerCase();
  const out = [], seen = new Set();
  for (const r of Array.isArray(raw) ? raw : []) {
    const f = parseFound(r);
    if (!f) continue;
    if (ips.has(f.addr)) continue; // это устройство само
    if (fp8 && f.id.toLowerCase() === fp8) continue;
    const key = f.addr + ':' + f.port;
    if (seen.has(key)) continue;
    seen.add(key);
    const isPaired = paired.some((p) => p && ((p.addr && hostOf(p.addr) === f.addr && (!portOf(p.addr) || portOf(p.addr) === f.port)) || (p.fp && /^[0-9a-f]{8}$/i.test(f.id) && String(p.fp).toLowerCase().startsWith(f.id.toLowerCase()))));
    out.push({ ...f, paired: isPaired });
  }
  // несопряжённые — первыми, дальше по имени
  return out.sort((a, b) => (a.paired === b.paired ? a.name.localeCompare(b.name) : a.paired ? 1 : -1));
}

// Вызов платформы: → сырой список. Не бросает
async function backend(timeoutMs) {
  const inj = inject();
  if (inj !== undefined) { try { return await (typeof inj === 'function' ? inj({ timeoutMs }) : inj); } catch { return []; } }
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      plugin ??= registerPlugin('NetDiscovery');
      const r = await plugin.find({ timeoutMs });
      return r && Array.isArray(r.list) ? r.list : [];
    }
    if (isDesktop()) {
      const { invoke } = await import('@tauri-apps/api/core');
      const r = await invoke('discover_find', { timeoutMs });
      return Array.isArray(r) ? r : [];
    }
  } catch { /* сеть не дала искать — «ничего не найдено» */ }
  return [];
}

// Искать устройства рядом. Один поиск за раз (повторный вызов получает тот же результат). Не бросает; при ошибке — [].
// → [{ name, type, addr, port, id, paired }]
export function discoverDevices({ timeoutMs = DISCOVER_MS, mine = {}, paired = [] } = {}) {
  if (!discoverAvail()) return Promise.resolve([]);
  if (flight) return flight;
  const ms = Math.max(500, Math.min(15000, Number(timeoutMs) || DISCOVER_MS));
  // страховка: платформа не ответила за срок + запас — не висим
  const guard = new Promise((res) => setTimeout(() => res([]), ms + 3000));
  flight = Promise.race([backend(ms), guard]).then((raw) => {
    cache = listFound(raw, { mine, paired }); cacheAt = Date.now();
    return cache;
  }).catch(() => []).finally(() => { flight = null; });
  return flight;
}

// Результат последнего поиска (на время экрана) и когда он был
export const lastFound = () => cache;
export const lastFoundAt = () => cacheAt;
export const clearFound = () => { cache = []; cacheAt = 0; };
export const searching = () => !!flight;
