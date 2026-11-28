// Песни и служение на компьютере (html.desk, макеты «Песни», «Песня», «Сет-лист», «Импорт»): таблица со столбцами «тональность · темп ·
// источник · статус», предпросмотр справа, страница песни с панелью, сводка сет-листа. Только раскладка и показ — данные берутся из песен
// как есть (ничего не пишется): тональность — `song.key` или по аккордам текста, темп — `currentBpm`, источник — `song.src`, готовность —
// аккорды в тексте и темп к цели. Телефон этого не видит (разметка скрыта CSS без html.desk, предпросмотр не строится).
import { t } from '../../i18n/index.js';
import { esc } from '../../ui/index.js';
import { chordsIn, lyricsHTML } from '../../music/lyrics.js';
import { keyLabel } from '../../music/transpose.js';
import { songKey } from '../stage.js';
import { isDesk } from '../../ui/desk.js';

export const songBpm = (s) => +s.currentBpm || +s.targetBpm || (s.metro && +s.metro.bpm) || 0;
export const hasChords = (s) => chordsIn(s.notes || '').length > 0;
// Тональность песни для показа: записанная, иначе по аккордам; '' — неизвестна
export function keyText(s) {
  if (s.key) return String(s.key);
  const k = songKey(s);
  return k && !k.assumed ? keyLabel(k) : '';
}
// Готовность: нет аккордов, темп ниже цели (меньше 95 %) или «готова»
export function songStatus(s) {
  if (!hasChords(s)) return { k: 'wn', label: t('dsk.noChords') };
  const cur = +s.currentBpm || 0, tg = +s.targetBpm || 0;
  if (tg && cur && cur < tg * 0.95) return { k: 'wn', label: t('dsk.tempo') };
  return { k: 'ok', label: t('dsk.ready') };
}
export const songSource = (s) => (s.src ? t('dsk.srcFolder') : t('dsk.srcManual'));
export const bpmText = (s) => (songBpm(s) ? songBpm(s) + ' bpm' : '—');

// Ячейки строки таблицы (скрыты без html.desk)
export const rowKeyHTML = (s) => '<span class="dx dskey num">' + (esc(keyText(s)) || '–') + '</span>';
export function rowColsHTML(s) {
  const st = songStatus(s);
  return '<span class="dx dbpm num">' + bpmText(s) + '</span><span class="dx dsrc">' + esc(songSource(s)) + '</span><span class="dx dst2 ' + st.k + '">' + esc(st.label) + '</span>';
}

// Текст песни с подсвеченными аккордами (как в макете: аккорды над словами, моноширинно)
export function textHTML(s, size = '') {
  const txt = String(s.notes || '');
  if (!txt.trim()) return '<div class="dtext empty">' + esc(t('dsk.noText')) + '</div>';
  const k = songKey(s);
  return '<pre class="dtext lyr' + (size ? ' ' + size : '') + '">' + lyricsHTML(txt, 0, k && !k.assumed ? k : null) + '</pre>';
}

// Предпросмотр справа от таблицы
export function previewHTML(s, canOpen = true) {
  if (!s) return '<aside class="dprev"><div class="dprevhd">' + esc(t('dsk.preview')) + '</div><p class="l2">' + esc(t('dsk.pickSong')) + '</p></aside>';
  const st = songStatus(s), key = keyText(s);
  return '<aside class="dprev" aria-label="' + esc(t('dsk.preview')) + '"><div class="dprevhd">' + esc(t('dsk.preview')) + '</div>' +
    '<h2>' + esc(s.title) + '</h2><div class="dprevsub"><span class="dchip ' + st.k + '">' + esc(st.label) + '</span>' +
    [key, bpmText(s) !== '—' ? bpmText(s) : '', songSource(s)].filter(Boolean).map((x) => '<span class="dchip">' + esc(x) + '</span>').join('') + '</div>' +
    textHTML(s) +
    (canOpen ? '<div class="dprevact"><button class="btn fill" data-dsk="open" data-sid="' + s.id + '">' + esc(t('dsk.open')) + '</button><button class="btn" data-play="' + s.id + '">' + esc(t('song.play')) + '</button></div>' +
      '<p class="dskeys"><span class="dkb">↑</span><span class="dkb">↓</span> ' + esc(t('dsk.kList')) + ' · <span class="dkb">Enter</span> ' + esc(t('dsk.kOpen')) + '</p>' : '') + '</aside>';
}

