// Куда идёт звук (устройство вывода) — для профилей вывода (profiles.js). Android: плагин AudioRoute (динамик, наушники, Bluetooth, USB, HDMI;
// событие при подключении и отключении; только чтение). Остальное (компьютер, браузер): выбранный выход приложения и список устройств браузера,
// обновление по devicechange. Ключ — «тип|имя» (устойчив между запусками; идентификаторы браузера меняются). Без изменения звука.
import { Capacitor, registerPlugin } from '@capacitor/core';

const Native = Capacitor.isNativePlatform() ? registerPlugin('AudioRoute') : null;
const norm = (s) => String(s || '').trim().toLowerCase();
export const TYPES = ['speaker', 'earpiece', 'wired', 'bluetooth', 'bluetooth_call', 'usb', 'hdmi', 'ble', 'other', 'none', 'web'];

// outputs — app.audio.outputs (выход приложения; в браузере и на компьютере)
export function createRoute(outputs, nav = typeof navigator !== 'undefined' ? navigator : null) {
  const subs = new Set();
  let nativeOk = !!Native, last = '', off = [];
  const fromNative = (o) => ({ key: String(o.key || 'none'), type: TYPES.includes(o.type) ? o.type : 'other', label: String(o.name || '') || String(o.type || ''), current: !!o.current });
  const webList = async () => {
    const out = [], sel = outputs ? outputs.id : '';
    let list = []; try { list = outputs ? await outputs.list() : []; } catch { /* */ }
    out.push({ key: 'web|' + (sel ? norm((list.find((d) => d.id === sel) || {}).label) : 'default'), type: 'web', label: sel ? ((list.find((d) => d.id === sel) || {}).label || '') : '', current: true });
    for (const d of list) if (d.id !== sel && !/^#\d+$/.test(d.label)) out.push({ key: 'web|' + norm(d.label), type: 'web', label: d.label, current: false });
    if (!sel) out[0].label = '';
    return out;
  };
  const api = {
    native: () => nativeOk,
    // текущее устройство вывода: { key, type, label, current }
    async current() {
      if (nativeOk) { try { return fromNative(await Native.current()); } catch { nativeOk = false; } }
      return (await webList())[0];
    },
    // все известные устройства вывода; текущее — current: true
    async list() {
      if (nativeOk) { try { const r = await Native.list(); const l = (r.items || []).map(fromNative); const seen = new Set(); return l.filter((d) => (seen.has(d.key) ? false : seen.add(d.key))); } catch { nativeOk = false; } }
      return webList();
    },
    // fn(route) при смене устройства; → отписка
    onChange(fn) {
      subs.add(fn);
      if (subs.size === 1) start();
      return () => { subs.delete(fn); if (!subs.size) stop(); };
    },
  };
  const emit = async () => { const c = await api.current(); if (c.key === last) return; last = c.key; subs.forEach((fn) => { try { fn(c); } catch { /* подписчик не должен ломать остальных */ } }); };
  function start() {
    api.current().then((c) => { last = c.key; }).catch(() => {});
    if (nativeOk) { try { Native.addListener('route', () => emit()).then((h) => off.push(() => h.remove())).catch(() => { nativeOk = false; }); } catch { nativeOk = false; } }
    if (!nativeOk && nav && nav.mediaDevices && nav.mediaDevices.addEventListener) { const f = () => emit(); nav.mediaDevices.addEventListener('devicechange', f); off.push(() => nav.mediaDevices.removeEventListener('devicechange', f)); }
  }
  function stop() { off.forEach((f) => { try { f(); } catch { /* */ } }); off = []; }
  api.refresh = emit; // после ручной смены выхода в приложении
  return api;
}
