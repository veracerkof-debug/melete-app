// Прогресс вокала по дням (слово автора 14.11.2026, DECISIONS «Вокал: прогресс и «Петь»»): чистота, как высоко и низко
// забрался, вылазки за рабочий диапазон, время пения, счёт распевок и песен. Запись дня — в settings.vocal.log (попадает
// в копию и синхронизацию), одна на день: всё спетое за день складывается. Чистые функции без DOM
// (tests/vocalprog.test.js); пишут «Вокал» (распевки, импровизация) и медиатека (режим «Петь») через ctx.ctxOf('vocal').
//
// День: { d: 'YYYY-MM-DD', sec — секунд пения, n — оценённых нот (кадров «Петь» — по 0,25 с), ok — чисто, near — рядом,
// cs/cn — сумма и число уходов в центах (знак: + выше), hi/lo — выше и ниже всего удержанное ровно (MIDI),
// up — самая высокая нота, спетая чисто выше рабочего верха, dn — самая низкая чисто ниже рабочего низа,
// takes — [{ k: 'ex' | 'im' | 'song', id, s — счёт, at }] (последние 40) }

const KEEP_DAYS = 400;

export const dayOf = (ts = Date.now()) => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

function dayRec(log, d) {
  let r = log.find((x) => x.d === d);
  if (!r) { r = { d, sec: 0, n: 0, ok: 0, near: 0, cs: 0, cn: 0, hi: 0, lo: 0, up: 0, dn: 0, takes: [] }; log.push(r); log.sort((a, b) => (a.d < b.d ? -1 : 1)); }
  return r;
}

// Добавить к дню: patch — { sec, n, ok, near, cs, cn, hi, lo, up, dn, take: { k, id, s } }; лишние старые дни отрезаются
export function addToDay(data, patch, now = Date.now()) {
  if (!Array.isArray(data.log)) data.log = [];
  const r = dayRec(data.log, dayOf(now));
  ['sec', 'n', 'ok', 'near', 'cs', 'cn'].forEach((k) => { if (patch[k]) r[k] = Math.round((r[k] + patch[k]) * 10) / 10; });
  if (patch.hi) r.hi = Math.max(r.hi || 0, patch.hi);
  if (patch.lo) r.lo = r.lo ? Math.min(r.lo, patch.lo) : patch.lo;
  if (patch.up) r.up = Math.max(r.up || 0, patch.up);
  if (patch.dn) r.dn = r.dn ? Math.min(r.dn, patch.dn) : patch.dn;
  if (patch.take) { r.takes.push({ ...patch.take, at: now }); if (r.takes.length > 40) r.takes.splice(0, r.takes.length - 40); }
  if (data.log.length > KEEP_DAYS) data.log.splice(0, data.log.length - KEEP_DAYS);
  return r;
}

// Чистота дня (0…1): точно — 1, рядом — 0,5; оценённых нот нет — null
export const purity = (r) => (r && r.n ? (r.ok + r.near * 0.5) / r.n : null);
export const drift = (r) => (r && r.cn ? Math.round(r.cs / r.cn) : 0);

// Итог недели (с понедельника): минуты пения, чистота, выше и ниже всего, счёт лучших дублей
export function weekSummary(log, now = Date.now()) {
  const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const from = dayOf(d.getTime()), days = (log || []).filter((r) => r.d >= from && r.d <= dayOf(now));
  if (!days.length) return null;
  const sum = (k) => days.reduce((a, r) => a + (r[k] || 0), 0), n = sum('n');
  const his = days.map((r) => r.hi).filter(Boolean), los = days.map((r) => r.lo).filter(Boolean);
  return { days: days.length, sec: sum('sec'), min: Math.round(sum('sec') / 60), purity: n ? (sum('ok') + sum('near') * 0.5) / n : null, hi: his.length ? Math.max(...his) : 0, lo: los.length ? Math.min(...los) : 0,
    drift: sum('cn') ? Math.round(sum('cs') / sum('cn')) : 0, takes: days.reduce((a, r) => a + r.takes.length, 0) };
}

// Предложение расширить рабочий диапазон: три последних дня с пением (за 21 день) — в каждом чисто взята нота выше
// рабочего верха (или ниже низа). Новый край — самый осторожный из трёх, не дальше физического; уже отклонённый
// край (skip) не предлагается снова. → { edge: 'hi' | 'lo', m } или null
export function suggestExpand(log, range, { skip = {}, now = Date.now(), need = 3 } = {}) {
  if (!range || !Array.isArray(log)) return null;
  const since = dayOf(now - 21 * 86400000), days = log.filter((r) => r.d >= since && r.n > 0).slice(-need);
  if (days.length < need) return null;
  if (days.every((r) => r.up > range.hi)) {
    const m = Math.min(Math.min(...days.map((r) => r.up)), range.phi ?? 127);
    if (m > range.hi && skip.hi !== m) return { edge: 'hi', m };
  }
  if (days.every((r) => r.dn && r.dn < range.lo)) {
    const m = Math.max(Math.max(...days.map((r) => r.dn)), range.plo ?? 0);
    if (m < range.lo && skip.lo !== m) return { edge: 'lo', m };
  }
  return null;
}
