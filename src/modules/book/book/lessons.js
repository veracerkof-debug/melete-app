// Уроки учебника (решение автора 30.10.2026): глава делится на уроки по кускам текста — secs (0 — вступление до первого
// подзаголовка h3, 1 — первый подзаголовок…); текст не повторяется: главу можно читать подряд или проходить уроками.
// Урок: название ls.<id>; упражнения — по инструменту lx.<id>.p | .g | .b (пианино, гитара, бас) и без инструмента lx.<id>.t;
// проверки — схемы с настройкой поверх st ({ lab, cfg, only — для каких инструментов, по умолчанию для всех }):
// xplay — сыграть ноты, xchord — аккорды, xtap — ритм касаниями, xtool — открыть инструмент (labs6.js);
// ex — вопросы тренировки нужных видов (labs.js), sing — пение с тюнером (labs5.js).
// Порядок «Начального пути» (PATH) — учебный, по опыту курсов (Justin Guitar, Simply Piano, Fender Play, школы Alfred,
// Hal Leonard; программа сольфеджио 1 класса): ритм с первого урока, аккорды к девятому, песня с аккордами к десятому.

const tool = (t, bpm) => ({ lab: 'xtool', cfg: { tool: t, bpm: bpm || 0 } });
const play = (n, only) => ({ lab: 'xplay', cfg: { n }, only });
const chord = (ch, only) => ({ lab: 'xchord', cfg: { ch }, only });
const tap = (cells, bpm = 72, sub = 2, num = 4) => ({ lab: 'xtap', cfg: { cells, bpm, sub, num } });
const quiz = (...kinds) => ({ lab: 'ex', cfg: { on: kinds.join(','), fixed: true } });
const sing = (kind) => ({ lab: 'sing', cfg: { kind, fixed: true } });
const piece = (id) => ({ lab: 'piece', cfg: { id } }); // произведение (pieces.js): ноты, табы, проверка игры

