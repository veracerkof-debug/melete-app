// Страница «Ученики» (учитель, слово автора 24–25.11.2026): список сопряжённых телефонов-учеников, неделя занятий и задания,
// шторка ученика — задания, открытые уроки и инструменты, заметка, «Отправить» и «Обновить». Логика — core/classroom.js;
// связь — sync.js (Mesh, Melete DEV). Сеть только по нажатию кнопки, в своей сети Wi-Fi.
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, toast } from '../../ui/index.js';
import { moduleById } from '../../modules/index.js';
import { moduleName } from '../modules.js';
import { fmtDur } from '../format.js';
import { studentOn, STUDENT_OPENABLE } from '../student.js';
import { devsOf, pair, http, meshAvail, meshClient } from '../sync.js';
import { scanQR, parsePair } from './qrscan.js';
import { studentOf, studentsOf, addTask, removeTask, toggleOpen, setLessons, lessonsCount, COURSE_LESSONS, pullReport, pushPack, tasksLeft } from '../classroom.js';

const ago = (ms) => { if (!ms) return t('cls.never'); const m = Math.round((Date.now() - ms) / 60000); return m < 2 ? t('cls.now') : m < 90 ? t('cls.min', { n: m }) : m < 2880 ? t('cls.hours', { n: Math.round(m / 60) }) : t('cls.days', { n: Math.round(m / 1440) }); };
const devOf = (addr) => devsOf().find((d) => d.addr === addr);
let busy = '', msg = '';

export function classHTML(app) {
  const st = app.store.state.settings;
  if (studentOn(st)) return '<div class="large">' + t('page.class') + '</div><p class="ftr keep">' + t('cls.studentOff') + '</p>';
  const devs = devsOf(), net = meshAvail() || meshClient();
  return '<div class="large">' + t('page.class') + '</div>' +
    (devs.length ? '<div class="group">' + devs.map((d) => {
      const r = studentOf(st, d.addr, d.name), rep = r.report;
      return '<button class="cell" data-cls="open" data-a="' + esc(d.addr) + '"><span class="grow">' + esc(r.name || d.name) + '<span class="psub">' +
        (rep ? t('cls.week', { t: fmtDur(rep.total) }) + ' · ' : '') + t('cls.left', { n: tasksLeft(r) }) + ' · ' + t('cls.upd', { w: ago(r.reportAt) }) + '</span></span><span class="l2">›</span></button>';
    }).join('') + '</div>' : '<p class="ftr keep">' + t('cls.none') + '</p>') +
    (net ? '<div class="group"><button class="cell act" data-cls="scan"' + (busy ? ' disabled' : '') + '>' + t('cls.add') + '</button></div>' : '<p class="ftr keep">' + t('cls.noNet') + '</p>') +
    (msg ? '<p class="ftr keep">' + esc(msg) + '</p>' : '') + '<p class="ftr keep">' + t('cls.hint') + '</p>';
}

export function classClick(app, target, rerender) {
  const b = target.closest('[data-cls]'); if (!b) return false;
  const a = b.dataset.cls;
  if (a === 'open') { studentSheet(app, b.dataset.a, rerender); return true; }
  if (a === 'scan') {
    busy = 'scan'; msg = ''; rerender();
    scanQR((x) => !!parsePair(x)).then(async (x) => {
      const q = parsePair(x); if (!q) return;
      await pair(q.addr, q.code, (app.store.state.settings.profile || {}).name || t('cls.teacher'));
      toast(t('cls.paired'));
    }).catch((e) => { msg = t('cls.err.' + ((e && e.reason) || 'unreachable')) || t('cls.err.unreachable'); }).finally(() => { busy = ''; rerender(); });
    return true;
  }
  return false;
}

