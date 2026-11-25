// Настройки чтения Библии «по норме» и «Свои напоминания» (церковный режим, слово автора 24.11.2026). Логика — core/readnorm.js.
// Мягко по умолчанию; строгий режим включается явно, «дни по норме» видны только здесь и на карточке дня, наружу не уходят.
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, toast } from '../../ui/index.js';
import { BOOKS, bookOf, chKey, parseKey } from '../bible.js';
import { dayKeyOf } from '../reading.js';
import { weekdays } from './common.js';
import { normOf, setNorm, normStatus, notesOf, saveNote, removeNote, NOTES_MAX, N_RANGE } from '../readnorm.js';

const sw = (k, on, label) => '<label class="sw"><input type="checkbox" data-bn-sw="' + k + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(label) + '"><i></i></label>';
const segBtns = (k, vals, cur, name) => '<div class="seg" role="group">' + vals.map((v) => '<button type="button" data-bnseg="' + k + '" data-v="' + v + '" aria-pressed="' + (cur === v) + '"' + (cur === v ? ' class="on"' : '') + '>' + t(name + v) + '</button>').join('') + '</div>';
const daysText = (n) => (n.days.length === 7 ? t('bn.every') : n.days.map((d) => weekdays()[d]).join(' '));

export function normHTML(app) {
  const b = app.store.state.settings.bible || {}, x = normOf(b), st = normStatus(b, app.store.sessions(), Date.now()), notes = notesOf(b);
  const from = parseKey(x.from), bk = bookOf(from.code), unit = t('bn.unit.' + x.kind);
  let h = '<div class="hdr">' + t('bn.title') + '</div><div class="group"><div class="cell"><span class="grow">' + t('bn.on') + '</span>' + sw('on', x.on, t('bn.on')) + '</div>';
  if (x.on) {
    h += '<div class="cell"><span class="grow">' + t('bn.kind') + '</span>' + segBtns('kind', ['ch', 'min'], x.kind, 'bn.kind.') + '</div>' +
      '<div class="cell"><span class="grow">' + t('bn.n') + ' · <b class="num">' + x.n + '</b> ' + esc(unit) + '</span><button class="ic sm" data-bnact="dec" aria-label="−">−</button><button class="ic sm" data-bnact="inc" aria-label="+">+</button></div>' +
      '<div class="cell"><span class="grow">' + t('bn.order') + '</span>' + segBtns('order', ['seq', 'free'], x.order, 'bn.order.') + '</div>' +
      (x.order === 'seq' ? '<div class="cellcol"><span>' + t('bn.from') + '</span><div style="display:flex;gap:8px;margin-top:8px"><select class="sortsel" data-bn-book style="flex:1;text-align:left" aria-label="' + esc(t('bn.from')) + '">' + BOOKS.map((b2) => '<option value="' + b2.code + '"' + (b2.code === from.code ? ' selected' : '') + '>' + esc(b2.name) + '</option>').join('') + '</select>' +
        '<input class="inp num" type="number" inputmode="numeric" min="1" max="' + (bk ? bk.chapters : 1) + '" data-bn-ch value="' + from.ch + '" aria-label="' + esc(t('bn.chapter')) + '" style="width:64px"></div></div>' : '') +
      '<div class="cell"><span class="grow">' + t('bn.strict') + '<span class="psub">' + t('bn.strictSub') + '</span></span>' + sw('strict', x.strict, t('bn.strict')) + '</div>';
  }
  h += '</div>';
  if (x.on && st.on) {
    h += '<p class="ftr keep">' + t('bn.today', { done: st.today, n: st.n, unit }) + (st.todayDone ? ' ✓' : '') +
      (st.strict && st.streak != null ? '<br>' + t('bn.streak', { n: st.streak }) : '') + (st.debt ? '<br>' + t('bn.debt', { n: st.debt }) : '') + '</p>' +
      (st.debt ? '<p class="ftr keep">' + t('bn.catch') + '</p>' : '');
  }
  h += '<div class="hdr">' + t('bn.notes') + '</div><div class="group">' +
    notes.map((n) => '<button class="cell" data-bnact="note" data-id="' + esc(n.id) + '"><span class="grow">' + esc(n.text || t('bn.note.noText')) + '<span class="psub">' + esc(n.at) + ' · ' + esc(daysText(n)) + (n.persist ? ' · ' + t('bn.persist') : '') + '</span></span><span class="l2">›</span></button>').join('') +
    (notes.length < NOTES_MAX ? '<button class="cell act" data-bnact="newnote">' + t('bn.note.add') + '</button>' : '') + '</div>' +
    '<p class="ftr keep">' + t('bn.note.hint', { n: NOTES_MAX }) + '</p>';
  return h;
}

