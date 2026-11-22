// Даты — строки «ГГГГ-ММ-ДД» по местному календарю устройства (у каждого партнёра свой часовой пояс).
const pad = (n) => String(n).padStart(2, '0');
export const dstr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseD = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); };
export const diffDays = (a, b) => Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / 864e5);
const ymd = (s) => { const [y, m, d] = s.split('-').map(Number); return [y, m - 1, d]; };
// начало недели: first = 0 (воскресенье) | 1 (понедельник)
export const weekStart = (s, first = 1) => { const d = parseD(s); d.setDate(d.getDate() - ((d.getDay() - first + 7) % 7)); return dstr(d); };
export const weekDays = (s, first = 1) => { const w = weekStart(s, first); return Array.from({ length: 7 }, (_, i) => addDays(w, i)); };
export const monthKey = (s) => s.slice(0, 7);
export const addMonths = (mk, n) => { const [y, m] = mk.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
export const monthGrid = (mk, first = 1) => { // дни месяца с пустыми ячейками в начале
  const [y, m] = mk.split('-').map(Number);
  const n = new Date(y, m, 0).getDate();
  const lead = (new Date(y, m - 1, 1).getDay() - first + 7) % 7;
  return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${mk}-${pad(i + 1)}`)];
};
// «через сколько дней» ближайшая годовщина (даты вида ГГГГ-ММ-ДД, повтор ежегодно); 0 — сегодня
export function nextAnnivIn(date, today) {
  const [, m, d] = date.split('-').map(Number);
  const [ty] = today.split('-').map(Number);
  for (const y of [ty, ty + 1]) {
    const c = `${y}-${pad(m)}-${pad(d)}`;
    const n = diffDays(today, c);
    if (n >= 0) return n;
  }
  return 365;
}
