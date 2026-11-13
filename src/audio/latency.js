// Задержка «выход → голос → вход» (слово автора 14.11.2026: «измерять задержку между наушниками и телефоном, чтобы
// удобнее петь в наушниках»; DECISIONS «Вокал: задержка»). Своя для каждого выхода: Bluetooth (200–300 мс), проводные
// наушники, динамик телефона — выход приложение знает само (context.js: outKind, core/index.js). Хранится на устройстве
// (localStorage melete.latency, мс); нет замера — умолчание по выходу.
// Замер — щелчки в выход, захват входа по часам контекста (capture.js), место первого громкого отсчёта после каждого
// щелчка, медиана (latencyOf, перенесено из студии):
//  • 'voice' — в наушниках: человек поёт короткое «та» на каждый щелчок; голос приходит с той задержкой, с какой
//    человек слышит музыку, плюс вход — ровно то, что нужно при пении (так поправляются линия голоса и оценка);
//  • 'loop' — динамиком (или наушник к микрофону): вход слышит сам щелчок — выход плюс вход, без человека.
// Применение: «Петь» (sing.js), распевки (vocal) — проба голоса относится к моменту на latency раньше.
import { createCapture, openInput } from './capture.js';
import { clickVoice, clickNoise } from './metronome.js';
import { after } from './clock.js';
import { currentOutKind } from './context.js';

const KEY = 'melete.latency';
export const DEFAULT_MS = { bt: 220, wired: 60, phone: 80 };
export const KINDS = ['bt', 'wired', 'phone'];
const kindOf = (k) => (KINDS.includes(k) ? k : 'phone');

function readAll() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } }
// → { ms, kind, measured }
export function latencyNow(kind = currentOutKind()) {
  const k = kindOf(kind), all = readAll(), v = all[k];
  return Number.isFinite(v) ? { ms: v, kind: k, measured: true } : { ms: DEFAULT_MS[k], kind: k, measured: false };
}
export const latencySec = () => latencyNow().ms / 1000;
export function setLatency(ms, kind = currentOutKind()) {
  const all = readAll();
  if (ms == null) delete all[kindOf(kind)]; else all[kindOf(kind)] = Math.max(0, Math.min(800, Math.round(ms)));
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* приватный режим — только на этот раз */ }
}

// Задержка по щелчкам: место первого громкого отсчёта после каждого щелчка → медиана, с (или null — не услышали)
export function latencyOf(ch, sr, rel, { win = 0.6, floor = 0.02 } = {}) {
  const out = [];
  rel.forEach((t) => {
    const i0 = Math.max(0, Math.round(t * sr)), i1 = Math.min(ch.length, i0 + Math.round(win * sr));
    let mx = 0;
    for (let i = i0; i < i1; i++) { const v = Math.abs(ch[i]); if (v > mx) mx = v; }
    if (mx < floor) return;
    const th = mx * 0.35;
    for (let i = i0; i < i1; i++) if (Math.abs(ch[i]) >= th) { out.push((i - i0) / sr); break; }
  });
  if (out.length < Math.ceil(rel.length / 2)) return null;
  out.sort((a, b) => a - b);
  return out[Math.floor(out.length / 2)];
}

// Замер: audio — ctx.audio; method 'voice' | 'loop'; inPrefs — вход ({ in } как у студии). → мс или null (не услышали).
// onClick(i) — щёлкнул i-й (показ на экране). Ошибки входа — наружу (reason: 'denied' | 'unavailable')
export async function measureLatency(audio, { method = 'voice', inPrefs = {}, onClick = () => {} } = {}) {
  if (!audio.unlock()) throw Object.assign(new Error('sound'), { reason: 'sound' });
  const tap = audio.tap();
  if (!tap) throw Object.assign(new Error('sound'), { reason: 'sound' });
  const c = tap.ctx, n = method === 'voice' ? 8 : 6, gap = method === 'voice' ? 0.75 : 0.5, win = method === 'voice' ? 0.7 : 0.45;
  let input = null, cap = null;
  try {
    input = await openInput(inPrefs);
    cap = createCapture(c, c.createMediaStreamSource(input.stream), { channels: 1 });
    const t0 = c.currentTime + (method === 'voice' ? 1.2 : 0.4), noise = clickNoise(c), bus = audio.mixer.bus('metro');
    cap.start(t0 - 0.1);
    for (let i = 0; i < n; i++) { clickVoice(c, bus, t0 + i * gap, i === 0 ? 3 : 2, 'click', noise); after((t0 - c.currentTime + i * gap) * 1000, () => onClick(i)); }
    await new Promise((res) => after((t0 - c.currentTime + n * gap + 0.6) * 1000, res));
    const data = cap.stop();
    if (!data) return null;
    const lat = latencyOf(data.ch[0], data.sr, Array.from({ length: n }, (_, i) => i * gap + (t0 - data.t0)), { win, floor: method === 'voice' ? 0.03 : 0.02 });
    return lat == null ? null : Math.round(lat * 1000);
  } finally { if (cap) cap.dispose(); if (input) input.close(); }
}