// Касания страницы; true — обработано
export function normClick(app, target, rerender) {
  const b = app.store.state.settings.bible ??= {}, today = dayKeyOf(Date.now()), save = () => { app.store.settingsChanged(); rerender(); };
  let e;
  if ((e = target.closest('[data-bnseg]'))) { const k = e.dataset.bnseg; setNorm(b, k === 'kind' ? { kind: e.dataset.v, n: e.dataset.v === 'min' ? 15 : 1 } : { order: e.dataset.v }, today); save(); return true; }
  if ((e = target.closest('[data-bnact]'))) {
    const a = e.dataset.bnact, x = normOf(b), step = x.kind === 'min' ? 5 : 1;
    if (a === 'dec' || a === 'inc') { setNorm(b, { n: x.n + (a === 'inc' ? step : -step) }, today); save(); return true; }
    if (a === 'newnote') { noteSheet(app, null, rerender); return true; }
    if (a === 'note') { noteSheet(app, e.dataset.id, rerender); return true; }
  }
  return false;
}
export function normChange(app, e, rerender) {
  const b = app.store.state.settings.bible ??= {}, today = dayKeyOf(Date.now()), save = () => { app.store.settingsChanged(); rerender(); };
  const el = e.target;
  if (el.dataset && el.dataset.bnSw) { setNorm(b, { [el.dataset.bnSw]: el.checked }, today); save(); return true; }
  if (el.matches && el.matches('[data-bn-book]')) { setNorm(b, { from: chKey(el.value, 1) }, today); save(); return true; }
  if (el.matches && el.matches('[data-bn-ch]')) { const p = parseKey(normOf(b).from), bk = bookOf(p.code); setNorm(b, { from: chKey(p.code, Math.max(1, Math.min(bk ? bk.chapters : 1, Math.round(+el.value) || 1))) }, today); save(); return true; }
  return false;
}

// Редактор одного напоминания: текст, время, дни недели, «настойчиво» (повтор через 30/60/90/120 минут, пока норма дня не выполнена)
function noteSheet(app, id, done) {
  const b = app.store.state.settings.bible ??= {}, old = id ? notesOf(b).find((x) => x.id === id) : null;
  const S = { text: old ? old.text : '', at: old ? old.at : '07:30', days: new Set(old ? old.days : [0, 1, 2, 3, 4, 5, 6]), persist: old ? old.persist : false };
  const body = () => snav(t(old ? 'bn.note.edit' : 'bn.note.add')) +
    '<div class="group"><label class="cellcol"><span>' + t('bn.note.text') + '</span><input class="inp" data-nt="text" maxlength="120" value="' + esc(S.text) + '" style="width:100%;margin-top:8px" aria-label="' + esc(t('bn.note.text')) + '"></label>' +
    '<label class="cell"><span class="grow">' + t('bn.note.time') + '</span><input type="time" class="inp num" data-nt="at" value="' + esc(S.at) + '" step="900" aria-label="' + esc(t('bn.note.time')) + '"></label></div>' +
    '<div class="hdr">' + t('bn.note.days') + '</div><div class="pickrow">' + weekdays().map((d, i) => '<button type="button" class="lchip pick' + (S.days.has(i) ? ' on' : '') + '" data-ntday="' + i + '" aria-pressed="' + S.days.has(i) + '">' + esc(d) + '</button>').join('') + '</div>' +
    '<div class="group" style="margin-top:12px"><div class="cell"><span class="grow">' + t('bn.persist') + '<span class="psub">' + t('bn.persistSub') + '</span></span><label class="sw"><input type="checkbox" data-nt="persist"' + (S.persist ? ' checked' : '') + ' aria-label="' + esc(t('bn.persist')) + '"><i></i></label></div></div>' +
    '<div class="group" style="margin-top:12px"><button class="cell act" data-ntact="save">' + t('bn.note.save') + '</button>' + (old ? '<button class="cell act danger" data-ntact="del">' + t('bn.note.del') + '</button>' : '') + '</div>';
  sheet(body, (el, api) => {
    el.addEventListener('input', (ev) => { if (ev.target.dataset.nt === 'text') S.text = ev.target.value; if (ev.target.dataset.nt === 'at' && /^\d\d:\d\d$/.test(ev.target.value)) S.at = ev.target.value; });
    el.addEventListener('change', (ev) => { if (ev.target.dataset.nt === 'persist') S.persist = ev.target.checked; });
    el.addEventListener('click', (ev) => {
      const d = ev.target.closest('[data-ntday]'); if (d) { const i = +d.dataset.ntday; if (S.days.has(i) && S.days.size > 1) S.days.delete(i); else S.days.add(i); api.update(); return; }
      const a = ev.target.closest('[data-ntact]'); if (!a) return;
      if (a.dataset.ntact === 'del') { removeNote(b, id); app.store.settingsChanged(); api.close(); return; }
      const n = saveNote(b, { id, text: S.text, at: S.at, days: [...S.days], persist: S.persist });
      if (!n) { toast(t('bn.note.bad')); return; }
      app.store.settingsChanged(); api.close();
    });
  }, { onClose: () => done && done() });
}
export { N_RANGE };
