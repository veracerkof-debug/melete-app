// Запросы нейросети на чтение (слово автора 26.11.2026): блок ```melete-query с массивом [{"q":"project"},{"q":"recording","id":"…"}].
// Приложение само отвечает на них, если подключён свой API (до ROUNDS_MAX кругов, только чтение), а в ручном режиме человек копирует
// «ответ приложения» и приносит его нейросети. Каждый запрос — через ту же категорию доступа, что и контекст: закрыта — отказ с причиной.
// Тексты песен не выдаются никогда. Без DOM и сети.
import { canRead } from './config.js';
import { mediaContext, recDetail, songsContext } from './context.js';
import { studioContext } from '../../music/studioai.js';
import { INSTRUMENTS, DRUMS } from '../../music/project.js';

export const QUERY_MAX = 6, RESULT_MAX = 14000, ROUNDS_MAX = 4;
// запрос → категория доступа (null — всегда можно)
export const QUERY_CAT = { projects: 'studio', project: 'studio', songs: 'songs', song: 'songs', recordings: 'media', recording: 'media', instruments: null };
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const one = (v) => String(v == null ? '' : v).replace(/[\r\n|]+/g, ' ').trim();

// [{ q, id? }] из ответа модели → допустимые запросы
export function cleanQueries(arr) {
  return (Array.isArray(arr) ? arr : []).slice(0, QUERY_MAX).map((o) => {
    if (!o || typeof o.q !== 'string' || !(o.q in QUERY_CAT)) return null;
    const out = { q: o.q };
    if (typeof o.id === 'string' && o.id.trim()) out.id = o.id.trim().slice(0, 60);
    return out;
  }).filter(Boolean);
}
export const describeQueries = (qs) => (qs || []).map((x) => x.q + (x.id ? ' ' + x.id : ''));

// Ответ приложения: текст для модели. data — { songs, recs, used, studio (открытый проект), projects }
export function answerQueries(qs, data, cfg) {
  const out = (qs || []).map((x, i) => {
    const head = '### Запрос ' + (i + 1) + ': ' + x.q + (x.id ? ' ' + x.id : '');
    const cat = QUERY_CAT[x.q];
    if (cat && !canRead(cfg, cat)) return head + '\nНЕТ ДОСТУПА: категория «' + cat + '» закрыта человеком в настройках нейросети.';
    try { return head + '\n' + one1(x, data); } catch { return head + '\nОШИБКА: не удалось собрать ответ.'; }
  });
  const s = out.join('\n\n');
  return s.length > RESULT_MAX ? s.slice(0, RESULT_MAX) + '\n… (ответ обрезан: спросите точнее)' : s;
}
function one1(x, d) {
  const songs = d.songs || [], recs = d.recs || [];
  if (x.q === 'instruments') return 'Звуки для дорожек и партий (inst): ' + INSTRUMENTS.join(', ') + '.\nДорожки ударных: ' + DRUMS.join(', ') + '.';
  if (x.q === 'songs') return songsContext(songs);
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
