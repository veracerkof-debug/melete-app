// Настройки «Нейросеть» (слово автора 23–25.11.2026): карточка состояния, подключение, доступ к данным по категориям, вложения,
// инструкция. Выключено по умолчанию. Ключ и история — только на этом устройстве, вне копий. Логика — core/ai/*.
// Вид: поля с рамкой и выравниванием влево (прежние поля настроек прижимали текст вправо — для адреса и ключа неудобно).
import { t } from '../../i18n/index.js';
import { esc, toast, confirm } from '../../ui/index.js';
import { checkUrl, FORMATS, LEVELS } from '../ai/config.js';
import { brandOf } from '../ai/brand.js';
import { badge, agentLabel } from './aichat.js';

const sw = (k, on, l) => '<label class="sw"><input type="checkbox" data-ai-sw="' + k + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(l) + '"><i></i></label>';
const field = (k, label, val, o = {}) => '<label class="aifield"><span>' + esc(label) + '</span>' + (o.area
  ? '<textarea class="ain" data-ai-f="' + k + '" rows="3" maxlength="2000" placeholder="' + esc(o.ph || '') + '" aria-label="' + esc(label) + '">' + esc(val) + '</textarea>'
  : '<input class="ain" ' + (o.type ? 'type="' + o.type + '" ' : '') + 'data-ai-f="' + k + '" ' + (o.mode ? 'inputmode="' + o.mode + '" ' : '') + 'autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(o.ph || '') + '" value="' + esc(val) + '" aria-label="' + esc(label) + '">') + '</label>';
const ICON = '<svg viewBox="0 0 24 24"><path d="M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>';

export function aiHTML(app) {
  const ai = app.ai, c = ai.cfg();
  if (!ai.avail) return '<div class="large">' + t('page.ai') + '</div><p class="ftr keep">' + t('ai.noPlatform') + '</p>';
  const u = c.url ? checkUrl(c.url) : { ok: true }, ok = ai.ready();
  let h = '<div class="large">' + t('page.ai') + '</div>' +
    '<div class="aistat' + (ok ? ' ok' : '') + '">' + (c.on && c.model ? badge(brandOf(c), 40) : '<i class="aiic" aria-hidden="true">' + ICON + '</i>') + '<span class="grow"><b>' + t(ok ? 'ai.st.ready' : c.on ? 'ai.st.setup' : 'ai.st.off') + '</b>' +
    '<span class="l2">' + (c.on && c.model ? esc(brandOf(c).name + ' · ' + c.model) : t('ai.intro.short')) + '</span></span>' +
    '<label class="sw"><input type="checkbox" data-ai-sw="on"' + (c.on ? ' checked' : '') + ' aria-label="' + esc(t('ai.on')) + '"><i></i></label></div>';
  if (!c.on) return h + '<p class="ftr keep">' + t('ai.intro') + '</p>';
  h += '<div class="group aicard"><button class="cell act aiopen" data-ai-act="open"' + (ok ? '' : ' disabled') + '>' + t('ai.open') + '</button></div>' +
    '<div class="hdr">' + t('ai.agents') + '</div><div class="group aicard">' +
    c.agents.map((a, i) => '<button class="cell aiagent' + (a.id === c.agent ? ' cur' : '') + '" data-ai-agent="' + a.id + '" aria-pressed="' + (a.id === c.agent) + '">' + badge(brandOf(a), 30) + '<span class="grow"><b>' + esc(agentLabel(a, i)) + '</b>' + (a.id === c.agent ? ' ✓' : '') + '<span class="psub">' + esc(brandOf(a).host || t('ai.agent.blank')) + '</span></span></button>').join('') +
    '<button class="cell act" data-ai-act="agentadd">' + t('ai.agent.add') + '</button></div><p class="ftr keep">' + t('ai.agent.hint') + '</p>' +
    '<div class="hdr">' + t('ai.conn') + '</div><div class="group aicard">' + field('name', t('ai.agent.name'), c.agents.find((a) => a.id === c.agent).name, { ph: t('ai.agent.namePh') }) +
    '<div class="aifield"><span>' + t('ai.format') + '</span><div class="seg aiseg2" role="group">' + FORMATS.map((f) => '<button type="button" data-ai-fmt="' + f + '" aria-pressed="' + (c.format === f) + '"' + (c.format === f ? ' class="on"' : '') + '>' + t('ai.fmt.' + f) + '</button>').join('') + '</div></div>' +
    field('url', t('ai.url'), c.url, { mode: 'url', ph: c.format === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1' }) +
    (!u.ok ? '<p class="aierrl">' + t('ai.url.' + u.why) + '</p>' : '') +
    field('model', t('ai.model'), c.model, { ph: c.format === 'anthropic' ? 'claude-haiku-5-5' : 'gpt-4o-mini' }) +
    field('key', t('ai.key'), '', { type: 'password', ph: c.key ? '••••••••••••  (' + t('ai.key.saved') + ')' : 'sk-…' }) +
    '<button class="cell act" data-ai-act="ping">' + t('ai.ping') + '</button>' +
    (c.agents.length > 1 ? '<button class="cell act danger" data-ai-act="agentdel">' + t('ai.agent.del') + '</button>' : '') + '<button class="cell act" data-ai-act="diag"><span class="grow">' + t('ai.diag') + '<span class="psub">' + t('ai.diag.sub') + '</span></span></button></div><p class="ftr keep">' + t('ai.keyHint') + '</p>' +
    '<div class="hdr">' + t('ai.access') + '</div><div class="group aicard">' +
    Object.entries(LEVELS).map(([cat, vals]) => '<div class="aifield"><span class="aicat"><b>' + t('ai.cat.' + cat) + '</b><i class="l2">' + t('ai.cat.' + cat + '.sub') + '</i></span><div class="seg aiseg2" role="group" aria-label="' + esc(t('ai.cat.' + cat)) + '">' +
      vals.map((v) => '<button type="button" data-ai-acc="' + cat + '" data-v="' + v + '" aria-pressed="' + (c.access[cat] === v) + '"' + (c.access[cat] === v ? ' class="on"' : '') + '>' + t('ai.lvl.' + v) + '</button>').join('') + '</div></div>').join('') + '</div>' +
    '<p class="ftr keep">' + t('ai.accHint') + '</p>' +
    ((c.access.songs === 'write' || c.access.media === 'write') ? '<div class="group aicard"><div class="cell"><span class="grow">' + t('ai.auto') + '<span class="psub">' + t('ai.autoSub') + '</span></span>' + sw('auto', c.auto, t('ai.auto')) + '</div></div>' + (c.auto ? '<p class="aierrl">' + t('ai.autoWarn') + '</p>' : '') : '') +
    '<div class="hdr">' + t('ai.att') + '</div><div class="group aicard">' +
    '<div class="cell"><span class="grow">' + t('ai.att.files') + '<span class="psub">' + t('ai.att.filesSub') + '</span></span>' + sw('att:files', c.attach.files, t('ai.att.files')) + '</div>' +
    '<div class="cell"><span class="grow">' + t('ai.att.links') + '<span class="psub">' + t('ai.att.linksSub') + '</span></span>' + sw('att:links', c.attach.links, t('ai.att.links')) + '</div></div>' +
    '<p class="ftr keep">' + t('ai.att.hint') + '</p>' +
    '<div class="hdr">' + t('ai.instr') + '</div><div class="group aicard">' + field('instruction', t('ai.instr'), c.instruction, { area: true, ph: t('ai.instrPh') }) + '</div>' +
    '<div class="group aicard"><button class="cell act danger" data-ai-act="wipe">' + t('ai.wipe') + '</button></div><p class="ftr keep">' + t('ai.privacy') + '</p>';
  return h;
}

// Касания; true — обработано. openChat — функция открытия чата (импортируется лениво)
export function aiClick(app, target, rerender, openChat) {
  const ai = app.ai; let e;
  if ((e = target.closest('[data-ai-agent]'))) { ai.selectAgent(e.dataset.aiAgent); rerender(); return true; }
  if ((e = target.closest('[data-ai-fmt]'))) { ai.save({ format: e.dataset.aiFmt }); rerender(); return true; }
  if ((e = target.closest('button[data-ai-acc]'))) {
    ai.save({ access: { [e.dataset.aiAcc]: e.dataset.v } }); if (ai.cfg().access.songs !== 'write' && ai.cfg().access.media !== 'write') ai.save({ auto: false }); rerender(); return true;
  }
  if ((e = target.closest('[data-ai-act]'))) {
    const a = e.dataset.aiAct;
    if (a === 'ping') { toast(t('ai.pinging')); ai.ping().then((r) => toast(r.ok ? t('ai.pingOk') : t('ai.err.' + r.kind) + (r.message ? ': ' + r.message : '') + ' — ' + t('ai.why.' + r.kind))); return true; }
    if (a === 'diag') { import('./aidiag.js').then((m) => m.openDiag(app)); return true; }
    if (a === 'agentadd') { ai.addAgent(); rerender(); return true; }
    if (a === 'agentdel') { confirm(t('ai.agent.del'), t('ai.agent.delAsk'), t('ai.agent.delYes')).then((ok) => { if (ok) { ai.removeAgent(ai.cfg().agent); rerender(); } }); return true; }
    if (a === 'open') { openChat(); return true; }
    if (a === 'wipe') { confirm(t('ai.wipe'), t('ai.wipeAsk'), t('ai.wipeYes')).then((ok) => { if (ok) { ai.wipe(); toast(t('ai.wiped')); rerender(); } }); return true; }
  }
  return false;
}
export function aiChange(app, ev, rerender) {
  const ai = app.ai, el = ev.target;
  if (el.dataset && el.dataset.aiSw) {
    const k = el.dataset.aiSw;
    if (k.startsWith('att:')) ai.save({ attach: { ...ai.cfg().attach, [k.slice(4)]: el.checked } }); else ai.save({ [k]: el.checked });
    rerender(); return true;
  }
  if (el.dataset && el.dataset.aiF) { const k = el.dataset.aiF; if (k === 'key' && !el.value.trim()) return true; ai.save({ [k]: el.value }); if (k === 'key') el.value = ''; rerender(); return true; }
  return false;
}
