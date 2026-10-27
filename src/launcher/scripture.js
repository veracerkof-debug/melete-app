// Главный экран (церковный режим): стих дня — из стихов Melete (core/verses.js: греческий, Синодальный, WEB,
// Muqaddas Kitob) и ссылка на главу на azbyka.ru (Синодальный перевод).
import { VERSE_IDS, verseByKey, verseIn } from '../core/verses.js';

export function verseOfDay(date = new Date(), offset = 0) {
  const day = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
  const n = VERSE_IDS.length;
  return verseByKey(VERSE_IDS[(((day + offset) % n) + n) % n]);
}

export const verseText = (v, lang) => verseIn(v, lang);

// «Пс 89:12» → https://azbyka.ru/biblia/?Ps.89:12 (коды книг азбуки)
const AZ = {
  'Быт': 'Gen', 'Исх': 'Ex', 'Лев': 'Lev', 'Числ': 'Num', 'Чис': 'Num', 'Втор': 'Deut', 'Суд': 'Judg', 'Пс': 'Ps', 'Еккл': 'Eccl',
  'Плач': 'Lam', 'Дан': 'Dan', 'Мф': 'Mt', 'Мк': 'Mk', 'Лк': 'Lk', 'Ин': 'Jn', 'Рим': 'Rom', '1 Кор': '1Cor', 'Еф': 'Eph',
  'Флп': 'Phil', 'Кол': 'Col', '1 Тим': '1Tim', 'Евр': 'Hebr', 'Откр': 'Apok',
};
export function azbykaUrl(ref) {
  const m = /^(.+?)\s+(\d+):(\d+)/.exec(ref || '');
  const code = m && AZ[m[1]];
  return code ? `https://azbyka.ru/biblia/?${code}.${m[2]}:${m[3]}` : null;
}
