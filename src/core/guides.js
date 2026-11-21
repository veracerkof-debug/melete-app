// Инструкции-инфографика (слово автора 21.11.2026): шаги карточками со значками вместо списка текста; для базовых инструментов (метроном, тюнер, таймер, спектр) инструкций нет вовсе.
// Тексты шагов — прежние (help.1…help.6 модуля, hc.<id>.1… ядра), здесь — только значок к каждому по порядку. Цвет карточки — цвет семьи инструмента.
export const BASIC = ['metro', 'tuner', 'timer', 'spectrum'];

const G = {
  plus: '<path d="M12 5v14M5 12h14"/>', speed: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/>',
  loop: '<path d="M17 4l3 3-3 3M20 7H8a4 4 0 0 0-4 4M7 20l-3-3 3-3M4 17h12a4 4 0 0 0 4-4"/>',
  tap: '<circle cx="12" cy="9" r="2.4"/><path d="M12 11.4V20M7.5 7a6 6 0 0 1 9 0"/>',
  swipe: '<path d="M4 12h14M14 8l4 4-4 4"/>', move: '<path d="M12 4v16M4 12h16M9 7l3-3 3 3M9 17l3 3 3-3M7 9l-3 3 3 3M17 9l3 3-3 3"/>',
  keys: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 6v12M12 6v12M16 6v12"/>',
  circle: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  cards: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  sliders: '<path d="M5 8h14M5 16h14"/><circle cx="9" cy="8" r="2"/><circle cx="15" cy="16" r="2"/>',
  ear: '<path d="M8 10a4 4 0 0 1 8 0c0 3-3 3-3 6a2 2 0 0 1-4 0"/><path d="M11 10a1 1 0 0 1 2 0"/>',
  axes: '<path d="M5 19V5M5 19h14M9 15l3-4 3 2 3-5"/>', fingers: '<path d="M7 20V10M11 20V5M15 20V7M19 20V12"/>',
  rec: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.6"/>', clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  undo: '<path d="M9 7L5 11l4 4M5 11h9a5 5 0 0 1 0 8h-3"/>', pedal: '<rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 13h10"/>',
  layers: '<path d="M12 4l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4"/>',
  file: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/>', text: '<path d="M5 6h14M5 11h14M5 16h9"/>',
  midi: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9v6M12 9v6M16 9v6"/>', arrows: '<path d="M8 6l-4 6 4 6M16 6l4 6-4 6"/>',
  hold: '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="7"/>', rows: '<rect x="4" y="5" width="16" height="6" rx="1.5"/><rect x="4" y="13" width="16" height="6" rx="1.5"/>',
  tapadd: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>', track: '<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="1.5"/><circle cx="15" cy="12" r="1.5"/>',
  bars: '<path d="M4 18h16M7 18V9M12 18V6M17 18V12"/>', book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6.5a1.5 1.5 0 0 1 3 0V14c0 3.5-2.4 6-5.5 6S7 18 6 15l-1.4-3.2a1.4 1.4 0 0 1 2.4-1.3L8 12"/>',
  fist: '<rect x="6" y="9" width="12" height="9" rx="4"/><path d="M9 9V7M12 9V6M15 9V7"/>', guitar: '<path d="M5 19L17 7M15 5l4 4M7 17l-2 2"/><circle cx="8" cy="16" r="3"/>',
  range: '<path d="M5 18h14M8 14h8M10 10h4"/>', staff: '<path d="M4 8h16M4 12h16M4 16h16"/><circle cx="14" cy="12" r="2"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4"/>', wave: '<path d="M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>', cal: '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>', user: '<circle cx="12" cy="9" r="3.6"/><path d="M5 19.5c1.4-3.2 4-4.6 7-4.6s5.6 1.4 7 4.6"/>',
  windows: '<rect x="3.5" y="4.5" width="9" height="7" rx="1.5"/><rect x="11.5" y="12.5" width="9" height="7" rx="1.5"/>', pause: '<path d="M9 6v12M15 6v12"/>', check: '<path d="M5 12l5 5 9-10"/>',
  share: '<path d="M12 15V4M8 7.5 12 3.5l4 4M6 11H5v9h14v-9h-1"/>', folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>', dot: '<circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>', star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
};
export const glyph = (k) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (G[k] || G.dot) + '</svg>';

// Значок к каждому шагу по порядку (модули — по id, механизмы ядра — по id темы)
export const GUIDE = {
  audio: ['plus', 'speed', 'loop'], bible: ['book', 'hold', 'list', 'check'], drone: ['tap', 'swipe', 'keys', 'circle'], ear: ['cards', 'sliders', 'ear'],
  glider: ['axes', 'fingers'], looper: ['rec', 'clock', 'undo', 'pedal', 'move', 'layers'], notes: ['file', 'file', 'text', 'midi'], piano: ['arrows', 'hold', 'rows'],
  studio: ['tapadd', 'move', 'track', 'bars'], theory: ['circle', 'keys', 'book'], theremin: ['hand', 'fingers', 'fist', 'guitar'], vocal: ['range', 'staff', 'mic', 'wave'],
  voice: ['mic', 'wave', 'shield'], beat: ['cards', 'tap', 'sliders'], show: ['tap', 'list', 'plus'], convert: ['file', 'sliders', 'share'],
  start: ['cal', 'list', 'user'], songs: ['plus', 'cards', 'share'], session: ['windows', 'pause', 'check'], calendar: ['plus', 'list', 'share'],
  folder: ['folder', 'list', 'share'], share: ['list', 'cal', 'file'], melete: ['star', 'bell', 'bell'], owndata: ['user', 'file', 'shield'],
};
