// Плитки новичка: общие для главной и вкладки «Инструменты» (макеты «Н1» и «Н3»)
import { t } from '../../i18n/index.js';
import { esc } from '../../ui/index.js';
import { isOn } from '../settings.js';
import { moduleById } from '../../modules/index.js';
import { moduleName } from '../modules.js';

export const BEG_TOOLS = ['metro', 'tuner', 'notes', 'voice', 'book']; // всё, что доступно новичку

export const begTile = (st, id) => {
  const m = moduleById(id);
  if (!m || !isOn(st, id)) return '';
  return '<button class="bgt" data-open-tool="' + id + '" style="--c:' + (m.color || 'var(--tint)') + '"><span class="bgi" aria-hidden="true">' + m.icon + '</span><b>' + esc(moduleName(m)) + '</b></button>';
};

// Вкладка «Инструменты» новичка: пять плиток и подсказка, где открыть остальное
export function toolsBeginnerHTML(st) {
  return '<h1 class="vh">' + t('tools.title') + '</h1><div class="bghome"><div class="bggrid">' + BEG_TOOLS.map((id) => begTile(st, id)).join('') + '</div>' +
    '<button class="bgmore" data-pp="feat">' + esc(t('beg.hidden')) + '</button></div>';
}

// Нижняя панель новичка (макет «Н1»): Сегодня, Учебник, Играть, Инструменты, Ещё. «Играть» — свободное занятие, «Учебник» — урок,
// «Ещё» — настройки. Только на телефоне (на компьютере — верхняя навигация), не в «Минимале» и не в «Только инструменты»
export const begBarOn = (st) => ((st.profile || {}).level) === 'beginner' && !st.toolsOnly && st.uiStyle !== 'mono' && !document.documentElement.classList.contains('desk');
const SV = (p) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>';
const ICONS = {
  home: SV('<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  book: SV('<path d="M5 5h6a3 3 0 013 3v11a2 2 0 00-2-2H5zM19 5h-5"/>'),
  tools: SV('<path d="M5 4v16M12 4v16M19 4v16"/><circle cx="5" cy="14" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="19" cy="16" r="2"/>'),
  more: SV('<circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/>'),
  go: SV('<path d="M9 6l9 6-9 6z"/>'),
};
export function begBarHTML(cur) {
  const btn = (k, attr, label, on) => '<button class="tab bgtab' + (on ? ' on' : '') + '" ' + attr + (on ? ' aria-current="page"' : '') + ' aria-label="' + esc(label) + '">' + ICONS[k] + '<span class="tl">' + esc(label) + '</span></button>';
  return btn('home', 'data-tab="home"', t('beg.tabToday'), cur === 'home') + btn('book', 'data-act="study" data-k="book"', t('beg.tabBook'), false) +
    '<button class="tab bgtab bggo" data-act="free" aria-label="' + esc(t('beg.tabPlay')) + '"><span class="bgpl">' + ICONS.go + '</span><span class="tl">' + esc(t('beg.tabPlay')) + '</span></button>' +
    btn('tools', 'data-tab="tools"', t('beg.tabTools'), cur === 'tools') + btn('more', 'data-act="panel"', t('beg.tabMore'), false);
}
