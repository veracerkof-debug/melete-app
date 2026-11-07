// Обновление из GitHub (src/core/update.js): метка сборки и файл в релизе, новее или нет, когда проверять;
// «Что нового» (whatsnew.js): что показать после обновления
import { describe, it, expect, vi } from 'vitest';
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false }, registerPlugin: () => ({}) }));
const { parseRelease, isNewer, due, modeOf, FILES } = await import('../src/core/update.js');
const { NEWS, unseen, lastNews } = await import('../src/core/whatsnew.js');

const asset = (name, state = 'uploaded') => ({ name, state, size: 10, browser_download_url: 'https://github.com/veracerkof-debug/melete-app/releases/download/pre/' + name });

describe('update: релиз канала', () => {
  it('метка и файл на месте → номер сборки и ссылка', () => {
    const r = parseRelease({ assets: [asset('Melete-PreRelease.apk'), asset('android-251.ver'), asset('windows-90.ver'), asset('Melete-Setup.exe')] }, 'android', 'pre');
    expect(r.build).toBe(251);
    expect(r.url).toMatch(/Melete-PreRelease\.apk$/);
    expect(parseRelease({ assets: [asset('Melete-Setup.exe'), asset('windows-90.ver')] }, 'windows', 'pre').build).toBe(90);
    // Linux: свой AppImage и своя метка — чужие метки не путаются
    const lx = parseRelease({ assets: [asset('Melete-Dev.AppImage'), asset('linux-7.ver'), asset('windows-90.ver'), asset('Melete-Dev-Setup.exe')] }, 'linux', 'dev');
    expect(lx.build).toBe(7);
    expect(lx.url).toMatch(/Melete-Dev\.AppImage$/);
  });
  it('файл ещё грузится или метки нет → обновления нет', () => {
    expect(parseRelease({ assets: [asset('Melete-PreRelease.apk', 'starter'), asset('android-251.ver')] }, 'android', 'pre')).toBe(null);
    expect(parseRelease({ assets: [asset('Melete-PreRelease.apk')] }, 'android', 'pre')).toBe(null);
    expect(parseRelease(null, 'android', 'pre')).toBe(null);
  });
  it('каналы не путаются: dev берёт свой файл', () => {
    expect(parseRelease({ assets: [asset('Melete-PreRelease.apk'), asset('android-5.ver')] }, 'android', 'dev')).toBe(null);
    expect(parseRelease({ assets: [asset(FILES.android.dev), asset('android-5.ver')] }, 'android', 'dev').build).toBe(5);
  });
  it('новее — только больший номер; собранное у себя (0) не обновляется', () => {
    expect(isNewer({ build: 251 }, 250)).toBe(true);
    expect(isNewer({ build: 250 }, 250)).toBe(false);
    expect(isNewer({ build: 251 }, 0)).toBe(false);
    expect(isNewer(null, 250)).toBe(false);
  });
  it('проверка сама — раз в сутки и только в «автоматически»', () => {
    const now = Date.now();
    expect(due({}, now, 'auto')).toBe(true);
    expect(due({ at: now - 3600e3 }, now, 'auto')).toBe(false);
    expect(due({ at: now - 25 * 3600e3 }, now, 'auto')).toBe(true);
    expect(due({}, now, 'button')).toBe(false);
    expect(modeOf({})).toBe('auto');
    expect(modeOf({ updMode: 'button' })).toBe('button');
  });
});

describe('«Что нового»', () => {
  it('первый запуск — ничего; после обновления — только новые записи, свежие сверху', () => {
    expect(unseen(null)).toEqual([]);
    expect(unseen(lastNews())).toEqual([]);
    const l = unseen(0);
    expect(l.length).toBe(NEWS.length);
    expect(l[0].n).toBe(lastNews());
  });
  it('каждая запись — на трёх языках, номера не повторяются', () => {
    const ns = NEWS.map((e) => e.n);
    expect(new Set(ns).size).toBe(ns.length);
    for (const e of NEWS) for (const l of ['ru', 'en', 'uz']) { expect(e[l].length, e.n + ' ' + l).toBe(e.ru.length); expect(e[l].every((x) => x.length > 5)).toBe(true); }
  });
});

// Сборка идёт на GitHub (07.11.2026): сколько осталось — по медиане прошлых удачных сборок
import { buildingOf } from '../src/core/update.js';
describe('сборка на GitHub', () => {
  const T = Date.parse('2026-11-07T12:00:00Z'), iso = (ms) => new Date(ms).toISOString();
  const done = (n, min) => ({ run_number: n, status: 'completed', conclusion: 'success', run_started_at: iso(T - 864e5), updated_at: iso(T - 864e5 + min * 60000) });
  it('идёт новее установленной — осталось по медиане; старше или своя — ничего', () => {
    const runs = [{ run_number: 412, status: 'in_progress', run_started_at: iso(T - 5 * 60000) }, done(411, 14), done(410, 16), done(409, 30)];
    const b = buildingOf(runs, 411, T);
    expect(b.n).toBe(412);
    expect(Math.round(b.left / 60000)).toBe(11); // медиана 16 − прошло 5
    expect(b.late).toBe(false);
    expect(buildingOf(runs, 412, T)).toBe(null);
    expect(buildingOf([done(411, 14)], 400, T)).toBe(null);
  });
  it('дольше обычного — «вот-вот»; без истории — 15 минут; в очереди — помечено', () => {
    expect(buildingOf([{ run_number: 5, status: 'in_progress', run_started_at: iso(T - 40 * 60000) }, done(4, 10)], 4, T).late).toBe(true);
    const q = buildingOf([{ run_number: 5, status: 'queued', created_at: iso(T) }], 4, T);
    expect(q.queued).toBe(true);
    expect(q.left).toBe(15 * 60000);
  });
});
