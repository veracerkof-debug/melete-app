// Запросы нейросети на чтение (слово автора 26.11.2026): блок ```melete-query с массивом [{"q":"project"},{"q":"recording","id":"…"}].
// Приложение само отвечает на них, если подключён свой API (до ROUNDS_MAX кругов, только чтение), а в ручном режиме человек копирует
// «ответ приложения» и приносит его нейросети. Каждый запрос — через ту же категорию доступа, что и контекст: закрыта — отказ с причиной.
// Тексты песен не выдаются никогда. Без DOM и сети.
import { canRead } from './config.js';
import { mediaContext, recDetail, songsContext } from './context.js';
import { studioContext } from '../../music/studioai.js';
import { INSTRUMENTS, DRUMS } from '../../music/project.js';

export const QUERY_MAX = 6, RESULT_MAX = 14000, TEXT_MAX = 30000, TEXT_IDS = 5, ROUNDS_MAX = 4;
// запрос → категория доступа (null — всегда можно)
export const QUERY_CAT = { projects: 'studio', project: 'studio', songs: 'songs', song: 'songs', songtext: 'text', recordings: 'media', recording: 'media', instruments: null, diag: 'log' };
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const one = (v) => String(v == null ? '' : v).replace(/[\r\n|]+/g, ' ').trim();

// [{ q, id? }] из ответа модели → допустимые запросы
export function cleanQueries(arr) {
  return (Array.isArray(arr) ? arr : []).slice(0, QUERY_MAX).map((o) => {
    if (!o || typeof o.q !== 'string' || !(o.q in QUERY_CAT)) return null;
    const out = { q: o.q };
    if (typeof o.id === 'string' && o.id.trim()) out.id = o.id.trim().slice(0, 60);
    if (o.q === 'songtext') { out.ids = (Array.isArray(o.ids) ? o.ids : [o.id]).map((v) => String(v == null ? '' : v).trim().slice(0, 60)).filter(Boolean).slice(0, TEXT_IDS); if (!out.ids.length) return null; }
    if (o.q === 'songs') { const f = Math.floor(+o.from); if (f > 0 && f < 1e6) out.from = f; if (typeof o.like === 'string' && o.like.trim()) out.like = o.like.trim().slice(0, 60); }
    return out;
  }).filter(Boolean);
}
export const describeQueries = (qs) => (qs || []).map((x) => x.q + (x.id ? ' ' + x.id : '') + (x.ids ? ' ' + x.ids.length : '') + (x.like ? ' «' + x.like + '»' : '') + (x.from ? ' с ' + x.from : ''));

// Ответ приложения: текст для модели. data — { songs, recs, used, studio (открытый проект), projects }
export function answerQueries(qs, data, cfg) {
  const out = (qs || []).map((x, i) => {
    const head = '### Запрос ' + (i + 1) + ': ' + x.q + (x.id ? ' ' + x.id : '');
    const cat = QUERY_CAT[x.q];
    if (cat && !canRead(cfg, cat)) return head + '\nНЕТ ДОСТУПА: категория «' + cat + '» закрыта человеком в настройках нейросети.';
    try { return head + '\n' + one1(x, data, cfg); } catch { return head + '\nОШИБКА: не удалось собрать ответ.'; }
  });
  const s = out.join('\n\n'), max = (qs || []).some((x) => x.q === 'songtext') ? TEXT_MAX : RESULT_MAX;
  return s.length > max ? s.slice(0, max) + '\n… (ответ обрезан: спросите точнее)' : s;
}
function one1(x, d, cfg0) {
  const songs = d.songs || [], recs = d.recs || [];
  if (x.q === 'diag') return d.diag ? d.diag() : 'Данных самодиагностики нет.';
  if (x.q === 'instruments') return 'Звуки для дорожек и партий (inst): ' + INSTRUMENTS.join(', ') + '.\nДорожки ударных: ' + DRUMS.join(', ') + '.';
  if (x.q === 'songs') {
    // постранично (по 400) и по части названия/исполнителя: большая база не помещается в один ответ
    const like = (x.like || '').toLowerCase(), list = like ? songs.filter((s) => !s.deleted && (one(s.title) + ' ' + one(s.artist)).toLowerCase().includes(like)) : songs, from = x.from || 1;
    return songsContext(list.filter((s) => !s.deleted).slice(from - 1), 400) + (x.from || like ? '\n(с номера ' + from + (like ? ', отбор «' + like + '»' : '') + ')' : '');
  }
  if (x.q === 'songtext') {
    if (!canRead(cfg0, 'songs')) return 'НЕТ ДОСТУПА: нужна ещё и категория «Песни».';
    return x.ids.map((id) => { const s = songs.find((q) => q.id === id && !q.deleted); return s ? '=== ' + s.id + ' | ' + one(s.title) + ' | ' + one(s.artist) + ' | ' + one(s.key) + ' ===\n' + (s.notes || '(текста нет)') : '=== ' + id + ' ===\nПесни с таким id нет.'; }).join('\n\n');
  }
  if (x.q === 'song') {
    const s = songs.find((q) => q.id === x.id && !q.deleted); if (!s) return 'Песни с таким id нет.';
    return [s.id, one(s.title), one(s.artist), one(s.genre), one(s.key), 'темп цель ' + (s.targetBpm || '—') + ', сейчас ' + (s.currentBpm || '—'), 'каподастр ' + (s.capo || 0), s.notes ? 'текст есть (не выдаётся)' : 'текста нет'].join(' | ');
  }
  if (x.q === 'recordings') return mediaContext(recs, d.used || {}, songs);
  if (x.q === 'recording') { const r = recs.find((q) => q.id === x.id); return r ? recDetail(r) : 'Записи с таким id нет.'; }
  if (x.q === 'projects') {
    const L = (d.projects || []).filter((p) => !p.deleted && !p.looper);
    return L.length ? 'Проекты студии: id | название | темп | тональность | клипов\n' + L.slice(0, 60).map((p) => [p.id, one(p.name), Math.round(p.bpm), NOTE[p.key.pc] + (p.key.minor ? 'm' : ''), p.clips.length].join(' | ')).join('\n') : 'Проектов нет.';
  }
  if (x.q === 'project') {
    const p = x.id ? (d.projects || []).find((q) => q.id === x.id && !q.deleted) : d.studio;
    return p ? studioContext(p) : x.id ? 'Проекта с таким id нет.' : 'Открытого проекта нет: откройте студию или укажите id из запроса projects.';
  }
  return 'Неизвестный запрос.';
}
