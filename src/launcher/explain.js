// Главный экран: пояснения — неочевидное на экране открывает шторку с объяснением и ссылками (Писание — azbyka.ru,
// Синодальный перевод; статьи — Википедия на языке интерфейса, для uz — английская). Тексты — i18n.js (ex.*).
import { h, openSheet } from './ui.js';
import { openUrl } from './actions.js';
import { t, getLang } from './i18n.js';
import { canonicalOf, GREEK_DAYS } from './numerals.js';
import { WATCHES, BIB_REFS } from './sun.js';
import { azbykaUrl } from './scripture.js';

// Статьи: [ru, en]
const WIKI = {
  canon: ['Часы_(богослужение)', 'Canonical_hours'],
  greekNum: ['Греческая_система_счисления', 'Greek_numerals'],
  roman: ['Римские_цифры', 'Roman_numerals'],
  hebrewCal: ['Еврейский_календарь', 'Hebrew_calendar'],
  ichthys: ['Ихтис', 'Ichthys'],
  chirho: ['Хризма', 'Chi_Rho'],
  golden: ['Золотое_сечение', 'Golden_ratio'],
  mosaic: ['Византийская_мозаика', 'Byzantine_mosaics'],
  shabbat: ['Шаббат', 'Shabbat'],
  koine: ['Койне', 'Koine_Greek'],
  lxx: ['Септуагинта', 'Septuagint'],
  moon: ['Фазы_Луны', 'Lunar_phase'],
};
export const wiki = (id) => {
  const [ru, en] = WIKI[id];
  const l = getLang() === 'ru' ? 'ru' : 'en';
  return { label: t('wiki.' + id), url: `https://${l}.wikipedia.org/wiki/${l === 'ru' ? ru : en}` };
};
// Ссылка на стих: { ru, en, uz, az } → глава на azbyka.ru
export const bibleLink = (ref, label) => ({ label: `${ref[getLang()] || ref.ru}${label ? ' — ' + label : ''}`, url: `https://azbyka.ru/biblia/?${ref.az}` });
export const verseLink = (v, ref) => ({ label: t('ex.chapter', { ref }), url: azbykaUrl(v.ref) });

export function explain({ kicker, title, text = [], links = [] }) {
  openSheet({
    title, kicker,
    render(body) {
      text.filter(Boolean).forEach((p) => body.append(h('p', { class: 'l-ex-p' }, p)));
      if (!links.length) return;
      const list = h('div', { class: 'l-ex-links' });
      links.filter((l) => l && l.url).forEach((l) => list.append(h('button', { class: 'l-ex-link', onclick: () => openUrl(l.url, l.label) },
        h('span', {}, l.label), h('small', {}, l.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]))));
      body.append(list);
    },
  });
}

// «подробнее» — маленькая ссылка в подписях настроек
export const infoLink = (entry, label = t('ex.more')) =>
  h('button', { class: 'l-info', onclick: (e) => { e.stopPropagation(); explain(typeof entry === 'function' ? entry() : entry); } }, label);

// — Литургический час —
export const canonicalEntry = (now = new Date()) => {
  const c = canonicalOf(now.getHours());
  return {
    kicker: c.el, title: t('canon.' + c.id),
    text: [t('ex.canon.p1'), t('ex.canon.p2', { name: t('canon.' + c.id), el: c.el }), t('ex.canon.p3')],
    links: [wiki('canon')],
  };
};

// — Ветхозаветное время —
export const biblicalEntry = (b, place) => {
  const title = b.isDay ? `${t('bib.hour.' + b.hour)} · ${t('bib.' + b.part.key)}` : t('bib.' + b.part.key);
  const lang = getLang();
  return {
    kicker: 'καιρός', title,
    text: [
      t('ex.bib.p1'), t('ex.bib.p2'), t('ex.bib.p3'),
      `${t('bib.note.' + b.part.key)} (${b.part.ref[lang] || b.part.ref.ru}).`,
      b.prayer ? t('ex.bib.prayer', { what: t('bib.pray.' + b.prayer.key), ref: b.prayer.ref[lang] || b.prayer.ref.ru }) : null,
      t(place.approx ? 'ex.bib.approx' : 'ex.bib.exact'),
    ],
    links: [
      bibleLink(b.part.ref, t('bib.' + b.part.key).toLowerCase()),
      bibleLink(BIB_REFS.gen15, t('ex.bib.l.gen15')),
      bibleLink(BIB_REFS.lev2332, t('ex.bib.l.lev2332')),
      bibleLink(BIB_REFS.jn119, t('ex.bib.l.jn119')),
      ...WATCHES.map((w) => bibleLink(w.ref, t('bib.' + w.key).toLowerCase())),
      bibleLink(BIB_REFS.mk1335, t('ex.bib.l.mk1335')),
      b.prayer ? bibleLink(b.prayer.ref, t('bib.pray.' + b.prayer.key)) : null,
      wiki('hebrewCal'),
    ],
  };
};