export const LESSONS = {
  play: [
    { id: 'play1', secs: [0, 1, 2], ex: [tool('tuner'), play({ p: 'C4 D4 E4 F4 G4', g: 'E2 A2 D3 G3 B3 E4', b: 'E1 A1 D2 G2' })] },
    { id: 'play2', secs: [3], ex: [chord({ p: 'C F G C', g: 'A D E A' }, 'pg'), play({ b: 'A1 E2 D2 A2 E1 B1' }, 'b'), tool('metro', 60), piece('rising')] },
    { id: 'play3', secs: [4], ex: [chord({ p: 'C F G C', g: 'G C D G' }, 'pg'), play({ b: 'G1 C2 D2 G1' }, 'b'), tool('metro', 80), piece('saints')] },
    { id: 'play4', secs: [5], ex: [play({ p: 'C3 B2 A2 F2 G2 C3', g: 'C3 B2 A2 F2 G2 C3', b: 'C2 B1 A1 F1 G1 C2' }), tool('metro', 70), piece('canon')] },
    { id: 'play5', secs: [6], ex: [play({ p: 'A4 C5 D5 E5 G5 A5', g: 'A2 C3 D3 E3 G3 A3', b: 'A1 C2 D2 E2 G2 A2' }), tool('metro', 90), piece('mblues')] },
    { id: 'play6', secs: [7], ex: [piece('amazing'), tool('metro', 80), tool('audio')] },
  ],
  sound: [
    { id: 'sound1', secs: [0, 1, 2], ex: [tool('tuner'), sing('iv')] },
    { id: 'sound2', secs: [3, 4, 5], ex: [play({ p: 'C4 D4 E4 F4 G4 A4 B4 C5', g: 'E4 F4 G4 B3 C4 D4', b: 'E1 F1 G1 A1 B1 C2' }), quiz('staff'), piece('lightly')] },
    { id: 'sound3', secs: [6, 7, 8], ex: [quiz('staff')] },
  ],
  rhythm: [
    { id: 'rhythm1', secs: [0, 1], ex: [tool('metro', 70), tap('1010101010001000', 70), piece('twinkle')] },
    { id: 'rhythm2', secs: [2, 3], ex: [tap('1001101010001000', 72), piece('ode')] },
    { id: 'rhythm3', secs: [4, 5], ex: [tap('100100111100111100111100', 66, 3)] },
    { id: 'rhythm4', secs: [6], ex: [tap('1111111110101010', 80)] },
  ],
  meter: [
    { id: 'meter1', secs: [0, 1, 2], ex: [tool('metro', 80), tap('1010101010101010', 80), piece('jacques')] },
    { id: 'meter2', secs: [3, 4, 5], ex: [tap('101010100010', 90, 2, 3), piece('amazing')] },
    { id: 'meter3', secs: [6, 7], ex: [tap('1011010110110100', 76), piece('saints')] },
  ],
  pitch: [
    { id: 'pitch1', secs: [0, 1, 2], ex: [play({ p: 'C4 C#4 D4 D#4 E4 F4', g: 'E4 F4 F#4 G4 G#4 A4', b: 'E1 F1 F#1 G1 G#1 A1' }), piece('mountain')] },
    { id: 'pitch2', secs: [3, 4], ex: [tool('tuner')] },
  ],
  mode: [
    { id: 'mode1', secs: [0, 1, 2], ex: [play({ p: 'C4 D4 E4 F4 G4 A4 B4 C5', g: 'C3 D3 E3 F3 G3 A3 B3 C4', b: 'C2 D2 E2 F2 G2 A2 B2 C3' }), sing('deg')] },
    { id: 'mode2', secs: [3, 4], ex: [play({ p: 'B3 C4 D4 C4 F4 E4', g: 'B2 C3 D3 C3 F3 E3', b: 'B1 C2 D2 C2 F2 E2' }), sing('deg')] },
    { id: 'mode3', secs: [5], ex: [play({ p: 'A3 B3 C4 D4 E4 F4 G#4 A4', g: 'A2 B2 C3 D3 E3 F3 G#3 A3', b: 'A1 B1 C2 D2 E2 F2 G#2 A2' }), piece('greensleeves')] },
  ],
  keys: [
    { id: 'keys1', secs: [0, 1, 2, 3], ex: [play({ p: 'G3 A3 B3 C4 D4 E4 F#4 G4', g: 'G2 A2 B2 C3 D3 E3 F#3 G3', b: 'G1 A1 B1 C2 D2 E2 F#2 G2' }), quiz('sig'), piece('minuet')] },
    { id: 'keys2', secs: [4, 5], ex: [tool('theory'), quiz('rel', 'sig')] },
    { id: 'keys3', secs: [6, 7], ex: [quiz('degof')] },
  ],
  melody: [
    { id: 'melody1', secs: [0, 1, 2], ex: [piece('ode')] },
    { id: 'melody2', secs: [3, 4], ex: [play({ p: 'C4 D4 E4 D4 E4 F4 E4 F4 G4', g: 'C3 D3 E3 D3 E3 F3 E3 F3 G3', b: 'C2 D2 E2 D2 E2 F2 E2 F2 G2' }), piece('korobeiniki')] },
  ],
  perform: [
    { id: 'perform1', secs: [0, 1, 2], ex: [tool('metro', 60), tool('metro', 120)] },
    { id: 'perform2', secs: [3, 4, 5], ex: [piece('furelise')] },
  ],
  iv: [
    { id: 'iv1', secs: [0], ex: [quiz('ivname', 'ivear'), sing('iv')] },
    { id: 'iv2', secs: [1, 2, 3], ex: [quiz('inv', 'ivbuild')] },
    { id: 'iv3', secs: [4, 5], ex: [quiz('ivear')] },
    { id: 'iv4', secs: [6], ex: [quiz('ivbuild')] },
  ],
  chords: [
    { id: 'chords1', secs: [0, 1], ex: [chord({ p: 'C F G Am', g: 'A D E Am Em' }, 'pg'), play({ b: 'C2 E2 G2 A1 C2 E2' }, 'b'), quiz('triear')] },
    { id: 'chords2', secs: [2], ex: [quiz('invear'), chord({ p: 'C F G C', g: 'C G Am F' }, 'pg'), piece('prelude')] },
    { id: 'chords3', secs: [3, 4], ex: [quiz('chear', 'spell')] },
    { id: 'chords4', secs: [5, 6], ex: [quiz('chear')] },
    { id: 'chords5', secs: [7], ex: [] },
  ],
  scales: [
    { id: 'scales1', secs: [0, 1, 2], ex: [play({ p: 'D4 E4 F4 G4 A4 B4 C5 D5', g: 'D3 E3 F3 G3 A3 B3 C4 D4', b: 'D2 E2 F2 G2 A2 B2 C3 D3' }), quiz('scale')] },
    { id: 'scales2', secs: [3], ex: [quiz('scale')] },
    { id: 'scales3', secs: [4, 5, 6], ex: [play({ p: 'A3 B3 C4 D4 E4 F#4 G#4 A4', g: 'A2 B2 C3 D3 E3 F#3 G#3 A3', b: 'A1 B1 C2 D2 E2 F#2 G#2 A2' })] },
    { id: 'scales4', secs: [7, 8, 9], ex: [play({ p: 'A4 C5 D5 Eb5 E5 G5 A5', g: 'A2 C3 D3 Eb3 E3 G3 A3', b: 'A1 C2 D2 Eb2 E2 G2 A2' })] },
    { id: 'scales5', secs: [10, 11, 12], ex: [] },
  ],
  key: [
    { id: 'key1', secs: [0, 1, 2], ex: [chord({ p: 'C F G C', g: 'G C D G' }, 'pg'), play({ b: 'C2 F2 G2 C2' }, 'b'), quiz('func', 'rn'), piece('jingle')] },
    { id: 'key2', secs: [3, 4, 5], ex: [chord({ p: 'Am Dm E Am', g: 'Am Dm E Am' }, 'pg'), play({ b: 'A1 D2 E2 A1' }, 'b')] },
  ],
  // джазовый раздел
  slash: [{ id: 'slash1', secs: [0, 1], ex: [] }, { id: 'slash2', secs: [2, 3], ex: [] }],
  melmin: [
    { id: 'melmin1', secs: [0, 1], ex: [play({ p: 'C4 D4 Eb4 F4 G4 A4 B4 C5', g: 'C3 D3 Eb3 F3 G3 A3 B3 C4', b: 'C2 D2 Eb2 F2 G2 A2 B2 C3' }), quiz('parent')] },
    { id: 'melmin2', secs: [2, 3, 4], ex: [quiz('twin', 'parent')] },
  ],
  iivi: [
    { id: 'iivi1', secs: [0, 1], ex: [play({ p: 'F4 C5 F4 B4 E4 B4', g: 'F3 C4 F3 B3 E3 B3', b: 'D2 G2 C2' }), piece('miivi')] },
    { id: 'iivi2', secs: [2, 3], ex: [quiz('iivi'), tool('metro', 100)] },
    { id: 'iivi3', secs: [4, 5], ex: [quiz('iivi')] },
  ],
  ana: [
    { id: 'ana1', secs: [0, 1], ex: [quiz('rn', 'secdom')] },
    { id: 'ana2', secs: [2, 3], ex: [quiz('secdom')] },
    { id: 'ana3', secs: [4, 5], ex: [quiz('subv', 'dim7')] },
  ],
  voice: [
    { id: 'voice1', secs: [0, 1], ex: [play({ p: 'D3 C4 F4 G2 F3 B3 C3 B3 E4', g: 'D3 C4 F4 G2 F3 B3 C3 B3 E4', b: 'D2 A2 C3 G1 D2 F2 C2 G2 B2' })] },
    { id: 'voice2', secs: [2, 3], ex: [tool('metro', 90)] },
    { id: 'voice3', secs: [4], ex: [quiz('twin')] },
    { id: 'voice4', secs: [5, 6, 7], ex: [] },
    { id: 'voice5', secs: [8, 9], ex: [] },
  ],
  hands: [
    { id: 'hands1', secs: [0, 1], ex: [play({ p: 'D3 G3 C4 F4 A4', g: 'D3 G3 C4 F4 A4', b: 'D2 A2 D3 F3 A3' })] },
    { id: 'hands2', secs: [2, 3], ex: [] },
    { id: 'hands3', secs: [4, 5, 6], ex: [] },
  ],
  mod: [{ id: 'mod1', secs: [0, 1, 2], ex: [] }, { id: 'mod2', secs: [3, 4], ex: [] }],
  reharm: [
    { id: 'reharm1', secs: [0, 1, 2], ex: [quiz('func')] },
    { id: 'reharm2', secs: [3, 4, 5], ex: [quiz('subv', 'dim7')] },
    { id: 'reharm3', secs: [6, 7], ex: [quiz('verdict')] },
    { id: 'reharm4', secs: [8, 9, 10], ex: [] },
    { id: 'reharm5', secs: [11, 12], ex: [] },
    { id: 'reharm6', secs: [13], ex: [quiz('twin')] },
  ],
  centers: [
    { id: 'centers1', secs: [0, 1], ex: [quiz('countdown')] },
    { id: 'centers2', secs: [2, 3], ex: [quiz('countdown', 'locv')] },
  ],
  comp: [
    { id: 'comp1', secs: [0, 1, 2], ex: [tool('metro', 120)] },
    { id: 'comp2', secs: [3, 4], ex: [tap('1001000010010000', 120)] },
    { id: 'comp3', secs: [5, 6], ex: [] },
  ],
  latin: [
    { id: 'latin1', secs: [0, 1], ex: [quiz('clave')] },
    { id: 'latin2', secs: [2, 3], ex: [tap('1001001000101000', 100)] },
    { id: 'latin3', secs: [4, 5], ex: [tap('0010100010010010', 100)] },
  ],
  forms: [
    { id: 'forms1', secs: [0, 1, 2], ex: [quiz('flen')] },
    { id: 'forms2', secs: [3, 4], ex: [piece('mblues')] },
    { id: 'forms3', secs: [5, 6, 7], ex: [] },
  ],
  arr: [{ id: 'arr1', secs: [0, 1], ex: [] }, { id: 'arr2', secs: [2], ex: [] }, { id: 'arr3', secs: [3, 4], ex: [] }],
  impro: [
    { id: 'impro1', secs: [0, 1, 2], ex: [quiz('scale')] },
    { id: 'impro2', secs: [3, 4], ex: [] },
    { id: 'impro3', secs: [5, 6, 7], ex: [] },
  ],
  lines: [
    { id: 'lines1', secs: [0, 1, 2], ex: [play({ p: 'G4 A4 B4 D5 E5', g: 'G3 A3 B3 D4 E4', b: 'G2 A2 B2 D3 E3' }), quiz('m6over')] },
    { id: 'lines2', secs: [3, 4, 5], ex: [play({ p: 'G4 F#4 F4 E4 D4 C4 B3 A3 G3', g: 'G3 F#3 F3 E3 D3 C3 B2 A2 G2', b: 'G2 F#2 F2 E2 D2 C2 B1 A1 G1' })] },
  ],
  outside: [{ id: 'outside1', secs: [0, 1], ex: [] }],
  trad: [{ id: 'trad1', secs: [0, 1], ex: [piece('saints')] }, { id: 'trad2', secs: [2, 3], ex: [] }],
  tune: [
    { id: 'tune1', secs: [0, 1, 2], ex: [quiz('verdict')] },
    { id: 'tune2', secs: [3], ex: [] },
    { id: 'tune3', secs: [4, 5, 6], ex: [] },
  ],
  practice: [
    { id: 'practice1', secs: [0, 1, 2], ex: [] },
    { id: 'practice2', secs: [3, 4, 5], ex: [tool('audio')] },
    { id: 'practice3', secs: [6, 7, 8], ex: [] },
  ],
};

