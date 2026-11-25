// Уведомление об обновлении (слово автора 25.11.2026): «новая версия скачана — нажмите, чтобы установить». Касание открывает
// установку сразу (notifytap.js: go 'update' → updater.tap), не из настроек. Показывается, только когда приложение свёрнуто (на экране —
// карточка и точка) и уже разрешены уведомления: разрешение здесь не запрашивается, чтобы не выскакивало окно посреди занятия.
import { Capacitor } from '@capacitor/core';
import { t } from '../i18n/index.js';
import { log } from './log.js';

export const UPD_NOTICE_ID = 7100; // вне диапазона напоминаний (reminders.js: 7000…7059, 7099)
const CHANNEL = 'melete-update';
let LN = null;
async function plugin() { // в обёртке: сам объект плагина из async возвращать нельзя (обещание ищет .then, см. reminders.js)
  if (Capacitor.getPlatform() !== 'android') return { P: null };
  if (!LN) LN = (await import('@capacitor/local-notifications')).LocalNotifications;
  return { P: LN };
}
// Текст: kind — 'ready' (скачана) | 'avail' (есть, скачать вручную)
export const noticeText = (kind, n) => (kind === 'ready'
  ? { title: t('upd.nt.ready', { n }), body: t('upd.nt.readyBody') }
  : { title: t('upd.nt.avail', { n }), body: t('upd.nt.availBody') });

export async function showUpdateNotice(kind, n) {
  try {
    const { P } = await plugin();
    if (!P) return false;
    const st = await P.checkPermissions();
    if (st.display !== 'granted') return false;
    await P.createChannel({ id: CHANNEL, name: 'Melete · ' + t('upd.title'), importance: 3, visibility: 1, vibration: false }).catch(() => {});
    const x = noticeText(kind, n);
    await P.schedule({ notifications: [{ id: UPD_NOTICE_ID, title: x.title, body: x.body, largeBody: x.body, smallIcon: 'ic_stat_melete', iconColor: '#9C7242', channelId: CHANNEL, extra: { go: 'update' } }] });
    return true;
  } catch (e) { log('upd', 'уведомление об обновлении не показано: ' + (e && e.message), 'w'); return false; }
}
export async function hideUpdateNotice() {
  try { const { P } = await plugin(); if (P) await P.cancel({ notifications: [{ id: UPD_NOTICE_ID }] }); } catch { /* нет */ }
}
