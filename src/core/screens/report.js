// «Сообщить о проблеме»: человек пишет, что случилось (можно не писать), может посмотреть весь отчёт и
// отправляет его сам — через системное «Поделиться» (Telegram, почта…). После неожиданного закрытия
// приложение один раз предлагает отправить отчёт; без согласия ничего не происходит.
import { CHEV } from './common.js';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, sw, seg, toast, leave } from '../../ui/index.js';
import { reportText, sendReport, REPORT_EMAIL, LOG_SPANS } from '../report.js';
import { log, logErr, crashedLast, crashSeen } from '../log.js';
import { count as dCount } from '../diag.js';

export function reportSheet(app) {
  let withLog = true, shown = false, span = 'all';
  const api = sheet(() => snav(t('report.title')) +
    '<p class="l2" style="margin:4px 4px 14px;font-size:15px;line-height:1.45">' + t('report.intro') + '</p>' +
    '<div class="group"><div class="cellcol"><textarea class="inp rptwhat" rows="4" maxlength="2000" placeholder="' + esc(t('report.ph')) + '" aria-label="' + esc(t('report.what')) + '"></textarea></div>' +
    '<div class="cell"><span class="grow">' + t('report.withLog') + '</span>' + sw('rptlog', true, t('report.withLog')) + '</div>' +
    '<div class="cellcol rptspan"><span>' + t('report.span') + '</span><div style="margin-top:8px">' + seg('rptspan', LOG_SPANS.map((k) => [k, t('report.span.' + k)]), 'all', t('report.span')) + '</div></div>' +
    '<button class="cell act" data-rpt="show">' + t('report.show') + '</button></div>' +
    '<pre class="rptpre" hidden></pre>' +
    '<button class="btn fill rptsend" data-rpt="send" style="width:100%;margin-top:16px">' + t('report.send') + '</button>' +
    '<button class="btn rptcopy" data-rpt="copy" style="width:100%;margin-top:8px">' + t('report.copy') + '</button>' +
    '<p class="ftr">' + t('report.how', { email: REPORT_EMAIL }) + '</p>');
  const el = api.el, what = el.querySelector('.rptwhat'), pre = el.querySelector('.rptpre');
  const text = () => reportText(app, what.value, withLog, span);
  const refresh = async () => { if (shown) pre.textContent = await text(); };
  el.querySelector('[data-sw="rptlog"]').addEventListener('change', (e) => { withLog = e.target.checked; el.querySelector('.rptspan').hidden = !withLog; refresh(); });
  el.addEventListener('click', (e) => { const s = e.target.closest('[data-seg="rptspan"] [data-v]'); if (!s) return; span = s.dataset.v; el.querySelectorAll('[data-seg="rptspan"] [data-v]').forEach((x) => x.setAttribute('aria-pressed', x === s)); refresh(); });
  what.addEventListener('input', () => { clearTimeout(what._t); what._t = setTimeout(refresh, 400); });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-rpt]');
    if (!b) return;
    if (b.dataset.rpt === 'show') {
      shown = !shown;
      pre.hidden = !shown;
      b.textContent = t(shown ? 'report.hide' : 'report.show');
      await refresh();
      if (shown) pre.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if (b.dataset.rpt === 'copy') { // текст целиком в буфер обмена — вставить в чат или письмо без файла
      b.disabled = true;
      try { await copyText(await text()); toast(t('report.copied')); } catch (err) { logErr('report', err); toast(t('report.copyFail')); } finally { b.disabled = false; }
      return;
    }
    b.disabled = true;
    try {
      log('report', 'отправка отчёта' + (withLog ? ' с журналом' : ''));
      const r = await sendReport(await text(), { title: t('report.subject'), caption: t('report.caption') + (what.value.trim() ? ': ' + what.value.trim().slice(0, 300) : '') });
      if (r === 'saved') toast(t('report.saved'));
      if (r !== 'cancel') api.close();
    } catch (err) {
      logErr('report', err);
      toast(t('report.fail'));
    } finally { b.disabled = false; }
  });
}

// В буфер обмена: navigator.clipboard, если нет (старый WebView, нет разрешения) — скрытое поле и execCommand
async function copyText(txt) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(txt); return; } } catch { /* запасной путь */ }
  const ta = document.createElement('textarea');
  ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
  document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length);
  const ok = document.execCommand('copy'); ta.remove();
  if (!ok) throw new Error('copy');
}

// Отчёт о падении одним касанием: текст уже собран (что было — «закрылось неожиданно», журнал, устройство), сразу
// «Поделиться» — выбрать Telegram или почту
async function sendCrash(app) {
  try {
    log('report', 'отчёт о падении — одним касанием');
    const r = await sendReport(await reportText(app, t('report.crashWhat'), true), { title: t('report.subject'), caption: t('report.crashWhat') });
    if (r === 'saved') toast(t('report.saved'));
  } catch (err) { logErr('report', err); toast(t('report.fail')); }
}

