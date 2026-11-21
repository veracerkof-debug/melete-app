// «Начать занятие» в вокале (слово автора 21.11.2026): 10 уровней — готовые распевки от лёгкой к сложной.
// Чистые данные без DOM: списки id упражнений (modules/vocal/exercises.js). Каждый уровень заканчивается заминкой.
export const VLEVEL_COUNT = 10;
export const VLEVEL_PLAN = [
  ['breath', 'hum', 'siren5', 'coolHum'],                                                              // 1 — дыхание, мычание, сирена
  ['breath', 'hum', 'straw', 'siren5', 'ma5', 'coolHum'],                                              // 2 — плюс соломинка и гласная
  ['breath', 'trill5', 'siren5', 'nu', 'yo', 'coolHum'],                                               // 3 — трель, нисходящая «ну»
  ['breath', 'trill5', 'siren8', 'mimema', 'ha135', 'coolTrill'],                                      // 4 — октавная сирена, гласные, опора
  ['breath', 'trillOct', 'siren8', 'mimema', 'arp158', 'thirds', 'coolTrill'],                         // 5 — арпеджио и терции
  ['breath', 'trillOct', 'siren8', 'arp8', 'ha135', 'minor5', 'ri', 'coolTrill'],                      // 6 — минор и дикция
  ['breath', 'trillOct', 'arp8', 'agile5', 'fifths', 'thirds', 'ri', 'coolTrill'],                     // 7 — беглость
  ['breath', 'trillOct', 'arp10', 'agile5', 'haArp', 'chrom', 'bra', 'yawn'],                          // 8 — децима, хроматика
  ['pulse', 'trillOct', 'arp10', 'turn', 'haArp', 'messa', 'chrom', 'bra', 'yawn'],                    // 9 — филировка, форшлаг
  ['pulse', 'trillOct', 'siren8', 'arp10', 'rossini', 'turn', 'haArp', 'messa', 'chrom', 'bra', 'yawn'], // 10 — полная
];
export const clampVLevel = (n) => Math.max(1, Math.min(VLEVEL_COUNT, Math.round(+n) || 1));
export const vlevelList = (n) => VLEVEL_PLAN[clampVLevel(n) - 1].slice();
