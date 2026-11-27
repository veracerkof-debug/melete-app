// Экран чата с нейросетью (слово автора 23–25.11.2026): шторка на весь экран, закрыть — смахнуть вниз. Лента: реплики, карточки
// предложений «Применить / Отклонить», у применённого — «Отменить». Над вводом видно, что уйдёт в запрос. Логика — core/ai/chat.js.
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, toast, confirm } from '../../ui/index.js';
import { describe as describeP } from '../ai/proposals.js';
import { mascotName } from '../ai/index.js';
import { LIMITS } from '../ai/attach.js';
import { brandOf } from '../ai/brand.js';
import { TASKS } from '../../music/anaai.js';

// Значок нейросети: свой кружок с буквой, цвет по фирме (официальных логотипов нет — товарные знаки)
export const badge = (b, size = 28) => '<i class="aibadge" style="--bh:' + b.hue + ';--bs:' + size + 'px" aria-hidden="true">' + esc(b.mark) + '</i>';

const CLIP = '<svg viewBox="0 0 24 24"><path d="M8.5 12.5l6-6a3.2 3.2 0 0 1 4.5 4.5l-8.2 8.2a5 5 0 0 1-7-7l7.6-7.6"/></svg>';
const COPY = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>';
const PASTE = '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9.5 12h5M9.5 16h3"/></svg>';
const LINK = '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
const ACCEPT = 'text/*,.txt,.md,.csv,.json,.html,.htm,.docx,.pdf,.cho,.chopro,.crd,.lrc,image/png,image/jpeg,image/webp,image/gif';

