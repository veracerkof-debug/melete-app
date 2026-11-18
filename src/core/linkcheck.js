// Проверка связи: серия лёгких запросов к сопряжённому устройству по существующему защищённому каналу
// (sync.js: http → /melete/v1/rc/ping, обработчик — netctl.js: rcHandle). Для канала событий (link.js) — своя серия
// через link.ping(). Математика — linkstats.js.
import { summarize } from './linkstats.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const PING_PATH = '/melete/v1/rc/ping';
export const SERIES = 50;

// ping(i) → Promise (ответ пришёл) или отказ; now — часы в мс (performance.now). Запросы идут по одному, с паузой gap:
// так считается задержка канала, а не очередь. onStep({ i, n, rtt|null }) — для полосы хода. cancel() — прервать.
export async function runCheck(ping, { n = SERIES, gap = 30, now = () => performance.now(), onStep = () => {}, timeout = 2000, shouldStop = () => false } = {}) {
  const rtts = [];
  let sent = 0;
  for (let i = 0; i < n && !shouldStop(); i++) {
    const t0 = now();
    sent++;
    let rtt = null;
    try {
      await Promise.race([ping(i), wait(timeout).then(() => { throw new Error('timeout'); })]);
      rtt = now() - t0;
      rtts.push(rtt);
    } catch { /* потеря */ }
    onStep({ i: i + 1, n, rtt });
    if (i < n - 1 && gap) await wait(gap);
  }
  return summarize(rtts, sent);
}

// Серия по HTTPS к устройству dev { addr, key }; H — sync.js: http
export const httpPing = (H, dev) => (i) => H('POST', dev.addr + PING_PATH, { key: dev.key, json: { i }, timeout: 3000 });
