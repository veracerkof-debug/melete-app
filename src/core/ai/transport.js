// Сеть для чата: только нативный HTTP Capacitor на Android (CSP страницы не трогаем, правило 3 — исключение по решению автора;
// запрос уходит только по нажатию «Отправить» в чате). В обычной веб-версии функции нет. Windows/Linux — Rust-команда, позже.
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { WEB } from '../platform.js';

export const aiAvail = () => Capacitor.getPlatform() === 'android' && !WEB;
// Страница по ссылке из чата (только по нажатию «Добавить ссылку», только https): нативный GET без cookies → { status, data (текст), headers }
export async function get(url, { timeout = 20000 } = {}) {
  try {
    const r = await CapacitorHttp.get({ url, headers: { Accept: 'text/html,text/plain,application/json;q=0.8,*/*;q=0.5', 'Accept-Language': 'ru,en;q=0.8', 'User-Agent': 'Mozilla/5.0 (Linux; Android) Melete' }, responseType: 'text', connectTimeout: 10000, readTimeout: timeout });
    return { status: r.status, data: r.data, headers: r.headers || {} };
  } catch (e) {
    const m = String((e && e.message) || e);
    throw Object.assign(new Error(m), { kind: /time/i.test(m) ? 'timeout' : 'net' });
  }
}
// req: { url, headers, body } → { status, data }; ошибки сети — исключение { kind: 'net'|'timeout' }
export async function post(req, { timeout = 120000 } = {}) {
  try {
    const r = await CapacitorHttp.request({ method: 'POST', url: req.url, headers: req.headers, data: req.body, responseType: 'text', connectTimeout: 15000, readTimeout: timeout });
    return { status: r.status, data: r.data };
  } catch (e) {
    const m = String((e && e.message) || e);
    throw Object.assign(new Error(m), { kind: /time/i.test(m) ? 'timeout' : 'net' });
  }
}
