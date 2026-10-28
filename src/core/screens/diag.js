// «Диагностика»: что приложение само узнало о работе на этом устройстве (diag.js — счёт, diagnose.js — выводы).
// Вверху — находки с советом (или «всё в порядке»), дальше — «Сейчас» (живые показания звука, раз в секунду, пока
// шторка открыта) и «За 7 дней»; внизу — самопроверка, отчёт (уходит со сводкой для разработчика) и сброс счёта.
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, confirm, toast } from '../../ui/index.js';
import { state as dState, clearDiag, flushDiag } from '../diag.js';
import { diagnose, weekly } from '../diagnose.js';
import { checkSheet } from './selfcheck.js';
import { reportSheet } from './report.js';

const MARK = { bad: '✗', warn: '!', info: 'i' }, ST = { bad: 'fail', warn: 'warn', info: 'skip' };
const row = (lab, val) => '<div class="cell"><span class="grow">' + esc(lab) + '</span><span class="val num" style="margin-left:12px;text-align:right">' + esc(val) + '</span></div>';
// длинное значение — строкой под подписью
const rowSub = (lab, val) => '<div class="cell"><span class="grow">' + esc(lab) + '<span class="psub num">' + esc(val) + '</span></span></div>';

export const diagEnv = (app) => ({ audio: app.audio.state ? app.audio.state() : null });

// Живые показания: звук, нагрузка, голоса, открыто, память
function nowRows(app) {
  const a = app.audio.state ? app.audio.state() : null, m = a && app.audio.load, mem = performance.memory;
  const open = [...(app.openNow || new Map()).keys()];
  return [
    rowSub(t('diag.n.sound'), a ? a.sr + ' Hz · ' + t('diag.n.buf', { b: a.base, o: a.out }) : t('diag.n.off')),
    row(t('diag.n.load'), m && m.ready ? Math.round(m.value * 100) + ' % · ' + t('diag.n.peak', { p: Math.round(m.peak * 100) }) : '–'),
    row(t('diag.n.voices'), a ? String(a.voices) + (a.pads ? ' · ' + t('diag.n.pads') : '') + (a.metro ? ' · ' + t('diag.n.metro') : '') : '–'),
    row(t('diag.n.engine'), a ? [a.mode, a.perf, a.verb].filter(Boolean).join(' · ') : '–'),
    rowSub(t('diag.n.open'), open.length ? open.join(', ') : '–'),
    ...(mem && mem.jsHeapSizeLimit ? [row(t('diag.n.mem'), Math.round(mem.usedJSHeapSize / 1048576) + ' / ' + Math.round(mem.jsHeapSizeLimit / 1048576) + ' MB')] : []),
  ].join('');
}

function weekRows(w) {
  const x = (v, k) => (v == null ? '–' : t(k, { v }));
  return [
    row(t('diag.w.load'), w.load == null ? '–' : w.load + ' % · ' + t('diag.w.max', { v: w.loadMax })),
    row(t('diag.w.min90'), x(w.min90, 'diag.u.min')),
    row(t('diag.w.overloads'), String(w.overloads) + (w.squeeze ? ' · ' + t('diag.w.squeeze', { v: w.squeeze }) : '')),
    row(t('diag.w.freezes'), String(w.freezes) + (w.freezeMax ? ' · ' + t('diag.w.max', { v: w.freezeMax + ' ms' }) : '')),
    row(t('diag.w.errors'), w.errors + ' · ' + t('diag.w.warns', { v: w.warns })),
    row(t('diag.w.crashes'), String(w.crashes)),
    row(t('diag.w.start'), x(w.start, 'diag.u.s')),
    row(t('diag.w.modload'), x(w.modload, 'diag.u.s')),
    row(t('diag.w.stems'), x(w.stems, 'diag.u.x')),
    row(t('diag.w.ana'), x(w.ana, 'diag.u.x')),
    row(t('diag.w.render'), x(w.render, 'diag.u.fast')),
    ...(w.late ? [row(t('diag.w.late'), String(w.late))] : []),
    ...(w.opens.length ? [row(t('diag.w.opens'), w.opens.slice(0, 5).map(([k, v]) => k + ' ' + v).join(', '))] : []),
  ].join('');
}

export function diagSheet(app) {
  flushDiag();
  let tm = 0;
  const body = () => {
    const S = dState(), found = diagnose(S, diagEnv(app)), w = weekly(S), last = S.last && S.last.check;
    const real = found.filter((f) => f.sev !== 'info');
    return snav(t('diag.title')) +
      '<p class="l2" style="margin:4px 4px 14px;font-size:15px;line-height:1.45">' + t('diag.intro') + '</p>' +
      '<div class="group cklist" data-dg="found">' + (real.length ? '' : '<div class="ckrow" data-st="ok"><span class="ckst">✓</span><span class="grow"><b>' + t('diag.allOk') + '</b><span class="psub">' + t('diag.allOkSub', { d: w.days }) + '</span></span></div>') +
        found.map((f) => '<div class="ckrow" data-st="' + ST[f.sev] + '" data-find="' + f.id + '"><span class="ckst">' + MARK[f.sev] + '</span><span class="grow"><b>' + esc(t('diag.f.' + f.id, f.vars)) + '</b><span class="psub">' + esc(t('diag.h.' + (f.hint || f.id), f.vars)) + '</span></span></div>').join('') + '</div>' +
      '<div class="hdr">' + t('diag.now') + '</div><div class="group" data-dg="now">' + nowRows(app) + '</div>' +
      '<div class="hdr">' + t('diag.week') + '</div><div class="group">' + weekRows(w) + '</div>' +
      '<p class="ftr">' + esc(last ? t('diag.lastCheck', { d: new Date(last.t).toLocaleDateString(), ok: last.v.filter((r) => r.st === 'ok').length, n: last.v.length }) : t('diag.noCheck')) + '</p>' +
      '<button class="btn fill" data-dg-act="check" style="width:100%;margin-top:8px">' + t('diag.check') + '</button>' +
      '<button class="btn" data-dg-act="report" style="width:100%;margin-top:8px">' + t('diag.report') + '</button>' +
      '<button class="btn plain" data-dg-act="clear" style="width:100%;margin-top:8px;color:var(--l2)">' + t('diag.clear') + '</button>' +
      '<p class="ftr">' + t('diag.privacy') + '</p>';
  };
  const api = sheet(body, null, { onClose: () => clearInterval(tm) });
  tm = setInterval(() => { const el = api.el.querySelector('[data-dg="now"]'); if (el) el.innerHTML = nowRows(app); }, 1000);
  api.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-dg-act]');
    if (!b) return;
    const k = b.dataset.dgAct;
    if (k === 'check') { api.close(); checkSheet(app); }
    else if (k === 'report') { api.close(); reportSheet(app); }
    else if (k === 'clear' && (await confirm(t('diag.clear'), t('diag.clearAsk'), t('diag.clear')))) { clearDiag(); toast(t('diag.cleared')); api.update(); }
  });
  return api;
}
