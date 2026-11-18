// Листание между инструментами (18.11.2026): чистая логика широкого смахивания и таблица nav модулей
import { describe, it, expect } from 'vitest';
import { wideDir, WIDE } from '../src/ui/gestures.js';
import { navOf, NAV_OVERRIDE, NAV_MODES } from '../src/core/modules.js';

const box = { left: 0, width: 400 }, SCR = 400;
// путь пальца: x0 → x1 за dt мс, по вертикали на dy
const path = (x0, x1, dt = 250, dy = 10) => ({ x0, y0: 300, x1, y1: 300 + dy, dt });

describe('wideDir: широкое смахивание от края до края', () => {
  it('справа налево от правого края — дальше (1)', () => { expect(wideDir(path(370, 20), box, SCR)).toBe(1); });
  it('слева направо от левого края — назад (-1)', () => { expect(wideDir(path(30, 380), box, SCR)).toBe(-1); });
  it('обычное смахивание по середине — нет', () => {
    expect(wideDir(path(250, 60), box, SCR)).toBe(0);
    expect(wideDir(path(200, 20), box, SCR)).toBe(0);
  });
  it('короче 85 % ширины — нет', () => { expect(wideDir(path(380, 60), box, SCR)).toBe(0); }); // 320 из 400 = 80 %
  it('ровно 85 % — да', () => { expect(wideDir(path(380, 40), box, SCR)).toBe(1); });
  it('медленнее 450 мс — нет', () => {
    expect(wideDir(path(370, 20, 451), box, SCR)).toBe(0);
    expect(wideDir(path(370, 20, 450), box, SCR)).toBe(1);
  });
  it('наклонное (больше 25 % по вертикали) — нет', () => { expect(wideDir(path(370, 20, 250, 120), box, SCR)).toBe(0); });
  it('начало вне крайней зоны 12 % — нет', () => {
    expect(wideDir(path(330, -20, 250), { left: 0, width: 400 }, 0)).toBe(0); // 82 % слева: не в зоне
    expect(wideDir(path(60, 410, 250), { left: 0, width: 400 }, 0)).toBe(0); // 15 % от левого края
  });
  it('край экрана (жест «Назад» Android) не начинает смахивание', () => {
    expect(wideDir(path(396, 20), box, SCR)).toBe(0);
    expect(wideDir(path(8, 380), box, SCR)).toBe(0);
    expect(wideDir(path(396, 20), box, 0)).toBe(1); // без ширины экрана проверка края не нужна
  });
  it('окно сдвинуто (не от левого края экрана): зоны — от краёв окна', () => {
    const b = { left: 100, width: 300 };
    expect(wideDir({ x0: 390, y0: 0, x1: 120, y1: 5, dt: 200 }, b, 0)).toBe(1);
    expect(wideDir({ x0: 110, y0: 0, x1: 380, y1: 5, dt: 200 }, b, 0)).toBe(-1);
  });
  it('нулевая ширина и отрицательное время — нет', () => {
    expect(wideDir(path(10, 20), { left: 0, width: 0 }, 0)).toBe(0);
    expect(wideDir(path(370, 20, -5), box, SCR)).toBe(0);
  });
  it('пороги — по слову автора', () => { expect(WIDE).toMatchObject({ zone: 0.12, span: 0.85, ms: 450 }); });
});

describe('meta.nav: умолчания ядра', () => {
  it('без листания — там, где играют пальцами', () => {
    ['glider', 'theremin', 'drone', 'looper', 'studio'].forEach((id) => expect(navOf(id)).toBe('none'));
  });
  it('широкое — пианино, ноты, ритм, пульт', () => {
    ['piano', 'notes', 'beat', 'show'].forEach((id) => expect(navOf(id)).toBe('edge'));
  });
  it('остальные — обычное смахивание', () => {
    ['metro', 'tuner', 'theory', 'audio', 'ear', 'voice', 'unknown-x'].forEach((id) => expect(navOf(id)).toBe('swipe'));
  });
  it('meta.nav модуля важнее таблицы; неверное значение — умолчание', () => {
    expect(navOf({ id: 'glider', nav: 'swipe' })).toBe('swipe');
    expect(navOf({ id: 'metro', nav: 'none' })).toBe('none');
    expect(navOf({ id: 'metro', nav: 'bogus' })).toBe('swipe');
    expect(navOf({ id: 'piano' })).toBe('edge');
  });
  it('таблица — только допустимые значения', () => {
    Object.values(NAV_OVERRIDE).forEach((v) => expect(NAV_MODES).toContain(v));
  });
});
