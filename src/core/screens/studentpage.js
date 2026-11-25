// Страница «Ученик» в настройках: включение блокировки с кодом учителя и список того, что учитель открыл.
// Логика — core/student.js; здесь только вид и касания (data-stu).
import { t } from '../../i18n/index.js';
import { esc, toast } from '../../ui/index.js';
import { studentOn, lockStudent, unlockStudent, setOpen, genCode, codeValid, STUDENT_BASE, STUDENT_OPENABLE } from '../student.js';
import { moduleById } from '../../modules/index.js';

const name = (id) => { const m = moduleById(id); return m ? (m.name[document.documentElement.lang] || m.name.ru) : id; };

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
    if (a === 'unlock') {
      if (unlockStudent(st, val())) { app.store.settingsChanged(); toast(t('stu.unlocked')); rerender(); } else toast(t('stu.wrong'));
      return true;
    }
  }
  if ((b = g('[data-stuopen]'))) { if (setOpen(st, b.dataset.stuopen, b.checked)) app.store.settingsChanged(); return true; }
  return false;
}