// Правая панель страницы песни: тональность, темп, пэд, метроном, запись — сведения песни и подсказки клавиш
export function panelHTML(app, s, files = []) {
  const key = keyText(s), cap = s.capo ? ' · capo ' + s.capo : '', bpm = songBpm(s);
  const it = (lab, val) => '<div class="dpr"><span class="dprl">' + esc(lab) + '</span><b class="num">' + val + '</b></div>';
  const rec = files.length ? files.slice(0, 3).map((f) => esc(f.name)).join(', ') : esc(t('dsk.noRec'));
  return '<div class="dpanel">' +
    it(t('dsk.key'), (esc(key) || '–') + esc(cap)) +
    it(t('dsk.tempo2'), (bpm || '—') + (s.targetBpm && s.targetBpm !== bpm ? ' → ' + s.targetBpm : '')) +
    it(t('dsk.pad'), key ? esc(key) : '—') +
    it(t('dsk.metro'), s.metro && s.metro.num ? s.metro.num + '/' + (s.metro.den || 4) : '4/4') +
    '<div class="dpr col"><span class="dprl">' + esc(t('dsk.rec')) + '</span><span class="dprm">' + rec + '</span></div>' +
    '<p class="dskeys"><span class="dkb">Пробел</span> ' + esc(t('dsk.kPlay')) + ' · <span class="dkb">E</span> ' + esc(t('dsk.kEdit')) + ' · <span class="dkb">Esc</span> ' + esc(t('dsk.kBack')) + '</p></div>';
}

// Сводка сет-листа: тональности через «·», сколько готовы и сколько подтянуть, оценка длительности
export function setSummary(songs, durSec = 0) {
  const sts = songs.map(songStatus), ok = sts.filter((x) => x.k === 'ok').length, wn = sts.length - ok;
  const keys = songs.map(keyText).filter(Boolean);
  const min = durSec ? Math.max(1, Math.round(durSec / 60)) : songs.length * 4;
  return '<div class="dsum"><span class="dchip ac">' + esc(keys.join(' · ') || '—') + '</span>' + (ok ? '<span class="dchip ok">' + esc(t('dsk.nReady', { n: ok })) + '</span>' : '') +
    (wn ? '<span class="dchip wn">' + esc(t('dsk.nFix', { n: wn })) + '</span>' : '') + '<span class="l2">' + esc(t('dsk.setMeta', { n: songs.length, m: min })) + '</span></div>';
}

// Три крупных числа над списком импорта и источника (макет «Импорт из Holyrics»): [[число, подпись, 'ok'|'']]
export const statCardsHTML = (cards) => '<div class="dstats">' + cards.map(([n, lab, k]) => '<div class="dstat ' + (k || '') + '"><b class="num">' + n + '</b><span>' + esc(lab) + '</span></div>').join('') + '</div>';

// Клавиши на компьютере: в списке песен ↑↓ — выбор, Enter — открыть; на странице песни Пробел — играть, E — правка, Esc — к списку
export function initSongsDeskKeys({ app, view, go, render, edit }) {
  if (typeof document === 'undefined') return;
  const busy = () => !!(document.querySelector('.sheet, .scrim, #panelLayer, .tview, .session, .kpal, .pdffull, .ned, .stage') || document.documentElement.classList.contains('arrange'));
  const typing = (x) => !!x && (/^(INPUT|TEXTAREA|SELECT)$/.test(x.tagName) || x.isContentEditable);
  document.addEventListener('keydown', (e) => {
    if (!isDesk() || e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || view.tab !== 'library' || busy() || typing(e.target)) return;
    if (view.song) {
      if (e.target && e.target.closest && e.target.closest('button, a, [role="slider"]') && e.key !== 'Escape') return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); app.startSession('song', view.song); }
      else if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') { e.preventDefault(); edit(view.song); }
      else if (e.key === 'Escape') { e.preventDefault(); go('library'); }
      return;
    }
    const rows = [...document.querySelectorAll('.dlib .stile3[data-song]')];
    if (!rows.length || view.sel instanceof Set) return;
    const i = rows.findIndex((r) => r.dataset.song === (view.prev || ''));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const j = Math.max(0, Math.min(rows.length - 1, i < 0 ? 0 : i + (e.key === 'ArrowDown' ? 1 : -1)));
      view.prev = rows[j].dataset.song; render();
      const el = document.querySelector('.dlib .stile3.cur'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && i >= 0 && !(e.target && e.target.closest && e.target.closest('button'))) { e.preventDefault(); go('library', rows[i].dataset.song); }
  });
}
