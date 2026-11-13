// Планы занятия на экране «Песни» и в занятии (слово автора 13.11.2026). Логика — src/core/routine.js.
// Список: строка плана — касание правит, ▶ начинает занятие по плану. Правка — шторка: название и пункты (название,
// минуты, инструмент, песня, темп), ↑ ↓ — порядок, × — убрать пункт. При начале свободного занятия, если планы есть, —
// выбор «Свободно» или план (план из расписания на это время — первым).
import { t, tn } from '../../i18n/index.js';
import { esc, sheet, snav, toast, confirm } from '../../ui/index.js';
import { modules } from '../../modules/index.js';
import { moduleName } from '../modules.js';
import { routinesOf, routineById, saveRoutine, removeRoutine, totalMin, example, slotRoutine } from '../routine.js';

const PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
const tools = () => modules.filter((m) => !m.tab && !m.inner && m.session !== false && m.id !== 'timer');
const toolName = (id) => { const m = modules.find((x) => x.id === id); return m ? moduleName(m) : ''; };
const sumText = (r) => t('rt.sum', { s: tn('rt.steps', r.items.length), m: totalMin(r) });

// Раздел на экране «Песни»
export function routinesHTML(app) {
  const st = app.store.state.settings, list = routinesOf(st);
  if (st.toolsOnly) return '';
  return '<div class="hdr rthdr"><span>' + t('rt.title') + '</span><button class="link" data-act="rtNew">' + t('rt.new') + '</button></div>' +
    (list.length ? '<div class="group rtlist">' + list.map((r) => '<div class="cell rtrow"><button class="grow rtopen" data-rt="' + esc(r.id) + '"><b>' + esc(r.title || t('rt.untitled')) + '</b><span class="st l2">' + esc(sumText(r)) + '</span></button>' +
      '<button class="rtplay" data-rtgo="' + esc(r.id) + '" aria-label="' + esc(t('rt.start', { title: r.title || t('rt.untitled') })) + '">' + PLAY + '</button></div>').join('') + '</div>'
      : '<div class="group"><div class="cellcol rtempty"><span class="l2">' + t('rt.empty') + '</span><div class="rtex"><button class="btn sm" data-rtex="guitar">' + t('rt.ex.guitar') + '</button><button class="btn sm" data-rtex="vocal">' + t('rt.ex.vocal') + '</button></div></div></div>');
}

// Нажатия раздела; true — нажатие его
export function routinesClick(app, e, render) {
  const g = (s) => e.target.closest(s);
  let b;
  if (g('[data-act="rtNew"]')) { routineEditor(app, null, render); return true; }
  if ((b = g('[data-rt]'))) { routineEditor(app, b.dataset.rt, render); return true; }
  if ((b = g('[data-rtgo]'))) { app.startSession('free', null, null, { routine: b.dataset.rtgo }); return true; }
  if ((b = g('[data-rtex]'))) {
    const r = saveRoutine(app.store.state.settings, example(b.dataset.rtex, t));
    app.store.settingsChanged(); render();
    if (r) routineEditor(app, r.id, render);
    return true;
  }
  return false;
}

