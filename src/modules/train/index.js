// «Слух и ритм»: переключатель глав вверху (одним касанием) и сама глава — модуль ear или beat (ctx.mountTool).
// Главы выключаются в настройках ⋯ (это функции ear и beat; выключенной нет ни здесь, ни в окнах занятия).
import meta, { CHAPTERS } from './meta.js';

let host = null, ctx = null, size = 'full', inner = null;
const on = () => CHAPTERS.filter((id) => ctx.hasTool(id));
const cur = () => { const l = on(), s = ctx.store.get('ch'); return l.includes(s) ? s : l[0] || null; };

function render() {
  if (!host) return;
  if (inner) { inner.unmount(); inner = null; }
  const { t, ui } = ctx, l = on(), c = cur();
  host.innerHTML = '<div class="comp ' + size + '"><div class="tswrow"><div class="tsw" role="tablist">' + l.map((id) => '<button class="tswb' + (id === c ? ' on' : '') + '" data-trch="' + id + '" role="tab" aria-selected="' + (id === c) + '">' + t('ch.' + id) + '</button>').join('') +
    '</div><button class="tsets" data-trsets aria-label="' + ui.esc(t('sets')) + '" title="' + ui.esc(t('sets')) + '">⋯</button></div><div class="cbody"></div></div>';
  const body = host.querySelector('.cbody');
  if (!c) { body.innerHTML = '<p class="ftr" style="padding:20px">' + t('none') + '</p>'; return; }
  inner = ctx.mountTool(c, body, size);
}

function setsSheet() {
  const { t, ui } = ctx;
  ui.sheet(() => ui.snav(t('sets')) + '<div class="group">' + CHAPTERS.map((id) => '<div class="cell"><span class="grow">' + t('ch.' + id) + '</span>' + ui.sw('trch-' + id, ctx.hasTool(id), t('ch.' + id)) + '</div>').join('') + '</div><p class="ftr">' + t('setsHint') + '</p>', (el, sh) => {
    el.addEventListener('change', (e) => {
      const id = (e.target.dataset.sw || '').replace(/^trch-/, '');
      if (!CHAPTERS.includes(id)) return;
      if (!e.target.checked && on().length === 1 && on()[0] === id) { e.target.checked = true; ui.toast(t('needOne')); return; }
      ctx.setPart(id, e.target.checked);
      sh.update(); render();
    });
  });
}

export default {
  ...meta,
  status: (c) => { const s = c.store.get('ch'); return s ? c.t('ch.' + s) : ''; },
  mount(el, c, sz = 'full') {
    host = el; ctx = c; size = sz;
    host.addEventListener('click', (e) => {
      const b = e.target.closest('[data-trch]');
      if (b) { ctx.store.set('ch', b.dataset.trch); render(); return; }
      if (e.target.closest('[data-trsets]')) setsSheet();
    });
    render();
  },
  resize(sz) { size = sz; if (inner) inner.resize(sz); else render(); },
  unmount() { if (inner) inner.unmount(); inner = null; host = null; ctx = null; },
};
