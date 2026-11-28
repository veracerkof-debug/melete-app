// Главная новичка: следующий урок учебника и выбор времени занятия. Без DOM.
// Прогресс учебника лежит в app.device.book.done (его ведёт модуль «Учебник»); пути и названия уроков грузятся по требованию.
export const BEG_MINUTES = [10, 20, 30, 45];
export const BEG_DEFAULT = 20;
export const begMin = (st) => (BEG_MINUTES.includes(st.begMin) ? st.begMin : BEG_DEFAULT);

// Порядок для новичка: «Первые шаги», затем курс гитары (если в профиле есть гитарный инструмент)
const GUITARISH = ['guitar', 'egtr', 'uke', 'mando', 'banjo', 'bass'];
export function pathOrder(profile = {}) {
  const ins = profile.instruments || [];
  return ins.some((i) => GUITARISH.includes(i)) ? ['first', 'guitar'] : ['first'];
}

// { id, n, total, done } — первый непройденный урок по порядку; null — всё пройдено или путь не найден
export function nextLessonOf(PATHS, order, doneMap = {}) {
  for (const k of order) {
    const ids = PATHS[k] || [], id = ids.find((x) => !doneMap[x]);
    if (id) return { id, path: k, n: ids.indexOf(id) + 1, total: ids.length, done: ids.filter((x) => doneMap[x]).length };
  }
  return null;
}

// Название урока и путь — из учебника; тяжёлый модуль грузится один раз, при первом показе главной новичка
const LANGS = { ru: () => import('../modules/book/book/lang/ru/index.js'), uz: () => import('../modules/book/book/lang/uz/index.js'), en: () => import('../modules/book/book/lang/en/index.js') };
let CACHE = null;
export function loadBook(lang) {
  const code = LANGS[lang] ? lang : 'ru';
  if (CACHE && CACHE.code === code) return CACHE.p;
  const p = Promise.all([import('../modules/book/book/lessons.js'), LANGS[code]()])
    .then(([l, g]) => ({ PATHS: l.PATHS, lessonById: l.lessonById, S: (g.default && g.default.S) || g.S || {} }))
    .catch(() => null);
  CACHE = { code, p };
  return p;
}

/* ---------- занятие новичка (макеты «Н2 · Урок», «Н9 · Занятие», «Н10 · Итог», «Н11 · Неделя») ---------- */
// Прогресс учебника: ctx.store.all().book.done = app.device.book.book.done (раньше главная читала app.device.book.done — мимо)
export const bookDone = (app) => ((((app.device || {}).book || {}).book || {}).done) || {};
// Журнал уроков, пройденных кнопкой «Получилось» (учебник времени прохождения не хранит): { id: метка времени }
export const begLog = (app) => ((app.device.begLog ??= {}));
export const markLessonDone = (app, id, now = Date.now()) => {
  const b = ((app.device.book ??= {}).book ??= {});
  (b.done ??= {})[id] = 1;
  begLog(app)[id] = now;
  app.saveDevice();
};

// Включён ли вид новичка на занятии: уровень «Новичок», не «Только инструменты», не «Минимал», не компьютер
export const begUiOn = (st, desk = false) => ((st.profile || {}).level) === 'beginner' && !st.toolsOnly && st.uiStyle !== 'mono' && !desk;

// Запись в app.active: план занятия — время, урок, этап и счёт смен
export const makeBeg = (min, lesson = null) => ({ min, lesson: lesson || null, stage: lesson ? 'lesson' : 'play', step: 0, reps: 0, rounds: 0, done: [], over: false });
export const begLeft = (a, elapsedSec = 0) => Math.max(0, a.beg.min * 60 - elapsedSec); // осталось, с

