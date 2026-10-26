// Главный экран: восход и закат (упрощённый алгоритм NOAA) и библейское время суток (церковный режим).
// Библейский день начинается вечером: «и был вечер, и было утро: день один» (Быт 1:5).
// Днём — 12 «сезонных» часов от восхода до заката (Ин 11:9), ночью — три стражи (Суд 7:19).

const RAD = Math.PI / 180;

// Место: сохранённое пользователем или примерно по часовому поясу
export function placeOf(state) {
  if (state.place?.lat != null) return { ...state.place, approx: false };
  const lon = -new Date().getTimezoneOffset() / 4; // 15° на час
  return { lat: 50, lon, approx: true };
}

// Восход и закат для местной даты; null — полярный день или ночь
export function sunTimes(date, lat, lon) {
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
  const n = Math.round((Date.UTC(y, m, d) - Date.UTC(y, 0, 0)) / 864e5);
  const g = ((2 * Math.PI) / 365) * (n - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const cosH = Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(decl)) - Math.tan(lat * RAD) * Math.tan(decl);
  if (cosH > 1 || cosH < -1) return null;
  const ha = Math.acos(cosH) / RAD;
  const base = Date.UTC(y, m, d);
  return {
    rise: new Date(base + (720 - 4 * (lon + ha) - eq) * 60000),
    set: new Date(base + (720 - 4 * (lon - ha) - eq) * 60000),
  };
}

const fallback = (date) => ({
  rise: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 6),
  set: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18),
});

const shift = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);

// Ссылки — по языку: ru (Синодальный), en (псалмы — по еврейской нумерации), uz («Muqaddas Kitob», псалмы — как в
// Синодальном); az — глава на azbyka.ru. Тексты частей суток — в i18n.js (bib.*)
const ref = (ru, en, uz, az) => ({ ru, en, uz, az });

// Части дня — словами Писания
export const DAY_PARTS = [
  { from: 1, key: 'morning', ref: ref('Пс 5:4', 'Ps 5:3', 'Zabur 5:4', 'Ps.5:4') },
  { from: 4, key: 'heat', ref: ref('Быт 18:1', 'Gen 18:1', 'Ibtido 18:1', 'Gen.18:1') },
  { from: 7, key: 'decline', ref: ref('Суд 19:9', 'Judg 19:9', 'Hakamlar 19:9', 'Judg.19:9') },
  { from: 10, key: 'cool', ref: ref('Быт 3:8', 'Gen 3:8', 'Ibtido 3:8', 'Gen.3:8') },
];
export const WATCHES = [
  { key: 'w1', ref: ref('Плач 2:19', 'Lam 2:19', 'Marsiyalar 2:19', 'Lam.2:19') },
  { key: 'w2', ref: ref('Суд 7:19', 'Judg 7:19', 'Hakamlar 7:19', 'Judg.7:19') },
  { key: 'w3', ref: ref('Исх 14:24', 'Exod 14:24', 'Chiqish 14:24', 'Ex.14:24') },
];
// Часы молитвы: полдень (Пс 54:18) и вечерняя жертва (Дан 9:21)
export const PRAYER_HOURS = {
  6: { key: 'noon', ref: ref('Пс 54:18', 'Ps 55:17', 'Zabur 54:18', 'Ps.54:18') },
  9: { key: 'evening', ref: ref('Дан 9:21', 'Dan 9:21', 'Doniyor 9:21', 'Dan.9:21') },
};
export const BIB_REFS = {
  gen15: ref('Быт 1:5', 'Gen 1:5', 'Ibtido 1:5', 'Gen.1:5'),
  lev2332: ref('Лев 23:32', 'Lev 23:32', 'Levilar 23:32', 'Lev.23:32'),
  jn119: ref('Ин 11:9', 'John 11:9', 'Yuhanno 11:9', 'Jn.11:9'),
  mk1335: ref('Мк 13:35', 'Mark 13:35', 'Mark 13:35', 'Mk.13:35'),
};

// Сколько сейчас «библейского времени»
export function biblicalTime(now, place) {
  const today = sunTimes(now, place.lat, place.lon) || fallback(now);
  let night = null;
  if (now < today.rise) {
    const y = sunTimes(shift(now, -1), place.lat, place.lon) || fallback(shift(now, -1));
    night = { from: y.set, to: today.rise };
  } else if (now >= today.set) {
    const t = sunTimes(shift(now, 1), place.lat, place.lon) || fallback(shift(now, 1));
    night = { from: today.set, to: t.rise };
  }
  // после заката уже наступил следующий библейский день
  const dayDate = now >= today.set ? shift(now, 1) : now;
  const day = dayDate.getDay(); // 0 — день первый, 6 — суббота

  if (night) {
    const frac = (now - night.from) / (night.to - night.from);
    const i = Math.min(2, Math.floor(frac * 3));
    return { isDay: false, watch: i, frac, part: WATCHES[i], dayDate, day, rise: today.rise, set: today.set, span: night };
  }
  const frac = (now - today.rise) / (today.set - today.rise);
  const hour = Math.min(12, Math.floor(frac * 12) + 1);
  const part = [...DAY_PARTS].reverse().find((p) => hour >= p.from);
  return { isDay: true, hour, frac, part, prayer: PRAYER_HOURS[hour] || null, dayDate, day, rise: today.rise, set: today.set, span: { from: today.rise, to: today.set } };
}
