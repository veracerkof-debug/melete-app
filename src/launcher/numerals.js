// Главный экран: числа и названия частей суток. Без DOM.

// Греческие (ионийские) числа: 18 → ιηʹ; ноль — ō (знак Птолемея)
const G_UNITS = ['', 'α', 'β', 'γ', 'δ', 'ε', 'ϛ', 'ζ', 'η', 'θ'];
const G_TENS = ['', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ϙ'];
export function greekNumeral(n, keraia = true) {
  if (n === 0) return 'ō';
  const s = G_TENS[Math.floor(n / 10) % 10] + G_UNITS[n % 10];
  return keraia ? s + 'ʹ' : s;
}

export function romanNumeral(n) {
  if (n === 0) return 'N'; // nulla
  const map = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

// Литургические часы (условно, по три часа): ключ строки — canon.<id>, греческое название — как есть
export const CANONICAL = [
  { from: 0, id: 'midnight', el: 'Μεσονυκτικόν' },
  { from: 3, id: 'matins', el: 'Ὄρθρος' },
  { from: 6, id: 'first', el: 'Ὥρα αʹ' },
  { from: 9, id: 'third', el: 'Ὥρα γʹ' },
  { from: 12, id: 'sixth', el: 'Ὥρα ϛʹ' },
  { from: 15, id: 'ninth', el: 'Ὥρα θʹ' },
  { from: 18, id: 'vespers', el: 'Ἑσπερινός' },
  { from: 21, id: 'compline', el: 'Ἀπόδειπνον' },
];
export const canonicalOf = (h) => [...CANONICAL].reverse().find((c) => h >= c.from);

export const GREEK_DAYS = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

// — Время словами —
const W = {
  ru: { ones: ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'],
    tens: ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят'], zero: 'ровно', fem: { 1: 'одна', 2: 'две' } },
  en: { ones: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'],
    tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty'], zero: "o'clock", oh: 'oh', dash: true },
  uz: { ones: ['nol', 'bir', 'ikki', 'uch', 'toʻrt', 'besh', 'olti', 'yetti', 'sakkiz', 'toʻqqiz', 'oʻn', 'oʻn bir', 'oʻn ikki', 'oʻn uch', 'oʻn toʻrt', 'oʻn besh', 'oʻn olti', 'oʻn yetti', 'oʻn sakkiz', 'oʻn toʻqqiz'],
    tens: ['', '', 'yigirma', 'oʻttiz', 'qirq', 'ellik'], zero: 'rosa', oh: 'nol' },
  el: { ones: ['μηδέν', 'μία', 'δύο', 'τρεις', 'τέσσερις', 'πέντε', 'έξι', 'επτά', 'οκτώ', 'εννέα', 'δέκα', 'έντεκα', 'δώδεκα', 'δεκατρία', 'δεκατέσσερα', 'δεκαπέντε', 'δεκαέξι', 'δεκαεπτά', 'δεκαοκτώ', 'δεκαεννέα'],
    tens: ['', '', 'είκοσι', 'τριάντα', 'σαράντα', 'πενήντα'], zero: 'ακριβώς', unitOne: 'ένα' },
};

export function numberWords(n, lang, minute = false) {
  const w = W[lang] || W.ru;
  if (minute && n === 0) return w.zero;
  if (minute && n < 10 && w.oh) return `${w.oh} ${w.ones[n]}`;
  const single = (u) => (minute && w.fem?.[u]) || w.ones[u];
  const unit = (u) => (minute && w.fem?.[u]) || (u === 1 && w.unitOne) || w.ones[u]; // в составном числе
  if (n < 20) return single(n);
  const tens = w.tens[Math.floor(n / 10)], u = n % 10;
  if (!u) return tens;
  return w.dash ? `${tens}-${unit(u)}` : `${tens} ${unit(u)}`;
}
