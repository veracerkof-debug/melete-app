import { describe, it, expect } from 'vitest';
import { visibleTabs, hiddenTabs, editTabs, placeTab, tabToTools, DEFAULT_TABS } from '../src/core/settings.js';

globalThis.document ??= { documentElement: {}, addEventListener() {}, createElement: () => ({ style: {} }) };
globalThis.navigator ??= { language: 'ru' };
const { modules, skippedModules, validate, loadModule } = await import('../src/modules/index.js');
const template = (await import('../docs/module-template/index.js')).default;

describe('реестр модулей', () => {
  it('встроенные модули подключены по порядку, без ошибок', () => {
    expect(skippedModules).toEqual([]);
    expect(modules.map((m) => m.id)).toEqual(['bible', 'metro', 'tuner', 'piano', 'glider', 'theremin', 'drone', 'looper', 'studio', 'theory', 'ear', 'timer', 'audio', 'notes', 'voice', 'spectrum']);
    modules.forEach((m) => expect(m.i18n.ru.about, m.id).toBeTruthy());
  });
  it('при запуске — только описания; сам модуль догружается по требованию и совпадает с описанием', async () => {
    expect(modules.every((m) => !m.loaded)).toBe(true);
    for (const m of modules) {
      const color = m.color;
      m.color = '#123456'; // поле описания, изменённое ядром на ходу (палитра), загрузка не перетирает
      const full = await loadModule(m.id);
      expect(full, m.id).toBe(m);
      expect(validate(m), m.id).toBe(null);
      expect(m.loaded && typeof m.mount, m.id).toBe('function');
      expect(m.color).toBe('#123456');
      m.color = color;
    }
    expect(skippedModules).toEqual([]);
  }, 60_000); // все 16 модулей целиком — под общей нагрузкой тестов дольше 5 с
  it('шаблон модуля проходит проверку контракта', () => {
    expect(validate(template)).toBe(null);
  });
  it('ошибки в описании модуля находятся', () => {
    const ok = { ...template };
    expect(validate(null)).toMatch(/default export/);
    expect(validate({ ...ok, id: 'Мой' })).toMatch(/latin/);
    expect(validate({ ...ok, mount: null })).toMatch(/mount/);
    expect(validate({ ...ok, name: {} })).toMatch(/name/);
  });
});

describe('вкладки', () => {
  const KNOWN = ['home', 'library', 'tools', 'calendar'];
  const T3 = ['home', 'library', 'tools'];
  const mk = (st = {}) => ({ state: { settings: st }, settingsChanged() {} });
  it('по умолчанию — все; новая вкладка появляется в конце, убранная не возвращается', () => {
    expect(DEFAULT_TABS).toEqual(['home', 'library', 'calendar', 'tools']);
    expect(visibleTabs({}, DEFAULT_TABS)).toEqual(DEFAULT_TABS);
    // у тех, кто ещё не настраивал вкладки, новая встаёт на своё место по умолчанию
    expect(visibleTabs({}, KNOWN)).toEqual(DEFAULT_TABS);
    expect(visibleTabs({ tabs: ['tools', 'home'], tabsOff: ['library'] }, KNOWN)).toEqual(['tools', 'home', 'calendar']);
    expect(hiddenTabs({ tabs: ['tools', 'home'], tabsOff: ['library'] }, KNOWN)).toEqual(['library']);
  });
  it('переставить, убрать, вернуть; главная и «Инструменты» остаются', () => {
    const s = mk();
    expect(editTabs(s, T3, 'tools', 'up')).toBe(true);
    expect(visibleTabs(s.state.settings, T3)).toEqual(['home', 'tools', 'library']);
    expect(editTabs(s, T3, 'home', 'off')).toBe(false);
    expect(editTabs(s, T3, 'tools', 'off')).toBe(false);
    expect(editTabs(s, T3, 'library', 'off')).toBe(true);
    expect(visibleTabs(s.state.settings, T3)).toEqual(['home', 'tools']);
    editTabs(s, T3, 'library', 'on');
    expect(visibleTabs(s.state.settings, T3)).toEqual(['home', 'tools', 'library']);
    // старые данные с убранной главной — главная возвращается первой
    expect(visibleTabs({ tabs: ['x'], tabsOff: T3 }, T3)).toEqual(['home', 'tools']);
  });
  it('перенос жестом: вкладка в инструменты и обратно на место', () => {
    const s = mk(), K = ['home', 'library', 'calendar', 'tools'];
    expect(tabToTools(s, K, 'calendar')).toBe(true);
    expect(tabToTools(s, K, 'home')).toBe(false);
    expect(visibleTabs(s.state.settings, K)).toEqual(['home', 'library', 'tools']);
    expect(placeTab(s, K, 'calendar', 1)).toBe('ok');
    expect(visibleTabs(s.state.settings, K)).toEqual(['home', 'calendar', 'library', 'tools']);
    // инструмент — вкладкой (tabMods), обратно — в инструменты
    expect(placeTab(s, K, 'metro', 2)).toBe('ok');
    expect(s.state.settings.tabMods).toEqual(['metro']);
    expect(visibleTabs(s.state.settings, [...K, 'metro'])).toEqual(['home', 'calendar', 'metro', 'library', 'tools']);
    expect(tabToTools(s, [...K, 'metro'], 'metro')).toBe(true);
    expect(s.state.settings.tabMods).toEqual([]);
  });
});
