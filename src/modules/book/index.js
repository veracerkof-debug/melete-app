// «Учебник» — отдельный инструмент (решение автора 30.10.2026): интерактивная книга в двух разделах — академическая
// теория (программа музыкальной школы) и джазовая. Раньше — вкладка «Теории»; рабочие инструменты (круг, гаммы,
// аккорды, транспонирование) остались в «Теории» и ведут сюда ссылками «Подробнее в учебнике» (ctx.openIn).
// Сама книга — book/ (reader.js: оглавление и главы, labs*.js — схемы, lang/ — тексты); грузится при открытии,
// язык — языка интерфейса. Состояние — device.book.book: { ch — глава, sec — раздел }.
import meta from './meta.js';
import './book.css';

let host = null, ctx = null, size = 'full', BK = null, loading = null;

function ready() {
  const lang = ctx.lang();
  if (BK && BK.lang === lang) return BK.book;
  if (!loading) {
    loading = import('./book/reader.js').then(async (m) => {
      const L = await m.loadLang(lang);
      if (BK) BK.book.stop();
      BK = { lang, book: m.createBook(ctx, L, { save: () => { ctx.store.save(); render(); } }) };
    }).catch((e) => { ctx.log('учебник не загрузился: ' + (e && e.message), 'w'); }).finally(() => { loading = null; if (host) render(); });
  }
  return null;
}

let lastCh;
function render() {
  if (!host) return;
  const b = ready(), th = ctx.store.all(), ch = (th.book || {}).ch || null;
  // та же глава — прокрутка на месте (перерисовка после «назад» системы, смены размера)
  const w = host.querySelector('.bkwrap'), y = w && lastCh === ch ? w.scrollTop : 0;
  host.innerHTML = '<div class="bkmod ' + size + '">' + (b ? b.html(th) : '<div class="bkload" aria-busy="true" aria-label="' + ctx.t('load') + '"></div>') + '</div>';
  lastCh = ch;
  if (b) { b.mount(host); const nw = host.querySelector('.bkwrap'); if (nw && y) nw.scrollTop = y; }
}

export default {
  ...meta,
  mount(el, c, sz = 'full') { host = el; ctx = c; size = sz; render(); },
  resize(sz) { size = sz; render(); },
  unmount() { if (BK) BK.book.stop(); host = null; },
};
