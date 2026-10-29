// Оформление Elachiston — на токенах Melete (styles/tokens.css): темы светлая, тёмная, OLED и системная.
// Один шрифт (Onest) и один акцент — дизайн единый, без декоративных настроек (DECISIONS 2026-10-28).
import { accentVars } from '../core/palettes.js';
import { prefs } from './data.js';
import { isNative, Launcher } from './native.js';

export const THEMES = ['light', 'dark', 'oled'];
const ACCENT = 'orange';

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

export function applyLook(de = document.documentElement) {
  if (THEMES.includes(prefs.theme)) de.setAttribute('data-theme', prefs.theme);
  else de.removeAttribute('data-theme');
  Object.entries(accentVars({ palette: 'classic', accent: ACCENT }) || {}).forEach(([k, v]) => de.style.setProperty(k, v));
  // переход один — появление (панели и шторки проявляются на месте; панель за пальцем — часть жеста)
  de.dataset.motion = 'fade';
  // размеры: сначала авто по экрану (autoScale), поверх — ползунки «часы» и «остальное» (settings.js → «Вид»)
  const auto = autoScale();
  de.style.setProperty('--l-auto', String(auto));
  de.style.setProperty('--l-ck', String(auto * ((prefs.clockScale || 100) / 100)));
  const ui = (prefs.uiScale || 100) / 100;
  // крест: толщина и непрозрачность (настройки «Вид» → крест)
  de.style.setProperty('--l-cw', String((prefs.crossWeight || 100) / 100));
  de.style.setProperty('--l-co', String((prefs.crossOpacity || 100) / 100));
  de.style.setProperty('--l-dui', String(auto * ui * ((prefs.layout?.drawerScale || 100) / 100)));
  de.style.setProperty('--l-ui', String(auto * ui));
  // значки строки состояния Android: тёмные на светлом фоне, светлые на тёмном
  if (isNative()) {
    let bg = getComputedStyle(de).getPropertyValue('--bg').trim();
    if (/^#[0-9a-f]{3}$/i.test(bg)) bg = '#' + [...bg.slice(1)].map((c) => c + c).join(''); // #000 → #000000
    const m = bg.match(/^#([0-9a-f]{6})$/i);
    const lum = m ? (0.299 * parseInt(m[1].slice(0, 2), 16) + 0.587 * parseInt(m[1].slice(2, 4), 16) + 0.114 * parseInt(m[1].slice(4, 6), 16)) / 255 : 1;
    Launcher.setBars({ lightBg: lum > 0.5, bg: m ? bg : undefined }).catch(() => {});
  }
  // цвет полосы состояния — по фону
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(de).getPropertyValue('--bg').trim() || '#F3F2EE');
  themeFrames();
}

// Кошелёк и блокнот — отдельные страницы (iframe): тот же вид, что у главного — цвета темы, шрифты, акцент
const VARS = ['--bg', '--cell', '--ink', '--l2', '--l3', '--sep', '--fill', '--fill2', '--tint', '--tint-text', '--on-tint', '--red', '--font', '--l-display'];
export function themeDoc(doc) {
  const de = doc?.documentElement;
  if (!de) return;
  const cs = getComputedStyle(document.documentElement);
  VARS.forEach((v) => { const x = cs.getPropertyValue(v).trim(); if (x) de.style.setProperty(v, x); });
  de.style.setProperty('--serif', cs.getPropertyValue('--l-display').trim());
  const bg = cs.getPropertyValue('--bg').trim(), m = bg.match(/^#([0-9a-f]{6})$/i);
  const dark = m && (0.299 * parseInt(m[1].slice(0, 2), 16) + 0.587 * parseInt(m[1].slice(2, 4), 16) + 0.114 * parseInt(m[1].slice(4, 6), 16)) / 255 < 0.5;
  de.style.colorScheme = dark ? 'dark' : 'light';
  // шрифты: @font-face главного — в страницу один раз (адреса — от файла стилей, где они объявлены)
  if (!doc.getElementById('l-fonts') && doc.head) {
    const rules = [];
    for (const sh of document.styleSheets) {
      let list; try { list = sh.cssRules; } catch { continue; }
      for (const r of list) {
        if (r.type !== 5) continue; // CSSFontFaceRule
        rules.push(r.cssText.replace(/url\((['"]?)([^'")]+)\1\)/g, (all, q, u) => (/^(data|blob|https?):/.test(u) ? all : `url("${new URL(u, sh.href || location.href).href}")`)));
      }
    }
    const st = doc.createElement('style'); st.id = 'l-fonts'; st.textContent = rules.join('\n');
    doc.head.append(st);
  }
}
export function themeFrames() {
  document.querySelectorAll('iframe.l-money').forEach((f) => { try { themeDoc(f.contentDocument); } catch { /* ещё грузится */ } });
}
