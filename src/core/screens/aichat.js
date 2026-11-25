// Экран чата с нейросетью (слово автора 23–25.11.2026): шторка на весь экран, закрыть — смахнуть вниз. Лента: реплики, карточки
// предложений «Применить / Отклонить», у применённого — «Отменить». Над вводом видно, что уйдёт в запрос. Логика — core/ai/chat.js.
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, toast } from '../../ui/index.js';
import { describe as describeP } from '../ai/proposals.js';
import { mascotName } from '../ai/index.js';

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
  let off = null, draft = '';
  const html = () => snav(name) + '<div class="aichat"><div class="aimsgs" data-aimsgs role="log" aria-live="polite"></div>' +
    '<div class="aictx" data-aictx></div><div class="aiin"><textarea class="inp" data-aiin rows="2" maxlength="4000" placeholder="' + esc(t('ai.ph')) + '" aria-label="' + esc(t('ai.ph')) + '"></textarea><button class="hcta aisend" data-ai="send" aria-label="' + esc(t('ai.send')) + '"><svg viewBox="0 0 24 24"><path d="M4 12l16-7-6 16-3-6z"/></svg></button></div></div>';
  sheet(html, (el) => {
    const list = el.querySelector('[data-aimsgs]'), ctx = el.querySelector('[data-aictx]'), ta = el.querySelector('[data-aiin]');
    const draw = () => {
      const songs = app.store.state.songs || [], msgs = chat.messages;
      list.innerHTML = (msgs.length ? '' : '<p class="aihint">' + t('ai.hello', { name }) + '</p>') + msgs.map((m) => (m.text ? '<div class="aim ' + (m.role === 'user' ? 'u' : 'a') + '">' + nl(m.text) + '</div>' : '') + (m.proposals || []).map((p) => propHTML(m, p, songs)).join('')).join('') +
        (chat.busy ? '<div class="aim a think" aria-label="' + esc(t('ai.thinking')) + '"><i></i><i></i><i></i></div>' : '') +
        (chat.error ? '<div class="aierr"><span>' + esc(t('ai.err.' + chat.error.kind) + (chat.error.message ? ' — ' + chat.error.message : '')) + '</span><button class="link b" data-ai="retry">' + t('ai.retry') + '</button><button class="link" data-ai="dismiss">' + t('ai.close') + '</button></div>' : '');
      list.scrollTop = list.scrollHeight;
      const pv = chat.preview();
      ctx.innerHTML = pv.parts.length ? t('ai.ctx', { cats: pv.parts.map((p) => t(CATS[p.cat])).join(', '), n: pv.tokens }) + ' · <button class="link" data-ai="settings">' + t('ai.access') + '</button>' : t('ai.ctxNone') + ' · <button class="link" data-ai="settings">' + t('ai.access') + '</button>';
      el.querySelector('[data-ai="send"]').disabled = chat.busy;
    };
    off = chat.subscribe(draw); draw();
    const send = async () => {
      const v = ta.value.trim(); if (!v || chat.busy) return;
      draft = v; ta.value = '';
      const r = await chat.sendText(v);
      if (!r.ok && r.why === 'config') toast(t('ai.err.config'));
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ai]'); if (!b) return;
      const a = b.dataset.ai;
      if (a === 'send') send();
      else if (a === 'apply') chat.apply(b.dataset.m, b.dataset.p).then((ok) => { if (!ok) toast(t('ai.st.failed')); });
      else if (a === 'reject') chat.reject(b.dataset.m, b.dataset.p);
      else if (a === 'undo') { if (chat.undo(b.dataset.m, b.dataset.p)) toast(t('ai.undone')); }
      else if (a === 'retry') { chat.dismissError(); ta.value = draft; send(); }
      else if (a === 'dismiss') chat.dismissError();
      else if (a === 'settings') onSettings();
    });
  }, { onClose: () => { if (off) off(); } });
}