const nl = (s) => esc(s).replace(/\n/g, '<br>');
const CATS = { songs: 'ai.cat.songs', media: 'ai.cat.media', studio: 'ai.cat.studio', stats: 'ai.cat.stats', log: 'ai.cat.log' };
const STUDIO_CHIPS = ['ai.studio.chip1', 'ai.studio.chip2', 'ai.studio.chip3', 'ai.studio.chip4'];
// копирование: Clipboard API, а где его нет (WebView без жеста) — через выделение
const copyText = async (txt) => { try { await navigator.clipboard.writeText(txt); return true; } catch { try { const a = document.createElement('textarea'); a.value = txt; a.style.cssText = 'position:fixed;left:-999px;top:0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return !!ok; } catch { return false; } } };

function propHTML(m, p, songs, recs = [], show = null) {
  const lines = describeP(p, songs, recs, show), head = t('ai.prop.' + p.kind);
  const st = p.status;
  const body = '<div class="aipl">' + lines.slice(0, 12).map((x) => '<span>' + esc(x) + '</span>').join('') + (lines.length > 12 ? '<span class="l2">' + t('ai.more', { n: lines.length - 12 }) + '</span>' : '') + '</div>';
  const btns = st === 'pending' && p.kind === 'query' ? '<div class="aipb"><button class="link b" data-ai="qcopy" data-m="' + m.id + '" data-p="' + p.id + '">' + t('ai.studio.qcopy') + '</button><button class="link" data-ai="reject" data-m="' + m.id + '" data-p="' + p.id + '">' + t('ai.hide') + '</button></div>'
    : st === 'pending' ? '<div class="aipb"><button class="link b" data-ai="apply" data-m="' + m.id + '" data-p="' + p.id + '">' + t('ai.apply') + '</button><button class="link" data-ai="reject" data-m="' + m.id + '" data-p="' + p.id + '">' + t('ai.reject') + '</button></div>'
    : st === 'applied' ? '<div class="aipb"><span class="l2">✓ ' + t('ai.applied', { n: p.n || 0 }) + '</span>' + (p.undo ? '<button class="link" data-ai="undo" data-m="' + m.id + '" data-p="' + p.id + '">' + t('ai.undo') + '</button>' : '') + '</div>'
    : '<div class="aipb"><span class="l2">' + t('ai.st.' + st) + '</span></div>';
  return '<div class="aip' + (st === 'pending' ? ' pend' : '') + '"><b>' + esc(head) + '</b>' + (st === 'blocked' || (st === 'invalid' && !(p.errors && p.errors.length)) ? '' : body) + btns + '</div>';
}

export async function openChat(app, { onSettings = () => {}, studio = false, rec = null } = {}) {
  // из студии: ИИ видит проект студии и предлагает партии (слово автора 26.11.2026); сначала — разрешение, один раз
  if (studio && (app.ai.cfg().access.studio || 'none') === 'none') {
    const ok = await confirm(t('ai.studio.askTitle'), t('ai.studio.askText'), t('ai.studio.askYes'));
    if (!ok) return;
    app.ai.save({ access: { studio: 'write' } });
  }
  // «Улучшить разбор» (слово автора 26.11.2026): одна запись — сжатая сводка по тактам; правки по тактам с пометкой «от ИИ»
  const recRec = rec && app.files ? app.files.get(rec) : null;
  if (rec && !recRec) return;
  if (rec && (app.ai.cfg().access.media || 'none') !== 'write') {
    const ok = await confirm(t('ai.rec.askTitle'), t('ai.rec.askText'), t('ai.rec.askYes'));
    if (!ok) return;
    app.ai.save({ access: { media: 'write' } });
  }
  if (rec) app.aiFocus = { rec };
  const manual = studio || !!rec, chat = app.ai.chat(), name = mascotName();
  let off = null, draft = '', atts = [], reading = 0, linkOpen = false;
  const GEAR = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  const html = () => snav(name, { left: '<button class="ic sm" data-ai="settings" aria-label="' + esc(t('ai.settingsBtn')) + '">' + GEAR + '</button>' }) + '<div class="aibrand" data-aibrand></div><div class="aichat' + (manual ? ' studio' : '') + '"><div class="aimsgs" data-aimsgs role="log" aria-live="polite"></div>' +
    '<div class="aiatt" data-aiatt></div><div class="aictx" data-aictx></div><div class="aiin"><div class="aitools" data-aitools></div><textarea class="inp left" data-aiin rows="1" maxlength="4000" placeholder="' + esc(t('ai.ph')) + '" aria-label="' + esc(t('ai.ph')) + '"></textarea><button class="hcta aisend" data-ai="send" aria-label="' + esc(t('ai.send')) + '"><svg viewBox="0 0 24 24"><path d="M4 12l16-7-6 16-3-6z"/></svg></button></div><input type="file" data-aifile multiple hidden accept="' + ACCEPT + '"></div>';
  sheet(html, (el) => {
    const brandEl = el.querySelector('[data-aibrand]');
    const drawBrand = () => { if (manual && !app.ai.ready()) { brandEl.innerHTML = '<span class="aibn"><b>' + esc(t('ai.studio.manual')) + '</b><i>' + esc(t('ai.studio.manualSub')) + '</i></span>'; return; } const b = brandOf(app.ai.cfg()); brandEl.innerHTML = badge(b, 28) + '<span class="aibn"><b>' + t('ai.by', { name: esc(b.name) }) + '</b><i>' + esc(b.model || b.host || '—') + '</i></span>'; };
    const list = el.querySelector('[data-aimsgs]'), ctx = el.querySelector('[data-aictx]'), ta = el.querySelector('[data-aiin]'), chips = el.querySelector('[data-aiatt]'), tools = el.querySelector('[data-aitools]'), fin = el.querySelector('[data-aifile]');
    const drawAtt = () => {
      const c = app.ai.cfg();
      tools.innerHTML = (manual ? '<button class="ic sm aitool" data-ai="copyprompt" aria-label="' + esc(t('ai.studio.copy')) + '" title="' + esc(t('ai.studio.copy')) + '">' + COPY + '</button><button class="ic sm aitool" data-ai="paste" aria-label="' + esc(t('ai.studio.paste')) + '" title="' + esc(t('ai.studio.paste')) + '">' + PASTE + '</button>' : '') + (c.attach.files ? '<button class="ic sm aitool" data-ai="file" aria-label="' + esc(t('ai.att.addFile')) + '"' + (chat.busy ? ' disabled' : '') + '>' + CLIP + '</button>' : '') +
        (c.attach.links ? '<button class="ic sm aitool' + (linkOpen ? ' on' : '') + '" data-ai="link" aria-label="' + esc(t('ai.att.addLink')) + '"' + (chat.busy ? ' disabled' : '') + '>' + LINK + '</button>' : '');
      chips.innerHTML = (linkOpen ? '<div class="ailink"><input class="ain" data-ailink inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://…" aria-label="' + esc(t('ai.att.addLink')) + '"><button class="link b" data-ai="linkgo">' + t('ai.att.add') + '</button></div>' : '') +
        (atts.length || reading ? '<div class="aichips">' + atts.map((a) => '<span class="aichip"><b>' + esc(a.name) + '</b><i>' + (a.kind === 'image' ? t('ai.att.image') : t('ai.att.chars', { n: a.chars }) + (a.trimmed ? ' · ' + t('ai.att.cut') : '')) + '</i><button data-ai="rm" data-id="' + a.id + '" aria-label="' + esc(t('ai.att.rm')) + '">✕</button></span>').join('') + (reading ? '<span class="aichip"><i>' + t('ai.att.reading') + '</i></span>' : '') + '</div>' : '');
    };
    const attErr = (e) => toast(t('ai.att.err.' + ((e && e.kind) || 'type')) + (e && e.kind === 'http' && e.status ? ' (' + e.status + ')' : ''));
    const addFiles = async (files) => {
      for (const f of files) {
        if (atts.length + reading >= LIMITS.files) { toast(t('ai.att.err.many', { n: LIMITS.files })); break; }
        reading++; drawAtt();
        try { atts.push(await app.ai.attachFile(f)); } catch (e) { attErr(e); }
        reading--; drawAtt(); draw();
      }
    };
    const draw = () => {
      drawBrand();
      const songs = app.store.state.songs || [], recs = app.files ? app.files.list('audio') : [], msgs = chat.messages;
      const keepTop = list.scrollTop, atEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 80 || !list.dataset.drawn, seen = +list.dataset.n || 0;
      list.innerHTML = (msgs.length ? '' : '<p class="aihint">' + t(rec ? 'ai.rec.hello' : studio ? 'ai.studio.hello' : 'ai.hello', { name, file: recRec ? recRec.name : '' }) + '</p>' + (rec ? '<div class="aichips2">' + TASKS.map((k) => '<button class="sgchip aich" data-ai="chip" data-t="' + esc(t('ai.task.' + k.id + '.tz')) + '">' + esc(t('ai.task.' + k.id)) + '</button>').join('') + '</div>' : studio ? '<div class="aichips2">' + STUDIO_CHIPS.map((k) => '<button class="sgchip aich" data-ai="chip" data-t="' + esc(t(k)) + '">' + esc(t(k)) + '</button>').join('') + '</div>' : '')) + msgs.map((m) => (m.role === 'tool' ? '<div class="aim t">⟳ ' + esc(t('ai.tool.sent', { what: m.text })) + '</div>' : m.text ? '<div class="aim ' + (m.role === 'user' ? 'u' : 'a') + '">' + (m.role === 'user' ? '' : '<span class="aiwho">' + (m.pasted ? esc(t('ai.studio.pastedWho')) : badge(brandOf(app.ai.cfg()), 18) + esc(brandOf(app.ai.cfg()).name)) + '</span>') + nl(m.text) + (m.att && m.att.length ? '<div class="aiatl">' + m.att.map((a) => '📎 ' + esc(a.name)).join('<br>') + '</div>' : '') + '</div>' : '') + (m.proposals || []).map((p) => propHTML(m, p, songs, recs, app.device && app.device.show)).join('')).join('') +
        (chat.busy ? '<div class="aim a think" aria-label="' + esc(t('ai.thinking')) + '"><i></i><i></i><i></i></div>' : '') +
        (chat.error ? '<div class="aierr"><span>' + esc(t('ai.err.' + chat.error.kind) + (chat.error.message ? ' — ' + chat.error.message : '')) + '</span><span class="l2">' + esc(t('ai.why.' + chat.error.kind)) + '</span><button class="link b" data-ai="why">' + t('ai.why.btn') + '</button><button class="link b" data-ai="retry">' + t('ai.retry') + '</button><button class="link" data-ai="dismiss">' + t('ai.close') + '</button></div>' : '');
      // лента прыгает вниз только если читали конец или пришло новое сообщение; листание вверх не сбрасывается перерисовкой
      list.scrollTop = atEnd || msgs.length !== seen || chat.busy ? list.scrollHeight : keepTop;
      list.dataset.drawn = '1'; list.dataset.n = String(msgs.length);
      const pv = chat.preview(atts);
      const cats = pv.parts.map((p) => t(CATS[p.cat])).concat(atts.length ? [t('ai.ctx.att', { n: atts.length })] : []);
      ctx.innerHTML = (cats.length ? t('ai.ctx', { cats: cats.join(', '), n: pv.tokens }) : t('ai.ctxNone')) + ' · <button class="link" data-ai="settings">' + t('ai.access') + '</button>';
      drawAtt();
      el.querySelector('[data-ai="send"]').disabled = chat.busy || (manual && !app.ai.ready());
    };
    off = chat.subscribe(draw); draw();
    // поле ввода — одна строка, растёт по тексту до разумного предела (≈ 30 % видимой высоты, не больше 160 px), дальше прокручивается
    const grow = () => {
      const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight || 600, max = Math.max(88, Math.min(160, vh * 0.3));
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight + 2, max) + 'px';
      ta.style.overflowY = ta.scrollHeight + 2 > max ? 'auto' : 'hidden';
    };
    ta.addEventListener('input', grow); grow();
    const send = async () => {
      const v = ta.value.trim(); if ((!v && !atts.length) || chat.busy) return;
      draft = v; ta.value = ''; grow();
      const r = await chat.sendText(v, atts);
      if (r.ok) { atts = []; linkOpen = false; draw(); } else if (r.why === 'config') toast(t('ai.err.config'));
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ai]'); if (!b) return;
      const a = b.dataset.ai;
      if (a === 'send') send();
      else if (a === 'file') fin.click();
      else if (a === 'link') { linkOpen = !linkOpen; drawAtt(); const i = el.querySelector('[data-ailink]'); if (i) i.focus(); }
      else if (a === 'linkgo') {
        const i = el.querySelector('[data-ailink]'), v = i && i.value.trim(); if (!v) return;
        if (atts.length + reading >= LIMITS.files) { toast(t('ai.att.err.many', { n: LIMITS.files })); return; }
        reading++; drawAtt(); toast(t('ai.att.opening'));
        app.ai.attachUrl(v).then((a2) => { atts.push(a2); linkOpen = false; }).catch(attErr).finally(() => { reading--; drawAtt(); draw(); });
      }
      else if (a === 'rm') { atts = atts.filter((x) => x.id !== b.dataset.id); drawAtt(); draw(); }
      else if (a === 'apply') chat.apply(b.dataset.m, b.dataset.p).then((ok) => { if (!ok) toast(t('ai.st.failed')); });
      else if (a === 'reject') chat.reject(b.dataset.m, b.dataset.p);
      else if (a === 'undo') { if (chat.undo(b.dataset.m, b.dataset.p)) toast(t('ai.undone')); }
      else if (a === 'retry') { chat.dismissError(); ta.value = draft; grow(); send(); }
      else if (a === 'dismiss') chat.dismissError();
      else if (a === 'why') import('./aidiag.js').then((m) => m.openDiag(app));
      else if (a === 'settings') onSettings();
      else if (a === 'chip') { ta.value = b.dataset.t || ''; grow(); ta.focus(); }
      else if (a === 'copyprompt') {
        const v = ta.value.trim() || (rec ? t('ai.task.chords.tz') : t('ai.studio.chip1'));
        copyText(chat.buildPrompt(v)).then((ok) => toast(t(ok ? 'ai.studio.copied' : 'ai.studio.copyFail')));
      }
      else if (a === 'paste') pasteSheet();
      else if (a === 'qcopy') { const txt = chat.answerQuery(b.dataset.m, b.dataset.p); if (txt) copyText(txt).then((ok) => toast(t(ok ? 'ai.studio.qcopied' : 'ai.studio.copyFail'))); }
    });
    // вставка ответа любой нейросети: текстовое поле (системное меню «Вставить» работает всегда), разбор — как у обычного ответа
    const pasteSheet = () => {
      sheet(() => snav(t('ai.studio.paste'), { right: '<button class="link b r" data-pgo>' + esc(t('ai.studio.parse')) + '</button>' }) + '<p class="ftr" style="margin-top:0">' + esc(t('ai.studio.pasteHint')) + '</p><div class="group"><textarea class="inp left" data-pta rows="9" style="width:100%;min-height:180px" aria-label="' + esc(t('ai.studio.paste')) + '"></textarea></div>', (pe, psh) => {
        pe.addEventListener('click', (e) => {
          if (!e.target.closest('[data-pgo]')) return;
          const r = chat.addReply(pe.querySelector('[data-pta]').value);
          if (!r.ok) { toast(t('ai.studio.pasteEmpty')); return; }
          psh.close(); toast(t(r.n ? 'ai.studio.parsed' : 'ai.studio.noBlock'));
        });
      });
    };
    fin.addEventListener('change', () => { const fs = [...fin.files]; fin.value = ''; addFiles(fs); });
  }, { onClose: () => { if (off) off(); if (rec && app.aiFocus && app.aiFocus.rec === rec) app.aiFocus = null; } });
}
