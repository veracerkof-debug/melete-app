// Страница «Ученик» в настройках: включение блокировки с кодом учителя и список того, что учитель открыл.
// Логика — core/student.js; здесь только вид и касания (data-stu).
import { t } from '../../i18n/index.js';
import { esc, toast } from '../../ui/index.js';
import { studentOn, lockStudent, unlockStudent, setOpen, genCode, codeValid, STUDENT_BASE, STUDENT_OPENABLE } from '../student.js';
import { moduleById } from '../../modules/index.js';
import { qrHTML, pairPayload } from './qrscan.js';
import { fpCheck, PORT } from '../sync.js';
import { markDone } from '../classroom.js';

const name = (id) => { const m = moduleById(id); return m ? (m.name[document.documentElement.lang] || m.name.ru) : id; };

const hp = (st) => (st.port && st.port !== PORT ? ':' + st.port : '');
const ago = (ms) => { if (!ms) return t('cls.never'); const m = Math.round((Date.now() - ms) / 60000); return m < 2 ? t('cls.now') : m < 90 ? t('cls.min', { n: m }) : m < 2880 ? t('cls.hours', { n: Math.round(m / 60) }) : t('cls.days', { n: Math.round(m / 1440) }); };

// Раздел «Учитель»: сопряжён — имя, что видно, заметка и задания; нет — включить приём и показать QR для учителя
function teacherHTML(app) {
  const st = app.store.state.settings, s = st.student, S = app.mesh;
  let h = '<div class="hdr">' + t('stu.teacher') + '</div><div class="group">';
  if (s.teacher) {
    h += '<div class="cellcol"><b>' + esc(s.teacher.name || t('cls.teacher')) + '</b><span class="l2">' + t('stu.synced', { w: ago(s.syncedAt) }) + '</span></div>' +
      (s.note ? '<div class="cellcol"><span class="l2">' + t('cls.note') + '</span><span>' + esc(s.note) + '</span></div>' : '') + '</div>' +
      '<p class="ftr keep">' + t('stu.sees') + '</p>' + tasksHTML(s);
    return h;
  }
  if (!(S && S.avail)) return h + '<div class="cellcol"><span class="l2">' + t('stu.noNet') + '</span></div></div>';
  const m = S.state, payload = m.ips && m.ips[0] ? pairPayload(m.ips[0] + hp(m), m.code, m.fp || '') : '';
  h += '<button class="cell act" data-stu="' + (m.on ? 'meshoff' : 'meshon') + '">' + t(m.on ? 'stu.meshOff' : 'stu.meshOn') + '</button>' +
    (m.on ? '<div class="cellcol sypair"><span class="l2">' + t('sy.code') + '</span><b class="num sybig">' + esc(String(m.code).slice(0, 3) + ' ' + String(m.code).slice(3)) + '</b>' +
      (m.fp ? '<span class="l2" style="margin-top:8px">' + t('sy.check') + ' <b class="num">' + esc(fpCheck(m.fp)) + '</b></span>' : '') +
      (payload ? '<div class="syqr" data-qr="' + esc(payload) + '">' + qrHTML(payload) + '</div>' : '') + '<span class="l2">' + t('stu.qrHint') + '</span></div>' : '') + '</div>';
  return h;
}
const tasksHTML = (s) => ((s.tasks || []).length ? '<div class="hdr">' + t('stu.hw') + '</div><div class="group">' + s.tasks.map((x) => '<button class="cell" data-stu="hw" data-k="' + esc(x.id) + '" aria-pressed="' + !!x.done + '"><span class="grow' + (x.done ? ' l2' : '') + '">' + (x.done ? '✓ ' : '') + esc(x.text) + '</span></button>').join('') + '</div>' : '');

