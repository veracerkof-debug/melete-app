// Витрина: данные инструментов для демонстрации (чистые функции без DOM — их проверяют тесты). Повторяемый случайный ряд:
// одна и та же «история» при каждой загрузке. Формат — тот, что пишут сами инструменты (см. модули и docs/tech/data.md).
import { DRILL_IDS, EIV, ECH, EDG, normalizeEarData } from '../../music/ear.js';
import { SCALES } from '../../music/theory.js';
import { lessonsOf, normalizeProg, recordLesson } from '../../music/course.js';
import { EAR_COURSE } from '../../modules/ear/course.js';
import { BEAT_COURSE } from '../../modules/beat/course.js';
import { CELLS, DRILLS as RHYTHM_DRILLS, normalizeData as normalizeBeat } from '../../music/rhythm.js';
import { addToDay, dayOf } from '../../music/vocalprog.js';

const DAY = 86400000;
export const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// «Прогресс уроков»: первые share уроков курса сданы на разные оценки в разные дни
function courseDemo(course, now, r, share) {
  const p = normalizeProg({}), L = lessonsOf(course), n = Math.round(L.length * share);
  L.slice(0, n).forEach((l, i) => { const k = n - i; recordLesson(p, l.id, clamp(0.78 + r() * 0.22, 0, 1), now - k * 1.7 * DAY); if (r() < 0.4) recordLesson(p, l.id, clamp(0.85 + r() * 0.15, 0, 1), now - k * 1.2 * DAY); });
  return p;
}

// Слух: статистика по вариантам (интервалы, аккорды, лады, ступени, ноты…), по дням за 80 дней, пройденная часть курса
export function earDemo(now = Date.now(), seed = 41) {
  const r = rng(seed), E = normalizeEarData({});
  for (let k = 0; k < 80; k++) {
    if (r() > 0.55) continue;
    const t = 12 + Math.floor(r() * 42), acc = clamp(0.6 + 0.27 * (1 - k / 80) + (r() - 0.5) * 0.12, 0.3, 0.97), d = dayOf(now - k * DAY);
    E.days[d] = { t, c: Math.round(t * acc) };
  }
  const fill = (sec, keys, hard = () => 0.5) => keys.forEach((key, i) => { const t = 14 + Math.floor(r() * 80), acc = clamp(0.95 - hard(key, i) * 0.45 + (r() - 0.5) * 0.1, 0.25, 0.98); E.stats[sec][String(key)] = { t, c: Math.round(t * acc) }; });
  fill('iv', EIV, (n) => (n === 6 || n === 10 || n === 11 ? 0.9 : n >= 8 ? 0.55 : 0.2));
  fill('ch', ECH.map((c) => c[0]), (id, i) => i / ECH.length);
  fill('sc', Object.keys(SCALES), (id, i) => i / 12);
  fill('dg', EDG.map((d) => d[0]), (id, i) => i / 14);
  fill('nt', Array.from({ length: 12 }, (_, i) => i), (id, i) => i / 14);
  ['dc', 'pt'].forEach((sec) => { if (!E.stats[sec]) E.stats[sec] = {}; E.stats[sec]['0'] = { t: 30, c: 24 }; E.stats[sec]['1'] = { t: 22, c: 15 }; });
  E.course = courseDemo(EAR_COURSE, now, r, 0.55);
  return E;
}

// Ритм: дни, ячейки, упражнения, смещение по долям (чуть опаздывает на сильной), пройденная часть курса
export function beatDemo(now = Date.now(), seed = 77) {
  const r = rng(seed), d = normalizeBeat({});
  for (let k = 0; k < 80; k++) {
    if (r() > 0.5) continue;
    const n = 2 + Math.floor(r() * 6), p = Math.round(n * clamp(0.5 + 0.3 * (1 - k / 80) + (r() - 0.5) * 0.2, 0.2, 1)), h = n * 8;
    d.days[dayOf(now - k * DAY)] = { n, p, s: Math.round(p * 82 + r() * 40), e: Math.round(h * (30 - 12 * (1 - k / 80) + r() * 6)), h };
  }
  Object.keys(CELLS).forEach((id, i, all) => { const t = 10 + Math.floor(r() * 60), acc = clamp(0.93 - 0.5 * (i / all.length) + (r() - 0.5) * 0.1, 0.2, 0.98); d.cells[id] = { t, c: Math.round(t * acc) }; });
  RHYTHM_DRILLS.forEach((id) => { const t = 12 + Math.floor(r() * 40); d.drills[id] = { t, c: Math.round(t * (0.55 + r() * 0.35)) }; });
  for (let i = 0; i < 4; i++) { const n = 40 + Math.floor(r() * 60); d.beat[i] = { n, s: Math.round(n * (i === 0 ? 6 : 14 + r() * 10) * (r() < 0.8 ? 1 : -1)) }; }
  d.course = courseDemo(BEAT_COURSE, now, r, 0.45);
  return d;
}

// Вокал: тип голоса, диапазон (рабочий и физический, растёт), история проверок и дневник пения за 80 дней
export function vocalDemo(now = Date.now(), seed = 13) {
  const r = rng(seed), d = { type: 'alto', range: { lo: 55, hi: 72, plo: 52, phi: 76, at: now - 6 * DAY }, hist: [], log: [] };
  d.hist.push({ lo: 57, hi: 69, plo: 54, phi: 72, at: now - 70 * DAY }, { lo: 56, hi: 71, plo: 53, phi: 74, at: now - 35 * DAY });
  for (let k = 80; k >= 0; k--) {
    if (r() > 0.5) continue;
    const prog = 1 - k / 80, sec = 300 + Math.floor(r() * 900), n = Math.round(sec * 4), ok = Math.round(n * clamp(0.5 + 0.3 * prog + (r() - 0.5) * 0.1, 0.2, 0.95));
    addToDay(d, { sec, n, ok, near: Math.round(n * 0.2), cs: Math.round((r() - 0.5) * 300), cn: Math.round(n * 0.3), hi: 69 + Math.round(prog * 3), lo: 55, up: r() < 0.3 ? 74 : 0, take: { k: r() < 0.7 ? 'ex' : 'im', id: 'hum', s: clamp(0.5 + 0.35 * prog, 0, 0.95) } }, now - k * DAY);
  }
  return d;
}
