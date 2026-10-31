// Уроки тренажёра ритма: десять глав от ровного пульса к шестнадцатым, триолям, сложным размерам и полиритмам.
// Урок — упражнение (drill) и его настройки поверх своих; n — попыток (сдача — средняя оценка попыток ≥ 80 %).
// Названия — i18n ls.<id>, главы — lch.<id>; book — глава учебника. Логика пути — src/music/course.js.
const L = (id, drill, conf = {}) => ({ id, drill, ...conf });
const rd = (id, level, c = {}) => L(id, 'read', { level, ...c });
const ec = (id, level, c = {}) => L(id, 'echo', { level, ...c });
const dc = (id, level, c = {}) => L(id, 'dict', { level, ...c });

export const BEAT_COURSE = [
  { id: 'pulse', book: 'meter', lessons: [rd('r1', 1, { custom: ['q'], bpm: 70, strict: 'soft' }), L('r2', 'pulse', { gap: 1, bpm: 70, strict: 'soft' }), L('r3', 'pulse', { gap: 2, bpm: 80 })] },
  { id: 'l1', book: 'rhythm', lessons: [rd('r4', 1, { bpm: 70, strict: 'soft' }), ec('r5', 1, { bpm: 70, strict: 'soft' }), dc('r6', 1), rd('r7', 1, { meter: '3/4', bpm: 80 })] },
  { id: 'l2', book: 'rhythm', lessons: [rd('r8', 2, { bpm: 70 }), ec('r9', 2, { bpm: 70 }), dc('r10', 2), rd('r11', 2, { meter: '2/4', bpm: 90 })] },
  { id: 'l3', book: 'rhythm', lessons: [rd('r12', 3, { bpm: 70 }), ec('r13', 3, { bpm: 70 }), dc('r14', 3), rd('r15', 2, { swing: true, bpm: 90 })] },
  { id: 'l4', book: 'rhythm', lessons: [rd('r16', 4, { bpm: 60 }), ec('r17', 4, { bpm: 60 }), dc('r18', 4)] },
  { id: 'l5', book: 'rhythm', lessons: [rd('r19', 5, { bpm: 60 }), ec('r20', 5, { bpm: 60 }), dc('r21', 5)] },
  { id: 'l6', book: 'rhythm', lessons: [rd('r22', 6, { bpm: 60 }), ec('r23', 6, { bpm: 60 }), dc('r24', 6)] },
  { id: 'cmp', book: 'meter', lessons: [rd('r25', 2, { meter: '6/8', bpm: 60 }), ec('r26', 2, { meter: '6/8', bpm: 60 }), dc('r27', 3, { meter: '6/8' }), rd('r28', 3, { meter: '9/8', bpm: 60 }), rd('r29', 4, { meter: '12/8', bpm: 50 })] },
  { id: 'poly', book: 'meter', lessons: [L('r30', 'poly', { poly: '3:2', bpm: 70, strict: 'soft' }), L('r31', 'poly', { poly: '2:3', bpm: 70, strict: 'soft' }), L('r32', 'poly', { poly: '4:3', bpm: 60 }), L('r33', 'poly', { poly: '3:4', bpm: 60 })] },
  { id: 'hold', book: 'meter', lessons: [L('r34', 'pulse', { gap: 4, bpm: 90 }), L('r35', 'pulse', { gap: 8, bpm: 100 }), rd('r36', 4, { bpm: 100, strict: 'strict' })] },
];

// Настройки упражнения урока поверх своих (звук, щелчки, поправки задержки — свои); длина — два такта
export function lessonConf(base, l) {
  const e = JSON.parse(JSON.stringify(base));
  e.drill = l.drill;
  e.level = l.level || 1;
  e.custom = l.custom ? l.custom.slice() : null;
  e.meter = l.meter || '4/4';
  e.bars = l.bars || 2;
  e.bpm = l.bpm || 80;
  e.strict = l.strict || 'mid';
  e.swing = !!l.swing;
  if (l.gap) e.gap = l.gap;
  if (l.poly) e.poly = l.poly;
  return e;
}
export const lessonN = (l) => l.n || 4;
