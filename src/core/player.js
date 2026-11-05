// Управление звуком вне приложения (Android, плагин PlayerPlugin.java):
//   • шторка уведомлений — в уведомлении «Melete» (KeepAliveService) кнопки «Пауза / Продолжить», «Тише», «Громче»;
//   • плавающая кнопка поверх других приложений (FloatService) — пауза и каждый звучащий источник: громкость и вкл/выкл;
//   • всплывающее окно — режим «картинка в картинке»: пока открыт инструмент и что-то звучит, при выходе на рабочий стол
//     окно приложения становится маленьким, его можно двигать и менять размер.
// Каждое — переключателем в «Модулях и функциях → Работа в фоне» (settings.bgCtl: notify, float — по умолчанию вкл;
// всплывающее окно — по умолчанию выкл, решение автора 25.10.2026: выход на рабочий стол — это выход; включённое — pipOn).
// Пауза — заморозка общего звукового контекста (метроном, пэды, инструменты и медиа замирают и продолжают с того же места).
import { Capacitor, registerPlugin } from '@capacitor/core';
import { t, getLang } from '../i18n/index.js';
import { mName } from '../music/notes.js';
import { moduleById } from '../modules/index.js';
import { BUSES, mixKey, MIX_MAX } from '../audio/mixer.js';
import { peekContext, hold, isHeld } from '../audio/context.js';
import { log } from './log.js';

const P = Capacitor.isNativePlatform() ? registerPlugin('Player') : null;
export const playerAvailable = () => !!P;
export const BGCTL_DEF = { notify: true, float: true, pip: false };
// pip — только явно включённое (pipOn): прежнее «pip: true» сохранялось само при правке других переключателей
export const bgCtl = (st) => ({ ...BGCTL_DEF, ...(st.bgCtl || {}), pip: !!(st.bgCtl && st.bgCtl.pipOn) });
export const canOverlay = () => (P ? P.canOverlay().then((r) => !!(r && r.ok)).catch(() => false) : Promise.resolve(false));
export const askOverlay = () => P && P.askOverlay().catch(() => {});

