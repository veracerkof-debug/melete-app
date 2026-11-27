// Сессия чата: история на устройстве (вне копий), запрос к модели, предложения, «Применить / Отклонить / Отменить».
// Зависимости передаются (для тестов): cfg() — настройки, data() — данные для контекста, post(req) → { status, data }.
// Чат работает вне звукового тракта: ничего не трогает в воспроизведении и записи (третий принцип).
import { buildRequest, parseResponse } from './provider.js';
import { buildSystem, buildContext, tokensOf } from './context.js';
import { extract, apply, undo } from './proposals.js';
import { canWrite, ready, KEY } from './config.js';
import { textBlock, imagesOf, textChars } from './attach.js';
import { answerQueries, describeQueries, ROUNDS_MAX } from './queries.js';

export const HISTORY_MAX = 40, TURNS = 16, SAVE_MAX = 250_000;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// sk — ключ хранилища истории этого чата (у каждого чата свой; первый — прежний melete.ai.chat)
export function createChat({ app, cfg, data, post, storage = globalThis.localStorage, mascot = () => 'Мелета', lang = () => 'ru', now = () => Date.now(), sk = null }) {
  const SK = sk || KEY + '.chat', subs = new Set();
  let messages = [], busy = false, error = null;
  try { const j = JSON.parse(storage.getItem(SK)); if (Array.isArray(j)) messages = j.slice(-HISTORY_MAX); } catch { /* пусто */ }
  const emit = () => subs.forEach((f) => { try { f(); } catch (e) { (globalThis.reportError || console.error)(e); } });
  const persist = () => {
    let s = JSON.stringify(messages.slice(-HISTORY_MAX).map((m) => (m.role === 'tool' && m.result && m.result.length > 4000 ? { ...m, result: m.result.slice(0, 4000) + '\n… (в истории обрезано)' } : m)));
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
    const userId = messages[messages.length - 1].id;
    try {
      // круги: ИИ просит данные (melete-query) — приложение отвечает само (только чтение) и ИИ продолжает; не больше ROUNDS_MAX кругов
      for (let round = 0; ; round++) {
        const ctx = buildContext(c, data()), sys = buildSystem(c, { mascot: mascot(), lang: lang(), now: now() }) + (ctx.text ? '\n\n=== ДАННЫЕ ===\n' + ctx.text : '');
        const past = messages.slice(-TURNS * 2);
        const hist = past.map((m) => (m.role === 'tool' ? { role: 'user', content: '=== ОТВЕТ ПРИЛОЖЕНИЯ НА ЗАПРОСЫ ===\n' + (m.result || '') }
          : m.id === userId && atts.length ? { role: m.role, content: m.text + (textBlock(atts) ? '\n\n' + textBlock(atts) : ''), images: imagesOf(atts) }
          : { role: m.role, content: m.text + (m.att && m.att.length ? '\n[вложения были: ' + m.att.map((a) => a.name).join(', ') + ']' : '') }));
        const res = await post(buildRequest(c, { system: sys, messages: hist }));
        const out = parseResponse(c, res.status, res.data);
        if (!out.ok) { error = { kind: out.kind, message: out.message }; return { ok: false, why: out.kind }; }
        const ex = extract(out.text, c), msg = { id: uid(), role: 'assistant', text: ex.text || (ex.proposals.length ? '' : out.text), at: now(), proposals: ex.proposals };
        messages.push(msg);
        // полностью автоматический режим — отдельная галочка с предупреждением: применяется сразу, остаётся «Отменить»; студия и запросы — никогда
        if (c.auto) for (const p of msg.proposals) if (p.status === 'pending' && p.kind !== 'studio' && p.kind !== 'query' && canWrite(c, p.kind === 'rec' || p.kind === 'show' ? 'media' : 'songs')) await applyProposal(msg.id, p.id);
        const qp = msg.proposals.filter((p) => p.kind === 'query' && p.status === 'pending');
        if (!qp.length || round >= ROUNDS_MAX) return { ok: true };
        const result = qp.map((p) => { p.status = 'answered'; return answerQueries(p.queries, data(), c); }).join('\n\n');
        messages.push({ id: uid(), role: 'tool', text: qp.flatMap((p) => describeQueries(p.queries)).join(', '), result, at: now() });
        persist(); emit();
      }
    } catch (e) { error = { kind: (e && e.kind) || 'net', message: String((e && e.message) || '').slice(0, 200) }; return { ok: false, why: error.kind }; }
    finally { busy = false; persist(); emit(); }
  }
  // Без своего API (любой чат нейросети): запрос целиком — для копирования; ответ нейросети — вставить, и он разбирается как обычный ответ
  // Ручной режим: запрос данных от нейросети → ответ приложения для копирования (и пометка «передано»)
  function answerQuery(mid, pidv) {
    const f = find(mid, pidv); if (!f || f.p.kind !== 'query') return null;
    const text = answerQueries(f.p.queries, data(), cfg());
    f.p.status = 'answered'; persist(); emit();
    return '=== ОТВЕТ ПРИЛОЖЕНИЯ НА ЗАПРОСЫ ===\n' + text;
  }
  function buildPrompt(text) {
    const c = cfg(), ctx = buildContext(c, data()), sys = buildSystem(c, { mascot: mascot(), lang: lang(), now: now() });
    return sys + (ctx.text ? '\n\n=== ДАННЫЕ ===\n' + ctx.text : '') + '\n\n=== ЗАПРОС ЧЕЛОВЕКА ===\n' + String(text || '').trim() + '\n\nОтветь коротко и приложи блок(и) melete-… из инструкции выше.';
  }
  function addReply(text) {
    const c = cfg(), t = String(text || '').trim(); if (!t) return { ok: false, why: 'empty' };
    const ex = extract(t, c);
    messages.push({ id: uid(), role: 'assistant', text: ex.text || (ex.proposals.length ? '' : t.slice(0, 4000)), at: now(), proposals: ex.proposals, pasted: true });
    persist(); emit();
    return { ok: true, n: ex.proposals.length };
  }
  return {
    get messages() { return messages; }, get busy() { return busy; }, get error() { return error; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    preview, sendText, buildPrompt, addReply, answerQuery, apply: applyProposal, reject: rejectProposal, undo: undoProposal,
    clear() { messages = []; error = null; persist(); emit(); },
    dismissError() { error = null; emit(); },
  };
}
