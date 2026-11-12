// Хранение под нагрузкой и со сбоями: проекты студии в своей базе (store.js + projstore.js), квота localStorage,
// шаги формата данных (migrate.js). База здесь — подделка с теми же обещаниями, что у IndexedDB: запись асинхронная,
// может отказать.
import { describe, it, expect } from 'vitest';
import { createStore, LS, merge } from '../src/core/store.js';
import { migrate, STEPS, SCHEMA } from '../src/core/migrate.js';

const box = (limit = Infinity) => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { v = String(v); if (v.length > limit) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, v); },
    removeItem: (k) => m.delete(k), m,
  };
};
const fakeSide = ({ rows = [], failLoad = false } = {}) => {
  const db = new Map(rows.map((p) => [p.id, JSON.parse(JSON.stringify(p))]));
  const side = {
    db, puts: [], failPut: false,
    load: async () => { if (failLoad) throw new Error('no db'); return [...db.values()].map((p) => JSON.parse(JSON.stringify(p))); },
    put: async (list) => { await null; if (side.failPut) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } list.forEach((p) => db.set(p.id, JSON.parse(JSON.stringify(p)))); side.puts.push(list.map((p) => p.id)); },
    clear: async () => { db.clear(); },
  };
  return side;
};
const proj = (id, at, notes = 4) => ({ id, name: 'P ' + id, updatedAt: at, tracks: [{ id: 't', kind: 'notes' }], clips: [{ id: 'c', data: { notes: Array.from({ length: notes }, (_, i) => ({ t: i, p: 60, d: 1 })) } }] });
const lsOf = (st) => JSON.parse(st.getItem(LS));

describe('проекты студии — в своей базе', () => {
  it('старые данные: проекты переезжают в базу и только потом уходят из practice.v1', async () => {
    const st = box();
    st.setItem(LS, JSON.stringify({ version: 1, songs: [], sessions: [], settings: {}, projects: [proj('a', 10), proj('b', 20)], updatedAt: 1 }));
    const side = fakeSide();
    const s = createStore({ storage: st, side });
    expect(s.projMode).toBe('wait');
    s.save(); // пока база не прочитана — пишется как раньше, с проектами (обрыв здесь ничего не теряет)
    expect(lsOf(st).projects.map((p) => p.id)).toEqual(['a', 'b']);
    await s.ready;
    expect(s.projMode).toBe('side');
    expect([...side.db.keys()].sort()).toEqual(['a', 'b']);
    expect(lsOf(st).projects).toBeUndefined();
    expect(s.state.projects.map((p) => p.id)).toEqual(['a', 'b']);
    expect(JSON.parse(s.exportBackup()).projects.length).toBe(2); // в копии проекты есть
  });

  it('новый запуск: проекты читаются из базы, правка пишет только изменённый проект', async () => {
    const st = box(), side = fakeSide({ rows: [proj('a', 10), proj('b', 20)] });
    const s = createStore({ storage: st, side, now: () => 500 });
    await s.ready;
    expect(s.state.projects.length).toBe(2);
    expect(side.puts).toEqual([]); // ничего не переписано
    const b = s.state.projects.find((p) => p.id === 'b');
    b.name = 'Новое имя'; b.updatedAt = 500; s.projectChanged('b'); s.save();
    await s.flush();
    expect(side.puts).toEqual([['b']]);
    // вторая правка в ту же миллисекунду — тоже доходит
    b.name = 'Ещё'; s.projectChanged('b'); s.save();
    await s.flush();
    expect(side.db.get('b').name).toBe('Ещё');
    expect(lsOf(st).projects).toBeUndefined();
  });

  it('откат на прежнюю сборку: её правки в practice.v1 новее — побеждают и переезжают', async () => {
    const st = box();
    st.setItem(LS, JSON.stringify({ version: 1, songs: [], sessions: [], settings: {}, projects: [{ ...proj('a', 99), name: 'правка старой сборки' }], updatedAt: 1 }));
    const side = fakeSide({ rows: [proj('a', 10), proj('b', 20)] });
    const s = createStore({ storage: st, side });
    await s.ready;
    expect(s.state.projects.find((p) => p.id === 'a').name).toBe('правка старой сборки');
    expect(side.db.get('a').name).toBe('правка старой сборки');
    expect(s.state.projects.length).toBe(2);
  });

  it('база не открылась — проекты остаются в practice.v1', async () => {
    const st = box();
    st.setItem(LS, JSON.stringify({ version: 1, songs: [], sessions: [], settings: {}, projects: [proj('a', 10)], updatedAt: 1 }));
    const logs = [];
    const s = createStore({ storage: st, side: fakeSide({ failLoad: true }), onLog: (m) => logs.push(m) });
    await s.ready;
    expect(s.projMode).toBe('ls');
    expect(lsOf(st).projects.map((p) => p.id)).toEqual(['a']);
    expect(logs.join(' ')).toMatch(/не открылась/);
  });

  it('база отказала при записи — проект возвращается в practice.v1, человеку сообщают', async () => {
    const st = box(), side = fakeSide({ rows: [proj('a', 10)] }), fails = [];
    const s = createStore({ storage: st, side, now: () => 50, onWriteFail: (e) => fails.push(e.name) });
    await s.ready;
    side.failPut = true;
    s.state.projects[0].name = 'важная правка'; s.projectChanged('a'); s.save();
    await s.flush();
    expect(s.projMode).toBe('ls');
    expect(lsOf(st).projects[0].name).toBe('важная правка');
    expect(fails).toEqual(['QuotaExceededError']);
  });

  it('«Удалить все данные» очищает и базу проектов', async () => {
    const side = fakeSide({ rows: [proj('a', 10)] }), s = createStore({ storage: box(), side });
    await s.ready;
    s.reset();
    await s.flush();
    expect(side.db.size).toBe(0);
  });

  it('без базы (тесты, приватный режим) — как раньше: проекты в practice.v1', async () => {
    const st = box(), s = createStore({ storage: st });
    await s.ready;
    s.state.projects = [proj('a', 1)]; s.save();
    expect(s.projMode).toBe('ls');
    expect(lsOf(st).projects.length).toBe(1);
  });
});

