// Пульт другого устройства (Melete DEV, шаг 2 связи всех со всеми; слово автора 07.11.2026): сопряжённое устройство
// управляет медиатекой и дорожками этого — что звучит, играть и пауза, перемотка, соседняя запись, запись из списка,
// громкость каждой дорожки разделённой записи, скорость, тональность. Канал — тот же защищённый, что у синхронизации
// (sync.js: handleRequest → /melete/v1/rc/*); плеер отдаёт состояние и принимает команды через ctx.net (modules.js).
// Плеер закрыт — открывается сам. Управляемое устройство говорит, кто им управляет, и даёт отключить одним касанием.
import { t } from '../i18n/index.js';
import { toast } from '../ui/index.js';
import { log } from './log.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const seen = new Map(); // ключ устройства → когда сказали «управляет»
export const listOf = (app) => (app.files ? app.files.list('audio').filter((x) => !x.stem && !x.dn && (x.blob || x.size)).sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 300).map((x) => ({ id: x.id, name: x.name || '', dur: x.dur || 0 })) : []);

function notice(app, peer, forget) {
  const now = Date.now();
  if (!peer || now - (seen.get(peer.key) || 0) < 10 * 60000) return;
  seen.set(peer.key, now);
  log('net', 'пульт: управляет ' + String(peer.key).slice(0, 6));
  toast(t('rc.by', { name: peer.name || '' }), { action: t('rc.off'), onAction: () => { if (forget) forget(peer.key); log('net', 'пульт отключён здесь'); } });
}

// Запрос пульта на этом устройстве → { status, json }
export async function rcHandle(app, path, json, peer, forget) {
  const N = app.net || {};
  if (path === '/melete/v1/rc/state') return { status: 200, json: { media: N.audio ? N.audio.state() : null, list: listOf(app) } };
  if (path === '/melete/v1/rc/cmd') {
    notice(app, peer, forget);
    let P = N.audio;
    if (!P && app.showTool) { app.showTool('audio'); for (let i = 0; i < 40 && !(P = (app.net || {}).audio); i++) await wait(100); } // плеер закрыт — открыть
    if (!P) return { status: 409, json: { error: 'off' } };
    try { await P.cmd(json || {}); } catch (e) { log('net', 'пульт: ' + (e && e.message), 'w'); }
    return { status: 200, json: { media: P.state() } };
  }
  return { status: 404, json: {} };
}
