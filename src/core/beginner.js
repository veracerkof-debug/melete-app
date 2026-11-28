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
    .then(([l, g]) => ({ PATHS: l.PATHS, S: (g.default && g.default.S) || g.S || {} }))
    .catch(() => null);
  CACHE = { code, p };
  return p;
}
