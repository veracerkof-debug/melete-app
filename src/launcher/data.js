// Ἐλάχιστον (Elachiston) — отдельное приложение главного экрана: свои данные в своём хранилище. С Melete связан
// только мостом (melete.js: чтение и практика из папки Melete), своих данных у Melete не трогает.
const KEY = 'elachiston.prefs';

export const DEFAULTS = {
  // Минимальный главный экран (DECISIONS 2026-10-28): часы, дата, Melete, чтение, баланс, до 7 приложений и ряд значков.
  // Украшений и чисто декоративных настроек нет; крест — единственное украшение, только в церковном режиме.
  theme: 'system',      // system | light | dark | oled
  mono: true,           // чёрно-белый вид: без цвета акцента, кошелёк и блокнот — ч/б (решение автора 2026-10-29)
  lang: '',             // '' — язык системы; ru | uz | en
  church: false,        // церковный режим: крест и чтение Библии (решение автора: по умолчанию выкл)
  cross: 'classic',     // крест (церковный режим): classic | latin | greek | orthodox | circle | none (cross.js)
  crossSet: 1,          // крест уже выбран по-новому (2026-10-29: «Классический» стал обычным)
  crossWeight: 100,     // толщина линии креста, % (50–300)
  crossOpacity: 100,    // непрозрачность креста, % от обычной для его места (20–300; не больше полной)
  crossAt: 'center',    // где: center — крупно посередине, на пустом месте (вместо обоев) | top — вверху | date — у даты |
                        // bottom — над значками | back — большой и тихий за часами
  updMode: 'auto',      // обновление из GitHub: auto | button
  updMobile: false,     // скачивать обновление и по мобильной сети
  // главный экран
  hour12: false,
  status: true,         // своя строка «сеть и батарея» (системная строка состояния скрыта)
  align: 'right',       // left | center | right — одна ось; справа — под большой палец правой руки
  setTab: 'look',       // вкладка настроек: look | home | gestures | data
  layout: null,         // layout.js: порядок, видимость и размер блоков, место папок и поиска во «Всех приложениях»
  clockScale: 100,      // размер часов, % (60–140)
  uiScale: 100,         // размер остального на главном, % (60–130)
  dock: null,           // ряд значков внизу; null — по умолчанию из ролей приложений (apps.js)
  tracker: true,        // практика и чтение из Melete (когда мост подключён)
  home: null,           // список на главном (до 7, HOME_MAX); null — по умолчанию; [{ key, label }]
  gestures: {},         // id жеста → действие; пустые — по умолчанию
  usage: {},            // ключ приложения → сколько раз открывали с главного экрана
  foldTabs: 'side',     // папки во «Всех приложениях»: side — значками справа | top — вкладками сверху (листаются)
  drawerAll: true,      // вкладка «Все»; убрана — открываются папки, приложения вне папок находит поиск
  appIcons: false,      // родные значки у названий на главном и во «Всех приложениях» (Android; всегда ч/б)
  names: {},           // свои названия приложений (ключ → название): везде — на главном, во «Всех», в папках, в поиске
  hidden: [],           // скрытые приложения (ключи): их нет нигде — ни во «Всех», ни в поиске, ни на главном, ни в папках
  web: null,            // веб-версия: свои ссылки вместо приложений [{ id, name, url }]
};
export const HOME_MAX = 7; // приложений и папок на главном — строго не больше (решение автора)


const clone = (o) => JSON.parse(JSON.stringify(o));

export function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}
export function writeJSON(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* память недоступна — до перезапуска */ }
}

const saved = readJSON(KEY);
export const prefs = Object.assign(clone(DEFAULTS), saved || {});
// Переход на минимальный экран (v2): убранные настройки удаляются, раскладка — новая по умолчанию (приложения справа
// внизу), «Бумага» — светлая; приложения, значки, жесты, язык, церковный режим и обновление остаются
if (saved && saved.v !== 2) {
  Object.keys(prefs).forEach((k) => { if (!(k in DEFAULTS)) delete prefs[k]; });
  if (prefs.theme === 'paper') prefs.theme = 'light';
  Object.assign(prefs, { align: 'right', status: true, layout: null, setTab: 'look' });
  if (Array.isArray(prefs.home)) prefs.home = prefs.home.slice(0, HOME_MAX);
}
prefs.v = 2;
// 2026-10-29: обычный крест — «Классический»; кто не выбирал сам (стоял прежний обычный, тонкий) — переходит на него
if (saved && !('crossSet' in saved) && (saved.cross || 'latin') === 'latin') prefs.cross = 'classic';
if (saved && saved.v !== 2) writeJSON(KEY, prefs);
const subs = new Set();

export function save() {
  writeJSON(KEY, prefs);
  subs.forEach((fn) => fn());
}
export const setPrefs = (patch) => { Object.assign(prefs, patch); save(); };
export const onPrefs = (fn) => subs.add(fn);
export function resetPrefs() {
  const keep = { lang: prefs.lang, church: prefs.church, theme: prefs.theme, v: 2 }; // язык и вид — не сбрасываются вместе с экраном
  Object.keys(prefs).forEach((k) => delete prefs[k]);
  Object.assign(prefs, clone(DEFAULTS), keep);
  save();
}
export const isChurch = () => !!prefs.church;
