// Расписание занятий (слово автора 11.11.2026: «вид недели — как в Google Календаре; дни и время — в одном месте»).
// Занятие — блок от–до (окно: напоминание — к началу), повтор по дням недели, несколько в день. Перерывы по датам
// (отпуск, гастроли — без занятий), правка «только этот день» (свой набор блоков на дату). Логика без DOM; экран —
// screens/plan.js на странице «Неделя». settings.plan = { slots: [{ id, days: [0..6], from, to, title }],
// off: [{ id, from: 'YYYY-MM-DD', to, title }], once: { 'YYYY-MM-DD': [{ id, from, to, title }] } }. У занятия могут быть
// routine — план занятия и tool — инструмент (вокал, ритм…: свои занятия и напоминания, хоть каждый день).
// Прежние поля — settings.days (дни практики), remind.time и remind.dayTimes (время), goalMin (цель недели) — расписание
// заполняет само (legacyOf): напоминания, главная, статистика и маскот читают их, как раньше.
import { weekday } from './time.js';

const DAY = 86400000;
export const STEP = 15; // минуты: сетка ведения пальцем
export const minOf = (s) => { const [h, m] = String(s || '0:0').split(':').map((x) => +x || 0); return h * 60 + m; };
export const hmOf = (min) => { min = Math.max(0, Math.min(24 * 60 - STEP, Math.round(min))); return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); };
export const snap = (min) => Math.round(min / STEP) * STEP;
export const dateKey = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
export const durOf = (s) => Math.max(0, minOf(s.to) - minOf(s.from));
let seq = 0;
export const newId = () => 'p' + Date.now().toString(36) + (seq++).toString(36);

const okHM = (v) => /^\d\d:\d\d$/.test(v);
const cleanSlot = (s, withDays) => {
  if (!s || !okHM(s.from) || !okHM(s.to) || minOf(s.to) <= minOf(s.from)) return null;
  const x = { id: String(s.id || newId()), from: s.from, to: s.to, title: String(s.title || '').slice(0, 60) };
  if (s.routine) x.routine = String(s.routine); // план занятия (routine.js)
  if (s.tool && /^[a-z][a-z0-9-]*$/.test(s.tool)) x.tool = String(s.tool); // занятие инструмента (вокал, ритм…) — напоминание называет его (DECISIONS «Вокал»)
  if (withDays) { x.days = [...new Set((s.days || []).map(Number).filter((d) => d >= 0 && d <= 6))].sort(); if (!x.days.length) return null; }
  return x;
};
const okDate = (v) => /^\d{4}-\d\d-\d\d$/.test(v);

// Расписание из настроек; нет — из прежних полей: дни практики и время (общее и своё по дням), длительность — цель
// недели поровну на дни (не меньше 30 мин, кратно 15)
export function planOf(st) {
  const p = st.plan && typeof st.plan === 'object' ? st.plan : null;
  if (p) {
    return {
      slots: (Array.isArray(p.slots) ? p.slots : []).map((s) => cleanSlot(s, true)).filter(Boolean),
      off: (Array.isArray(p.off) ? p.off : []).filter((o) => o && okDate(o.from) && okDate(o.to) && o.to >= o.from).map((o) => ({ id: String(o.id || newId()), from: o.from, to: o.to, title: String(o.title || '').slice(0, 60) })),
      once: Object.fromEntries(Object.entries(p.once && typeof p.once === 'object' ? p.once : {}).filter(([k, v]) => okDate(k) && Array.isArray(v)).map(([k, v]) => [k, v.map((s) => cleanSlot(s, false)).filter(Boolean)])),
    };
  }
  const days = Array.isArray(st.days) ? st.days : [], r = st.remind || {}, time = okHM(r.time) ? r.time : '19:00', dt = r.dayTimes || {};
  const n = Math.max(1, days.filter(Boolean).length), len = Math.max(30, snap(((+st.goalMin || 0) / n)) || 60);
  const byTime = {};
  for (let i = 0; i < 7; i++) if (days[i]) { const tm = okHM(dt[i]) ? dt[i] : time; (byTime[tm] ||= []).push(i); }
  const slots = Object.entries(byTime).map(([from, ds]) => ({ id: newId(), days: ds, from, to: hmOf(Math.min(minOf(from) + len, 24 * 60 - STEP)), title: '' })).filter((s) => minOf(s.to) > minOf(s.from));
  return { slots, off: [], once: {} };
}

// Перерыв на эту дату (полночь d) → перерыв или null
export const offOn = (p, d) => { const k = dateKey(d); return p.off.find((o) => k >= o.from && k <= o.to) || null; };
// Блоки дня d (полночь): перерыв — нет; правка «только этот день» — её; иначе — повторяющиеся этого дня недели.
// → [{ id, from, to, title, once? , rid? }] по времени начала
export function slotsOn(p, d) {
  if (offOn(p, d)) return [];
  const k = dateKey(d);
  const list = p.once[k] ? p.once[k].map((s) => ({ ...s, once: true })) : p.slots.filter((s) => s.days.includes(weekday(d))).map((s) => ({ ...s, rid: s.id }));
  return list.sort((a, b) => minOf(a.from) - minOf(b.from));
}

