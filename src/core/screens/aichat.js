// Экран чата с нейросетью (слово автора 23–25.11.2026): шторка на весь экран, закрыть — смахнуть вниз. Лента: реплики, карточки
// предложений «Применить / Отклонить», у применённого — «Отменить». Над вводом видно, что уйдёт в запрос. Логика — core/ai/chat.js.
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, toast } from '../../ui/index.js';
import { describe as describeP } from '../ai/proposals.js';
import { mascotName } from '../ai/index.js';
import { LIMITS } from '../ai/attach.js';

const CLIP = '<svg viewBox="0 0 24 24"><path d="M8.5 12.5l6-6a3.2 3.2 0 0 1 4.5 4.5l-8.2 8.2a5 5 0 0 1-7-7l7.6-7.6"/></svg>';
const LINK = '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
const ACCEPT = 'text/*,.txt,.md,.csv,.json,.html,.htm,.docx,.pdf,.cho,.chopro,.crd,.lrc,image/png,image/jpeg,image/webp,image/gif';

const nl = (s) => esc(s).replace(/\n/g, '<br>');
const CATS = { songs: 'ai.cat.songs', stats: 'ai.cat.stats', log: 'ai.cat.log' };

function propHTML(m, p, songs) {
  const lines = describeP(p, songs), head = t('ai.prop.' + p.kind);
  const st = p.status;
  const body = '<div class="aipl">' + lines.slice(0, 12).map((x) => '<span>' + esc(x) + '</span>').join('') + (lines.length > 12 ? '<span class="l2">' + t('ai.more', { n: lines.length - 12 }) + '</span>' : '') + '</div>';
  const btns = st === 'pending' ? '<div class="aipb"><button class="link b" data-ai="apply" data-m="' + m.id + '" data-p="' + p.id + '">' + t('ai.apply') + '</button><button class="link" data-ai="reject" data-m="' + m.id + '" data-p="' + p.id + '">' + t('ai.reject') + '</button></div>'
    : st === 'applied' ? '<div class="aipb"><span class="l2">✓ ' + t('ai.applied', { n: p.n || 0 }) + '</span>' + (p.undo ? '<button class="link" data-ai="undo" data-m="' + m.id + '" data-p="' + p.id + '">' + t('ai.undo') + '</button>' : '') + '</div>'
    : '<div class="aipb"><span class="l2">' + t('ai.st.' + st) + '</span></div>';
  return '<div class="aip' + (st === 'pending' ? ' pend' : '') + '"><b>' + esc(head) + '</b>' + (st === 'invalid' || st === 'blocked' ? '' : body) + btns + '</div>';
}

export function openChat(app, { onSettings = () => {} } = {}) {
  const chat = app.ai.chat(), name = mascotName();
  let off = null, draft = '', atts = [], reading = 0, linkOpen = false;
  const html = () => snav(name) + '<div class="aichat"><div class="aimsgs" data-aimsgs role="log" aria-live="polite"></div>' +
    '<div class="aiatt" data-aiatt></div><div class="aictx" data-aictx></div><div class="aiin"><div class="aitools" data-aitools></div><textarea class="inp left" data-aiin rows="2" maxlength="4000" placeholder="' + esc(t('ai.ph')) + '" aria-label="' + esc(t('ai.ph')) + '"></textarea><button class="hcta aisend" data-ai="send" aria-label="' + esc(t('ai.send')) + '"><svg viewBox="0 0 24 24"><path d="M4 12l16-7-6 16-3-6z"/></svg></button></div><input type="file" data-aifile multiple hidden accept="' + ACCEPT + '"></div>';
  sheet(html, (el) => {
    const list = el.querySelector('[data-aimsgs]'), ctx = el.querySelector('[data-aictx]'), ta = el.querySelector('[data-aiin]'), chips = el.querySelector('[data-aiatt]'), tools = el.querySelector('[data-aitools]'), fin = el.querySelector('[data-aifile]');
    const drawAtt = () => {
      const c = app.ai.cfg();
      tools.innerHTML = (c.attach.files ? '<button class="ic sm aitool" data-ai="file" aria-label="' + esc(t('ai.att.addFile')) + '"' + (chat.busy ? ' disabled' : '') + '>' + CLIP + '</button>' : '') +
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
      const songs = app.store.state.songs || [], msgs = chat.messages;
      list.innerHTML = (msgs.length ? '' : '<p class="aihint">' + t('ai.hello', { name }) + '</p>') + msgs.map((m) => (m.text ? '<div class="aim ' + (m.role === 'user' ? 'u' : 'a') + '">' + nl(m.text) + (m.att && m.att.length ? '<div class="aiatl">' + m.att.map((a) => '📎 ' + esc(a.name)).join('<br>') + '</div>' : '') + '</div>' : '') + (m.proposals || []).map((p) => propHTML(m, p, songs)).join('')).join('') +
        (chat.busy ? '<div class="aim a think" aria-label="' + esc(t('ai.thinking')) + '"><i></i><i></i><i></i></div>' : '') +
        (chat.error ? '<div class="aierr"><span>' + esc(t('ai.err.' + chat.error.kind) + (chat.error.message ? ' — ' + chat.error.message : '')) + '</span><button class="link b" data-ai="retry">' + t('ai.retry') + '</button><button class="link" data-ai="dismiss">' + t('ai.close') + '</button></div>' : '');
      list.scrollTop = list.scrollHeight;
      const pv = chat.preview(atts);
      const cats = pv.parts.map((p) => t(CATS[p.cat])).concat(atts.length ? [t('ai.ctx.att', { n: atts.length })] : []);
      ctx.innerHTML = (cats.length ? t('ai.ctx', { cats: cats.join(', '), n: pv.tokens }) : t('ai.ctxNone')) + ' · <button class="link" data-ai="settings">' + t('ai.access') + '</button>';
      drawAtt();
      el.querySelector('[data-ai="send"]').disabled = chat.busy;
    };
    off = chat.subscribe(draw); draw();
    const send = async () => {
      const v = ta.value.trim(); if ((!v && !atts.length) || chat.busy) return;
      draft = v; ta.value = '';
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
      else if (a === 'retry') { chat.dismissError(); ta.value = draft; send(); }
      else if (a === 'dismiss') chat.dismissError();
      else if (a === 'settings') onSettings();
    });
    fin.addEventListener('change', () => { const fs = [...fin.files]; fin.value = ''; addFiles(fs); });
  }, { onClose: () => { if (off) off(); } });
}
