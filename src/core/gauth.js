// Вход Google для синхронизации через Диск (слово автора 25.11.2026). Своих аккаунтов у Melete нет: Google нужен только
// для доступа к своей папке `Melete` на Диске (область drive.file — приложение видит лишь созданные им файлы).
// OAuth 2.0 с PKCE (код авторизации, секрета в приложении нет), без библиотек Google и без скриптов с CDN.
// Токены — только на этом устройстве (localStorage `melete.gauth`), в резервную копию и на другие устройства не идут.
// Android: страница входа — в системном браузере (плагин GAuth), возврат — схема com.googleusercontent.apps.<ключ> → appUrlOpen.
// Компьютер и веб — следующие этапы (DECISIONS 2026-11-25).
import { Capacitor, registerPlugin } from '@capacitor/core';
import { GOOGLE } from './gconfig.js';
import { log } from './log.js';

const KEY = 'melete.gauth', PEND = 'melete.gauth.pend';
export const SCOPE = 'https://www.googleapis.com/auth/drive.file openid email';
const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth', TOKEN = 'https://oauth2.googleapis.com/token', USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo';
const GAuth = registerPlugin('GAuth');

const rd = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
const wr = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { log('gauth', 'состояние входа не сохранено: ' + (e.message || e), 'w'); } };

export const platformKey = () => (Capacitor.getPlatform() === 'android' ? (typeof __CHANNEL__ !== 'undefined' && __CHANNEL__ === 'dev' ? 'androidDev' : 'androidPre') : null);
export const clientId = () => { const k = platformKey(); return k ? GOOGLE[k] || '' : ''; };
// Вход на этой платформе возможен: платформа поддержана и ключ вписан
export const authAvail = () => !!clientId();
// Платформа поддержана, но ключа нет (показывается в dev с пояснением)
export const authPlanned = () => !!platformKey();
export const redirectUri = (id = clientId()) => 'com.googleusercontent.apps.' + id.replace('.apps.googleusercontent.com', '') + ':/oauth2redirect';

// ---- PKCE ----
const b64url = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const rand = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));
export async function challengeOf(verifier) { return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))); }

export async function authUrl(id = clientId()) {
  const verifier = rand(48), state = rand(16);
  wr(PEND, { verifier, state, at: Date.now() });
  const q = new URLSearchParams({ client_id: id, redirect_uri: redirectUri(id), response_type: 'code', scope: SCOPE, code_challenge: await challengeOf(verifier), code_challenge_method: 'S256', state, access_type: 'offline', prompt: 'consent' });
  return AUTH + '?' + q;
}

export const tokens = () => rd(KEY);
export const signedIn = () => { const k = tokens(); return !!(k && k.refresh); };
export const account = () => (tokens() || {}).email || '';
export function signOut() { wr(KEY, null); wr(PEND, null); }

const form = (o) => new URLSearchParams(o).toString();
async function post(url, body, f = fetch) {
  const r = await f(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error_description || j.error || 'token ' + r.status), { reason: j.error === 'invalid_grant' ? 'auth' : 'unreachable', status: r.status });
  return j;
}

// Обменять код со страницы входа на токены. url — адрес возврата целиком
export async function finish(url, f = fetch, now = Date.now) {
  const u = new URL(url), pend = rd(PEND), code = u.searchParams.get('code'), err = u.searchParams.get('error');
  if (err) { wr(PEND, null); throw Object.assign(new Error(err), { reason: 'denied' }); }
  if (!pend || !code || u.searchParams.get('state') !== pend.state) throw Object.assign(new Error('state'), { reason: 'state' });
  wr(PEND, null);
  const id = clientId(), j = await post(TOKEN, { client_id: id, code, code_verifier: pend.verifier, grant_type: 'authorization_code', redirect_uri: redirectUri(id) }, f);
  if (!j.refresh_token) throw Object.assign(new Error('no refresh'), { reason: 'auth' });
  let email = '';
  try { const r = await f(USERINFO, { headers: { Authorization: 'Bearer ' + j.access_token } }); email = (await r.json()).email || ''; } catch { /* без адреса — вход всё равно действует */ }
  wr(KEY, { refresh: j.refresh_token, access: j.access_token, exp: now() + (j.expires_in || 3600) * 1000, email });
  return email;
}

// Действующий токен доступа (обновляется сам). Отозван или нет входа — reason 'auth'
export async function accessToken(f = fetch, now = Date.now) {
  const k = tokens();
  if (!k || !k.refresh) throw Object.assign(new Error('no login'), { reason: 'auth' });
  if (k.access && k.exp - now() > 60000) return k.access;
  const j = await post(TOKEN, { client_id: clientId(), refresh_token: k.refresh, grant_type: 'refresh_token' }, f);
  wr(KEY, { ...k, access: j.access_token, exp: now() + (j.expires_in || 3600) * 1000 });
  return j.access_token;
}

// Android: открыть браузер и дождаться возврата (appUrlOpen). → адрес электронной почты
export async function signIn(App, f = fetch) {
  if (!authAvail()) throw Object.assign(new Error('no client'), { reason: 'noclient' });
  const url = await authUrl();
  const back = new Promise((res, rej) => {
    let h;
    const done = (fn, v) => { try { h && h.then((x) => x.remove()); } catch { /* уже */ } fn(v); };
    h = App.addListener('appUrlOpen', (ev) => { if (ev.url && ev.url.startsWith(redirectUri().split(':')[0] + ':')) finish(ev.url, f).then((m) => done(res, m), (e) => done(rej, e)); });
    setTimeout(() => done(rej, Object.assign(new Error('timeout'), { reason: 'timeout' })), 10 * 60 * 1000);
  });
  await GAuth.open({ url });
  return back;
}
