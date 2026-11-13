// Снятие мелодии песни для режима «Петь» (DECISIONS «Вокал: прогресс и «Петь»», 14.11.2026): дорожка вокала записи
// (Blob) → моно 8 кГц (OfflineAudioContext сам передискретизирует) → линия высоты в рабочем потоке (melody.worker.js).
// На телефоне — тоже: расчёт лёгкий (8 кГц, окно 40 мс). Результат ложится в запись медиатеки (rec.mel) — один раз.
import { MEL_SR, HOP, trackPitch } from '../music/melody.js';

async function decode8k(blob) {
  const C = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const probe = new C(1, MEL_SR, MEL_SR), raw = await probe.decodeAudioData(await blob.arrayBuffer());
  const oc = new C(1, Math.ceil(raw.duration * MEL_SR), MEL_SR), src = oc.createBufferSource();
  src.buffer = raw; src.connect(oc.destination); src.start();
  return (await oc.startRendering()).getChannelData(0);
}

// → Promise<{ v: 1, hop, p: Int16Array }>; рабочий поток недоступен — считается здесь же (медленнее, но работает)
export async function extractMelody(blob) {
  const x = await decode8k(blob);
  let p;
  try {
    p = await new Promise((res, rej) => {
      const w = new Worker(new URL('./melody.worker.js', import.meta.url), { type: 'module' });
      w.onmessage = (e) => { w.terminate(); if (e.data.err) rej(new Error(e.data.err)); else res(e.data.p); };
      w.onerror = (e) => { w.terminate(); rej(e); };
      w.postMessage({ x, sr: MEL_SR }, [x.buffer]);
    });
  } catch { p = trackPitch(await decode8k(blob), MEL_SR); }
  return { v: 1, hop: HOP, p };
}
