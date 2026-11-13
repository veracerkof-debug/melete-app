// Библиотека распевок (слово автора 13.11.2026; источники — docs/vocal.md): мотивы ступенями, слоги, темп. Разворот по
// диапазону — src/music/warmup.js. Названия и подсказки «как петь» — в словарях модуля (ex.<id>, how.<id>).
// Поля: g — группа; p — мотив (warmup.js: parseMotif); bpm — темп в четвертях; syl — слоги { ru, en } (строка — на все
// ноты, массив — по нотам); dir — 'updown' | 'up' | 'down'; step — шаг по умолчанию (2 — по тону: для мотивов на одной
// ноте); minor — аккорд минорный; stacc — отрывисто; dyn — 'messa' (филировка: тише — громче — тише);
// cool — заминка: только нижние две трети рабочего диапазона, без зоны роста; free — без высоты: фазы [ключ, секунды] × rep;
// lv — уровень (слово автора 14.11.2026: «сначала очень лёгкие, потом что-то посложнее»): 1 — основа, 2 — дальше, 3 — сложнее.
// Мотивы — общее достояние педагогики (не чьи-то упражнения целиком); объяснения написаны свои.

const S5 = '1 2 3 4 5 4 3 2 1:2';
const MI = { ru: ['ми', 'мэ', 'ма', 'мо', 'му', 'мо', 'ма', 'мэ', 'ми'], en: ['mi', 'me', 'ma', 'mo', 'mu', 'mo', 'ma', 'me', 'mi'] };

export const GROUPS = ['breath', 'sovt', 'glide', 'vowel', 'arp', 'agile', 'stacc', 'dyn', 'pitch', 'dict', 'cool'];

