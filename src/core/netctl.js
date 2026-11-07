// Пульт другого устройства (Melete DEV, шаги 2–3 связи всех со всеми; слово автора 07.11.2026): сопряжённое устройство
// управляет звуком (пауза, шины), метрономом, пэдами, открывает инструменты, управляет медиатекой и дорожками этого — что звучит, играть и пауза, перемотка, соседняя запись, запись из списка,
// громкость каждой дорожки разделённой записи, скорость, тональность. Канал — тот же защищённый, что у синхронизации
// (sync.js: handleRequest → /melete/v1/rc/*); плеер отдаёт состояние и принимает команды через ctx.net (modules.js).
// Плеер закрыт — открывается сам. Управляемое устройство говорит, кто им управляет, и даёт отключить одним касанием.
import { t } from '../i18n/index.js';
import { toast } from '../ui/index.js';
import { log } from './log.js';
import { BUSES, mixKey, MIX_MAX } from '../audio/mixer.js';
import { hold, isHeld, peekContext } from '../audio/context.js';
import { CHORDS } from '../audio/drone.js';
import { modules } from '../modules/index.js';
import { moduleName } from './modules.js';

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

// Звук этого устройства (шаг 3): пауза всего, громкость и выкл каждой шины, метроном, пэды с тональностью, созвучием и
// арпеджиатором, открыть инструмент. Всё — через общий звук приложения (app.audio), без внутренностей модулей
const busName = (b) => t('mix.' + b);
export function soundState(app) {
  const A = app.audio || {}, M = A.mixer, d = (app.device && app.device.drone) || {};
  const buses = M ? BUSES.map((b) => { const k = mixKey(b), v = M.state[k]; return { id: b, name: busName(b), vol: v == null ? 1 : v, on: !(M.state.mute || {})[k], active: !!(M.isActive && M.isActive(b)) }; }) : [];
  const S = app.store && app.store.state.settings;
  return {
    held: isHeld(), buses,
    metro: A.metro ? { running: !!A.metro.running, bpm: A.metro.cfg.bpm, num: A.metro.cfg.num, den: A.metro.cfg.den } : null,
    pads: A.drone ? { on: !!A.drone.on, pc: d.pc || 0, chord: A.drone.chord, chords: Object.keys(CHORDS), arp: !!(d.arp && d.arp.on) } : null,
    tools: S ? modules.filter((m) => !m.partOf && !m.inner && (!S.off || !S.off[m.id])).map((m) => ({ id: m.id, name: moduleName(m) })) : [],
  };
}
const SOUND = ['hold', 'vol', 'mute', 'metro', 'bpm', 'pads', 'padpc', 'padchord', 'arp', 'tool'];
async function soundCmd(app, c) {
  const A = app.audio || {}, M = A.mixer;
  if (c.a === 'hold') { if (peekContext()) hold(!!c.on); }
  else if (c.a === 'vol' && M && BUSES.includes(c.bus)) M.set(c.bus, Math.max(0, Math.min(MIX_MAX, +c.v || 0)));
  else if (c.a === 'mute' && M && BUSES.includes(c.bus)) { const mu = !!(M.state.mute || {})[mixKey(c.bus)]; if (mu === !!c.on) M.toggleMute(c.bus); } // on — звучит
  else if (c.a === 'metro' && A.metro) { if (c.on && A.unlock) A.unlock(); if (c.on && !A.metro.running) A.metro.start(); else if (!c.on && A.metro.running) A.metro.stop(); }
  else if (c.a === 'bpm' && A.metro) A.metro.setBpm(+c.v || A.metro.cfg.bpm);
  else if (c.a === 'pads' && A.drone) { if (c.on && A.unlock) A.unlock(); if (c.on && !A.drone.on) A.drone.start(); else if (!c.on && A.drone.on) A.drone.stop(); if (A.arp) A.arp.sync(); }
  else if (c.a === 'padpc' && A.drone) A.drone.tonic(+c.pc || 0);
  else if (c.a === 'padchord' && A.drone && CHORDS[c.c]) { if (A.drone.on) A.drone.swap({ chord: c.c }); else A.drone.start({ chord: c.c }); }
  else if (c.a === 'arp' && A.arp && app.device) { const d = app.device.drone || (app.device.drone = {}); d.arp = { ...(d.arp || {}), on: !!c.on }; if (app.saveDevice) app.saveDevice(); A.arp.sync(); }
  else if (c.a === 'tool' && app.showTool && modules.some((m) => m.id === c.id)) app.showTool(c.id);
  if (app.render && (c.a === 'pads' || c.a === 'padchord' || c.a === 'arp' || c.a === 'metro')) { try { app.render(); } catch { /* */ } }
}

// Запрос пульта на этом устройстве → { status, json }
export async function rcHandle(app, path, json, peer, forget) {
  const N = app.net || {};
  if (path === '/melete/v1/rc/state') return { status: 200, json: { media: N.audio ? N.audio.state() : null, list: listOf(app), snd: soundState(app) } };
  if (path === '/melete/v1/rc/cmd') {
    notice(app, peer, forget);
    if (SOUND.includes((json || {}).a)) { try { await soundCmd(app, json); } catch (e) { log('net', 'пульт: ' + (e && e.message), 'w'); } return { status: 200, json: { media: N.audio ? N.audio.state() : null, snd: soundState(app) } }; }
    let P = N.audio;
    if (!P && app.showTool) { app.showTool('audio'); for (let i = 0; i < 40 && !(P = (app.net || {}).audio); i++) await wait(100); } // плеер закрыт — открыть
    if (!P) return { status: 409, json: { error: 'off' } };
    try { await P.cmd(json || {}); } catch (e) { log('net', 'пульт: ' + (e && e.message), 'w'); }
    return { status: 200, json: { media: P.state() } };
  }
  return { status: 404, json: {} };
}