describe('квота localStorage', () => {
  it('большие проекты не упираются в квоту: в practice.v1 их нет', async () => {
    const st = box(200_000), fails = [];
    const s = createStore({ storage: st, side: fakeSide(), onWriteFail: (e) => fails.push(e.name) });
    await s.ready;
    s.state.projects = [proj('big', 5, 20_000)]; // ~0.5 МБ нот
    s.projectChanged('big'); s.save();
    await s.flush();
    expect(fails).toEqual([]);
    expect(st.getItem(LS).length).toBeLessThan(200_000);
  });

  it('нет места — сообщение, данные в памяти целы и записываются, когда место есть', () => {
    const lim = { n: Infinity }, m = new Map(), fails = [];
    const st = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { if (String(v).length > lim.n) { const e = new Error('q'); e.name = 'QuotaExceededError'; throw e; } m.set(k, String(v)); } };
    const s = createStore({ storage: st, onWriteFail: (e) => fails.push(e.name) });
    s.save();
    const before = st.getItem(LS);
    lim.n = 10;
    s.state.songs.push({ id: 's1', title: 'Новая песня', updatedAt: 1 });
    s.save();
    expect(fails).toEqual(['QuotaExceededError']);
    expect(st.getItem(LS)).toBe(before); // прежние данные не испорчены
    expect(s.songs().length).toBe(1); // а новое — в памяти
    lim.n = Infinity;
    s.save();
    expect(JSON.parse(st.getItem(LS)).songs[0].title).toBe('Новая песня');
  });
});

describe('шаги формата данных', () => {
  it('номер формата ставится, version остаётся 1', () => {
    const st = { version: 1, songs: [], sessions: [], settings: { tabs: ['home', 'bible', 'library', 'tools'] } };
    const r = migrate(st);
    expect(r.from).toBe(0);
    expect(st.schema).toBe(SCHEMA);
    expect(st.version).toBe(1);
    expect(st.settings.trainSplit && st.settings.calmColors && st.settings.tabsBibleMid).toBe(true);
  });

  it('шаги идемпотентны: второй прогон ничего не меняет', () => {
    const st = { version: 1, songs: [], sessions: [], settings: { tabs: ['library', 'train', 'bible'] } };
    migrate(st);
    const once = JSON.stringify(st);
    expect(migrate(st)).toMatchObject({ changed: false, bumped: false });
    expect(JSON.stringify(st)).toBe(once);
  });

  it('данные новее кода (откат сборки) — формат не понижается, незнакомое не трогается', () => {
    const logs = [];
    const st = { version: 1, songs: [], sessions: [], schema: SCHEMA + 5, future: { x: 1 }, settings: { trainSplit: true, calmColors: true, tabsBibleMid: true } };
    expect(migrate(st, STEPS, (m) => logs.push(m))).toMatchObject({ newer: true, changed: false });
    expect(st.schema).toBe(SCHEMA + 5);
    expect(st.future).toEqual({ x: 1 });
    expect(logs.length).toBe(1);
  });

  it('сломанный шаг не роняет запуск, остальные идут', () => {
    const logs = [], st = { version: 1, settings: {} };
    const r = migrate(st, [{ id: 'bad', run: () => { throw new Error('x'); } }, { id: 'ok', run: (s) => { s.settings.ok = 1; return true; } }], (m) => logs.push(m));
    expect(r.changed).toBe(true);
    expect(st.settings.ok).toBe(1);
    expect(logs[0]).toMatch(/bad/);
  });

  it('слияние не понижает номер формата', () => {
    expect(merge({ schema: 7, songs: [], sessions: [] }, { schema: 2, songs: [], sessions: [] }).schema).toBe(7);
  });

  it('хранилище прогоняет шаги при запуске и после загрузки старой копии', () => {
    let runs = 0;
    const mig = (s) => { runs++; return migrate(s); };
    const st = box();
    st.setItem(LS, JSON.stringify({ version: 1, songs: [], sessions: [], settings: { tabs: ['library', 'train'] }, updatedAt: 1 }));
    const s = createStore({ storage: st, migrate: mig, now: () => 777 });
    expect(runs).toBe(1);
    expect(lsOf(st).schema).toBe(SCHEMA); // записано сразу
    expect(s.state.settings.tabs).toEqual(['library', 'ear', 'beat']);
    expect(s.state.settings.updatedAt).toBe(777); // настройки поменялись — время правки сдвинуто
    s.importBackup({ version: 1, songs: [], sessions: [], settings: { updatedAt: 9999, tabs: ['train'] } });
    expect(runs).toBe(2);
    expect(s.state.settings.tabs).toEqual(['ear', 'beat']); // старая копия приведена к новому виду
  });

  it('битые данные: шаги не идут, исходная строка сохранена отдельно', () => {
    const st = box();
    st.setItem(LS, '{"version":1,"songs":[');
    let runs = 0;
    createStore({ storage: st, migrate: (s) => { runs++; return migrate(s); } });
    expect(runs).toBe(0);
    expect(st.getItem(LS + '.broken')).toBe('{"version":1,"songs":[');
  });
});
