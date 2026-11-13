// Отчёт для педагога — картинка недели (core/teacher.js). Перед отправкой — галочки: песни и темпы, разборы и заметки,
// записи недели (по желанию, отдельными файлами). Картинка — светлая, как лист бумаги, на любой теме приложения.
import { t, tn, getLang } from '../../i18n/index.js';
import { esc, sheet, snav, toast } from '../../ui/index.js';
import { weekReport } from '../teacher.js';
import { fmtDur } from '../format.js';
import { weekdays } from './common.js';
import { sendFiles } from './share.js';
import { DAY } from '../time.js';

const W = 1080, PAD = 64;
const C = { bg: '#F7F3EC', ink: '#1E1B16', l2: '#6B6358', l3: '#B3AA9C', tint: '#9C7242', fill: '#E9E2D6' };
const loc = () => (getLang() === 'uz' ? 'uz-Latn' : getLang());

// Перенос строки по ширине; → массив строк
function wrap(g, text, w) {
  const out = [];
  String(text).split('\n').forEach((para) => {
    let line = '';
    para.split(' ').forEach((word) => { const tr = line ? line + ' ' + word : word; if (g.measureText(tr).width > w && line) { out.push(line); line = word; } else line = tr; });
    out.push(line);
  });
  return out;
}

// Рисунок отчёта → Blob PNG
export async function reportPNG(R, { name = '', songs = true, notes = true } = {}) {
  const font = (getComputedStyle(document.body).fontFamily || 'sans-serif');
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  const F = (px, wt = 400) => { g.font = wt + ' ' + px + 'px ' + font; };
  // высота: шапка + столбики + песни + заметки
  F(30);
  const noteLines = notes ? R.notes.map((n) => wrap(g, (n.title ? n.title + ': ' : '') + n.text, W - PAD * 2)) : [];
  const H = 430 + 300 + (R.vocal ? 44 : 0) + (songs && R.songs.length ? 90 + R.songs.length * 64 : 0) + (noteLines.length ? 90 + noteLines.reduce((a, l) => a + l.length * 40 + 18, 0) : 0) + 80;
  cv.width = W; cv.height = H;
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  let y = PAD + 30;
  const d0 = new Date(R.ws), d1 = new Date(R.ws + 6 * DAY), fd = (d) => d.toLocaleDateString(loc(), { day: 'numeric', month: 'long' });
  g.fillStyle = C.l2; F(30); g.fillText(t('tr.head') + (name ? ' · ' + name : ''), PAD, y);
  y += 56; g.fillStyle = C.ink; F(52, 600); g.fillText(fd(d0) + ' — ' + fd(d1), PAD, y);
  y += 110; F(96, 300); g.fillText(fmtDur(R.total), PAD, y);
  const tw = g.measureText(fmtDur(R.total)).width;
  if (R.goal > 0) { F(34); g.fillStyle = C.l2; g.fillText(t('tr.of', { goal: fmtDur(R.goal) }), PAD + tw + 24, y); }
  y += 40;
  if (R.plans.length) { F(28); g.fillStyle = C.l2; g.fillText(R.plans.map((p) => p.title + ' ×' + p.n).join(' · '), PAD, y); }
  if (R.vocal) { // строка вокала: минуты пения, чистота, выше всего
    const v = R.vocal, nm = (m) => ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][m % 12] + (Math.floor(m / 12) - 1);
    y += 44; F(28); g.fillStyle = C.ink;
    g.fillText(t('tr.vocal', { min: v.min, p: v.purity == null ? '–' : Math.round(v.purity * 100), hi: v.hi ? nm(v.hi) : '–' }), PAD, y);
  }
  // по дням
  y += 50;
  const WD = weekdays(), max = Math.max(...R.per, 1), bw = (W - PAD * 2) / 7, bh = 170;
  R.per.forEach((v, i) => {
    const x = PAD + i * bw + 14, h = v ? Math.max(8, (v / max) * bh) : 4;
    g.fillStyle = v ? C.tint : C.fill; g.beginPath(); g.roundRect ? g.roundRect(x, y + bh - h, bw - 28, h, 10) : g.rect(x, y + bh - h, bw - 28, h); g.fill();
    g.fillStyle = C.l2; F(26); g.textAlign = 'center'; g.fillText(WD[i], x + (bw - 28) / 2, y + bh + 40);
    if (v) { g.fillStyle = C.ink; F(22, 600); g.fillText(Math.round(v / 60) + "'", x + (bw - 28) / 2, y + bh - h - 10); }
    g.textAlign = 'left';
  });
  y += bh + 130;
  if (songs && R.songs.length) {
    g.fillStyle = C.l2; F(28, 600); g.fillText(t('tr.songs').toUpperCase(), PAD, y); y += 50;
    R.songs.forEach((s) => {
      g.fillStyle = C.ink; F(34, 500);
      const tm = fmtDur(s.sec), bp = s.from ? (s.from === s.to ? s.to + ' bpm' : s.from + ' → ' + s.to + ' bpm') : '';
      let title = s.title; while (g.measureText(title).width > W - PAD * 2 - 380 && title.length > 4) title = title.slice(0, -2);
      g.fillText(title === s.title ? title : title + '…', PAD, y);
      g.textAlign = 'right'; F(30); g.fillStyle = C.l2; g.fillText([bp, tm].filter(Boolean).join('   '), W - PAD, y); g.textAlign = 'left';
      y += 64;
    });
    y += 26;
  }
  if (noteLines.length) {
    g.fillStyle = C.l2; F(28, 600); g.fillText(t('tr.notes').toUpperCase(), PAD, y); y += 50;
    noteLines.forEach((ls) => { g.fillStyle = C.ink; F(30); ls.forEach((l) => { g.fillText(l, PAD, y); y += 40; }); y += 18; });
  }
  g.fillStyle = C.l3; F(24); g.fillText('Melete', PAD, H - 36);
  return new Promise((r) => cv.toBlob((b) => r(b), 'image/png'));
}

