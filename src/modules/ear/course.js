// Уроки тренажёра слуха: шесть глав от функционального слуха (ступени после оборота) к интервалам, аккордам, ладам,
// диктанту и пению. Урок — настройки упражнения (sec, набор set и прочее) и число вопросов n. Названия — i18n ls.<id>,
// главы — lch.<id>; book — глава учебника. Логика пути — src/music/course.js.
const ALL_IV = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const dg = (id, set, extra = {}) => ({ id, sec: 'dg', set, mode: 'major', dgKind: 'note', ...extra });
const iv = (id, set, dir = 'up') => ({ id, sec: 'iv', set, dir });
const ch = (id, set, arp = true) => ({ id, sec: 'ch', set, arp });
const sc = (id, set) => ({ id, sec: 'sc', set, scDir: 'up' });

export const EAR_COURSE = [
  { id: 'dg', book: 'mode', lessons: [
    dg('d1', [0, 7]), dg('d2', [0, 4, 7]), dg('d3', [0, 4, 5, 7]), dg('d4', [0, 2, 4, 5, 7]), dg('d5', [0, 2, 4, 5, 7, 9]),
    dg('d6', [0, 2, 4, 5, 7, 9, 11]), dg('d7', [0, 3, 7], { mode: 'minor' }), dg('d8', [0, 2, 3, 5, 7, 8, 10], { mode: 'minor' }),
    dg('d9', [0, 2, 4, 5, 7], { dgKind: 'chain', level: 'mid' }), dg('d10', [0, 2, 4, 5, 7, 9, 11], { dgKind: 'chord' }),
  ] },
  { id: 'iv', book: 'iv', lessons: [
    iv('i1', [7, 12]), iv('i2', [4, 7, 12]), iv('i3', [3, 4]), iv('i4', [3, 4, 5, 7]), iv('i5', [1, 2, 3, 4]),
    iv('i6', [8, 9, 10, 11]), iv('i7', ALL_IV), iv('i8', ALL_IV, 'down'), iv('i9', [3, 4, 5, 7, 8, 9], 'harm'), iv('i10', ALL_IV, 'mix'),
  ] },
  { id: 'ch', book: 'chords', lessons: [
    ch('c1', ['maj', 'min']), ch('c2', ['maj', 'min', 'dim']), ch('c3', ['maj', 'min', 'dim', 'aug']), ch('c4', ['maj', 'sus2', 'sus4']),
    ch('c5', ['7', 'maj7', 'm7']), ch('c6', ['7', 'maj7', 'm7', 'm7b5', 'dim7']), ch('c7', ['maj', 'min', 'dim', 'aug', '7', 'maj7', 'm7'], false),
  ] },
  { id: 'sc', book: 'scales', lessons: [
    sc('s1', ['major', 'minor']), sc('s2', ['major', 'minor', 'harm']), sc('s3', ['pmaj', 'pmin', 'blues']), sc('s4', ['major', 'mixo', 'lydian']),
    sc('s5', ['minor', 'dorian', 'phrygian']), sc('s6', ['major', 'minor', 'harm', 'mel', 'dorian', 'mixo']),
    sc('s7', ['major', 'minor', 'harm', 'mel', 'dorian', 'phrygian', 'lydian', 'mixo', 'locrian']),
  ] },
  { id: 'dc', book: 'melody', lessons: [{ id: 'm1', sec: 'dc', level: 'easy', n: 6 }, { id: 'm2', sec: 'dc', level: 'mid', n: 6 }, { id: 'm3', sec: 'dc', level: 'hard', n: 6 }] },
  { id: 'pt', book: 'pitch', lessons: [{ id: 'p1', sec: 'pt', level: 'easy', n: 6 }, { id: 'p2', sec: 'pt', level: 'mid', n: 6 }, { id: 'p3', sec: 'pt', level: 'hard', n: 6 }] },
];

// Настройки упражнения для урока поверх своих (тембр и темп звучания — свои)
export function lessonConf(base, l) {
  const e = JSON.parse(JSON.stringify(base));
  e.sec = l.sec;
  e.level = l.level || (l.set ? 'custom' : 'easy');
  if (l.set) e[l.sec + 'Set'] = l.set.slice();
  ['dir', 'arp', 'mode', 'dgKind', 'scDir'].forEach((k) => { if (l[k] !== undefined) e[k] = l[k]; });
  if (l.sec === 'dg' && l.dgKind === 'chain' && !l.level) e.level = 'mid';
  e.auto = true;
  return e;
}
export const lessonN = (l) => l.n || 10;
