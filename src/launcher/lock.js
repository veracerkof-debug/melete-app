// Кошелёк под замком (DECISIONS 2026-10-26): свой код из цифр (хранится только отпечаток кода — PBKDF2 с солью) и,
// если на телефоне есть и включены, отпечаток пальца или лицо (LauncherPlugin: bioState, bioUnlock).
// Замок закрывает экран кошелька от чужих глаз; сами записи на устройстве не шифруются (docs/launcher.md).
import { readJSON, writeJSON } from './data.js';
import { isNative, Launcher } from './native.js';
import { t } from './i18n.js';
import { h, openSheet, toggle, toast } from './ui.js';

const KEY = 'elachiston.lock';
import { MONEY_KEY } from './wallet.js';
const LEN = [4, 6];
const MAX_FAILS = 5, PAUSE = 30e3;

let st = readJSON(KEY) || null; // { salt, hash, len, bio, fails, until }
const keep = () => writeJSON(KEY, st);
export const hasLock = () => !!st?.hash;

async function digest(pin, salt) {
  const enc = new TextEncoder();
  if (globalThis.crypto?.subtle) {
    const k = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, k, 256);
    return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let x = 0x811c9dc5; // без crypto.subtle (старый WebView) — простая свёртка, лучше чем код открытым текстом
  for (let r = 0; r < 20000; r++) for (const c of salt + pin + r) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0;
  return 'f' + x.toString(16);
}
const newSalt = () => [...(globalThis.crypto?.getRandomValues?.(new Uint8Array(16)) || Array.from({ length: 16 }, () => Math.random() * 256))]
  .map((b) => (b | 0).toString(16).padStart(2, '0')).join('');

export async function bioState() {
  if (!isNative()) return { available: false, hardware: false };
  try { return await Launcher.bioState(); } catch { return { available: false, hardware: false }; }
}

async function bioTry() {
  if (!st?.bio) return false;
  const s = await bioState();
  if (!s.available) return false;
  try { return !!(await Launcher.bioUnlock({ title: t('lock.title'), cancel: t('lock.pin') })).ok; } catch { return false; }
}

