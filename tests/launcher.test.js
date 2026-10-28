// Ἐλάχιστον — отдельное приложение главного экрана (src/launcher, launcher/): строки на трёх языках, мост с Melete
// и трекер считают как ядро Melete, минимальный экран (не больше 7, крест — только в церковном режиме), обновление.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const mem = {};
beforeAll(() => {
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
});

describe('главный экран: строки', () => {
  it('каждая строка есть по-русски, по-узбекски и по-английски', async () => {
    const { STRINGS } = await import('../src/launcher/i18n.js');
    const { ICONS } = await import('../src/launcher/icons.js');
    const { COMMANDS } = await import('../src/launcher/actions.js');
    const { GESTURES } = await import('../src/launcher/gestures.js');
    const { CROSS_IDS, CROSS_PLACES } = await import('../src/launcher/cross.js');
    const src = readdirSync('src/launcher').filter((f) => f.endsWith('.js')).map((f) => readFileSync('src/launcher/' + f, 'utf8')).join('\n');
    const keys = new Set([...src.matchAll(/(?<![\w.])t\('([a-zA-Z0-9_.]+)'/g)].map((m) => m[1]).filter((k) => !k.endsWith('.')));
    COMMANDS.forEach((c) => keys.add('cmd.' + c.id));
    GESTURES.forEach((g) => keys.add('gest.' + g));
    [...CROSS_IDS, 'none'].forEach((c) => keys.add('cross.' + c));
    CROSS_PLACES.forEach((c) => keys.add('crossAt.' + c));
    ICONS.forEach((i) => keys.add('icon.' + i.id));
    ['set.tracker.church', 'mel.whatChurch', 'set.sys.isDefault', 'set.sys.notDefault'].forEach((k) => keys.add(k));
    for (const l of ['ru', 'uz', 'en']) expect([...keys].filter((k) => STRINGS[l][k] == null), l).toEqual([]);
  });
  it('тексты без обращения на «ты» и «вы»', async () => {
    const { STRINGS } = await import('../src/launcher/i18n.js');
    const bad = Object.entries(STRINGS.ru).filter(([k, v]) => !k.startsWith('bib.note') && /(^|[\s«])(вы|вас|вам|ваш\w*|ты|тебя|тебе|твой|твоя)(?=[\s,.!?»]|$)/i.test(v));
    expect(bad).toEqual([]);
  });
});

describe('главный экран: мост с Melete', () => {
  it('чтение и практика — те же числа, что в ядре; неподтверждённые занятия не считаются', async () => {
    const { seal } = await import('../src/core/integrity.js');
    const { readingFor } = await import('../src/core/reading.js');
    const now = new Date(2026, 9, 25, 12);
    const day = 864e5;
    const ok1 = seal({ id: 'a', type: 'free', start: now.getTime() - day, end: now.getTime() - day + 3600e3, dur: 3600, mode: 'normal', updatedAt: 1 });
    const ok2 = seal({ id: 'b', type: 'free', start: now.getTime() - 2 * day, end: now.getTime() - 2 * day + 1800e3, dur: 1800, mode: 'normal', updatedAt: 1 });
    const unsealed = { id: 'c', type: 'free', start: now.getTime() - day, end: now.getTime(), dur: 9999, mode: 'normal', updatedAt: 1 };
    const old = seal({ id: 'd', type: 'free', start: now.getTime() - 200 * day, end: now.getTime() - 200 * day + 60e3, dur: 60, mode: 'normal', updatedAt: 1 });
    const bible = { plan: 'year', start: '2026-10-14', read: { 'GEN.36': 1 } };
    const full = { version: 1, songs: [{ id: 's' }], sessions: [ok1, ok2, unsealed, old], settings: { church: true, goalMin: 300, days: [1, 1, 1, 1, 1, 0, 0], bible } };
    vi.resetModules();
    const { digest } = await import('../src/launcher/melete.js');
    const d = digest(full, now.getTime());
    expect(d.sessions.map((x) => x.id)).toEqual(['a', 'b', 'c']); // старше 70 дней — не храним; песни — тоже
    expect(d.songs).toBeUndefined();
    mem['elachiston.melete'] = JSON.stringify({ source: 'file', readAt: 1, data: d });
    mem['elachiston.prefs'] = JSON.stringify({ church: true });
    vi.resetModules();
    const { trackerData } = await import('../src/launcher/tracker.js');
    const r = trackerData(now);
    const core = readingFor(bible, now);
    expect(r.reading).toMatchObject({ day: core.day, total: core.keys.length, done: core.done, ref: 'Быт 36–39' });
    expect(r.practice.total).toBe(5400);
    expect(r.practice.goal).toBe(300 * 60);
    expect(r.live).toBeNull(); // Melete не отдаёт идущее занятие — плашки нет
    // без церковного режима Elachiston чтения нет; без моста на телефоне — блока нет, в браузере — пример
    const data = await import('../src/launcher/data.js');
    data.setPrefs({ church: false });
    expect(trackerData(now).reading).toBeNull();
    const m = await import('../src/launcher/melete.js');
    m.disconnectMelete();
    expect(trackerData(now).demo).toBe(true);
  });
});

describe('главный экран: обновление', () => {
  it('релиз канала: метка сборки и файл — только загруженные целиком', async () => {
    const { parseRelease, isNewer } = await import('../src/launcher/update.js');
    const rel = { assets: [
      { name: 'Elachiston-Dev.apk', state: 'uploaded', browser_download_url: 'https://github.com/veracerkof-debug/melete-app/releases/download/launcher-dev/Elachiston-Dev.apk', size: 5 },
      { name: 'launcher-41.ver', state: 'uploaded' }, { name: 'launcher-42.ver', state: 'starter' }, { name: 'android-99.ver', state: 'uploaded' },
    ] };
    const info = parseRelease(rel, 'dev');
    expect(info).toMatchObject({ build: 41, size: 5 });
    expect(isNewer(info, 40)).toBe(true);
    expect(isNewer(info, 41)).toBe(false);
    expect(isNewer(info, 0)).toBe(false); // собрано у себя — не обновляется
    expect(parseRelease({ assets: rel.assets.slice(1) }, 'dev')).toBeNull();
  });
});

describe('главный экран: минимальный', () => {
  it('без церковного режима — нет христианских значков; убранных команд больше нет', async () => {
    const { iconsFor } = await import('../src/launcher/icons.js');
    const { COMMANDS } = await import('../src/launcher/actions.js');
    expect(iconsFor(false).map((i) => i.id)).not.toContain('chirho');
    expect(iconsFor(true).map((i) => i.id)).toContain('chirho');
    expect(COMMANDS.map((c) => c.id)).not.toContain('rest');
    expect(COMMANDS.map((c) => c.id)).not.toContain('verseNext');
  });
  it('каждый крест — свой рисунок; на главном не больше семи приложений', async () => {
    const { CROSS_IDS, crossSVG } = await import('../src/launcher/cross.js');
    expect(CROSS_IDS).toEqual(['latin', 'greek', 'orthodox', 'circle']);
    expect(new Set(CROSS_IDS.map((id) => crossSVG(id))).size).toBe(CROSS_IDS.length);
    const data = await import('../src/launcher/data.js');
    expect(data.HOME_MAX).toBe(7);
    data.prefs.home = Array.from({ length: 10 }, (_, i) => ({ key: 'a' + i, label: '' }));
    const { homeItems } = await import('../src/launcher/apps.js');
    expect(homeItems()).toHaveLength(7);
    data.prefs.home = null;
  });
  it('скрытое приложение пропадает отовсюду: все приложения, главный, значки, папки; вернуть — снова видно', async () => {
    vi.resetModules();
    const data = await import('../src/launcher/data.js');
    const apps = await import('../src/launcher/apps.js');
    await apps.loadApps(); // браузер: ссылки вместо приложений
    const key = 'web.music';
    data.prefs.home = [{ key, label: '' }, { key: 'web.maps', label: '' }];
    data.prefs.dock = [{ icon: 'music', action: { t: 'app', key } }];
    expect(apps.allApps().some((a) => a.key === key)).toBe(true);
    apps.setHidden(key, true);
    expect(apps.allApps().some((a) => a.key === key)).toBe(false);
    expect(apps.hiddenApps().map((a) => a.key)).toEqual([key]);
    expect(apps.homeItems().map((x) => x.key)).toEqual(['web.maps']);
    expect(apps.dockSlots()).toHaveLength(0);
    const { folderApps } = await import('../src/launcher/folders.js');
    expect(folderApps({ apps: [key, 'web.maps'] }).map((a) => a.key)).toEqual(['web.maps']);
    apps.setHidden(key, false);
    expect(apps.allApps().some((a) => a.key === key)).toBe(true);
    data.prefs.hidden = []; data.prefs.home = null; data.prefs.dock = null;
  });
  it('старые настройки переходят на минимальный экран: украшения убраны, приложения и жесты на месте', async () => {
    const old = { theme: 'paper', clock: 'codex', wallpaper: 'sun', ornament: 'wheel', style: 'rich', font: 'literata', church: true,
      home: Array.from({ length: 9 }, (_, i) => ({ key: 'k' + i, label: '' })), gestures: { swipeUp: { t: 'cmd', id: 'drawer' } } };
    localStorage.setItem('elachiston.prefs', JSON.stringify(old));
    vi.resetModules();
    const { prefs } = await import('../src/launcher/data.js');
    expect(prefs.v).toBe(2);
    expect(prefs.theme).toBe('light');
    expect(prefs.align).toBe('right');
    ['clock', 'wallpaper', 'ornament', 'style', 'font'].forEach((k) => expect(prefs[k], k).toBeUndefined());
    expect(prefs.church).toBe(true);
    expect(prefs.home).toHaveLength(7);
    expect(prefs.gestures.swipeUp.id).toBe('drawer');
    localStorage.removeItem('elachiston.prefs');
    vi.resetModules();
  });
});

describe('главный экран: копия данных', () => {
  it('копия — кошелёк, блокнот, настройки, замок; загрузка заменяет их; чужой файл не принимается', async () => {
    mem['elachiston.notes'] = JSON.stringify([{ id: 'n', text: 'Заметка' }]);
    mem['elachiston.money.draft'] = JSON.stringify({ recs: [{ id: 'r', k: 'e', a: 5000, c: 'food', t: 1 }], budget: 0 });
    mem['elachiston.melete'] = JSON.stringify({ tree: 'content://…' }); // связь с папкой — своя у каждого телефона, в копию не идёт
    const { snapshot, parse, restore, summary } = await import('../src/launcher/backup.js');
    const s = parse(JSON.stringify(snapshot()));
    expect(summary(s)).toEqual({ notes: 1, recs: 1 });
    expect(s.data['elachiston.melete']).toBeUndefined();
    mem['elachiston.notes'] = '[]';
    await restore(s);
    expect(JSON.parse(mem['elachiston.notes'])).toHaveLength(1);
    expect(() => parse(JSON.stringify({ version: 1, sessions: [] }))).toThrow();
  });
});