function studentSheet(app, addr, rerender) {
  const st = app.store.state.settings, dev = devOf(addr); if (!dev) return;
  const rec = studentOf(st, addr, dev.name), save = () => { app.store.settingsChanged(); };
  const html = () => {
    const rep = rec.report, songs = rep && rep.songs ? rep.songs.slice(0, 4) : [];
    return snav(rec.name || dev.name) +
      '<div class="group"><div class="cellcol"><span>' + (rep ? t('cls.week', { t: fmtDur(rep.total) }) + (rep.goal ? ' / ' + fmtDur(rep.goal) : '') : t('cls.noReport')) + '</span>' +
        songs.map((s) => '<span class="l2">' + esc(s.title) + ' · ' + fmtDur(s.sec) + (s.from && s.to && s.from !== s.to ? ' · ' + s.from + ' → ' + s.to + ' bpm' : '') + '</span>').join('') +
        '<span class="l2">' + t('cls.upd', { w: ago(rec.reportAt) }) + (rec.sentAt ? ' · ' + t('cls.sent', { w: ago(rec.sentAt) }) : '') + '</span></div>' +
      '<div class="cell"><button class="link" data-cs="pull"' + (busy ? ' disabled' : '') + '>' + t('cls.pull') + '</button><span class="grow"></span><button class="link b" data-cs="push"' + (busy ? ' disabled' : '') + '>' + t('cls.push') + '</button></div></div>' +
    '<div class="hdr">' + t('cls.tasks') + '</div><div class="group">' +
      rec.tasks.map((x) => '<div class="cell"><span class="grow' + (x.done ? ' l2' : '') + '">' + (x.done ? '✓ ' : '') + esc(x.text) + '</span><button class="link danger" data-cs="rm" data-k="' + esc(x.id) + '" aria-label="' + esc(t('cls.rm')) + '">✕</button></div>').join('') +
      '<label class="cell"><input class="inp" data-cs-text maxlength="400" placeholder="' + esc(t('cls.taskPh')) + '" aria-label="' + esc(t('cls.taskPh')) + '" style="width:100%"></label><button class="cell act" data-cs="add">' + t('cls.addTask') + '</button></div>' +
    '<div class="hdr">' + t('cls.lessons') + '</div><div class="group"><div class="cell"><span class="grow">' + t('cls.lessonsN', { n: lessonsCount(rec), m: COURSE_LESSONS }) + '</span>' +
      '<button class="ic sm" data-cs="ldec" aria-label="−">−</button><button class="ic sm" data-cs="linc" aria-label="+">+</button></div></div>' +
    '<div class="hdr">' + t('cls.tools') + '</div><div class="group">' + STUDENT_OPENABLE.filter(moduleById).map((id) => '<div class="cell"><span class="grow">' + esc(moduleName(moduleById(id))) + '</span><label class="sw"><input type="checkbox" data-cs-tool="' + id + '"' + (rec.open.includes(id) ? ' checked' : '') + ' aria-label="' + esc(moduleName(moduleById(id))) + '"><i></i></label></div>').join('') + '</div>' +
    '<div class="hdr">' + t('cls.note') + '</div><div class="group"><label class="cell"><textarea class="inp" data-cs-note maxlength="600" rows="3" style="width:100%" aria-label="' + esc(t('cls.note')) + '">' + esc(rec.note) + '</textarea></label></div>' +
    '<p class="ftr keep">' + t('cls.sendHint') + '</p>';
  };
  sheet(html, (el, api) => {
    const redraw = () => api.update();
    const call = async (kind) => {
      const d = devOf(addr); if (!d) return;
      busy = kind; redraw();
      try { if (kind === 'pull') await pullReport(app, d, http); else await pushPack(app, d, http); toast(t(kind === 'pull' ? 'cls.pulled' : 'cls.pushed')); }
      catch (e) { toast(t('cls.err.' + ((e && e.reason) || 'unreachable'))); }
      busy = ''; redraw();
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cs]'); if (!b) return;
      const a = b.dataset.cs;
      if (a === 'pull' || a === 'push') { call(a); return; }
      if (a === 'rm') { removeTask(rec, b.dataset.k); save(); redraw(); return; }
      if (a === 'add') { const i = el.querySelector('[data-cs-text]'); if (i && i.value.trim()) { addTask(rec, i.value.trim(), {}, Date.now()); save(); redraw(); } return; }
      if (a === 'linc') { setLessons(rec, lessonsCount(rec) + 1); save(); redraw(); return; }
      if (a === 'ldec') { setLessons(rec, lessonsCount(rec) - 1); save(); redraw(); }
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-cs-tool]')) { toggleOpen(rec, 'tool', e.target.dataset.csTool, e.target.checked); save(); }
      if (e.target.matches('[data-cs-note]')) { rec.note = e.target.value; save(); }
    });
  }, { onClose: () => { save(); rerender(); } });
}
export const studentCount = (app) => studentsOf(app.store.state.settings).length;
