// Окно «Диагностика связи» нейросети (слово автора 27.11.2026): пошаговая проверка с причиной и «что делать» по каждому шагу,
// последние замеры запросов, «Отправить отчёт» (тот же отчёт о проблеме, что в настройках, — с разделом про нейросеть) и «Скопировать».
import { t } from '../../i18n/index.js';
import { esc, sheet, toast } from '../../ui/index.js';
import { statLine } from '../ai/netdiag.js';
import { reportText, sendReport } from '../report.js';

const MARK = { ok: '✓', warn: '!', fail: '✗' };
const stepHTML = (s) => '<div class="aidg ' + s.st + '"><b aria-hidden="true">' + MARK[s.st] + '</b><span><span>' + esc(t('ai.dg.' + s.info, { ...(s.vars || {}), msg: s.vars && s.vars.msg ? ': ' + s.vars.msg : '' })) + '</span>' +
  (s.st !== 'ok' && s.kind ? '<i class="l2">' + esc(t('ai.why.' + (s.kind === 'timeout' && s.id !== 'req' ? 'slowmodel' : s.kind))) + '</i>' : '') + '</span></div>';

// res — результат app.ai.diagnose(); null — идёт проверка
export function openDiag(app) {
  let res = null, busy = true;
  const body = () => '<div class="snav"><span></span><div class="t">' + esc(t('ai.diag')) + '</div><button class="link b r" data-close>' + esc(t('ui.done')) + '</button></div>' +
    (busy ? '<p class="ftr">' + esc(t('ai.diag.wait')) + '</p>' : '<div class="group aidgl">' + res.steps.map(stepHTML).join('') + '</div>' +
      (res.ok ? '<p class="ftr">' + esc(t('ai.diag.okAll')) + '</p>' : '') +
      '<div class="hdr">' + esc(t('ai.diag.last')) + '</div><div class="group aidgl">' + (res.stats.length ? res.stats.slice(-8).reverse().map((s) => '<div class="aidg ' + (s.kind === 'ok' ? 'ok' : 'fail') + '"><b aria-hidden="true">' + (s.kind === 'ok' ? '✓' : '✗') + '</b><span>' + esc(new Date(s.t).toLocaleTimeString() + ' · ' + statLine(s)) + '</span></div>').join('') : '<p class="ftr">' + esc(t('ai.diag.none')) + '</p>') + '</div>' +
      '<div class="group"><button class="cell act" data-dg="run">' + esc(t('ai.diag.run')) + '</button><button class="cell act" data-dg="send">' + esc(t('ai.diag.send')) + '</button><button class="cell act" data-dg="copy">' + esc(t('ai.diag.copy')) + '</button></div>');
  sheet(body, (el, sh) => {
    const run = async () => { busy = true; sh.update(); try { res = await app.ai.diagnose(); } catch (e) { res = { ok: false, steps: [{ id: 'req', st: 'fail', info: 'req.fail', kind: 'net', vars: { msg: String((e && e.message) || '').slice(0, 80) } }], stats: app.ai.stats() }; } busy = false; sh.update(); };
    run();
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-dg]'); if (!b || busy) return;
      if (b.dataset.dg === 'run') run();
      else if (b.dataset.dg === 'copy') { try { await navigator.clipboard.writeText(res.text(t)); toast(t('ai.diag.copied')); } catch { toast(t('report.fail')); } }
      else if (b.dataset.dg === 'send') { try { await sendReport(await reportText(app, t('ai.diag'), true, 'hour'), { title: t('report.subject'), caption: t('ai.diag') }); } catch (er) { toast(t('report.fail')); (globalThis.reportError || console.error)(er); } }
    });
  });
}