// Идея: короткий текст — через «Поделиться» (подпись сообщения — сама идея, в файле — версия и устройство, без журнала)
// «Связь» (слово автора 06.11.2026): чат тестеров в Telegram и идея — одним окном
const TG_CHAT = 'https://t.me/+qP8rC1tAkvU1MjYy';
export function ideaSheet(app) {
  const api = sheet(() => snav(t('contact.title')) +
    '<div class="group"><a class="cell" href="' + TG_CHAT + '" target="_blank" rel="noopener"><span class="grow">' + t('panel.tg') + '<span class="st l2" style="display:block;font-size:13px">' + t('panel.tgSub') + '</span></span>' + CHEV + '</a></div>' +
    '<div class="hdr">' + t('idea.title') + '</div>' +
    '<p class="l2" style="margin:4px 4px 14px;font-size:15px;line-height:1.45">' + t('idea.intro') + '</p>' +
    '<div class="group"><div class="cellcol"><textarea class="inp ideatext" rows="5" maxlength="2000" placeholder="' + esc(t('idea.ph')) + '" aria-label="' + esc(t('idea.title')) + '"></textarea></div></div>' +
    '<button class="btn fill" data-idea style="width:100%;margin-top:16px">' + t('idea.send') + '</button>');
  const el = api.el, ta = el.querySelector('.ideatext');
  setTimeout(() => ta.focus(), 120);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-idea]'); if (!b) return;
    const v = ta.value.trim(); if (!v) { ta.focus(); return; }
    b.disabled = true;
    try {
      const r = await sendReport(await reportText(app, t('idea.label') + ': ' + v, false), { title: t('idea.subject'), caption: t('idea.label') + ': ' + v.slice(0, 900) });
      if (r === 'saved') toast(t('report.saved'));
      if (r !== 'cancel') { toast(t('idea.thanks')); api.close(); }
    } catch (err) { logErr('report', err); toast(t('report.fail')); } finally { b.disabled = false; }
  });
}

// Что значит причина закрытия от Android: crash — падение кода или «не отвечает»; oom — система закрыла, пока
// приложение было на экране или в работе (нехватка памяти, сигнал); closed — закрыл человек или приложение было в фоне.
// В журнал — с подробностями: на экране ли было, сколько памяти занимало (PSS) — по ним видно, что вызвало закрытие.
export function exitVerdict(x) {
  if (!x) return { kind: 'crash', lvl: 'w', text: 'неизвестно' };
  const mb = (k) => (k ? Math.round(k / 1024) + ' МБ' : '?');
  const fg = x.importance != null && x.importance <= 125, det = [x.kind || x.reason, x.desc ? '«' + x.desc + '»' : '', x.importance != null ? (fg ? 'на экране' : 'в фоне') + ' (' + x.importance + ')' : '', x.pss ? 'память ' + mb(x.pss) : ''].filter(Boolean).join(', ');
  if (x.reason === 'crash' || (!x.reason && x.java)) return { kind: 'crash', lvl: 'e', text: 'падение: ' + det };
  if (!x.kind) return { kind: 'closed', lvl: 'i', text: (x.reason || 'неизвестно') + (det ? ' — ' + det : '') };
  const userish = ['user', 'stopped', 'permission'].includes(x.kind) || /remove task|swipe|stop|recents/i.test(x.desc || '');
  if (userish || !fg) return { kind: 'closed', lvl: 'i', text: 'закрыто человеком или в фоне: ' + det };
  return { kind: 'oom', lvl: 'w', text: 'система закрыла приложение на экране (память или ресурсы): ' + det };
}

// После неожиданного закрытия — одно предложение отправить отчёт (через пару секунд после запуска)
// Android: только настоящее падение (система называет причину закрытия) — закрытое человеком (смахнул, «Остановить»,
// всплывающее окно) не спрашивается (решение автора 25.10.2026)
export async function crashOffer(app) {
  if (!crashedLast()) return;
  crashSeen();
  if (Capacitor.isNativePlatform()) {
    let x = null;
    try { x = await registerPlugin('Report').lastExit(); } catch { /* старая сборка — не спрашивать */ }
    const real = x && (x.reason ? x.reason === 'crash' : x.java);
    const v = exitVerdict(x);
    log('app', 'прошлое закрытие: ' + v.text, v.lvl);
    // не падение (закрыл человек, приложение было в фоне) — из счёта вылетов убрать; нехватка памяти — отдельно
    if (v.kind !== 'crash') { dCount('app.crash', -1); dCount(v.kind === 'oom' ? 'app.oom' : 'app.closed'); }
    if (!real) return;
  }
  setTimeout(() => {
    if (document.querySelector('.ask, .tosbox')) return; // поверх соглашения и других окон — не предлагать
    const d = document.createElement('div');
    d.className = 'ask';
    d.innerHTML = '<div class="alert" role="alertdialog" aria-label="' + esc(t('report.crashTitle')) + '"><div class="ab"><h3>' + t('report.crashTitle') + '</h3><p>' + t('report.crashText') + '</p></div>' +
      '<div class="abtns"><button data-k="no">' + t('report.later') + '</button><button data-k="yes">' + t('report.toReport') + '</button></div></div>';
    document.body.appendChild(d);
    d.addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]');
      if (!k && e.target !== d) return;
      leave(d, 160);
      if (k && k.dataset.k === 'yes') sendCrash(app);
    });
  }, 2500);
}
