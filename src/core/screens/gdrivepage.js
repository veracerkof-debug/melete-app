// Настройки «Google Диск» (синхронизация своих устройств, core/gdrive.js, слово автора 25.11.2026): вход, папка Melete на Диске,
// автоматический обмен, кнопка «Синхронизировать». Данные и файлы остаются и работают на устройстве без сети.
import { t } from '../../i18n/index.js';
import { esc } from '../../ui/index.js';
import { App } from '@capacitor/app';
import { account, authAvail, authPlanned, signedIn, signIn, signOut } from '../gauth.js';
import { gdriveMem, forgetDrive } from '../gdrive.js';
import { DEV } from '../variants.js';
import { SHOWCASE } from '../platform.js';

let msg = '';
const REASON = { auth: 'gd.eAuth', quota: 'gd.eQuota', unreachable: 'gd.eNet', denied: 'gd.eDenied', timeout: 'gd.eTimeout', state: 'gd.eState', noclient: 'gd.eKey' };
const errText = (e) => t(REASON[e && e.reason] || 'gd.eOther');
const ago = (ts) => { const m = Math.max(0, Math.round((Date.now() - ts) / 60000)); return m < 1 ? t('gd.justNow') : m < 90 ? t('gd.minAgo', { n: m }) : t('gd.hAgo', { n: Math.round(m / 60) }); };

// Показывать ли страницу: вход настроен (ключ вписан) или это dev (с пояснением, что нужен ключ); демонстрация — нет
export const gdriveShown = () => !SHOWCASE && (authAvail() || (DEV && authPlanned()));

export function gdriveHTML(app) {
  const st = app.store.state.settings, cli = app.gdrive, on = signedIn(), mem = gdriveMem();
  let h = '<div class="large">' + t('page.gdrive') + '</div><p class="ftr" style="margin-top:0">' + t('gd.how') + '</p>';
  if (!authAvail()) return h + '<div class="group"><div class="cell"><span class="grow l2">' + t('gd.noKey') + '</span></div></div>';
  if (!on) {
    return h + '<div class="group"><button class="cell act center" data-act="gd" data-v="signin">' + t('gd.signin') + '</button></div>' + (msg ? '<p class="ftr" role="status">' + esc(msg) + '</p>' : '') + '<p class="ftr">' + t('gd.privacy') + '</p>';
  }
  const busy = cli && cli.busy, last = cli && cli.last, step = cli && cli.step;
  const status = busy ? t('gd.running') + (step && step.name ? ' · ' + esc(step.name) : '') : last && !last.ok ? t(REASON[last.reason] || 'gd.eOther') : mem.last ? t('gd.last', { ago: ago(mem.last) }) : t('gd.never');
  h += '<div class="group"><div class="cell"><span class="grow">' + t('gd.account') + '<span class="psub">' + esc(account() || '—') + '</span></span></div>' +
    '<div class="cell"><span class="grow">' + t('gd.folder') + '<span class="psub">Melete</span></span></div></div>' +
    '<div class="group"><div class="cell"><span class="grow">' + t('gd.auto') + '<span class="psub">' + t('gd.autoSub') + '</span></span><label class="sw"><input type="checkbox" data-psw="gdAuto"' + (st.gdrive !== false ? ' checked' : '') + ' aria-label="' + esc(t('gd.auto')) + '"><i></i></label></div>' +
    '<button class="cell act center" data-act="gd" data-v="sync"' + (busy ? ' disabled' : '') + '>' + t('gd.sync') + '</button></div>' +
    '<p class="ftr" role="status">' + status + (msg ? '<br>' + esc(msg) : '') + '</p>' +
    (last && !last.ok && last.reason === 'auth' ? '<div class="group"><button class="cell act center" data-act="gd" data-v="signin">' + t('gd.again') + '</button></div>' : '') +
    '<div class="group"><button class="cell act center" data-act="gd" data-v="signout" style="color:var(--red)">' + t('gd.signout') + '</button></div><p class="ftr">' + t('gd.privacy') + '</p>';
  return h;
}

// Нажатия страницы; render — перерисовать. true — нажатие обработано
export async function gdriveAct(app, v, render) {
  const cli = app.gdrive;
  if (v === 'signin') {
    msg = t('gd.waiting'); render();
    try { await signIn(App); msg = ''; if (cli) cli.kick(500); } catch (e) { msg = errText(e); }
    render();
  } else if (v === 'sync') {
    msg = ''; render();
    try { const r = await cli.run(() => render()); msg = r.up || r.down || r.songs || r.sessions || r.removed ? t('gd.done', { up: r.up, down: r.down, songs: r.songs, sessions: r.sessions }) : t('gd.same'); } catch (e) { msg = e.reason === 'running' ? '' : errText(e); }
    render();
  } else if (v === 'signout') {
    signOut(); forgetDrive(); msg = ''; render(); // файлы на Диске и на устройстве остаются как есть
  }
}