export function initPlayer(app) {
  if (!P) return;
  const mixer = app.audio.mixer, seen = new Map(); // шина → когда звучала (выключенные остаются в списке ещё минуту)
  let sig = '';
  const raw = (k) => { const v = mixer.state[k]; return v == null ? 1 : v; };

  function sources(now = Date.now()) {
    BUSES.forEach((b) => { if (mixer.isActive(b)) seen.set(b, now); });
    return BUSES.filter((b) => seen.has(b) && now - seen.get(b) < 60000).map((b) => {
      const k = mixKey(b);
      return { id: b, name: t('mix.' + (b === 'media' ? 'media' : b)), vol: raw(k), on: !(mixer.state.mute || {})[k] };
    });
  }
  // пауза — заморозка контекста с удержанием (context.js: hold): касание экрана и его включение её не снимают;
  // «играть» в приложении снимает (release в модулях) — тогда и кнопка в шторке снова «Пауза»
  const pause = (on) => {
    if (!peekContext()) return;
    hold(on);
    log('player', on ? 'пауза из шторки' : 'продолжить из шторки');
  };
  const nudge = (d) => sources().filter((s) => s.on).forEach((s) => mixer.set(s.id, Math.max(0, Math.min(MIX_MAX, s.vol + d))));

  // Медиасессия (браслет, часы, наушники, педаль, экран блокировки; слово автора 05.11.2026):
  // название — что звучит: «Запись», «Метроном 4/4 · 120 BPM», «Пэды Свет · C3»; первое — заголовок, остальное — строкой ниже.
  // «Играть/пауза» — всё сразу (пауза всего звука). «Вперёд/назад»: звучит запись — следующая/предыдущая запись медиатеки
  // (метроном и пэды идут дальше как есть); только пэды (или пэды с метрономом) — тональность пэдов на полутон;
  // только метроном — темп на 5 BPM.
  const A = app.audio, METRO_STEP = 5;
  const modT = (id, k) => { const m = moduleById(id), d = m && m.i18n && (m.i18n[getLang()] || m.i18n.ru); return (d && d[k]) || ''; };
  const mediaOn = () => mixer.isActive('media') && !!(app.remote && app.remote.audio && app.remote.audio.title());
  const droneOn = () => !!(A.drone && A.drone.on);
  const metroOn = () => !!(A.metro && A.metro.running);
  // на паузе с пульта движки молчат — показывать то, что звучало (иначе «играть» на браслете некому нажать)
  let lastNow = null;
  function nowPlaying() {
    const n = nowRaw();
    if (n) lastNow = n; else if (!isHeld()) lastNow = null;
    return n || (isHeld() ? lastNow : null);
  }
  function nowRaw() {
    const parts = [];
    if (mediaOn()) parts.push(app.remote.audio.title());
    if (droneOn()) {
      const d = app.device.drone || {}, lo = [2, 3, 4].find((o) => d.layers && d.layers[o]) ?? 3;
      parts.push(t('rm.drone', { sound: modT('drone', 'snd.' + d.sound) || '', note: mName(12 * (lo + 1) + (d.pc || 0)) }).replace(/\s+·/, ' ·').trim());
    }
    if (metroOn()) { const c = A.metro.cfg; parts.push(t('rm.metro', { meter: c.num + '/' + c.den, bpm: c.bpm })); }
    return parts.length ? { title: parts[0], sub: parts.slice(1).join(' · ') } : null;
  }
  function skip(d) {
    if (mediaOn()) { app.remote.audio[d > 0 ? 'next' : 'prev'](); log('player', 'пульт: запись ' + (d > 0 ? 'вперёд' : 'назад')); return; }
    if (droneOn()) { const pc = ((app.device.drone.pc || 0) + d + 12) % 12; A.drone.tonic(pc); log('player', 'пульт: пэды ' + mName(60 + pc)); return; }
    if (metroOn()) { A.metro.setBpm(A.metro.cfg.bpm + d * METRO_STEP); log('player', 'пульт: темп ' + A.metro.cfg.bpm); }
  }

  P.addListener('control', ({ action, bus, value }) => {
    if (action === 'toggle') pause(!isHeld());
    else if (action === 'play') pause(false); // главный экран (bridge.js): ▶
    else if (action === 'pause' || action === 'stop') pause(true); // ❚❚
    else if (action === 'next') skip(1); // медиасессия: «вперёд» / «назад»
    else if (action === 'prev') skip(-1);
    else if (action === 'down') nudge(-0.1);
    else if (action === 'up') nudge(0.1);
    else if (action === 'vol' && BUSES.includes(bus)) mixer.set(bus, Math.max(0, Math.min(MIX_MAX, +value)));
    else if (action === 'on' && BUSES.includes(bus)) { const k = mixKey(bus), mu = !!(mixer.state.mute || {})[k]; if (mu === !!+value) mixer.toggleMute(bus); }
    sync(true);
  });
  // всплывающее окно открылось или закрылось — компактный вид (без вкладок и шапок)
  P.addListener('pip', ({ on }) => { document.documentElement.classList.toggle('pip', !!on); log('player', on ? 'всплывающее окно' : 'полный экран'); });

  function sync(force = false) {
    const c = bgCtl(app.store.state.settings), list = sources();
    const tool = !!document.querySelector('.tview, .session');
    const state = {
      playing: !isHeld(), sounding: list.length > 0, sources: list, media: nowPlaying(),
      labels: { pause: t('pl.pause'), play: t('pl.play'), down: t('pl.down'), up: t('pl.up'), open: t('pl.open'), title: t('pl.title'), none: t('pl.none') },
    };
    const msg = { state: JSON.stringify(state), notify: c.notify, float: c.float, pip: c.pip && tool && list.length > 0, aspect: Math.max(0.45, Math.min(2.3, innerWidth / innerHeight)) };
    const s = JSON.stringify(msg);
    if (!force && s === sig) return;
    sig = s;
    P.update(msg).catch(() => {});
  }
  setInterval(sync, 1000);
  document.addEventListener('visibilitychange', () => sync(true));
  app.player = { sync, get paused() { return isHeld(); }, pause, sources: () => sources(), nowPlaying, skip };
}
