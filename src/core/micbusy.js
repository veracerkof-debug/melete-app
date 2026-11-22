// Микрофон занят записью (слово автора 22.11.2026): инструмент открывается, но слышать не будет — большая надпись.
// И вопрос «остановить чужую запись и начать здесь» (src/audio/micowner.js: recBeginAsk).
import { t } from '../i18n/index.js';
import { ui } from '../ui/index.js';

const who = (w) => { const k = 'mic.who.' + w, s = t(k); return s === k ? w : s; };

// Идёт запись «w» — остановить её и начать эту? → Promise<boolean>
export const askTakeover = (w) => ui.confirm(t('mic.takeTitle'), t('mic.takeText', { who: who(w) }), t('mic.takeYes'));

let shown = null;
const toast = (m) => ui.toast(m);
export function initMicBusy() {
  addEventListener('melete:micsilent', (e) => toast(t((e.detail || {}).on ? 'mic.silent' : 'mic.back')));
  addEventListener('melete:micbusy', (e) => {
    const d = e.detail || {};
    if (d.soft || shown) return; // слух маскота уступает молча
    const el = document.createElement('div');
    el.className = 'ask';
    el.innerHTML = '<div class="alert" role="alertdialog" aria-label="' + ui.esc(t('mic.busyTitle')) + '"><div class="ab"><h3>' + ui.esc(t('mic.busyTitle')) +
      '</h3><p>' + ui.esc(t('mic.busyText', { who: who(d.by) })) + '</p></div><div class="abtns"><button data-k="ok">' + ui.esc(t('mic.busyOk')) + '</button></div></div>';
    document.body.appendChild(el);
    shown = el;
    const close = () => { shown = null; ui.leave(el, 160); };
    el.addEventListener('click', (ev) => { if (ev.target === el || ev.target.closest('[data-k]')) close(); });
    setTimeout(() => { if (shown === el) close(); }, 9000);
  });
}