// — Греческий день недели —
const DAY_REFS = {
  0: { ref: { ru: 'Откр 1:10', en: 'Rev 1:10', uz: 'Vahiy 1:10', az: 'Apok.1:10' } },
  5: { ref: { ru: 'Мк 15:42', en: 'Mark 15:42', uz: 'Mark 15:42', az: 'Mk.15:42' } },
  6: { ref: { ru: 'Исх 20:8', en: 'Exod 20:8', uz: 'Chiqish 20:8', az: 'Ex.20:8' } },
};
export const greekDayEntry = (day) => ({
  kicker: 'ἑβδομάς', title: GREEK_DAYS[day],
  text: [t('ex.gday.' + day, { name: GREEK_DAYS[day] }), t('ex.gday.p')],
  links: [DAY_REFS[day] ? bibleLink(DAY_REFS[day].ref) : null, wiki('shabbat')],
});

// — Стих дня —
export const verseLinks = (v, ref) => [verseLink(v, ref), wiki('koine'), wiki('lxx')];

// — Часы — plain: как устроены (для всех), bib: библейский смысл (церковный режим)
const ref = (ru, en, uz, az) => ({ ru, en, uz, az });
const CLOCK_LINKS = {
  tablet: { bib: () => [bibleLink(ref('Исх 31:18', 'Exod 31:18', 'Chiqish 31:18', 'Ex.31:18'))] },
  codex: { plain: () => [wiki('roman')] },
  greek: { plain: () => [wiki('greekNum')] },
  sundial: { bib: () => [bibleLink(ref('Ис 38:8', 'Isa 38:8', 'Ishayo 38:8', 'Is.38:8'))] },
  orbit: { plain: () => [wiki('golden')], bib: () => [bibleLink(ref('Быт 1:16', 'Gen 1:16', 'Ibtido 1:16', 'Gen.1:16'))] },
  letters: { plain: () => [] },
  mosaic: { plain: () => [wiki('mosaic')] },
  biblical: { bib: () => [bibleLink(BIB_REFS.gen15), bibleLink(BIB_REFS.jn119), wiki('hebrewCal')] },
};
export const clockEntry = (id, church) => {
  const L = CLOCK_LINKS[id] || {};
  return {
    kicker: 'ὡρολόγιον', title: t('clock.' + id),
    text: [t('clock.' + id + '.info'), church ? t('clock.' + id + '.bib', {}, '') : ''],
    links: [...(church && L.bib ? L.bib() : []), ...(L.plain ? L.plain() : [])],
  };
};

export const wallEntry = (id) => ({
  kicker: 'εἰκὼν ζῶσα', title: t('wall.' + id), text: [t('wall.' + id + '.hint')],
  links: id === 'planet' ? [{ label: 'Natural Earth', url: 'https://www.naturalearthdata.com/' }] : id === 'sun' ? [wiki('moon')] : [],
});

export const ornamentEntry = () => ({
  kicker: 'σύμβολα', title: t('set.ornament'),
  text: [t('ex.orn.p1'), t('ex.orn.p2'), t('ex.orn.p3')],
  links: [wiki('ichthys'), wiki('chirho'), bibleLink({ ru: 'Откр 22:13', en: 'Rev 22:13', uz: 'Vahiy 22:13', az: 'Apok.22:13' })],
});

export const markerEntry = () => ({
  kicker: 'ἀριθμοί', title: t('set.marker'), text: [t('ex.marker')], links: [wiki('greekNum'), wiki('roman')],
});
