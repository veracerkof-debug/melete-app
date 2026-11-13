// Распевки по диапазону (слово автора 13.11.2026, DECISIONS «Вокал»): распевка — данные (мотив ступенями, слоги, темп,
// направление), а шаги по тональностям программа строит сама — от нижней удобной ноты человека до верхней (и, по
// желанию, немного «сверх») и обратно. Чистые функции без DOM и звука (tests/warmup.test.js); библиотека упражнений —
// src/modules/vocal/exercises.js, звук и экран — src/modules/vocal/index.js.
//
// Мотив — строка «1 2 3 4 5 4 3 2 1:2»: ступени мажора (1…13; b3, #4 — с альтерацией; _5 — на октаву ниже тоники),
// после двоеточия — длительность в долях (по умолчанию 1); «r» — пауза; «1~8» — скольжение (сирена) от ступени к ступени.
import { MAJ_NAMES } from './notes.js';

const DEG = [0, 2, 4, 5, 7, 9, 11];
// Ступень → шаги по буквам от тоники (для записи нотами: третья ступень — через две буквы), с октавой
export function degSteps(tok) {
  const m = /^(_*)[b#]*(\d+)$/.exec(String(tok).trim());
  return m && +m[2] >= 1 ? +m[2] - 1 - 7 * m[1].length : null;
}
// Ступень → полутоны от тоники
export function degOff(tok) {
  const m = /^(_*)([b#]*)(\d+)$/.exec(String(tok).trim());
  if (!m) return null;
  const n = +m[3];
  if (n < 1) return null;
  const base = DEG[(n - 1) % 7] + 12 * Math.floor((n - 1) / 7);
  const acc = [...m[2]].reduce((a, c) => a + (c === '#' ? 1 : -1), 0);
  return base + acc - 12 * m[1].length;
}

// Мотив → { notes: [{ t, d, o — полутоны, ls — шаги букв, o2?/ls2? — конец скольжения, rest? }], len — долей, lo, hi — крайние смещения }
export function parseMotif(src) {
  const notes = [];
  let t = 0, lo = Infinity, hi = -Infinity;
  String(src || '').trim().split(/\s+/).filter(Boolean).forEach((tok) => {
    const [body, dur] = tok.split(':'), d = dur != null && +dur > 0 ? +dur : 1;
    if (body === 'r') { notes.push({ t, d, rest: true }); t += d; return; }
    const [a, b] = body.split('~'), o = degOff(a), o2 = b != null ? degOff(b) : null;
    if (o == null || (b != null && o2 == null)) return; // битая ступень — пропуск, мотив не ломается
    const n = { t, d, o, ls: degSteps(a) };
    if (o2 != null) { n.o2 = o2; n.ls2 = degSteps(b); }
    notes.push(n);
    lo = Math.min(lo, o, o2 ?? o); hi = Math.max(hi, o, o2 ?? o);
    t += d;
  });
  if (lo === Infinity) { lo = 0; hi = 0; }
  return { notes, len: t, lo, hi };
}

// Тоники шагов: от самой низкой, при которой низ мотива не ниже lo − extra, до самой высокой, при которой верх не выше
// hi + extra. dir: 'up' — только вверх, 'down' — сверху вниз, 'updown' — вверх и обратно (верх не повторяется).
// Узкий диапазон (мотив не помещается) — один шаг посередине.
export function tonics(mot, { lo, hi }, { extra = 0, step = 1, dir = 'updown' } = {}) {
  const a = Math.round(lo - extra - mot.lo), b = Math.round(hi + extra - mot.hi), s = Math.max(1, Math.round(step));
  if (b < a) return [Math.round((lo + hi) / 2 - (mot.lo + mot.hi) / 2)];
  const up = [];
  for (let x = a; x <= b; x += s) up.push(x);
  if (dir === 'up') return up;
  if (dir === 'down') return up.slice().reverse();
  return up.concat(up.slice(0, -1).reverse());
}

// Аккорд под тоникой: бас и трезвучие в удобной для пианино октаве (корень — от C3 до B3), мажор или минор
export function chordFor(tonic, minor = false) {
  const root = 48 + (((tonic % 12) + 12) % 12);
  return [root - 12, root, root + (minor ? 3 : 4), root + 7];
}

// Прогон распевки: ex — упражнение (exercises.js), range — { lo, hi } в MIDI; opts: { extra, step, dir, maxBeats —
// если прогон длиннее, шаг становится тоном (весь диапазон за меньшее время) }.
// → { steps: [{ i, tonic, t0, lead: { t, d, ms }, sing: [{ t, d, m, m2?, k — номер ноты в мотиве }], end }], beats, step }
export function buildRun(ex, range, opts = {}) {
  const mot = parseMotif(ex.p), lead = ex.lead ?? 1, rest = ex.rest ?? 1;
  let step = opts.step || ex.step || 1;
  const dir = opts.dir || ex.dir || 'updown';
  const make = (s) => {
    let cur = 0;
    const steps = tonics(mot, range, { extra: opts.extra || 0, step: s, dir }).map((tonic, i) => {
      const t0 = cur, ts = t0 + lead;
      let k = 0;
      const sing = mot.notes.filter((n) => !n.rest).map((n) => {
        const x = { t: ts + n.t, d: n.d, m: tonic + n.o, ls: n.ls, k: k++ };
        if (n.o2 != null) { x.m2 = tonic + n.o2; x.ls2 = n.ls2; }
        return x;
      });
      cur = ts + mot.len + rest;
      return { i, tonic, t0, lead: { t: t0, d: lead, ms: chordFor(tonic, !!ex.minor) }, sing, end: cur };
    });
    return { steps, beats: cur, step: s };
  };
  let run = make(step);
  if (opts.maxBeats && run.beats > opts.maxBeats && step < 2) { step = 2; run = make(step); }
  return run;
}

// Секунды прогона по темпу
export const runSeconds = (run, bpm) => (run.beats * 60) / Math.max(30, bpm || 100);

// Слог ноты k: строка — один на все ноты; массив — по порядку, по кругу
export function syllable(ex, k, lang = 'ru') {
  const s = (ex.syl && (ex.syl[lang] ?? ex.syl.en ?? ex.syl.ru)) || '';
  return Array.isArray(s) ? s[k % s.length] || '' : s;
}

// Запись ноты для нотной строки: буква — от буквы тоники (тональность пишется как в MAJ_NAMES: D♭, а не C♯) на ls шагов,
// знак — сколько не хватает до высоты m. → { l — номер буквы 0…6 (C…B), a — знак −2…2 }
const LET = 'CDEFGAB', NATS = [0, 2, 4, 5, 7, 9, 11];
export function spellNote(tonic, ls, m) {
  const tl = LET.indexOf(keyName(tonic)[0]), l = (((tl + ls) % 7) + 7) % 7;
  let a = ((m - NATS[l]) % 12 + 12) % 12;
  if (a > 6) a -= 12;
  return { l, a: Math.max(-2, Math.min(2, a)) };
}

// Название тональности шага: «D♭» / «D♭ minor»-подобное решает экран; здесь — буква тоники и октава
export const keyName = (tonic) => MAJ_NAMES[((tonic % 12) + 12) % 12];
// Название ноты с октавой: знаки — как у тональностей (B♭, а не A♯) — певцу привычнее
export const noteName = (m) => { const r = Math.round(m); return MAJ_NAMES[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1); };
