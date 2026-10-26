// Ἐλάχιστον (Elachiston) — отдельное приложение главного экрана: свои данные в своём хранилище. С Melete связан
// только мостом (melete.js: чтение и практика из папки Melete), своих данных у Melete не трогает.
const KEY = 'elachiston.prefs';

export const DEFAULTS = {
  // оформление: тема — как в Melete (светлая, тёмная, «Бумага», OLED, системная), чёрно-белый вид, акцент, язык
  theme: 'system',      // system | light | dark | paper | oled
  font: 'onest',        // look.js: FONTS
  bw: false,            // чёрно-белый вид (без цвета)
  accent: 'orange',     // оттенок палитры Melete
  lang: '',             // '' — язык системы; ru | uz | en
  church: false,        // церковный режим: стихи, библейские часы, греческие слова и символы (решение автора: по умолчанию выкл)
  updMode: 'auto',      // обновление из GitHub: auto | button
  updMobile: false,     // скачивать обновление и по мобильной сети
  // главный экран
  clock: 'tablet',      // см. clocks.js
  hour12: false,
  hourLine: true,       // строка под часами: литургический час (церковный режим)
  dateLang: '',         // '' — язык интерфейса; ru | en | uz | el
  greekDay: true,       // греческое название дня (церковный режим)
  status: true,         // сеть и батарея
  subline: 'verse',     // verse (церковный режим) | note | none
  note: '',
  align: 'right',       // left | center | right
  size: 'm',            // s | m | l — прежний размер названий (больше не настраивается: см. uiScale)
  layout: null,         // layout.js: порядок, видимость, размер блоков, место значков и папок
  clockScale: 100,      // размер часов, % (60–140)
  uiScale: 100,         // размер остального на главном: дата, названия, Melete, плеер, значки, % (60–130)
  marker: 'auto',       // auto — αʹ в церковном режиме, иначе нет | greek | roman | count | none
  ornament: 'none',     // фоновый символ (церковный режим)
  wallpaper: 'none',    // живые обои: none | hands | planet | sun
  intro: true,
  dock: null,           // null — по умолчанию из ролей приложений (apps.js)
  dockStyle: 'icons',   // icons | line | none
  player: true,
  tracker: true,        // чтение и практика из Melete (когда мост подключён)
  place: null,          // { lat, lon } — восход и закат
  home: null,           // null — по умолчанию; [{ key, label }]
  gestures: {},         // id жеста → действие; пустые — по умолчанию
  usage: {},            // ключ приложения → сколько раз открывали с главного экрана
  verseOffset: 0,
  web: null,            // веб-версия: свои ссылки вместо приложений [{ id, name, url }]
};

const clone = (o) => JSON.parse(JSON.stringify(o));

export function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}
export function writeJSON(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* память недоступна — до перезапуска */ }
}

export const prefs = Object.assign(clone(DEFAULTS), readJSON(KEY) || {});
const subs = new Set();

export function save() {
  writeJSON(KEY, prefs);
  subs.forEach((fn) => fn());
}
export const setPrefs = (patch) => { Object.assign(prefs, patch); save(); };
export const onPrefs = (fn) => subs.add(fn);
export function resetPrefs() {
  const keep = { lang: prefs.lang, church: prefs.church, theme: prefs.theme }; // язык и вид — не сбрасываются вместе с экраном
  Object.keys(prefs).forEach((k) => delete prefs[k]);
  Object.assign(prefs, clone(DEFAULTS), keep);
  save();
}
export const isChurch = () => !!prefs.church;
