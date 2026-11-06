// Сет-лист в метрономе (слово автора 06.11.2026): тот же сет-лист, что у сцены (событие календаря с песнями,
// src/core/stage.js), — в метрономе полосой: касание песни — её темп и размер сразу. Темп песни в сет-листе свой
// (ev.stage[songId].bpm): можно поставить целевой, «как играю» или любой — он хранится в сет-листе, песня не меняется.
// Размер — ev.stage[songId].num/den (иначе из настроек метронома песни, иначе метроном не трогает размер).
// Логика без DOM; модулю — через ctx.setlists (core/modules.js).
import { liveEvents, newEvent, saveEvent } from './calendar.js';
import { itemOf, setItem, moveSong, setSongs } from './stage.js';
import { saveSong, emptySong } from './library.js';

const DAY = 86400000;
const clampBpm = (v) => Math.max(20, Math.min(300, Math.round(+v || 0)));

// Сет-листы: события с песнями — ближайшие впереди (от вчерашнего дня) по порядку, затем прошедшие от свежих
export function setlistsOf(state, now = Date.now()) {
  const all = liveEvents(state).filter((e) => (e.songs || []).length || e.metroSet);
  const at = (e) => +e.start || 0, edge = now - DAY;
  const next = all.filter((e) => at(e) >= edge).sort((a, b) => at(a) - at(b));
  const past = all.filter((e) => at(e) < edge).sort((a, b) => at(b) - at(a));
  return next.concat(past).map((e) => ({ id: e.id, title: e.title || '', start: at(e), n: (e.songs || []).length }));
}

// Песни сет-листа для метронома: темп (свой в сет-листе или по песне), размер, целевой и «как играю»
export function entriesOf(ev, songById) {
  return setSongs(ev, songById).map((s) => {
    const it = itemOf(ev, s), o = ((ev.stage || {})[s.id]) || {}, m = s.metro || {};
    const num = +o.num || +m.num || 0, den = +o.den || +m.den || 0;
    return { songId: s.id, title: s.title, artist: s.artist || '', bpm: it.bpm || 0, own: o.bpm != null, num: num && den ? num : 0, den: num && den ? den : 0,
      target: +s.targetBpm || 0, current: +s.currentBpm || 0 };
  });
}

export function createSetlists(store) {
  const S = store.state;
  const evOf = (id) => liveEvents(S).find((e) => e.id === id) || null;
  const save = (ev) => { saveEvent(store, ev); return ev; };
  return {
    list: () => setlistsOf(S),
    get(id) { const ev = evOf(id); return ev ? { id: ev.id, title: ev.title || '', start: +ev.start || 0, items: entriesOf(ev, store.songById) } : null; },
    // новый сет-лист — событие «Концерт» на сегодня (видно и в календаре, и на сцене)
    create(title) { const ev = newEvent(Date.now(), Date.now(), { title: String(title || '').trim(), kind: 'concert', metroSet: true }); return save(ev).id; },
    rename(id, title) { const ev = evOf(id); if (ev) { ev.title = String(title || '').trim(); save(ev); } },
    add(id, songIds) { const ev = evOf(id); if (!ev) return; const L = (ev.songs ||= []); (songIds || []).forEach((s) => { if (!L.includes(s) && store.songById(s)) L.push(s); }); save(ev); },
    // песня, которой нет в библиотеке: название, темп, размер — она появляется и в «Песнях»
    quick(id, { title, bpm, num, den }) {
      const ev = evOf(id); if (!ev) return null;
      const f = { ...emptySong(S.settings), title, targetBpm: bpm ? clampBpm(bpm) : '' };
      const sid = saveSong(store, null, f); if (!sid) return null;
      const s = store.songById(sid); if (num && den) s.metro = { ...(s.metro || {}), num: +num, den: +den };
      (ev.songs ||= []).push(sid); save(ev);
      return sid;
    },
    remove(id, songId) { const ev = evOf(id); if (!ev) return; ev.songs = (ev.songs || []).filter((s) => s !== songId); if (ev.stage) delete ev.stage[songId]; save(ev); },
    move(id, i, d) { const ev = evOf(id); if (ev) save(moveSong(ev, i, d)); },
    // свой темп песни в этом сет-листе (null — снова по песне)
    setBpm(id, songId, bpm) { const ev = evOf(id); if (ev) save(setItem(ev, songId, { bpm: bpm == null ? null : clampBpm(bpm) })); },
    setMeter(id, songId, num, den) { const ev = evOf(id); if (ev) save(setItem(ev, songId, num && den ? { num: +num, den: +den } : { num: null, den: null })); },
    songs: () => store.songs().map((s) => ({ id: s.id, title: s.title, artist: s.artist || '' })),
  };
}
