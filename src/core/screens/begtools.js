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
