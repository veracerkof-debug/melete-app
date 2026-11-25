// Сессия чата: история на устройстве (вне копий), запрос к модели, предложения, «Применить / Отклонить / Отменить».
// Зависимости передаются (для тестов): cfg() — настройки, data() — данные для контекста, post(req) → { status, data }.
// Чат работает вне звукового тракта: ничего не трогает в воспроизведении и записи (третий принцип).
import { buildRequest, parseResponse } from './provider.js';
import { buildSystem, buildContext, tokensOf } from './context.js';
import { extract, apply, undo } from './proposals.js';
import { canWrite, ready, KEY } from './config.js';
import { textBlock, imagesOf, textChars } from './attach.js';

export const HISTORY_MAX = 40, TURNS = 16, SAVE_MAX = 250_000;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function createChat({ app, cfg, data, post, storage = globalThis.localStorage, mascot = () => 'Мелета', lang = () => 'ru', now = () => Date.now() }) {
  const SK = KEY + '.chat', subs = new Set();
  let messages = [], busy = false, error = null;
  try { const j = JSON.parse(storage.getItem(SK)); if (Array.isArray(j)) messages = j.slice(-HISTORY_MAX); } catch { /* пусто */ }
  const emit = () => subs.forEach((f) => { try { f(); } catch (e) { (globalThis.reportError || console.error)(e); } });
  const persist = () => {
    let s = JSON.stringify(messages.slice(-HISTORY_MAX));
    if (s.length > SAVE_MAX) s = JSON.stringify(messages.slice(-HISTORY_MAX).map((m) => ({ ...m, proposals: (m.proposals || []).map(({ undo: _u, ...p }) => p) })));
    try { storage.setItem(SK, s); } catch { /* места нет — история только в памяти */ }
  };
  const find = (mid, pidv) => { const m = messages.find((x) => x.id === mid), p = m && (m.proposals || []).find((x) => x.id === pidv); return m && p ? { m, p } : null; };

  // Что уйдёт в запрос: размер видно заранее
  function preview(atts = []) { const c = buildContext(cfg(), data()), ac = textChars(atts); return { parts: c.parts, chars: c.chars + ac, tokens: tokensOf(c.chars + ac), attChars: ac, images: imagesOf(atts).length }; }

  async function applyProposal(mid, pidv) {
    const f = find(mid, pidv); if (!f || f.p.status !== 'pending') return false;
    const r = await apply(app, f.p);
    if (r.ok) { f.p.status = 'applied'; f.p.undo = r.undo; f.p.n = r.n; } else f.p.status = r.why === 'none' ? 'invalid' : 'failed';
    persist(); emit(); return r.ok;
  }
  const rejectProposal = (mid, pidv) => { const f = find(mid, pidv); if (!f || f.p.status !== 'pending') return false; f.p.status = 'rejected'; persist(); emit(); return true; };
  function undoProposal(mid, pidv) { const f = find(mid, pidv); if (!f || f.p.status !== 'applied') return false; const ok = undo(app, f.p.undo); if (ok) { f.p.status = 'undone'; delete f.p.undo; persist(); emit(); } return ok; }

  // atts — вложения этого сообщения (attach.js): текст уходит блоками в сообщении, картинки — частями; в истории остаётся только пометка
  async function sendText(text, atts = []) {
    const c = cfg(), t = String(text || '').trim() || (atts.length ? 'Разбери приложенное.' : '');
    if (!t || busy) return { ok: false, why: busy ? 'busy' : 'empty' };
    if (!ready(c)) return { ok: false, why: 'config' };
    messages.push({ id: uid(), role: 'user', text: t, at: now(), ...(atts.length ? { att: atts.map((a) => ({ name: a.name, kind: a.kind, chars: a.chars || 0 })) } : {}) }); busy = true; error = null; persist(); emit();
    try {
      const ctx = buildContext(c, data()), sys = buildSystem(c, { mascot: mascot(), lang: lang(), now: now() }) + (ctx.text ? '\n\n=== ДАННЫЕ ===\n' + ctx.text : '');
      const past = messages.slice(-TURNS * 2), last = past.length - 1;
      const hist = past.map((m, i) => (i === last && atts.length ? { role: m.role, content: m.text + (textBlock(atts) ? '\n\n' + textBlock(atts) : ''), images: imagesOf(atts) } : { role: m.role, content: m.text + (m.att && m.att.length ? '\n[вложения были: ' + m.att.map((a) => a.name).join(', ') + ']' : '') }));
      const res = await post(buildRequest(c, { system: sys, messages: hist }));
      const out = parseResponse(c, res.status, res.data);
      if (!out.ok) { error = { kind: out.kind, message: out.message }; return { ok: false, why: out.kind }; }
      const ex = extract(out.text, c), msg = { id: uid(), role: 'assistant', text: ex.text || (ex.proposals.length ? '' : out.text), at: now(), proposals: ex.proposals };
      messages.push(msg);
      // полностью автоматический режим — отдельная галочка с предупреждением: применяется сразу, остаётся «Отменить»
      if (c.auto && canWrite(c, 'songs')) for (const p of msg.proposals) if (p.status === 'pending') await applyProposal(msg.id, p.id);
      return { ok: true };
    } catch (e) { error = { kind: (e && e.kind) || 'net', message: String((e && e.message) || '').slice(0, 200) }; return { ok: false, why: error.kind }; }
    finally { busy = false; persist(); emit(); }
  }
  return {
    get messages() { return messages; }, get busy() { return busy; }, get error() { return error; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    preview, sendText, apply: applyProposal, reject: rejectProposal, undo: undoProposal,
    clear() { messages = []; error = null; persist(); emit(); },
    dismissError() { error = null; emit(); },
  };
}
