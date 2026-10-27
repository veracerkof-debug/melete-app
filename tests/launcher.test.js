// Ἐλάχιστον — отдельное приложение главного экрана (src/launcher, launcher/): строки на трёх языках, мост с Melete
// и трекер считают как ядро Melete, солнце, числа, христианское — только в церковном режиме, стихи со ссылками, обновление.
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
    const { CLOCKS } = await import('../src/launcher/clocks.js');
    const { COMMANDS } = await import('../src/launcher/actions.js');
    const { GESTURES } = await import('../src/launcher/gestures.js');
    const { WALLPAPERS } = await import('../src/launcher/wallpapers.js');
    const { ORNAMENTS } = await import('../src/launcher/icons.js');
    const { CANONICAL } = await import('../src/launcher/numerals.js');
    const src = readdirSync('src/launcher').filter((f) => f.endsWith('.js')).map((f) => readFileSync('src/launcher/' + f, 'utf8')).join('\n');
    const keys = new Set([...src.matchAll(/(?<![\w.])t\('([a-zA-Z0-9_.]+)'/g)].map((m) => m[1]).filter((k) => !k.endsWith('.')));
    CLOCKS.forEach((c) => { keys.add('clock.' + c.id); keys.add('clock.' + c.id + '.info'); });
    COMMANDS.forEach((c) => keys.add('cmd.' + c.id));
    GESTURES.forEach((g) => keys.add('gest.' + g));
    WALLPAPERS.forEach((w) => { keys.add('wall.' + w.id); if (w.id !== 'none') keys.add('wall.' + w.id + '.hint'); });
    Object.keys(ORNAMENTS).forEach((o) => keys.add('orn.' + o));
    CANONICAL.forEach((c) => keys.add('canon.' + c.id));
    ICONS.forEach((i) => keys.add('icon.' + i.id));
    for (let i = 1; i <= 12; i++) keys.add('bib.hour.' + i);
    for (let i = 0; i < 7; i++) { keys.add('bib.day.' + i); keys.add('ex.gday.' + i); }
    ['morning', 'heat', 'decline', 'cool', 'w1', 'w2', 'w3'].forEach((k) => { keys.add('bib.' + k); keys.add('bib.note.' + k); });
    ['ex.bib.approx', 'ex.bib.exact', 'set.introHintChurch', 'set.tracker.church', 'set.sys.isDefault', 'set.sys.notDefault'].forEach((k) => keys.add(k));
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

describe('главный экран: время', () => {
  it('восход и закат в Москве 25 октября 2026 (UTC)', async () => {
    const { sunTimes } = await import('../src/launcher/sun.js');
    const r = sunTimes(new Date(2026, 9, 25, 12), 55.75, 37.62);
    const utcMin = (d) => d.getUTCHours() * 60 + d.getUTCMinutes();
    expect(Math.abs(utcMin(r.rise) - (4 * 60 + 18))).toBeLessThanOrEqual(6); // 07:18 мск
    expect(Math.abs(utcMin(r.set) - (14 * 60 + 8))).toBeLessThanOrEqual(6);  // 17:08 мск
  });
  it('греческие и римские числа, время словами', async () => {
    const { greekNumeral, romanNumeral, numberWords } = await import('../src/launcher/numerals.js');
    expect(greekNumeral(18)).toBe('ιηʹ');
    expect(greekNumeral(0)).toBe('ō');
    expect(romanNumeral(47)).toBe('XLVII');
    expect(numberWords(21, 'ru')).toBe('двадцать один');
    expect(numberWords(42, 'ru', true)).toBe('сорок две');
    expect(numberWords(5, 'en', true)).toBe('oh five');
    expect(numberWords(40, 'uz')).toBe('qirq');
  });
});

describe('главный экран: церковный режим', () => {
  it('без него — нет библейских часов, символов и команд', async () => {
    const { clocksFor } = await import('../src/launcher/clocks.js');
    const { iconsFor } = await import('../src/launcher/icons.js');
    const { commandsFor } = await import('../src/launcher/actions.js');
    expect(clocksFor({ church: false, lang: 'ru' }).map((c) => c.id)).not.toContain('biblical');
    expect(clocksFor({ church: true, lang: 'ru' }).map((c) => c.id)).toContain('biblical');
    expect(clocksFor({ church: false, lang: 'en' }).map((c) => c.id)).not.toContain('letters');
    expect(iconsFor(false).map((i) => i.id)).not.toContain('chirho');
    expect(iconsFor(true).map((i) => i.id)).toContain('chirho');
    expect(commandsFor(false).map((c) => c.id)).not.toContain('verseNext');
  });
  it('у каждого стиха дня — греческий текст, переводы и ссылка на главу', async () => {
    const { VERSE_IDS, verseByKey } = await import('../src/core/verses.js');
    const { azbykaUrl } = await import('../src/launcher/scripture.js');
    VERSE_IDS.forEach((k) => {
      const v = verseByKey(k);
      expect(v.gr && v.ru && v.en && v.uz, k).toBeTruthy();
      expect(azbykaUrl(v.ref), k).toMatch(/^https:\/\/azbyka\.ru\/biblia\/\?\w+\.\d+:\d+$/);
    });
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
