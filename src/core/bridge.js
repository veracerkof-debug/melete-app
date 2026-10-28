// Мост с главным экраном Ἐλάχιστον (отдельное приложение; договор — docs/launcher-bridge.md, решение автора 27.10.2026).
// Melete сообщает: идёт ли занятие (название, начало), звучит ли что-то и что, неделю (только подтверждённые занятия,
// как в статистике) и чтение дня (в церковном режиме); принимает переходы melete://free | session | bible и
// ▶/❚❚ (player.js). Только Android (BridgePlugin.java): адресные рассылки в пакеты главного экрана, без сети.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { weekData } from './stats.js';
import { readingFor } from './reading.js';
import { refText } from './bible.js';
import { t } from '../i18n/index.js';
import { log } from './log.js';

const B = Capacitor.isNativePlatform() ? registerPlugin('Bridge') : null;

// Состояние по договору, версия 1 (чистая функция: app — store, active, player)
export function bridgeState(app, now = Date.now()) {
  const st = app.store.state.settings, a = app.active, P = app.player;
  const song = a && a.songId ? app.store.songById(a.songId) : null;
  const src = P && P.sources ? P.sources() : [];
  const w = weekData(app.store.sessions(), now);
  const rd = st.church && st.bible ? readingFor(st.bible, now) : null;
  return {
    v: 1, at: now,
    session: a ? { start: a.startedAt, title: song ? song.title : t('ses.free'), mode: a.type === 'song' ? 'song' : a.type === 'tool' ? 'tool' : 'free' } : null,
    playing: !!src.length && !(P && P.paused),
    sounding: src.length > 0,
    what: src.map((s) => s.name).join(' · '),
    week: { total: Math.round(w.total), goal: Math.round((st.goalMin || 0) * 60), per: w.per.map((x) => Math.round(x)) },
    reading: rd && rd.keys.length ? { ref: refText(rd.keys), done: rd.done, total: rd.keys.length, day: rd.day } : null,
  };
}

export function initBridge(app) {
  if (!B) return;
  let sig = '', sent = 0;
  const publish = (force = false) => {
    let s;
    try { s = bridgeState(app); } catch { return; }
    const k = JSON.stringify({ ...s, at: 0 });
    // при изменении — сразу; без изменений — раз в 10 минут (свежесть: старше 12 часов главный экран не показывает)
    if (!force && k === sig && Date.now() - sent < 600000) return;
    sig = k; sent = Date.now();
    B.publish({ state: JSON.stringify(s) }).catch(() => {});
  };
  setInterval(publish, 2000);
  app.store.subscribe(() => publish());
  document.addEventListener('visibilitychange', () => publish(true));
  // переходы с главного экрана: при запуске и пока открыто
  const go = (r) => { if (!r) return; log('bridge', 'переход: ' + r); if (app.route) app.route(r); };
  B.addListener('route', ({ route }) => go(route));
  setTimeout(() => B.route().then((x) => go(x && x.route)).catch(() => {}), 600);
  publish(true);
}
