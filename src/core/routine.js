// План занятия (слово автора 13.11.2026): заготовка из пунктов — разминка, гаммы, пьеса; у каждого пункта минуты,
// по желанию инструмент, песня и темп. Планы — settings.routines, выбираются при начале свободного занятия или
// привязываются к занятию в расписании (slot.routine). В занятии — тонкая полоса «пункт 2 из 4, осталось 3:20»;
// время вышло — тихий знак и «Дальше», переход вручную. В запись занятия — разбивка по пунктам (rec.plan).
// Логика без DOM; экраны — screens/routine.js.
import { planOf, slotsOn, minOf } from './schedule.js';

let seq = 0;
const nid = (p) => p + Date.now().toString(36) + (seq++).toString(36);
const str = (v, n) => String(v || '').trim().slice(0, n);
const MAX_ITEMS = 20;

export function cleanItem(x) {
  if (!x) return null;
  const min = Math.max(1, Math.min(180, Math.round(+x.min || 0)));
  const it = { id: String(x.id || nid('i')), title: str(x.title, 60), min };
  if (x.tool) it.tool = String(x.tool);
  if (x.songId) it.songId = String(x.songId);
  const bpm = Math.round(+x.bpm || 0);
  if (bpm >= 20 && bpm <= 400) it.bpm = bpm;
  return it.title || it.tool || it.songId ? it : null;
}
export function cleanRoutine(r) {
  if (!r) return null;
  const items = (Array.isArray(r.items) ? r.items : []).map(cleanItem).filter(Boolean).slice(0, MAX_ITEMS);
  return items.length ? { id: String(r.id || nid('r')), title: str(r.title, 60), items } : null;
}
export const routinesOf = (st) => (Array.isArray(st.routines) ? st.routines.map(cleanRoutine).filter(Boolean) : []);
export const routineById = (st, id) => routinesOf(st).find((r) => r.id === id) || null;
export const totalMin = (r) => r.items.reduce((a, x) => a + x.min, 0);

export function saveRoutine(st, r) {
  const c = cleanRoutine(r);
  if (!c) return null;
  const list = routinesOf(st), i = list.findIndex((x) => x.id === c.id);
  if (i >= 0) list[i] = c; else list.push(c);
  st.routines = list;
  return c;
}
export function removeRoutine(st, id) { st.routines = routinesOf(st).filter((r) => r.id !== id); }

// Примеры — на языке интерфейса (t), чтобы было с чего начать
export const EXAMPLES = {
  guitar: [['warm', 5, 'metro', 60], ['scales', 10, 'metro', 80], ['piece', 15, 'notes', null]],
  vocal: [['breath', 3, null, null], ['warmup', 7, 'piano', null], ['song', 10, 'audio', null]],
};
export function example(kind, t) {
  return cleanRoutine({ title: t('rt.ex.' + kind), items: EXAMPLES[kind].map(([k, min, tool, bpm]) => ({ title: t('rt.it.' + k), min, tool, bpm })) });
}

// Занятие по плану: что хранится в app.active.routine. sec — секунды занятия (elapsed)
export const startRun = (r, sec = 0) => ({ id: r.id, title: r.title, items: r.items, i: 0, at: sec, log: r.items.map(() => 0) });
export const itemLeft = (run, sec) => run.items[run.i].min * 60 - (run.log[run.i] + Math.max(0, sec - run.at));
// Перейти к пункту j (по умолчанию следующий); время текущего пункта засчитывается ему
export function goTo(run, sec, j = run.i + 1) {
  if (j < 0 || j >= run.items.length || j === run.i) return false;
  run.log[run.i] += Math.max(0, sec - run.at);
  run.i = j; run.at = sec;
  return true;
}
// Разбивка в запись занятия
export function runRecord(run, sec) {
  if (!run) return null;
  const log = run.log.slice();
  log[run.i] += Math.max(0, sec - run.at);
  return { id: run.id, title: run.title, items: run.items.map((x, i) => ({ title: x.title, min: x.min, sec: Math.round(log[i]) })) };
}

// План занятия, привязанный к расписанию: занятие сейчас идёт (или начнётся в ближайшие 30 минут) → id плана | null
export function slotRoutine(st, now = Date.now()) {
  if (!st.plan) return null;
  const d = new Date(now), m = d.getHours() * 60 + d.getMinutes(), p = planOf(st);
  const s = slotsOn(p, now).find((x) => x.routine && m >= minOf(x.from) - 30 && m < minOf(x.to));
  return s && routineById(st, s.routine) ? s.routine : null;
}