// Правка плана
export function routineEditor(app, id, done) {
  const st = app.store.state.settings, src = id ? routineById(st, id) : null;
  const d = src ? JSON.parse(JSON.stringify(src)) : { title: '', items: [{ title: '', min: 10 }] };
  const songs = app.store.songs().slice().sort((a, b) => a.title.localeCompare(b.title));
  const opt = (v, label, cur) => '<option value="' + esc(v) + '"' + (v === (cur || '') ? ' selected' : '') + '>' + esc(label) + '</option>';
  const row = (x, i) => '<div class="group rtitem" data-i="' + i + '"><div class="cell"><span class="rtn num">' + (i + 1) + '</span><input class="inp grow" data-f="title" maxlength="60" value="' + esc(x.title || '') + '" placeholder="' + esc(t('rt.itemPh')) + '" aria-label="' + esc(t('rt.itemPh')) + '">' +
    '<input class="inp num rtmin" data-f="min" type="number" inputmode="numeric" min="1" max="180" value="' + x.min + '" aria-label="' + esc(t('rt.min')) + '"><span class="l2">' + t('rt.minShort') + '</span></div>' +
    '<div class="cell rtopts"><select class="sortsel" data-f="tool" aria-label="' + esc(t('rt.tool')) + '">' + opt('', t('rt.noTool'), x.tool) + tools().map((m) => opt(m.id, moduleName(m), x.tool)).join('') + '</select>' +
    (songs.length ? '<select class="sortsel" data-f="songId" aria-label="' + esc(t('rt.song')) + '">' + opt('', t('rt.noSong'), x.songId) + songs.map((s) => opt(s.id, s.title, x.songId)).join('') + '</select>' : '') +
    '</div>' +
    '<div class="cell rtact"><button class="ic sm plain" data-mv="-1" aria-label="' + esc(t('rt.up')) + '"' + (i ? '' : ' disabled') + '>↑</button><button class="ic sm plain" data-mv="1" aria-label="' + esc(t('rt.down')) + '"' + (i < d.items.length - 1 ? '' : ' disabled') + '>↓</button>' +
    '<input class="inp num rtbpm" data-f="bpm" type="number" inputmode="numeric" min="20" max="400" value="' + (x.bpm || '') + '" placeholder="' + esc(t('rt.bpmPh')) + '" aria-label="' + esc(t('rt.bpm')) + '"><span class="l2">bpm</span>' +
    '<span class="grow"></span><button class="link danger" data-rm aria-label="' + esc(t('rt.remove')) + '">' + t('rt.remove') + '</button></div></div>';
  const api = sheet(() => snav(t(id ? 'rt.edit' : 'rt.new'), { left: '<button class="link l" data-close>' + t('ui.cancel') + '</button>', right: '<button class="link b r" data-rtsave>' + t('ui.save') + '</button>' }) +
    '<div class="group"><label class="cell"><input class="inp grow" data-rtt maxlength="60" value="' + esc(d.title) + '" placeholder="' + esc(t('rt.titlePh')) + '" style="border:0;background:none;font-size:17px" aria-label="' + esc(t('rt.titlePh')) + '"></label></div>' +
    '<div class="hdr">' + esc(t('rt.items')) + ' · ' + esc(t('rt.total', { m: d.items.reduce((a, x) => a + (+x.min || 0), 0) })) + '</div>' + d.items.map(row).join('') +
    '<div class="group"><button class="cell act" data-add>' + t('rt.addItem') + '</button></div>' +
    (id ? '<div class="group" style="margin-top:16px"><button class="cell danger center" data-del>' + t('rt.delete') + '</button></div>' : '') +
    '<p class="ftr">' + t('rt.hint') + '</p>',
  (el) => {
    const sync = () => {
      d.title = el.querySelector('[data-rtt]').value;
      el.querySelectorAll('.rtitem').forEach((g) => { const x = d.items[+g.dataset.i]; g.querySelectorAll('[data-f]').forEach((f) => { x[f.dataset.f] = f.value; }); });
    };
    el.addEventListener('click', (e) => {
      const it = e.target.closest('.rtitem'), i = it ? +it.dataset.i : -1;
      if (e.target.closest('[data-add]')) { sync(); if (d.items.length < 20) d.items.push({ title: '', min: 10 }); api.update(); return; }
      if (e.target.closest('[data-rm]') && i >= 0) { sync(); d.items.splice(i, 1); if (!d.items.length) d.items.push({ title: '', min: 10 }); api.update(); return; }
      const mv = e.target.closest('[data-mv]');
      if (mv && i >= 0) { sync(); const j = i + +mv.dataset.mv; if (j >= 0 && j < d.items.length) { [d.items[i], d.items[j]] = [d.items[j], d.items[i]]; api.update(); } return; }
      if (e.target.closest('[data-rtsave]')) {
        sync();
        d.items.forEach((x) => { if (!x.title) x.title = toolName(x.tool) || (songs.find((s) => s.id === x.songId) || {}).title || ''; });
        const r = saveRoutine(st, d);
        if (!r) { toast(t('rt.emptyErr')); return; }
        app.store.settingsChanged(); api.close(); if (done) done(r);
        return;
      }
      if (e.target.closest('[data-del]')) confirm(t('rt.delete'), t('rt.delText'), t('rt.delete')).then((ok) => { if (!ok) return; removeRoutine(st, id); app.store.settingsChanged(); api.close(); if (done) done(null); });
    });
  });
}

// Выбор при начале свободного занятия: cb(id плана | null). Нет планов — сразу cb(null)
export function pickRoutine(app, cb) {
  const st = app.store.state.settings, list = routinesOf(st);
  if (!list.length || st.toolsOnly) { cb(null); return; }
  const now = slotRoutine(st), order = now ? [routineById(st, now), ...list.filter((r) => r.id !== now)] : list;
  const api = sheet(() => snav(t('rt.pick'), { right: '<span></span>' }) +
    '<div class="group"><button class="cell act rtfree" data-pk="">' + PLAY + '<span class="grow">' + t('rt.free') + '</span></button></div>' +
    '<div class="hdr">' + t('rt.title') + '</div><div class="group">' + order.map((r) => '<button class="cell rtrow" data-pk="' + esc(r.id) + '"><span class="grow"><b>' + esc(r.title || t('rt.untitled')) + '</b><span class="st l2">' + esc(sumText(r)) + (r.id === now ? ' · ' + t('rt.now') : '') + '</span></span>' + PLAY + '</button>').join('') + '</div>',
  (el) => el.addEventListener('click', (e) => { const b = e.target.closest('[data-pk]'); if (!b) return; api.close(); cb(b.dataset.pk || null); }));
  return api;
}

// Выбор плана для занятия в расписании (slotSheet в plan.js): строки <select>
export const routineOptions = (st, cur) => '<option value="">' + esc(t('rt.none')) + '</option>' + routinesOf(st).map((r) => '<option value="' + esc(r.id) + '"' + (r.id === cur ? ' selected' : '') + '>' + esc(r.title || t('rt.untitled')) + '</option>').join('');