// Экран кода. mode: 'check' — войти; 'set' — новый код дважды. Возвращает Promise: true/код или false (отмена)
function pad({ mode = 'check', bio = false } = {}) {
  return new Promise((resolve) => {
    let pin = '', first = null, len = mode === 'check' ? st.len : 0;
    const dots = h('div', { class: 'l-lock-dots', 'aria-hidden': 'true' });
    const msg = h('div', { class: 'l-lock-msg', role: 'status' });
    const title = h('div', { class: 'l-lock-title' }, mode === 'set' ? t('lock.new') : t('lock.enter'));
    const done = (v) => { wrap.remove(); removeEventListener('keydown', onKey, true); resolve(v); };
    const draw = () => {
      const n = len || Math.max(4, pin.length);
      dots.replaceChildren(...Array.from({ length: n }, (_, i) => h('i', { class: i < pin.length ? 'on' : '' })));
    };
    const wrong = (text) => { pin = ''; draw(); msg.textContent = text; dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake'); navigator.vibrate?.(40); };
    const waitLeft = () => Math.ceil(((st?.until || 0) - Date.now()) / 1000);
    async function submit() {
      if (mode === 'set') {
        if (!LEN.includes(pin.length)) { msg.textContent = t('lock.len'); return; }
        if (first == null) { first = pin; pin = ''; title.textContent = t('lock.repeat'); msg.textContent = ''; len = first.length; draw(); return; }
        if (pin !== first) { first = null; len = 0; title.textContent = t('lock.new'); wrong(t('lock.mismatch')); return; }
        return done(pin);
      }
      if (waitLeft() > 0) { wrong(t('lock.wait', { s: waitLeft() })); return; }
      const ok = (await digest(pin, st.salt)) === st.hash;
      if (ok) { st.fails = 0; st.until = 0; keep(); return done(true); }
      st.fails = (st.fails || 0) + 1;
      if (st.fails >= MAX_FAILS) { st.fails = 0; st.until = Date.now() + PAUSE; }
      keep();
      wrong(waitLeft() > 0 ? t('lock.wait', { s: waitLeft() }) : t('lock.wrong'));
    }
    const press = (k) => {
      navigator.vibrate?.(8);
      if (k === '⌫') pin = pin.slice(0, -1);
      else if (pin.length < 6) pin += k;
      msg.textContent = '';
      draw();
      if (len && pin.length === len) submit();
    };
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Enter' && !len) submit();
      else if (e.key === 'Escape') done(false);
      else return;
      e.preventDefault(); e.stopPropagation();
    };
    addEventListener('keydown', onKey, true);
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', bio ? 'bio' : '', '0', '⌫'].map((k) =>
      k === 'bio' ? h('button', { class: 'l-lock-k bio', 'aria-label': t('lock.bio'), onclick: async () => { if (await bioTry()) done(true); },
        html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M7 11a5 5 0 0 1 10 0v2a9 9 0 0 1-1.2 4.5M12 11v3a7 7 0 0 1-2 5M9.6 20.4A9 9 0 0 0 9 13v-2a3 3 0 0 1 6 0v1M4.5 9a8 8 0 0 1 15 0M5 14.5a10 10 0 0 0 .7-3.5"/></svg>' })
      : k ? h('button', { class: 'l-lock-k', onclick: () => press(k), 'aria-label': k === '⌫' ? t('lock.erase') : k }, k) : h('span'));
    const wrap = h('div', { class: 'l-lock', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('lock.title') },
      h('div', { class: 'l-lock-top' }, title, dots, msg),
      h('div', { class: 'l-lock-keys' }, keys),
      h('div', { class: 'l-lock-foot' },
        h('button', { class: 'l-lock-link', onclick: () => done(false) }, t('lock.cancel')),
        mode === 'set' ? h('button', { class: 'l-lock-link', onclick: () => submit() }, t('lock.ok')) : null));
    document.body.append(wrap);
    draw();
    if (waitLeft() > 0) msg.textContent = t('lock.wait', { s: waitLeft() });
  });
}

// Открыть кошелёк: без кода — сразу; с кодом — отпечаток/лицо (если включены), иначе код
export async function unlock() {
  if (!hasLock()) return true;
  const s = st.bio ? await bioState() : null;
  const bio = !!s?.available;
  if (bio && await bioTry()) return true;
  return pad({ mode: 'check', bio });
}

export async function setPin() {
  const pin = await pad({ mode: 'set' });
  if (!pin) return false;
  const salt = newSalt();
  st = { ...(st || {}), salt, hash: await digest(pin, salt), len: pin.length, fails: 0, until: 0 };
  keep();
  return true;
}

// Настройки замка — из кошелька (значок замка вверху)
export function lockSettings(onChange = () => {}) {
  openSheet({
    title: t('lock.title'), kicker: '',
    async render(body, close, rerender) {
      const s = await bioState();
      body.append(h('p', { class: 'l-lock-state' }, hasLock() ? t('lock.on') : t('lock.off')));
      if (!hasLock()) {
        body.append(h('button', { class: 'l-btn primary', onclick: async () => { close(); if (await setPin()) { toast(t('lock.done')); onChange(); } } }, t('lock.set')));
      } else {
        body.append(
          h('button', { class: 'l-pick', onclick: async () => { close(); if (await pad({ mode: 'check' }) && await setPin()) toast(t('lock.done')); } }, h('span', {}, t('lock.change'))),
          h('button', { class: 'l-pick', onclick: async () => {
            close();
            if (await pad({ mode: 'check' })) { st = null; writeJSON(KEY, null); toast(t('lock.removed')); onChange(); }
          } }, h('span', {}, t('lock.remove'))));
        if (s.hardware) body.append(toggle(t('lock.bio'), !!st.bio && s.available, (v) => { st.bio = v; keep(); if (v && !s.available) toast(t('lock.noBio')); }, s.available ? t('lock.bioHint') : t('lock.noBio')));
        body.append(
          h('p', { class: 'l-lock-note' }, t('lock.forgot')),
          h('button', { class: 'l-pick danger', onclick: () => {
            if (!confirm(t('lock.resetAsk'))) return;
            try { localStorage.removeItem(MONEY_KEY); } catch {}
            st = null; writeJSON(KEY, null); close(); toast(t('lock.removed')); onChange(true);
          } }, h('span', {}, t('lock.reset'))));
      }
    },
  });
}
