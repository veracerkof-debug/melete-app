// Совместное чтение (слово автора 22.11.2026; церковный режим): один общий репозиторий данных на GitHub у пары, протокол — как у Tandem
// (veracerkof-debug/Bible.vidget): отчёт дня с фото и рефлексией, подтверждение партнёром, «напомнить». Токен вводит сам человек;
// он и настройки подключения лежат только на этом устройстве (app.device), в резервную копию и синхронизацию не попадают.
// Сеть — только api.github.com и только пока подключено; синхронизация: при открытии экрана, при возврате в приложение (не чаще раза
// в 5 минут) и раз в полминуты, пока экран открыт. Партнёр что-то написал, пока приложение закрыто — местное уведомление при следующей
// сверке (фонового сервиса нет); у пользователей веб-версии Tandem уведомления приходят по Web Push (docs/tech/connect.md).
import { GitHub, GhError } from './gh.js';
import { Repo } from './repo.js';
import { idbKV } from './kv.js';
import { buildModel, P, ckey, newId } from './model.js';
import { dstr } from './dates.js';

const SYNC_MIN_GAP = 5 * 60 * 1000;
const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; } };

// Ссылка-приглашение Tandem «…/#/join/<владелец>/<репозиторий>/<токен>» или «владелец/репозиторий» → { owner, repo, token? } | null
export function parseInvite(text) {
  const s = String(text || '').trim();
  let m = /#\/join\/([^/\s]+)\/([^/\s]+)\/([^/\s]+)/.exec(s);
  if (m) return { owner: m[1], repo: m[2], token: m[3] };
  m = /^([A-Za-z0-9-_.]+)\/([A-Za-z0-9-_.]+)$/.exec(s);
  return m ? { owner: m[1], repo: m[2] } : null;
}

