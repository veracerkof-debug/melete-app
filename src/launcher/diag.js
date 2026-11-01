// Журнал страницы (DECISIONS 2026-11-01): ошибки, подвисания (долгие задачи), сколько собирался главный после
// возврата. На телефоне строки уходят в журнал приложения (Diag.java, вместе с запусками, памятью и падениями),
// в браузере — в localStorage (последние 300). Только техника: ни приложений, ни заметок, ни кошелька.
import { isNative, Launcher } from './native.js';

const KEY = 'elachiston.diag';
const WEB_MAX = 300;
const buf = [];
let timer = 0;

const stamp = () => new Date().toISOString().slice(5, 23).replace('T', ' ');

function flush() {
  timer = 0;
  if (!buf.length) return;
  const lines = buf.splice(0);
  if (isNative()) { Launcher.diag({ lines }).catch(() => {}); return; }
  try {
    const old = JSON.parse(localStorage.getItem(KEY) || '[]');
    localStorage.setItem(KEY, JSON.stringify([...old, ...lines.map((l) => `${stamp()} js ${l}`)].slice(-WEB_MAX)));
  } catch { /* хранилище недоступно */ }
}

export function dlog(tag, msg) {
  buf.push(`${tag} ${String(msg).slice(0, 600)}`);
  if (!timer) timer = setTimeout(flush, 1500);
}

let started = false;
export function startDiag() {
  if (started) return;
  started = true;
  addEventListener('error', (e) => dlog('ERR', `${e.message || e.type} @ ${(e.filename || '').split('/').pop()}:${e.lineno || 0}`));
  addEventListener('unhandledrejection', (e) => dlog('ERR', `promise: ${e.reason?.message || e.reason}`));
  // подвисания: задача дольше 150 мс (касание в это время не отвечает); не чаще раза в 2 с
  try {
    let last = 0;
    new PerformanceObserver((l) => {
      for (const x of l.getEntries()) {
        if (x.duration < 150 || x.startTime - last < 2000) continue;
        last = x.startTime;
        dlog('long', `${Math.round(x.duration)}ms ${document.hidden ? 'hidden' : 'visible'}`);
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch { /* нет longtask — без них */ }
  // ушли — дописать журнал сразу (процесс в фоне могут закрыть)
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  dlog('page', `start ${innerWidth}x${innerHeight} dpr=${devicePixelRatio}`);
}

// Главный снова на экране: замер от «видно» до второго кадра после перерисовки
export function markShown(t0) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const js = Math.round(performance.now() - t0);
    if (isNative()) Launcher.shown({ js }).catch(() => {});
    else if (js > 300) dlog('SLOW', `home visible in ${js}ms`);
  }));
}

// Журнал целиком: { head, text }
export async function readDiag() {
  flush();
  if (isNative()) {
    await new Promise((r) => setTimeout(r, 200)); // строки страницы успели дописаться
    try { return await Launcher.diagRead(); } catch { return { head: '', text: '' }; }
  }
  let lines = [];
  try { lines = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { /* */ }
  return { head: `web ${navigator.userAgent}\n`, text: lines.join('\n') + '\n' };
}

export async function clearDiag() {
  if (isNative()) { await Launcher.diagClear().catch(() => {}); return; }
  try { localStorage.removeItem(KEY); } catch { /* */ }
}

// Сводка за 7 дней: падения, закрытия системой, пересборки страницы, медленные возвраты, ошибки, подвисания
export function summarize(text) {
  const now = new Date();
  const since = new Date(now - 7 * 864e5);
  const s = { crash: 0, killed: 0, gone: 0, slow: 0, err: 0, long: 0, shown: [], cold: 0 };
  for (const line of text.split('\n')) {
    const m = /^(\d\d)-(\d\d) (\d\d):(\d\d)/.exec(line);
    if (!m) continue;
    const d = new Date(now.getFullYear(), +m[1] - 1, +m[2], +m[3], +m[4]);
    if (d > now) d.setFullYear(d.getFullYear() - 1);
    if (d < since) continue;
    if (/ CRASH /.test(line) || /reason=CRASH/.test(line) || /reason=ANR/.test(line)) s.crash++;
    else if (/reason=LOW-MEMORY/.test(line)) s.killed++;
    if (/ GONE /.test(line)) s.gone++;
    if (/ start cold/.test(line)) s.cold++;
    if (/ ERR /.test(line)) s.err++;
    if (/ long \d+ms visible/.test(line)) s.long++;
    const v = / (?:shown|SLOW) home visible in (\d+)ms/.exec(line);
    if (v) { s.shown.push(+v[1]); if (+v[1] > 700) s.slow++; }
  }
  const sorted = [...s.shown].sort((a, b) => a - b);
  s.median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
  s.worst = sorted.length ? sorted[sorted.length - 1] : null;
  return s;
}

// Отправить отчёт: телефон — файлом через «Поделиться», браузер — сохранить файл
export async function shareDiag(summaryText) {
  if (isNative()) { await Launcher.diagShare({ summary: summaryText }); return; }
  const { head, text } = await readDiag();
  const blob = new Blob([head, '\n', summaryText, '\n\n', text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'elachiston-report.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
