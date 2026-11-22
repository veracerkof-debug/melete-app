// Хозяин микрофона (слово автора 22.11.2026, третий принцип: запись не должна прерваться).
// Правила:
//  1. Кто начал запись первым, тот и пишет: другая запись не начинается сама. Её можно начать, только остановив первую
//     (recBeginAsk спрашивает человека и вызывает остановку первой — она сохраняется как обычно).
//  2. Пока идёт запись, остальные микрофонные инструменты (тюнер, слух, лупер…) второй поток не открывают: получают
//     ошибку reason 'busy' и показывают надпись «идёт запись». Уже открытые пассивные потоки не трогаются.
//  3. Слух маскота и учёт игры (soft) — самые уступчивые: любой инструмент перебивает их, а они сами не открываются,
//     пока микрофон занят кем-то ещё.
// Без DOM и без зависимостей, кроме журнала.
import { log } from '../core/log.js';

const recs = new Map();    // who → { who }: идущие записи
const stoppers = new Map();// who → () => Promise: как остановить запись и сохранить (регистрирует сам модуль)
const opens = new Set();   // открытые потоки { who, soft, yieldFn }
const subs = new Set();
const emit = () => subs.forEach((fn) => { try { fn(); } catch { /* подписчик не должен ломать запись */ } });

export const onMicChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const setStopper = (who, fn) => { if (fn) stoppers.set(who, fn); else stoppers.delete(who); };

// Кто пишет сейчас: { who, stop } или null
export function recBy() {
  const e = recs.values().next().value;
  return e ? { who: e.who, stop: stoppers.get(e.who) || null } : null;
}
export const recording = () => recs.size > 0;

// Занять запись. → { ok: true, end() } или { ok: false, by: { who, stop } }
export function recBegin(who) {
  const by = recBy();
  if (by && by.who !== who) return { ok: false, by };
  const h = { who };
  recs.set(who, h);
  log('audio', 'запись занята: ' + who);
  emit();
  return { ok: true, end() { if (recs.get(who) === h) { recs.delete(who); log('audio', 'запись свободна: ' + who); emit(); } } };
}

// То же, но с вопросом: идёт чужая запись — ask(whoIsRecording) → Promise<boolean>; «да» — чужая запись останавливается
// (и сохраняется своим модулем), потом занимаем. Без ask или без способа остановить — просто отказ.
export async function recBeginAsk(who, ask) {
  const r = recBegin(who);
  if (r.ok) return r;
  if (!ask || !r.by.stop) { window.dispatchEvent(new CustomEvent('melete:micbusy', { detail: { who, by: r.by.who } })); return r; } // нечем спросить — большая надпись
  if (!(await ask(r.by.who))) return r; // человек оставил первую запись — она идёт дальше
  try { await r.by.stop(); } catch (e) { log('audio', 'остановка чужой записи не вышла: ' + (e && e.message || e), 'e'); }
  return recBegin(who);
}

// Микрофон занят кем-то, кроме soft и самого who (запись или пассивный поток)
export function micBusy(who = '') {
  const by = recBy();
  if (by && by.who !== who) return true;
  for (const o of opens) if (!o.soft && o.who !== who) return true;
  return false;
}

// getUserMedia через хозяина. soft — слух маскота: уступает всем. Ошибки getUserMedia идут как есть;
// отказ из-за чужой записи — Error с reason 'busy' и by (кто пишет)
export async function micOpen(constraints, who, { soft = false, yieldFn = null } = {}) {
  const by = recBy();
  if (by && by.who !== who) {
    log('audio', 'микрофон не открыт для «' + who + '»: идёт запись «' + by.who + '»', 'w');
    window.dispatchEvent(new CustomEvent('melete:micbusy', { detail: { who, by: by.who, soft } }));
    throw Object.assign(new Error('busy'), { reason: 'busy', by: by.who });
  }
  if (!soft) for (const o of [...opens]) if (o.soft && o.who !== who) { try { o.yieldFn && o.yieldFn(); } catch { /* уступает */ } }
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const h = { who, soft, yieldFn };
  opens.add(h);
  const tracks = stream.getAudioTracks();
  let freed = false;
  const free = () => { if (freed || !tracks.every((x) => x.readyState === 'ended')) return; freed = true; opens.delete(h); emit(); };
  tracks.forEach((tr) => {
    const stop = tr.stop.bind(tr);
    tr.stop = () => { stop(); free(); };
    tr.addEventListener('ended', free);
  });
  if (!tracks.length) { opens.delete(h); }
  emit();
  return stream;
}
