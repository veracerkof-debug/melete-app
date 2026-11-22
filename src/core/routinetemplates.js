// Заготовки планов занятий для разных музыкантов (слово автора 22.11.2026): быстро и легко разминаться. Это только
// заготовки: выбранная копируется в «Планы занятий» и правится как любой свой план (routine.js). Чистые данные.
// Пункт: [ключ названия (rt.it.<ключ>), минуты, инструмент Melete | null, темп | null]. Варианты: quick ~10 мин, main ~30, full ~45.
export const FAMILIES = ['guitar', 'piano', 'vocal', 'strings', 'winds', 'drums'];
export const VARIANTS = ['quick', 'main', 'full'];

export const TEMPLATES = {
  guitar: {
    quick: [['tune', 1, 'tuner', null], ['warm', 4, 'metro', 60], ['scales', 5, 'metro', 80]],
    main: [['tune', 2, 'tuner', null], ['warm', 5, 'metro', 60], ['spider', 5, 'metro', 70], ['scales', 8, 'metro', 80], ['chords', 5, 'metro', 70], ['piece', 5, 'notes', null]],
    full: [['tune', 2, 'tuner', null], ['warm', 5, 'metro', 60], ['spider', 5, 'metro', 80], ['scales', 10, 'metro', 90], ['arp', 5, 'metro', 80], ['chords', 5, 'metro', 80], ['rhythm', 5, 'metro', 90], ['piece', 8, 'notes', null]],
  },
  piano: {
    quick: [['hands', 3, null, null], ['scales', 7, 'metro', 80]],
    main: [['hands', 4, null, null], ['scales', 8, 'metro', 80], ['arp', 5, 'metro', 80], ['etude', 8, 'notes', null], ['piece', 5, 'notes', null]],
    full: [['hands', 5, null, null], ['scales', 10, 'metro', 90], ['arp', 5, 'metro', 90], ['etude', 10, 'notes', null], ['sight', 5, 'notes', null], ['piece', 10, 'notes', null]],
  },
  vocal: {
    quick: [['breath', 2, null, null], ['warmup', 6, 'vocal', null], ['cool', 2, 'vocal', null]],
    main: [['breath', 3, null, null], ['sirens', 4, 'vocal', null], ['warmup', 8, 'vocal', null], ['song', 12, 'audio', null], ['cool', 3, 'vocal', null]],
    full: [['breath', 3, null, null], ['sirens', 5, 'vocal', null], ['warmup', 10, 'vocal', null], ['range', 5, 'drone', null], ['song', 17, 'audio', null], ['cool', 5, 'vocal', null]],
  },
  strings: {
    quick: [['tune', 1, 'tuner', null], ['open', 4, 'drone', null], ['scales', 5, 'metro', 70]],
    main: [['tune', 2, 'tuner', null], ['open', 5, 'drone', null], ['scales', 8, 'metro', 70], ['intonation', 5, 'drone', null], ['etude', 5, 'notes', null], ['piece', 5, 'notes', null]],
    full: [['tune', 2, 'tuner', null], ['open', 5, 'drone', null], ['scales', 10, 'metro', 80], ['intonation', 8, 'drone', null], ['vibrato', 5, 'tuner', null], ['etude', 8, 'notes', null], ['piece', 7, 'notes', null]],
  },
  winds: {
    quick: [['longnotes', 4, 'tuner', null], ['scales', 6, 'metro', 80]],
    main: [['breath', 3, null, null], ['longnotes', 5, 'tuner', null], ['lips', 5, 'metro', 70], ['scales', 8, 'metro', 80], ['etude', 5, 'notes', null], ['piece', 4, 'notes', null]],
    full: [['breath', 3, null, null], ['longnotes', 7, 'tuner', null], ['lips', 5, 'metro', 80], ['scales', 10, 'metro', 90], ['tone', 5, 'drone', null], ['etude', 8, 'notes', null], ['piece', 7, 'notes', null]],
  },
  drums: {
    quick: [['rudiments', 5, 'metro', 60], ['grooves', 5, 'metro', 90]],
    main: [['rudiments', 8, 'metro', 60], ['grooves', 8, 'metro', 90], ['fills', 6, 'metro', 80], ['beat', 4, 'beat', null], ['song', 4, 'audio', null]],
    full: [['rudiments', 10, 'metro', 70], ['speed', 5, 'metro', 100], ['grooves', 10, 'metro', 100], ['fills', 8, 'metro', 90], ['beat', 5, 'beat', null], ['song', 7, 'audio', null]],
  },
};

// Профиль → семейство (instruments из profile.js)
const FAMILY_OF = { guitar: 'guitar', egtr: 'guitar', bass: 'guitar', uke: 'guitar', mando: 'guitar', banjo: 'guitar', piano: 'piano', vocal: 'vocal',
  violin: 'strings', viola: 'strings', cello: 'strings', dbass: 'strings', flute: 'winds', sax: 'winds', trumpet: 'winds', clarinet: 'winds', drums: 'drums' };
// Семейства человека — первыми, остальные следом
export function familiesFor(instruments = []) {
  const mine = [...new Set(instruments.map((x) => FAMILY_OF[x]).filter(Boolean))];
  return [...mine, ...FAMILIES.filter((f) => !mine.includes(f))];
}
export const templateItems = (fam, variant) => (TEMPLATES[fam] && TEMPLATES[fam][variant]) || null;
// Минуты заготовки
export const templateMin = (fam, variant) => (templateItems(fam, variant) || []).reduce((a, x) => a + x[1], 0);