export function teacherSheet(app) {
  const st = app.store.state.settings, R = weekReport(app.store.sessions(), app.store.songs(), st);
  const opt = { songs: true, notes: true, recs: false };
  const recs = app.files ? app.files.list('audio').filter((r) => r.blob && (r.created || 0) >= R.ws && (r.created || 0) < R.ws + 7 * DAY) : [];
  let url = '';
  const preview = async (el) => {
    const b = await reportPNG(R, { name: (st.profile || {}).name || '', ...opt });
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(b);
    const im = el.querySelector('.trimg'); if (im) im.src = url;
  };
  const chk = (k, label, sub = '') => '<label class="cell"><span class="grow">' + esc(label) + (sub ? '<span class="psub">' + esc(sub) + '</span>' : '') + '</span><input type="checkbox" class="trchk" data-tro="' + k + '"' + (opt[k] ? ' checked' : '') + '></label>';
  const api = sheet(() => snav(t('tr.title')) +
    '<div class="trprev"><img class="trimg" alt="' + esc(t('tr.title')) + '"' + (url ? ' src="' + url + '"' : '') + '></div>' +
    '<div class="group">' + chk('songs', t('tr.songs')) + chk('notes', t('tr.notes')) + (recs.length ? chk('recs', t('tr.recs'), tn('tr.recsN', recs.length)) : '') + '</div>' +
    '<div class="sheetfoot"><button class="btn fill block" data-trsend>' + t('tr.send') + '</button></div>' +
    '<p class="ftr">' + t('tr.hint') + '</p>',
  (el) => {
    preview(el);
    el.addEventListener('change', (e) => { const k = e.target.dataset.tro; if (!k) return; opt[k] = e.target.checked; if (k !== 'recs') preview(el); });
    el.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-trsend]')) return;
      try {
        const png = await reportPNG(R, { name: (st.profile || {}).name || '', ...opt }), day = new Date(R.ws).toISOString().slice(0, 10);
        const list = [{ blob: png, name: 'Melete-' + day + '.png', type: 'image/png' }].concat(opt.recs ? recs.map((r) => ({ blob: r.blob, name: r.name || r.id, type: r.type })) : []);
        const r = await sendFiles(list, t('tr.title'));
        if (r !== 'cancel') { api.close(); if (r === 'saved') toast(t('tr.saved')); }
      } catch { toast(t('tr.fail')); }
    });
  }, { onClose: () => { if (url) URL.revokeObjectURL(url); } });
}
