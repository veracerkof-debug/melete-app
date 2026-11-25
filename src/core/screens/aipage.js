// Настройки «Нейросеть» (слово автора 23–25.11.2026): подключение, доступ к данным по категориям с предупреждениями, инструкция.
// Выключено по умолчанию. Ключ и история — только на этом устройстве, вне копий. Логика — core/ai/*.
import { t } from '../../i18n/index.js';
import { esc, toast, confirm } from '../../ui/index.js';
import { checkUrl, FORMATS, LEVELS } from '../ai/config.js';

const lvlName = (cat, v) => t('ai.lvl.' + v);
export function aiHTML(app) {
  const ai = app.ai, c = ai.cfg(), sw = (k, on, l) => '<label class="sw"><input type="checkbox" data-ai-sw="' + k + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(l) + '"><i></i></label>';
  if (!ai.avail) return '<div class="large">' + t('page.ai') + '</div><p class="ftr keep">' + t('ai.noPlatform') + '</p>';
  const u = c.url ? checkUrl(c.url) : { ok: true };
  let h = '<div class="large">' + t('page.ai') + '</div><div class="group"><div class="cell"><span class="grow">' + t('ai.on') + '</span>' + sw('on', c.on, t('ai.on')) + '</div></div><p class="ftr keep">' + t('ai.intro') + '</p>';
  if (!c.on) return h;
  h += '<div class="hdr">' + t('ai.conn') + '</div><div class="group">' +
    '<div class="cell"><span class="grow">' + t('ai.format') + '</span><div class="seg" role="group">' + FORMATS.map((f) => '<button type="button" data-ai-fmt="' + f + '" aria-pressed="' + (c.format === f) + '"' + (c.format === f ? ' class="on"' : '') + '>' + t('ai.fmt.' + f) + '</button>').join('') + '</div></div>' +
    '<label class="cellcol"><span>' + t('ai.url') + '</span><input class="inp" data-ai-f="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://api.openai.com/v1" value="' + esc(c.url) + '" style="width:100%;margin-top:8px" aria-label="' + esc(t('ai.url')) + '"></label>' +
    (!u.ok ? '<p class="ftr keep" style="color:var(--red)">' + t('ai.url.' + u.why) + '</p>' : '') +
    '<label class="cellcol"><span>' + t('ai.model') + '</span><input class="inp" data-ai-f="model" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="gpt-4o-mini" value="' + esc(c.model) + '" style="width:100%;margin-top:8px" aria-label="' + esc(t('ai.model')) + '"></label>' +
    '<label class="cellcol"><span>' + t('ai.key') + '</span><input class="inp" type="password" data-ai-f="key" autocomplete="off" placeholder="' + (c.key ? '••••••••' : 'sk-…') + '" style="width:100%;margin-top:8px" aria-label="' + esc(t('ai.key')) + '"></label>' +
    '<button class="cell act" data-ai-act="ping">' + t('ai.ping') + '</button></div><p class="ftr keep">' + t('ai.keyHint') + '</p>' +
    '<div class="hdr">' + t('ai.access') + '</div><div class="group">' +
    Object.entries(LEVELS).map(([cat, vals]) => '<label class="cell"><span class="grow">' + t('ai.cat.' + cat) + '</span><select class="sortsel" data-ai-acc="' + cat + '" aria-label="' + esc(t('ai.cat.' + cat)) + '">' + vals.map((v) => '<option value="' + v + '"' + (c.access[cat] === v ? ' selected' : '') + '>' + lvlName(cat, v) + '</option>').join('') + '</select></label>').join('') + '</div>' +
    '<p class="ftr keep">' + t('ai.accHint') + '</p>' +
    (c.access.songs === 'write' ? '<div class="group"><div class="cell"><span class="grow">' + t('ai.auto') + '<span class="psub">' + t('ai.autoSub') + '</span></span>' + sw('auto', c.auto, t('ai.auto')) + '</div></div>' + (c.auto ? '<p class="ftr keep" style="color:var(--red)">' + t('ai.autoWarn') + '</p>' : '') : '') +
    '<div class="hdr">' + t('ai.instr') + '</div><div class="group"><label class="cell"><textarea class="inp" data-ai-f="instruction" rows="3" maxlength="2000" placeholder="' + esc(t('ai.instrPh')) + '" style="width:100%" aria-label="' + esc(t('ai.instr')) + '">' + esc(c.instruction) + '</textarea></label></div>' +
    '<div class="group"><button class="cell act" data-ai-act="open"' + (ai.ready() ? '' : ' disabled') + '>' + t('ai.open') + '</button><button class="cell act danger" data-ai-act="wipe">' + t('ai.wipe') + '</button></div>' +
    '<p class="ftr keep">' + t('ai.privacy') + '</p>';
  return h;
}

// Касания; true — обработано. openChat — функция открытия чата (импортируется лениво)
export function aiClick(app, target, rerender, openChat) {
  const ai = app.ai; let e;
  if ((e = target.closest('[data-ai-fmt]'))) { ai.save({ format: e.dataset.aiFmt }); rerender(); return true; }
  if ((e = target.closest('[data-ai-act]'))) {
    const a = e.dataset.aiAct;
    if (a === 'ping') { toast(t('ai.pinging')); ai.ping().then((r) => toast(r.ok ? t('ai.pingOk') : t('ai.err.' + r.kind) + (r.message ? ': ' + r.message : ''))); return true; }
    if (a === 'open') { openChat(); return true; }
    if (a === 'wipe') { confirm(t('ai.wipe'), t('ai.wipeAsk'), t('ai.wipeYes')).then((ok) => { if (ok) { ai.wipe(); toast(t('ai.wiped')); rerender(); } }); return true; }
  }
  return false;
}
export function aiChange(app, ev, rerender) {
  const ai = app.ai, el = ev.target;
  if (el.dataset && el.dataset.aiSw) { ai.save({ [el.dataset.aiSw]: el.checked }); rerender(); return true; }
  if (el.dataset && el.dataset.aiF) { const k = el.dataset.aiF; if (k === 'key' && !el.value.trim()) return true; ai.save({ [k]: el.value }); if (k === 'key') el.value = ''; rerender(); return true; }
  if (el.dataset && el.dataset.aiAcc) { ai.save({ access: { [el.dataset.aiAcc]: el.value } }); if (el.value !== 'write') ai.save({ auto: false }); rerender(); return true; }
  return false;
}
