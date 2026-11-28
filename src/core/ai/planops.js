// Расписание занятий для нейросети (слово автора 28.11.2026: «поставь репетиции по пятницам…» — нейросеть должна уметь всё в приложении).
// Чтение: блоки расписания. Правка — предложением (блок ```melete-plan), применяет человек; перед применением — копия, после — «Отменить».
// Только блоки расписания: добавить, изменить, убрать, перерыв. Занятия задним числом и данные песен здесь не меняются. Без DOM и сети.
import { planOf, savePlan, addSlot, editSlot, removeSlot, addOff, removeOff, scaleWeek, weekMin, minOf, hmOf, durOf, dateKey } from '../schedule.js';

export const PLAN_MAX = { ops: 30 };
const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const okHM = (v) => typeof v === 'string' && /^\d{1,2}:\d\d$/.test(v.trim());
const hm = (v) => { const [h, m] = v.trim().split(':').map(Number); return h >= 0 && h < 24 && m >= 0 && m < 60 ? String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') : null; };
const okDate = (v) => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v);
const dayList = (v) => [...new Set((Array.isArray(v) ? v : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);

// Правка от модели → очищенная или null. days: 0 — понедельник … 6 — воскресенье; date: «ГГГГ-ММ-ДД» — только этот день
export function cleanPlanOp(o) {
  if (!o || typeof o !== 'object') return null;
  if (o.op === 'add') {
    const from = okHM(o.from) && hm(o.from), to = okHM(o.to) && hm(o.to);
    if (!from || !to || minOf(to) <= minOf(from)) return null;
    const f = { op: 'add', from, to, title: str(o.title, 60) };
    if (okDate(o.date)) f.date = o.date; else { f.days = dayList(o.days); if (!f.days.length) return null; }
    if (typeof o.song === 'string' && o.song) f.song = o.song.slice(0, 60);
    return f;
  }
  if (o.op === 'edit') {
    if (typeof o.ref !== 'string' || !o.ref) return null;
    const f = { op: 'edit', ref: o.ref };
    if (okHM(o.from) && hm(o.from)) f.from = hm(o.from);
    if (okHM(o.to) && hm(o.to)) f.to = hm(o.to);
    if (o.title != null) f.title = str(o.title, 60);
    if (o.days != null) { const d = dayList(o.days); if (d.length) f.days = d; }
    return Object.keys(f).length > 2 ? f : null;
  }
  if (o.op === 'goal') { // недельная норма: часы или минуты; блоки растягиваются поровну
    const m = o.minutes != null ? +o.minutes : o.hours != null ? +o.hours * 60 : NaN;
    return Number.isFinite(m) && m >= 30 && m <= 3000 ? { op: 'goal', minutes: Math.round(m) } : null;
  }
  if (o.op === 'remove') return typeof o.ref === 'string' && o.ref ? { op: 'remove', ref: o.ref } : null;
  if (o.op === 'off') { // перерыв (отпуск, болезнь): даты включительно
    if (!okDate(o.from) || !okDate(o.to)) return null;
    return { op: 'off', from: o.from, to: o.to, title: str(o.title, 60) };
  }
  return null;
}

const when = (s) => (s.days ? s.days.map((d) => DAYS[d]).join(', ') : s.date) + ' ' + s.from + '–' + s.to;
// Строки для карточки
export function describePlan(ops, st) {
  const p = planOf(st);
  return ops.map((o) => {
    if (o.op === 'add') return '+ ' + when(o) + (o.title ? ' · ' + o.title : '');
    if (o.op === 'goal') return '⏱ норма недели → ' + Math.round(o.minutes / 6) / 10 + ' ч';
    if (o.op === 'off') return '⏸ перерыв ' + o.from + ' — ' + o.to + (o.title ? ' · ' + o.title : '');
    const s = p.slots.find((q) => q.id === o.ref);
    if (o.op === 'remove') return '✕ ' + (s ? when(s) + (s.title ? ' · ' + s.title : '') : '? ' + o.ref);
    return '↻ ' + (s ? when(s) : '? ' + o.ref) + ' → ' + [o.days ? o.days.map((d) => DAYS[d]).join(', ') : '', o.from || o.to ? (o.from || '…') + '–' + (o.to || '…') : '', o.title != null ? o.title : ''].filter(Boolean).join(' ');
  });
}

const snapOf = (st) => JSON.parse(JSON.stringify({ plan: st.plan || null, days: st.days, remind: st.remind || null, goalMin: st.goalMin }));
// Применить → { n, prev } (prev — для «Отменить»)
export function applyPlanOps(st, ops, songs = []) {
  const prev = snapOf(st), p = planOf(st); let n = 0;
  for (const o of ops) {
    if (o.op === 'add') {
      const slot = { from: o.from, to: o.to, title: o.title, days: o.days };
      if (o.song && songs.some((s) => s.id === o.song && !s.deleted)) slot.songId = o.song;
      if (o.date) { const d = new Date(o.date + 'T00:00:00').getTime(); addSlot(p, slot, { d, once: true }); } else addSlot(p, slot);
      n++;
    } else if (o.op === 'edit') {
      if (!p.slots.some((s) => s.id === o.ref)) continue;
      const patch = {}; for (const k of ['from', 'to', 'title', 'days']) if (o[k] != null) patch[k] = o[k];
      editSlot(p, o.ref, patch); n++;
    } else if (o.op === 'remove') {
      if (!p.slots.some((s) => s.id === o.ref)) continue;
      removeSlot(p, o.ref); n++;
    } else if (o.op === 'off') { addOff(p, o.from, o.to, o.title); n++; }
    else if (o.op === 'goal') { if (!p.slots.length) continue; scaleWeek(p, o.minutes); n++; }
  }
  if (!n) return { n: 0, prev };
  savePlan(st, p);
  return { n, prev };
}
export function undoPlanOps(st, prev) {
  if (!prev) return false;
  if (prev.plan) st.plan = prev.plan; else delete st.plan;
  st.days = prev.days; if (prev.remind) st.remind = prev.remind; else delete st.remind;
  if (prev.goalMin === undefined) delete st.goalMin; else st.goalMin = prev.goalMin;
  return true;
}

// Данные для модели: повторяющиеся блоки (с id), правки на дату, перерывы. Дни: 0 — понедельник … 6 — воскресенье
export function planContext(st, now = Date.now()) {
  const p = planOf(st), k = dateKey(now);
  const lines = p.slots.map((s) => [s.id, s.days.map((d) => DAYS[d]).join(','), s.from + '–' + s.to, durOf(s) + ' мин', s.title || ''].join(' | '));
  const once = Object.entries(p.once).filter(([d]) => d >= k).sort().slice(0, 20).map(([d, l]) => d + ': ' + (l.map((s) => s.from + '–' + s.to + (s.title ? ' ' + s.title : '')).join(', ') || 'свободно'));
  const off = p.off.filter((o) => o.to >= k).map((o) => o.from + ' — ' + o.to + (o.title ? ' (' + o.title + ')' : ''));
  return 'НЕДЕЛЬНАЯ НОРМА: ' + Math.round(weekMin(p) / 6) / 10 + ' ч (' + weekMin(p) + ' мин) — это сумма блоков ниже; менять её можно правкой «goal».\nРАСПИСАНИЕ ЗАНЯТИЙ (повторяющиеся блоки). Строка: id | дни | время | длительность | название\n' + (lines.join('\n') || 'пусто') +
    (once.length ? '\nПравки на отдельные даты:\n' + once.join('\n') : '') + (off.length ? '\nПерерывы: ' + off.join('; ') : '');
}

export const PLAN_PROMPT = [
  '7) Расписание занятий (данные «РАСПИСАНИЕ»): блок ```melete-plan с массивом правок. Дни — числа: 0 пн, 1 вт, 2 ср, 3 чт, 4 пт, 5 сб, 6 вс.',
  '{"op":"add","days":[4],"from":"17:00","to":"18:00","title":"Репетиция"} — новый повторяющийся блок; вместо days можно "date":"ГГГГ-ММ-ДД" — один день; "song":"<id песни>" — необязательно.',
  '{"op":"edit","ref":"<id блока>","from":"…","to":"…","days":[…],"title":"…"} — изменить блок; {"op":"remove","ref":"<id блока>"} — убрать; {"op":"off","from":"ГГГГ-ММ-ДД","to":"ГГГГ-ММ-ДД","title":"отпуск"} — перерыв.',
  '{"op":"goal","hours":12} — недельная норма часами: все повторяющиеся блоки растянутся или сожмутся поровну (норма и есть сумма блоков).',
  'Время «ЧЧ:ММ», 24 часа, конец позже начала. Одно предложение — один блок; сначала коротко скажи, что поставишь. Не обещай, что уже сделано: применяет человек.',
].join('\n');
