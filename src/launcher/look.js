// Оформление Elachiston — на токенах Melete (styles/tokens.css): темы светлая, тёмная, «Бумага», OLED и системная,
// акцент — оттенок классической палитры Melete; чёрно-белый вид — свои токены (launcher.css, data-bw).
import { accentVars } from '../core/palettes.js';
import { prefs } from './data.js';

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
  // размеры: часы отдельно, остальное отдельно (settings.js → «Размер»)
  de.style.setProperty('--l-ck', String((prefs.clockScale || 100) / 100));
  const ui = (prefs.uiScale || (prefs.size === 's' ? 85 : prefs.size === 'l' ? 115 : 100)) / 100;
  de.style.setProperty('--l-dui', String(ui * ((prefs.layout?.drawerScale || 100) / 100)));
  de.style.setProperty('--l-ui', String((prefs.uiScale || (prefs.size === 's' ? 85 : prefs.size === 'l' ? 115 : 100)) / 100));
  // цвет полосы состояния — по фону
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(de).getPropertyValue('--bg').trim() || '#F3F2EE');
}