// Какой список шагов у урока: гитара, пианино, бас — по инструменту профиля; у уроков курса гитары — всегда гитара
const INST_OF = { piano: 'p', keys: 'p', synth: 'p', guitar: 'g', egtr: 'g', uke: 'g', mando: 'g', banjo: 'g', bass: 'b' };
export function lessonInst(id, profile = {}) {
  if (/^g\d+$/.test(id)) return 'g';
  const x = (profile.instruments || []).map((i) => INST_OF[i]).find(Boolean);
  return x || 'p';
}
const plain = (s) => String(s).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
// Шаги урока из строк учебника: пункты списка lx.<id>.<инструмент>; нет списка — одна строка (lx.<id>.t); нет ничего — пусто
export function lessonSteps(S, id, inst) {
  const raw = S['lx.' + id + '.' + inst] || S['lx.' + id + '.t'] || '';
  const li = [...String(raw).matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => plain(m[1])).filter(Boolean);
  if (li.length) return li;
  const one = plain(raw);
  return one ? [one] : [];
}
// Аккорды урока (гитара): из проверок xchord — «Em Am Dm» → ['Em','Am','Dm']
export function lessonChords(def, inst = 'g') {
  const out = [];
  ((def && def.ex) || []).forEach((x) => {
    if (x.lab !== 'xchord' || !x.cfg || !x.cfg.ch) return;
    if (x.only && !x.only.includes(inst)) return;
    String(x.cfg.ch[inst] || '').split(/\s+/).filter(Boolean).forEach((c) => { if (!out.includes(c)) out.push(c); });
  });
  return out;
}
// Темп метронома в уроке (проверка xtool metro или xtap)
export function lessonBpm(def) {
  for (const x of (def && def.ex) || []) {
    if (x.lab === 'xtool' && x.cfg && x.cfg.tool === 'metro' && x.cfg.bpm) return x.cfg.bpm;
    if (x.lab === 'xtap' && x.cfg && x.cfg.bpm) return x.cfg.bpm;
  }
  return 0;
}
// Пара аккордов для смены (по кругу: 1–2, 2–3, …); меньше двух аккордов — null
export function drillPair(chords, i = 0) {
  const u = [...new Set(chords)];
  if (u.length < 2) return null;
  const k = ((i % (u.length - 1)) + (u.length - 1)) % (u.length - 1);
  return [u[k], u[k + 1]];
}
// Схема аккорда (гитара, 6 значений от низкой струны: null — глушить, 0 — открытая, n — лад) → SVG-строка; цвета — классами .bgcd-*
export function chordSVG(frets) {
  const W = 240, H = 150, L = 24, R = 216, T = 26, B = 142, N = 5, gx = (R - L) / 5, gy = (B - T) / N;
  const pressed = frets.filter((f) => f > 0), lo = pressed.length ? Math.min(...pressed) : 1, hi = pressed.length ? Math.max(...pressed) : 1;
  const base = hi > N ? lo : 1;
  let s = '<svg class="bgcd" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
  for (let i = 0; i <= N; i++) s += '<line class="bgcd-f' + (i === 0 && base === 1 ? ' nut' : '') + '" x1="' + L + '" x2="' + R + '" y1="' + (T + i * gy) + '" y2="' + (T + i * gy) + '"/>';
  for (let i = 0; i < 6; i++) s += '<line class="bgcd-s" x1="' + (L + i * gx) + '" x2="' + (L + i * gx) + '" y1="' + T + '" y2="' + B + '"/>';
  frets.forEach((f, i) => {
    const x = L + i * gx;
    if (f == null) s += '<text class="bgcd-m" x="' + x + '" y="' + (T - 9) + '" text-anchor="middle">×</text>';
    else if (f === 0) s += '<circle class="bgcd-o" cx="' + x + '" cy="' + (T - 12) + '" r="4.5"/>';
    else s += '<circle class="bgcd-d" cx="' + x + '" cy="' + (T + (f - base + 0.5) * gy) + '" r="9"/>';
  });
  if (base > 1) s += '<text class="bgcd-n" x="' + (R + 4) + '" y="' + (T + gy * 0.5 + 4) + '">' + base + '</text>';
  return s + '</svg>';
}
// Уроки, засчитанные кнопкой «Получилось» с момента from (для «Н11 · Неделя»)
export const lessonsSince = (log, from) => Object.entries(log || {}).filter(([, ts]) => ts >= from).map(([id]) => id);