export function createTogether(app, { fetchFn, kvFor = (name) => idbKV(name), notify = () => {}, now = () => Date.now() } = {}) {
  const T = { repo: null, model: null, subs: new Set(), timers: [], lastSync: 0, today: dstr(), seen: null };
  const cfgAll = () => (app.device.together ??= {});
  const cfg = () => cfgAll();
  const saveCfg = (patch) => { Object.assign(cfgAll(), patch); if (app.saveDevice) app.saveDevice(); };
  const emit = () => T.subs.forEach((f) => { try { f(); } catch { /* подписчик упал — остальным не мешаем */ } });
  const rebuild = () => { T.today = dstr(); T.model = buildModel(T.repo ? T.repo.docs : new Map(), cfg().login, T.today, { weekFirst: 1, weekGoal: cfg().weekGoal ?? 5 }); };
  const attach = () => {
    const { token, owner, repo, branch } = cfg();
    T.repo = new Repo({ gh: new GitHub({ token, owner, repo, branch, ...(fetchFn ? { fetchFn } : {}) }), kv: kvFor('melete-together-' + owner + '-' + repo), onChange: () => { rebuild(); emit(); } });
  };
  const api = {
    parseInvite,
    get connected() { return !!(cfg().token && cfg().owner && cfg().repo && cfg().login); },
    get me() { return cfg().login || null; },
    get name() { return cfg().name || ''; },
    get model() { return T.model; },
    get today() { return T.today; },
    get partner() { return T.model ? T.model.partner : null; },
    get status() { return T.repo ? { ...T.repo.status, queue: T.repo.queue.length } : { syncing: false, offline: false, authError: false, queue: 0, lastSync: 0 }; },
    profile(login) { const p = T.model && T.model.members[login]; return p || { login, name: login === cfg().login ? (cfg().name || '') : '' }; },
    subscribe(fn) { T.subs.add(fn); return () => T.subs.delete(fn); },

    // Запуск при старте приложения: локальная копия и одна сверка (если давно не сверялись)
    async boot() {
      if (!api.connected || T.repo) return;
      attach(); await T.repo.load(); rebuild(); emit();
      const prev = cfg().seenAt;
      T.seen = prev || null;
      api.sync(true);
    },
    // Сверка: отправить очередь, забрать новое. force — без ограничения частоты
    async sync(force = false) {
      if (!T.repo) return false;
      if (!force && now() - T.lastSync < SYNC_MIN_GAP && !T.repo.queue.length) return false;
      T.lastSync = now();
      let changed = false;
      try { await T.repo.flush(); changed = await T.repo.sync(); } catch { /* состояние — в status */ }
      if (changed) api.checkNew();
      emit();
      return changed;
    },
    // Пока открыт экран: раз в полминуты и при возврате
    start() {
      api.stop();
      const tick = () => { if (typeof document === 'undefined' || document.visibilityState === 'visible') api.sync(true); };
      T.timers.push(setInterval(tick, 30000));
      if (typeof document !== 'undefined') { T.vis = () => { if (document.visibilityState === 'visible') api.sync(); }; document.addEventListener('visibilitychange', T.vis); }
      tick();
    },
    stop() { T.timers.forEach(clearInterval); T.timers = []; if (T.vis && typeof document !== 'undefined') { document.removeEventListener('visibilitychange', T.vis); T.vis = null; } },

    // Новое от партнёра с прошлой сверки → notify({ title, body, kind })
    checkNew() {
      const m = T.model, p = m && m.partner;
      if (!p) return;
      const latest = [];
      Object.entries(m.checkins[p] || {}).forEach(([d, c]) => latest.push({ at: c.edited || c.at || d, kind: 'report', date: d, c }));
      m.events.filter((e) => e.by === p && ['nudge', 'msg'].includes(e.type)).forEach((e) => latest.push({ at: e.at || e.id, kind: e.type, e }));
      latest.sort((a, b) => String(a.at).localeCompare(String(b.at)));
      const last = latest[latest.length - 1];
      if (!last) return;
      const seen = cfg().seenAt;
      if (!seen) { saveCfg({ seenAt: String(last.at) }); return; } // первая сверка: показывать нечего, запомнить
      if (String(last.at) <= seen) return;
      saveCfg({ seenAt: String(last.at) });
      notify({ kind: last.kind, name: api.profile(p).name, ref: last.c && last.c.ref, text: (last.e && last.e.text) || '' });
    },
    // Партнёр увиден на экране — новые события считаются прочитанными
    markSeen() { const m = T.model, p = m && m.partner; if (!p) return; const ats = Object.values(m.checkins[p] || {}).map((c) => c.edited || c.at).concat(m.events.filter((e) => e.by === p).map((e) => e.at || e.id)).filter(Boolean).sort(); if (ats.length) saveCfg({ seenAt: String(ats[ats.length - 1]) }); },

    // Подключение. Один токен на пару; участник — идентификатор, созданный здесь. asMember — это устройство уже знакомого участника.
    async connect({ token, owner, repo, name, create = false, asMember }) {
      const gh = new GitHub({ token, owner, repo, ...(fetchFn ? { fetchFn } : {}) });
      const info = await gh.repoInfo(); // 401 — токен не принят; 404 — нет репозитория или доступа
      if (!(info.permissions && info.permissions.push)) throw new GhError('forbidden', 403, 'no push');
      const prev = { ...cfg() };
      const login = asMember || 'm' + newId();
      saveCfg({ token, owner, repo, branch: info.default_branch, login, name: name || prev.name || '' });
      attach();
      try {
        await T.repo.load(); await T.repo.sync();
        const found = {};
        for (const [p, d] of T.repo.docs) { const m = /^u\/([^/]+)\/profile\.json$/.exec(p); if (m) found[m[1]] = d; }
        if (!asMember && Object.keys(found).length >= 2) { const e = new GhError('full', 0, 'pair is full'); e.members = Object.entries(found).map(([id, p]) => ({ id, name: p.name })); throw e; }
        if (!T.repo.has(P.couple)) {
          if (!create) throw new GhError('nocouple', 0, 'no couple.json');
          await T.repo.writeJSON(P.couple, { v: 1, id: newId(), created: new Date().toISOString(), creator: login }, 'Создание пары');
        }
        const old = T.repo.get(P.profile(login)) || {};
        await T.repo.writeJSON(P.profile(login), { name: old.name || name || 'Melete', lang: old.lang || 'ru', color: old.color || '#946B3E', tz: tz(), joined: old.joined || new Date().toISOString(), remind: old.remind || { on: false, hour: 20 }, avatar: old.avatar || null }, 'Профиль');
        rebuild(); emit();
      } catch (e) {
        T.repo = null; T.model = null;
        for (const k of Object.keys(cfgAll())) delete cfgAll()[k];
        Object.assign(cfgAll(), prev); if (app.saveDevice) app.saveDevice();
        throw e;
      }
    },
    disconnect() {
      api.stop();
      const { owner, repo } = cfg();
      for (const k of Object.keys(cfgAll())) delete cfgAll()[k];
      if (app.saveDevice) app.saveDevice();
      T.repo = null; T.model = null; emit();
      try { if (typeof indexedDB !== 'undefined' && owner) indexedDB.deleteDatabase('melete-together-' + owner + '-' + repo); } catch { /* не критично */ }
    },

    // Отчёт дня: фото (Blob) уходит раньше отчёта; без сети — в очередь, не теряется
    postCheckin({ ref, text, photo, date }) {
      date ||= dstr();
      const old = T.repo.get(P.checkin(cfg().login, date));
      const doc = { date, ref, tr: 'rst', text: String(text || '').trim().slice(0, 2000), photo: (old && old.photo) || null, at: (old && old.at) || new Date().toISOString(), ...(old ? { edited: new Date().toISOString() } : {}) };
      if (photo) { doc.photo = P.photo(cfg().login, date); T.repo.writeFile(doc.photo, photo, 'Фото ' + date); }
      return T.repo.writeJSON(P.checkin(cfg().login, date), doc, 'Отчёт ' + date);
    },
    ack(author, key) {
      if (!T.repo || author === cfg().login || T.model.isAcked(author, key)) return null;
      return T.repo.writeJSON(P.ack(cfg().login, key), { of: author, key, at: new Date().toISOString() }, 'Подтверждение');
    },
    // «Напомнить» — не чаще раза в 15 минут
    nudge() {
      if (!T.repo) return false;
      if (now() - (cfg().nudgeAt || 0) < 15 * 60e3) return false;
      saveCfg({ nudgeAt: now() });
      const id = newId();
      T.repo.writeJSON(P.event(cfg().login, id), { type: 'nudge', at: new Date().toISOString() }, 'nudge');
      return true;
    },
    checkinOf(login, date) { return (T.model && T.model.checkins[login] && T.model.checkins[login][date || T.today]) || null; },
    photoURL(path) { return path && T.repo ? T.repo.photoURL(path).catch(() => null) : Promise.resolve(null); },
  };
  return api;
}