// Карточка «Домашка» на главной ученика: невыполненные задания учителя; касание — отметить
export function homeworkCard(app) {
  const st = app.store.state.settings;
  if (!studentOn(st)) return '';
  const left = (st.student.tasks || []).filter((x) => !x.done);
  if (!left.length) return '';
  return '<div class="hstudy"><div class="hhdr"><span>' + t('stu.hw') + '</span></div>' + left.slice(0, 4).map((x) => '<button class="hsrow" data-act="hw" data-k="' + esc(x.id) + '"><span class="grow"><b>' + esc(x.text) + '</b></span></button>').join('') + '</div>';
}
export function homeworkDone(app, id) { const st = app.store.state.settings; if (markDone(st, id, true)) { app.store.settingsChanged(); return true; } return false; }

export function studentHTML(app) {
  const st = app.store.state.settings, on = studentOn(st);
  if (!on) {
    return '<div class="large">' + t('page.student') + '</div>' +
      '<div class="group"><label class="cellcol"><span>' + t('stu.code') + '</span><input class="inp num" data-stucode inputmode="numeric" maxlength="12" autocomplete="off" style="width:100%;margin-top:8px" aria-label="' + esc(t('stu.code')) + '"></label>' +
      '<button class="cell act" data-stu="gen">' + t('stu.gen') + '</button>' +
      '<button class="cell act" data-stu="lock">' + t('stu.lock') + '</button></div>' +
      '<p class="ftr keep">' + t('stu.hint') + '</p>';
  }
  const open = new Set(st.student.open || []);
  return '<div class="large">' + t('page.student') + '</div>' +
    '<p class="ftr keep">' + t('stu.on', { base: STUDENT_BASE.map(name).join(', ') }) + '</p>' +
    '<div class="hdr">' + t('stu.opened') + '</div><div class="group">' + STUDENT_OPENABLE.filter(moduleById).map((id) =>
      '<div class="cell"><span class="grow">' + esc(name(id)) + '</span><label class="sw"><input type="checkbox" data-stuopen="' + id + '"' + (open.has(id) ? ' checked' : '') + ' aria-label="' + esc(name(id)) + '"><i></i></label></div>').join('') + '</div>' +
    teacherHTML(app) +
    '<div class="hdr">' + t('stu.unlock') + '</div><div class="group"><label class="cellcol"><span>' + t('stu.code') + '</span><input class="inp num" data-stucode inputmode="numeric" maxlength="12" autocomplete="off" style="width:100%;margin-top:8px" aria-label="' + esc(t('stu.code')) + '"></label>' +
    '<button class="cell act" data-stu="unlock">' + t('stu.unlockBtn') + '</button></div>';
}

// Обработка касаний страницы; true — касание обработано (страница перерисуется через rerender)
export function studentClick(app, target, rerender) {
  const st = app.store.state.settings, g = (s) => target.closest(s);
  const val = () => { const i = document.querySelector('[data-stucode]'); return i ? i.value.trim() : ''; };
  let b;
  if ((b = g('[data-stu]'))) {
    const a = b.dataset.stu;
    if (a === 'gen') { const i = document.querySelector('[data-stucode]'); if (i) { i.value = genCode(); i.type = 'text'; } return true; }
    if (a === 'lock') {
      const c = val();
      if (!codeValid(c)) { toast(t('stu.bad')); return true; }
      if (lockStudent(st, c)) { app.store.settingsChanged(); toast(t('stu.locked', { code: c })); rerender(); }
      return true;
    }
    if (a === 'meshon') { app.mesh.start().then(() => rerender()).catch(() => toast(t('sy.err.port'))); return true; }
    if (a === 'meshoff') { app.mesh.stop().then(() => rerender()); return true; }
    if (a === 'hw') { markDone(st, b.dataset.k, b.getAttribute('aria-pressed') !== 'true'); app.store.settingsChanged(); rerender(); return true; }
    if (a === 'unlock') {
      if (unlockStudent(st, val())) { app.store.settingsChanged(); toast(t('stu.unlocked')); rerender(); } else toast(t('stu.wrong'));
      return true;
    }
  }
  if ((b = g('[data-stuopen]'))) { if (setOpen(st, b.dataset.stuopen, b.checked)) app.store.settingsChanged(); return true; }
  return false;
}
