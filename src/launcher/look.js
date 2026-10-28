// Оформление Elachiston — на токенах Melete (styles/tokens.css): темы светлая, тёмная, «Бумага», OLED и системная,
// акцент — оттенок классической палитры Melete; чёрно-белый вид — свои токены (launcher.css, data-bw).
import { accentVars } from '../core/palettes.js';
import { prefs } from './data.js';
import { isNative, Launcher } from './native.js';

const THEMES = ['light', 'dark', 'paper', 'oled'];
export const ACCENTS = ['orange', 'red', 'pink', 'purple', 'indigo', 'blue', 'teal', 'green', 'graphite'];
const KEYS = ['--tint', '--tint-text', '--on-tint', '--red'];

// Шрифты: display — часы и дата, text — названия приложений и текст (null — шрифт системы). church — только в церковном режиме
export const FONTS = [
  { id: 'onest', display: 'Onest Variable', text: null },
  { id: 'unbounded', display: 'L Unbounded', text: 'L Golos' },
  { id: 'geologica', display: 'L Geologica', text: 'L Geologica' },
  { id: 'golos', display: 'L Golos', text: 'L Golos' },
  { id: 'manrope', display: 'L Manrope', text: 'L Manrope' },
  { id: 'literata', display: 'L Literata', text: 'L Literata' },
  { id: 'oranienbaum', display: 'L Oranienbaum', text: 'L Literata' },
  { id: 'monomakh', display: 'L Monomakh', text: 'L Monomakh', church: true },
];
// Авто-размер по экрану: расчёт на телефон 390×820 (с учётом отступов системы); узкий или низкий экран — меньше,
// планшет — больше, но не сверх меры. Ползунки в настройках — поверх этого, относительно «как на телефоне»
export function autoScale() {
  const de = document.documentElement;
  const ins = (n) => parseFloat(getComputedStyle(de).getPropertyValue(n)) || 0;
  const w = innerWidth - ins('--l-sal') - ins('--l-sar');
  const h = innerHeight - ins('--l-sat') - ins('--l-sab');
  if (!w || !h) return 1;
  const s = Math.min(w / 390, h / 820);
  return Math.round(Math.max(0.78, Math.min(1.45, s)) * 100) / 100;
}

// переходы между экранами (cover.js, launcher.css: html[data-motion])
export const MOTIONS = ['slide', 'depth', 'fade', 'spring'];
export const fontsFor = (church) => FONTS.filter((f) => church || !f.church);
const SYS = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
export const fontStack = (name) => (name ? `"${name}", ${SYS}` : SYS);

export function applyLook(de = document.documentElement) {
  if (THEMES.includes(prefs.theme)) de.setAttribute('data-theme', prefs.theme);
  else de.removeAttribute('data-theme');
  if (prefs.bw) de.setAttribute('data-bw', ''); else de.removeAttribute('data-bw');
  KEYS.forEach((k) => de.style.removeProperty(k));
  const vars = prefs.bw ? null : accentVars({ palette: 'classic', accent: prefs.accent });
  if (vars) Object.entries(vars).forEach(([k, v]) => de.style.setProperty(k, v));
  const f = fontsFor(prefs.church).find((x) => x.id === prefs.font) || FONTS[0];
  de.style.setProperty('--l-display', fontStack(f.display));
  if (f.text) de.style.setProperty('--font', fontStack(f.text)); else de.style.removeProperty('--font');
  de.dataset.font = f.id;
  de.dataset.motion = MOTIONS.includes(prefs.motion) ? prefs.motion : 'slide';
  // размеры: сначала авто по экрану (autoScale), поверх — ползунки «часы» и «остальное» (settings.js → «Вид»)
  const auto = autoScale();
  de.style.setProperty('--l-auto', String(auto));
  de.style.setProperty('--l-ck', String(auto * ((prefs.clockScale || 100) / 100)));
  const ui = (prefs.uiScale || (prefs.size === 's' ? 85 : prefs.size === 'l' ? 115 : 100)) / 100;
  de.style.setProperty('--l-dui', String(auto * ui * ((prefs.layout?.drawerScale || 100) / 100)));
  de.style.setProperty('--l-ui', String(auto * ui));
  // значки строки состояния Android: тёмные на светлом фоне, светлые на тёмном
  if (isNative()) {
    const bg = getComputedStyle(de).getPropertyValue('--bg').trim();
    const m = bg.match(/^#([0-9a-f]{6})$/i);
    const lum = m ? (0.299 * parseInt(m[1].slice(0, 2), 16) + 0.587 * parseInt(m[1].slice(2, 4), 16) + 0.114 * parseInt(m[1].slice(4, 6), 16)) / 255 : 1;
    Launcher.setBars({ lightBg: lum > 0.5 }).catch(() => {});
  }
  // цвет полосы состояния — по фону
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(de).getPropertyValue('--bg').trim() || '#F3F2EE');
}
