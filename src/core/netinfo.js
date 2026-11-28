// Какие сети сейчас у устройства: Wi-Fi, мобильная, адрес в Wi-Fi. Нужно, чтобы связь «телефон ↔ другое устройство»
// объясняла причину («нет Wi-Fi»), а не «не найдено», и чтобы экран «Устройства» мог показать плашку.
// Android: плагин NetInfo (NetInfoPlugin.java, только чтение состояния). Компьютер и веб: неизвестно → wifi: true
// (плашка «нет Wi-Fi» не должна появляться зря). Сеть не трогает.
import { Capacitor, registerPlugin } from '@capacitor/core';

const UNKNOWN = { wifi: true, cellular: false, ip: null };
let plugin = null;

// → { wifi: boolean, cellular: boolean, ip: string | null }; не бросает
export async function netInfo() {
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return { ...UNKNOWN };
    plugin ??= registerPlugin('NetInfo');
    const r = await plugin.info();
    return { wifi: !!r.wifi, cellular: !!r.cellular, ip: typeof r.ip === 'string' && r.ip ? r.ip : null };
  } catch { return { ...UNKNOWN }; }
}

// Адрес из локальной сети: 10/8, 172.16/12, 192.168/16, 169.254/16. Принимает «192.168.1.5», «https://192.168.1.5:53329»
export function isPrivateHost(addr) {
  const m = /^(?:[a-z]+:\/\/)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::\d+)?(?:\/.*)?$/i.exec(String(addr || '').trim());
  if (!m) return false;
  const [a, b, c, d] = m.slice(1, 5).map(Number);
  if ([a, b, c, d].some((x) => x > 255)) return false;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

// К какой сети привязывать соединение с адресом: 'wifi' — частный адрес и Wi-Fi есть; 'default' — прежнее поведение.
// Зеркало NetBind.forHost (Java): решает натив, здесь — для тестов и журнала.
export function bindFor(addr, info = UNKNOWN) {
  return isPrivateHost(addr) && info && info.wifi ? 'wifi' : 'default';
}

// Нет Wi-Fi, а адрес — в локальной сети: связь невозможна, причина — «нет Wi-Fi»
export function noWifiFor(addr, info = UNKNOWN) {
  return isPrivateHost(addr) && !!info && info.wifi === false;
}

// Для журнала: по какой сети шла попытка
export function netLabel(info = UNKNOWN) {
  if (!info) return 'сеть неизвестна';
  return info.wifi ? 'wifi' + (info.cellular ? '+мобильная' : '') : info.cellular ? 'только мобильная' : 'сети нет';
}