export const EXERCISES = [
  // Дыхание — без высоты
  { id: 'breath', lv: 1, g: 'breath', free: [['in', 4], ['hold', 2], ['outS', 8]], rep: 4 },
  { id: 'pulse', lv: 2, g: 'breath', free: [['in', 3], ['pulseF', 6]], rep: 4 },
  // Частично прикрытый рот (трели, мычание, соломинка) — мягкий разогрев связок
  { id: 'trill5', lv: 1, g: 'sovt', p: S5, bpm: 140, syl: { ru: 'бр', en: 'brr' } },
  { id: 'trillOct', lv: 2, g: 'sovt', p: '1~8:2 8~1:2', bpm: 84, syl: { ru: 'бр', en: 'brr' } },
  { id: 'hum', lv: 1, g: 'sovt', p: '1 2 3 2 1:2', bpm: 112, syl: { ru: 'м', en: 'mm' } },
  { id: 'straw', lv: 1, g: 'sovt', p: '1~5:2 5~1:2', bpm: 84, syl: { ru: 'у', en: 'oo' } },
  { id: 'ng', lv: 2, g: 'sovt', p: '5 4 3 2 1:2', bpm: 120, syl: { ru: 'нг', en: 'ng' }, dir: 'down' },
  { id: 'tongue', lv: 2, g: 'sovt', p: '1 3 5 3 1:2', bpm: 120, syl: { ru: 'рр', en: 'rr' } },
  // Сирены — весь диапазон без разрывов
  { id: 'siren5', lv: 1, g: 'glide', p: '1~5:2 5~1:2', bpm: 84, syl: { ru: 'у', en: 'oo' } },
  { id: 'siren8', lv: 2, g: 'glide', p: '1~8:2 8~1:2', bpm: 72, syl: { ru: 'у', en: 'oo' } },
  { id: 'sigh', lv: 1, g: 'glide', p: '8~1:3', bpm: 72, syl: { ru: 'ха', en: 'hah' }, dir: 'down' },
  // Гласные
  { id: 'ma5', lv: 1, g: 'vowel', p: S5, bpm: 132, syl: { ru: 'ма', en: 'ma' } },
  { id: 'mimema', lv: 2, g: 'vowel', p: S5, bpm: 120, syl: MI },
  { id: 'vowels', lv: 1, g: 'vowel', p: '1:2 1:2 1:2 1:2 1:2', bpm: 96, syl: { ru: ['а', 'э', 'и', 'о', 'у'], en: ['a', 'e', 'i', 'o', 'u'] }, step: 2 },
  { id: 'nu', lv: 1, g: 'vowel', p: '5 4 3 2 1:2', bpm: 120, syl: { ru: 'ну', en: 'noo' }, dir: 'down' },
  { id: 'yo', lv: 1, g: 'vowel', p: '1 3 5 3 1:2', bpm: 120, syl: { ru: 'йо', en: 'yo' } },
  // Арпеджио и большие ходы
  { id: 'arp8', lv: 2, g: 'arp', p: '1 3 5 8 5 3 1:2', bpm: 120, syl: { ru: 'а', en: 'ah' } },
  { id: 'arp10', lv: 3, g: 'arp', p: '1 3 5 8 10 8 5 3 1:2', bpm: 120, syl: { ru: ['ми', 'а', 'а', 'а', 'а', 'а', 'а', 'а', 'а'], en: ['mee', 'ah', 'ah', 'ah', 'ah', 'ah', 'ah', 'ah', 'ah'] } },
  { id: 'oct', lv: 2, g: 'arp', p: '1:2 8:2 1:2', bpm: 88, syl: { ru: 'я', en: 'yah' } },
  { id: 'arp158', lv: 2, g: 'arp', p: '1 5 8 5 1:2', bpm: 104, syl: { ru: 'да', en: 'dah' } },
  // Беглость
  { id: 'rossini', lv: 3, g: 'agile', p: '1:.5 2:.5 3:.5 4:.5 5:.5 6:.5 7:.5 8:.5 9:.5 8:.5 7:.5 6:.5 5:.5 4:.5 3:.5 2:.5 1:2', bpm: 96, syl: { ru: 'а', en: 'ah' } },
  { id: 'agile5', lv: 3, g: 'agile', p: '1:.5 2:.5 3:.5 4:.5 5:.5 4:.5 3:.5 2:.5 1:.5 2:.5 3:.5 4:.5 5:.5 4:.5 3:.5 2:.5 1:2', bpm: 100, syl: { ru: 'а', en: 'ah' } },
  { id: 'turn', lv: 3, g: 'agile', p: '1:.5 2:.5 3:.5 2:.5 1:.5 2:.5 3:.5 4:.5 5:2', bpm: 96, syl: { ru: 'ла', en: 'lah' } },
  // Отрывисто — опора дыхания
  { id: 'ha135', lv: 2, g: 'stacc', p: '1:.5 r:.5 3:.5 r:.5 5:.5 r:.5 3:.5 r:.5 1:1', bpm: 110, syl: { ru: 'ха', en: 'ha' }, stacc: true },
  { id: 'haArp', lv: 3, g: 'stacc', p: '1:.5 r:.5 3:.5 r:.5 5:.5 r:.5 8:.5 r:.5 5:.5 r:.5 3:.5 r:.5 1:1', bpm: 100, syl: { ru: 'ха', en: 'ha' }, stacc: true },
  // Громкость
  { id: 'messa', lv: 3, g: 'dyn', p: '1:8', bpm: 60, syl: { ru: 'а', en: 'ah' }, step: 2, dyn: 'messa' },
  // Интонация
  { id: 'thirds', lv: 2, g: 'pitch', p: '1 3 2 4 3 5 4 2 1:2', bpm: 116, syl: { ru: 'ла', en: 'lah' } },
  { id: 'fifths', lv: 2, g: 'pitch', p: '1:2 5:2 1:2', bpm: 80, syl: { ru: 'ду', en: 'doo' } },
  { id: 'chrom', lv: 3, g: 'pitch', p: '1 #1 2 #2 3 #2 2 #1 1:2', bpm: 100, syl: { ru: 'ми', en: 'mee' } },
  { id: 'minor5', lv: 2, g: 'pitch', p: '1 2 b3 4 5 4 b3 2 1:2', bpm: 120, syl: { ru: 'ма', en: 'ma' }, minor: true },
  // Дикция
  { id: 'ri', lv: 2, g: 'dict', p: S5, bpm: 120, syl: { ru: ['ри', 'ре', 'ра', 'ро', 'ру', 'ро', 'ра', 'ре', 'ри'], en: ['ree', 'reh', 'rah', 'roh', 'roo', 'roh', 'rah', 'reh', 'ree'] } },
  { id: 'bra', lv: 3, g: 'dict', p: '1:.5 1:.5 1:.5 1:.5 1:.5 1:.5 1:.5 1:.5 1:2', bpm: 100, syl: { ru: ['бра', 'бре', 'бри', 'бро', 'бру', 'бро', 'бри', 'бре', 'бра'], en: ['bra', 'bre', 'bri', 'bro', 'bru', 'bro', 'bri', 'bre', 'bra'] }, step: 2 },
  // Заминка — вниз, тихо, в нижней части диапазона
  { id: 'coolHum', lv: 1, g: 'cool', p: '5 4 3 2 1:3', bpm: 92, syl: { ru: 'м', en: 'mm' }, dir: 'down', cool: true },
  { id: 'coolTrill', lv: 1, g: 'cool', p: '5~1:3', bpm: 72, syl: { ru: 'бр', en: 'brr' }, dir: 'down', cool: true },
  { id: 'yawn', lv: 1, g: 'cool', p: '8~1:4', bpm: 72, syl: { ru: 'а', en: 'ah' }, dir: 'down', cool: true },
];

export const exById = (id) => EXERCISES.find((x) => x.id === id) || null;
export const LEVELS = [1, 2, 3];

// Готовые распевки-программы (по исследованию: 5–15 минут хватает; заминку делают редко — она дана отдельно)
export const PROGRAMS = {
  base: ['breath', 'hum', 'trill5', 'siren5', 'ma5', 'coolHum'], // основа — с неё начинают
  quick: ['trill5', 'siren8', 'hum', 'ma5', 'arp8', 'coolHum'],
  morning: ['breath', 'hum', 'trill5', 'siren5', 'yo', 'ma5'],
  full: ['breath', 'trill5', 'straw', 'siren8', 'mimema', 'nu', 'arp8', 'agile5', 'ha135', 'messa', 'coolTrill'],
  stage: ['breath', 'trillOct', 'hum', 'mimema', 'arp10', 'agile5', 'ri'],
  cool: ['coolTrill', 'coolHum', 'yawn'],
};
export const PROGRAM_IDS = Object.keys(PROGRAMS);