// Прежние поля из расписания: дни практики, время (самое частое начало) и своё время дня (первое занятие дня), цель недели
export function legacyOf(p) {
  const days = [0, 0, 0, 0, 0, 0, 0], first = {}, cnt = {};
  let total = 0;
  p.slots.forEach((s) => s.days.forEach((d) => {
    days[d] = 1; total += durOf(s);
    if (!first[d] || minOf(s.from) < minOf(first[d])) first[d] = s.from;
  }));
  Object.values(first).forEach((tm) => { cnt[tm] = (cnt[tm] || 0) + 1; });
  const time = Object.entries(cnt).sort((a, b) => b[1] - a[1] || minOf(a[0]) - minOf(b[0]))[0]?.[0] || '19:00';
  const dayTimes = Object.fromEntries(Object.entries(first).filter(([, tm]) => tm !== time));
  return { days, time, dayTimes, goalMin: total };
}

// Сохранить расписание в настройки и обновить прежние поля
export function savePlan(st, p) {
  st.plan = { slots: p.slots, off: p.off, once: p.once };
  const L = legacyOf(p);
  st.days = L.days;
  st.remind = { ...(st.remind || {}), time: L.time, dayTimes: L.dayTimes };
  if (L.goalMin > 0) st.goalMin = L.goalMin;
  return p;
}

// Правки. mode: 'all' — повторяющийся блок целиком; 'day' — только дата (свой набор блоков на этот день)
const dayCopy = (p, d) => slotsOn(p, d).map(({ id, from, to, title, routine }) => ({ id: id + '-' + dateKey(d), from, to, title, routine }));
export function addSlot(p, slot, { d = null, once = false } = {}) {
  if (once && d != null) { const k = dateKey(d); const cur = p.once[k] || dayCopy(p, d); p.once[k] = [...cur, cleanSlot({ ...slot, id: newId() }, false)].filter(Boolean); return p; }
  const s = cleanSlot({ ...slot, id: newId() }, true);
  if (s) p.slots.push(s);
  return p;
}
// Изменить блок id (from, to, title, days): повторяющийся — во всех днях или только в дате d
export function editSlot(p, id, patch, { d = null, mode = 'all' } = {}) {
  const k = d != null ? dateKey(d) : null;
  if (k && p.once[k]) { p.once[k] = p.once[k].map((s) => (s.id === id || id === s.id.replace('-' + k, '') ? cleanSlot({ ...s, ...patch }, false) || s : s)); return p; }
  if (mode === 'day' && d != null) {
    const base = p.slots.find((s) => s.id === id);
    p.once[k] = dayCopy(p, d).map((s) => (s.id === id + '-' + k ? cleanSlot({ ...s, ...patch, days: undefined }, false) || s : s));
    if (base && patch.days && !patch.days.includes(weekday(d))) p.once[k] = p.once[k].filter((s) => s.id !== id + '-' + k);
    return p;
  }
  p.slots = p.slots.map((s) => (s.id === id ? cleanSlot({ ...s, ...patch }, true) || s : s));
  return p;
}
export function removeSlot(p, id, { d = null, mode = 'all' } = {}) {
  const k = d != null ? dateKey(d) : null;
  if (k && p.once[k]) { p.once[k] = p.once[k].filter((s) => s.id !== id && s.id !== id + '-' + k); return p; }
  if (mode === 'day' && d != null) { p.once[k] = dayCopy(p, d).filter((s) => s.id !== id + '-' + k); return p; }
  p.slots = p.slots.filter((s) => s.id !== id);
  return p;
}
// Вернуть дню обычное расписание
export function resetDay(p, d) { delete p.once[dateKey(d)]; return p; }
export function addOff(p, from, to, title = '') { if (okDate(from) && okDate(to)) p.off.push({ id: newId(), from: from <= to ? from : to, to: from <= to ? to : from, title }); return p; }
export function removeOff(p, id) { p.off = p.off.filter((o) => o.id !== id); return p; }
// Убрать прошедшее: правки дней и перерывы, которые уже кончились (раньше, чем now − 2 дня)
export function prune(p, now = Date.now()) {
  const k = dateKey(now - 2 * DAY);
  Object.keys(p.once).forEach((x) => { if (x < k) delete p.once[x]; });
  p.off = p.off.filter((o) => o.to >= k);
  return p;
}
// Минут в неделю по обычному расписанию
export const weekMin = (p) => p.slots.reduce((a, s) => a + durOf(s) * s.days.length, 0);