// Пути: от новичка до продвинутого. start — «Начальный путь» (с нуля до первой песни), mid — «Уверенный музыкант»
// (грамота и гармония школы до конца, классика), jazz — «Джазовый путь» (от ii–V–I до игры «снаружи»), pro — «Мастерство»
// (всё остальное: напряжения, расположения, реармонизация, аранжировка, формы, тема)
export const PATHS = {
  start: ['play1', 'rhythm1', 'sound2', 'rhythm2', 'meter1', 'pitch1', 'mode1', 'chords1', 'play2', 'play3',
    'iv1', 'keys1', 'keys2', 'key1', 'mode3', 'play4', 'meter2', 'meter3', 'play5', 'play6'],
  mid: ['sound1', 'sound3', 'rhythm3', 'rhythm4', 'pitch2', 'mode2', 'keys3', 'melody1', 'melody2', 'perform1',
    'perform2', 'iv2', 'iv3', 'iv4', 'chords2', 'chords3', 'scales1', 'scales3', 'key2', 'practice1'],
  jazz: ['slash1', 'melmin1', 'iivi1', 'iivi2', 'ana1', 'voice1', 'voice2', 'comp1', 'comp2', 'forms1', 'forms2', 'lines1',
    'impro1', 'iivi3', 'ana2', 'voice3', 'hands1', 'comp3', 'impro2', 'lines2', 'ana3', 'melmin2', 'mod1', 'mod2', 'reharm1',
    'reharm2', 'latin1', 'latin2', 'arr1', 'arr2', 'reharm3', 'centers1', 'centers2', 'hands3', 'outside1', 'tune1'],
  pro: ['chords4', 'scales2', 'slash2', 'voice4', 'hands2', 'scales4', 'reharm4', 'reharm5', 'reharm6', 'latin3', 'forms3', 'arr3',
    'voice5', 'impro3', 'chords5', 'scales5', 'trad1', 'trad2', 'tune2', 'tune3', 'practice2', 'practice3'],
};
export const PATH = PATHS.start;
// какие пути показывать в разделе учебника
export const SEC_PATHS = { school: ['start', 'mid'], jazz: ['jazz', 'pro'] };

export const lessonById = (id) => { for (const [ch, ls] of Object.entries(LESSONS)) { const i = ls.findIndex((l) => l.id === id); if (i >= 0) return { ...ls[i], ch, n: i + 1 }; } return null; };
export const INSTS = ['p', 'g', 'b'];
